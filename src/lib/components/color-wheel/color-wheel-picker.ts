/**
 * ColorWheelPicker — a vanilla TypeScript color picker component.
 *
 * Renders a hue wheel surrounding a configurable inner selection shape
 * (triangle / square / disk / none). Canvas-based, pointer + keyboard
 * interaction, framework-independent. No React or other UI framework.
 *
 * ----------------------------------------------------------------------------
 * GEOMETRY
 * ----------------------------------------------------------------------------
 *   `size`            — diameter (px) of the inner shape's bounding circle.
 *   `wheelSpacing`    — gap (px) between the inner shape and the wheel's
 *                       inner edge.
 *   `wheelThickness`  — radial thickness (px) of the hue ring.
 *
 *   innerR       = size / 2
 *   wheelInnerR  = innerR + wheelSpacing
 *   wheelOuterR  = wheelInnerR + wheelThickness
 *   total        = wheelOuterR * 2  (full component size in CSS pixels)
 *   cx = cy      = total / 2         (wheel is centered on the inner shape)
 *
 * ----------------------------------------------------------------------------
 * HUE MAPPING
 * ----------------------------------------------------------------------------
 *   Hue 0° (red) is at the top (12 o'clock), increasing clockwise.
 *   Canvas y-axis is inverted (+y is down) so "clockwise" on screen equals
 *   increasing canvas angle.
 *
 *     angle(hue)  = -π/2 + hue * π/180            (canvas radians)
 *     hue(angle)  = ((angle + π/2) * 180/π) mod 360
 *
 *   Equivalently, using atan2 from the "up" vector:
 *     theta = atan2(dx, -dy)   (in radians, 0 = top, increasing clockwise)
 *
 * ----------------------------------------------------------------------------
 * INNER SHAPE COLOR MAPPINGS (hue from the wheel, fixed)
 * ----------------------------------------------------------------------------
 *   triangle — Vertices: A = top (S=0, V=1, white), B = bottom-right
 *              (S=1, V=1, pure hue), C = bottom-left (V=0, black).
 *              For any interior point P = α·A + β·B + γ·C with α+β+γ=1:
 *                 V = α + β
 *                 S = β / V   (when V > 0; S is undefined at the black vertex)
 *              Inverse:
 *                 α = V·(1 − S),  β = S·V,  γ = 1 − V
 *
 *   square   — Inscribed square (side = innerR · √2) inside the inner circle.
 *              x → saturation (0..1, left → right)
 *              y → value      (1..0, top → bottom)
 *
 *   disk     — Same saturation×value gradient as the square (x → S, y → V
 *              over the circumscribing square), clipped to a circle. This
 *              gives the disk the same flat 2D color layout as the square
 *              (white left, pure hue right, black bottom) rather than a
 *              radial pattern from the center.
 *
 *   none     — Only the wheel renders; the inner area shows the current
 *              solid color and is not interactive.
 *
 * ----------------------------------------------------------------------------
 * RENDERING STRATEGY
 * ----------------------------------------------------------------------------
 *   A single <canvas> renders the whole component:
 *     1. Hue wheel   — drawn as 360 one-degree arc segments (cached).
 *     2. Inner shape — drawn pixel-by-pixel (triangle/disk) or with three
 *                      canvas gradients (square). Cached per (shape, size, hue).
 *     3. Markers     — hue marker on the wheel ring; inner marker on the
 *                      selected (S, V) position. Re-drawn every frame (cheap).
 *
 *   Caching keeps drag interactions smooth: SV drags only redraw markers,
 *   and hue drags only re-render the inner shape (not the wheel).
 */

import {
  type HSV,
  type ColorOutput,
  parseColor,
  toColorOutput,
  hsvToRgb,
  clamp,
  clampHue,
} from "./color-utils";

export type Shape = "triangle" | "square" | "disk" | "none";

export interface ColorPickerOptions {
  /** Inner selection shape. Default "triangle". */
  shape?: Shape;
  /** Inner shape diameter in CSS pixels. Default 180. */
  size?: number;
  /** Hue wheel radial thickness in pixels. Default 24. */
  wheelThickness?: number;
  /** Gap between inner shape and wheel in pixels. Default 8. */
  wheelSpacing?: number;
  /** Initial hue (0-360). Ignored if `color` is provided. Default 210. */
  hue?: number;
  /** Initial color (any parseable string). Overrides `hue` when provided. */
  color?: string;
  /**
   * When true, the inner shape rotates so its "pure hue" vertex tracks the
   * current hue position on the wheel (PRD §4.4). Only affects the triangle
   * shape; square and disk are rotationally symmetric or visually invariant.
   * Default false.
   */
  rotateShape?: boolean;
}

interface Geometry {
  /** Inner shape bounding radius (= size / 2). */
  innerR: number;
  /** Inner edge of the hue wheel. */
  wheelInnerR: number;
  /** Outer edge of the hue wheel. */
  wheelOuterR: number;
  /** Total component size in CSS pixels. */
  total: number;
  /** Center x in CSS pixels. */
  cx: number;
  /** Center y in CSS pixels. */
  cy: number;
}

const DEFAULTS: Required<ColorPickerOptions> = {
  shape: "triangle",
  size: 180,
  wheelThickness: 24,
  wheelSpacing: 8,
  hue: 210,
  color: "#4287f5",
  rotateShape: false,
};

const STYLE_ID = "color-wheel-picker-styles";

/**
 * Rotate a point `(p.x, p.y)` around the center `(cx, cy)` by `angle`
 * radians (0 = top / 12 o'clock, increasing clockwise).
 */
function rotatePoint(
  p: { x: number; y: number },
  cx: number,
  cy: number,
  angle: number,
): { x: number; y: number } {
  if (angle === 0) return p;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - cx;
  const dy = p.y - cy;
  // Standard 2D rotation. In canvas coordinates (y-down), a positive angle
  // rotates clockwise when using this matrix.
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/** Scoped CSS injected once per document. Host apps can override via the
 *  `--color-picker-*` custom properties. */
function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.color-wheel-picker {
  display: inline-block;
  position: relative;
  font-family: inherit;
  --color-picker-marker-border: rgba(255, 255, 255, 0.95);
  --color-picker-marker-border-dark: rgba(0, 0, 0, 0.7);
  --color-picker-focus-ring: rgba(217, 255, 102, 0.55);
  --color-picker-bg: transparent;
}
.color-wheel-picker canvas {
  display: block;
  touch-action: none;
  outline: none;
  cursor: pointer;
  background: var(--color-picker-bg);
  /* No border-radius — the disk/wheel are drawn as circles via ctx.arc,
     and border-radius would clip the markers that sit on the edge. */
}
.color-wheel-picker canvas:focus-visible {
  box-shadow: 0 0 0 3px var(--color-picker-focus-ring);
}
`;
  document.head.appendChild(style);
}

type ColorHandler = (color: ColorOutput) => void;

export class ColorWheelPicker {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private options: Required<ColorPickerOptions>;
  private hsv: HSV;

  private readonly listeners: Map<string, Set<ColorHandler>> = new Map();
  private pointerState: {
    type: "wheel" | "inner";
    pointerId: number;
  } | null = null;

  private resizeObserver: ResizeObserver | null = null;
  private _renderScheduled = false;
  private _destroyed = false;

  /** Cached hue wheel canvas (only depends on geometry). */
  private wheelCache: HTMLCanvasElement | null = null;
  private wheelCacheCtx: CanvasRenderingContext2D | null = null;
  private wheelCacheKey = "";

  /** Cached inner-shape canvas (depends on shape, size, hue). */
  private innerCache: HTMLCanvasElement | null = null;
  private innerCacheCtx: CanvasRenderingContext2D | null = null;
  private innerCacheKey = "";

  /** Bound handlers (so removeEventListener works). */
  private readonly _onPointerDown: (e: PointerEvent) => void;
  private readonly _onPointerMove: (e: PointerEvent) => void;
  private readonly _onPointerUp: (e: PointerEvent) => void;
  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onResize: () => void;

  constructor(container: HTMLElement, options: ColorPickerOptions = {}) {
    if (!container) {
      throw new Error("ColorWheelPicker: container is required");
    }
    this.container = container;

    // Resolve options (per-option defaults; `color` overrides `hue`).
    this.options = {
      shape: (options.shape as Shape) ?? DEFAULTS.shape,
      size: Math.max(40, options.size ?? DEFAULTS.size),
      wheelThickness: Math.max(4, options.wheelThickness ?? DEFAULTS.wheelThickness),
      wheelSpacing: Math.max(0, options.wheelSpacing ?? DEFAULTS.wheelSpacing),
      hue: clampHue(options.hue ?? DEFAULTS.hue),
      color: options.color ?? DEFAULTS.color,
      rotateShape: options.rotateShape ?? DEFAULTS.rotateShape,
    };

    // Resolve initial color: `color` wins over `hue`.
    if (options.color != null) {
      this.hsv = parseColor(options.color);
    } else {
      const h = options.hue != null ? clampHue(options.hue) : DEFAULTS.hue;
      this.hsv = { h, s: 100, v: 100 };
    }

    injectStyles();

    // Build canvas.
    this.canvas = document.createElement("canvas");
    this.canvas.className = "color-wheel-picker-canvas";
    this.canvas.setAttribute("role", "application");
    this.canvas.setAttribute(
      "aria-label",
      "Color wheel picker. Use arrow keys to adjust hue, saturation, and value.",
    );
    this.canvas.tabIndex = 0;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("ColorWheelPicker: 2D canvas context unavailable");
    }
    this.ctx = ctx;

    this.container.classList.add("color-wheel-picker");
    this.container.appendChild(this.canvas);

    // Bind handlers.
    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onKeyDown = this.onKeyDown.bind(this);
    this._onResize = this.handleResize.bind(this);

    this.canvas.addEventListener("pointerdown", this._onPointerDown);
    this.canvas.addEventListener("pointermove", this._onPointerMove);
    this.canvas.addEventListener("pointerup", this._onPointerUp);
    this.canvas.addEventListener("pointercancel", this._onPointerUp);
    this.canvas.addEventListener("keydown", this._onKeyDown);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this._onResize);
      this.resizeObserver.observe(this.canvas);
    }

    this.updateCanvasSize();
    this.render();
    this.updateAria();
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** Set the color from any parseable input. Fires `input` + `change`. */
  setColor(color: string): void {
    this.hsv = parseColor(color);
    this.options.hue = this.hsv.h;
    this.invalidateInnerCache();
    this.scheduleRender();
    this.updateAria();
    const out = this.getColor();
    this.emit("input", out);
    this.emit("change", out);
  }

  /** Get the current color as a full ColorOutput. */
  getColor(): ColorOutput {
    return toColorOutput(this.hsv);
  }

  /** Change the inner selection shape. Preserves the current color. */
  setShape(shape: Shape): void {
    if (this.options.shape === shape) return;
    this.options.shape = shape;
    this.invalidateInnerCache();
    this.scheduleRender();
  }

  /** Change the inner shape diameter in CSS pixels. Preserves the color. */
  setSize(size: number): void {
    const s = Math.max(40, Math.round(size));
    if (this.options.size === s) return;
    this.options.size = s;
    this.updateCanvasSize();
    this.invalidateWheelCache();
    this.invalidateInnerCache();
    this.scheduleRender();
  }

  /** Change the hue (0-360). Preserves S and V. Fires `input` + `change`. */
  setHue(hue: number): void {
    this.hsv = { ...this.hsv, h: clampHue(hue) };
    this.options.hue = this.hsv.h;
    this.invalidateInnerCache();
    this.scheduleRender();
    this.updateAria();
    const out = this.getColor();
    this.emit("input", out);
    this.emit("change", out);
  }

  /** Change the hue wheel radial thickness in pixels. */
  setWheelThickness(thickness: number): void {
    const t = Math.max(4, Math.round(thickness));
    if (this.options.wheelThickness === t) return;
    this.options.wheelThickness = t;
    this.updateCanvasSize();
    this.invalidateWheelCache();
    this.invalidateInnerCache();
    this.scheduleRender();
  }

  /** Change the gap between the inner shape and the wheel in pixels. */
  setWheelSpacing(spacing: number): void {
    const s = Math.max(0, Math.round(spacing));
    if (this.options.wheelSpacing === s) return;
    this.options.wheelSpacing = s;
    this.updateCanvasSize();
    this.invalidateWheelCache();
    this.invalidateInnerCache();
    this.scheduleRender();
  }

  /**
   * When enabled, the inner triangle rotates so its pure-hue vertex tracks
   * the current hue position on the wheel (PRD §4.4 "Rotating hue
   * representation"). Only affects the triangle shape.
   */
  setRotateShape(rotate: boolean): void {
    if (this.options.rotateShape === rotate) return;
    this.options.rotateShape = rotate;
    this.invalidateInnerCache();
    this.scheduleRender();
  }

  /** Subscribe to a picker event. */
  on(event: "input" | "change", handler: ColorHandler): void;

  /** Subscribe to a picker event (escape hatch for arbitrary event names). */
  on(event: string, handler: ColorHandler): void;

  on(event: string, handler: ColorHandler): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set<ColorHandler>();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  /** Unsubscribe from a picker event. */
  off(event: string, handler: ColorHandler): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  /** Tear down: remove listeners, observers, and DOM. Idempotent. */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    this.canvas.removeEventListener("pointerup", this._onPointerUp);
    this.canvas.removeEventListener("pointercancel", this._onPointerUp);
    this.canvas.removeEventListener("keydown", this._onKeyDown);

    if (this.pointerState) {
      try {
        this.canvas.releasePointerCapture(this.pointerState.pointerId);
      } catch {
        /* ignore */
      }
      this.pointerState = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.listeners.clear();

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.container.classList.remove("color-wheel-picker");

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.wheelCache = null;
    this.wheelCacheCtx = null;
    this.innerCache = null;
    this.innerCacheCtx = null;
  }

  // --------------------------------------------------------------------------
  // Geometry
  // --------------------------------------------------------------------------

  private getGeometry(): Geometry {
    const { size, wheelThickness, wheelSpacing } = this.options;
    const innerR = size / 2;
    const wheelInnerR = innerR + wheelSpacing;
    const wheelOuterR = wheelInnerR + wheelThickness;
    const total = wheelOuterR * 2;
    return {
      innerR,
      wheelInnerR,
      wheelOuterR,
      total,
      cx: total / 2,
      cy: total / 2,
    };
  }

  // --------------------------------------------------------------------------
  // Rendering
  // --------------------------------------------------------------------------

  private updateCanvasSize(): void {
    const geom = this.getGeometry();
    const dpr =
      (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    this.canvas.style.width = `${geom.total}px`;
    this.canvas.style.height = `${geom.total}px`;
    this.canvas.width = Math.round(geom.total * dpr);
    this.canvas.height = Math.round(geom.total * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private handleResize(): void {
    if (this._destroyed) return;
    // The canvas's CSS size may have changed (host CSS) or the device pixel
    // ratio may have changed (window moved between monitors). Refresh the
    // backing store and re-render.
    const dpr =
      (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    const geom = this.getGeometry();
    const expectedW = Math.round(geom.total * dpr);
    if (this.canvas.width !== expectedW) {
      this.updateCanvasSize();
      this.invalidateWheelCache();
      this.invalidateInnerCache();
    }
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this._destroyed) return;
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    requestAnimationFrame(() => {
      this._renderScheduled = false;
      if (!this._destroyed) this.render();
    });
  }

  private invalidateWheelCache(): void {
    this.wheelCacheKey = "";
  }

  private invalidateInnerCache(): void {
    this.innerCacheKey = "";
  }

  private render(): void {
    const geom = this.getGeometry();
    const { ctx } = this;
    ctx.clearRect(0, 0, geom.total, geom.total);
    this.renderWheel(geom);
    this.renderInner(geom);
    this.renderMarkers(geom);
  }

  // ---- Hue wheel ----------------------------------------------------------

  private renderWheel(geom: Geometry): void {
    const dpr =
      (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    const key = `wheel-${geom.total}-${dpr}`;
    if (key !== this.wheelCacheKey || !this.wheelCache || !this.wheelCacheCtx) {
      if (!this.wheelCache) {
        this.wheelCache = document.createElement("canvas");
        this.wheelCacheCtx = this.wheelCache.getContext("2d");
      }
      const cache = this.wheelCache;
      const cacheCtx = this.wheelCacheCtx!;
      const backing = Math.round(geom.total * dpr);
      if (cache.width !== backing) {
        cache.width = backing;
        cache.height = backing;
      }
      cacheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cacheCtx.clearRect(0, 0, geom.total, geom.total);
      this.drawWheelTo(cacheCtx, geom);
      this.wheelCacheKey = key;
    }
    this.ctx.drawImage(this.wheelCache, 0, 0, geom.total, geom.total);
  }

  /**
   * Draw the hue wheel directly into a target context. Uses a conic gradient
   * for a perfectly smooth, seamless hue transition (no visible segment
   * seams). Falls back to many fine arc segments if the ConicGradient API
   * is unavailable.
   */
  private drawWheelTo(ctx: CanvasRenderingContext2D, geom: Geometry): void {
    const { cx, cy, wheelInnerR, wheelOuterR } = geom;
    const inner = Math.max(0.5, wheelInnerR);
    const outer = Math.max(inner + 0.5, wheelOuterR);

    if (typeof ctx.createConicGradient === "function") {
      // Conic gradient: start at top (-π/2), hue 0 (red), going clockwise.
      const startAngle = -Math.PI / 2;
      const grad = ctx.createConicGradient(startAngle, cx, cy);
      // 24 stops (every 15°) are enough for a perceptually smooth spectrum.
      for (let h = 0; h <= 360; h += 15) {
        grad.addColorStop(h / 360, `hsl(${h % 360}, 100%, 50%)`);
      }
      grad.addColorStop(1, "hsl(0, 100%, 50%)");
      // Fill the annulus (outer circle minus inner circle) using even-odd.
      ctx.beginPath();
      ctx.arc(cx, cy, outer, 0, Math.PI * 2);
      ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
      ctx.fillStyle = grad;
      ctx.fill("evenodd");
    } else {
      // Fallback: 720 half-degree segments for a near-smooth wheel.
      const segments = 720;
      for (let i = 0; i < segments; i++) {
        const a0 = -Math.PI / 2 + (i / segments) * Math.PI * 2;
        const a1 = -Math.PI / 2 + ((i + 1) / segments) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, outer, a0, a1);
        ctx.arc(cx, cy, inner, a1, a0, true);
        ctx.closePath();
        ctx.fillStyle = `hsl(${(i / segments) * 360}, 100%, 50%)`;
        ctx.fill();
      }
    }
  }

  // ---- Inner shape --------------------------------------------------------

  private renderInner(geom: Geometry): void {
    const { shape } = this.options;
    if (shape === "none") {
      this.renderNone(geom);
      return;
    }

    const dpr =
      (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    const rotation = this.getShapeRotation();
    const key = `inner-${shape}-${geom.total}-${dpr}-${this.hsv.h}-${rotation}`;
    if (key !== this.innerCacheKey || !this.innerCache || !this.innerCacheCtx) {
      if (!this.innerCache) {
        this.innerCache = document.createElement("canvas");
        this.innerCacheCtx = this.innerCache.getContext("2d");
      }
      const cache = this.innerCache;
      const cacheCtx = this.innerCacheCtx!;
      const backing = Math.round(geom.total * dpr);
      if (cache.width !== backing) {
        cache.width = backing;
        cache.height = backing;
      }
      cacheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cacheCtx.clearRect(0, 0, geom.total, geom.total);

      if (shape === "triangle") this.drawTriangleTo(cacheCtx, geom, rotation);
      else if (shape === "square") this.drawSquareTo(cacheCtx, geom, rotation);
      else if (shape === "disk") this.drawDiskTo(cacheCtx, geom, rotation);

      this.innerCacheKey = key;
    }

    this.ctx.drawImage(this.innerCache, 0, 0, geom.total, geom.total);
  }

  /**
   * Returns the rotation angle (radians, 0 = top, clockwise) applied to the
   * inner shape. When `rotateShape` is enabled, each shape's pure-hue
   * feature tracks the current hue position on the wheel:
   *   - triangle: pure-hue vertex B (120° default) → aligns with hue
   *   - square:   pure-hue corner (top-right, S=1 V=1, 45° default) → aligns with hue
   *   - disk:     pure-hue corner (top-right, 45° default) → aligns with hue
   */
  private getShapeRotation(): number {
    if (!this.options.rotateShape) return 0;
    const hueRad = (this.hsv.h * Math.PI) / 180;
    if (this.options.shape === "triangle") {
      // Pure-hue vertex B sits at 120° clockwise from top by default.
      const bAngleRad = (120 * Math.PI) / 180;
      return hueRad - bAngleRad;
    }
    if (this.options.shape === "square" || this.options.shape === "disk") {
      // The pure-hue corner (S = 1, V = 1) is the top-right of the gradient,
      // which sits at 45° clockwise from top. Rotate so that corner points
      // toward the wheel hue — matching how the triangle's pure-hue vertex
      // tracks the hue.
      return hueRad - (45 * Math.PI) / 180;
    }
    return 0;
  }

  /** None mode: solid filled inner circle in the current color. */
  private renderNone(geom: Geometry): void {
    const { cx, cy, innerR } = geom;
    const { ctx, hsv } = this;
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.5, innerR), 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.fill();
  }

  /**
   * Square inner shape: inscribed square (side = innerR · √2) with three
   * stacked layers — pure hue → white-to-transparent (S) → transparent-to-
   * black (V). When `rotation` is non-zero the entire square (clip + gradient)
   * is rotated around the center so its pure-hue edge tracks the wheel hue.
   */
  private drawSquareTo(
    ctx: CanvasRenderingContext2D,
    geom: Geometry,
    rotation: number,
  ): void {
    const { cx, cy, innerR } = geom;
    const { hsv } = this;
    const side = innerR * Math.SQRT2;
    const half = side / 2;
    const left = cx - half;
    const top = cy - half;

    ctx.save();
    // Apply rotation first so the clip and gradient rotate together.
    if (rotation !== 0) {
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.translate(-cx, -cy);
    }
    // Clip to the square so corners don't bleed into the wheel gap.
    ctx.beginPath();
    ctx.rect(left, top, side, side);
    ctx.clip();

    // 1) Pure hue base.
    ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
    ctx.fillRect(left, top, side, side);

    // 2) White → transparent (saturation, left → right).
    const gSat = ctx.createLinearGradient(left, 0, left + side, 0);
    gSat.addColorStop(0, "rgba(255, 255, 255, 1)");
    gSat.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gSat;
    ctx.fillRect(left, top, side, side);

    // 3) Transparent → black (value, top → bottom).
    const gVal = ctx.createLinearGradient(0, top, 0, top + side);
    gVal.addColorStop(0, "rgba(0, 0, 0, 0)");
    gVal.addColorStop(1, "rgba(0, 0, 0, 1)");
    ctx.fillStyle = gVal;
    ctx.fillRect(left, top, side, side);

    ctx.restore();
  }

  /**
   * Triangle inner shape: equilateral triangle inscribed in the inner circle.
   *   A = top             (S = 0, V = 1)  — white
   *   B = bottom-right    (S = 1, V = 1)  — pure hue
   *   C = bottom-left     (S = *, V = 0)  — black
   *
   * When `rotation` is non-zero, all three vertices are rotated around the
   * center by that angle (radians, 0 = top, clockwise) — used by the
   * `rotateShape` option so the pure-hue vertex tracks the wheel hue.
   *
   * Rendered per-pixel via barycentric coordinates with 2×2 supersampling
   * for smooth anti-aliased edges. A temp offscreen canvas is used because
   * `putImageData` ignores the context transform (dpr scaling).
   */
  private drawTriangleTo(
    ctx: CanvasRenderingContext2D,
    geom: Geometry,
    rotation: number,
  ): void {
    const { cx, cy, innerR } = geom;
    const r = Math.max(1, innerR);

    // Base vertices (rotation = 0): A at top, B at bottom-right, C at bottom-left.
    const baseA = { x: cx, y: cy - r };
    const baseB = { x: cx + (r * Math.sqrt(3)) / 2, y: cy + r / 2 };
    const baseC = { x: cx - (r * Math.sqrt(3)) / 2, y: cy + r / 2 };

    const verts = [baseA, baseB, baseC].map((p) =>
      rotatePoint(p, cx, cy, rotation),
    );

    this.drawBarycentric(ctx, verts);
  }

  /**
   * Per-pixel triangle renderer using barycentric coordinates with 2×2
   * supersampling. Renders at device resolution into a temp canvas, then
   * composites via `drawImage` (which respects the dpr transform) —
   * `putImageData` would ignore the transform and misplace the image on
   * high-DPI displays.
   *
   * For a point P with barycentric (α, β, γ) w.r.t. (A, B, C):
   *   P = α·A + β·B + γ·C,   α + β + γ = 1
   *   V = α + β       (white + pure-hue weights)
   *   S = β / V       (pure-hue share of the non-black weights)
   */
  private drawBarycentric(
    ctx: CanvasRenderingContext2D,
    verts: { x: number; y: number }[],
  ): void {
    const { hsv } = this;
    const [A, B, C] = verts;

    // CSS-pixel bounding box.
    const minX = Math.floor(Math.min(A.x, B.x, C.x));
    const maxX = Math.ceil(Math.max(A.x, B.x, C.x));
    const minY = Math.floor(Math.min(A.y, B.y, C.y));
    const maxY = Math.ceil(Math.max(A.y, B.y, C.y));
    const cssW = maxX - minX;
    const cssH = maxY - minY;
    if (cssW <= 0 || cssH <= 0) return;

    // Device-pixel dimensions for crisp rendering on high-DPI displays.
    const dpr =
      (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    const dw = Math.max(1, Math.round(cssW * dpr));
    const dh = Math.max(1, Math.round(cssH * dpr));

    // Barycentric determinant and inverse (computed in CSS-pixel space).
    const det = (B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y);
    if (Math.abs(det) < 1e-9) return;
    const invDet = 1 / det;

    const hue = hsv.h;

    // Build the ImageData at device resolution.
    const img = ctx.createImageData(dw, dh);
    const data = img.data;

    for (let py = 0; py < dh; py++) {
      for (let px = 0; px < dw; px++) {
        // Convert device pixel to CSS-pixel sample point (pixel center).
        const cssPx = minX + (px + 0.5) / dpr;
        const cssPy = minY + (py + 0.5) / dpr;

        // 2×2 supersampling: sample 4 sub-pixels for smooth edges.
        let rSum = 0,
          gSum = 0,
          bSum = 0,
          count = 0;
        for (let sy = 0; sy < 2; sy++) {
          for (let sx = 0; sx < 2; sx++) {
            const subPx = cssPx + ((sx - 0.5) * 0.5) / dpr;
            const subPy = cssPy + ((sy - 0.5) * 0.5) / dpr;
            const a =
              ((B.y - C.y) * (subPx - C.x) + (C.x - B.x) * (subPy - C.y)) *
              invDet;
            const b =
              ((C.y - A.y) * (subPx - C.x) + (A.x - C.x) * (subPy - C.y)) *
              invDet;
            const g = 1 - a - b;
            if (a >= 0 && b >= 0 && g >= 0) {
              const V = a + b;
              const S = V > 0 ? b / V : 0;
              const rgb = hsvToRgb(hue, S * 100, V * 100);
              rSum += rgb.r;
              gSum += rgb.g;
              bSum += rgb.b;
              count++;
            }
          }
        }
        if (count === 0) continue;
        const aa = count / 4;
        const i = (py * dw + px) * 4;
        data[i] = Math.round(rSum / count);
        data[i + 1] = Math.round(gSum / count);
        data[i + 2] = Math.round(bSum / count);
        data[i + 3] = Math.round(aa * 255);
      }
    }

    // Composite via a temp canvas + drawImage so the dpr transform is
    // respected. putImageData would ignore it and misplace the image.
    const temp = document.createElement("canvas");
    temp.width = dw;
    temp.height = dh;
    const tctx = temp.getContext("2d");
    if (!tctx) return;
    tctx.putImageData(img, 0, 0);
    // drawImage respects the ctx transform — (minX, minY) are CSS coords.
    ctx.drawImage(temp, minX, minY);
  }

  /**
   * Disk inner shape: a saturation×value gradient (identical distribution to
   * the square) clipped to a circle. This gives the disk the same flat 2D
   * color layout as the square and triangle — white on the left, pure hue on
   * the right, black at the bottom — rather than a radial pattern emanating
   * from the center.
   *
   * The gradient fills the circumscribing square (side = 2·innerR) so the
   * entire circle is covered. When `rotation` is non-zero the gradient
   * rotates so its pure-hue edge tracks the wheel hue.
   */
  private drawDiskTo(
    ctx: CanvasRenderingContext2D,
    geom: Geometry,
    rotation: number,
  ): void {
    const { cx, cy, innerR } = geom;
    const { hsv } = this;
    const r = Math.max(1, innerR);

    ctx.save();
    // Clip to the circle (rotation-invariant boundary).
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Apply rotation so the SV gradient tracks the hue.
    if (rotation !== 0) {
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.translate(-cx, -cy);
    }

    // Circumscribing square (side = 2r) so the gradient covers the full
    // circle. x → saturation (0..1 left→right), y → value (1..0 top→bottom).
    const side = 2 * r;
    const left = cx - r;
    const top = cy - r;

    // 1) Pure hue base.
    ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
    ctx.fillRect(left, top, side, side);

    // 2) White → transparent (saturation, left → right).
    const gSat = ctx.createLinearGradient(left, 0, left + side, 0);
    gSat.addColorStop(0, "rgba(255, 255, 255, 1)");
    gSat.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gSat;
    ctx.fillRect(left, top, side, side);

    // 3) Transparent → black (value, top → bottom).
    const gVal = ctx.createLinearGradient(0, top, 0, top + side);
    gVal.addColorStop(0, "rgba(0, 0, 0, 0)");
    gVal.addColorStop(1, "rgba(0, 0, 0, 1)");
    ctx.fillStyle = gVal;
    ctx.fillRect(left, top, side, side);

    ctx.restore();
  }

  // ---- Markers ------------------------------------------------------------

  private renderMarkers(geom: Geometry): void {
    this.renderHueMarker(geom);
    if (this.options.shape !== "none") {
      this.renderInnerMarker(geom);
    }
  }

  /**
   * Hue marker — a small disc sitting on the wheel ring at the angular
   * position of the current hue. White outer halo + dark inner ring + a
   * center dot in the pure-hue color guarantees visibility on any hue.
   */
  private renderHueMarker(geom: Geometry): void {
    const { cx, cy, wheelInnerR, wheelOuterR } = geom;
    const { ctx, hsv } = this;
    const midR = (wheelInnerR + wheelOuterR) / 2;
    const angle = -Math.PI / 2 + (hsv.h * Math.PI) / 180;
    const x = cx + midR * Math.cos(angle);
    const y = cy + midR * Math.sin(angle);

    const thickness = wheelOuterR - wheelInnerR;
    const markerR = clamp(thickness / 2 - 1, 4, 9);
    const ringR = markerR + 1.5;

    // White halo.
    ctx.beginPath();
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.stroke();

    // Dark inner ring.
    ctx.beginPath();
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    ctx.stroke();

    // Pure-hue center dot.
    const rgb = hsvToRgb(hsv.h, 100, 100);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, markerR - 1.5), 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.fill();
  }

  /**
   * Inner marker — a small ring at the selected (S, V) position inside the
   * current shape. White halo + dark inner ring + center dot in the actual
   * selected color so it remains perceivable against any background.
   */
  private renderInnerMarker(geom: Geometry): void {
    const pos = this.getInnerMarkerPosition(geom);
    if (!pos) return;
    const { ctx, hsv } = this;
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);

    const markerR = 7;
    // White halo.
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, markerR, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.stroke();
    // Dark inner ring.
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, markerR, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    ctx.stroke();
    // Selected color dot.
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, Math.max(1, markerR - 3.5), 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.fill();
  }

  /** Compute the inner marker position from the current HSV state. */
  private getInnerMarkerPosition(
    geom: Geometry,
  ): { x: number; y: number } | null {
    const { shape } = this.options;
    const { cx, cy, innerR } = geom;
    const s = this.hsv.s / 100;
    const v = this.hsv.v / 100;

    if (shape === "square") {
      const side = innerR * Math.SQRT2;
      const half = side / 2;
      const left = cx - half;
      const top = cy - half;
      const pos = { x: left + s * side, y: top + (1 - v) * side };
      return rotatePoint(pos, cx, cy, this.getShapeRotation());
    }

    if (shape === "disk") {
      // Same SV mapping as the square but using the circumscribing square
      // (side = 2·innerR), then constrained to the circle and rotated.
      const side = 2 * innerR;
      const left = cx - innerR;
      const top = cy - innerR;
      let px = left + s * side;
      let py = top + (1 - v) * side;
      // Constrain to the circle so the marker stays on the visible disk.
      const ddx = px - cx;
      const ddy = py - cy;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist > innerR) {
        px = cx + (ddx / dist) * innerR;
        py = cy + (ddy / dist) * innerR;
      }
      return rotatePoint({ x: px, y: py }, cx, cy, this.getShapeRotation());
    }

    if (shape === "triangle") {
      const r = innerR;
      const rotation = this.getShapeRotation();
      // Base (unrotated) vertices, then apply rotation.
      const A = rotatePoint({ x: cx, y: cy - r }, cx, cy, rotation);
      const B = rotatePoint(
        { x: cx + (r * Math.sqrt(3)) / 2, y: cy + r / 2 },
        cx,
        cy,
        rotation,
      );
      const C = rotatePoint(
        { x: cx - (r * Math.sqrt(3)) / 2, y: cy + r / 2 },
        cx,
        cy,
        rotation,
      );
      const alpha = v * (1 - s);
      const beta = s * v;
      const gamma = 1 - v;
      return {
        x: alpha * A.x + beta * B.x + gamma * C.x,
        y: alpha * A.y + beta * B.y + gamma * C.y,
      };
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Pointer interaction
  // --------------------------------------------------------------------------

  private getCanvasPoint(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    // Use rect.width to scale in case the canvas has been resized via CSS.
    const geom = this.getGeometry();
    const scaleX = geom.total / (rect.width || geom.total);
    const scaleY = geom.total / (rect.height || geom.total);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private onPointerDown(e: PointerEvent): void {
    if (this._destroyed) return;
    const { x, y } = this.getCanvasPoint(e);
    const geom = this.getGeometry();
    const dx = x - geom.cx;
    const dy = y - geom.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const onWheel =
      dist >= geom.wheelInnerR - 1 && dist <= geom.wheelOuterR + 1;
    const inInner = dist <= geom.innerR;

    if (onWheel) {
      this.pointerState = { type: "wheel", pointerId: e.pointerId };
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      this.updateHueFromPoint(x, y, geom);
      e.preventDefault();
    } else if (inInner && this.options.shape !== "none") {
      this.pointerState = { type: "inner", pointerId: e.pointerId };
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      this.updateInnerFromPoint(x, y, geom);
      e.preventDefault();
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.pointerState) return;
    const { x, y } = this.getCanvasPoint(e);
    const geom = this.getGeometry();
    if (this.pointerState.type === "wheel") {
      this.updateHueFromPoint(x, y, geom);
    } else {
      this.updateInnerFromPoint(x, y, geom);
    }
    e.preventDefault();
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.pointerState) return;
    const id = this.pointerState.pointerId;
    try {
      this.canvas.releasePointerCapture(id);
    } catch {
      /* ignore */
    }
    this.pointerState = null;
    this.emit("change", this.getColor());
  }

  private updateHueFromPoint(
    x: number,
    y: number,
    geom: Geometry,
  ): void {
    const dx = x - geom.cx;
    const dy = y - geom.cy;
    // Angle from "up" vector, increasing clockwise (matches wheel layout).
    let theta = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (theta < 0) theta += 360;
    this.hsv = { ...this.hsv, h: clampHue(theta) };
    this.options.hue = this.hsv.h;
    this.invalidateInnerCache();
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getColor());
  }

  private updateInnerFromPoint(
    x: number,
    y: number,
    geom: Geometry,
  ): void {
    const { shape } = this.options;
    const { cx, cy, innerR } = geom;
    let newHsv: HSV | null = null;

    if (shape === "square") {
      // Un-rotate the pointer into the square's local coordinate space.
      const rotation = this.getShapeRotation();
      const local = rotatePoint({ x, y }, cx, cy, -rotation);
      const lx = local.x;
      const ly = local.y;
      const side = innerR * Math.SQRT2;
      const half = side / 2;
      const left = cx - half;
      const top = cy - half;
      const s = clamp((lx - left) / side, 0, 1);
      const v = clamp(1 - (ly - top) / side, 0, 1);
      newHsv = { ...this.hsv, s: s * 100, v: v * 100 };
    } else if (shape === "disk") {
      // Disk uses the same SV mapping as the square (circumscribing square,
      // side = 2·innerR). Un-rotate the pointer first.
      const rotation = this.getShapeRotation();
      const local = rotatePoint({ x, y }, cx, cy, -rotation);
      const lx = local.x;
      const ly = local.y;
      const side = 2 * innerR;
      const left = cx - innerR;
      const top = cy - innerR;
      const s = clamp((lx - left) / side, 0, 1);
      const v = clamp(1 - (ly - top) / side, 0, 1);
      newHsv = { ...this.hsv, s: s * 100, v: v * 100 };
    } else if (shape === "triangle") {
      const r = innerR;
      // When rotateShape is enabled, the triangle is drawn rotated. Un-rotate
      // the pointer point into the triangle's local coordinate space before
      // computing barycentric coordinates.
      const rotation = this.getShapeRotation();
      const local = rotatePoint({ x, y }, cx, cy, -rotation);
      const lx = local.x;
      const ly = local.y;

      const Ax = cx;
      const Ay = cy - r;
      const Bx = cx + (r * Math.sqrt(3)) / 2;
      const By = cy + r / 2;
      const Cx = cx - (r * Math.sqrt(3)) / 2;
      const Cy = cy + r / 2;

      const det = (By - Cy) * (Ax - Cx) + (Cx - Bx) * (Ay - Cy);
      if (Math.abs(det) < 1e-9) return;
      const invDet = 1 / det;
      const alpha = ((By - Cy) * (lx - Cx) + (Cx - Bx) * (ly - Cy)) * invDet;
      const beta = ((Cy - Ay) * (lx - Cx) + (Ax - Cx) * (ly - Cy)) * invDet;
      const gamma = 1 - alpha - beta;

      // Clamp to the triangle (project to nearest edge if outside).
      let a = alpha < 0 ? 0 : alpha;
      let b = beta < 0 ? 0 : beta;
      let g = gamma < 0 ? 0 : gamma;
      const sum = a + b + g;
      if (sum <= 0) return;
      a /= sum;
      b /= sum;
      g /= sum;

      const V = a + b;
      const S = V > 0 ? b / V : 0;
      newHsv = { ...this.hsv, s: S * 100, v: V * 100 };
    }

    if (!newHsv) return;
    this.hsv = newHsv;
    this.scheduleRender();
    this.emit("input", this.getColor());
  }

  // --------------------------------------------------------------------------
  // Keyboard interaction
  // --------------------------------------------------------------------------

  private onKeyDown(e: KeyboardEvent): void {
    if (this._destroyed) return;
    const step = e.shiftKey ? 10 : 1;
    const hasInner = this.options.shape !== "none";
    let handled = false;

    switch (e.key) {
      case "ArrowLeft":
        if ((e.ctrlKey || e.metaKey) && hasInner) {
          this.adjustSaturation(-step);
        } else {
          this.adjustHue(-step);
        }
        handled = true;
        break;
      case "ArrowRight":
        if ((e.ctrlKey || e.metaKey) && hasInner) {
          this.adjustSaturation(step);
        } else {
          this.adjustHue(step);
        }
        handled = true;
        break;
      case "ArrowUp":
        if (hasInner) {
          this.adjustValue(step);
        } else {
          this.adjustHue(step);
        }
        handled = true;
        break;
      case "ArrowDown":
        if (hasInner) {
          this.adjustValue(-step);
        } else {
          this.adjustHue(-step);
        }
        handled = true;
        break;
      case "Home":
        this.adjustHue(-360);
        handled = true;
        break;
      case "End":
        this.adjustHue(360);
        handled = true;
        break;
      default:
        break;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private adjustHue(delta: number): void {
    this.hsv = { ...this.hsv, h: clampHue(this.hsv.h + delta) };
    this.options.hue = this.hsv.h;
    this.invalidateInnerCache();
    this.updateAria();
    this.scheduleRender();
    const out = this.getColor();
    this.emit("input", out);
    this.emit("change", out);
  }

  private adjustSaturation(delta: number): void {
    this.hsv = { ...this.hsv, s: clamp(this.hsv.s + delta, 0, 100) };
    this.scheduleRender();
    const out = this.getColor();
    this.emit("input", out);
    this.emit("change", out);
  }

  private adjustValue(delta: number): void {
    this.hsv = { ...this.hsv, v: clamp(this.hsv.v + delta, 0, 100) };
    this.scheduleRender();
    const out = this.getColor();
    this.emit("input", out);
    this.emit("change", out);
  }

  // --------------------------------------------------------------------------
  // ARIA
  // --------------------------------------------------------------------------

  private updateAria(): void {
    const out = this.getColor();
    this.canvas.setAttribute(
      "aria-valuetext",
      `Hue ${Math.round(this.hsv.h)}°, ${out.hex}`,
    );
  }

  // --------------------------------------------------------------------------
  // Event emitter
  // --------------------------------------------------------------------------

  private emit(event: string, color: ColorOutput): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Clone to a plain array so a handler unsubscribing during iteration
    // doesn't skip subsequent handlers.
    const handlers = Array.from(set);
    for (const h of handlers) {
      try {
        h(color);
      } catch (err) {
        // Never let a listener error take down the picker.
        console.error("ColorWheelPicker listener error:", err);
      }
    }
  }
}
