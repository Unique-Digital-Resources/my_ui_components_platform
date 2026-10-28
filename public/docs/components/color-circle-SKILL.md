# SKILL.md — Color Circle

A vanilla JavaScript Adobe Color-style circular color picker. Multiple color
slots arranged on a wheel, governed by a harmony rule. Each marker is a 2D
picker (hue = angle, saturation = radius). Built-in harmony rules plus
user-defined custom rules. Canvas-based, pointer + keyboard interaction,
framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  ColorCircle,
  type ColorCircleOptions,
  type ColorCircleOutput,
  type HarmonyRule,
  type GridMode,
  // harmony engine helpers
  defineCustomRule,
  getRule,
  getAllRules,
  generateHues,
} from "@/lib/components/color-circle";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const circle = new ColorCircle(document.getElementById("circle")!, {
  harmony: "triad",
  baseHue: 210,
  size: 280,
});

circle.on("change", (out) => {
  console.log(out.baseHue);        // 210
  console.log(out.harmony);        // "triad"
  console.log(out.colors.length);  // 3
  for (const c of out.colors) console.log(c.hex, c.isBase, c.isLocked);
});

// define a custom rule at runtime
defineCustomRule("Brand Quad", [0, 90, 180, 270]);
circle.setHarmony("custom-brand-quad");

circle.destroy();
```

---

## Constructor

```ts
new ColorCircle(container: HTMLElement, options?: ColorCircleOptions)
```

### Options

| Option              | Type                              | Default     | Description                                                       |
|---------------------|-----------------------------------|-------------|-------------------------------------------------------------------|
| `harmony`           | `HarmonyRule` (string)            | `"triad"`   | Harmony rule ID. Built-in or custom.                              |
| `baseHue`           | `number`                          | `210`       | Initial base hue (0-360).                                         |
| `size`              | `number`                          | `240`       | Component diameter in CSS pixels. Min 80.                         |
| `snapping`          | `boolean`                         | `false`     | Snap markers to angular divisions + saturation rings.             |
| `gridMode`          | `"dots" \| "lines" \| "none"`     | `"dots"`    | How to visualize the snapping grid.                               |
| `gridDivisions`     | `number`                          | `12`        | Number of angular divisions (e.g. 12 = 30° steps). Min 2.         |
| `showHarmonyLinks`  | `boolean`                         | `true`      | Draw radial lines from each marker to the center.                 |

### Built-in harmony rules

| ID                     | Label                | Offsets (degrees from base)            |
|------------------------|----------------------|----------------------------------------|
| `custom`               | Custom               | `[0]` (each marker independent)        |
| `analogous`            | Analogous            | `[-30, -15, 0, 15, 30]`               |
| `complementary`        | Complementary        | `[0, 180]`                            |
| `split-complementary`  | Split Complementary  | `[0, 150, 210]`                       |
| `triad`                | Triad                | `[0, 120, 240]`                       |
| `square`               | Square               | `[0, 90, 180, 270]`                   |
| `compound`             | Compound             | `[0, 30, 150, 180, 210]`              |
| `shades`               | Shades               | `[0, 0, 0]` (lightness varies)        |
| `monochromatic`        | Monochromatic        | `[0, 0, 0, 0, 0]` (S+L vary)          |

---

## Public Methods

| Method                          | Returns                | Description                                                          |
|---------------------------------|------------------------|----------------------------------------------------------------------|
| `getColors()`                   | `ColorEntry[]`         | All palette entries (clones).                                        |
| `getBaseIndex()`                | `number`               | Index of the base color in the palette.                              |
| `getBaseHue()`                  | `number`               | Current base hue (0-360).                                            |
| `getHarmony()`                  | `HarmonyRule`          | Current rule ID.                                                     |
| `getOutput()`                   | `ColorCircleOutput`    | Full output: baseHue, baseIndex, harmony, colors with hex/rgb/hsv/hsl. |
| `setHarmony(rule)`              | `void`                 | Switch rule. Preserves the current base hue; resets saturations.     |
| `lockColor(i)`                  | `void`                 | Lock color `i` (won't move when base moves).                         |
| `unlockColor(i)`                | `void`                 | Unlock color `i`.                                                    |
| `isLocked(i)`                   | `boolean`              | Is color `i` locked?                                                 |
| `addColor(index, hue?, sat?)`   | `void`                 | Insert a new color at `index`. Defaults: base hue, sat=1.            |
| `removeColor(i)`                | `void`                 | Remove color `i`. Cannot remove the base.                            |
| `setSize(n)`                    | `void`                 | Change the component diameter.                                       |
| `setSnapping(on)`               | `void`                 | Toggle snapping.                                                     |
| `setGridMode(mode)`             | `void`                 | Change the grid visualization.                                       |
| `setGridDivisions(n)`           | `void`                 | Change the number of angular divisions.                              |
| `setShowHarmonyLinks(on)`       | `void`                 | Toggle radial links.                                                 |
| `on(event, handler)`            | `void`                 | Subscribe to `input` or `change`.                                    |
| `off(event, handler)`           | `void`                 | Unsubscribe.                                                          |
| `destroy()`                     | `void`                 | Tear down. Idempotent.                                               |

### Output shape

```ts
interface ColorCircleOutput {
  baseHue: number;
  baseIndex: number;
  harmony: HarmonyRule;
  colors: Array<{
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsv: { h: number; s: number; v: number };
    hsl: { h: number; s: number; l: number };
    isBase: boolean;
    isLocked: boolean;
    saturation: number;  // 0-1
    lightness: number;   // 0-100
    offset: number;      // hue delta from base
  }>;
}
```

---

## Events

| Event    | Payload             | When it fires                                                                |
|----------|---------------------|------------------------------------------------------------------------------|
| `input`  | `ColorCircleOutput` | Continuous — every pointer move while dragging a marker.                     |
| `change` | `ColorCircleOutput` | Committed — on `pointerup`/`pointercancel`, and on `setHarmony`/`addColor`/`removeColor`/`lockColor`/`unlockColor`. |

---

## Code Examples

### Triad palette

```ts
const circle = new ColorCircle(container, { harmony: "triad", baseHue: 30 });
circle.on("change", (out) => {
  // out.colors has 3 entries: base, +120°, +240°
  applyPalette(out.colors.map((c) => c.hex));
});
```

### Analogous palette with snapping

```ts
const circle = new ColorCircle(container, {
  harmony: "analogous",
  baseHue: 200,
  snapping: true,
  gridDivisions: 12,
  gridMode: "lines",
});
```

### Custom rule defined at runtime

```ts
import { defineCustomRule } from "@/lib/components/color-circle";

defineCustomRule("Brand Quad", [0, 90, 180, 270], {
  description: "Four-color brand palette at 90° intervals.",
});
const circle = new ColorCircle(container, { harmony: "custom-brand-quad" });
```

### Locking and unlocking

```ts
circle.lockColor(0);   // first color won't move when base moves
circle.unlockColor(0);
```

### Adding and removing colors

```ts
circle.addColor(2);          // insert at index 2 (defaults: base hue, sat=1)
circle.addColor(0, 180, 0.5); // insert at index 0 with hue 180, sat 0.5
circle.removeColor(3);       // remove index 3 (cannot remove base)
```

### React wrapper

```tsx
"use client";
import { ColorCircleReact } from "@/components/color-circle/color-circle-react";

export function Demo() {
  return (
    <ColorCircleReact
      harmony="split-complementary"
      baseHue={210}
      size={280}
      onChange={(out) => setPalette(out.colors.map((c) => c.hex))}
    />
  );
}
```

---

## Integration Notes

- **Plain HTML**: import the compiled `.js` file as an ES module. The class
  is the named export `ColorCircle`; the harmony helpers (`defineCustomRule`,
  `getRule`, `getAllRules`, `generateHues`) are also exported.
- **React**: use the wrapper at
  `src/components/color-circle/color-circle-react.tsx`.
- **Custom rules are global**: `defineCustomRule` adds to a module-level
  registry. Rules persist across component instances within the same JS
  context. To clear custom rules, call `removeCustomRule(id)`.
- **Locking**: locked markers don't move when the base moves, but they can
  still be dragged individually. Use `isLocked(i)` to check state.
- **Snapping**: when on, hue snaps to `360 / gridDivisions` steps and
  saturation snaps to `1 / (rings+1)` rings where `rings = max(1, floor(divisions/2) - 1)`.
- **Accessibility**: the canvas has `role="application"` and an `aria-label`.
  Individual markers are not keyboard-focusable as separate elements; use
  `lockColor`/`unlockColor`/`addColor`/`removeColor` for programmatic control.

---

## Harmony Engine API

The `harmony-engine.ts` module exports pure functions for use outside the
component:

| Function                                  | Returns                  | Description                                            |
|-------------------------------------------|--------------------------|--------------------------------------------------------|
| `getRule(id)`                             | `HarmonyDefinition \| undefined` | Look up a rule by ID.                          |
| `getAllRules()`                           | `HarmonyDefinition[]`    | All built-in + custom rules.                          |
| `defineCustomRule(label, offsets, opts?)` | `HarmonyDefinition`      | Register a custom rule. Returns the new def.          |
| `removeCustomRule(id)`                    | `boolean`                | Remove a custom rule.                                  |
| `getCustomRules()`                        | `HarmonyDefinition[]`    | Just the custom rules.                                |
| `generateHues(baseHue, rule)`             | `number[]`               | Apply a rule's offsets to a base hue.                 |
| `defaultSaturations(rule)`                | `number[]`               | Default saturation (0-1) for each slot.               |
| `defaultLightnesses(rule)`                | `number[]`               | Default lightness (0-100) for each slot.              |
| `wrapHue(h)`                              | `number`                 | Normalize to [0, 360).                                 |
| `hueDelta(from, to)`                      | `number`                 | Signed delta in [-180, 180].                           |
| `isConstrained(rule)`                     | `boolean`                | True for any rule other than `custom`.                 |

---

## Related Components

- [Color Wheel](../color-wheel/SKILL.md) — single-color HSV picker.
- [Color Range](../color-range/SKILL.md) — 1D color slider.
- [Color Ramp](../color-ramp/SKILL.md) — multi-stop gradient editor.
