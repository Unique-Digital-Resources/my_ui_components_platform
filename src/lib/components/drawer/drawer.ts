export type DrawerSide = "top" | "bottom" | "left" | "right";
export type DrawerOptions = { side?: DrawerSide; size?: number; open?: boolean; showOverlay?: boolean; closeOnOverlayClick?: boolean; closeOnEscape?: boolean; title?: string; content?: string; };
export type DrawerEventPayload = { type?: string; open?: boolean; source?: "pointer" | "keyboard" | "programmatic"; };
export type DrawerHandler = (p: DrawerEventPayload) => void;
const STYLE_ID = "drawer-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style"); el.id = STYLE_ID;
  el.textContent = `.dr-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .25s;z-index:1000}.dr-overlay.dr-open{opacity:1;pointer-events:auto}.dr-panel{position:fixed;background:#211A30;border:1px solid #383343;color:#F4F1FF;z-index:1001;display:flex;flex-direction:column;transition:transform .28s cubic-bezier(.22,.61,.36,1);box-shadow:0 8px 32px rgba(0,0,0,.4);font-family:inherit}.dr-side-left{top:0;bottom:0;left:0;height:100%;transform:translateX(-100%);border-left:none}.dr-side-right{top:0;bottom:0;right:0;height:100%;transform:translateX(100%);border-right:none}.dr-side-top{top:0;left:0;right:0;width:100%;transform:translateY(-100%);border-top:none}.dr-side-bottom{bottom:0;left:0;right:0;width:100%;transform:translateY(100%);border-bottom:none}.dr-panel.dr-open{transform:translate(0,0)}.dr-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px;border-bottom:1px solid #383343;flex:0 0 auto}.dr-title{font-size:14px;font-weight:600;color:#F4F1FF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dr-close{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:none;background:transparent;color:#B8B2CA;cursor:pointer;border-radius:4px;outline:none;transition:color .12s,background .12s;flex:0 0 auto}.dr-close:hover{color:#F4F1FF;background:#2A2238}.dr-close:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb,#D9FF66 40%,transparent)}.dr-close svg{width:14px;height:14px}.dr-body{flex:1 1 auto;overflow:auto;padding:16px;font-size:13px;color:#B8B2CA;line-height:1.5;scrollbar-width:thin}.dr-body::-webkit-scrollbar{width:6px}.dr-body::-webkit-scrollbar-track{background:transparent}.dr-body::-webkit-scrollbar-thumb{background:#383343;border-radius:999px}@media(prefers-reduced-motion:reduce){.dr-overlay,.dr-panel{transition:none}}`;
  document.head.appendChild(el);
}
const ICON_X = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;
export class Drawer {
  private container: HTMLElement; private overlayEl!: HTMLDivElement; private panelEl!: HTMLDivElement; private bodyEl!: HTMLDivElement;
  private opts: Required<DrawerOptions>; private _open: boolean; private _destroyed = false;
  private listeners = new Map<string, Set<DrawerHandler>>(); private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  constructor(container: HTMLElement, options: DrawerOptions = {}) {
    this.container = container; injectStyles();
    this.opts = { side: options.side ?? "right", size: options.size ?? 360, open: options.open ?? false, showOverlay: options.showOverlay ?? true, closeOnOverlayClick: options.closeOnOverlayClick ?? true, closeOnEscape: options.closeOnEscape ?? true, title: options.title ?? "", content: options.content ?? "" };
    this._open = this.opts.open; this.render(); if (this._open) this.applyOpen();
  }
  private render() {
    if (this._destroyed) return;
    const overlay = document.createElement("div"); overlay.className = "dr-overlay"; overlay.setAttribute("aria-hidden", "true");
    if (this.opts.showOverlay && this._open) overlay.classList.add("dr-open");
    if (this.opts.closeOnOverlayClick) overlay.addEventListener("click", () => this.close("pointer"));
    this.container.appendChild(overlay); this.overlayEl = overlay;
    const panel = document.createElement("div"); panel.className = `dr-panel dr-side-${this.opts.side}`; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true");
    if (this.opts.title) panel.setAttribute("aria-label", this.opts.title); this.applySize(panel);
    const header = document.createElement("div"); header.className = "dr-header";
    const title = document.createElement("span"); title.className = "dr-title"; title.textContent = this.opts.title; header.appendChild(title);
    const closeBtn = document.createElement("button"); closeBtn.type = "button"; closeBtn.className = "dr-close"; closeBtn.setAttribute("aria-label", "Close"); closeBtn.innerHTML = ICON_X; closeBtn.addEventListener("click", () => this.close("pointer")); header.appendChild(closeBtn);
    panel.appendChild(header);
    const body = document.createElement("div"); body.className = "dr-body"; body.textContent = this.opts.content; panel.appendChild(body); this.bodyEl = body;
    this.container.appendChild(panel); this.panelEl = panel;
    if (this.opts.closeOnEscape) { this.keydownHandler = (e) => { if (e.key === "Escape" && this._open) this.close("keyboard"); }; document.addEventListener("keydown", this.keydownHandler); }
    if (this._open) this.panelEl.classList.add("dr-open");
  }
  private applySize(panel: HTMLElement) { const isV = this.opts.side === "left" || this.opts.side === "right"; if (isV) { panel.style.width = `${this.opts.size}px`; panel.style.height = ""; } else { panel.style.height = `${this.opts.size}px`; panel.style.width = ""; } }
  private applyOpen() { if (this._open) { this.panelEl.classList.add("dr-open"); if (this.opts.showOverlay) { this.overlayEl.classList.add("dr-open"); this.overlayEl.setAttribute("aria-hidden", "false"); } } else { this.panelEl.classList.remove("dr-open"); this.overlayEl.classList.remove("dr-open"); this.overlayEl.setAttribute("aria-hidden", "true"); } }
  open(source: "pointer" | "keyboard" | "programmatic" = "programmatic") { if (this._destroyed || this._open) return; this._open = true; this.applyOpen(); this.emit("change", { open: true, source }); }
  close(source: "pointer" | "keyboard" | "programmatic" = "programmatic") { if (this._destroyed || !this._open) return; this._open = false; this.applyOpen(); this.emit("change", { open: false, source }); }
  toggle(source: "pointer" | "keyboard" | "programmatic" = "programmatic") { if (this._open) this.close(source); else this.open(source); }
  isOpen() { return this._open; }
  setContent(content: string) { if (this._destroyed) return; this.opts.content = content; this.bodyEl.textContent = content; }
  setTitle(title: string) { if (this._destroyed) return; this.opts.title = title; (this.panelEl.querySelector(".dr-title") as HTMLElement)!.textContent = title; if (title) this.panelEl.setAttribute("aria-label", title); }
  setProperty(name: string, value: unknown) {
    if (this._destroyed) return;
    if (name === "side") { this.panelEl.classList.remove(`dr-side-${this.opts.side}`); this.opts.side = value as DrawerSide; this.panelEl.classList.add(`dr-side-${this.opts.side}`); this.applySize(this.panelEl); }
    else if (name === "size") { this.opts.size = Number(value); this.applySize(this.panelEl); }
    else if (name === "showOverlay") { this.opts.showOverlay = !!value; if (this._open && this.opts.showOverlay) this.overlayEl.classList.add("dr-open"); else this.overlayEl.classList.remove("dr-open"); }
    else if (name === "closeOnOverlayClick") this.opts.closeOnOverlayClick = !!value;
    else if (name === "closeOnEscape") this.opts.closeOnEscape = !!value;
    else if (name === "title") this.setTitle(value as string);
    else if (name === "content") this.setContent(value as string);
    else if (name === "open") { if (value) this.open("programmatic"); else this.close("programmatic"); return; }
    else return;
  }
  on(event: string, handler: DrawerHandler) { if (!this.listeners.has(event)) this.listeners.set(event, new Set()); this.listeners.get(event)!.add(handler); }
  off(event: string, handler: DrawerHandler) { this.listeners.get(event)?.delete(handler); }
  private emit(event: string, payload: DrawerEventPayload) { const set = this.listeners.get(event); if (!set) return; const p = { ...payload, type: event }; for (const h of set) { try { h(p); } catch (e) { console.error(e); } } }
  destroy() { if (this._destroyed) return; this._destroyed = true; if (this.keydownHandler) document.removeEventListener("keydown", this.keydownHandler); this.listeners.clear(); this.container.innerHTML = ""; }
}
