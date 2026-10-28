/**
 * PeriodicRange — a dual-thumb range slider component (vanilla TypeScript).
 *
 * Renders a horizontal or vertical track with two draggable thumbs: a low
 * (min) thumb and a high (max) thumb. The selected range between the two
 * thumbs is filled with the lemon accent color. Optional snapping to a step
 * increment and optional tick-mark markers with numeric labels.
 *
 * Public API:
 *   new PeriodicRange(container, options?)
 *   getValueMin(): number
 *   getValueMax(): number
 *   setValueMin(v: number): void
 *   setValueMax(v: number): void
 *   setRange(min: number, max: number): void
 *   setStep(step: number): void
 *   setShowMarkers(on: boolean): void
 *   setMarkerStep(step: number): void
 *   setOrientation(orientation): void
 *   setThickness(n: number): void
 *   setLength(n: number): void
 *   on("input" | "change", handler): void
 *   off(event, handler): void
 *   destroy(): void
 *
 * Framework-independent. Canvas-based. No React or other UI framework.
 */

import { CustomButton, type CustomButton as CBType } from "@/lib/components/custom-button";

export type PeriodicRangeOrientation = "horizontal" | "vertical";

export interface PeriodicRangeOptions {
  /** Range minimum. Default 0. */
  min?: number;
  /** Range maximum. Default 100. */
  max?: number;
  /** Current low value. Default 25. */
  valueMin?: number;
  /** Current high value. Default 75. */
  valueMax?: number;
  /** Snap step. 0 = no snapping. Default 0. */
  step?: number;
  /** Show tick marks/labels. Default false. */
  showMarkers?: boolean;
  /** Interval between markers. Default 10. */
  markerStep?: number;
  /** Track orientation. Default "horizontal". */
  orientation?: PeriodicRangeOrientation;
  /** Track thickness in px. Default 8. */
  thickness?: number;
  /** Track length in px. Default 280. */
  length?: number;
}

export interface PeriodicRangeValue {
  valueMin: number;
  valueMax: number;
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
  /** Marker label area size (perpendicular to track). */
  labelArea: number;
}

const DEFAULTS: Required<PeriodicRangeOptions> = {
  min: 0,
  max: 100,
  valueMin: 25,
  valueMax: 75,
  step: 0,
  showMarkers: false,
  markerStep: 10,
  orientation: "horizontal",
  thickness: 8,
  length: 280,
};

const STYLE_ID = "periodic-range-styles";

/** Padding around the track so thumbs (which overhang the track) fit. */
const PAD = 14;
/** Space reserved for marker labels when showMarkers is on. */
const LABEL_AREA = 22;

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.periodic-range {
  display: inline-block;
  position: relative;
  font-family: inherit;
  --periodic-range-focus-ring: rgba(217, 255, 102, 0.55);
}
.periodic-range canvas {
  display: block;
  touch-action: none;
  outline: none;
  cursor: pointer;
  border-radius: 8px;
}
.periodic-range canvas:focus-visible {
  box-shadow: 0 0 0 3px var(--periodic-range-focus-ring);
}`;
  document.head.appendChild(style);
}

// ---- Tiny helpers (self-contained, no external deps) ----

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function approxEqual(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

type Handler = (v: PeriodicRangeValue) => void;

export class PeriodicRange {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private options: Required<PeriodicRangeOptions>;

  private readonly listeners: Map<string, Set<Handler>> = new Map();
  private pointerState: { pointerId: number; thumb: "min" | "max" } | null = null;
  /** Which thumb keyboard actions affect. Defaults to "min". */
  private activeThumb: "min" | "max" = "min";
  private _destroyed = false;

  /** CustomButton thumb overlays (when useCustomButtonThumbs is enabled). */
  private thumbOverlayEl: HTMLDivElement | null = null;
  private minThumbBtn: CBType | null = null;
  private maxThumbBtn: CBType | null = null;

  private readonly _onPointerDown: (e: PointerEvent) => void;
  private readonly _onPointerMove: (e: PointerEvent) => void;
  private readonly _onPointerUp: (e: PointerEvent) => void;
  private readonly _onKeyDown: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, options: PeriodicRangeOptions = {}) {
    if (!container) throw new Error("PeriodicRange: container is required");
    this.container = container;

    // Normalize options with defaults and validation.
    const min = options.min ?? DEFAULTS.min;
    const max = options.max ?? DEFAULTS.max;
    const safeMax = Math.max(min, max);
    const step = Math.max(0, options.step ?? DEFAULTS.step);
    const valueMin = clamp(options.valueMin ?? DEFAULTS.valueMin, min, safeMax);
    const valueMax = clamp(options.valueMax ?? DEFAULTS.valueMax, min, safeMax);
    // Enforce valueMin ≤ valueMax invariant.
    const sortedMin = Math.min(valueMin, valueMax);
    const sortedMax = Math.max(valueMin, valueMax);

    this.options = {
      min,
      max: safeMax,
      valueMin: sortedMin,
      valueMax: sortedMax,
      step,
      showMarkers: options.showMarkers ?? DEFAULTS.showMarkers,
      markerStep: Math.max(1, options.markerStep ?? DEFAULTS.markerStep),
      orientation: options.orientation ?? DEFAULTS.orientation,
      thickness: Math.max(4, options.thickness ?? DEFAULTS.thickness),
      length: Math.max(40, options.length ?? DEFAULTS.length),
    };

    injectStyles();

    this.canvas = document.createElement("canvas");
    this.canvas.className = "periodic-range-canvas";
    this.canvas.setAttribute("role", "slider");
    this.canvas.setAttribute(
      "aria-label",
      "Range slider with two thumbs. Drag to set a minimum and maximum value.",
    );
    this.canvas.tabIndex = 0;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("PeriodicRange: 2D canvas context unavailable");
    this.ctx = ctx;

    this.container.classList.add("periodic-range");
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

  getValueMin(): number {
    return this.options.valueMin;
  }

  getValueMax(): number {
    return this.options.valueMax;
  }

  setValueMin(v: number): void {
    const clamped = this.applyStep(clamp(v, this.options.min, this.options.valueMax));
    if (approxEqual(clamped, this.options.valueMin)) {
      // Still re-render in case external state drifted.
      this.scheduleRender();
      return;
    }
    this.options.valueMin = clamped;
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getValue());
    this.emit("change", this.getValue());
  }

  setValueMax(v: number): void {
    const clamped = this.applyStep(clamp(v, this.options.valueMin, this.options.max));
    if (approxEqual(clamped, this.options.valueMax)) {
      this.scheduleRender();
      return;
    }
    this.options.valueMax = clamped;
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getValue());
    this.emit("change", this.getValue());
  }

  setRange(min: number, max: number): void {
    const safeMax = Math.max(min, max);
    this.options.min = min;
    this.options.max = safeMax;
    // Re-clamp values to the new range, preserving the invariant.
    let vMin = clamp(this.options.valueMin, min, safeMax);
    let vMax = clamp(this.options.valueMax, min, safeMax);
    if (vMin > vMax) {
      // Preserve the lower and upper ends preferentially.
      vMin = min;
      vMax = safeMax;
    }
    this.options.valueMin = this.applyStep(vMin);
    this.options.valueMax = this.applyStep(vMax);
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getValue());
    this.emit("change", this.getValue());
  }

  setStep(step: number): void {
    const s = Math.max(0, step);
    if (approxEqual(s, this.options.step)) return;
    this.options.step = s;
    // Re-snap current values to the new step grid.
    this.options.valueMin = this.applyStep(this.options.valueMin);
    this.options.valueMax = this.applyStep(this.options.valueMax);
    // Re-enforce invariant after snapping.
    if (this.options.valueMin > this.options.valueMax) {
      this.options.valueMin = this.options.valueMax;
    }
    this.updateAria();
    this.scheduleRender();
  }

  setShowMarkers(on: boolean): void {
    const v = !!on;
    if (this.options.showMarkers === v) return;
    this.options.showMarkers = v;
    this.updateCanvasSize();
    this.scheduleRender();
  }

  setMarkerStep(step: number): void {
    const s = Math.max(1, step);
    if (approxEqual(s, this.options.markerStep)) return;
    this.options.markerStep = s;
    this.scheduleRender();
  }

  setOrientation(orientation: PeriodicRangeOrientation): void {
    if (this.options.orientation === orientation) return;
    this.options.orientation = orientation;
    this.updateCanvasSize();
    this.scheduleRender();
  }

  setThickness(n: number): void {
    const t = Math.max(4, Math.round(n));
    if (this.options.thickness === t) return;
    this.options.thickness = t;
    this.updateCanvasSize();
    this.scheduleRender();
  }

  setLength(n: number): void {
    const l = Math.max(40, Math.round(n));
    if (this.options.length === l) return;
    this.options.length = l;
    this.updateCanvasSize();
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

  /** Update a CustomButton thumb's properties at runtime. which = "min" | "max". */
  setThumbProp(which: "min" | "max", prop: string, value: unknown): void {
    const btn = which === "min" ? this.minThumbBtn : this.maxThumbBtn;
    if (!btn) return;
    switch (prop) {
      case "variant": btn.setVariant(value as any); break;
      case "text": btn.setText(value as string); break;
      case "icon": btn.setIcon(value as string); break;
      case "iconType": btn.setIconType(value as any); break;
      case "iconPosition": btn.setIconPosition(value as any); break;
      case "size":
        btn.setSize(value as any);
        // When size changes, clear explicit width/height so the size preset CSS takes over
        btn.setWidth(0);
        btn.setHeight(0);
        break;
      case "disabled": btn.setDisabled(!!value); break;
      case "fullWidth": btn.setFullWidth(!!value); break;
      case "width": btn.setWidth(Number(value)); break;
      case "height": btn.setHeight(Number(value)); break;
      case "draggable": btn.setDraggable(!!value); break;
      case "active": btn.setActive(!!value); break;
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
      } catch {
        /* ignore */
      }
      this.pointerState = null;
    }
    this.listeners.clear();
    this.minThumbBtn?.destroy();
    this.maxThumbBtn?.destroy();
    this.thumbOverlayEl?.remove();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.container.classList.remove("periodic-range");
  }

  // ---- Geometry ----

  private getGeometry(): Geometry {
    const { orientation, thickness, length, showMarkers } = this.options;
    const labelArea = showMarkers ? LABEL_AREA : 0;
    if (orientation === "horizontal") {
      const totalW = length + PAD * 2;
      const totalH = thickness + PAD * 2 + labelArea;
      const tx = PAD;
      const ty = PAD;
      return { totalW, totalH, tx, ty, tLen: length, tThick: thickness, labelArea };
    } else {
      const totalW = thickness + PAD * 2 + labelArea;
      const totalH = length + PAD * 2;
      // Push the track to the right of the label area for vertical orientation
      // so labels sit to the LEFT of the track.
      const tx = PAD + labelArea;
      const ty = PAD;
      return { totalW, totalH, tx, ty, tLen: length, tThick: thickness, labelArea };
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

  private render(): void {
    const geom = this.getGeometry();
    this.ctx.clearRect(0, 0, geom.totalW, geom.totalH);
    this.renderTrack(geom);
    this.renderSelection(geom);
    if (this.options.showMarkers) this.renderMarkers(geom);
    // Thumbs are always rendered as CustomButton DOM overlays
    this.updateCustomButtonThumbs(geom);
  }

  /** Create or update CustomButton thumb overlays. */
  private updateCustomButtonThumbs(geom: Geometry): void {
    const horizontal = this.options.orientation === "horizontal";
    const thickness = this.options.thickness;
    // Thumb spans the track thickness + overhang (like the old canvas design)
    const thumbW = horizontal ? 14 : thickness + 10;
    const thumbH = horizontal ? thickness + 10 : 14;

    // Create overlay layer if not yet created
    if (!this.thumbOverlayEl) {
      this.thumbOverlayEl = document.createElement("div");
      this.thumbOverlayEl.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5;";
      this.container.appendChild(this.thumbOverlayEl);

      // Create min thumb CustomButton — purely visual, canvas handles drag
      const minWrap = document.createElement("div");
      minWrap.style.cssText = "position:absolute;pointer-events:none;";
      this.thumbOverlayEl.appendChild(minWrap);
      this.minThumbBtn = new CustomButton(minWrap, {
        variant: "thumb",
        size: "sm",
        width: thumbW,
        height: thumbH,
      });
      this.minThumbBtn.getElement().setAttribute("aria-label", "Minimum value thumb");
      this.minThumbBtn.getElement().style.pointerEvents = "none";

      // Create max thumb CustomButton
      const maxWrap = document.createElement("div");
      maxWrap.style.cssText = "position:absolute;pointer-events:none;";
      this.thumbOverlayEl.appendChild(maxWrap);
      this.maxThumbBtn = new CustomButton(maxWrap, {
        variant: "thumb",
        size: "sm",
        width: thumbW,
        height: thumbH,
      });
      this.maxThumbBtn.getElement().setAttribute("aria-label", "Maximum value thumb");
      this.maxThumbBtn.getElement().style.pointerEvents = "none";
    }

    // Position the thumbs
    const minX = this.valueToX(this.options.valueMin, geom);
    const minY = this.valueToY(this.options.valueMin, geom);
    const maxX = this.valueToX(this.options.valueMax, geom);
    const maxY = this.valueToY(this.options.valueMax, geom);

    if (this.minThumbBtn) {
      this.minThumbBtn.setPosition(minX, minY);
      this.minThumbBtn.setActive(this.activeThumb === "min" || this.pointerState?.thumb === "min");
    }
    if (this.maxThumbBtn) {
      this.maxThumbBtn.setPosition(maxX, maxY);
      this.maxThumbBtn.setActive(this.activeThumb === "max" || this.pointerState?.thumb === "max");
    }
  }

  // ---- Rendering: track ----

  private renderTrack(geom: Geometry): void {
    const { tx, ty, tLen, tThick } = geom;
    const horizontal = this.options.orientation === "horizontal";
    const trackW = horizontal ? tLen : tThick;
    const trackH = horizontal ? tThick : tLen;
    const r = Math.min(tThick / 2, 6);

    const ctx = this.ctx;
    ctx.save();
    // Track fill — dark Deep Violet.
    ctx.beginPath();
    roundRect(ctx, tx, ty, trackW, trackH, r);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    // Inner subtle border.
    ctx.beginPath();
    roundRect(ctx, tx, ty, trackW, trackH, r);
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // ---- Rendering: selected range ----

  private renderSelection(geom: Geometry): void {
    const { tx, ty, tLen, tThick } = geom;
    const { min, max, valueMin, valueMax, orientation } = this.options;
    const horizontal = orientation === "horizontal";
    const span = Math.max(1e-9, max - min);
    const fMin = (valueMin - min) / span;
    const fMax = (valueMax - min) / span;

    const ctx = this.ctx;
    const r = Math.min(tThick / 2, 6);
    ctx.save();
    ctx.beginPath();
    if (horizontal) {
      const x = tx + fMin * tLen;
      const w = Math.max(0, (fMax - fMin) * tLen);
      roundRect(ctx, x, ty, w, tThick, r);
    } else {
      // For vertical, valueMin sits at the BOTTOM and valueMax at the TOP.
      const y = ty + (1 - fMax) * tLen;
      const h = Math.max(0, (fMax - fMin) * tLen);
      roundRect(ctx, tx, y, tThick, h, r);
    }
    ctx.fillStyle = "#D9FF66";
    ctx.fill();
    ctx.restore();
  }

  // ---- Rendering: markers ----

  private renderMarkers(geom: Geometry): void {
    const { tx, ty, tLen, tThick } = geom;
    const { min, max, markerStep, orientation } = this.options;
    const horizontal = orientation === "horizontal";
    const span = max - min;
    if (span <= 0 || markerStep <= 0) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = horizontal ? "top" : "middle";
    ctx.textAlign = horizontal ? "center" : "right";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ctx.lineWidth = 1;

    // Determine which markers should show labels. If there are too many,
    // only label every Nth marker to avoid overlap.
    const markerCount = Math.floor(span / markerStep) + 1;
    const labelEvery = markerCount > 20 ? Math.ceil(markerCount / 20) : 1;

    // Start exactly at min and step up. Use index-based accumulation to avoid
    // floating-point drift.
    let idx = 0;
    for (let v = min; v <= max + 1e-9; v += markerStep, idx++) {
      const f = (v - min) / span;
      const clampedV = Math.min(v, max);
      const label = formatMarkerLabel(clampedV);
      if (horizontal) {
        const x = tx + f * tLen;
        // Tick from the bottom of the track downward.
        ctx.beginPath();
        ctx.moveTo(x, ty + tThick);
        ctx.lineTo(x, ty + tThick + 4);
        ctx.stroke();
        if (idx % labelEvery === 0) {
          ctx.fillText(label, x, ty + tThick + 7);
        }
      } else {
        // Vertical: valueMax (high) at top, valueMin (low) at bottom.
        const y = ty + (1 - f) * tLen;
        // Tick from the left of the track leftward.
        ctx.beginPath();
        ctx.moveTo(tx, y);
        ctx.lineTo(tx - 4, y);
        ctx.stroke();
        if (idx % labelEvery === 0) {
          ctx.fillText(label, tx - 7, y);
        }
      }
    }
    ctx.restore();
  }

  // ---- Rendering: thumbs ----

  private renderThumb(geom: Geometry, which: "min" | "max"): void {
    const { tx, ty, tLen, tThick } = geom;
    const { orientation, thickness } = this.options;
    const horizontal = orientation === "horizontal";
    const ctx = this.ctx;

    const pos = which === "min" ? this.options.valueMin : this.options.valueMax;
    const cx = this.valueToX(pos, geom);
    const cy = this.valueToY(pos, geom);

    // Thumb is a rounded capsule. Horizontal: narrow width, tall height
    // (spans the track thickness + overhang). Vertical: swap.
    // The max thumb is slightly larger than the min thumb so the two are
    // visually distinguishable even before the inner accent is drawn.
    const thumbW = horizontal ? (which === "max" ? 14 : 12) : thickness + 10;
    const thumbH = horizontal ? thickness + 10 : (which === "max" ? 14 : 12);
    const thumbX = cx - thumbW / 2;
    const thumbY = cy - thumbH / 2;
    const radius = Math.min(thumbW, thumbH) / 2;

    const isActive = this.activeThumb === which;
    const isDragging = this.pointerState?.thumb === which;

    ctx.save();

    // Soft drop shadow under the thumb.
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = isDragging ? 8 : 4;
    ctx.shadowOffsetY = isDragging ? 3 : 2;

    // Base capsule — white fill for both thumbs.
    ctx.beginPath();
    roundRect(ctx, thumbX, thumbY, thumbW, thumbH, radius);
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.fill();

    // Reset shadow before drawing the border / accent so they aren't blurred.
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Dark border (slightly thicker on the max thumb for emphasis).
    ctx.beginPath();
    roundRect(ctx, thumbX, thumbY, thumbW, thumbH, radius);
    ctx.strokeStyle = "rgba(8,8,12,0.85)";
    ctx.lineWidth = which === "max" ? 2 : 1.5;
    ctx.stroke();

    // Inner accent — a clear visual marker that distinguishes min from max.
    //   min thumb  →  a horizontal bar (looks like "−")
    //   max thumb  →  a horizontal bar + a vertical bar (looks like "+")
    // The symbol is orientation-independent (always looks like "−" / "+").
    // Bar lengths are constrained by the smaller thumb dimension so they fit.
    const barLen = Math.min(thumbW, thumbH) - 5;
    const barThick = 1.8;
    if (barLen > 2) {
      ctx.fillStyle = "rgba(8,8,12,0.85)";
      // Horizontal bar (both thumbs).
      ctx.fillRect(cx - barLen / 2, cy - barThick / 2, barLen, barThick);
      if (which === "max") {
        // Vertical bar (max thumb only) → completes the "+".
        ctx.fillRect(cx - barThick / 2, cy - barLen / 2, barThick, barLen);
      }
    }

    // Active / focus indicator: a thin lemon ring outside the thumb.
    if (isActive || isDragging) {
      ctx.beginPath();
      const focusPad = 3;
      roundRect(
        ctx,
        thumbX - focusPad,
        thumbY - focusPad,
        thumbW + focusPad * 2,
        thumbH + focusPad * 2,
        radius + focusPad,
      );
      ctx.strokeStyle = "rgba(217,255,102,0.65)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ---- Value <-> pixel mapping ----

  private valueToX(v: number, geom: Geometry): number {
    const { tx, tLen } = geom;
    const { min, max, orientation } = this.options;
    if (orientation !== "horizontal") return tx + geom.tThick / 2;
    const f = (v - min) / Math.max(1e-9, max - min);
    return tx + f * tLen;
  }

  private valueToY(v: number, geom: Geometry): number {
    const { ty, tLen } = geom;
    const { min, max, orientation } = this.options;
    if (orientation === "horizontal") return ty + geom.tThick / 2;
    // Vertical: high values at the top, low at the bottom (conventional).
    const f = (v - min) / Math.max(1e-9, max - min);
    return ty + (1 - f) * tLen;
  }

  /** Convert a canvas point to a value along the track axis. */
  private pointToValue(x: number, y: number, geom: Geometry): number {
    const { tx, ty, tLen } = geom;
    const { min, max, orientation } = this.options;
    const span = Math.max(1e-9, max - min);
    let f: number;
    if (orientation === "horizontal") {
      f = clamp((x - tx) / tLen, 0, 1);
      return min + f * span;
    } else {
      f = clamp(1 - (y - ty) / tLen, 0, 1);
      return min + f * span;
    }
  }

  /** Apply step snapping to a value. step = 0 means no snapping. */
  private applyStep(v: number): number {
    const { step, min, max } = this.options;
    if (!step || step <= 0) return v;
    const snapped = Math.round((v - min) / step) * step + min;
    return clamp(snapped, min, max);
  }

  private getValue(): PeriodicRangeValue {
    return { valueMin: this.options.valueMin, valueMax: this.options.valueMax };
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

  /** Determine which thumb a pointer event should grab. */
  private pickThumb(x: number, y: number, geom: Geometry): "min" | "max" {
    const minPos = this.options.valueMin;
    const maxPos = this.options.valueMax;
    const horizontal = this.options.orientation === "horizontal";

    // Pixel coordinates of each thumb center along the track axis.
    const minPx = horizontal ? this.valueToX(minPos, geom) : this.valueToY(minPos, geom);
    const maxPx = horizontal ? this.valueToX(maxPos, geom) : this.valueToY(maxPos, geom);
    const p = horizontal ? x : y;

    // Hit-test: if the pointer is within the thumb's hit radius, prefer it.
    const hitR = 14;
    const dMin = Math.abs(p - minPx);
    const dMax = Math.abs(p - maxPx);
    if (dMin <= hitR && dMax <= hitR) {
      // Both thumbs are within hit range (they're touching). Pick the closer.
      return dMin <= dMax ? "min" : "max";
    }
    if (dMin <= hitR) return "min";
    if (dMax <= hitR) return "max";
    // Otherwise, pick whichever thumb is closer to the click point.
    return dMin <= dMax ? "min" : "max";
  }

  private onPointerDown(e: PointerEvent): void {
    if (this._destroyed) return;
    const { x, y } = this.getCanvasPoint(e);
    const geom = this.getGeometry();
    const thumb = this.pickThumb(x, y, geom);
    // Check if the picked thumb's CustomButton is disabled — if so, no drag
    const btn = thumb === "min" ? this.minThumbBtn : this.maxThumbBtn;
    if (btn && (btn as any).options?.disabled) return;
    this.pointerState = { pointerId: e.pointerId, thumb };
    this.activeThumb = thumb;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.updateThumbFromPoint(x, y, geom, thumb);
    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.pointerState) return;
    const { x, y } = this.getCanvasPoint(e);
    const geom = this.getGeometry();
    this.updateThumbFromPoint(x, y, geom, this.pointerState.thumb);
    e.preventDefault();
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.pointerState) return;
    try {
      this.canvas.releasePointerCapture(this.pointerState.pointerId);
    } catch {
      /* ignore */
    }
    const wasThumb = this.pointerState.thumb;
    this.pointerState = null;
    // Keep the released thumb as the active one for keyboard interaction.
    this.activeThumb = wasThumb;
    this.scheduleRender();
    this.emit("change", this.getValue());
  }

  private updateThumbFromPoint(
    x: number,
    y: number,
    geom: Geometry,
    thumb: "min" | "max",
  ): void {
    const v = this.pointToValue(x, y, geom);
    if (thumb === "min") {
      this.options.valueMin = this.applyStep(clamp(v, this.options.min, this.options.valueMax));
    } else {
      this.options.valueMax = this.applyStep(clamp(v, this.options.valueMin, this.options.max));
    }
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getValue());
  }

  // ---- Keyboard ----

  private onKeyDown(e: KeyboardEvent): void {
    if (this._destroyed) return;
    const { min, max, step } = this.options;
    const span = max - min;
    // Default keyboard step: the snap step, or 1% of the range, whichever is larger.
    const baseStep = step > 0 ? step : Math.max(1, span / 100);
    const largeStep = e.shiftKey ? baseStep * 10 : baseStep;

    let handled = false;
    let nextMin = this.options.valueMin;
    let nextMax = this.options.valueMax;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        if (this.activeThumb === "min") {
          nextMin = this.applyStep(clamp(this.options.valueMin - baseStep, min, this.options.valueMax));
        } else {
          nextMax = this.applyStep(clamp(this.options.valueMax - baseStep, this.options.valueMin, max));
        }
        handled = true;
        break;
      case "ArrowRight":
      case "ArrowUp":
        if (this.activeThumb === "min") {
          nextMin = this.applyStep(clamp(this.options.valueMin + baseStep, min, this.options.valueMax));
        } else {
          nextMax = this.applyStep(clamp(this.options.valueMax + baseStep, this.options.valueMin, max));
        }
        handled = true;
        break;
      case "PageDown":
        if (this.activeThumb === "min") {
          nextMin = this.applyStep(clamp(this.options.valueMin - largeStep, min, this.options.valueMax));
        } else {
          nextMax = this.applyStep(clamp(this.options.valueMax - largeStep, this.options.valueMin, max));
        }
        handled = true;
        break;
      case "PageUp":
        if (this.activeThumb === "min") {
          nextMin = this.applyStep(clamp(this.options.valueMin + largeStep, min, this.options.valueMax));
        } else {
          nextMax = this.applyStep(clamp(this.options.valueMax + largeStep, this.options.valueMin, max));
        }
        handled = true;
        break;
      case "Home":
        if (this.activeThumb === "min") {
          nextMin = min;
        } else {
          nextMax = this.options.valueMin;
        }
        handled = true;
        break;
      case "End":
        if (this.activeThumb === "min") {
          nextMin = this.options.valueMax;
        } else {
          nextMax = max;
        }
        handled = true;
        break;
      case "Tab":
        // Cycle the active thumb between min and max.
        e.preventDefault();
        this.activeThumb = this.activeThumb === "min" ? "max" : "min";
        this.scheduleRender();
        return;
    }

    if (handled) {
      e.preventDefault();
      let changed = false;
      if (!approxEqual(nextMin, this.options.valueMin)) {
        this.options.valueMin = nextMin;
        changed = true;
      }
      if (!approxEqual(nextMax, this.options.valueMax)) {
        this.options.valueMax = nextMax;
        changed = true;
      }
      if (changed) {
        this.updateAria();
        this.scheduleRender();
        this.emit("input", this.getValue());
        this.emit("change", this.getValue());
      }
    }
  }

  // ---- ARIA ----

  private updateAria(): void {
    const { valueMin, valueMax, min, max } = this.options;
    // Expose both values via aria-valuenow (the active thumb's value) and
    // aria-valuetext (a combined label showing both).
    const activeValue = this.activeThumb === "min" ? valueMin : valueMax;
    this.canvas.setAttribute("aria-valuemin", String(min));
    this.canvas.setAttribute("aria-valuemax", String(max));
    this.canvas.setAttribute("aria-valuenow", String(activeValue));
    this.canvas.setAttribute(
      "aria-valuetext",
      `min ${formatMarkerLabel(valueMin)}, max ${formatMarkerLabel(valueMax)}`,
    );
  }

  // ---- Event helpers ----

  private emit(event: string, v: PeriodicRangeValue): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const h of Array.from(set)) {
      try {
        h(v);
      } catch (err) {
        console.error("PeriodicRange listener error:", err);
      }
    }
  }
}

// ---- Module helpers ----

function formatMarkerLabel(v: number): string {
  // Show up to 2 decimals, but trim trailing zeros.
  const rounded = Math.round(v * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** Rounded-rectangle path helper. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  if (radius <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
