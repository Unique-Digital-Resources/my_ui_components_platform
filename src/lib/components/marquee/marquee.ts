export type MarqueeDirection = "left" | "right" | "up" | "down";
export type MarqueeOptions = { items?: string[]; direction?: MarqueeDirection; speed?: number; pauseOnHover?: boolean; gap?: number; showSeparator?: boolean; separator?: string; };
const STYLE_ID = "marquee-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style"); el.id = STYLE_ID;
  el.textContent = `.mq-root{--mq-text:#F4F1FF;--mq-muted:#B8B2CA;--mq-accent:#D9FF66;--mq-border:#383343;--mq-surface:#211A30;font-family:inherit;color:var(--mq-text);overflow:hidden;width:100%;position:relative;border:1px solid var(--mq-border);border-radius:8px;background:var(--mq-surface)}.mq-track{display:flex;align-items:center;white-space:nowrap;will-change:transform}.mq-root.mq-horizontal .mq-track{flex-direction:row}.mq-root.mq-vertical{height:100%}.mq-root.mq-vertical .mq-track{flex-direction:column;height:max-content}.mq-item{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;font-size:13px;font-weight:500;color:var(--mq-text);flex:0 0 auto}.mq-separator{color:var(--mq-accent);font-weight:700;flex:0 0 auto;padding:0 4px;user-select:none}.mq-root.mq-paused .mq-track{animation-play-state:paused}@keyframes mq-scroll-left{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes mq-scroll-right{from{transform:translateX(-50%)}to{transform:translateX(0)}}@keyframes mq-scroll-up{from{transform:translateY(0)}to{transform:translateY(-50%)}}@keyframes mq-scroll-down{from{transform:translateY(-50%)}to{transform:translateY(0)}}`;
  document.head.appendChild(el);
}
export class Marquee {
  private container: HTMLElement; private root!: HTMLElement; private trackEl!: HTMLElement;
  private opts: Required<MarqueeOptions>; private items: string[]; private _destroyed = false; private paused = false;
  constructor(container: HTMLElement, options: MarqueeOptions = {}) {
    this.container = container; injectStyles();
    this.opts = { items: options.items ?? [], direction: options.direction ?? "left", speed: options.speed ?? 50, pauseOnHover: options.pauseOnHover ?? true, gap: options.gap ?? 24, showSeparator: options.showSeparator ?? true, separator: options.separator ?? "•" };
    this.items = (this.opts.items as string[]).map(s => s); this.render();
  }
  private render() {
    if (this._destroyed) return; const isV = this.opts.direction === "up" || this.opts.direction === "down";
    const root = document.createElement("div"); root.className = `mq-root mq-${isV ? "vertical" : "horizontal"}`;
    const track = document.createElement("div"); track.className = "mq-track"; track.style.gap = `${this.opts.gap}px`;
    const buildItems = () => { for (const item of this.items) { const el = document.createElement("span"); el.className = "mq-item"; el.textContent = item; track.appendChild(el); if (this.opts.showSeparator) { const sep = document.createElement("span"); sep.className = "mq-separator"; sep.textContent = this.opts.separator; track.appendChild(sep); } } };
    buildItems(); buildItems();
    root.appendChild(track); this.container.innerHTML = ""; this.container.appendChild(root); this.root = root; this.trackEl = track;
    this.applyAnimation();
    if (this.opts.pauseOnHover) { root.addEventListener("mouseenter", () => this.pause()); root.addEventListener("mouseleave", () => this.resume()); }
  }
  private applyAnimation() {
    const isV = this.opts.direction === "up" || this.opts.direction === "down";
    const size = isV ? this.trackEl.scrollHeight : this.trackEl.scrollWidth;
    const distance = size / 2; const duration = distance > 0 ? distance / this.opts.speed : 10;
    this.trackEl.style.animation = `mq-scroll-${this.opts.direction} ${duration}s linear infinite`;
    if (this.paused) this.root.classList.add("mq-paused");
  }
  pause() { if (this._destroyed) return; this.paused = true; this.root.classList.add("mq-paused"); }
  resume() { if (this._destroyed) return; this.paused = false; this.root.classList.remove("mq-paused"); }
  isPaused() { return this.paused; }
  setItems(items: string[]) { if (this._destroyed) return; this.items = items.map(s => s); this.render(); }
  setProperty(name: string, value: unknown) { if (this._destroyed) return; if (name === "direction") this.opts.direction = value as MarqueeDirection; else if (name === "speed") { this.opts.speed = Number(value); this.applyAnimation(); return; } else if (name === "pauseOnHover") this.opts.pauseOnHover = !!value; else if (name === "gap") this.opts.gap = Number(value); else if (name === "showSeparator") this.opts.showSeparator = !!value; else if (name === "separator") this.opts.separator = value as string; else if (name === "items") { this.setItems(value as string[]); return; } else return; this.render(); }
  destroy() { if (this._destroyed) return; this._destroyed = true; this.container.innerHTML = ""; }
}
