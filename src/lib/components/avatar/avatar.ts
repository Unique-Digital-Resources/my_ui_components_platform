export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "circle" | "square" | "rounded";
export type AvatarStatus = "online" | "offline" | "away" | "busy";
export type AvatarItem = { id: string; name?: string; src?: string; initials?: string; color?: string; status?: AvatarStatus; };
export type AvatarOptions = { items?: AvatarItem[]; size?: AvatarSize; shape?: AvatarShape; showStatus?: boolean; max?: number; grouping?: boolean; };
const STYLE_ID = "avatar-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style"); el.id = STYLE_ID;
  el.textContent = `.av-root{--av-bg:#211A30;--av-border:#383343;--av-text:#F4F1FF;--av-muted:#B8B2CA;--av-accent:#D9FF66;--av-ok:#8FE3A5;--av-warn:#FFD36B;--av-danger:#FF858B;font-family:inherit;display:inline-flex;align-items:center}.av-group{display:flex;align-items:center}.av-avatar{position:relative;display:inline-flex;align-items:center;justify-content:center;background:var(--av-bg);border:2px solid var(--av-border);color:var(--av-text);font-weight:600;overflow:hidden;flex:0 0 auto;user-select:none}.av-group .av-avatar{margin-left:-8px}.av-group .av-avatar:first-child{margin-left:0}.av-avatar img{width:100%;height:100%;object-fit:cover}.av-size-xs{width:20px;height:20px;font-size:8px}.av-size-sm{width:28px;height:28px;font-size:10px}.av-size-md{width:36px;height:36px;font-size:12px}.av-size-lg{width:48px;height:48px;font-size:15px}.av-size-xl{width:64px;height:64px;font-size:20px}.av-shape-circle{border-radius:999px}.av-shape-square{border-radius:2px}.av-shape-rounded{border-radius:8px}.av-status{position:absolute;bottom:0;right:0;border:2px solid var(--av-bg);border-radius:999px}.av-size-xs .av-status{width:6px;height:6px}.av-size-sm .av-status{width:8px;height:8px}.av-size-md .av-status{width:10px;height:10px}.av-size-lg .av-status{width:12px;height:12px}.av-size-xl .av-status{width:14px;height:14px}.av-status-online{background:var(--av-ok)}.av-status-offline{background:var(--av-muted)}.av-status-away{background:var(--av-warn)}.av-status-busy{background:var(--av-danger)}.av-overflow{display:inline-flex;align-items:center;justify-content:center;background:var(--av-bg);border:2px solid var(--av-border);color:var(--av-muted);font-weight:600;margin-left:-8px;flex:0 0 auto}`;
  document.head.appendChild(el);
}
function getInitials(name: string) { if (!name) return "?"; const p = name.trim().split(/\s+/); if (p.length === 1) return p[0].slice(0, 2).toUpperCase(); return (p[0][0] + p[p.length - 1][0]).toUpperCase(); }
export class Avatar {
  private container: HTMLElement; private root!: HTMLElement; private opts: Required<AvatarOptions>;
  private items: AvatarItem[]; private _destroyed = false;
  constructor(container: HTMLElement, options: AvatarOptions = {}) {
    this.container = container; injectStyles();
    this.opts = { items: options.items ?? [], size: options.size ?? "md", shape: options.shape ?? "circle", showStatus: options.showStatus ?? true, max: options.max ?? 0, grouping: options.grouping ?? false };
    this.items = (this.opts.items as AvatarItem[]).map(it => ({ ...it })); this.render();
  }
  private render() {
    if (this._destroyed) return; const root = document.createElement("div"); root.className = "av-root";
    if (this.opts.grouping) root.classList.add("av-group");
    let items = this.items; let overflow = 0;
    if (this.opts.max > 0 && items.length > this.opts.max) { overflow = items.length - this.opts.max; items = items.slice(0, this.opts.max); }
    for (const item of items) root.appendChild(this.renderAvatar(item));
    if (overflow > 0) { const ov = document.createElement("div"); ov.className = `av-overflow av-size-${this.opts.size} av-shape-${this.opts.shape}`; ov.textContent = `+${overflow}`; root.appendChild(ov); }
    this.container.innerHTML = ""; this.container.appendChild(root); this.root = root;
  }
  private renderAvatar(item: AvatarItem) {
    const el = document.createElement("div"); el.className = `av-avatar av-size-${this.opts.size} av-shape-${this.opts.shape}`;
    el.setAttribute("data-avatar-id", item.id); el.setAttribute("title", item.name ?? item.id);
    if (item.color) el.style.background = item.color;
    if (item.src) { const img = document.createElement("img"); img.src = item.src; img.alt = item.name ?? item.id; img.onerror = () => { img.remove(); el.textContent = item.initials ?? getInitials(item.name ?? ""); }; el.appendChild(img); }
    else el.textContent = item.initials ?? getInitials(item.name ?? "");
    if (this.opts.showStatus && item.status) { const s = document.createElement("span"); s.className = `av-status av-status-${item.status}`; el.appendChild(s); }
    return el;
  }
  setItems(items: AvatarItem[]) { if (this._destroyed) return; this.items = items.map(it => ({ ...it })); this.render(); }
  setProperty(name: string, value: unknown) { if (this._destroyed) return; if (name === "size") this.opts.size = value as AvatarSize; else if (name === "shape") this.opts.shape = value as AvatarShape; else if (name === "showStatus") this.opts.showStatus = !!value; else if (name === "max") this.opts.max = Number(value); else if (name === "grouping") this.opts.grouping = !!value; else if (name === "items") { this.setItems(value as AvatarItem[]); return; } else return; this.render(); }
  destroy() { if (this._destroyed) return; this._destroyed = true; this.container.innerHTML = ""; }
}
