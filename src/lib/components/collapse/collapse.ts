export type CollapseItem = { id: string; title: string; content: string; icon?: string; disabled?: boolean; defaultOpen?: boolean; };
export type CollapseOptions = { items?: CollapseItem[]; accordion?: boolean; showIcons?: boolean; defaultOpenIds?: string[]; };
export type CollapseEventPayload = { type?: string; itemId?: string; openIds?: string[]; source?: "pointer" | "keyboard" | "programmatic"; };
export type CollapseHandler = (p: CollapseEventPayload) => void;
const STYLE_ID = "collapse-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style"); el.id = STYLE_ID;
  el.textContent = `.clp-root{--clp-surface:#211A30;--clp-surface-2:#2A2238;--clp-border:#383343;--clp-text:#F4F1FF;--clp-muted:#B8B2CA;--clp-accent:#D9FF66;--clp-radius:8px;font-family:inherit;color:var(--clp-text);display:flex;flex-direction:column;gap:6px;width:100%}.clp-item{border:1px solid var(--clp-border);border-radius:var(--clp-radius);overflow:hidden;background:var(--clp-surface)}.clp-trigger{display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;background:transparent;border:none;color:var(--clp-text);font:inherit;font-size:13px;font-weight:600;text-align:left;cursor:pointer;outline:none;transition:background .12s}.clp-trigger:hover{background:var(--clp-surface-2)}.clp-trigger:focus-visible{box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--clp-accent) 40%,transparent)}.clp-trigger.clp-disabled{opacity:.4;cursor:not-allowed;pointer-events:none}.clp-chevron{width:14px;height:14px;flex:0 0 auto;transition:transform .2s;color:var(--clp-muted)}.clp-chevron.clp-open{transform:rotate(90deg);color:var(--clp-accent)}.clp-icon{width:14px;height:14px;flex:0 0 auto;color:var(--clp-muted)}.clp-title{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.clp-content-wrap{max-height:0;overflow:hidden;transition:max-height .28s}.clp-content-wrap.clp-open{max-height:1000px}.clp-content{padding:0 14px 12px;font-size:12px;color:var(--clp-muted);line-height:1.5}@media(prefers-reduced-motion:reduce){.clp-chevron,.clp-content-wrap{transition:none}}`;
  document.head.appendChild(el);
}
const ICON_CHEVRON = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>`;
export class Collapse {
  private container: HTMLElement; private root!: HTMLDivElement; private opts: Required<CollapseOptions>;
  private items: CollapseItem[]; private openIds: Set<string>;
  private listeners = new Map<string, Set<CollapseHandler>>(); private _destroyed = false;
  private itemEls = new Map<string, { trigger: HTMLElement; contentWrap: HTMLElement; chevron: HTMLElement; }>();
  constructor(container: HTMLElement, options: CollapseOptions = {}) {
    this.container = container; injectStyles();
    this.opts = { items: options.items ?? [], accordion: options.accordion ?? false, showIcons: options.showIcons ?? true, defaultOpenIds: options.defaultOpenIds ?? [] };
    this.items = (this.opts.items as CollapseItem[]).map(it => ({ ...it }));
    this.openIds = new Set(this.opts.defaultOpenIds);
    for (const it of this.items) { if (it.defaultOpen) this.openIds.add(it.id); }
    this.render();
  }
  private render() {
    if (this._destroyed) return; this.itemEls.clear();
    const root = document.createElement("div"); root.className = "clp-root";
    for (const item of this.items) root.appendChild(this.renderItem(item));
    this.container.innerHTML = ""; this.container.appendChild(root); this.root = root;
  }
  private renderItem(item: CollapseItem) {
    const wrap = document.createElement("div"); wrap.className = "clp-item"; wrap.setAttribute("data-item-id", item.id);
    const trigger = document.createElement("button"); trigger.type = "button"; trigger.className = "clp-trigger";
    if (item.disabled) trigger.classList.add("clp-disabled");
    trigger.setAttribute("aria-expanded", String(this.openIds.has(item.id)));
    const chevron = document.createElement("span"); chevron.className = "clp-chevron";
    if (this.openIds.has(item.id)) chevron.classList.add("clp-open");
    chevron.innerHTML = ICON_CHEVRON; chevron.setAttribute("aria-hidden", "true"); trigger.appendChild(chevron);
    if (this.opts.showIcons && item.icon) { const icon = document.createElement("span"); icon.className = "clp-icon"; icon.textContent = item.icon; trigger.appendChild(icon); }
    const title = document.createElement("span"); title.className = "clp-title"; title.textContent = item.title; trigger.appendChild(title);
    const contentWrap = document.createElement("div"); contentWrap.className = "clp-content-wrap";
    if (this.openIds.has(item.id)) contentWrap.classList.add("clp-open");
    const content = document.createElement("div"); content.className = "clp-content"; content.textContent = item.content;
    contentWrap.appendChild(content);
    if (!item.disabled) { trigger.addEventListener("click", () => this.toggle(item.id, "pointer")); trigger.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.toggle(item.id, "keyboard"); } }); }
    wrap.appendChild(trigger); wrap.appendChild(contentWrap);
    this.itemEls.set(item.id, { trigger, contentWrap, chevron }); return wrap;
  }
  toggle(itemId: string, source: "pointer" | "keyboard" | "programmatic" = "programmatic") {
    if (this._destroyed) return; const item = this.items.find(it => it.id === itemId); if (!item || item.disabled) return;
    if (this.openIds.has(itemId)) this.openIds.delete(itemId); else { if (this.opts.accordion) this.openIds.clear(); this.openIds.add(itemId); }
    this.updateDom(); this.emit("toggle", { itemId, openIds: Array.from(this.openIds), source });
  }
  open(itemId: string) { if (this._destroyed) return; if (this.opts.accordion) this.openIds.clear(); this.openIds.add(itemId); this.updateDom(); this.emit("toggle", { itemId, openIds: Array.from(this.openIds), source: "programmatic" }); }
  close(itemId: string) { if (this._destroyed) return; this.openIds.delete(itemId); this.updateDom(); this.emit("toggle", { itemId, openIds: Array.from(this.openIds), source: "programmatic" }); }
  closeAll() { if (this._destroyed) return; this.openIds.clear(); this.updateDom(); this.emit("toggle", { openIds: [], source: "programmatic" }); }
  getOpenIds() { return Array.from(this.openIds); }
  private updateDom() { for (const [id, els] of this.itemEls) { const open = this.openIds.has(id); els.contentWrap.classList.toggle("clp-open", open); els.chevron.classList.toggle("clp-open", open); els.trigger.setAttribute("aria-expanded", String(open)); } }
  setItems(items: CollapseItem[]) { if (this._destroyed) return; this.items = items.map(it => ({ ...it })); this.openIds.clear(); for (const it of this.items) { if (it.defaultOpen) this.openIds.add(it.id); } this.render(); }
  setProperty(name: string, value: unknown) { if (this._destroyed) return; if (name === "accordion") this.opts.accordion = !!value; else if (name === "showIcons") this.opts.showIcons = !!value; else if (name === "items") { this.setItems(value as CollapseItem[]); return; } else return; this.render(); }
  on(event: string, handler: CollapseHandler) { if (!this.listeners.has(event)) this.listeners.set(event, new Set()); this.listeners.get(event)!.add(handler); }
  off(event: string, handler: CollapseHandler) { this.listeners.get(event)?.delete(handler); }
  private emit(event: string, payload: CollapseEventPayload) { const set = this.listeners.get(event); if (!set) return; const p = { ...payload, type: event }; for (const h of set) { try { h(p); } catch (e) { console.error(e); } } }
  destroy() { if (this._destroyed) return; this._destroyed = true; this.listeners.clear(); this.container.innerHTML = ""; }
}
