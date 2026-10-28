export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "accent";
export type BadgeSize = "sm" | "md" | "lg";
export type BadgeItem = { id: string; label: string; variant?: BadgeVariant; dot?: boolean; removable?: boolean; icon?: string; };
export type BadgeOptions = { items?: BadgeItem[]; size?: BadgeSize; grouping?: boolean; };
const STYLE_ID = "badge-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style"); el.id = STYLE_ID;
  el.textContent = `.bdg-root{--bdg-text:#F4F1FF;--bdg-muted:#B8B2CA;--bdg-accent:#D9FF66;--bdg-ok:#8FE3A5;--bdg-warn:#FFD36B;--bdg-danger:#FF858B;--bdg-info:#7DB8E8;--bdg-border:#383343;--bdg-surface:#2A2238;font-family:inherit;display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center}.bdg-badge{display:inline-flex;align-items:center;gap:5px;padding:0 8px;border-radius:999px;border:1px solid var(--bdg-border);background:var(--bdg-surface);color:var(--bdg-text);font-weight:600;white-space:nowrap;user-select:none}.bdg-size-sm{font-size:9px;height:18px;padding:0 6px}.bdg-size-md{font-size:11px;height:22px;padding:0 8px}.bdg-size-lg{font-size:13px;height:28px;padding:0 10px}.bdg-dot{width:6px;height:6px;border-radius:999px;flex:0 0 auto;background:var(--bdg-muted)}.bdg-variant-default .bdg-dot{background:var(--bdg-muted)}.bdg-variant-success{color:var(--bdg-ok);border-color:color-mix(in srgb,var(--bdg-ok) 40%,transparent)}.bdg-variant-success .bdg-dot{background:var(--bdg-ok)}.bdg-variant-warning{color:var(--bdg-warn);border-color:color-mix(in srgb,var(--bdg-warn) 40%,transparent)}.bdg-variant-warning .bdg-dot{background:var(--bdg-warn)}.bdg-variant-danger{color:var(--bdg-danger);border-color:color-mix(in srgb,var(--bdg-danger) 40%,transparent)}.bdg-variant-danger .bdg-dot{background:var(--bdg-danger)}.bdg-variant-info{color:var(--bdg-info);border-color:color-mix(in srgb,var(--bdg-info) 40%,transparent)}.bdg-variant-info .bdg-dot{background:var(--bdg-info)}.bdg-variant-accent{color:var(--bdg-accent);border-color:color-mix(in srgb,var(--bdg-accent) 40%,transparent)}.bdg-variant-accent .bdg-dot{background:var(--bdg-accent)}.bdg-remove{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:none;background:transparent;color:inherit;cursor:pointer;padding:0;opacity:.6;border-radius:999px;flex:0 0 auto}.bdg-remove:hover{opacity:1}.bdg-remove svg{width:10px;height:10px}`;
  document.head.appendChild(el);
}
const ICON_X = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;
export class Badge {
  private container: HTMLElement; private root!: HTMLElement; private opts: Required<BadgeOptions>;
  private items: BadgeItem[]; private _destroyed = false;
  private listeners = new Map<string, Set<(p: { type?: string; itemId?: string }) => void>>();
  constructor(container: HTMLElement, options: BadgeOptions = {}) {
    this.container = container; injectStyles();
    this.opts = { items: options.items ?? [], size: options.size ?? "md", grouping: options.grouping ?? true };
    this.items = (this.opts.items as BadgeItem[]).map(it => ({ ...it })); this.render();
  }
  private render() {
    if (this._destroyed) return; const root = document.createElement("div"); root.className = "bdg-root";
    for (const item of this.items) root.appendChild(this.renderBadge(item));
    this.container.innerHTML = ""; this.container.appendChild(root); this.root = root;
  }
  private renderBadge(item: BadgeItem) {
    const el = document.createElement("span"); el.className = `bdg-badge bdg-size-${this.opts.size} bdg-variant-${item.variant ?? "default"}`; el.setAttribute("data-badge-id", item.id);
    if (item.dot) { const d = document.createElement("span"); d.className = "bdg-dot"; el.appendChild(d); }
    const label = document.createElement("span"); label.textContent = item.label; el.appendChild(label);
    if (item.removable) { const btn = document.createElement("button"); btn.type = "button"; btn.className = "bdg-remove"; btn.setAttribute("aria-label", `Remove ${item.label}`); btn.innerHTML = ICON_X; btn.addEventListener("click", () => this.remove(item.id)); el.appendChild(btn); }
    return el;
  }
  remove(itemId: string) { if (this._destroyed) return; const idx = this.items.findIndex(it => it.id === itemId); if (idx < 0) return; this.items.splice(idx, 1); this.render(); this.emit("remove", { itemId }); }
  add(item: BadgeItem) { if (this._destroyed) return; this.items.push({ ...item }); this.render(); this.emit("add", { itemId: item.id }); }
  getItems() { return this.items.map(it => ({ ...it })); }
  setItems(items: BadgeItem[]) { if (this._destroyed) return; this.items = items.map(it => ({ ...it })); this.render(); }
  setProperty(name: string, value: unknown) { if (this._destroyed) return; if (name === "size") this.opts.size = value as BadgeSize; else if (name === "grouping") this.opts.grouping = !!value; else if (name === "items") { this.setItems(value as BadgeItem[]); return; } else return; this.render(); }
  on(event: string, handler: (p: { type?: string; itemId?: string }) => void) { if (!this.listeners.has(event)) this.listeners.set(event, new Set()); this.listeners.get(event)!.add(handler); }
  off(event: string, handler: (p: { type?: string; itemId?: string }) => void) { this.listeners.get(event)?.delete(handler); }
  private emit(event: string, payload: { type?: string; itemId?: string }) { const set = this.listeners.get(event); if (!set) return; const p = { ...payload, type: event }; for (const h of set) { try { h(p); } catch (e) { console.error(e); } } }
  destroy() { if (this._destroyed) return; this._destroyed = true; this.listeners.clear(); this.container.innerHTML = ""; }
}
