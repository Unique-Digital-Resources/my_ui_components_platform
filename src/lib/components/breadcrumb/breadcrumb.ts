/**
 * Breadcrumb — a navigation trail component (vanilla TypeScript).
 *
 * Displays a hierarchical trail of items (e.g. Home / Projects / Web App /
 * Settings) with separators between them. Supports:
 *
 *   - Generic item records with stable identifiers.
 *   - Optional per-item icon, href, and disabled state.
 *   - Configurable separator (chevron default, or slash, or custom).
 *   - Max-items collapse: when the trail exceeds maxItems, the middle items
 *     collapse into an overflow menu (the first and last items stay visible).
 *   - Single selection (the "current" page is the last item by convention,
 *     marked with aria-current="page").
 *   - Keyboard navigation: Tab between items, Enter/Space to activate,
 *     ArrowLeft/Right to move focus between items, Escape to close the
 *     overflow menu.
 *   - Semantic events: item_selected, item_activated, overflow_toggled.
 *
 * Architecture: single-file DOM-based renderer with scoped CSS (`.crumb-`
 * prefix). The component owns a local copy of items; the host application is
 * notified of clicks/activations through events and may navigate accordingly.
 *
 * The breadcrumb is independent of routing — it emits item identifiers and
 * lets the host decide what to do. It does not push URL changes itself.
 */

// ---- Public types ----

export type CrumbSeparator = "chevron" | "slash" | "arrow" | "dot";

export interface BreadcrumbItem {
  id: string;
  label: string;
  /** Optional Lucide-style icon name (rendered as an inline SVG if known). */
  icon?: string;
  /** Optional href. If present, the item renders as an <a>; otherwise a <button>. */
  href?: string;
  /** Optional disabled state. Disabled items are not clickable or focusable. */
  disabled?: boolean;
  [key: string]: unknown;
}

export interface BreadcrumbOptions {
  items?: BreadcrumbItem[];
  separator?: CrumbSeparator;
  /** Max visible items before the middle collapses into an overflow menu. 0 = no limit. */
  maxItems?: number;
  /** Show the overflow menu as a dropdown (default) or inline expanded. */
  overflowMode?: "dropdown" | "inline";
  /** Show per-item icons when present. */
  showIcons?: boolean;
  /** Mark the last item as the current page (aria-current="page"). */
  markCurrent?: boolean;
  /** Visual density. */
  density?: "compact" | "comfortable" | "spacious";
  /** Read-only mode: items are not clickable, just a static trail. */
  readOnly?: boolean;
  /** Disabled state for the whole component. */
  disabled?: boolean;
}

export interface BreadcrumbEventPayload {
  type?: string;
  itemId?: string | null;
  previousItemId?: string | null;
  item?: BreadcrumbItem | null;
  source?: "pointer" | "keyboard" | "programmatic";
  overflowOpen?: boolean;
}

export type BreadcrumbHandler = (payload: BreadcrumbEventPayload) => void;

// ---- Constants ----

const STYLE_ID = "breadcrumb-styles";

// ---- Icon helpers (inline SVG strings) ----

const ICON_CHEVRON_RIGHT = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>`;
const ICON_SLASH = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 3l6 10"/></svg>`;
const ICON_ARROW_RIGHT = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M8 3l5 5-5 5"/></svg>`;
const ICON_DOT = `<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="1.5"/></svg>`;
const ICON_OVERFLOW = `<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg>`;
const ICON_HOME = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l6-5 6 5v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7z"/><path d="M6 15v-5h4v5"/></svg>`;
const ICON_FOLDER = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4a1 1 0 0 1 1-1h3l2 2h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z"/></svg>`;
const ICON_FILE = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4z"/><path d="M9 2v4h4"/></svg>`;
const ICON_SETTINGS = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"/></svg>`;
const ICON_USER = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 3-5 6-5s6 2 6 5"/></svg>`;

const ICON_MAP: Record<string, string> = {
  home: ICON_HOME,
  folder: ICON_FOLDER,
  file: ICON_FILE,
  settings: ICON_SETTINGS,
  user: ICON_USER,
};

function iconFor(name?: string): string | null {
  if (!name) return null;
  return ICON_MAP[name] ?? null;
}

function separatorSvg(sep: CrumbSeparator): string {
  switch (sep) {
    case "slash": return ICON_SLASH;
    case "arrow": return ICON_ARROW_RIGHT;
    case "dot": return ICON_DOT;
    case "chevron":
    default: return ICON_CHEVRON_RIGHT;
  }
}

// ---- Style injection (scoped CSS, .crumb- prefix) ----

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.crumb-nav {
  --cb-bg: transparent;
  --cb-surface: #211A30;
  --cb-surface-2: #2A2238;
  --cb-surface-3: #342348;
  --cb-border: #383343;
  --cb-text: #F4F1FF;
  --cb-muted: #B8B2CA;
  --cb-accent: #D9FF66;
  --cb-accent-hover: #C8F34F;
  --cb-danger: #FF858B;
  --cb-radius: 6px;
  font-family: inherit;
  color: var(--cb-text);
  background: var(--cb-bg);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  min-height: 32px;
  width: 100%;
  box-sizing: border-box;
  font-size: 13px;
  line-height: 1.4;
}
.crumb-nav * { box-sizing: border-box; }
.crumb-nav.crumb-disabled { opacity: 0.55; pointer-events: none; }
.crumb-nav.crumb-readonly .crumb-item { cursor: default; }

.crumb-nav.crumb-density-compact { font-size: 12px; min-height: 28px; }
.crumb-nav.crumb-density-compact .crumb-item { padding: 2px 6px; }
.crumb-nav.crumb-density-compact .crumb-icon { width: 13px; height: 13px; }

.crumb-nav.crumb-density-comfortable { font-size: 13px; min-height: 32px; }
.crumb-nav.crumb-density-comfortable .crumb-item { padding: 4px 8px; }
.crumb-nav.crumb-density-comfortable .crumb-icon { width: 14px; height: 14px; }

.crumb-nav.crumb-density-spacious { font-size: 14px; min-height: 40px; }
.crumb-nav.crumb-density-spacious .crumb-item { padding: 6px 10px; }
.crumb-nav.crumb-density-spacious .crumb-icon { width: 16px; height: 16px; }

.crumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
}

.crumb-item-wrapper {
  display: flex;
  align-items: center;
  gap: 0;
}

.crumb-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  color: var(--cb-muted);
  background: transparent;
  border: none;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
  outline: none;
  transition: color 120ms ease, background 120ms ease;
  white-space: nowrap;
}
.crumb-item:hover {
  color: var(--cb-text);
  background: var(--cb-surface-2);
}
.crumb-item:focus-visible {
  color: var(--cb-text);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--cb-accent) 40%, transparent);
}
.crumb-item.crumb-current {
  color: var(--cb-text);
  font-weight: 600;
  cursor: default;
  pointer-events: none;
}
.crumb-item.crumb-current:hover {
  background: transparent;
}
.crumb-item.crumb-disabled-item {
  color: var(--cb-muted);
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.crumb-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  opacity: 0.7;
}
.crumb-icon svg { width: 100%; height: 100%; }
.crumb-current .crumb-icon { opacity: 1; color: var(--cb-accent); }

.crumb-label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crumb-separator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--cb-muted);
  opacity: 0.5;
  flex: 0 0 auto;
  user-select: none;
}
.crumb-separator svg { width: 100%; height: 100%; }

/* Overflow button + dropdown */
.crumb-overflow {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.crumb-overflow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: var(--cb-muted);
  cursor: pointer;
  outline: none;
  transition: color 120ms ease, background 120ms ease;
}
.crumb-overflow-btn:hover {
  color: var(--cb-text);
  background: var(--cb-surface-2);
}
.crumb-overflow-btn:focus-visible {
  color: var(--cb-text);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--cb-accent) 40%, transparent);
}
.crumb-overflow-btn.crumb-open {
  color: var(--cb-accent);
  background: color-mix(in srgb, var(--cb-accent) 8%, transparent);
}
.crumb-overflow-btn svg { width: 16px; height: 16px; }

.crumb-overflow-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 180px;
  background: var(--cb-surface);
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius);
  box-shadow: 0 12px 32px -8px rgba(0,0,0,0.6);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  z-index: 100;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.crumb-overflow-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: var(--cb-text);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  width: 100%;
  outline: none;
  transition: background 120ms ease;
}
.crumb-overflow-item:hover, .crumb-overflow-item:focus-visible {
  background: var(--cb-surface-3);
}
.crumb-overflow-item.crumb-disabled-item {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.crumb-overflow-item .crumb-icon {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}
.crumb-overflow-item .crumb-label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crumb-empty {
  color: var(--cb-muted);
  font-style: italic;
  font-size: 12px;
  padding: 4px 8px;
}

@media (prefers-reduced-motion: reduce) {
  .crumb-item, .crumb-overflow-btn { transition: none; }
}
`;
  document.head.appendChild(el);
}

// ---- Utilities ----

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ---- Component ----

export class Breadcrumb {
  private container: HTMLElement;
  private root!: HTMLElement;
  private opts: Required<BreadcrumbOptions>;
  private items: BreadcrumbItem[];
  private selectedItemId: string | null = null;
  private listeners = new Map<string, Set<BreadcrumbHandler>>();
  private _destroyed = false;
  private overflowOpen = false;
  private overflowMenuEl: HTMLElement | null = null;
  private outsideClickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(container: HTMLElement, options: BreadcrumbOptions = {}) {
    this.container = container;
    injectStyles();
    this.opts = {
      items: options.items ?? [],
      separator: options.separator ?? "chevron",
      maxItems: options.maxItems ?? 0,
      overflowMode: options.overflowMode ?? "dropdown",
      showIcons: options.showIcons ?? true,
      markCurrent: options.markCurrent ?? true,
      density: options.density ?? "comfortable",
      readOnly: options.readOnly ?? false,
      disabled: options.disabled ?? false,
    };
    this.items = (this.opts.items as BreadcrumbItem[]).map((it) => ({ ...it }));
    // Default selection: the last item (current page)
    if (this.items.length > 0 && this.opts.markCurrent) {
      this.selectedItemId = this.items[this.items.length - 1].id;
    }
    this.render();
  }

  // ---- Rendering ----

  private render(): void {
    if (this._destroyed) return;
    this.closeOverflow();

    const root = document.createElement("nav");
    root.className = "crumb-nav";
    root.classList.add(`crumb-density-${this.opts.density}`);
    root.setAttribute("aria-label", "Breadcrumb");
    if (this.opts.readOnly) root.classList.add("crumb-readonly");
    if (this.opts.disabled) root.classList.add("crumb-disabled");

    if (this.items.length === 0) {
      const empty = document.createElement("span");
      empty.className = "crumb-empty";
      empty.textContent = "No items";
      root.appendChild(empty);
      this.container.innerHTML = "";
      this.container.appendChild(root);
      this.root = root;
      return;
    }

    const list = document.createElement("ol");
    list.className = "crumb-list";

    // Determine which items to show. If maxItems > 0 and the trail is longer,
    // collapse the middle items into an overflow menu.
    const { visible, collapsed } = this.computeVisibility();

    visible.forEach((item, idx) => {
      const li = document.createElement("li");
      li.className = "crumb-item-wrapper";
      li.setAttribute("data-item-id", item.id);

      // Insert overflow button before the second visible item (after the first)
      if (idx === 1 && collapsed.length > 0) {
        const overflowEl = this.renderOverflow(collapsed);
        li.appendChild(overflowEl);
        const sep = this.renderSeparator();
        li.appendChild(sep);
      }

      const itemEl = this.renderItem(item);
      li.appendChild(itemEl);

      // Separator after every item except the last
      if (idx < visible.length - 1) {
        const sep = this.renderSeparator();
        li.appendChild(sep);
      }

      list.appendChild(li);
    });

    root.appendChild(list);
    this.container.innerHTML = "";
    this.container.appendChild(root);
    this.root = root;
  }

  /**
   * Compute which items are visible and which are collapsed into the overflow
   * menu. When maxItems is 0, all items are visible. Otherwise, the first and
   * last items are always visible; the middle items collapse if the total
   * exceeds maxItems.
   */
  private computeVisibility(): { visible: BreadcrumbItem[]; collapsed: BreadcrumbItem[] } {
    const total = this.items.length;
    const max = this.opts.maxItems;
    if (max <= 0 || total <= max) {
      return { visible: [...this.items], collapsed: [] };
    }
    // Always show the first and last. Collapse the middle.
    const first = this.items[0];
    const last = this.items[total - 1];
    const middle = this.items.slice(1, total - 1);
    return { visible: [first, last], collapsed: middle };
  }

  private renderItem(item: BreadcrumbItem): HTMLElement {
    const isCurrent = this.opts.markCurrent && item.id === this.selectedItemId && this.items[this.items.length - 1]?.id === item.id;
    const isDisabled = item.disabled || this.opts.disabled;

    let el: HTMLElement;
    if (item.href && !this.opts.readOnly && !isCurrent && !isDisabled) {
      el = document.createElement("a");
      (el as HTMLAnchorElement).href = item.href;
    } else {
      el = document.createElement("button");
      (el as HTMLButtonElement).type = "button";
    }
    el.className = "crumb-item";
    if (isCurrent) {
      el.classList.add("crumb-current");
      el.setAttribute("aria-current", "page");
    }
    if (isDisabled) {
      el.classList.add("crumb-disabled-item");
      el.setAttribute("aria-disabled", "true");
      if (el.tagName === "BUTTON") (el as HTMLButtonElement).disabled = true;
    }
    el.setAttribute("data-item-id", item.id);

    if (isCurrent) {
      el.setAttribute("tabindex", "-1");
    } else if (isDisabled || this.opts.readOnly) {
      el.setAttribute("tabindex", "-1");
    } else {
      el.setAttribute("tabindex", "0");
    }

    // Icon
    if (this.opts.showIcons) {
      const iconSvg = iconFor(item.icon);
      if (iconSvg) {
        const iconEl = document.createElement("span");
        iconEl.className = "crumb-icon";
        iconEl.innerHTML = iconSvg;
        el.appendChild(iconEl);
      }
    }

    // Label
    const label = document.createElement("span");
    label.className = "crumb-label";
    label.textContent = item.label;
    el.appendChild(label);

    // Interactions
    if (!isCurrent && !isDisabled && !this.opts.readOnly) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        this.selectItem(item.id, "pointer");
        this.emit("item_activated", { itemId: item.id, item, source: "pointer" });
      });
      el.addEventListener("keydown", (e) => this.onItemKeyDown(e, item));
      el.addEventListener("focus", () => {
        // Select on focus for keyboard nav
      });
    }

    return el;
  }

  private renderSeparator(): HTMLElement {
    const sep = document.createElement("span");
    sep.className = "crumb-separator";
    sep.setAttribute("aria-hidden", "true");
    sep.innerHTML = separatorSvg(this.opts.separator);
    return sep;
  }

  private renderOverflow(collapsed: BreadcrumbItem[]): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "crumb-overflow";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "crumb-overflow-btn";
    btn.setAttribute("aria-label", `Show ${collapsed.length} hidden items`);
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = ICON_OVERFLOW;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleOverflow(collapsed, btn, wrapper);
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.toggleOverflow(collapsed, btn, wrapper);
      } else if (e.key === "Escape" && this.overflowOpen) {
        this.closeOverflow();
        btn.focus();
      }
    });

    wrapper.appendChild(btn);
    return wrapper;
  }

  private toggleOverflow(collapsed: BreadcrumbItem[], btn: HTMLButtonElement, wrapper: HTMLElement): void {
    if (this.overflowOpen) {
      this.closeOverflow();
      return;
    }
    this.openOverflow(collapsed, btn, wrapper);
  }

  private openOverflow(collapsed: BreadcrumbItem[], btn: HTMLButtonElement, wrapper: HTMLElement): void {
    if (this._destroyed) return;
    this.closeOverflow();

    const menu = document.createElement("div");
    menu.className = "crumb-overflow-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Hidden breadcrumb items");

    collapsed.forEach((item) => {
      const itemBtn = document.createElement("button");
      itemBtn.type = "button";
      itemBtn.className = "crumb-overflow-item";
      itemBtn.setAttribute("role", "menuitem");
      itemBtn.setAttribute("data-item-id", item.id);
      if (item.disabled) {
        itemBtn.classList.add("crumb-disabled-item");
        itemBtn.setAttribute("aria-disabled", "true");
        itemBtn.disabled = true;
      } else {
        itemBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.closeOverflow();
          this.selectItem(item.id, "pointer");
          this.emit("item_activated", { itemId: item.id, item, source: "pointer" });
        });
      }

      if (this.opts.showIcons) {
        const iconSvg = iconFor(item.icon);
        if (iconSvg) {
          const iconEl = document.createElement("span");
          iconEl.className = "crumb-icon";
          iconEl.innerHTML = iconSvg;
          itemBtn.appendChild(iconEl);
        }
      }

      const label = document.createElement("span");
      label.className = "crumb-label";
      label.textContent = item.label;
      itemBtn.appendChild(label);

      menu.appendChild(itemBtn);
    });

    wrapper.appendChild(menu);
    this.overflowMenuEl = menu;
    this.overflowOpen = true;
    btn.classList.add("crumb-open");
    btn.setAttribute("aria-expanded", "true");

    // Outside-click to close
    this.outsideClickHandler = (e: MouseEvent) => {
      if (!wrapper.contains(e.target as Node)) {
        this.closeOverflow();
        btn.focus();
      }
    };
    setTimeout(() => {
      document.addEventListener("click", this.outsideClickHandler!);
    }, 0);

    this.emit("overflow_toggled", { overflowOpen: true, source: "pointer" });
  }

  private closeOverflow(): void {
    if (this.overflowMenuEl) {
      this.overflowMenuEl.remove();
      this.overflowMenuEl = null;
    }
    if (this.outsideClickHandler) {
      document.removeEventListener("click", this.outsideClickHandler);
      this.outsideClickHandler = null;
    }
    if (this.overflowOpen) {
      this.overflowOpen = false;
      const btn = this.root?.querySelector(".crumb-overflow-btn");
      if (btn) {
        btn.classList.remove("crumb-open");
        btn.setAttribute("aria-expanded", "false");
      }
      this.emit("overflow_toggled", { overflowOpen: false, source: "programmatic" });
    }
  }

  // ---- Keyboard ----

  private onItemKeyDown(e: KeyboardEvent, item: BreadcrumbItem): void {
    if (this.opts.readOnly || this.opts.disabled) return;
    let handled = true;
    switch (e.key) {
      case "Enter":
      case " ":
        this.selectItem(item.id, "keyboard");
        this.emit("item_activated", { itemId: item.id, item, source: "keyboard" });
        break;
      case "ArrowRight":
        this.moveFocus(1);
        break;
      case "ArrowLeft":
        this.moveFocus(-1);
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  }

  private moveFocus(dir: 1 | -1): void {
    const items = Array.from(this.root.querySelectorAll<HTMLElement>(".crumb-item[tabindex='0']"));
    if (items.length === 0) return;
    const current = document.activeElement as HTMLElement;
    const idx = items.indexOf(current);
    const nextIdx = clamp(idx + dir, 0, items.length - 1);
    items[nextIdx]?.focus();
  }

  // ---- Selection ----

  selectItem(itemId: string | null, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    const prev = this.selectedItemId;
    if (itemId !== null && !this.items.find((it) => it.id === itemId)) return;
    this.selectedItemId = itemId;
    if (prev !== itemId) {
      this.emit("item_selected", { itemId, previousItemId: prev, source });
    }
    // Re-render to update the current-page marker (only matters if markCurrent is true
    // and the selected item is the last one — but re-rendering is cheap and keeps the
    // state consistent).
    if (this.opts.markCurrent) this.render();
  }

  clearSelection(): void {
    this.selectItem(null, "programmatic");
  }

  getSelectedItem(): string | null {
    return this.selectedItemId;
  }

  // ---- Data accessors ----

  setItems(items: BreadcrumbItem[]): void {
    if (this._destroyed) return;
    this.items = items.map((it) => ({ ...it }));
    // Update default selection to the new last item
    if (this.items.length > 0 && this.opts.markCurrent) {
      this.selectedItemId = this.items[this.items.length - 1].id;
    } else {
      this.selectedItemId = null;
    }
    this.render();
  }

  getItems(): BreadcrumbItem[] {
    return this.items.map((it) => ({ ...it }));
  }

  // ---- Property setter ----

  setProperty(name: string, value: unknown): void {
    if (this._destroyed) return;
    switch (name) {
      case "separator":
        this.opts.separator = value as CrumbSeparator;
        break;
      case "maxItems":
        this.opts.maxItems = Number(value);
        break;
      case "overflowMode":
        this.opts.overflowMode = value as "dropdown" | "inline";
        break;
      case "showIcons":
        this.opts.showIcons = !!value;
        break;
      case "markCurrent":
        this.opts.markCurrent = !!value;
        break;
      case "density":
        this.opts.density = value as "compact" | "comfortable" | "spacious";
        break;
      case "readOnly":
        this.opts.readOnly = !!value;
        break;
      case "disabled":
        this.opts.disabled = !!value;
        break;
      case "items":
        this.setItems(value as BreadcrumbItem[]);
        return;
      default:
        return;
    }
    this.render();
  }

  // ---- Events ----

  on(event: string, handler: BreadcrumbHandler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: BreadcrumbHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, payload: BreadcrumbEventPayload): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const p = { ...payload, type: event };
    for (const h of set) {
      try { h(p); } catch (err) { console.error(`Breadcrumb handler error for ${event}:`, err); }
    }
  }

  // ---- Destroy ----

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.closeOverflow();
    this.listeners.clear();
    this.container.innerHTML = "";
  }
}
