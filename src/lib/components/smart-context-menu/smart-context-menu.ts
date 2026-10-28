/**
 * SmartContextMenu — a context menu overlay that renders command items
 * from the command registry, with smart positioning bounded by a container
 * element (vanilla TypeScript).
 *
 * Each menu item renders a command's label, optional icon, and optional
 * keyboard shortcut (as <kbd> elements). The menu auto-positions on show
 * to stay within a bounds element: if it would overflow right, it flips
 * left; if it would overflow bottom, it flips up. Disabled commands are
 * visually muted and not clickable.
 *
 * Public API:
 *   new SmartContextMenu(container, options)
 *   show(x, y): void
 *   hide(): void
 *   isVisible(): boolean
 *   setCommandIds(ids): void
 *   setTitle(title): void
 *   on(event: "select" | "hide", handler): void
 *   off(event, handler): void
 *   destroy(): void
 *
 * Framework-independent. DOM-based (no canvas). Injects its own scoped CSS,
 * prefixed with `.smart-context-menu-`, so it does not depend on the
 * platform's stylesheet.
 */

import {
  commandRegistry,
  formatShortcut,
  shortcutParts,
  type Command,
} from "@/lib/commands";

export interface SmartContextMenuOptions {
  /** The container element that bounds the menu (menu won't overflow this). */
  bounds: HTMLElement;
  /** Command IDs to show as menu items. */
  commandIds: string[];
  /** Optional title for the menu header. */
  title?: string;
}

type ContextMenuHandler = (data: any) => void;

const STYLE_ID = "smart-context-menu-styles";
const MENU_GAP = 4; // px gap from the bounds edge when clamping

/**
 * Built-in Lucide-style icon set. Each value is the inner SVG markup; the
 * outer `<svg>` wrapper is added by `getIconSvg`. All icons use a 24x24
 * viewBox with `fill="none"` and `stroke="currentColor"`.
 *
 * Covers every icon referenced by the built-in command registry (search, x,
 * rotate-ccw, triangle, square, circle, circle-slash, refresh-cw, droplet,
 * sun, contrast, blend, divide, shuffle, brush, copy, clipboard) plus a few
 * common extras for custom menus.
 */
const BUILTIN_ICONS: Record<string, string> = {
  // Global
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  // Color Wheel
  "rotate-ccw":
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  triangle: '<path d="M13.73 4a2 2 0 0 0-3.46 0l-9 16A2 2 0 0 0 3 22h18a2 2 0 0 0 1.73-3Z"/>',
  square: '<rect x="3" y="3" width="18" height="18" rx="2"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  "circle-slash":
    '<circle cx="12" cy="12" r="9"/><path d="m4.5 15.5 11-11"/>',
  "refresh-cw":
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  // Color Range
  droplet:
    '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  contrast:
    '<circle cx="12" cy="12" r="9"/><path d="M12 18a6 6 0 0 0 0-12v12z" fill="currentColor"/>',
  blend:
    '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
  // Color Circle
  divide:
    '<path d="M5 12h14"/><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>',
  shuffle:
    '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
  brush:
    '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
  // Edit
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  clipboard:
    '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  // Extras
  check: '<polyline points="20 6 9 17 4 12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "mouse-pointer":
    '<path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>',
};

/** Returns the full `<svg>` markup for a named icon, or null if unknown. */
function getIconSvg(name: string): string | null {
  const inner = BUILTIN_ICONS[name];
  if (!inner) return null;
  return (
    `<svg class="smart-context-menu__icon-svg" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="2" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
  );
}

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.smart-context-menu {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  min-width: 200px;
  max-width: 280px;
  background: var(--popover, #1A1422);
  border: 1px solid var(--border, #383343);
  border-radius: 10px;
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.6), 0 4px 12px -2px rgba(0, 0, 0, 0.3);
  padding: 4px;
  font-family: var(--font-inter, inherit);
  font-size: 13px;
  color: var(--popover-foreground, #F4F1FF);
  opacity: 0;
  transform: scale(0.96);
  transform-origin: top left;
  pointer-events: none;
  transition: opacity 120ms ease, transform 120ms ease;
  --cm-accent: var(--brand-lemon, #D9FF66);
}
.smart-context-menu--visible {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}
.smart-context-menu__header {
  padding: 6px 10px 4px;
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted-foreground, #B8B2CA);
  border-bottom: 1px solid var(--border, #383343);
  margin-bottom: 4px;
  user-select: none;
}
.smart-context-menu__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.smart-context-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 80ms ease, color 80ms ease;
}
.smart-context-menu__item:hover,
.smart-context-menu__item--active {
  background: var(--accent, #342348);
}
.smart-context-menu__item--active {
  color: var(--cm-accent);
}
.smart-context-menu__item--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.smart-context-menu__item--disabled:hover,
.smart-context-menu__item--disabled.smart-context-menu__item--active {
  background: transparent;
  color: inherit;
}
.smart-context-menu__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: var(--muted-foreground, #B8B2CA);
}
.smart-context-menu__item--active .smart-context-menu__icon {
  color: var(--cm-accent);
}
.smart-context-menu__icon-svg {
  width: 14px;
  height: 14px;
}
.smart-context-menu__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.smart-context-menu__shortcut {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  margin-left: 8px;
}
.smart-context-menu__shortcut kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border, #383343);
  border-radius: 3px;
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  line-height: 1;
  color: var(--muted-foreground, #B8B2CA);
}
.smart-context-menu__item--active .smart-context-menu__shortcut kbd {
  border-color: color-mix(in srgb, var(--cm-accent) 40%, transparent);
  color: var(--cm-accent);
}
.smart-context-menu__separator {
  height: 1px;
  margin: 4px 6px;
  background: var(--border, #383343);
}
.smart-context-menu__empty {
  padding: 8px 10px;
  font-size: 11px;
  color: var(--muted-foreground, #B8B2CA);
  text-align: center;
}
`;
  document.head.appendChild(style);
}

export class SmartContextMenu {
  private readonly container: HTMLElement;
  private readonly bounds: HTMLElement;
  private commandIds: string[];
  private title: string | undefined;
  private readonly menuEl: HTMLDivElement;
  private headerEl: HTMLDivElement | null = null;
  private listEl: HTMLUListElement;
  private itemEls: HTMLLIElement[] = [];
  private visible = false;
  private activeIndex = -1;
  private readonly listeners = new Map<string, Set<ContextMenuHandler>>();
  private originalContainerPosition = "";
  private didOverrideContainerPosition = false;
  private destroyed = false;

  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onDocumentPointerDown: (e: PointerEvent) => void;
  private readonly _onBlur: () => void;

  constructor(container: HTMLElement, options: SmartContextMenuOptions) {
    this.container = container;
    this.bounds = options.bounds;
    this.commandIds = options.commandIds ? [...options.commandIds] : [];
    this.title = options.title;

    injectStyles();

    // Ensure the container is positioned so absolute children resolve against it.
    const cs = getComputedStyle(container);
    if (cs.position === "static") {
      this.originalContainerPosition = container.style.position;
      container.style.position = "relative";
      this.didOverrideContainerPosition = true;
    }

    // Build the menu DOM.
    this.menuEl = document.createElement("div");
    this.menuEl.className = "smart-context-menu";
    this.menuEl.setAttribute("role", "menu");
    this.menuEl.setAttribute("aria-hidden", "true");
    this.menuEl.style.display = "none";

    if (this.title) {
      this.headerEl = document.createElement("div");
      this.headerEl.className = "smart-context-menu__header";
      const span = document.createElement("span");
      span.textContent = this.title;
      this.headerEl.appendChild(span);
      this.menuEl.appendChild(this.headerEl);
    }

    this.listEl = document.createElement("ul");
    this.listEl.className = "smart-context-menu__list";
    this.menuEl.appendChild(this.listEl);

    this.container.appendChild(this.menuEl);
    this.renderItems();

    // Bound handlers.
    this._onKeyDown = this.onKeyDown.bind(this);
    this._onDocumentPointerDown = this.onDocumentPointerDown.bind(this);
    this._onBlur = () => this.hide();
  }

  // ---- Public API ----

  /** Show the menu at the given viewport-relative (clientX, clientY). */
  show(x: number, y: number): void {
    if (this.destroyed) return;
    this.visible = true;
    this.menuEl.style.display = "block";
    this.menuEl.setAttribute("aria-hidden", "false");

    // Make the element measurable but invisible while we compute the position.
    this.menuEl.classList.remove("smart-context-menu--visible");
    this.menuEl.style.left = "0px";
    this.menuEl.style.top = "0px";

    // Measure the menu's natural size.
    const menuRect = this.menuEl.getBoundingClientRect();
    const menuW = menuRect.width;
    const menuH = menuRect.height;

    // Bounds + container rects (viewport coords).
    const br = this.bounds.getBoundingClientRect();
    const cr = this.container.getBoundingClientRect();

    // Translate x, y into container-relative coordinates.
    let left = x - cr.left;
    let top = y - cr.top;

    // Horizontal: if it would overflow right, flip left; clamp to bounds.
    if (left + menuW > br.right - cr.left - MENU_GAP) {
      left = left - menuW;
    }
    if (left < br.left - cr.left + MENU_GAP) {
      left = br.left - cr.left + MENU_GAP;
    }

    // Vertical: if it would overflow bottom, flip up; clamp to bounds.
    if (top + menuH > br.bottom - cr.top - MENU_GAP) {
      top = top - menuH;
    }
    if (top < br.top - cr.top + MENU_GAP) {
      top = br.top - cr.top + MENU_GAP;
    }

    this.menuEl.style.left = `${left}px`;
    this.menuEl.style.top = `${top}px`;

    // Reset active item to the first enabled item.
    this.activeIndex = this.firstEnabledIndex();
    this.updateActiveItem();

    // Reveal.
    requestAnimationFrame(() => {
      this.menuEl.classList.add("smart-context-menu--visible");
    });

    document.addEventListener("keydown", this._onKeyDown, true);
    document.addEventListener("pointerdown", this._onDocumentPointerDown, true);
    window.addEventListener("blur", this._onBlur);
  }

  /** Hide the menu. */
  hide(): void {
    if (!this.visible || this.destroyed) return;
    this.visible = false;
    this.menuEl.classList.remove("smart-context-menu--visible");
    this.menuEl.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", this._onKeyDown, true);
    document.removeEventListener("pointerdown", this._onDocumentPointerDown, true);
    window.removeEventListener("blur", this._onBlur);
    // Hide after the transition so the next show() can re-measure.
    window.setTimeout(() => {
      if (!this.visible && !this.destroyed) {
        this.menuEl.style.display = "none";
      }
    }, 140);
    this.emit("hide", undefined);
  }

  isVisible(): boolean {
    return this.visible;
  }

  setCommandIds(ids: string[]): void {
    this.commandIds = [...ids];
    this.renderItems();
    if (this.visible) {
      this.activeIndex = this.firstEnabledIndex();
      this.updateActiveItem();
    }
  }

  setTitle(title: string | undefined): void {
    this.title = title;
    if (title) {
      if (!this.headerEl) {
        this.headerEl = document.createElement("div");
        this.headerEl.className = "smart-context-menu__header";
        const span = document.createElement("span");
        this.headerEl.appendChild(span);
        this.menuEl.insertBefore(this.headerEl, this.listEl);
      }
      this.headerEl.querySelector("span")!.textContent = title;
    } else if (this.headerEl) {
      this.headerEl.remove();
      this.headerEl = null;
    }
  }

  on(event: "select", handler: (commandId: string) => void): void;
  on(event: "hide", handler: () => void): void;
  on(event: string, handler: ContextMenuHandler): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  off(event: string, handler: ContextMenuHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    document.removeEventListener("keydown", this._onKeyDown, true);
    document.removeEventListener("pointerdown", this._onDocumentPointerDown, true);
    window.removeEventListener("blur", this._onBlur);
    this.listeners.clear();
    if (this.didOverrideContainerPosition) {
      this.container.style.position = this.originalContainerPosition;
    }
    this.menuEl.remove();
  }

  // ---- Internals ----

  private renderItems(): void {
    this.listEl.innerHTML = "";
    this.itemEls = [];
    const commands = commandRegistry.byIds(this.commandIds);

    if (commands.length === 0) {
      const empty = document.createElement("li");
      empty.className = "smart-context-menu__empty";
      empty.textContent = "No commands";
      this.listEl.appendChild(empty);
      return;
    }

    let lastCategory: string | undefined;
    for (const cmd of commands) {
      // Insert a separator between categories.
      if (cmd.category && cmd.category !== lastCategory && lastCategory !== undefined) {
        const sep = document.createElement("li");
        sep.className = "smart-context-menu__separator";
        sep.setAttribute("role", "separator");
        this.listEl.appendChild(sep);
      }
      lastCategory = cmd.category;

      const li = this.createItemEl(cmd);
      this.listEl.appendChild(li);
      this.itemEls.push(li);
    }
  }

  private createItemEl(cmd: Command): HTMLLIElement {
    const li = document.createElement("li");
    li.setAttribute("role", "menuitem");
    li.setAttribute("data-command-id", cmd.id);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "smart-context-menu__item";
    btn.disabled = !!cmd.disabled;
    if (cmd.disabled) {
      btn.classList.add("smart-context-menu__item--disabled");
      btn.setAttribute("aria-disabled", "true");
    }

    // Icon
    if (cmd.icon) {
      const iconWrap = document.createElement("span");
      iconWrap.className = "smart-context-menu__icon";
      const svg = getIconSvg(cmd.icon);
      if (svg) {
        iconWrap.innerHTML = svg;
      } else {
        // Fallback dot
        iconWrap.innerHTML =
          `<svg class="smart-context-menu__icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`;
      }
      btn.appendChild(iconWrap);
    } else {
      // Reserve space so labels align with icons
      const spacer = document.createElement("span");
      spacer.className = "smart-context-menu__icon";
      spacer.setAttribute("aria-hidden", "true");
      btn.appendChild(spacer);
    }

    // Label
    const label = document.createElement("span");
    label.className = "smart-context-menu__label";
    label.textContent = cmd.label;
    btn.appendChild(label);

    // Shortcut
    if (cmd.shortcut) {
      const sc = document.createElement("span");
      sc.className = "smart-context-menu__shortcut";
      sc.setAttribute("aria-label", `Shortcut: ${formatShortcut(cmd.shortcut)}`);
      for (const part of shortcutParts(cmd.shortcut)) {
        const kbd = document.createElement("kbd");
        kbd.textContent = part;
        sc.appendChild(kbd);
      }
      btn.appendChild(sc);
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      this.emit("select", cmd.id);
      this.hide();
    });

    btn.addEventListener("pointerenter", () => {
      if (btn.disabled) return;
      const idx = this.itemEls.indexOf(li);
      if (idx >= 0) {
        this.activeIndex = idx;
        this.updateActiveItem();
      }
    });

    li.appendChild(btn);
    return li;
  }

  private firstEnabledIndex(): number {
    for (let i = 0; i < this.itemEls.length; i++) {
      const btn = this.itemEls[i].querySelector<HTMLButtonElement>(".smart-context-menu__item");
      if (btn && !btn.disabled) return i;
    }
    return -1;
  }

  private updateActiveItem(): void {
    for (let i = 0; i < this.itemEls.length; i++) {
      const btn = this.itemEls[i].querySelector<HTMLButtonElement>(".smart-context-menu__item");
      if (!btn) continue;
      if (i === this.activeIndex) {
        btn.classList.add("smart-context-menu__item--active");
        try { btn.focus({ preventScroll: true }); } catch { /* ignore */ }
      } else {
        btn.classList.remove("smart-context-menu__item--active");
      }
    }
  }

  private moveActive(delta: 1 | -1): void {
    if (this.itemEls.length === 0) return;
    const n = this.itemEls.length;
    let idx = this.activeIndex;
    for (let step = 0; step < n; step++) {
      idx = (idx + delta + n) % n;
      const btn = this.itemEls[idx].querySelector<HTMLButtonElement>(".smart-context-menu__item");
      if (btn && !btn.disabled) {
        this.activeIndex = idx;
        this.updateActiveItem();
        return;
      }
    }
  }

  private selectActive(): void {
    if (this.activeIndex < 0 || this.activeIndex >= this.itemEls.length) return;
    const li = this.itemEls[this.activeIndex];
    const cmdId = li.getAttribute("data-command-id");
    if (!cmdId) return;
    const btn = li.querySelector<HTMLButtonElement>(".smart-context-menu__item");
    if (!btn || btn.disabled) return;
    this.emit("select", cmdId);
    this.hide();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.visible) return;
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        break;
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        this.moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        this.moveActive(-1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        e.stopPropagation();
        this.selectActive();
        break;
      case "Tab":
        e.preventDefault();
        e.stopPropagation();
        this.moveActive(e.shiftKey ? -1 : 1);
        break;
      default:
        // No-op — let other keys bubble.
        break;
    }
  }

  private onDocumentPointerDown(e: PointerEvent): void {
    if (!this.visible) return;
    if (this.menuEl.contains(e.target as Node)) return;
    // Click outside the menu — hide.
    this.hide();
  }

  private emit(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const h of Array.from(set)) {
      try { h(data); } catch (err) {
        console.error("SmartContextMenu handler error:", err);
      }
    }
  }
}
