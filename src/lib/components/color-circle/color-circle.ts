/**
 * ColorCircle — Adobe Color-style circular color picker with harmony rules.
 *
 * Matches Adobe Color's behavior:
 *   - 5 color slots by default (base at index 2, the middle).
 *   - 9 harmony rules that define hue offsets for all 5 positions.
 *   - Moving the base color rotates all non-locked colors.
 *   - Moving a non-base color changes only that color.
 *   - Colors can be locked (locked colors don't move when base moves).
 *   - Colors can be added (left/right of any position) and removed.
 *   - The wheel shows hue (angle) and saturation (radius). Lightness is
 *     adjusted via the palette UI, not on the wheel.
 *
 * Public API:
 *   new ColorCircle(container, options)
 *   getColors(), getBaseIndex()
 *   setHarmony(rule)
 *   lockColor(i), unlockColor(i), isLocked(i)
 *   addColor(index, hue?, sat?), removeColor(i)
 *   setSize(n), setSnapping(on), setGridMode(mode), setGridDivisions(n)
 *   setShowHarmonyLinks(on), getOutput()
 *   on("input"|"change", handler), off(event, handler), destroy()
 */

import {
  type HarmonyRule,
  type GridMode,
  getRule,
  defineCustomRule,
  generateHues,
  defaultSaturations,
  defaultLightnesses,
  wrapHue,
  hueDelta,
  isConstrained,
} from "./harmony-engine";

export type { HarmonyRule, GridMode };

export interface ColorCircleOptions {
  harmony?: HarmonyRule;
  baseHue?: number;
  size?: number;
  snapping?: boolean;
  gridMode?: GridMode;
  gridDivisions?: number;
  showHarmonyLinks?: boolean;
}

export interface ColorEntry {
  id: number;
  hue: number;         // 0–360 absolute
  saturation: number;  // 0–1
  lightness: number;   // 0–100 (HSL L)
  isBase: boolean;
  isLocked: boolean;
  /** Hue offset from the base color (degrees). */
  offset: number;
}

export interface ColorCircleColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsv: { h: number; s: number; v: number };
  hsl: { h: number; s: number; l: number };
}

export interface ColorCircleOutput {
  baseHue: number;
  baseIndex: number;
  harmony: HarmonyRule;
  colors: (ColorCircleColor & {
    isBase: boolean;
    isLocked: boolean;
    saturation: number;
    lightness: number;
    offset: number;
  })[];
}

const DEFAULTS: Required<ColorCircleOptions> = {
  harmony: "triad",
  baseHue: 210,
  size: 240,
  snapping: false,
  gridMode: "dots",
  gridDivisions: 12,
  showHarmonyLinks: true,
};

function ringCountFromDivisions(divisions: number): number {
  return Math.max(1, Math.floor(divisions / 2) - 1);
}

const STYLE_ID = "color-circle-styles";

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.color-circle { display: inline-block; position: relative; font-family: inherit; --color-circle-focus-ring: rgba(217,255,102,0.55); }
.color-circle canvas { display: block; touch-action: none; outline: none; cursor: pointer; }
.color-circle canvas:focus-visible { box-shadow: 0 0 0 3px var(--color-circle-focus-ring); }
`;
  document.head.appendChild(style);
}

function clamp(v: number, min: number, max: number): number { return v < min ? min : v > max ? max : v; }

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = wrapHue(h); s = clamp(s, 0, 100) / 100; v = clamp(v, 0, 100) / 100;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hslToHsv(h: number, s: number, l: number): { h: number; s: number; v: number } {
  h = wrapHue(h); s = clamp(s, 0, 100); l = clamp(l, 0, 100);
  const v = l + s * Math.min(l, 100 - l) / 100;
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return { h, s: sv * 100, v };
}

let nextColorId = 1;
type Handler = (out: ColorCircleOutput) => void;

export class ColorCircle {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private options: Required<ColorCircleOptions>;
  private colors: ColorEntry[];
  private baseIndex: number;
  private readonly listeners: Map<string, Set<Handler>> = new Map();
  private pointerState: { pointerId: number; colorIdx: number } | null = null;
  private _destroyed = false;
  private diskCache: HTMLCanvasElement | null = null;
  private diskCacheCtx: CanvasRenderingContext2D | null = null;
  private diskCacheKey = "";
  private readonly _onPointerDown: (e: PointerEvent) => void;
  private readonly _onPointerMove: (e: PointerEvent) => void;
  private readonly _onPointerUp: (e: PointerEvent) => void;
  private readonly _onKeyDown: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, options: ColorCircleOptions = {}) {
    if (!container) throw new Error("ColorCircle: container is required");
    this.container = container;
    this.options = {
      harmony: options.harmony ?? DEFAULTS.harmony,
      baseHue: wrapHue(options.baseHue ?? DEFAULTS.baseHue),
      size: Math.max(80, options.size ?? DEFAULTS.size),
      snapping: options.snapping ?? DEFAULTS.snapping,
      gridMode: options.gridMode ?? DEFAULTS.gridMode,
      gridDivisions: Math.max(2, options.gridDivisions ?? DEFAULTS.gridDivisions),
      showHarmonyLinks: options.showHarmonyLinks ?? DEFAULTS.showHarmonyLinks,
    };
    this.colors = this.buildPalette(this.options.harmony, this.options.baseHue);
    this.baseIndex = this.colors.findIndex((c) => c.isBase);
    if (this.baseIndex < 0) this.baseIndex = 0;
    injectStyles();
    this.canvas = document.createElement("canvas");
    this.canvas.className = "color-circle-canvas";
    this.canvas.setAttribute("role", "application");
    this.canvas.setAttribute("aria-label", "Color circle. Drag the base color to move the palette, or drag individual colors.");
    this.canvas.tabIndex = 0;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("ColorCircle: 2D canvas context unavailable");
    this.ctx = ctx;
    this.container.classList.add("color-circle");
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

  /** Build a palette from a harmony rule and base hue. */
  private buildPalette(rule: HarmonyRule, baseHue: number): ColorEntry[] {
    const def = getRule(rule);
    if (!def) return [{
      id: nextColorId++, hue: baseHue, saturation: 1.0, lightness: 50,
      isBase: true, isLocked: false, offset: 0,
    }];
    const hues = generateHues(baseHue, rule);
    const sats = defaultSaturations(rule);
    const lights = defaultLightnesses(rule);
    return def.offsets.map((offset, i) => ({
      id: nextColorId++,
      hue: hues[i],
      saturation: sats[i] ?? 1.0,
      lightness: lights[i] ?? 50,
      isBase: offset === 0,
      isLocked: false,
      offset,
    }));
  }

  // ---- Public API ----

  getColors(): ColorEntry[] { return this.colors.map((c) => ({ ...c })); }
  getBaseIndex(): number { return this.baseIndex; }
  getBaseHue(): number { return this.colors[this.baseIndex].hue; }
  getHarmony(): HarmonyRule { return this.options.harmony; }

  setHarmony(rule: HarmonyRule): void {
    if (this.options.harmony === rule) return;
    this.options.harmony = rule;
    // Rebuild palette from the new rule, preserving the current base hue.
    const baseHue = this.colors[this.baseIndex].hue;
    this.colors = this.buildPalette(rule, baseHue);
    this.baseIndex = this.colors.findIndex((c) => c.isBase);
    if (this.baseIndex < 0) this.baseIndex = 0;
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getOutput());
    this.emit("change", this.getOutput());
  }

  lockColor(i: number): void {
    if (i < 0 || i >= this.colors.length) return;
    this.colors[i].isLocked = true;
    this.scheduleRender();
    this.emit("input", this.getOutput());
    this.emit("change", this.getOutput());
  }

  unlockColor(i: number): void {
    if (i < 0 || i >= this.colors.length) return;
    this.colors[i].isLocked = false;
    this.scheduleRender();
    this.emit("input", this.getOutput());
    this.emit("change", this.getOutput());
  }

  isLocked(i: number): boolean {
    return this.colors[i]?.isLocked ?? false;
  }

  /**
   * Define a custom harmony rule with user-specified angle offsets and
   * switch to it immediately. The base color's hue is preserved.
   * Example: setCustomOffsets([0, 60, 120, 180, 240]) creates a 5-color
   * rule with 60° spacing.
   */
  setCustomOffsets(offsets: number[], label?: string): void {
    const ruleLabel = label ?? `Custom ${offsets.length} colors`;
    const def = defineCustomRule(ruleLabel, offsets);
    this.options.harmony = def.id;
    const baseHue = this.colors[this.baseIndex].hue;
    this.colors = this.buildPalette(def.id, baseHue);
    this.baseIndex = this.colors.findIndex((c) => c.isBase);
    if (this.baseIndex < 0) this.baseIndex = 0;
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getOutput());
    this.emit("change", this.getOutput());
  }

  /**
   * Add a color at a specific index. If no hue/saturation is given, the
   * color is placed at the base hue + 30° offset, full saturation.
   * Returns the new color's index.
   */
  addColor(index: number, hue?: number, saturation?: number): number {
    const baseHue = this.colors[this.baseIndex].hue;
    const newHue = wrapHue(hue ?? wrapHue(baseHue + 30));
    const newSat = clamp(saturation ?? 1.0, 0, 1);
    const offset = hueDelta(baseHue, newHue);
    const insertIdx = clamp(index, 0, this.colors.length);
    this.colors.splice(insertIdx, 0, {
      id: nextColorId++, hue: newHue, saturation: newSat, lightness: 50,
      isBase: false, isLocked: false, offset,
    });
    if (insertIdx <= this.baseIndex) this.baseIndex++;
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getOutput());
    this.emit("change", this.getOutput());
    return insertIdx;
  }

  /**
   * Add a color on the SAME RADIAL LINE as an existing color (same hue,
   * different saturation/distance from center). This lets users create
   * shades/tints of a color along the same spoke.
   * Returns the new color's index.
   */
  addColorOnLine(i: number, saturation?: number): number {
    if (i < 0 || i >= this.colors.length) return -1;
    const src = this.colors[i];
    // Place the new color at a different saturation on the same hue line.
    // Default: halfway between current saturation and center (0).
    const newSat = clamp(saturation ?? src.saturation * 0.5, 0, 1);
    const baseHue = this.colors[this.baseIndex].hue;
    const offset = hueDelta(baseHue, src.hue);
    const insertIdx = i + 1;
    this.colors.splice(insertIdx, 0, {
      id: nextColorId++,
      hue: src.hue,
      saturation: newSat,
      lightness: 50,
      isBase: false,
      isLocked: false,
      offset,
    });
    if (insertIdx <= this.baseIndex) this.baseIndex++;
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getOutput());
    this.emit("change", this.getOutput());
    return insertIdx;
  }

  removeColor(i: number): void {
    if (this.colors.length <= 1) return;
    if (i < 0 || i >= this.colors.length) return;
    const wasBase = this.colors[i].isBase;
    this.colors.splice(i, 1);
    if (wasBase) {
      // Promote the middle color to base.
      this.baseIndex = Math.floor(this.colors.length / 2);
      this.colors[this.baseIndex].isBase = true;
      this.options.baseHue = this.colors[this.baseIndex].hue;
    } else if (i < this.baseIndex) {
      this.baseIndex--;
    }
    this.updateAria();
    this.scheduleRender();
    this.emit("input", this.getOutput());
    this.emit("change", this.getOutput());
  }

  setSize(size: number): void {
    const s = Math.max(80, Math.round(size));
    if (this.options.size === s) return;
    this.options.size = s;
    this.updateCanvasSize();
    this.invalidateDiskCache();
    this.scheduleRender();
  }

  setSnapping(on: boolean): void { if (this.options.snapping !== on) { this.options.snapping = on; this.scheduleRender(); } }
  setGridMode(mode: GridMode): void { if (this.options.gridMode !== mode) { this.options.gridMode = mode; this.scheduleRender(); } }
  setGridDivisions(n: number): void { const d = Math.max(2, Math.round(n)); if (this.options.gridDivisions !== d) { this.options.gridDivisions = d; this.scheduleRender(); } }
  setShowHarmonyLinks(on: boolean): void { if (this.options.showHarmonyLinks !== on) { this.options.showHarmonyLinks = on; this.scheduleRender(); } }

  getOutput(): ColorCircleOutput {
    const baseHue = this.colors[this.baseIndex].hue;
    const colors = this.colors.map((c) => {
      const hsv = hslToHsv(c.hue, c.saturation * 100, c.lightness);
      const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
      return {
        hex: rgbToHex(rgb.r, rgb.g, rgb.b), rgb, hsv,
        hsl: { h: c.hue, s: c.saturation * 100, l: c.lightness },
        isBase: c.isBase, isLocked: c.isLocked,
        saturation: c.saturation, lightness: c.lightness, offset: c.offset,
      };
    });
    return { baseHue, baseIndex: this.baseIndex, harmony: this.options.harmony, colors };
  }

  on(event: "input" | "change", handler: Handler): void;
  on(event: string, handler: Handler): void {
    let set = this.listeners.get(event);
    if (!set) { set = new Set<Handler>(); this.listeners.set(event, set); }
    set.add(handler);
  }
  off(event: string, handler: Handler): void { this.listeners.get(event)?.delete(handler); }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    this.canvas.removeEventListener("pointerup", this._onPointerUp);
    this.canvas.removeEventListener("pointercancel", this._onPointerUp);
    this.canvas.removeEventListener("keydown", this._onKeyDown);
    if (this.pointerState) { try { this.canvas.releasePointerCapture(this.pointerState.pointerId); } catch {} this.pointerState = null; }
    this.listeners.clear();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.container.classList.remove("color-circle");
    this.diskCache = null; this.diskCacheCtx = null;
  }

  // ---- Geometry ----

  private get geom() {
    const { size } = this.options;
    const pad = 18;
    const total = size + pad * 2;
    const r = size / 2;
    return { size: total, r, cx: total / 2, cy: total / 2, pad };
  }

  private updateCanvasSize(): void {
    const { size } = this.geom;
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private invalidateDiskCache(): void { this.diskCacheKey = ""; }

  private scheduleRender(): void {
    if (this._destroyed) return;
    requestAnimationFrame(() => { if (!this._destroyed) this.render(); });
  }

  private render(): void {
    const { size } = this.geom;
    this.ctx.clearRect(0, 0, size, size);
    this.renderDisk();
    if (this.options.snapping) this.renderGrid();
    this.renderLinks();
    this.renderMarkers();
  }

  // ---- Hue disk (cached) ----

  private renderDisk(): void {
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    const { size, cx, cy, r } = this.geom;
    const key = `disk-${size}-${dpr}`;
    if (key !== this.diskCacheKey || !this.diskCache || !this.diskCacheCtx) {
      if (!this.diskCache) { this.diskCache = document.createElement("canvas"); this.diskCacheCtx = this.diskCache.getContext("2d"); }
      const cctx = this.diskCacheCtx!;
      const backing = Math.round(size * dpr);
      if (this.diskCache!.width !== backing) { this.diskCache!.width = backing; this.diskCache!.height = backing; }
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.clearRect(0, 0, size, size);
      if (typeof cctx.createConicGradient === "function") {
        const grad = cctx.createConicGradient(-Math.PI / 2, cx, cy);
        for (let h = 0; h <= 360; h += 15) { const rgb = hsvToRgb(h % 360, 100, 100); grad.addColorStop(h / 360, `rgb(${rgb.r},${rgb.g},${rgb.b})`); }
        grad.addColorStop(1, "rgb(255,0,0)");
        cctx.beginPath(); cctx.arc(cx, cy, r, 0, Math.PI * 2); cctx.fillStyle = grad; cctx.fill();
      }
      const satGrad = cctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      satGrad.addColorStop(0, "rgba(255,255,255,1)"); satGrad.addColorStop(1, "rgba(255,255,255,0)");
      cctx.beginPath(); cctx.arc(cx, cy, r, 0, Math.PI * 2); cctx.fillStyle = satGrad; cctx.fill();
      cctx.beginPath(); cctx.arc(cx, cy, r, 0, Math.PI * 2); cctx.strokeStyle = "rgba(0,0,0,0.35)"; cctx.lineWidth = 1; cctx.stroke();
      this.diskCacheKey = key;
    }
    this.ctx.drawImage(this.diskCache, 0, 0, size, size);
  }

  // ---- Polar grid ----

  private renderGrid(): void {
    const { cx, cy, r } = this.geom;
    const { gridMode, gridDivisions } = this.options;
    const ctx = this.ctx;
    ctx.save();
    const ringCount = ringCountFromDivisions(gridDivisions);
    const ringRadii: number[] = [];
    for (let i = 1; i <= ringCount; i++) ringRadii.push((r * i) / (ringCount + 1));
    if (gridMode === "dots") {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      const dotR = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fill();
      for (const rr of ringRadii) { for (let i = 0; i < gridDivisions; i++) { const rad = (i * (360 / gridDivisions) - 90) * Math.PI / 180; ctx.beginPath(); ctx.arc(cx + rr * Math.cos(rad), cy + rr * Math.sin(rad), dotR, 0, Math.PI * 2); ctx.fill(); } }
      for (let i = 0; i < gridDivisions; i++) { const rad = (i * (360 / gridDivisions) - 90) * Math.PI / 180; ctx.beginPath(); ctx.arc(cx + r * Math.cos(rad), cy + r * Math.sin(rad), dotR, 0, Math.PI * 2); ctx.fill(); }
    } else {
      for (const rr of ringRadii) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.5; ctx.stroke(); }
      for (let i = 0; i < gridDivisions; i++) { const rad = (i * (360 / gridDivisions) - 90) * Math.PI / 180; const ex = cx + r * Math.cos(rad), ey = cy + r * Math.sin(rad); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1; ctx.stroke(); }
    }
    ctx.restore();
  }

  // ---- Harmony links ----

  private getMarkerPositions(): { x: number; y: number; hue: number; sat: number; isBase: boolean; isLocked: boolean }[] {
    const { cx, cy, r } = this.geom;
    return this.colors.map((c) => {
      const rad = (c.hue - 90) * Math.PI / 180;
      const rr = c.saturation * r;
      return { x: cx + rr * Math.cos(rad), y: cy + rr * Math.sin(rad), hue: c.hue, sat: c.saturation, isBase: c.isBase, isLocked: c.isLocked };
    });
  }

  /**
   * Draw radial lines from each marker to the center of the circle.
   * This visualizes the angular relationship of each color to the base
   * (at center) — NOT between markers. Each line makes the hue angle
   * of its color visually clear.
   */
  private renderLinks(): void {
    if (!this.options.showHarmonyLinks) return;
    const ctx = this.ctx;
    const { cx, cy } = this.geom;
    const positions = this.getMarkerPositions();
    ctx.save();
    for (const p of positions) {
      // Radial line from center to marker.
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = p.isBase
        ? "rgba(217,255,102,0.5)"
        : "rgba(255,255,255,0.4)";
      ctx.lineWidth = p.isBase ? 2 : 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- Markers ----

  private renderMarkers(): void {
    const ctx = this.ctx;
    const positions = this.getMarkerPositions();
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const c = this.colors[i];
      const hsv = hslToHsv(c.hue, c.saturation * 100, c.lightness);
      const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
      const markerR = p.isBase ? 12 : 9;
      const ringR = markerR + 2;
      // White halo.
      ctx.beginPath(); ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
      ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.stroke();
      // Dark inner ring.
      ctx.beginPath(); ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.stroke();
      // Color dot.
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, markerR - 3), 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`; ctx.fill();
      // Base marker: lemon accent ring.
      if (p.isBase) { ctx.beginPath(); ctx.arc(p.x, p.y, ringR + 3, 0, Math.PI * 2); ctx.lineWidth = 2.5; ctx.strokeStyle = "#D9FF66"; ctx.stroke(); }
      // Locked marker: dark inner dot.
      if (p.isLocked) {
        ctx.beginPath(); ctx.arc(p.x + markerR - 2, p.y - markerR + 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fill();
        ctx.fillStyle = "#D9FF66"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("L", p.x + markerR - 2, p.y - markerR + 2);
      }
      // Index label.
      ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), p.x, p.y);
    }
  }

  // ---- Pointer interaction ----

  private getCanvasPoint(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const { size } = this.geom;
    const scale = size / (rect.width || size);
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  }

  private findNearestMarker(x: number, y: number): number {
    const positions = this.getMarkerPositions();
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < positions.length; i++) { const dx = x - positions[i].x, dy = y - positions[i].y; const d = Math.sqrt(dx * dx + dy * dy); if (d < bestDist) { bestDist = d; best = i; } }
    return best;
  }

  private onPointerDown(e: PointerEvent): void {
    if (this._destroyed) return;
    const { x, y } = this.getCanvasPoint(e);
    const idx = this.findNearestMarker(x, y);
    this.pointerState = { pointerId: e.pointerId, colorIdx: idx };
    try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    this.updateColorFromPoint(idx, x, y);
    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.pointerState) return;
    const { x, y } = this.getCanvasPoint(e);
    this.updateColorFromPoint(this.pointerState.colorIdx, x, y);
    e.preventDefault();
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.pointerState) return;
    try { this.canvas.releasePointerCapture(this.pointerState.pointerId); } catch {}
    this.pointerState = null;
    this.emit("change", this.getOutput());
  }

  /**
   * Update a color from a pointer position (Adobe Color behavior):
   * - BASE color: moving it rotates ALL non-locked colors by the same hue
   *   delta (hue control). The base's saturation (distance from center)
   *   also scales all non-locked colors' saturation proportionally — so the
   *   base controls the distance between every color and the center.
   * - NON-BASE color: only its hue+saturation change. Its offset recalculates.
   * - LOCKED colors: never move when the base moves.
   */
  private updateColorFromPoint(idx: number, x: number, y: number): void {
    const { cx, cy, r } = this.geom;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let theta = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (theta < 0) theta += 360;
    let hue = wrapHue(theta);
    let sat = clamp(dist / r, 0, 1);
    if (this.options.snapping) {
      hue = this.snapToGrid(hue);
      const ringCount = ringCountFromDivisions(this.options.gridDivisions);
      const ringFrac = 1 / (ringCount + 1);
      sat = Math.round(sat / ringFrac) * ringFrac;
    }
    const color = this.colors[idx];
    if (color.isBase) {
      const hueDeltaVal = hueDelta(color.hue, hue);
      const oldSat = color.saturation;
      color.hue = hue;
      color.saturation = sat;
      this.options.baseHue = hue;
      // Scale all non-locked colors' saturation proportionally.
      // The base controls the distance between every color and the center.
      const satRatio = oldSat > 0.001 ? sat / oldSat : 1;
      for (const c of this.colors) {
        if (c.id === color.id || c.isLocked) continue;
        // Rotate hue by the same delta.
        c.hue = wrapHue(c.hue + hueDeltaVal);
        // Scale saturation (distance from center) by the same ratio.
        c.saturation = clamp(c.saturation * satRatio, 0, 1);
      }
    } else {
      color.hue = hue;
      color.saturation = sat;
      const baseHue = this.colors[this.baseIndex].hue;
      color.offset = hueDelta(baseHue, hue);
    }
    this.scheduleRender();
    this.updateAria();
    this.emit("input", this.getOutput());
  }

  private snapToGrid(hue: number): number { const step = 360 / this.options.gridDivisions; return Math.round(hue / step) * step; }

  private onKeyDown(e: KeyboardEvent): void {
    if (this._destroyed) return;
    const step = e.shiftKey ? 15 : 1;
    const base = this.colors[this.baseIndex];
    let delta = 0; let handled = false;
    switch (e.key) {
      case "ArrowLeft": case "ArrowDown": delta = -step; handled = true; break;
      case "ArrowRight": case "ArrowUp": delta = step; handled = true; break;
      case "Home": delta = -base.hue; handled = true; break;
      case "End": delta = 360 - base.hue; handled = true; break;
    }
    if (handled) {
      e.preventDefault();
      // Rotate all non-locked colors by delta.
      for (const c of this.colors) { if (!c.isLocked) c.hue = wrapHue(c.hue + delta); }
      this.options.baseHue = this.colors[this.baseIndex].hue;
      this.scheduleRender(); this.updateAria();
      const out = this.getOutput();
      this.emit("input", out); this.emit("change", out);
    }
  }

  private updateAria(): void {
    const base = this.colors[this.baseIndex];
    this.canvas.setAttribute("aria-valuenow", String(Math.round(base.hue)));
    this.canvas.setAttribute("aria-valuetext", `${this.options.harmony} harmony, base hue ${Math.round(base.hue)}°, ${this.colors.length} colors`);
  }

  private emit(event: string, out: ColorCircleOutput): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const h of Array.from(set)) { try { h(out); } catch (err) { console.error("ColorCircle listener error:", err); } }
  }
}
