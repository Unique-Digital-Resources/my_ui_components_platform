/**
 * SmartTooltip — a tooltip overlay that renders a command's label,
 * description, and keyboard shortcut, with smart positioning bounded by
 * a container element (vanilla TypeScript).
 *
 * The tooltip attaches to a target element. On mouseenter it appears next
 * to the target (top/bottom/left/right). If it would overflow the bounds
 * element, it flips to the opposite side. The shortcut is rendered as
 * <kbd> badges.
 *
 * Public API:
 *   new SmartTooltip(container, options)
 *   attachTo(target): void
 *   detach(): void
 *   show(): void
 *   hide(): void
 *   setCommandId(id): void
 *   setPosition(pos): void
 *   destroy(): void
 *
 * Framework-independent. DOM-based (no canvas). Injects its own scoped CSS,
 * prefixed with `.smart-tooltip-`, so it does not depend on the platform's
 * stylesheet.
 */

import {
  commandRegistry,
  formatShortcut,
  shortcutParts,
} from "@/lib/commands";

export type SmartTooltipPosition = "top" | "bottom" | "left" | "right";

export interface SmartTooltipOptions {
  /** The container element that bounds the tooltip. */
  bounds: HTMLElement;
  /** Command ID to display. */
  commandId: string;
  /** Position relative to the target element. Default "top". */
  position?: SmartTooltipPosition;
}

type TooltipHandler = (data: any) => void;

const STYLE_ID = "smart-tooltip-styles";
const GAP = 8; // px gap between target and tooltip
const EDGE_PAD = 4; // px padding from the bounds edge when clamping

/**
 * Built-in Lucide-style icon set (same set as SmartContextMenu).
 * Inner SVG markup; the outer `<svg>` wrapper is added by `getIconSvg`.
 */
const BUILTIN_ICONS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  "rotate-ccw":
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  triangle: '<path d="M13.73 4a2 2 0 0 0-3.46 0l-9 16A2 2 0 0 0 3 22h18a2 2 0 0 0 1.73-3Z"/>',
  square: '<rect x="3" y="3" width="18" height="18" rx="2"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  "circle-slash":
    '<circle cx="12" cy="12" r="9"/><path d="m4.5 15.5 11-11"/>',
  "refresh-cw":
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  droplet:
    '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  contrast:
    '<circle cx="12" cy="12" r="9"/><path d="M12 18a6 6 0 0 0 0-12v12z" fill="currentColor"/>',
  blend:
    '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
  divide:
    '<path d="M5 12h14"/><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>',
  shuffle:
    '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
  brush:
    '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  clipboard:
    '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
};

function getIconSvg(name: string): string | null {
  const inner = BUILTIN_ICONS[name];
  if (!inner) return null;
  return (
    `<svg class="smart-tooltip__icon-svg" viewBox="0 0 24 24" fill="none" ` +
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
.smart-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  max-width: 260px;
  background: var(--popover, #1A1422);
  border: 1px solid var(--border, #383343);
  border-radius: 8px;
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.5), 0 2px 8px -2px rgba(0, 0, 0, 0.3);
  padding: 8px 10px;
  font-family: var(--font-inter, inherit);
  color: var(--popover-foreground, #F4F1FF);
  opacity: 0;
  transform: translateY(2px) scale(0.98);
  transform-origin: center bottom;
  pointer-events: none;
  transition: opacity 120ms ease, transform 120ms ease;
  --tt-accent: var(--brand-lemon, #D9FF66);
}
.smart-tooltip--visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.smart-tooltip__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.smart-tooltip__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  color: var(--tt-accent);
}
.smart-tooltip__icon-svg {
  width: 13px;
  height: 13px;
}
.smart-tooltip__label {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--popover-foreground, #F4F1FF);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.smart-tooltip__description {
  color: var(--muted-foreground, #B8B2CA);
  font-size: 11px;
  line-height: 1.45;
  margin-bottom: 4px;
}
.smart-tooltip__shortcut {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.smart-tooltip__shortcut kbd {
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
  color: var(--tt-accent);
}
.smart-tooltip__empty {
  font-size: 11px;
  color: var(--muted-foreground, #B8B2CA);
}
`;
  document.head.appendChild(style);
}

export class SmartTooltip {
  private readonly container: HTMLElement;
  private readonly bounds: HTMLElement;
  private commandId: string;
  private position: SmartTooltipPosition;
  private target: HTMLElement | null = null;
  private readonly tooltipEl: HTMLDivElement;
  private visible = false;
  private destroyed = false;
  private readonly listeners = new Map<string, Set<TooltipHandler>>();
  private originalContainerPosition = "";
  private didOverrideContainerPosition = false;

  private readonly _onTargetEnter: () => void;
  private readonly _onTargetLeave: () => void;
  private readonly _onTargetFocus: () => void;
  private readonly _onTargetBlur: () => void;

  constructor(container: HTMLElement, options: SmartTooltipOptions) {
    this.container = container;
    this.bounds = options.bounds;
    this.commandId = options.commandId;
    this.position = options.position ?? "top";

    injectStyles();

    // Ensure the container is positioned.
    const cs = getComputedStyle(container);
    if (cs.position === "static") {
      this.originalContainerPosition = container.style.position;
      container.style.position = "relative";
      this.didOverrideContainerPosition = true;
    }

    this.tooltipEl = document.createElement("div");
    this.tooltipEl.className = "smart-tooltip";
    this.tooltipEl.setAttribute("role", "tooltip");
    this.tooltipEl.setAttribute("aria-hidden", "true");
    this.tooltipEl.style.display = "none";
    this.container.appendChild(this.tooltipEl);
    this.renderContent();

    this._onTargetEnter = this.onTargetEnter.bind(this);
    this._onTargetLeave = this.onTargetLeave.bind(this);
    this._onTargetFocus = this.onTargetEnter.bind(this);
    this._onTargetBlur = this.onTargetLeave.bind(this);
  }

  // ---- Public API ----

  attachTo(target: HTMLElement): void {
    if (this.target === target) return;
    this.detach();
    this.target = target;
    target.addEventListener("mouseenter", this._onTargetEnter);
    target.addEventListener("mouseleave", this._onTargetLeave);
    target.addEventListener("focus", this._onTargetFocus);
    target.addEventListener("blur", this._onTargetBlur);
  }

  detach(): void {
    if (!this.target) return;
    this.target.removeEventListener("mouseenter", this._onTargetEnter);
    this.target.removeEventListener("mouseleave", this._onTargetLeave);
    this.target.removeEventListener("focus", this._onTargetFocus);
    this.target.removeEventListener("blur", this._onTargetBlur);
    this.target = null;
    this.hide();
  }

  show(): void {
    if (this.destroyed) return;
    if (!this.target) return;
    this.visible = true;
    this.tooltipEl.style.display = "block";
    this.tooltipEl.setAttribute("aria-hidden", "false");
    this.tooltipEl.classList.remove("smart-tooltip--visible");
    this.tooltipEl.style.left = "0px";
    this.tooltipEl.style.top = "0px";

    // Position once visible & measurable.
    this.positionTooltip();

    requestAnimationFrame(() => {
      this.tooltipEl.classList.add("smart-tooltip--visible");
    });
  }

  hide(): void {
    if (!this.visible || this.destroyed) return;
    this.visible = false;
    this.tooltipEl.classList.remove("smart-tooltip--visible");
    this.tooltipEl.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (!this.visible && !this.destroyed) {
        this.tooltipEl.style.display = "none";
      }
    }, 140);
  }

  setCommandId(id: string): void {
    this.commandId = id;
    this.renderContent();
    if (this.visible) this.positionTooltip();
  }

  setPosition(pos: SmartTooltipPosition): void {
    this.position = pos;
    if (this.visible) this.positionTooltip();
  }

  on(event: "show" | "hide", handler: () => void): void;
  on(event: string, handler: TooltipHandler): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  off(event: string, handler: TooltipHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.detach();
    this.listeners.clear();
    if (this.didOverrideContainerPosition) {
      this.container.style.position = this.originalContainerPosition;
    }
    this.tooltipEl.remove();
  }

  // ---- Internals ----

  private renderContent(): void {
    const cmd = commandRegistry.get(this.commandId);
    this.tooltipEl.innerHTML = "";
    if (!cmd) {
      const empty = document.createElement("div");
      empty.className = "smart-tooltip__empty";
      empty.textContent = `Unknown command: ${this.commandId}`;
      this.tooltipEl.appendChild(empty);
      return;
    }

    // Header row: icon + label
    const head = document.createElement("div");
    head.className = "smart-tooltip__head";
    if (cmd.icon) {
      const iconWrap = document.createElement("span");
      iconWrap.className = "smart-tooltip__icon";
      const svg = getIconSvg(cmd.icon);
      if (svg) {
        iconWrap.innerHTML = svg;
      }
      head.appendChild(iconWrap);
    }
    const label = document.createElement("span");
    label.className = "smart-tooltip__label";
    label.textContent = cmd.label;
    head.appendChild(label);
    this.tooltipEl.appendChild(head);

    // Description
    if (cmd.description) {
      const desc = document.createElement("div");
      desc.className = "smart-tooltip__description";
      desc.textContent = cmd.description;
      this.tooltipEl.appendChild(desc);
    }

    // Shortcut
    if (cmd.shortcut) {
      const sc = document.createElement("div");
      sc.className = "smart-tooltip__shortcut";
      sc.setAttribute("aria-label", `Shortcut: ${formatShortcut(cmd.shortcut)}`);
      for (const part of shortcutParts(cmd.shortcut)) {
        const kbd = document.createElement("kbd");
        kbd.textContent = part;
        sc.appendChild(kbd);
      }
      this.tooltipEl.appendChild(sc);
    }
  }

  private positionTooltip(): void {
    if (!this.target) return;

    // Measure the tooltip's natural size.
    const ttRect = this.tooltipEl.getBoundingClientRect();
    const ttW = ttRect.width;
    const ttH = ttRect.height;

    // Target rect (viewport coords) and bounds + container rects.
    const tr = this.target.getBoundingClientRect();
    const br = this.bounds.getBoundingClientRect();
    const cr = this.container.getBoundingClientRect();

    // Target rect in container-relative coords.
    const tx = tr.left - cr.left;
    const ty = tr.top - cr.top;
    const tw = tr.width;
    const th = tr.height;

    // Bounds in container-relative coords (with padding).
    const bLeft = br.left - cr.left + EDGE_PAD;
    const bTop = br.top - cr.top + EDGE_PAD;
    const bRight = br.right - cr.left - EDGE_PAD;
    const bBottom = br.bottom - cr.top - EDGE_PAD;

    let pos = this.position;
    let left: number;
    let top: number;

    // Compute initial position for the requested side, then check overflow
    // and flip if needed.
    const place = (side: SmartTooltipPosition): { left: number; top: number } => {
      switch (side) {
        case "top":
          return {
            left: tx + tw / 2 - ttW / 2,
            top: ty - ttH - GAP,
          };
        case "bottom":
          return {
            left: tx + tw / 2 - ttW / 2,
            top: ty + th + GAP,
          };
        case "left":
          return {
            left: tx - ttW - GAP,
            top: ty + th / 2 - ttH / 2,
          };
        case "right":
          return {
            left: tx + tw + GAP,
            top: ty + th / 2 - ttH / 2,
          };
      }
    };

    let p = place(pos);

    // Flip if the requested side overflows.
    if (pos === "top" && p.top < bTop) {
      pos = "bottom";
      p = place(pos);
    } else if (pos === "bottom" && p.top + ttH > bBottom) {
      pos = "top";
      p = place(pos);
    } else if (pos === "left" && p.left < bLeft) {
      pos = "right";
      p = place(pos);
    } else if (pos === "right" && p.left + ttW > bRight) {
      pos = "left";
      p = place(pos);
    }

    // Clamp the non-primary axis so the tooltip stays inside the bounds.
    left = Math.max(bLeft, Math.min(p.left, bRight - ttW));
    top = Math.max(bTop, Math.min(p.top, bBottom - ttH));

    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  private onTargetEnter(): void {
    this.show();
    this.emit("show", undefined);
  }

  private onTargetLeave(): void {
    this.hide();
    this.emit("hide", undefined);
  }

  private emit(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const h of Array.from(set)) {
      try { h(data); } catch (err) {
        console.error("SmartTooltip handler error:", err);
      }
    }
  }
}
