export type ScrollOrientation = "vertical" | "horizontal" | "both";
export type ScrollbarMode = "auto" | "always" | "hidden" | "hover";
export type ScrollLayoutOptions = { orientation?: ScrollOrientation; scrollbar?: ScrollbarMode; maxHeight?: number; minHeight?: number; showShadow?: boolean; };
const STYLE_ID = "scroll-layout-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style"); el.id = STYLE_ID;
  el.textContent = `.sl-root{--sl-bg:transparent;--sl-border:#383343;--sl-shadow:rgba(0,0,0,.3);font-family:inherit;position:relative;overflow:auto;background:var(--sl-bg)}.sl-root.sl-shadow-top{box-shadow:inset 0 8px 6px -6px var(--sl-shadow)}.sl-root.sl-shadow-bottom{box-shadow:inset 0 -8px 6px -6px var(--sl-shadow)}.sl-root::-webkit-scrollbar{width:8px;height:8px}.sl-root::-webkit-scrollbar-track{background:transparent}.sl-root::-webkit-scrollbar-thumb{background:var(--sl-border);border-radius:999px;border:2px solid transparent;background-clip:padding-box}.sl-root::-webkit-scrollbar-thumb:hover{background:#B8B2CA;background-clip:padding-box}.sl-root.sl-scrollbar-hidden::-webkit-scrollbar{display:none}.sl-root.sl-scrollbar-hidden{scrollbar-width:none;-ms-overflow-style:none}.sl-root.sl-scrollbar-hover::-webkit-scrollbar-thumb{background:transparent}.sl-root.sl-scrollbar-hover:hover::-webkit-scrollbar-thumb{background:var(--sl-border);background-clip:padding-box}.sl-root{scrollbar-width:thin;scrollbar-color:var(--sl-border) transparent}.sl-root.sl-scrollbar-hidden{scrollbar-width:none}.sl-content{padding:12px}.sl-orientation-horizontal{overflow-y:hidden;overflow-x:auto}.sl-orientation-vertical{overflow-y:auto;overflow-x:hidden}.sl-orientation-both{overflow:auto}`;
  document.head.appendChild(el);
}
export class ScrollLayout {
  private container: HTMLElement; private root!: HTMLElement; private contentEl!: HTMLElement;
  private opts: Required<ScrollLayoutOptions>; private _destroyed = false; private scrollListener: (() => void) | null = null;
  constructor(container: HTMLElement, options: ScrollLayoutOptions = {}) {
    this.container = container; injectStyles();
    this.opts = { orientation: options.orientation ?? "vertical", scrollbar: options.scrollbar ?? "auto", maxHeight: options.maxHeight ?? 0, minHeight: options.minHeight ?? 0, showShadow: options.showShadow ?? false };
    this.render();
  }
  private render() {
    if (this._destroyed) return;
    const root = document.createElement("div"); root.className = `sl-root sl-orientation-${this.opts.orientation} sl-scrollbar-${this.opts.scrollbar}`;
    if (this.opts.maxHeight > 0) root.style.maxHeight = `${this.opts.maxHeight}px`;
    if (this.opts.minHeight > 0) root.style.minHeight = `${this.opts.minHeight}px`;
    const content = document.createElement("div"); content.className = "sl-content";
    while (this.container.firstChild) content.appendChild(this.container.firstChild);
    root.appendChild(content); this.container.innerHTML = ""; this.container.appendChild(root);
    this.root = root; this.contentEl = content;
    if (this.opts.showShadow) { this.updateShadows(); this.scrollListener = () => this.updateShadows(); root.addEventListener("scroll", this.scrollListener); }
  }
  private updateShadows() { if (!this.root) return; const { scrollTop, scrollHeight, clientHeight } = this.root; this.root.classList.toggle("sl-shadow-top", scrollTop > 4); this.root.classList.toggle("sl-shadow-bottom", scrollTop + clientHeight < scrollHeight - 4); }
  scrollToTop() { this.root?.scrollTo({ top: 0, behavior: "smooth" }); }
  scrollToBottom() { this.root?.scrollTo({ top: this.root.scrollHeight, behavior: "smooth" }); }
  getContentEl() { return this.contentEl; }
  setProperty(name: string, value: unknown) { if (this._destroyed) return; if (name === "orientation") this.opts.orientation = value as ScrollOrientation; else if (name === "scrollbar") this.opts.scrollbar = value as ScrollbarMode; else if (name === "maxHeight") this.opts.maxHeight = Number(value); else if (name === "minHeight") this.opts.minHeight = Number(value); else if (name === "showShadow") this.opts.showShadow = !!value; else return; this.render(); }
  destroy() { if (this._destroyed) return; this._destroyed = true; if (this.scrollListener) this.root?.removeEventListener("scroll", this.scrollListener); this.container.innerHTML = ""; }
}
