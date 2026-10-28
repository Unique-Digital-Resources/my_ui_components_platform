/**
 * CustomButton — a versatile button component (vanilla TypeScript).
 *
 * Renders a `<button>` element with configurable content (text, icon, or both),
 * icon positioning (left/right/top/bottom), four visual variants, three sizes,
 * and disabled/fullWidth states. Supports both inline-SVG Lucide-style icons
 * (looked up by name from a built-in set) and `<img>`-based images (data URI
 * or URL).
 *
 * Public API:
 *   new CustomButton(container, options?)
 *   setText(text): void
 *   setIcon(icon, type?): void
 *   setIconPosition(pos): void
 *   setVariant(variant): void
 *   setSize(size): void
 *   setDisabled(disabled): void
 *   setFullWidth(fullWidth): void
 *   on("click", handler): void
 *   off(event, handler): void
 *   destroy(): void
 *
 * Framework-independent. DOM-based (no canvas). Injects its own scoped CSS,
 * prefixed with `.custom-button-`, so it does not depend on the platform's
 * stylesheet.
 */

export type CustomButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "thumb" | "cell";
export type CustomButtonSize = "sm" | "md" | "lg";
export type CustomButtonIconType = "icon" | "image";
export type CustomButtonIconPosition = "left" | "right" | "top" | "bottom";

export interface CustomButtonOptions {
  /** Button label text. Empty string by default. */
  text?: string;
  /** SVG icon name (Lucide-style, from the built-in set) or image src when iconType="image". */
  icon?: string;
  /** "icon" renders an inline SVG; "image" renders an `<img>`. Default "icon". */
  iconType?: CustomButtonIconType;
  /** Position of the icon relative to the text. Default "left". */
  iconPosition?: CustomButtonIconPosition;
  /** Visual style. Default "primary". */
  variant?: CustomButtonVariant;
  /** Button size. Default "md". */
  size?: CustomButtonSize;
  /** Disabled state. Default false. */
  disabled?: boolean;
  /** Stretch to fill the parent's width. Default false. */
  fullWidth?: boolean;
  /** Explicit width in px (for thumb/cell mode). Overrides size-based width. */
  width?: number;
  /** Explicit height in px (for thumb/cell mode). Overrides size-based height. */
  height?: number;
  /** Whether the thumb is draggable (adds cursor:grab). Default false. */
  draggable?: boolean;
  /** Whether the thumb is active/selected (adds a focus ring). Default false. */
  active?: boolean;
}

/**
 * Built-in Lucide-style icon set. Each value is the inner SVG markup (the
 * `<svg>` wrapper is added by `getIconSvg`). All icons use a 24×24 viewBox
 * with `fill="none"` and `stroke="currentColor"`.
 *
 * Only a curated set of common icons is included — see `getIconSvg` for the
 * fallback when a name is not recognized.
 */
const LUCIDE_ICONS: Record<string, string> = {
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  heart:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
  "arrow-right":
    '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  mail:
    '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  user:
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  save:
    '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  edit:
    '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  bell:
    '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
};

/**
 * Returns the full `<svg>` markup for a named Lucide icon, or null if the
 * name is not in the built-in set.
 */
function getIconSvg(name: string): string | null {
  const inner = LUCIDE_ICONS[name];
  if (!inner) return null;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    inner +
    "</svg>"
  );
}

/** List of available built-in icon names (sorted). Exposed for the playground dropdown. */
export const BUILT_IN_ICON_NAMES: string[] = Object.keys(LUCIDE_ICONS).sort();

const STYLE_ID = "custom-button-styles";

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.custom-button-root {
  /* Token defaults — overridden per-variant and per-size below. */
  --cb-bg: #D9FF66;
  --cb-bg-hover: #C8F34F;
  --cb-color: #17151D;
  --cb-border: transparent;
  --cb-h: 36px;
  --cb-font-size: 14px;
  --cb-pad-x: 14px;
  --cb-gap: 6px;
  --cb-focus-ring: rgba(217, 255, 102, 0.55);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--cb-gap);
  height: var(--cb-h);
  padding: 0 var(--cb-pad-x);
  font-family: inherit;
  font-size: var(--cb-font-size);
  font-weight: 500;
  line-height: 1;
  color: var(--cb-color);
  background: var(--cb-bg);
  border: 1px solid var(--cb-border);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  text-decoration: none;
  transition: background-color 150ms ease, color 150ms ease,
    border-color 150ms ease, transform 80ms ease, opacity 150ms ease;
  -webkit-tap-highlight-color: transparent;
}
.custom-button-root:hover {
  background: var(--cb-bg-hover);
}
.custom-button-root:active {
  transform: translateY(1px);
}
.custom-button-root:focus-visible {
  outline: 2px solid var(--cb-focus-ring);
  outline-offset: 2px;
}
.custom-button-root:disabled,
.custom-button-root[aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Icon-only — square aspect, no horizontal padding. */
.custom-button-root.custom-button-icon-only {
  aspect-ratio: 1 / 1;
  width: var(--cb-h);
  padding: 0;
}

/* Stacked layouts — top/bottom positioning needs vertical padding + smaller gap. */
.custom-button-root.custom-button-pos-top,
.custom-button-root.custom-button-pos-bottom {
  flex-direction: column;
  gap: 2px;
  padding-top: 6px;
  padding-bottom: 6px;
  height: auto;
  min-height: var(--cb-h);
}

/* Full width. */
.custom-button-root.custom-button-full {
  width: 100%;
}

/* ---- Variants ---- */
.custom-button-root[data-variant="primary"] {
  --cb-bg: #D9FF66;
  --cb-bg-hover: #C8F34F;
  --cb-color: #17151D;
  --cb-border: transparent;
}
.custom-button-root[data-variant="secondary"] {
  --cb-bg: #342348;
  --cb-bg-hover: #4A3260;
  --cb-color: #F4F1FF;
  --cb-border: transparent;
}
.custom-button-root[data-variant="outline"] {
  --cb-bg: transparent;
  --cb-bg-hover: rgba(217, 255, 102, 0.08);
  --cb-color: #F4F1FF;
  --cb-border: rgba(244, 241, 255, 0.18);
}
.custom-button-root[data-variant="ghost"] {
  --cb-bg: transparent;
  --cb-bg-hover: rgba(244, 241, 255, 0.06);
  --cb-color: #F4F1FF;
  --cb-border: transparent;
}

/* ---- Thumb variant (for sliders, color pickers, etc.) ----
   Size tokens (--cb-h, --cb-font-size) flow through from [data-size].
   We only override cosmetic props (bg, border-radius, shadow), NOT
   font-size or height — those come from the size token so that
   sm/md/lg visibly change the thumb. */
.custom-button-root[data-variant="thumb"] {
  --cb-bg: rgba(255, 255, 255, 0.95);
  --cb-bg-hover: rgba(255, 255, 255, 1);
  --cb-color: #17151D;
  --cb-border: rgba(0, 0, 0, 0.7);
  border-radius: 999px;
  padding: 0;
  gap: 2px;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: box-shadow 120ms ease, transform 80ms ease;
  position: absolute;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.custom-button-root[data-variant="thumb"]:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transform: scale(1.1);
}
.custom-button-root[data-variant="thumb"].custom-button-draggable {
  cursor: grab;
}
.custom-button-root[data-variant="thumb"].custom-button-draggable:active {
  cursor: grabbing;
}
.custom-button-root[data-variant="thumb"].custom-button-active {
  box-shadow: 0 0 0 2px rgba(217, 255, 102, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4);
}

/* ---- Cell variant (for calendar, grid, etc.) ----
   Size tokens flow through; only cosmetics are overridden. */
.custom-button-root[data-variant="cell"] {
  --cb-bg: transparent;
  --cb-bg-hover: rgba(217, 255, 102, 0.08);
  --cb-color: #F4F1FF;
  --cb-border: transparent;
  border-radius: 6px;
  padding: 0;
  gap: 2px;
  font-weight: 500;
  transition: background 100ms ease, color 100ms ease;
}
.custom-button-root[data-variant="cell"]:hover {
  --cb-bg: rgba(217, 255, 102, 0.12);
}
.custom-button-root[data-variant="cell"].custom-button-active {
  --cb-bg: #D9FF66;
  --cb-color: #17151D;
  font-weight: 700;
}

/* ---- Sizes ---- */
.custom-button-root[data-size="sm"] {
  --cb-h: 32px;
  --cb-font-size: 12px;
  --cb-pad-x: 10px;
  --cb-gap: 5px;
}
.custom-button-root[data-size="md"] {
  --cb-h: 36px;
  --cb-font-size: 14px;
  --cb-pad-x: 14px;
  --cb-gap: 6px;
}
.custom-button-root[data-size="lg"] {
  --cb-h: 40px;
  --cb-font-size: 16px;
  --cb-pad-x: 18px;
  --cb-gap: 8px;
}

/* ---- Inner elements ---- */
.custom-button-text {
  display: inline-block;
  line-height: 1.2;
}
.custom-button-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.custom-button-icon svg {
  width: 1.15em;
  height: 1.15em;
  display: block;
}
.custom-button-icon img {
  width: 1.25em;
  height: 1.25em;
  object-fit: contain;
  display: block;
  border-radius: 2px;
}
`;
  document.head.appendChild(style);
}

type ClickHandler = () => void;
/** Generic handler signature used by `off`. Matches the spec's `Function` param while satisfying lint. */
export type CustomButtonHandler = (...args: unknown[]) => void;

export class CustomButton {
  private readonly container: HTMLElement;
  private readonly button: HTMLButtonElement;

  private options: {
    text: string;
    icon: string;
    iconType: CustomButtonIconType;
    iconPosition: CustomButtonIconPosition;
    variant: CustomButtonVariant;
    size: CustomButtonSize;
    disabled: boolean;
    fullWidth: boolean;
    width: number;
    height: number;

    draggable: boolean;
    active: boolean;
  };

  private readonly listeners: Map<string, Set<CustomButtonHandler>> = new Map();
  private readonly _onClick: ClickHandler;
  private _destroyed = false;

  constructor(container: HTMLElement, options: CustomButtonOptions = {}) {
    this.container = container;

    this.options = {
      text: options.text ?? "",
      icon: options.icon ?? "",
      iconType: options.iconType ?? "icon",
      iconPosition: options.iconPosition ?? "left",
      variant: options.variant ?? "primary",
      size: options.size ?? "md",
      disabled: options.disabled ?? false,
      fullWidth: options.fullWidth ?? false,
      width: options.width ?? 0,
      height: options.height ?? 0,
      draggable: options.draggable ?? false,
      active: options.active ?? false,
    };

    injectStyles();

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "custom-button-root";

    // The browser already blocks click events on disabled buttons, so this
    // handler is safe to attach unconditionally.
    this._onClick = () => {
      if (this.options.disabled) return;
      this.emit("click");
    };
    this.button.addEventListener("click", this._onClick);

    this.container.appendChild(this.button);
    this.render();
  }

  /** Returns the underlying `<button>` element (read-only — do not reattach). */
  getElement(): HTMLButtonElement {
    return this.button;
  }

  // ---- Public API ----

  setText(text: string): void {
    this.options.text = text;
    this.render();
  }

  setIcon(icon: string, type?: CustomButtonIconType): void {
    this.options.icon = icon;
    if (type) this.options.iconType = type;
    this.render();
  }

  setIconType(type: CustomButtonIconType): void {
    this.options.iconType = type;
    this.render();
  }

  setIconPosition(pos: CustomButtonIconPosition): void {
    this.options.iconPosition = pos;
    this.render();
  }

  setVariant(variant: CustomButtonVariant): void {
    this.options.variant = variant;
    this.render();
  }

  setSize(size: CustomButtonSize): void {
    this.options.size = size;
    this.render();
  }

  setDisabled(disabled: boolean): void {
    this.options.disabled = disabled;
    this.render();
  }

  setFullWidth(fullWidth: boolean): void {
    this.options.fullWidth = fullWidth;
    this.render();
  }

  setWidth(width: number): void {
    this.options.width = width;
    this.render();
  }

  setHeight(height: number): void {
    this.options.height = height;
    this.render();
  }

  setDraggable(draggable: boolean): void {
    this.options.draggable = draggable;
    this.render();
  }

  setActive(active: boolean): void {
    this.options.active = active;
    this.render();
  }

  /**
   * Set the center position (for absolute-positioned thumbs).
   * The button is centered on (x, y) using transform: translate(-50%, -50%).
   * This means size changes (sm/md/lg or explicit width/height) never break
   * alignment — the button always stays centered on the given point.
   */
  setPosition(x: number, y: number): void {
    this.button.style.left = `${x}px`;
    this.button.style.top = `${y}px`;
    this.button.style.transform = "translate(-50%, -50%)";
  }

  on(event: "click", handler: ClickHandler): void;
  on(event: string, handler: CustomButtonHandler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: CustomButtonHandler): void {
    const set = this.listeners.get(event);
    if (set) set.delete(handler);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.button.removeEventListener("click", this._onClick);
    this.listeners.clear();
    if (this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
  }

  // ---- Internal ----

  private emit(event: string): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((fn) => {
      try {
        fn();
      } catch {
        /* swallow handler errors */
      }
    });
  }

  private render(): void {
    const o = this.options;

    // Variant & size as data attributes (CSS targets these).
    this.button.setAttribute("data-variant", o.variant);
    this.button.setAttribute("data-size", o.size);

    // Layout classes.
    const hasIcon = !!o.icon;
    const hasText = !!o.text;
    this.button.classList.toggle(
      "custom-button-icon-only",
      hasIcon && !hasText,
    );
    this.button.classList.toggle("custom-button-full", o.fullWidth);

    // Thumb/cell-specific classes
    this.button.classList.toggle("custom-button-draggable", o.draggable);
    this.button.classList.toggle("custom-button-active", o.active);

    this.button.classList.remove(
      "custom-button-pos-left",
      "custom-button-pos-right",
      "custom-button-pos-top",
      "custom-button-pos-bottom",
    );
    // iconPosition applies to ALL variants including thumb and cell
    this.button.classList.add(`custom-button-pos-${o.iconPosition}`);

    // Disabled state — affects interaction + visual
    this.button.disabled = o.disabled;

    // Dimensions: size is a TOKEN. The [data-size] attribute sets --cb-h,
    // --cb-font-size, --cb-pad-x, --cb-gap via CSS. For thumb/cell, explicit
    // width/height (> 0) override the token; when 0, the token controls:
    //   - height falls back to var(--cb-h) from the base rule
    //   - width falls back to var(--cb-h) too (square) so an empty thumb/cell
    //     is still visible and size changes are obvious.
    if (o.variant === "thumb" || o.variant === "cell") {
      if (o.width > 0) this.button.style.width = `${o.width}px`;
      else this.button.style.width = "var(--cb-h)";
      if (o.height > 0) this.button.style.height = `${o.height}px`;
      else this.button.style.height = "";
    } else {
      // Standard variants: always clear explicit dimensions (size preset controls)
      this.button.style.width = o.fullWidth ? "100%" : "";
      this.button.style.height = "";
    }

    // Rebuild children. innerHTML reset is simplest for a small tree.
    this.button.innerHTML = "";

    // Build icon element (shared logic for all variants)
    let iconEl: HTMLElement | null = null;
    if (hasIcon) {
      if (o.iconType === "image") {
        const img = document.createElement("img");
        img.src = o.icon;
        img.alt = "";
        img.className = "custom-button-icon";
        iconEl = img;
      } else {
        const svg = getIconSvg(o.icon);
        if (svg) {
          const wrapper = document.createElement("span");
          wrapper.className = "custom-button-icon";
          wrapper.innerHTML = svg;
          iconEl = wrapper;
        }
      }
    }

    // Build text element (shared logic)
    let textEl: HTMLElement | null = null;
    if (hasText) {
      textEl = document.createElement("span");
      textEl.className = "custom-button-text";
      textEl.textContent = o.text;
    }

    // Thumb variant: render icon + text in iconPosition order
    if (o.variant === "thumb") {
      if (iconEl && textEl) {
        if (o.iconPosition === "left" || o.iconPosition === "top") {
          this.button.appendChild(iconEl);
          this.button.appendChild(textEl);
        } else {
          this.button.appendChild(textEl);
          this.button.appendChild(iconEl);
        }
      } else if (iconEl) {
        this.button.appendChild(iconEl);
      } else if (textEl) {
        this.button.appendChild(textEl);
      }
      this.button.setAttribute("aria-label", o.text || "thumb");
      return;
    }

    // Cell variant: render icon + text in iconPosition order
    if (o.variant === "cell") {
      if (iconEl && textEl) {
        if (o.iconPosition === "left" || o.iconPosition === "top") {
          this.button.appendChild(iconEl);
          this.button.appendChild(textEl);
        } else {
          this.button.appendChild(textEl);
          this.button.appendChild(iconEl);
        }
      } else if (iconEl) {
        this.button.appendChild(iconEl);
      } else if (textEl) {
        this.button.appendChild(textEl);
      }
      if (!hasText && !hasIcon) {
        this.button.setAttribute("aria-label", "cell");
      } else {
        this.button.setAttribute("aria-label", o.text || o.icon || "cell");
      }
      return;
    }

    // Standard variants (primary, secondary, outline, ghost)
    if (iconEl && textEl) {
      if (o.iconPosition === "left" || o.iconPosition === "top") {
        this.button.appendChild(iconEl);
        this.button.appendChild(textEl);
      } else {
        this.button.appendChild(textEl);
        this.button.appendChild(iconEl);
      }
    } else if (iconEl) {
      this.button.appendChild(iconEl);
    } else if (textEl) {
      this.button.appendChild(textEl);
    }

    if (iconEl && !textEl) {
      this.button.setAttribute("aria-label", o.icon || "button");
    } else {
      this.button.removeAttribute("aria-label");
    }
  }
}