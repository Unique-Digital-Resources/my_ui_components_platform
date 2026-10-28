"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Theme token model — the single source of truth for the design system.
 *
 * REDesign (Task 49):
 *  - Radii: per-corner editing (top-left, top-right, bottom-right, bottom-left)
 *  - Borders: per-side editing (top, right, bottom, left) — width + color + style
 *  - Variants: predefined enum tokens (button-variant: primary/secondary/…)
 *    PLUS user-defined custom variants. Users can add, edit, remove tokens.
 *  - Target specificity: styling applies at base, class, or id level (CSS cascade).
 *    Priority: id > class > base.
 *
 * The store persists to localStorage and applies itself to the document root
 * as CSS custom properties.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** A variant token group — e.g. "button-variant" with values primary/secondary/ghost + custom. */
export interface VariantGroup {
  /** Token name without `--` prefix, e.g. "button-variant". */
  name: string;
  /** Human-readable label, e.g. "Button Variant". */
  label: string;
  /** Predefined enum values (the "options"). */
  options: string[];
  /** Currently selected value (which option is active). */
  current: string;
  /** User-defined custom values (not in the predefined options). */
  custom: string[];
}

/** Per-corner radius values. */
export interface CornerRadii {
  "radius-sm-tl": string;
  "radius-sm-tr": string;
  "radius-sm-br": string;
  "radius-sm-bl": string;
  "radius-md-tl": string;
  "radius-md-tr": string;
  "radius-md-br": string;
  "radius-md-bl": string;
  "radius-lg-tl": string;
  "radius-lg-tr": string;
  "radius-lg-br": string;
  "radius-lg-bl": string;
  "radius-xl-tl": string;
  "radius-xl-tr": string;
  "radius-xl-br": string;
  "radius-xl-bl": string;
}

/** Per-side border definition. */
export interface BorderSide {
  width: string;
  color: string;
  style: string;
}

/** Per-side borders for a token (e.g. border-default, border-emphasis). */
export interface BorderToken {
  name: string;
  top: BorderSide;
  right: BorderSide;
  bottom: BorderSide;
  left: BorderSide;
}

export interface ThemeTokens {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  margin: Record<string, string>;
  marginSides: Record<string, string>; // per-side overrides: margin-1-top, etc.
  padding: Record<string, string>;
  paddingSides: Record<string, string>; // per-side overrides: padding-1-top, etc.
  radii: Record<string, string>; // base radius tokens (sm/md/lg/xl/pill)
  corners: CornerRadii; // per-corner overrides
  typography: Record<string, string>;
  shadows: Record<string, string>;
  motion: Record<string, string>;
  borders: BorderToken[]; // per-side border definitions
  variants: VariantGroup[]; // predefined + custom variant tokens
  custom: Record<string, string>;
}

/** Target specificity levels — like CSS cascade. */
export type Specificity = "base" | "class" | "id";

export interface Target {
  specificity: Specificity;
  /** For class: e.g. "thumb", "cell". For id: e.g. "min-thumb". */
  name: string;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

export const DEFAULT_TOKENS: ThemeTokens = {
  colors: {
    "brand-black": "#101014",
    "brand-purple": "#211A30",
    "brand-purple-strong": "#342348",
    "brand-purple-soft": "#B9A0FF",
    "brand-lemon": "#D9FF66",
    "brand-lemon-hover": "#C8F34F",
    background: "#101014",
    foreground: "#F4F1FF",
    card: "#211A30",
    "card-foreground": "#F4F1FF",
    popover: "#1A1422",
    "popover-foreground": "#F4F1FF",
    primary: "#D9FF66",
    "primary-foreground": "#17151D",
    secondary: "#2A2238",
    "secondary-foreground": "#F4F1FF",
    muted: "#2A2238",
    "muted-foreground": "#B8B2CA",
    accent: "#342348",
    "accent-foreground": "#F4F1FF",
    destructive: "#FF858B",
    border: "#383343",
    input: "#383343",
    ring: "#D9FF66",
    success: "#8FE3A5",
    warning: "#FFD36B",
    error: "#FF858B",
    info: "#91B8FF",
  },
  spacing: {
    "space-0": "0px",
    "space-1": "4px",
    "space-2": "8px",
    "space-3": "12px",
    "space-4": "16px",
    "space-5": "20px",
    "space-6": "24px",
    "space-8": "32px",
    "space-10": "40px",
    "space-12": "48px",
    "space-16": "64px",
  },
  margin: {
    "margin-0": "0px",
    "margin-1": "4px",
    "margin-2": "8px",
    "margin-3": "12px",
    "margin-4": "16px",
    "margin-6": "24px",
    "margin-8": "32px",
    "margin-auto": "auto",
  },
  marginSides: {}, // per-side overrides filled at runtime
  padding: {
    "padding-0": "0px",
    "padding-1": "4px",
    "padding-2": "8px",
    "padding-3": "12px",
    "padding-4": "16px",
    "padding-6": "24px",
    "padding-8": "32px",
  },
  paddingSides: {}, // per-side overrides filled at runtime
  radii: {
    "radius-sm": "4px",
    "radius-md": "8px",
    "radius-lg": "12px",
    "radius-xl": "16px",
    "radius-pill": "999px",
  },
  corners: {
    "radius-sm-tl": "4px",
    "radius-sm-tr": "4px",
    "radius-sm-br": "4px",
    "radius-sm-bl": "4px",
    "radius-md-tl": "8px",
    "radius-md-tr": "8px",
    "radius-md-br": "8px",
    "radius-md-bl": "8px",
    "radius-lg-tl": "12px",
    "radius-lg-tr": "12px",
    "radius-lg-br": "12px",
    "radius-lg-bl": "12px",
    "radius-xl-tl": "16px",
    "radius-xl-tr": "16px",
    "radius-xl-br": "16px",
    "radius-xl-bl": "16px",
  },
  typography: {
    "font-sans": "var(--font-inter)",
    "font-mono": "var(--font-jetbrains)",
    "text-xs": "12px",
    "text-sm": "13px",
    "text-base": "14px",
    "text-lg": "16px",
    "text-xl": "20px",
    "text-2xl": "24px",
    "text-3xl": "32px",
    "font-normal": "400",
    "font-medium": "500",
    "font-semibold": "600",
    "font-bold": "700",
    "leading-tight": "1.2",
    "leading-normal": "1.5",
    "leading-loose": "1.75",
    "tracking-tight": "-0.01em",
    "tracking-normal": "0",
    "tracking-wide": "0.05em",
  },
  shadows: {
    "shadow-sm": "0 1px 2px rgba(0,0,0,0.2)",
    "shadow-md": "0 4px 12px -2px rgba(0,0,0,0.3)",
    "shadow-lg": "0 8px 32px -12px rgba(0,0,0,0.4)",
    "shadow-glow": "0 0 24px rgba(217,255,102,0.3)",
  },
  motion: {
    "motion-fast": "120ms",
    "motion-standard": "180ms",
    "motion-emphasis": "260ms",
    "ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
    "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
    "ease-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  borders: [
    {
      name: "border-default",
      top: { width: "1px", color: "var(--border)", style: "solid" },
      right: { width: "1px", color: "var(--border)", style: "solid" },
      bottom: { width: "1px", color: "var(--border)", style: "solid" },
      left: { width: "1px", color: "var(--border)", style: "solid" },
    },
    {
      name: "border-emphasis",
      top: { width: "2px", color: "var(--brand-lemon)", style: "solid" },
      right: { width: "2px", color: "var(--brand-lemon)", style: "solid" },
      bottom: { width: "2px", color: "var(--brand-lemon)", style: "solid" },
      left: { width: "2px", color: "var(--brand-lemon)", style: "solid" },
    },
  ],
  variants: [],
  custom: {},
};

export type TokenCategory = keyof ThemeTokens;

/* ------------------------------------------------------------------ */
/* Category metadata                                                   */
/* ------------------------------------------------------------------ */

export const TOKEN_CATEGORIES: { id: TokenCategory; label: string; description: string }[] = [
  { id: "colors", label: "Colors", description: "Semantic + brand color tokens" },
  { id: "spacing", label: "Spacing", description: "Spacing scale (padding, margin, gap)" },
  { id: "radii", label: "Radii", description: "Border-radius — per-corner editable" },
  { id: "typography", label: "Typography", description: "Fonts, sizes, weights, line-height" },
  { id: "shadows", label: "Shadows", description: "Box-shadow elevation tokens" },
  { id: "motion", label: "Motion", description: "Transition durations + easing curves" },
  { id: "borders", label: "Borders", description: "Per-side border width/color/style" },
  { id: "variants", label: "Variants", description: "Predefined enums + custom values" },
  { id: "custom", label: "Custom", description: "User-defined tokens" },
];

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

interface ThemeTokenState {
  tokens: ThemeTokens;
  applied: boolean;
  /** Current target for styling (base/class/id). */
  target: Target;
  _hydrated: boolean;

  // Generic token CRUD
  setToken: (category: "colors" | "spacing" | "margin" | "padding" | "typography" | "shadows" | "motion" | "custom", name: string, value: string) => void;
  addToken: (category: "colors" | "spacing" | "margin" | "padding" | "typography" | "shadows" | "motion" | "custom", name: string, value: string) => void;
  removeToken: (category: "colors" | "spacing" | "margin" | "padding" | "typography" | "shadows" | "motion" | "custom", name: string) => void;
  renameToken: (category: "colors" | "spacing" | "margin" | "padding" | "typography" | "shadows" | "motion" | "custom", oldName: string, newName: string) => void;

  // Per-side margin (top/right/bottom/left)
  setMarginSide: (name: string, side: "top" | "right" | "bottom" | "left", value: string) => void;
  removeMargin: (name: string) => void;
  renameMargin: (oldName: string, newName: string) => void;

  // Per-side padding (top/right/bottom/left)
  setPaddingSide: (name: string, side: "top" | "right" | "bottom" | "left", value: string) => void;
  removePadding: (name: string) => void;
  renamePadding: (oldName: string, newName: string) => void;

  // Per-corner radii
  setCorner: (key: keyof CornerRadii, value: string) => void;
  setRadius: (name: string, value: string) => void;
  removeRadius: (name: string) => void;
  renameRadius: (oldName: string, newName: string) => void;

  // Per-side borders
  setBorderSide: (index: number, side: "top" | "right" | "bottom" | "left", field: "width" | "color" | "style", value: string) => void;
  addBorder: () => void;
  removeBorder: (index: number) => void;
  renameBorder: (index: number, newName: string) => void;

  // Variants
  setVariantCurrent: (index: number, value: string) => void;
  addVariantOption: (index: number, value: string) => void;
  removeVariantOption: (index: number, value: string) => void;
  addVariantGroup: (name: string, label: string, options: string[]) => void;
  removeVariantGroup: (index: number) => void;

  // Target
  setTarget: (target: Target) => void;

  // Apply / clear
  applyToDocument: () => void;
  clearFromDocument: () => void;
  setApplied: (applied: boolean) => void;

  // Reset
  resetCategory: (category: TokenCategory) => void;
  resetAll: () => void;

  // Import / export
  importTokens: (tokens: ThemeTokens) => void;
  exportAsCss: () => string;
  exportAsJson: () => string;
  exportAsTailwind: () => string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function applyTokensToRoot(tokens: ThemeTokens): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Flat categories
  for (const cat of ["colors", "spacing", "margin", "padding", "radii", "typography", "shadows", "motion", "custom"] as const) {
    const obj = tokens[cat] as Record<string, string>;
    for (const [name, value] of Object.entries(obj)) {
      root.style.setProperty(`--${name}`, value);
    }
  }
  // Per-corner radii
  for (const [name, value] of Object.entries(tokens.corners)) {
    root.style.setProperty(`--${name}`, value);
  }
  // Per-side margin overrides
  for (const [name, value] of Object.entries(tokens.marginSides)) {
    root.style.setProperty(`--${name}`, value);
  }
  // Per-side padding overrides
  for (const [name, value] of Object.entries(tokens.paddingSides)) {
    root.style.setProperty(`--${name}`, value);
  }
  // Borders → emit per-side custom properties + a combined shorthand
  for (const border of tokens.borders) {
    root.style.setProperty(`--${border.name}-top-width`, border.top.width);
    root.style.setProperty(`--${border.name}-right-width`, border.right.width);
    root.style.setProperty(`--${border.name}-bottom-width`, border.bottom.width);
    root.style.setProperty(`--${border.name}-left-width`, border.left.width);
    root.style.setProperty(`--${border.name}-top-color`, border.top.color);
    root.style.setProperty(`--${border.name}-right-color`, border.right.color);
    root.style.setProperty(`--${border.name}-bottom-color`, border.bottom.color);
    root.style.setProperty(`--${border.name}-left-color`, border.left.color);
    root.style.setProperty(`--${border.name}-color`, border.top.color);
    root.style.setProperty(`--${border.name}-width`, border.top.width);
  }
  // Variants → emit current value as a custom property
  for (const v of tokens.variants) {
    root.style.setProperty(`--${v.name}`, v.current);
  }
}

function clearTokensFromRoot(tokens: ThemeTokens): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const cat of ["colors", "spacing", "margin", "padding", "radii", "typography", "shadows", "motion", "custom"] as const) {
    const obj = tokens[cat] as Record<string, string>;
    for (const name of Object.keys(obj)) {
      root.style.removeProperty(`--${name}`);
    }
  }
  for (const name of Object.keys(tokens.corners)) {
    root.style.removeProperty(`--${name}`);
  }
  for (const name of Object.keys(tokens.marginSides)) {
    root.style.removeProperty(`--${name}`);
  }
  for (const name of Object.keys(tokens.paddingSides)) {
    root.style.removeProperty(`--${name}`);
  }
  for (const border of tokens.borders) {
    for (const side of ["top", "right", "bottom", "left"]) {
      root.style.removeProperty(`--${border.name}-${side}-width`);
      root.style.removeProperty(`--${border.name}-${side}-color`);
    }
    root.style.removeProperty(`--${border.name}-color`);
    root.style.removeProperty(`--${border.name}-width`);
  }
  for (const v of tokens.variants) {
    root.style.removeProperty(`--${v.name}`);
  }
}

/** Re-apply a single token to the document (if applied). */
function reapplyIfApplied(state: ThemeTokenState, name: string, value: string): void {
  if (state.applied && typeof document !== "undefined") {
    document.documentElement.style.setProperty(`--${name}`, value);
  }
}

export const useThemeTokens = create<ThemeTokenState>()(
  persist(
    (set, get) => ({
      tokens: DEFAULT_TOKENS,
      applied: false,
      target: { specificity: "base", name: "" },
      _hydrated: false,

      /* ---- Generic token CRUD ---- */
      setToken: (category, name, value) =>
        set((s) => {
          const tokens = { ...s.tokens, [category]: { ...s.tokens[category], [name]: value } };
          reapplyIfApplied(s, name, value);
          return { tokens };
        }),

      addToken: (category, name, value) =>
        set((s) => {
          const tokens = { ...s.tokens, [category]: { ...s.tokens[category], [name]: value } };
          reapplyIfApplied(s, name, value);
          return { tokens };
        }),

      removeToken: (category, name) =>
        set((s) => {
          const next = { ...s.tokens[category] };
          delete next[name];
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.removeProperty(`--${name}`);
          }
          return { tokens: { ...s.tokens, [category]: next } };
        }),

      renameToken: (category, oldName, newName) =>
        set((s) => {
          const cat = { ...s.tokens[category] };
          const value = cat[oldName];
          if (value === undefined) return s;
          delete cat[oldName];
          cat[newName] = value;
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.removeProperty(`--${oldName}`);
            document.documentElement.style.setProperty(`--${newName}`, value);
          }
          return { tokens: { ...s.tokens, [category]: cat } };
        }),

      /* ---- Per-side margin ---- */
      setMarginSide: (name, side, value) =>
        set((s) => {
          const key = `${name}-${side}`;
          const marginSides = { ...s.tokens.marginSides, [key]: value };
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.setProperty(`--${key}`, value);
          }
          return { tokens: { ...s.tokens, marginSides } };
        }),

      removeMargin: (name) =>
        set((s) => {
          const margin = { ...s.tokens.margin };
          delete margin[name];
          const marginSides = { ...s.tokens.marginSides };
          for (const side of ["top", "right", "bottom", "left"]) {
            const key = `${name}-${side}`;
            if (key in marginSides) delete marginSides[key];
          }
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.removeProperty(`--${name}`);
            for (const side of ["top", "right", "bottom", "left"]) {
              document.documentElement.style.removeProperty(`--${name}-${side}`);
            }
          }
          return { tokens: { ...s.tokens, margin, marginSides } };
        }),

      renameMargin: (oldName, newName) =>
        set((s) => {
          if (oldName === newName || !newName.trim()) return s;
          const margin = { ...s.tokens.margin };
          const marginSides = { ...s.tokens.marginSides };
          const value = margin[oldName];
          if (value === undefined) return s;
          delete margin[oldName];
          margin[newName] = value;
          for (const side of ["top", "right", "bottom", "left"]) {
            const oldKey = `${oldName}-${side}`;
            const newKey = `${newName}-${side}`;
            if (oldKey in marginSides) {
              marginSides[newKey] = marginSides[oldKey];
              delete marginSides[oldKey];
            }
          }
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.removeProperty(`--${oldName}`);
            document.documentElement.style.setProperty(`--${newName}`, value);
            for (const side of ["top", "right", "bottom", "left"]) {
              document.documentElement.style.removeProperty(`--${oldName}-${side}`);
            }
          }
          return { tokens: { ...s.tokens, margin, marginSides } };
        }),

      /* ---- Per-side padding ---- */
      setPaddingSide: (name, side, value) =>
        set((s) => {
          const key = `${name}-${side}`;
          const paddingSides = { ...s.tokens.paddingSides, [key]: value };
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.setProperty(`--${key}`, value);
          }
          return { tokens: { ...s.tokens, paddingSides } };
        }),

      removePadding: (name) =>
        set((s) => {
          const padding = { ...s.tokens.padding };
          delete padding[name];
          const paddingSides = { ...s.tokens.paddingSides };
          for (const side of ["top", "right", "bottom", "left"]) {
            const key = `${name}-${side}`;
            if (key in paddingSides) delete paddingSides[key];
          }
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.removeProperty(`--${name}`);
            for (const side of ["top", "right", "bottom", "left"]) {
              document.documentElement.style.removeProperty(`--${name}-${side}`);
            }
          }
          return { tokens: { ...s.tokens, padding, paddingSides } };
        }),

      renamePadding: (oldName, newName) =>
        set((s) => {
          if (oldName === newName || !newName.trim()) return s;
          const padding = { ...s.tokens.padding };
          const paddingSides = { ...s.tokens.paddingSides };
          const value = padding[oldName];
          if (value === undefined) return s;
          delete padding[oldName];
          padding[newName] = value;
          for (const side of ["top", "right", "bottom", "left"]) {
            const oldKey = `${oldName}-${side}`;
            const newKey = `${newName}-${side}`;
            if (oldKey in paddingSides) {
              paddingSides[newKey] = paddingSides[oldKey];
              delete paddingSides[oldKey];
            }
          }
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.removeProperty(`--${oldName}`);
            document.documentElement.style.setProperty(`--${newName}`, value);
            for (const side of ["top", "right", "bottom", "left"]) {
              document.documentElement.style.removeProperty(`--${oldName}-${side}`);
            }
          }
          return { tokens: { ...s.tokens, padding, paddingSides } };
        }),

      /* ---- Per-corner radii ---- */
      setCorner: (key, value) =>
        set((s) => {
          const corners = { ...s.tokens.corners, [key]: value };
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.setProperty(`--${key}`, value);
          }
          return { tokens: { ...s.tokens, corners } };
        }),

      setRadius: (name, value) =>
        set((s) => {
          const radii = { ...s.tokens.radii, [name]: value };
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.setProperty(`--${name}`, value);
          }
          return { tokens: { ...s.tokens, radii } };
        }),

      removeRadius: (name) =>
        set((s) => {
          const radii = { ...s.tokens.radii };
          delete radii[name];
          // Also remove the 4 corner tokens for this radius
          const corners = { ...s.tokens.corners };
          for (const c of ["tl", "tr", "br", "bl"]) {
            const key = `${name}-${c}`;
            if (key in corners) delete corners[key as keyof CornerRadii];
          }
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.removeProperty(`--${name}`);
            for (const c of ["tl", "tr", "br", "bl"]) {
              document.documentElement.style.removeProperty(`--${name}-${c}`);
            }
          }
          return { tokens: { ...s.tokens, radii, corners } };
        }),

      renameRadius: (oldName, newName) =>
        set((s) => {
          if (oldName === newName || !newName.trim()) return s;
          const radii = { ...s.tokens.radii };
          const corners = { ...s.tokens.corners };
          const value = radii[oldName];
          if (value === undefined) return s;
          delete radii[oldName];
          radii[newName] = value;
          // Rename the 4 corner tokens
          for (const c of ["tl", "tr", "br", "bl"]) {
            const oldKey = `${oldName}-${c}` as keyof CornerRadii;
            const newKey = `${newName}-${c}` as keyof CornerRadii;
            if (oldKey in corners) {
              corners[newKey] = corners[oldKey];
              delete corners[oldKey];
            }
          }
          if (s.applied && typeof document !== "undefined") {
            document.documentElement.style.removeProperty(`--${oldName}`);
            document.documentElement.style.setProperty(`--${newName}`, value);
            for (const c of ["tl", "tr", "br", "bl"]) {
              document.documentElement.style.removeProperty(`--${oldName}-${c}`);
            }
          }
          return { tokens: { ...s.tokens, radii, corners } };
        }),

      /* ---- Per-side borders ---- */
      setBorderSide: (index, side, field, value) =>
        set((s) => {
          const borders = s.tokens.borders.map((b, i) => {
            if (i !== index) return b;
            return { ...b, [side]: { ...b[side], [field]: value } };
          });
          if (s.applied && typeof document !== "undefined") {
            const border = borders[index];
            document.documentElement.style.setProperty(`--${border.name}-${side}-${field === "width" ? "width" : field === "color" ? "color" : "width"}`, value);
            if (field === "color") {
              document.documentElement.style.setProperty(`--${border.name}-${side}-color`, value);
            } else if (field === "width") {
              document.documentElement.style.setProperty(`--${border.name}-${side}-width`, value);
            }
          }
          return { tokens: { ...s.tokens, borders } };
        }),

      addBorder: () =>
        set((s) => {
          const newBorder: BorderToken = {
            name: `border-custom-${s.tokens.borders.length + 1}`,
            top: { width: "1px", color: "var(--border)", style: "solid" },
            right: { width: "1px", color: "var(--border)", style: "solid" },
            bottom: { width: "1px", color: "var(--border)", style: "solid" },
            left: { width: "1px", color: "var(--border)", style: "solid" },
          };
          return { tokens: { ...s.tokens, borders: [...s.tokens.borders, newBorder] } };
        }),

      removeBorder: (index) =>
        set((s) => {
          const borders = s.tokens.borders.filter((_, i) => i !== index);
          return { tokens: { ...s.tokens, borders } };
        }),

      renameBorder: (index, newName) =>
        set((s) => {
          if (!newName.trim()) return s;
          const borders = s.tokens.borders.map((b, i) =>
            i === index ? { ...b, name: newName.trim() } : b,
          );
          return { tokens: { ...s.tokens, borders } };
        }),

      /* ---- Variants ---- */
      setVariantCurrent: (index, value) =>
        set((s) => {
          const variants = s.tokens.variants.map((v, i) =>
            i === index ? { ...v, current: value } : v,
          );
          if (s.applied && typeof document !== "undefined") {
            const v = variants[index];
            document.documentElement.style.setProperty(`--${v.name}`, value);
          }
          return { tokens: { ...s.tokens, variants } };
        }),

      addVariantOption: (index, value) =>
        set((s) => {
          const variants = s.tokens.variants.map((v, i) =>
            i === index ? { ...v, custom: [...v.custom, value] } : v,
          );
          return { tokens: { ...s.tokens, variants } };
        }),

      removeVariantOption: (index, value) =>
        set((s) => {
          const variants = s.tokens.variants.map((v, i) => {
            if (i !== index) return v;
            return {
              ...v,
              custom: v.custom.filter((c) => c !== value),
              options: v.options.filter((c) => c !== value),
              current: v.current === value ? v.options[0] ?? "" : v.current,
            };
          });
          return { tokens: { ...s.tokens, variants } };
        }),

      addVariantGroup: (name, label, options) =>
        set((s) => ({
          tokens: {
            ...s.tokens,
            variants: [
              ...s.tokens.variants,
              { name, label, options, current: options[0] ?? "", custom: [] },
            ],
          },
        })),

      removeVariantGroup: (index) =>
        set((s) => ({
          tokens: { ...s.tokens, variants: s.tokens.variants.filter((_, i) => i !== index) },
        })),

      /* ---- Target ---- */
      setTarget: (target) => set({ target }),

      /* ---- Apply / clear ---- */
      applyToDocument: () => {
        applyTokensToRoot(get().tokens);
        set({ applied: true });
      },

      clearFromDocument: () => {
        clearTokensFromRoot(get().tokens);
        set({ applied: false });
      },

      setApplied: (applied) => set({ applied }),

      /* ---- Reset ---- */
      resetCategory: (category) =>
        set((s) => {
          const tokens = { ...s.tokens, [category]: DEFAULT_TOKENS[category] };
          if (s.applied && typeof document !== "undefined") {
            if (category === "borders" || category === "variants" || category === "corners") {
              clearTokensFromRoot(s.tokens);
              applyTokensToRoot(tokens);
            } else {
              const oldObj = s.tokens[category] as Record<string, string>;
              for (const name of Object.keys(oldObj)) {
                document.documentElement.style.removeProperty(`--${name}`);
              }
              const newObj = DEFAULT_TOKENS[category] as Record<string, string>;
              for (const [name, value] of Object.entries(newObj)) {
                document.documentElement.style.setProperty(`--${name}`, value);
              }
            }
          }
          return { tokens };
        }),

      resetAll: () => {
        const prev = get().tokens;
        if (get().applied && typeof document !== "undefined") {
          clearTokensFromRoot(prev);
          applyTokensToRoot(DEFAULT_TOKENS);
        }
        set({ tokens: DEFAULT_TOKENS });
      },

      /* ---- Import / export ---- */
      importTokens: (tokens) => {
        set({ tokens });
        if (get().applied && typeof document !== "undefined") {
          clearTokensFromRoot(get().tokens);
          applyTokensToRoot(tokens);
        }
      },

      exportAsCss: () => {
        const t = get().tokens;
        const lines: string[] = [":root {"];
        for (const cat of ["colors", "spacing", "margin", "padding", "radii", "typography", "shadows", "motion", "custom"] as const) {
          for (const [name, value] of Object.entries(t[cat] as Record<string, string>)) {
            lines.push(`  --${name}: ${value};`);
          }
        }
        for (const [name, value] of Object.entries(t.corners)) {
          lines.push(`  --${name}: ${value};`);
        }
        for (const [name, value] of Object.entries(t.marginSides)) {
          lines.push(`  --${name}: ${value};`);
        }
        for (const [name, value] of Object.entries(t.paddingSides)) {
          lines.push(`  --${name}: ${value};`);
        }
        for (const border of t.borders) {
          for (const side of ["top", "right", "bottom", "left"]) {
            lines.push(`  --${border.name}-${side}-width: ${border[side as "top"].width};`);
            lines.push(`  --${border.name}-${side}-color: ${border[side as "top"].color};`);
          }
        }
        for (const v of t.variants) {
          lines.push(`  --${v.name}: ${v.current};`);
        }
        lines.push("}");
        return lines.join("\n");
      },

      exportAsJson: () => JSON.stringify(get().tokens, null, 2),

      exportAsTailwind: () => {
        const t = get().tokens;
        const colors: Record<string, string> = {};
        for (const [name, value] of Object.entries(t.colors)) {
          colors[name.replace(/^brand-/, "")] = `var(--${name})`;
        }
        const spacing: Record<string, string> = {};
        for (const [name, value] of Object.entries(t.spacing)) {
          spacing[name.replace(/^space-/, "")] = value;
        }
        const radii: Record<string, string> = {};
        for (const [name, value] of Object.entries(t.radii)) {
          radii[name.replace(/^radius-/, "")] = value;
        }
        return JSON.stringify(
          {
            theme: {
              extend: {
                colors,
                spacing,
                borderRadius: radii,
                fontFamily: { sans: "var(--font-sans)", mono: "var(--font-mono)" },
                boxShadow: Object.fromEntries(
                  Object.entries(t.shadows).map(([k, v]) => [k.replace(/^shadow-/, ""), v]),
                ),
                transitionDuration: Object.fromEntries(
                  Object.entries(t.motion)
                    .filter(([k]) => k.startsWith("motion-"))
                    .map(([k, v]) => [k.replace(/^motion-/, ""), v]),
                ),
              },
            },
          },
          null,
          2,
        );
      },
    }),
    {
      name: "workshop-theme-tokens",
      // Deep-merge persisted state with defaults so new schema fields
      // (corners, borders, variants) are filled in when a user has an
      // old persisted state from a previous version.
      merge: (persisted, current) => {
        const p = (persisted as Partial<ThemeTokenState>) ?? {};
        const pTokens = (p.tokens ?? {}) as Partial<ThemeTokens>;
        const dTokens = DEFAULT_TOKENS;
        // Deep-merge each token category: persisted wins, but missing
        // keys fall back to defaults.
        const mergedTokens: ThemeTokens = {
          colors: { ...dTokens.colors, ...pTokens.colors },
          spacing: { ...dTokens.spacing, ...pTokens.spacing },
          margin: { ...dTokens.margin, ...(pTokens as Partial<ThemeTokens>).margin },
          marginSides: { ...dTokens.marginSides, ...(pTokens as Partial<ThemeTokens>).marginSides },
          padding: { ...dTokens.padding, ...(pTokens as Partial<ThemeTokens>).padding },
          paddingSides: { ...dTokens.paddingSides, ...(pTokens as Partial<ThemeTokens>).paddingSides },
          radii: { ...dTokens.radii, ...pTokens.radii },
          corners: { ...dTokens.corners, ...pTokens.corners },
          typography: { ...dTokens.typography, ...pTokens.typography },
          shadows: { ...dTokens.shadows, ...pTokens.shadows },
          motion: { ...dTokens.motion, ...pTokens.motion },
          // Arrays: use persisted if present and non-empty, else defaults
          borders: Array.isArray(pTokens.borders) && pTokens.borders.length > 0
            ? pTokens.borders
            : dTokens.borders,
          variants: Array.isArray(pTokens.variants) && pTokens.variants.length > 0
            ? pTokens.variants
            : dTokens.variants,
          custom: { ...dTokens.custom, ...pTokens.custom },
        };
        return {
          ...current,
          ...p,
          tokens: mergedTokens,
          _hydrated: true,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hydrated = true;
          if (state.applied) {
            applyTokensToRoot(state.tokens);
          }
        }
      },
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Value type detection helpers                                        */
/* ------------------------------------------------------------------ */

export function isColorValue(value: string): boolean {
  return /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(|hsla?\(|var\(--brand|var\(--background|var\(--foreground|var\(--card|var\(--popover|var\(--primary|var\(--secondary|var\(--muted|var\(--accent|var\(--destructive|var\(--success|var\(--warning|var\(--error|var\(--info|var\(--ring|var\(--border|var\(--input)/i.test(
    value,
  );
}

export function isDimensionValue(value: string): boolean {
  return /^-?\d+(\.\d+)?(px|rem|em|vh|vw|%|fr)$/.test(value);
}

export function isDurationValue(value: string): boolean {
  return /^\d+(ms|s)$/.test(value);
}

export function isNumericValue(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value);
}

/** Known target class names for the class/id selector (from the component library). */
export const KNOWN_TARGET_CLASSES = [
  { value: "", label: "(base — all elements)" },
  { value: "thumb", label: ".thumb (range thumbs)" },
  { value: "cell", label: ".cell (calendar cells)" },
  { value: "custom-button-root", label: ".custom-button-root" },
  { value: "cal-cell", label: ".cal-cell (calendar day)" },
  { value: "panel", label: ".panel" },
];

export const KNOWN_TARGET_IDS = [
  { value: "", label: "(no id)" },
  { value: "min-thumb", label: "#min-thumb (periodic range min)" },
  { value: "max-thumb", label: "#max-thumb (periodic range max)" },
  { value: "today-cell", label: "#today-cell (calendar today)" },
];
