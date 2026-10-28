/**
 * ColorRamp — a multi-stop color gradient component (vanilla TypeScript).
 *
 * Renders a horizontal or vertical gradient bar with draggable color stops.
 * Users can add, remove, and reposition stops. The gradient is interpolated
 * between stops. Each stop has a color (hex) and a position (0–1).
 *
 * Public API:
 *   new ColorRamp(container, { stops, orientation, thickness, length })
 *   getStops(): RampStop[]
 *   setStops(stops): void
 *   addStop(position?, color?): number
 *   removeStop(i): void
 *   setOrientation(orientation): void
 *   setThickness(n): void
 *   setLength(n): void
 *   on("input" | "change", handler): void
 *   off(event, handler): void
 *   destroy(): void
 *
 * Framework-independent. Canvas-based. No React.
 */

import { CustomButton } from "@/lib/components/custom-button";

export type RampOrientation = "horizontal" | "vertical";

export interface RampStop {
  id: number;
  /** Position along the ramp, 0–1. */
  position: number;
  /** Hex color, e.g. "#4287f5". */
  color: string;
}

export interface ColorRampOptions {
  /** Initial stops (position 0–1 + hex color). At least 2 recommended. */
  stops?: { position: number; color: string }[];
  orientation?: RampOrientation;
  /** Thickness of the gradient bar (the short dimension), in px. Default 32. */
  thickness?: number;
  /** Length of the gradient bar (the long dimension), in px. Default 280. */
  length?: number;
}

const DEFAULTS: Required<ColorRampOptions> = {
  stops: [
    { position: 0, color: "#4287f5" },
    { position: 0.5, color: "#D9FF66" },
    { position: 1, color: "#ff6600" },
  ],
  orientation: "horizontal",
  thickness: 32,
  length: 280,
};

const STYLE_ID = "color-ramp-styles";

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.color-ramp { display: inline-block; position: relative; font-family: inherit; --color-ramp-focus-ring: rgba(217,255,102,0.55); }
.color-ramp canvas { display: block; touch-action: none; outline: none; cursor: pointer; border-radius: 8px; }
.color-ramp canvas:focus-visible { box-shadow: 0 0 0 3px var(--color-ramp-focus-ring); }
`;
  document.head.appendChild(style);
}

// ---- Color helpers ----

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let s = hex.trim().replace(/^#/, "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  if (s.length !== 6) return { r: 66, g: 135, b: 245 };
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return { r: 66, g: 135, b: 245 };
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Linear interpolation between two RGB colors. */
function lerpRgb(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

let nextStopId = 1;

type Handler = (stops: RampStop[]) => void;

export class ColorRamp {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private options: Required<ColorRampOptions>;
  private stops: RampStop[];

  private readonly listeners: Map<string, Set<Handler>> = new Map();
  private pointerState: { pointerId: number; stopIdx: number } | null = null;
  private _destroyed = false;

  /** CustomButton thumb overlays for stops. */
  private thumbOverlayEl: HTMLDivElement | null = null;
  private stopThumbs: CustomButton[] = [];

  private readonly _onPointerDown: (e: PointerEvent) => void;
  private readonly _onPointerMove: (e: PointerEvent) => void;
  private readonly _onPointerUp: (e: PointerEvent) => void;
  private readonly _onKeyDown: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, options: ColorRampOptions = {}) {
    if (!container) throw new Error("ColorRamp: container is required");
    this.container = container;
    this.options = {
      stops: options.stops ?? DEFAULTS.stops,
      orientation: options.orientation ?? DEFAULTS.orientation,
      thickness: Math.max(8, options.thickness ?? DEFAULTS.thickness),
      length: Math.max(40, options.length ?? DEFAULTS.length),
    };
    // Initialize stops with IDs, sorted by position.
    this.stops = this.options.stops
      .map((s) => ({ id: nextStopId++, position: clamp(s.position, 0, 1), color: s.color }))
      .sort((a, b) => a.position - b.position);

    injectStyles();
    this.canvas = document.createElement("canvas");
    this.canvas.className = "color-ramp-canvas";
    this.canvas.setAttribute("role", "application");
    this.canvas.setAttribute("aria-label", "Color ramp. Drag stops to reposition. Click empty space to add a stop.");
    this.canvas.tabIndex = 0;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("ColorRamp: 2D canvas context unavailable");
    this.ctx = ctx;
    this.container.classList.add("color-ramp");
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
  }

  // ---- Public API ----

  getStops(): RampStop[] {
    return this.stops.map((s) => ({ ...s }));
  }

  setStops(stops: { position: number; color: string }[]): void {
    this.stops = stops
      .map((s) => ({ id: nextStopId++, position: clamp(s.position, 0, 1), color: s.color }))
      .sort((a, b) => a.position - b.position);
    this.scheduleRender();
    this.emit("input", this.getStops());
    this.emit("change", this.getStops());
  }

  addStop(position?: number, color?: string): number {
    const pos = clamp(position ?? 0.5, 0, 1);
    // Interpolate color at this position from neighbors.
    const c = color ?? this.interpolateColor(pos);
    this.stops.push({ id: nextStopId++, position: pos, color: c });
    this.stops.sort((a, b) => a.position - b.position);
    this.scheduleRender();
    this.emit("input", this.getStops());
    this.emit("change", this.getStops());
    return this.stops.findIndex((s) => s.position === pos);
  }

  removeStop(i: number): void {
    if (this.stops.length <= 2) return; // keep at least 2 stops
    if (i < 0 || i >= this.stops.length) return;
    this.stops.splice(i, 1);
    this.scheduleRender();
    this.emit("input", this.getStops());
    this.emit("change", this.getStops());
  }

  setOrientation(orientation: RampOrientation): void {
    if (this.options.orientation === orientation) return;
    this.options.orientation = orientation;
    this.updateCanvasSize();
    this.scheduleRender();
  }

  setThickness(n: number): void {
    const t = Math.max(8, Math.round(n));
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
    if (!set) { set = new Set<Handler>(); this.listeners.set(event, set); }
    set.add(handler);
  }

  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler);
  }

  /** Update all stop thumbs' properties at runtime. */
  setThumbProp(prop: string, value: unknown): void {
    for (const btn of this.stopThumbs) {
      switch (prop) {
        case "variant": btn.setVariant(value as any); break;
        case "text": btn.setText(value as string); break;
        case "icon": btn.setIcon(value as string); break;
        case "iconType": btn.setIconType(value as any); break;
        case "iconPosition": btn.setIconPosition(value as any); break;
        case "size":
          btn.setSize(value as any);
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
      try { this.canvas.releasePointerCapture(this.pointerState.pointerId); } catch {}
      this.pointerState = null;
    }
    this.listeners.clear();
    this.stopThumbs.forEach(t => t.destroy());
    this.stopThumbs = [];
    this.thumbOverlayEl?.remove();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.container.classList.remove("color-ramp");
  }

  // ---- Geometry ----

  private get geom() {
    const { thickness, length, orientation } = this.options;
    const pad = 10;
    if (orientation === "horizontal") {
      const totalW = length + pad * 2;
      const totalH = thickness + pad * 2;
      return { totalW, totalH, pad, barX: pad, barY: pad, barW: length, barH: thickness };
    } else {
      const totalW = thickness + pad * 2;
      const totalH = length + pad * 2;
      return { totalW, totalH, pad, barX: pad, barY: pad, barW: thickness, barH: length };
    }
  }

  private updateCanvasSize(): void {
    const { totalW, totalH } = this.geom;
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    this.canvas.style.width = `${totalW}px`;
    this.canvas.style.height = `${totalH}px`;
    this.canvas.width = Math.round(totalW * dpr);
    this.canvas.height = Math.round(totalH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private scheduleRender(): void {
    if (this._destroyed) return;
    requestAnimationFrame(() => { if (!this._destroyed) this.render(); });
  }

  private render(): void {
    const { totalW, totalH, barX, barY, barW, barH } = this.geom;
    this.ctx.clearRect(0, 0, totalW, totalH);
    this.renderGradient();
    // Thumbs are always rendered as CustomButton DOM overlays
    this.updateCustomButtonThumbs();
  }

  /** Create or update CustomButton thumb overlays for each stop. */
  private updateCustomButtonThumbs(): void {
    const thumbSize = 16;
    const horizontal = this.options.orientation === "horizontal";
    const { barX, barY, barW, barH } = this.geom;

    // Create overlay layer if needed
    if (!this.thumbOverlayEl) {
      this.thumbOverlayEl = document.createElement("div");
      this.thumbOverlayEl.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5;";
      this.container.appendChild(this.thumbOverlayEl);
    }

    // Sync number of thumb buttons with stops
    while (this.stopThumbs.length < this.stops.length) {
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:absolute;pointer-events:none;";
      this.thumbOverlayEl!.appendChild(wrap);
      const btn = new CustomButton(wrap, {
        variant: "thumb", size: "sm", width: thumbSize, height: thumbSize,
      });
      btn.getElement().style.pointerEvents = "none";
      this.stopThumbs.push(btn);
    }
    while (this.stopThumbs.length > this.stops.length) {
      const btn = this.stopThumbs.pop();
      btn?.destroy();
    }

    // Position each thumb
    for (let i = 0; i < this.stops.length; i++) {
      const stop = this.stops[i];
      const btn = this.stopThumbs[i];
      if (!btn) continue;
      const pos = stop.position;
      const x = horizontal ? barX + pos * barW : barX + barW / 2;
      const y = horizontal ? barY + barH / 2 : barY + pos * barH;
      btn.setPosition(x, y);
    }
  }

  // ---- Gradient ----

  private renderGradient(): void {
    const { barX, barY, barW, barH } = this.geom;
    const { orientation } = this.options;
    const ctx = this.ctx;
    const r = Math.min(barH, barW) / 2;

    // Build the gradient.
    let grad: CanvasGradient;
    if (orientation === "horizontal") {
      grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    } else {
      grad = ctx.createLinearGradient(0, barY, 0, barY + barH);
    }

    for (const stop of this.stops) {
      grad.addColorStop(clamp(stop.position, 0, 1), stop.color);
    }

    // Clip to rounded rect and fill.
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, barX, barY, barW, barH, r);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.restore();

    // Border.
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, barX, barY, barW, barH, r);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // ---- Stops ----

  /** Get the pixel position of a stop along the bar axis. */
  private getStopPixel(position: number): number {
    const { barX, barY, barW, barH } = this.geom;
    if (this.options.orientation === "horizontal") {
      return barX + position * barW;
    } else {
      return barY + position * barH;
    }
  }

  /** Get the stop index at a canvas point, or -1 if none. */
  private findStopAt(x: number, y: number): number {
    const horizontal = this.options.orientation === "horizontal";
    for (let i = 0; i < this.stops.length; i++) {
      const stopPx = this.getStopPixel(this.stops[i].position);
      const dx = horizontal ? x - stopPx : 0;
      const dy = horizontal ? 0 : y - stopPx;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 14) return i;
    }
    return -1;
  }

  private renderStops(): void {
    const { barX, barY, barW, barH } = this.geom;
    const { orientation, thickness } = this.options;
    const ctx = this.ctx;
    const horizontal = orientation === "horizontal";

    for (const stop of this.stops) {
      const stopPx = this.getStopPixel(stop.position);
      let cx: number, cy: number;
      if (horizontal) {
        cx = stopPx;
        cy = barY + barH / 2;
      } else {
        cx = barX + barW / 2;
        cy = stopPx;
      }

      // Thumb: a rounded capsule perpendicular to the bar, extending above/below.
      const thumbW = horizontal ? 12 : thickness + 8;
      const thumbH = horizontal ? thickness + 8 : 12;

      // White halo.
      ctx.beginPath();
      this.roundRect(ctx, cx - thumbW / 2, cy - thumbH / 2, thumbW, thumbH, Math.min(thumbW, thumbH) / 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fill();
      // Dark border.
      ctx.beginPath();
      this.roundRect(ctx, cx - thumbW / 2, cy - thumbH / 2, thumbW, thumbH, Math.min(thumbW, thumbH) / 2);
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Color dot.
      const rgb = parseHex(stop.color);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, Math.min(thumbW, thumbH) / 2 - 3), 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ctx.fill();
    }
  }

  /** Interpolate the color at a given position (0–1) from the current stops. */
  private interpolateColor(position: number): string {
    if (this.stops.length === 0) return "#000000";
    if (this.stops.length === 1) return this.stops[0].color;
    const sorted = [...this.stops].sort((a, b) => a.position - b.position);
    if (position <= sorted[0].position) return sorted[0].color;
    if (position >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].color;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      if (position >= a.position && position <= b.position) {
        const t = (position - a.position) / (b.position - a.position || 1);
        const rgbA = parseHex(a.color);
        const rgbB = parseHex(b.color);
        const rgb = lerpRgb(rgbA, rgbB, t);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
      }
    }
    return sorted[sorted.length - 1].color;
  }

  // ---- Pointer interaction ----

  private getCanvasPoint(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const { totalW, totalH } = this.geom;
    const scaleX = totalW / (rect.width || totalW);
    const scaleY = totalH / (rect.height || totalH);
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  private onPointerDown(e: PointerEvent): void {
    if (this._destroyed) return;
    const { x, y } = this.getCanvasPoint(e);
    const idx = this.findStopAt(x, y);
    if (idx >= 0) {
      // Check if this stop's thumb is disabled
      const btn = this.stopThumbs[idx];
      if (btn && (btn as any).options?.disabled) return;
      // Grab existing stop.
      this.pointerState = { pointerId: e.pointerId, stopIdx: idx };
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    } else {
      // Click on empty bar space → add a new stop.
      const pos = this.pixelToPosition(x, y);
      const newIdx = this.addStop(pos);
      this.pointerState = { pointerId: e.pointerId, stopIdx: newIdx };
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    }
    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.pointerState) return;
    const { x, y } = this.getCanvasPoint(e);
    const pos = this.pixelToPosition(x, y);
    const idx = this.pointerState.stopIdx;
    if (idx >= 0 && idx < this.stops.length) {
      this.stops[idx].position = clamp(pos, 0, 1);
      // Re-sort and update the pointer index.
      this.stops.sort((a, b) => a.position - b.position);
      this.pointerState.stopIdx = this.stops.findIndex((s) => s.id === this.stops[idx].id);
      if (this.pointerState.stopIdx < 0) this.pointerState.stopIdx = idx;
      this.scheduleRender();
      this.emit("input", this.getStops());
    }
    e.preventDefault();
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.pointerState) return;
    try { this.canvas.releasePointerCapture(this.pointerState.pointerId); } catch {}
    this.pointerState = null;
    this.emit("change", this.getStops());
  }

  /** Convert a canvas point to a position (0–1) along the bar. */
  private pixelToPosition(x: number, y: number): number {
    const { barX, barY, barW, barH } = this.geom;
    if (this.options.orientation === "horizontal") {
      return clamp((x - barX) / barW, 0, 1);
    } else {
      return clamp((y - barY) / barH, 0, 1);
    }
  }

  // ---- Keyboard (adjust the first stop or focused stop) ----

  private onKeyDown(e: KeyboardEvent): void {
    if (this._destroyed) return;
    const step = e.shiftKey ? 0.1 : 0.01;
    let handled = false;
    // Adjust the first stop for simplicity.
    const stop = this.stops[0];
    if (!stop) return;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        stop.position = clamp(stop.position - step, 0, 1);
        this.stops.sort((a, b) => a.position - b.position);
        handled = true;
        break;
      case "ArrowRight":
      case "ArrowUp":
        stop.position = clamp(stop.position + step, 0, 1);
        this.stops.sort((a, b) => a.position - b.position);
        handled = true;
        break;
    }
    if (handled) {
      e.preventDefault();
      this.scheduleRender();
      this.emit("input", this.getStops());
      this.emit("change", this.getStops());
    }
  }

  // ---- Helpers ----

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  private emit(event: string, stops: RampStop[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const h of Array.from(set)) {
      try { h(stops); } catch (err) { console.error("ColorRamp listener error:", err); }
    }
  }
}
