# SKILL.md — Color Range

A vanilla JavaScript 1D color slider. Four modes: `hue`, `lightness`,
`contrast`, `alpha`. Horizontal or vertical orientation. Canvas-based,
pointer + keyboard interaction, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  ColorRange,
  type ColorRangeOptions,
  type ColorRangeMode,
  type ColorRangeValueOutput,
} from "@/lib/components/color-range";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const range = new ColorRange(document.getElementById("hue")!, {
  mode: "hue",
  value: 210,
  orientation: "horizontal",
  length: 280,
});

range.on("change", (out) => {
  console.log(out.value);          // 210
  console.log(out.label);          // "210°"
  console.log(out.color.hex);      // "#4287f5"
  console.log(out.color.rgba);     // "rgba(66,135,245,1)"
});

range.destroy();
```

---

## Constructor

```ts
new ColorRange(container: HTMLElement, options?: ColorRangeOptions)
```

### Options

| Option        | Type                                  | Default     | Description                                                       |
|---------------|---------------------------------------|-------------|-------------------------------------------------------------------|
| `mode`        | `"hue" \| "lightness" \| "contrast" \| "alpha"` | `"hue"`     | Which color dimension the track represents.                       |
| `value`       | `number`                              | mode-dependent | Initial value: 0-360 for hue, 0-100 for lightness/contrast, 0-1 for alpha. |
| `color`       | `string`                              | `"#4287f5"` | Base color for lightness/contrast/alpha modes. Ignored in hue mode. Accepts hex / `rgb()` / named colors. |
| `orientation` | `"horizontal" \| "vertical"`          | `"horizontal"` | Track orientation.                                              |
| `thickness`   | `number`                              | `16`        | Track thickness (short dimension) in CSS pixels. Min 6.           |
| `length`      | `number`                              | `260`       | Track length (long dimension) in CSS pixels. Min 40.              |

Default `value` per mode: `hue` → 210, `lightness` → 50, `contrast` → 50,
`alpha` → 1.

---

## Public Methods

| Method                          | Returns                  | Description                                                       |
|---------------------------------|--------------------------|-------------------------------------------------------------------|
| `getValue()`                    | `number`                 | Current value (0-360 / 0-100 / 0-1, depending on mode).           |
| `getResultColor()`              | `ColorRangeResultColor`  | The concrete color produced by applying the mode's value to the base color. |
| `getValueOutput()`              | `ColorRangeValueOutput`  | `{ mode, value, label, color }`.                                  |
| `setValue(value)`               | `void`                   | Set the value (clamped to the mode's range). Fires `input` + `change`. |
| `setMode(mode)`                 | `void`                   | Change the mode. Resets `value` to the mode's default.            |
| `setColor(color)`               | `void`                   | Change the base color (lightness/contrast/alpha modes).           |
| `setOrientation(orientation)`   | `void`                   | Swap horizontal ↔ vertical.                                       |
| `setThickness(n)`               | `void`                   | Change the track thickness.                                       |
| `setLength(n)`                  | `void`                   | Change the track length.                                          |
| `on(event, handler)`            | `void`                   | Subscribe to `input` or `change`.                                 |
| `off(event, handler)`           | `void`                   | Unsubscribe.                                                       |
| `destroy()`                     | `void`                   | Tear down. Idempotent.                                            |

### Output shapes

```ts
interface ColorRangeResultColor {
  hex: string;    // "#RRGGBB"
  rgba: string;   // "rgba(r,g,b,a)"
  r: number; g: number; b: number;  // 0-255
  a: number;      // 0-1
}

interface ColorRangeValueOutput {
  mode: ColorRangeMode;
  value: number;
  label: string;  // "210°" | "45%" | "0.80"
  color: ColorRangeResultColor;
}
```

---

## Events

| Event    | Payload                  | When it fires                                                |
|----------|--------------------------|--------------------------------------------------------------|
| `input`  | `ColorRangeValueOutput`  | Continuous — every pointer move while dragging.              |
| `change` | `ColorRangeValueOutput`  | Committed — on `pointerup`/`pointercancel`, and on `setValue`. |

---

## Code Examples

### Hue slider (horizontal)

```ts
const hue = new ColorRange(container, { mode: "hue", value: 30 });
hue.on("change", (out) => applyHue(out.value));
```

### Alpha slider (vertical)

```ts
const alpha = new ColorRange(container, {
  mode: "alpha",
  value: 0.5,
  color: "#D9FF66",
  orientation: "vertical",
  length: 200,
  thickness: 20,
});
alpha.on("input", (out) => applyAlpha(out.color.rgba));
```

### Lightness slider bound to a base color

```ts
const lightness = new ColorRange(container, {
  mode: "lightness",
  color: "#211A30",
});
lightness.on("change", (out) => setColor(out.color.hex));
```

### Switching modes programmatically

```ts
range.setMode("contrast");
range.setColor("#4287f5");
range.setValue(75);
```

### React wrapper

```tsx
"use client";
import { ColorRangeReact } from "@/components/color-range/color-range-react";

export function Demo() {
  const [hue, setHue] = useState(210);
  return (
    <ColorRangeReact
      mode="hue"
      value={hue}
      onChange={(out) => setHue(out.value)}
    />
  );
}
```

---

## Integration Notes

- **Plain HTML**: import the compiled `.js` file as an ES module.
- **React**: use the wrapper at
  `src/components/color-range/color-range-react.tsx`.
- **Vue / Svelte / Lit**: instantiate in `onMounted`, call `destroy()` in
  cleanup. Forward prop changes via `setMode` / `setColor` / `setOrientation`.
- **SSR**: the constructor accesses `document` — mount only on the client.
- **Theming**: override `--color-range-focus-ring` on the host element.
- **Composing with the Color Wheel**: a common pattern is a Color Wheel for
  hue + saturation/value, plus a Color Range in `alpha` mode for the alpha
  channel. Both components emit a `change` event with a full color output.
- **Accessibility**: the canvas has `role="slider"`, an `aria-label` based on
  the mode, and `aria-valuenow` / `aria-valuemin` / `aria-valuemax` updated
  on every change.

---

## Related Components

- [Color Wheel](../color-wheel/SKILL.md) — full HSV picker; pair with an
  alpha Color Range for full RGBA control.
- [Color Circle](../color-circle/SKILL.md) — harmony-based multi-color
  picker.
- [Color Ramp](../color-ramp/SKILL.md) — multi-stop gradient editor.
