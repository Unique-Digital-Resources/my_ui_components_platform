/**
 * Harmony Engine — Adobe Color-style harmony rules with custom rule support.
 *
 * Each rule defines color positions as hue offsets (degrees) from the base.
 * The base color is always at offset 0 (middle of the palette).
 *
 * Built-in rules: Custom, Analogous, Complementary, Split complementary,
 * Triad, Square, Compound, Shades, Monochromatic.
 *
 * Custom rules: users can define their own rules with arbitrary offsets.
 * The engine maintains a mutable registry of custom rules that can be
 * added to at runtime.
 *
 * Harmony geometry is visualized as RADIAL LINES from each thumb to the
 * center of the circle — not between thumbs. This makes the angular
 * relationship of each color to the base (at center) visually clear.
 */

export type HarmonyRule = string; // built-in IDs or custom IDs

export interface HarmonyDefinition {
  id: HarmonyRule;
  label: string;
  /** Hue offsets (degrees) from the base. The base (offset 0) is included. */
  offsets: number[];
  /** If true, all colors share the base hue; variation is in S/L. */
  variesTone?: boolean;
  /** If true, only lightness varies (saturation stays at max). */
  variesLightnessOnly?: boolean;
  /** Whether this is a user-defined custom rule. */
  isCustom?: boolean;
  description: string;
}

/**
 * Built-in harmony rules (9, matching Adobe Color).
 */
export const BUILT_IN_RULES: Record<string, HarmonyDefinition> = {
  custom: {
    id: "custom",
    label: "Custom",
    offsets: [0],
    description: "Each color positioned independently — no constraints.",
  },
  analogous: {
    id: "analogous",
    label: "Analogous",
    offsets: [-30, -15, 0, 15, 30],
    description: "Colors neighboring the base on the wheel (±30°).",
  },
  complementary: {
    id: "complementary",
    label: "Complementary",
    offsets: [0, 180],
    description: "Base and its opposite (180°).",
  },
  "split-complementary": {
    id: "split-complementary",
    label: "Split Complementary",
    offsets: [0, 150, 210],
    description: "Base plus two colors adjacent to its complement.",
  },
  triad: {
    id: "triad",
    label: "Triad",
    offsets: [0, 120, 240],
    description: "Three hues at 120° intervals.",
  },
  square: {
    id: "square",
    label: "Square",
    offsets: [0, 90, 180, 270],
    description: "Four hues at 90° intervals.",
  },
  compound: {
    id: "compound",
    label: "Compound",
    offsets: [0, 30, 150, 180, 210],
    description: "A flexible mix of related and contrasting hues.",
  },
  shades: {
    id: "shades",
    label: "Shades",
    offsets: [0, 0, 0],
    variesTone: true,
    variesLightnessOnly: true,
    description: "Base hue with different darkness values.",
  },
  monochromatic: {
    id: "monochromatic",
    label: "Monochromatic",
    offsets: [0, 0, 0, 0, 0],
    variesTone: true,
    description: "One hue with varied saturation and lightness.",
  },
};

/** Mutable registry of custom user-defined rules. */
const customRules = new Map<string, HarmonyDefinition>();

/** Ordered list of built-in rule IDs for UI rendering. */
export const BUILT_IN_RULE_ORDER: string[] = [
  "custom", "analogous", "complementary", "split-complementary",
  "triad", "square", "compound", "shades", "monochromatic",
];

/** Index of the base color in the palette (always the one at offset 0). */
export const BASE_OFFSET_INDEX = 0;

/** Normalize a hue to [0, 360). */
export function wrapHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/** Get a rule definition by ID (built-in or custom). */
export function getRule(id: HarmonyRule): HarmonyDefinition | undefined {
  return BUILT_IN_RULES[id] ?? customRules.get(id);
}

/** Get all available rules (built-in + custom) for UI rendering. */
export function getAllRules(): HarmonyDefinition[] {
  const builtIn = BUILT_IN_RULE_ORDER.map((id) => BUILT_IN_RULES[id]);
  const custom = Array.from(customRules.values());
  return [...builtIn, ...custom];
}

/**
 * Define a custom harmony rule. Returns the rule ID.
 * If a rule with the same label exists, it's overwritten.
 */
export function defineCustomRule(
  label: string,
  offsets: number[],
  options?: { variesTone?: boolean; variesLightnessOnly?: boolean; description?: string },
): HarmonyDefinition {
  const id = `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const def: HarmonyDefinition = {
    id,
    label,
    offsets: offsets.length > 0 ? offsets : [0],
    variesTone: options?.variesTone,
    variesLightnessOnly: options?.variesLightnessOnly,
    isCustom: true,
    description: options?.description ?? `User-defined rule: ${label}`,
  };
  customRules.set(id, def);
  return def;
}

/** Remove a custom rule by ID. */
export function removeCustomRule(id: HarmonyRule): boolean {
  return customRules.delete(id);
}

/** Get all custom rules. */
export function getCustomRules(): HarmonyDefinition[] {
  return Array.from(customRules.values());
}

/**
 * Generate hues from a base hue and a rule.
 * The base hue corresponds to offset 0.
 */
export function generateHues(baseHue: number, rule: HarmonyRule): number[] {
  const def = getRule(rule);
  if (!def) return [wrapHue(baseHue)];
  return def.offsets.map((offset) => wrapHue(baseHue + offset));
}

/**
 * Default saturations (0–1) for a rule.
 */
export function defaultSaturations(rule: HarmonyRule): number[] {
  const def = getRule(rule);
  if (!def) return [1.0];
  if (def.variesTone && !def.variesLightnessOnly) {
    const n = def.offsets.length;
    return def.offsets.map((_, i) => 0.3 + (i / (n - 1 || 1)) * 0.7);
  }
  return def.offsets.map(() => 1.0);
}

/**
 * Default lightness values (0–100, HSL L) for a rule.
 */
export function defaultLightnesses(rule: HarmonyRule): number[] {
  const def = getRule(rule);
  if (!def) return [50];
  if (def.variesLightnessOnly) {
    const n = def.offsets.length;
    return def.offsets.map((_, i) => 20 + (i / (n - 1 || 1)) * 60);
  }
  if (def.variesTone) {
    const n = def.offsets.length;
    return def.offsets.map((_, i) => 35 + (i / (n - 1 || 1)) * 30);
  }
  return def.offsets.map(() => 50);
}

/**
 * Compute the signed angular delta from `from` to `to`, normalized to
 * [-180, 180].
 */
export function hueDelta(from: number, to: number): number {
  let d = wrapHue(to - from);
  if (d > 180) d -= 360;
  return d;
}

/** Check if a rule constrains marker positions (non-custom). */
export function isConstrained(rule: HarmonyRule): boolean {
  return rule !== "custom";
}
