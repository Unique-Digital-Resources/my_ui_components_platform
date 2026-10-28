/**
 * ToggleGroup — a group of toggle buttons with selectable state, closable
 * buttons, drag-to-reorder, and dynamic add/remove (vanilla TypeScript).
 *
 * Each toggle button is a real DOM element managed internally by this class.
 * The button visuals (primary / secondary / outline variants, icon + text
 * support) mimic the platform's CustomButton look so the ToggleGroup is a
 * self-contained component — it does NOT import CustomButton.
 *
 * Public API:
 *   new ToggleGroup(container, options?)
 *   getItems(): ToggleButtonItem[]
 *   setItems(items): void
 *   addItem(item): void
 *   removeItem(id): void
 *   getSelected(): string[]
 *   setSelected(ids): void
 *   setMultiselect(on): void
 *   setClosable(on): void
 *   setReorderable(on): void
 *   setOrientation(orientation): void
 *   setVariant(variant): void
 *   setSize(size): void
 *   on(event: "change" | "reorder" | "close" | "select", handler): void
 *   off(event, handler): void
 *   destroy(): void
 *
 * Framework-independent. DOM-based. No React. No external dependencies.
 */

export type ToggleGroupOrientation = "horizontal" | "vertical";
export type ToggleGroupVariant = "primary" | "secondary" | "outline";
export type ToggleGroupSize = "sm" | "md" | "lg";

export interface ToggleButtonItem {
  id: string;
  label: string;
  /** SVG icon name from the built-in set, a data URI, or a raw SVG string. */
  icon?: string;
  selected?: boolean;
}

export interface ToggleGroupOptions {
  items?: ToggleButtonItem[];
  multiselect?: boolean;
  closable?: boolean;
  reorderable?: boolean;
  orientation?: ToggleGroupOrientation;
  variant?: ToggleGroupVariant;
  size?: ToggleGroupSize;
}

type ToggleHandler = (data: any) => void;

interface InternalItem {
  id: string;
  label: string;
  icon?: string;
  selected: boolean;
  el: HTMLElement;
  closeEl: HTMLElement | null;
  labelEl: HTMLElement;
  iconEl: HTMLElement | null;
}

// ---- Built-in icon set (inline SVG strings; sized via the wrapper class) ----

const BUILTIN_ICONS: Record<string, string> = {
  check: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
  x: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  plus: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
  star: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  circle: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>`,
  square: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
  heart: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>`,
  bolt: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  dot: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="4"/></svg>`,
  "arrow-right": `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  settings: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  folder: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
  file: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
  user: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  tag: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg>`,
  eye: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
  bell: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>`,
  search: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  home: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  bold: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>`,
  italic: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>`,
  underline: `<svg class="toggle-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/></svg>`,
};

const DEFAULT_ITEMS: ToggleButtonItem[] = [
  { id: "tg-bold", label: "Bold", icon: "bold", selected: true },
  { id: "tg-italic", label: "Italic", icon: "italic" },
  { id: "tg-underline", label: "Underline", icon: "underline" },
];

const STYLE_ID = "toggle-group-styles";

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.toggle-group {
  display: inline-flex;
  gap: 6px;
  font-family: var(--font-inter, inherit);
  --tg-focus-ring: rgba(217, 255, 102, 0.55);
}
.toggle-group--horizontal { flex-direction: row; align-items: center; }
.toggle-group--vertical { flex-direction: column; align-items: stretch; }

.toggle-group__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: 8px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--foreground);
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease, transform 80ms ease, opacity 120ms ease;
  position: relative;
  white-space: nowrap;
  touch-action: none; /* pointer-driven reorder */
  outline: none;
}
.toggle-group--vertical .toggle-group__item { justify-content: flex-start; }

.toggle-group__item--sm { height: 28px; font-size: 12px; padding: 0 10px; }
.toggle-group__item--md { height: 34px; font-size: 13px; padding: 0 12px; }
.toggle-group__item--lg { height: 40px; font-size: 14px; padding: 0 14px; }

/* Outline variant — default */
.toggle-group__item--outline {
  background: transparent;
  color: var(--foreground);
  border-color: var(--border);
}
.toggle-group__item--outline:hover {
  background: var(--accent);
  border-color: var(--muted-foreground);
}

/* Primary variant — lemon, dark text */
.toggle-group__item--primary {
  background: var(--brand-lemon);
  color: #17151D;
  border-color: var(--brand-lemon);
}
.toggle-group__item--primary:hover {
  background: var(--brand-lemon-hover);
  border-color: var(--brand-lemon-hover);
}

/* Secondary variant — deep violet strong, light text */
.toggle-group__item--secondary {
  background: var(--brand-purple-strong);
  color: var(--foreground);
  border-color: var(--brand-purple-strong);
}
.toggle-group__item--secondary:hover {
  background: var(--accent);
  border-color: var(--muted-foreground);
}

/* Selected state — lemon ring on every variant */
.toggle-group__item--selected.toggle-group__item--outline {
  background: color-mix(in srgb, var(--brand-lemon) 14%, transparent);
  border-color: var(--brand-lemon);
  color: var(--brand-lemon);
  box-shadow: 0 0 0 1px var(--brand-lemon);
}
.toggle-group__item--selected.toggle-group__item--primary {
  background: var(--brand-lemon-hover);
  border-color: var(--brand-lemon-hover);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-lemon) 40%, transparent);
}
.toggle-group__item--selected.toggle-group__item--secondary {
  background: var(--accent);
  border-color: var(--brand-lemon);
  color: var(--brand-lemon);
  box-shadow: 0 0 0 1px var(--brand-lemon);
}

/* Icon + label layout */
.toggle-group__icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  display: inline-block;
}
.toggle-group__label {
  font: inherit;
  color: inherit;
  white-space: nowrap;
}

/* Close button (when closable) */
.toggle-group__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 4px;
  margin-right: -2px;
  border-radius: 4px;
  cursor: pointer;
  color: currentColor;
  opacity: 0.55;
  background: transparent;
  border: none;
  padding: 0;
  transition: opacity 120ms ease, background-color 120ms ease;
}
.toggle-group__close:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 16%, transparent);
}
.toggle-group__close svg {
  width: 11px;
  height: 11px;
}

/* Drag-to-reorder state */
.toggle-group__item--dragging {
  opacity: 0.4;
  box-shadow: 0 6px 24px -8px rgba(0,0,0,0.5);
  z-index: 1;
  cursor: grabbing;
}
.toggle-group__item[aria-pressed="true"] { /* selector kept simple for SSR safety */ }

/* Keyboard focus */
.toggle-group__item:focus-visible {
  outline: 2px solid var(--brand-lemon);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .toggle-group__item { transition: none; }
}
`;
  document.head.appendChild(style);
}

/**
 * Render an icon string to HTML. Supports:
 *   - built-in icon name (e.g. "check")
 *   - "data:..." URI
 *   - raw SVG string starting with "<svg"
 *   - any other string is treated as a built-in name fallback (empty if not found)
 */
function renderIcon(icon: string | undefined): string {
  if (!icon || typeof icon !== "string") return "";
  const trimmed = icon.trim();
  if (BUILTIN_ICONS[icon]) return BUILTIN_ICONS[icon];
  if (trimmed.startsWith("<svg")) {
    // Ensure the SVG carries our icon class.
    if (/class=["']/.test(trimmed)) {
      return trimmed.replace(/class=["']/, 'class="toggle-group__icon ');
    }
    return trimmed.replace(/<svg/, '<svg class="toggle-group__icon"');
  }
  if (trimmed.startsWith("data:")) {
    return `<img class="toggle-group__icon" src="${icon}" alt="" draggable="false" />`;
  }
  return "";
}

let _idCounter = 0;
function uniqueId(): string {
  _idCounter += 1;
  return `tg-item-${Date.now().toString(36)}-${_idCounter}`;
}

interface DragState {
  itemId: string;
  pointerId: number;
  startX: number;
  startY: number;
  started: boolean;
  target: HTMLElement;
}

export class ToggleGroup {
  private container: HTMLElement;
  private root: HTMLElement;
  private items: InternalItem[] = [];
  private multiselect: boolean = false;
  private closable: boolean = false;
  private reorderable: boolean = false;
  private orientation: ToggleGroupOrientation = "horizontal";
  private variant: ToggleGroupVariant = "outline";
  private size: ToggleGroupSize = "md";
  private listeners: Map<string, Set<ToggleHandler>> = new Map();
  private destroyed: boolean = false;
  private drag: DragState | null = null;
  // Set briefly after a drag ends to suppress the synthetic click that follows.
  private suppressClickUntil: number = 0;

  private _boundPointerMove: (e: PointerEvent) => void;
  private _boundPointerUp: (e: PointerEvent) => void;

  constructor(container: HTMLElement, options?: ToggleGroupOptions) {
    if (!container) throw new Error("ToggleGroup: container is required");
    this.container = container;
    injectStyles();

    const opts = options || {};
    this.multiselect = opts.multiselect ?? false;
    this.closable = opts.closable ?? false;
    this.reorderable = opts.reorderable ?? false;
    this.orientation = opts.orientation ?? "horizontal";
    this.variant = opts.variant ?? "outline";
    this.size = opts.size ?? "md";

    this.root = document.createElement("div");
    this.root.className = this._rootClass();
    this.root.setAttribute("role", "group");
    this.container.appendChild(this.root);

    const initialItems = opts.items && opts.items.length > 0 ? opts.items : DEFAULT_ITEMS;
    this._setItemsInternal(initialItems);

    this._boundPointerMove = this._onPointerMove.bind(this);
    this._boundPointerUp = this._onPointerUp.bind(this);

    if (typeof window !== "undefined") {
      window.addEventListener("pointermove", this._boundPointerMove, { passive: false });
      window.addEventListener("pointerup", this._boundPointerUp);
      window.addEventListener("pointercancel", this._boundPointerUp);
    }
  }

  // ---- Public API: items ----

  getItems(): ToggleButtonItem[] {
    return this.items.map((it) => ({
      id: it.id,
      label: it.label,
      icon: it.icon,
      selected: it.selected,
    }));
  }

  setItems(items: ToggleButtonItem[]): void {
    this._setItemsInternal(items);
    this._emitChange();
  }

  addItem(item: ToggleButtonItem): void {
    let normalized: ToggleButtonItem = { ...item };
    if (!normalized.id) normalized.id = uniqueId();
    if (this.items.some((i) => i.id === normalized.id)) {
      normalized.id = uniqueId();
    }
    if (normalized.selected && !this.multiselect) {
      for (const it of this.items) it.selected = false;
    }
    const internal = this._createItemElement(normalized);
    this.items.push(internal);
    this.root.appendChild(internal.el);
    this._emitChange();
  }

  removeItem(id: string): void {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const [removed] = this.items.splice(idx, 1);
    removed.el.remove();
    this._emitChange();
  }

  getSelected(): string[] {
    return this.items.filter((i) => i.selected).map((i) => i.id);
  }

  setSelected(ids: string[]): void {
    if (!this.multiselect) {
      const first = ids[0];
      for (const it of this.items) it.selected = first ? it.id === first : false;
    } else {
      const set = new Set(ids);
      for (const it of this.items) it.selected = set.has(it.id);
    }
    this._refreshAllItemClasses();
    this._emitChange();
  }

  // ---- Public API: options ----

  setMultiselect(on: boolean): void {
    this.multiselect = !!on;
    if (!this.multiselect) {
      let foundFirst = false;
      for (const it of this.items) {
        if (it.selected) {
          if (foundFirst) it.selected = false;
          else foundFirst = true;
        }
      }
      this._refreshAllItemClasses();
    }
    this._emitChange();
  }

  setClosable(on: boolean): void {
    this.closable = !!on;
    for (const it of this.items) {
      if (this.closable && !it.closeEl) {
        const c = this._buildCloseButton();
        this._wireCloseButton(c, it);
        it.el.appendChild(c);
        it.closeEl = c;
      } else if (!this.closable && it.closeEl) {
        it.closeEl.remove();
        it.closeEl = null;
      }
    }
  }

  setReorderable(on: boolean): void {
    this.reorderable = !!on;
  }

  setOrientation(orientation: ToggleGroupOrientation): void {
    this.orientation = orientation;
    this.root.className = this._rootClass();
  }

  setVariant(variant: ToggleGroupVariant): void {
    this.variant = variant;
    this._refreshAllItemClasses();
  }

  setSize(size: ToggleGroupSize): void {
    this.size = size;
    this._refreshAllItemClasses();
  }

  // ---- Public API: events ----

  on(event: "change" | "reorder" | "close" | "select", handler: ToggleHandler): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  off(event: string, handler: ToggleHandler): void {
    const set = this.listeners.get(event);
    if (set) set.delete(handler);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", this._boundPointerMove);
      window.removeEventListener("pointerup", this._boundPointerUp);
      window.removeEventListener("pointercancel", this._boundPointerUp);
    }
    this.listeners.clear();
    this.items = [];
    this.root.remove();
    this.drag = null;
  }

  // ---- Internals: rendering ----

  private _rootClass(): string {
    return ["toggle-group", `toggle-group--${this.orientation}`].join(" ");
  }

  private _itemClasses(selected: boolean): string {
    return [
      "toggle-group__item",
      `toggle-group__item--${this.size}`,
      `toggle-group__item--${this.variant}`,
      selected ? "toggle-group__item--selected" : "",
    ].filter(Boolean).join(" ");
  }

  private _setItemsInternal(items: ToggleButtonItem[]): void {
    for (const it of this.items) it.el.remove();
    this.items = [];

    let firstSelected: string | null = null;
    if (!this.multiselect) {
      for (const src of items) {
        if (src.selected && !firstSelected) firstSelected = src.id;
      }
    }

    for (const src of items) {
      const clone: ToggleButtonItem = {
        id: src.id || uniqueId(),
        label: src.label ?? "",
        icon: src.icon,
        selected: this.multiselect ? !!src.selected : src.id === firstSelected,
      };
      const internal = this._createItemElement(clone);
      this.items.push(internal);
      this.root.appendChild(internal.el);
    }
  }

  private _createItemElement(item: ToggleButtonItem): InternalItem {
    const el = document.createElement("div");
    el.className = this._itemClasses(!!item.selected);
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-pressed", item.selected ? "true" : "false");
    el.dataset.id = item.id;

    let iconEl: HTMLElement | null = null;
    if (item.icon) {
      const iconHtml = renderIcon(item.icon);
      if (iconHtml) {
        const wrapper = document.createElement("span");
        wrapper.style.display = "inline-flex";
        wrapper.innerHTML = iconHtml;
        const node = wrapper.firstElementChild as HTMLElement | null;
        if (node) {
          el.appendChild(node);
          iconEl = node;
        }
      }
    }

    const labelEl = document.createElement("span");
    labelEl.className = "toggle-group__label";
    labelEl.textContent = item.label;
    el.appendChild(labelEl);

    let closeEl: HTMLElement | null = null;
    if (this.closable) {
      closeEl = this._buildCloseButton();
      el.appendChild(closeEl);
    }

    const internal: InternalItem = {
      id: item.id,
      label: item.label,
      icon: item.icon,
      selected: !!item.selected,
      el,
      closeEl,
      labelEl,
      iconEl,
    };

    if (closeEl) this._wireCloseButton(closeEl, internal);

    el.addEventListener("pointerdown", (e) => this._onPointerDown(e, internal));
    el.addEventListener("click", (e) => {
      // Suppress the synthetic click that fires right after a drag.
      if (Date.now() < this.suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if ((e.target as HTMLElement).closest(".toggle-group__close")) return;
      this._handleSelect(internal.id);
    });
    el.addEventListener("keydown", (e) => this._onKeyDown(e, internal));

    return internal;
  }

  private _buildCloseButton(): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toggle-group__close";
    btn.setAttribute("aria-label", "Remove");
    btn.setAttribute("tabindex", "-1");
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    return btn;
  }

  private _wireCloseButton(btn: HTMLElement, it: InternalItem): void {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this._handleClose(it.id);
    });
  }

  private _refreshAllItemClasses(): void {
    for (const it of this.items) {
      it.el.className = this._itemClasses(it.selected);
      it.el.setAttribute("aria-pressed", it.selected ? "true" : "false");
    }
  }

  // ---- Internals: behavior ----

  private _handleSelect(id: string): void {
    const it = this.items.find((i) => i.id === id);
    if (!it) return;
    if (this.multiselect) {
      it.selected = !it.selected;
    } else {
      // Single-select: select this one, deselect others. If it's already the
      // only selected one, keep it selected (no toggle-off via click).
      for (const o of this.items) o.selected = false;
      it.selected = true;
    }
    this._refreshAllItemClasses();
    const payload = {
      selected: this.getSelected(),
      item: { id: it.id, label: it.label, icon: it.icon, selected: it.selected },
    };
    this._emit("select", payload);
    this._emitChange();
  }

  private _handleClose(id: string): void {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const [removed] = this.items.splice(idx, 1);
    removed.el.remove();
    this._emit("close", { id, items: this.getItems() });
    this._emitChange();
  }

  // ---- Internals: drag-to-reorder (pointer events) ----

  private _onPointerDown(e: PointerEvent, it: InternalItem): void {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".toggle-group__close")) return;
    this.drag = {
      itemId: it.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      target: it.el,
    };
    if (this.reorderable) {
      e.preventDefault();
    }
  }

  private _onPointerMove(e: PointerEvent): void {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    const dx = e.clientX - this.drag.startX;
    const dy = e.clientY - this.drag.startY;

    if (!this.drag.started) {
      const dist = Math.hypot(dx, dy);
      if (!this.reorderable || dist < 4) return;
      this.drag.started = true;
      this.drag.target.classList.add("toggle-group__item--dragging");
      e.preventDefault();
    }

    e.preventDefault();

    // Translate the dragged item with the pointer for tactile feedback.
    if (this.orientation === "horizontal") {
      this.drag.target.style.transform = `translateX(${dx}px)`;
    } else {
      this.drag.target.style.transform = `translateY(${dy}px)`;
    }

    // Find sibling under pointer (excluding the dragged element).
    const overEl = this._elementUnderPointer(e.clientX, e.clientY, this.drag.target);
    if (!overEl) return;

    const draggedIdx = this.items.findIndex((i) => i.id === this.drag!.itemId);
    const overIdx = this.items.findIndex((i) => i.el === overEl);
    if (draggedIdx === -1 || overIdx === -1 || draggedIdx === overIdx) return;

    // Determine which half of the sibling the pointer is in.
    const rect = overEl.getBoundingClientRect();
    let before: boolean;
    if (this.orientation === "horizontal") {
      before = e.clientX < rect.left + rect.width / 2;
    } else {
      before = e.clientY < rect.top + rect.height / 2;
    }

    // Compute the insert index in the items array AFTER the dragged item is
    // removed (i.e. in `remaining`). The dragged item is currently at
    // draggedIdx; in `remaining`, every item at index > draggedIdx shifts down.
    const overIdxInRemaining = overIdx < draggedIdx ? overIdx : overIdx - 1;
    const insertIdx = before ? overIdxInRemaining : overIdxInRemaining + 1;

    // No move needed?
    if (insertIdx === draggedIdx) return;

    // Perform the swap: remove from current position, insert at insertIdx.
    const [moved] = this.items.splice(draggedIdx, 1);
    this.items.splice(insertIdx, 0, moved);

    // Reorder DOM to match the items array.
    for (const i of this.items) this.root.appendChild(i.el);

    // Re-anchor the drag origin so the translate offset is 0 at the new
    // position; otherwise the dragged item would visually jump.
    this.drag.startX = e.clientX;
    this.drag.startY = e.clientY;
    this.drag.target.style.transform = "";
  }

  private _onPointerUp(e: PointerEvent): void {
    if (!this.drag) return;
    if (e.pointerId !== this.drag.pointerId) return;
    const wasStarted = this.drag.started;
    const target = this.drag.target;
    if (target) {
      target.classList.remove("toggle-group__item--dragging");
      target.style.transform = "";
    }
    this.drag = null;

    if (wasStarted) {
      // Suppress the synthetic click that fires right after pointerup.
      this.suppressClickUntil = Date.now() + 50;
      this._emit("reorder", { items: this.getItems() });
      this._emitChange();
    }
  }

  private _elementUnderPointer(x: number, y: number, exclude: HTMLElement): HTMLElement | null {
    if (typeof document === "undefined") return null;
    const prevPointerEvents = exclude.style.pointerEvents;
    exclude.style.pointerEvents = "none";
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    exclude.style.pointerEvents = prevPointerEvents;
    if (!el) return null;
    const itemEl = el.closest(".toggle-group__item") as HTMLElement | null;
    return itemEl && itemEl !== exclude ? itemEl : null;
  }

  // ---- Internals: keyboard ----

  private _onKeyDown(e: KeyboardEvent, it: InternalItem): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this._handleSelect(it.id);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (this.closable) {
        e.preventDefault();
        this._handleClose(it.id);
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      if (this.reorderable) {
        e.preventDefault();
        this._moveItem(it.id, -1);
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      if (this.reorderable) {
        e.preventDefault();
        this._moveItem(it.id, 1);
      }
    }
  }

  private _moveItem(id: string, delta: number): void {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= this.items.length) return;
    const [moved] = this.items.splice(idx, 1);
    this.items.splice(newIdx, 0, moved);
    for (const i of this.items) this.root.appendChild(i.el);
    moved.el.focus();
    this._emit("reorder", { items: this.getItems() });
    this._emitChange();
  }

  // ---- Internals: events ----

  private _emit(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const handlers = Array.from(set);
    for (const h of handlers) {
      try {
        h(data);
      } catch (err) {
        console.error(`ToggleGroup ${event} handler error:`, err);
      }
    }
  }

  private _emitChange(): void {
    this._emit("change", { items: this.getItems(), selected: this.getSelected() });
  }
}
