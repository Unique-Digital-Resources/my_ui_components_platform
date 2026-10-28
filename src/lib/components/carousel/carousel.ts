export type CarouselSlide = { id: string; title: string; description?: string; color?: string; };
export type CarouselOptions = { slides?: CarouselSlide[]; current?: number; loop?: boolean; autoplay?: boolean; autoplayInterval?: number; showArrows?: boolean; showDots?: boolean; transition?: "slide" | "fade"; };
export type CarouselEventPayload = { type?: string; index?: number; previousIndex?: number; slideId?: string; source?: "pointer" | "keyboard" | "programmatic" | "autoplay"; };
export type CarouselHandler = (p: CarouselEventPayload) => void;
const STYLE_ID = "carousel-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style"); el.id = STYLE_ID;
  el.textContent = `.crl-root{--crl-bg:#211A30;--crl-surface:#2A2238;--crl-border:#383343;--crl-text:#F4F1FF;--crl-muted:#B8B2CA;--crl-accent:#D9FF66;--crl-radius:8px;font-family:inherit;color:var(--crl-text);position:relative;width:100%;border-radius:var(--crl-radius);overflow:hidden;background:var(--crl-bg);border:1px solid var(--crl-border)}.crl-viewport{position:relative;width:100%;height:240px;overflow:hidden}.crl-track{display:flex;height:100%;transition:transform .3s}.crl-track.crl-fade{transition:none}.crl-slide{flex:0 0 100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;gap:8px}.crl-slide-title{font-size:18px;font-weight:700}.crl-slide-desc{font-size:13px;color:var(--crl-muted);max-width:320px;line-height:1.5}.crl-arrow{position:absolute;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;background:var(--crl-surface);border:1px solid var(--crl-border);color:var(--crl-text);cursor:pointer;outline:none;z-index:5;transition:background .12s,border-color .12s}.crl-arrow:hover{border-color:var(--crl-accent);color:var(--crl-accent)}.crl-arrow:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb,var(--crl-accent) 40%,transparent)}.crl-arrow svg{width:16px;height:16px}.crl-arrow-left{left:10px}.crl-arrow-right{right:10px}.crl-dots{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 0;background:var(--crl-surface);border-top:1px solid var(--crl-border)}.crl-dot{width:8px;height:8px;border-radius:999px;background:var(--crl-border);border:none;cursor:pointer;padding:0;transition:background .12s,width .2s}.crl-dot.crl-active{background:var(--crl-accent);width:20px}@media(prefers-reduced-motion:reduce){.crl-track,.crl-dot{transition:none}}`;
  document.head.appendChild(el);
}
const ICON_LEFT = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>`;
const ICON_RIGHT = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>`;
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
export class Carousel {
  private container: HTMLElement; private root!: HTMLElement; private opts: Required<CarouselOptions>;
  private slides: CarouselSlide[]; private current = 0;
  private listeners = new Map<string, Set<CarouselHandler>>(); private _destroyed = false;
  private trackEl!: HTMLElement; private autoplayTimer: ReturnType<typeof setInterval> | null = null;
  constructor(container: HTMLElement, options: CarouselOptions = {}) {
    this.container = container; injectStyles();
    this.opts = { slides: options.slides ?? [], current: options.current ?? 0, loop: options.loop ?? true, autoplay: options.autoplay ?? false, autoplayInterval: options.autoplayInterval ?? 3000, showArrows: options.showArrows ?? true, showDots: options.showDots ?? true, transition: options.transition ?? "slide" };
    this.slides = (this.opts.slides as CarouselSlide[]).map(s => ({ ...s }));
    this.current = clamp(this.opts.current, 0, Math.max(0, this.slides.length - 1)); this.render();
    if (this.opts.autoplay) this.startAutoplay();
  }
  private render() {
    if (this._destroyed) return; const root = document.createElement("div"); root.className = "crl-root"; root.tabIndex = 0;
    const viewport = document.createElement("div"); viewport.className = "crl-viewport";
    const track = document.createElement("div"); track.className = "crl-track";
    if (this.opts.transition === "fade") track.classList.add("crl-fade"); this.trackEl = track;
    for (const slide of this.slides) {
      const el = document.createElement("div"); el.className = "crl-slide"; if (slide.color) el.style.background = slide.color;
      const title = document.createElement("div"); title.className = "crl-slide-title"; title.textContent = slide.title; el.appendChild(title);
      if (slide.description) { const desc = document.createElement("div"); desc.className = "crl-slide-desc"; desc.textContent = slide.description; el.appendChild(desc); }
      track.appendChild(el);
    }
    viewport.appendChild(track); root.appendChild(viewport);
    if (this.opts.showArrows) {
      const left = document.createElement("button"); left.type = "button"; left.className = "crl-arrow crl-arrow-left"; left.setAttribute("aria-label", "Previous"); left.innerHTML = ICON_LEFT; left.addEventListener("click", () => this.prev("pointer")); root.appendChild(left);
      const right = document.createElement("button"); right.type = "button"; right.className = "crl-arrow crl-arrow-right"; right.setAttribute("aria-label", "Next"); right.innerHTML = ICON_RIGHT; right.addEventListener("click", () => this.next("pointer")); root.appendChild(right);
    }
    if (this.opts.showDots) {
      const dots = document.createElement("div"); dots.className = "crl-dots";
      for (let i = 0; i < this.slides.length; i++) { const dot = document.createElement("button"); dot.type = "button"; dot.className = "crl-dot"; if (i === this.current) dot.classList.add("crl-active"); dot.setAttribute("aria-label", `Go to slide ${i + 1}`); dot.addEventListener("click", () => this.goTo(i, "pointer")); dots.appendChild(dot); }
      root.appendChild(dots);
    }
    root.addEventListener("keydown", e => { if (e.key === "ArrowLeft") { e.preventDefault(); this.prev("keyboard"); } if (e.key === "ArrowRight") { e.preventDefault(); this.next("keyboard"); } });
    this.container.innerHTML = ""; this.container.appendChild(root); this.root = root; this.updateTrack();
  }
  private updateTrack() {
    this.trackEl.style.transform = `translateX(-${this.current * 100}%)`;
    if (this.opts.transition === "fade") { Array.from(this.trackEl.children).forEach((el, i) => { (el as HTMLElement).style.opacity = i === this.current ? "1" : "0"; (el as HTMLElement).style.transition = "opacity .3s"; }); }
    this.root.querySelectorAll(".crl-dot").forEach((d, i) => d.classList.toggle("crl-active", i === this.current));
  }
  next(source: "pointer" | "keyboard" | "programmatic" | "autoplay" = "programmatic") { if (this._destroyed) return; let n = this.current + 1; if (n >= this.slides.length) { if (this.opts.loop) n = 0; else return; } this.goTo(n, source); }
  prev(source: "pointer" | "keyboard" | "programmatic" | "autoplay" = "programmatic") { if (this._destroyed) return; let n = this.current - 1; if (n < 0) { if (this.opts.loop) n = this.slides.length - 1; else return; } this.goTo(n, source); }
  goTo(index: number, source: "pointer" | "keyboard" | "programmatic" | "autoplay" = "programmatic") { if (this._destroyed) return; const prev = this.current; this.current = clamp(index, 0, Math.max(0, this.slides.length - 1)); this.updateTrack(); this.emit("change", { index: this.current, previousIndex: prev, slideId: this.slides[this.current]?.id, source }); }
  startAutoplay() { if (this.autoplayTimer) clearInterval(this.autoplayTimer); this.autoplayTimer = setInterval(() => this.next("autoplay"), this.opts.autoplayInterval); }
  stopAutoplay() { if (this.autoplayTimer) { clearInterval(this.autoplayTimer); this.autoplayTimer = null; } }
  getCurrent() { return this.current; }
  setSlides(slides: CarouselSlide[]) { if (this._destroyed) return; this.slides = slides.map(s => ({ ...s })); this.current = clamp(this.current, 0, Math.max(0, this.slides.length - 1)); this.render(); }
  setProperty(name: string, value: unknown) { if (this._destroyed) return; if (name === "loop") this.opts.loop = !!value; else if (name === "autoplay") { this.opts.autoplay = !!value; if (this.opts.autoplay) this.startAutoplay(); else this.stopAutoplay(); return; } else if (name === "autoplayInterval") { this.opts.autoplayInterval = Number(value); if (this.opts.autoplay) { this.stopAutoplay(); this.startAutoplay(); } return; } else if (name === "showArrows") this.opts.showArrows = !!value; else if (name === "showDots") this.opts.showDots = !!value; else if (name === "transition") this.opts.transition = value as "slide" | "fade"; else if (name === "slides") { this.setSlides(value as CarouselSlide[]); return; } else return; this.render(); }
  on(event: string, handler: CarouselHandler) { if (!this.listeners.has(event)) this.listeners.set(event, new Set()); this.listeners.get(event)!.add(handler); }
  off(event: string, handler: CarouselHandler) { this.listeners.get(event)?.delete(handler); }
  private emit(event: string, payload: CarouselEventPayload) { const set = this.listeners.get(event); if (!set) return; const p = { ...payload, type: event }; for (const h of set) { try { h(p); } catch (e) { console.error(e); } } }
  destroy() { if (this._destroyed) return; this._destroyed = true; this.stopAutoplay(); this.listeners.clear(); this.container.innerHTML = ""; }
}
