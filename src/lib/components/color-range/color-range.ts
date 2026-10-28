/**
 * ColorRange — a 1D color slider component (vanilla TypeScript).
 *
 * Renders a horizontal or vertical gradient track for a single color
 * dimension, with a draggable thumb. Supports four modes:
 *
 *   hue       — 0..360, the full hue spectrum
 *   lightness — 0..100, from black → the base color → white
 *   contrast  — 0..100, the base color mixed toward black (0) or white (100)
 *   alpha     — 0..1, transparent → opaque over a checkerboard
 *
 * Public API:
 *   new ColorRange(container, { mode, value, color, orientation, thickness, length })
 *   getValue(): number
 *   setValue(v: number): void
 *   setMode(mode): void
 *   setColor(color: string): void
 *   setOrientation(orientation): void
 *   setThickness(n): void
 *   setLength(n): void
 *   on("input" | "change", handler): void
 *   off(event, handler): void
 *   destroy(): void
 *
 * Framework-independent. Canvas-based. No React or other UI framework.
 */

import { CustomButton } from "@/lib/components/custom-button";

export type ColorRangeMode = "hue" | "lightness" | "contrast" | "alpha";
export type ColorRangeOrientation = "horizontal" | "vertical";

export interface ColorRangeOptions {
  /** Which color dimension the track represents. Default "hue". */
  mode?: ColorRangeMode;
  /** Initial value: 0..360 for hue, 0..100 for lightness/contrast, 0..1 for alpha. Default: mode-dependent. */
  value?: number;
  /**
   * The base color used by lightness/contrast/alpha modes. For hue mode it
   * is ignored (the track always shows the full spectrum). Accepts hex,
   * rgb(), hsl(), or named colors. Default "#4287f5".
   */
  color?: string;
  /** Track orientation. Default "horizontal". */
  orientation?: ColorRangeOrientation;
  /** Track thickness in CSS pixels (the short dimension). Default 16. */
  thickness?: number;
  /** Track length in CSS pixels (the long dimension). Default 260. */
  length?: number;
}

export interface ColorRangeResultColor {
  /** #RRGGBB (no alpha channel). */
  hex: string;
  /** CSS rgba() string, e.g. "rgba(66,135,245,1)". */
  rgba: string;
  r: number;
  g: number;
  b: number;
  /** Alpha 0..1. */
  a: number;
}

export interface ColorRangeValueOutput {
  mode: ColorRangeMode;
  value: number;
  /** Human-readable label, e.g. "210°" or "45%" or "0.80". */
  label: string;
  /** The actual color produced by applying the mode's value to the base color. */
  color: ColorRangeResultColor;
}

interface Geometry {
  /** Total component width in CSS pixels (including padding). */
  totalW: number;
  /** Total component height in CSS pixels. */
  totalH: number;
  /** Track x origin (left). */
  tx: number;
  /** Track y origin (top). */
  ty: number;
  /** Track length (long dimension). */
  tLen: number;
  /** Track thickness (short dimension). */
  tThick: number;
  /** Thumb center along the track axis (0..tLen). */
  thumbPos: number;
}

const DEFAULTS: Required<ColorRangeOptions> = {
  mode: "hue",
  value: 210,
  color: "#4287f5",
  orientation: "horizontal",
  thickness: 16,
  length: 260,
};

const STYLE_ID = "color-range-styles";

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.color-range {
  display: inline-block;
  position: relative;
  font-family: inherit;
  --color-range-focus-ring: rgba(217, 255, 102, 0.55);
}
.color-range canvas {
  display: block;
  touch-action: none;
  outline: none;
  cursor: pointer;
  border-radius: 8px;
}
.color-range canvas:focus-visible {
  box-shadow: 0 0 0 3px var(--color-range-focus-ring);
}
`;
  document.head.appendChild(style);
}

// ---- Tiny color helpers (self-contained, no external deps) ----

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function clampHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let s = hex.trim().replace(/^#/, "");
  if (s.length === 3) {
    s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  }
  if (s.length !== 6) {
    return { r: 66, g: 135, b: 245 }; // fallback
  }
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return { r: 66, g: 135, b: 245 };
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = clampHue(h);
  s = clamp(s, 0, 100) / 100;
  v = clamp(v, 0, 100) / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s: s * 100, v: max * 100 };
}

type Handler = (v: ColorRangeValueOutput) => void;

export class ColorRange {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private options: Required<ColorRangeOptions>;
  /** Base color in HSV (for lightness/contrast modes that need hue+sat). */
  private baseHsv: { h: number; s: number; v: number };
  /** Base color in RGB (for alpha mode compositing). */
  private baseRgb: { r: number; g: number; b: number };

  private readonly listeners: Map<string, Set<Handler>> = new Map();
  private pointerState: { pointerId: number } | null = null;
  private _destroyed = false;

  /** CustomButton thumb overlay (when useCustomButtonThumb is enabled). */
  private thumbOverlayEl: HTMLDivElement | null = null;
  private thumbBtn: CustomButton | null = null;

  /** Cached track canvas (depends on mode, color, orientation, geometry). */
  private trackCache: HTMLCanvasElement | null = null;
  private trackCacheCtx: CanvasRenderingContext2D | null = null;
  private trackCacheKey = "";

  private readonly _onPointerDown: (e: PointerEvent) => void;
  private readonly _onPointerMove: (e: PointerEvent) => void;
  private readonly _onPointerUp: (e: PointerEvent) => void;
  private readonly _onKeyDown: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, options: ColorRangeOptions = {}) {
    if (!container) throw new Error("ColorRange: container is required");
    this.container = container;

    this.options = {
      mode: options.mode ?? DEFAULTS.mode,
      value: options.value ?? defaultValueForMode(options.mode ?? DEFAULTS.mode),
      color: options.color ?? DEFAULTS.color,
      orientation: options.orientation ?? DEFAULTS.orientation,
      thickness: Math.max(6, options.thickness ?? DEFAULTS.thickness),
      length: Math.max(40, options.length ?? DEFAULTS.length),
    };

    const rgb = parseHex(this.options.color);
    this.baseRgb = rgb;
    this.baseHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    injectStyles();

    this.canvas = document.createElement("canvas");
    this.canvas.className = "color-range-canvas";
    this.canvas.setAttribute("role", "slider");
    this.canvas.setAttribute(
      "aria-label",
      `${this.options.mode} color range`,
    );
    this.canvas.tabIndex = 0;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("ColorRange: 2D canvas context unavailable");
    this.ctx = ctx;

    this.container.classList.add("color-range");
    this.container.appendChild(this.canvas);

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onKeyDown = this.onKeyDown.bind(this);

    this.canvas.addEventListener("pointerdown", this._onPointerDown);
    this.canvas.addEventListener("pointermove", this._onPointerMove);
    this.canvas.addEventListener("pointerup", this._onPointerUp);
    this.canvas.addEventListener("pointercancel", this._onPointerUp);
    this.canvas.addEventListener("keydown", this._onKeyDown);

    this.updateCanvasSize();
    this.render();
    this.updateAria();
  }

  // ---- Public API ----

  getValue(): number {
    return this.options.value;
  }

  /**
   * The actual color produced by applying the current mode's value to the
   * base color. All modes process the same base color object, so the result
   * is always a concrete, visible color.
   */
  getResultColor(): ColorRangeResultColor {
    return computeResultColor(this.options.mode, this.options.value, this.baseRgb, this.baseHsv);
  }

  getValueOutput(): ColorRangeValueOutput {
    return {
      mode: this.options.mode,
      value: this.options.value,
      label: this.formatLabel(),
      color: this.getResultColor(),
    };
  }

  setValue(value: number): void {
    this.options.value = this.clampValue(value);
    this.invalidateTrackCache(); // thumb moves, but cache key includes value? No — thumb is drawn on top, track doesn't depend on value. Skip invalidation.
    this.updateAria();
    this.scheduleRender();
    const out = this.getValueOutput();
    this.emit("input", out);
    this.emit("change", out);
  }

  setMode(mode: ColorRangeMode): void {
    if (this.options.mode === mode) return;
    this.options.mode = mode;
    this.options.value = defaultValueForMode(mode);
    this.invalidateTrackCache();
    this.canvas.setAttribute("aria-label", `${mode} color range`);
    this.updateAria();
    this.scheduleRender();
  }

  setColor(color: string): void {
    const rgb = parseHex(color);
    this.baseRgb = rgb;
    this.baseHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    this.options.color = color;
    this.invalidateTrackCache();
    this.scheduleRender();
  }

  setOrientation(orientation: ColorRangeOrientation): void {
    if (this.options.orientation === orientation) return;
    this.options.orientation = orientation;
    this.updateCanvasSize();
    this.invalidateTrackCache();
    this.scheduleRender();
  }

  setThickness(thickness: number): void {
    const t = Math.max(6, Math.round(thickness));
    if (this.options.thickness === t) return;
    this.options.thickness = t;
    this.updateCanvasSize();
    this.invalidateTrackCache();
    this.scheduleRender();
  }

  setLength(length: number): void {
    const l = Math.max(40, Math.round(length));
    if (this.options.length === l) return;
    this.options.length = l;
    this.updateCanvasSize();
    this.invalidateTrackCache();
    this.scheduleRender();
  }

  on(event: "input" | "change", handler: Handler): void;
  on(event: string, handler: Handler): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set<Handler>();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  off(event: string, handler: Handler): void {
    const set = this.listeners.get(event);
    if (set) set.delete(handler);
  }

  /** Update the CustomButton thumb's properties at runtime. */
  setThumbProp(prop: string, value: unknown): void {
    if (!this.thumbBtn) return;
    switch (prop) {
      case "text": this.thumbBtn.setText(value as string); break;
      case "icon": this.thumbBtn.setIcon(value as string); break;
      case "iconType": this.thumbBtn.setIconType(value as any); break;
      case "iconPosition": this.thumbBtn.setIconPosition(value as any); break;
      case "size":
        this.thumbBtn.setSize(value as any);
        this.thumbBtn.setWidth(0);
        this.thumbBtn.setHeight(0);
        break;
      case "disabled": this.thumbBtn.setDisabled(!!value); break;
      case "fullWidth": this.thumbBtn.setFullWidth(!!value); break;
      case "width": this.thumbBtn.setWidth(Number(value)); break;
      case "height": this.thumbBtn.setHeight(Number(value)); break;
      case "draggable": this.thumbBtn.setDraggable(!!value); break;
      case "active": this.thumbBtn.setActive(!!value); break;
    }
    this.scheduleRender();
  }

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
      } catch { /* ignore */ }
      this.pointerState = null;
    }
    this.listeners.clear();
    this.thumbBtn?.destroy();
    this.thumbOverlayEl?.remove();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.container.classList.remove("color-range");
    this.trackCache = null;
    this.trackCacheCtx = null;
  }

  // ---- Geometry & rendering ----

  private getGeometry(): Geometry {
    const { orientation, thickness, length, value } = this.options;
    const pad = 8; // padding so the thumb fits within the canvas
    if (orientation === "horizontal") {
      const totalW = length + pad * 2;
      const totalH = thickness + pad * 2;
      const tLen = length;
      const tThick = thickness;
      const tx = pad;
      const ty = pad;
      const thumbPos = (valueToFraction(value, this.options.mode) * tLen);
      return { totalW, totalH, tx, ty, tLen, tThick, thumbPos };
    } else {
      const totalW = thickness + pad * 2;
      const totalH = length + pad * 2;
      const tLen = length;
      const tThick = thickness;
      const tx = pad;
      const ty = pad;
      const thumbPos = valueToFraction(value, this.options.mode) * tLen;
      return { totalW, totalH, tx, ty, tLen, tThick, thumbPos };
    }
  }

  private updateCanvasSize(): void {
    const geom = this.getGeometry();
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    this.canvas.style.width = `${geom.totalW}px`;
    this.canvas.style.height = `${geom.totalH}px`;
    this.canvas.width = Math.round(geom.totalW * dpr);
    this.canvas.height = Math.round(geom.totalH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private scheduleRender(): void {
    if (this._destroyed) return;
    requestAnimationFrame(() => {
      if (!this._destroyed) this.render();
    });
  }

  private invalidateTrackCache(): void {
    this.trackCacheKey = "";
  }

  private render(): void {
    const geom = this.getGeometry();
    this.ctx.clearRect(0, 0, geom.totalW, geom.totalH);
    this.renderTrack(geom);
    // Thumb is always rendered as a CustomButton DOM overlay
    this.updateCustomButtonThumb(geom);
  }

  /** Create or update the CustomButton thumb overlay. */
  private updateCustomButtonThumb(geom: Geometry): void {
    const thumbSize = 16;
    if (!this.thumbOverlayEl) {
      this.thumbOverlayEl = document.createElement("div");
      this.thumbOverlayEl.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5;";
      this.container.appendChild(this.thumbOverlayEl);
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:absolute;pointer-events:none;";
      this.thumbOverlayEl.appendChild(wrap);
      this.thumbBtn = new CustomButton(wrap, {
        variant: "thumb", size: "sm", width: thumbSize, height: thumbSize,
      });
      this.thumbBtn.getElement().style.pointerEvents = "none";
    }
    // Compute thumb position
    const f = valueToFraction(this.options.value, this.options.mode);
    const horizontal = this.options.orientation === "horizontal";
    const x = horizontal ? geom.tx + f * geom.tLen : geom.tx + geom.tThick / 2;
    const y = horizontal ? geom.ty + geom.tThick / 2 : geom.ty + f * geom.tLen;
    // Get current color for the thumb dot
    const color = this.getResultColor().hex;
    if (this.thumbBtn) {
      this.thumbBtn.setPosition(x, y);
    }
  }

  private renderTrack(geom: Geometry): void {
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    const key = `track-${this.options.mode}-${this.options.orientation}-${geom.tLen}-${geom.tThick}-${dpr}-${this.options.color}`;
    if (key !== this.trackCacheKey || !this.trackCache || !this.trackCacheCtx) {
      if (!this.trackCache) {
        this.trackCache = document.createElement("canvas");
        this.trackCacheCtx = this.trackCache.getContext("2d");
      }
      const cache = this.trackCache;
      const cctx = this.trackCacheCtx!;
      const bw = Math.round(geom.totalW * dpr);
      const bh = Math.round(geom.totalH * dpr);
      if (cache.width !== bw || cache.height !== bh) {
        cache.width = bw;
        cache.height = bh;
      }
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.clearRect(0, 0, geom.totalW, geom.totalH);
      this.drawTrackTo(cctx, geom);
      this.trackCacheKey = key;
    }
    this.ctx.drawImage(this.trackCache, 0, 0, geom.totalW, geom.totalH);
  }

  /** Draw the gradient track + border into a target context. */
  private drawTrackTo(ctx: CanvasRenderingContext2D, geom: Geometry): void {
    const { mode, orientation } = this.options;
    const { tx, ty, tLen, tThick } = geom;
    const horizontal = orientation === "horizontal";

    // Track rectangle dimensions: for horizontal, width=length height=thickness;
    // for vertical, width=thickness height=length.
    const trackW = horizontal ? tLen : tThick;
    const trackH = horizontal ? tThick : tLen;

    // Rounded-rect clip for the track.
    const r = Math.min(tThick / 2, 6);
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, tx, ty, trackW, trackH, r);
    ctx.clip();

    if (mode === "alpha") {
      // Checkerboard first, then alpha gradient.
      this.drawCheckerboard(ctx, tx, ty, trackW, trackH);
    }

    // Build the gradient along the track axis.
    let grad: CanvasGradient;
    if (horizontal) {
      grad = ctx.createLinearGradient(tx, 0, tx + tLen, 0);
    } else {
      grad = ctx.createLinearGradient(0, ty, 0, ty + tLen);
    }

    if (mode === "hue") {
      for (let h = 0; h <= 360; h += 15) {
        const rgb = hsvToRgb(h, 100, 100);
        grad.addColorStop(h / 360, `rgb(${rgb.r},${rgb.g},${rgb.b})`);
      }
    } else if (mode === "lightness") {
      // Black → base color → white
      const { r, g, b } = this.baseRgb;
      grad.addColorStop(0, "#000000");
      grad.addColorStop(0.5, `rgb(${r},${g},${b})`);
      grad.addColorStop(1, "#ffffff");
    } else if (mode === "contrast") {
      // Base color mixed: 0 = black, 100 = white, 50 = base color
      const { r, g, b } = this.baseRgb;
      grad.addColorStop(0, "#000000");
      grad.addColorStop(0.5, `rgb(${r},${g},${b})`);
      grad.addColorStop(1, "#ffffff");
    } else if (mode === "alpha") {
      const { r, g, b } = this.baseRgb;
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},1)`);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(tx, ty, trackW, trackH);
    ctx.restore();

    // Track border.
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, tx, ty, trackW, trackH, r);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /** Draw a checkerboard pattern (for alpha mode). */
  private drawCheckerboard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const cell = 6;
    ctx.save();
    for (let py = 0; py < h; py += cell) {
      for (let px = 0; px < w; px += cell) {
        const odd = (Math.floor(px / cell) + Math.floor(py / cell)) % 2 === 1;
        ctx.fillStyle = odd ? "#cccccc" : "#ffffff";
        ctx.fillRect(x + px, y + py, cell, cell);
      }
    }
    ctx.restore();
  }

  /** Draw the draggable thumb at the current value position. */
  private renderThumb(geom: Geometry): void {
    const { orientation, thickness } = this.options;
    const { tx, ty, tLen, tThick, thumbPos } = geom;
    const ctx = this.ctx;
    const horizontal = orientation === "horizontal";

    let cx: number, cy: number;
    if (horizontal) {
      cx = tx + thumbPos;
      cy = ty + tThick / 2;
    } else {
      cx = tx + tThick / 2;
      cy = ty + thumbPos;
    }

    // Thumb is a rounded capsule. For horizontal: narrow width, tall height
    // (spans the track thickness + grip). For vertical: swap so it's wide
    // (spans the thickness) and short along the track axis.
    const thumbW = horizontal ? 10 : thickness + 8;
    const thumbH = horizontal ? thickness + 8 : 10;

    ctx.save();
    // White halo.
    ctx.beginPath();
    roundRect(
      ctx,
      cx - thumbW / 2,
      cy - thumbH / 2,
      thumbW,
      thumbH,
      Math.min(thumbW, thumbH) / 2,
    );
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();
    // Dark border.
    ctx.beginPath();
    roundRect(
      ctx,
      cx - thumbW / 2,
      cy - thumbH / 2,
      thumbW,
      thumbH,
      Math.min(thumbW, thumbH) / 2,
    );
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ---- Pointer interaction ----

  private getCanvasPoint(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const geom = this.getGeometry();
    const scaleX = geom.totalW / (rect.width || geom.totalW);
    const scaleY = geom.totalH / (rect.height || geom.totalH);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private onPointerDown(e: PointerEvent): void {
    if (this._destroyed) return;
    // Check if thumb is disabled
    if (this.thumbBtn && (this.thumbBtn as any).options?.disabled) return;
    const { x, y } = this.getCanvasPoint(e);
    const geom = this.getGeometry();
    this.pointerState = { pointerId: e.pointerId };
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch { /* ignore */ }
    this.updateValueFromPoint(x, y, geom);
    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.pointerState) return;
    const { x, y } = this.getCanvasPoint(e);
    const geom = this.getGeometry();
    this.updateValueFromPoint(x, y, geom);
    e.preventDefault();
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.pointerState) return;
    try {
      this.canvas.releasePointerCapture(this.pointerState.pointerId);
    } catch { /* ignore */ }
    this.pointerState = null;
    this.emit("change", this.getValueOutput());
  }

  private updateValueFromPoint(x: number, y: number, geom: Geometry): void {
    const { orientation } = this.options;
    let frac: number;
    if (orientation === "horizontal") {
      frac = clamp((x - geom.tx) / geom.tLen, 0, 1);
    } else {
      frac = clamp((y - geom.ty) / geom.tLen, 0, 1);
    }
    this.options.value = fractionToValue(frac, this.options.mode);
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getValueOutput());
  }

  // ---- Keyboard ----

  private onKeyDown(e: KeyboardEvent): void {
    if (this._destroyed) return;
    const step = e.shiftKey ? 10 : 1;
    const { mode, value } = this.options;
    const range = modeRange(mode);
    let next = value;
    let handled = false;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = value - step * range.step;
        handled = true;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = value + step * range.step;
        handled = true;
        break;
      case "Home":
        next = range.min;
        handled = true;
        break;
      case "End":
        next = range.max;
        handled = true;
        break;
    }
    if (handled) {
      e.preventDefault();
      this.options.value = this.clampValue(next);
      this.updateAria();
      this.scheduleRender();
      const out = this.getValueOutput();
      this.emit("input", out);
      this.emit("change", out);
    }
  }

  // ---- Helpers ----

  private clampValue(v: number): number {
    const r = modeRange(this.options.mode);
    return clamp(v, r.min, r.max);
  }

  private formatLabel(): string {
    const { mode, value } = this.options;
    if (mode === "hue") return `${Math.round(value)}°`;
    if (mode === "alpha") return value.toFixed(2);
    return `${Math.round(value)}%`;
  }

  private updateAria(): void {
    this.canvas.setAttribute("aria-valuenow", String(this.options.value));
    this.canvas.setAttribute(
      "aria-valuemin",
      String(modeRange(this.options.mode).min),
    );
    this.canvas.setAttribute(
      "aria-valuemax",
      String(modeRange(this.options.mode).max),
    );
    this.canvas.setAttribute(
      "aria-valuetext",
      `${this.options.mode} ${this.formatLabel()}`,
    );
  }

  private emit(event: string, v: ColorRangeValueOutput): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const h of Array.from(set)) {
      try { h(v); } catch (err) { console.error("ColorRange listener error:", err); }
    }
  }
}

// ---- Module helpers ----

function defaultValueForMode(mode: ColorRangeMode): number {
  switch (mode) {
    case "hue": return 210;
    case "lightness": return 50;
    case "contrast": return 50;
    case "alpha": return 1;
  }
}

function modeRange(mode: ColorRangeMode): { min: number; max: number; step: number } {
  switch (mode) {
    case "hue": return { min: 0, max: 360, step: 1 };
    case "lightness": return { min: 0, max: 100, step: 1 };
    case "contrast": return { min: 0, max: 100, step: 1 };
    case "alpha": return { min: 0, max: 1, step: 0.01 };
  }
}

function valueToFraction(value: number, mode: ColorRangeMode): number {
  const r = modeRange(mode);
  return (value - r.min) / (r.max - r.min);
}

function fractionToValue(frac: number, mode: ColorRangeMode): number {
  const r = modeRange(mode);
  return r.min + frac * (r.max - r.min);
}

/**
 * Compute the concrete result color produced by applying the current mode's
 * value to the base color. All modes process the same base color object.
 *
 *   hue        — replace the base color's hue, keep its S and V.
 *   lightness  — mix: 0 = black, 50 = base color, 100 = white.
 *   contrast   — same as lightness (black → base → white gradient).
 *   alpha      — the base color with alpha = value.
 */
function computeResultColor(
  mode: ColorRangeMode,
  value: number,
  baseRgb: { r: number; g: number; b: number },
  baseHsv: { h: number; s: number; v: number },
): ColorRangeResultColor {
  const { r, g, b } = baseRgb;

  if (mode === "hue") {
    const rgb = hsvToRgb(clampHue(value), baseHsv.s, baseHsv.v);
    return {
      hex: rgbToHex(rgb.r, rgb.g, rgb.b),
      rgba: `rgba(${rgb.r},${rgb.g},${rgb.b},1)`,
      r: rgb.r, g: rgb.g, b: rgb.b, a: 1,
    };
  }

  if (mode === "lightness" || mode === "contrast") {
    let rr: number, gg: number, bb: number;
    if (value <= 50) {
      const t = value / 50; // 0..1: black → base
      rr = Math.round(r * t);
      gg = Math.round(g * t);
      bb = Math.round(b * t);
    } else {
      const t = (value - 50) / 50; // 0..1: base → white
      rr = Math.round(r + (255 - r) * t);
      gg = Math.round(g + (255 - g) * t);
      bb = Math.round(b + (255 - b) * t);
    }
    return {
      hex: rgbToHex(rr, gg, bb),
      rgba: `rgba(${rr},${gg},${bb},1)`,
      r: rr, g: gg, b: bb, a: 1,
    };
  }

  // alpha
  return {
    hex: rgbToHex(r, g, b),
    rgba: `rgba(${r},${g},${b},${value})`,
    r, g, b, a: value,
  };
}

/** Rounded-rectangle path helper (CanvasRenderingContext2D.roundRect may not exist in older browsers). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
