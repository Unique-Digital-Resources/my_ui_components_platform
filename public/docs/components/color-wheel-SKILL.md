# SKILL.md — Color Wheel Picker

A vanilla JavaScript color picker. Hue wheel + configurable inner HSV
selection shape (triangle / square / disk / none). Canvas-based, pointer +
keyboard interaction, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```bash
# copy the folder into your project, or use a path alias
```

```ts
import {
  ColorWheelPicker,
  type ColorPickerOptions,
  type Shape,
  type ColorOutput,
} from "@/lib/components/color-wheel";
```

No CSS import is required — the component injects a scoped `<style>` once per
document. Override the visual tokens (see "Theming" below) on the host
element or globally.

---

## Quick Start

```ts
const picker = new ColorWheelPicker(document.getElementById("picker")!, {
  shape: "triangle",
  size: 200,
  color: "#4287f5",
});

picker.on("change", (color) => {
  console.log(color.hex);     // "#4287f5"
  console.log(color.rgb);     // { r: 66, g: 135, b: 245 }
  console.log(color.hsv);     // { h: 210, s: 73, v: 96 }
  console.log(color.hsl);     // { h: 210, s: 90, l: 61 }
});

// later
picker.destroy();
```

---

## Constructor

```ts
new ColorWheelPicker(container: HTMLElement, options?: ColorPickerOptions)
```

### Options

| Option           | Type                                         | Default     | Description                                                          |
|------------------|----------------------------------------------|-------------|----------------------------------------------------------------------|
| `shape`          | `"triangle" \| "square" \| "disk" \| "none"` | `"triangle"`| Inner selection shape.                                               |
| `size`           | `number`                                     | `180`       | Inner shape diameter in CSS pixels. Min 40.                          |
| `wheelThickness` | `number`                                     | `24`        | Hue wheel radial thickness in pixels. Min 4.                         |
| `wheelSpacing`   | `number`                                     | `8`         | Gap between inner shape and wheel inner edge in pixels. Min 0.       |
| `hue`            | `number`                                     | `210`       | Initial hue (0-360). Ignored when `color` is provided.               |
| `color`          | `string`                                     | `"#4287f5"` | Initial color (any parseable string). Overrides `hue` when provided. |
| `rotateShape`    | `boolean`                                    | `false`     | Triangle only — rotate so the pure-hue vertex tracks the hue angle.  |

`color` accepts hex (`#RGB`, `#RRGGBB`, `#RRGGBBAA`), `rgb()`, `hsl()`, CSS
named colors, or `{r,g,b}` / `{h,s,v}` / `{h,s,l}` objects. Alpha in
`#RRGGBBAA` is parsed but discarded (RGB-only component).

---

## Public Methods

| Method                                | Returns          | Description                                                                 |
|---------------------------------------|------------------|-----------------------------------------------------------------------------|
| `setColor(color: string)`            | `void`           | Set the color from any parseable input. Fires `input` + `change`.           |
| `getColor()`                          | `ColorOutput`    | Current color as `{ hex, rgb, hsv, hsl }`.                                  |
| `setShape(shape)`                    | `void`           | Change the inner selection shape. Preserves the current color.             |
| `setSize(size)`                      | `void`           | Change the inner shape diameter. Preserves the color.                      |
| `setHue(hue)`                        | `void`           | Change the hue (0-360). Preserves S and V. Fires `input` + `change`.       |
| `setWheelThickness(thickness)`       | `void`           | Change the hue wheel radial thickness.                                     |
| `setWheelSpacing(spacing)`           | `void`           | Change the gap between inner shape and wheel.                              |
| `setRotateShape(rotate)`             | `void`           | Toggle the triangle's rotating-hue-vertex mode.                            |
| `on(event, handler)`                 | `void`           | Subscribe to `input` or `change`.                                          |
| `off(event, handler)`                | `void`           | Unsubscribe.                                                                |
| `destroy()`                          | `void`           | Tear down: remove listeners, observers, and DOM. Idempotent.               |

### ColorOutput shape

```ts
interface ColorOutput {
  hex: string;                  // "#RRGGBB"
  rgb: { r: number; g: number; b: number };  // 0-255
  hsv: { h: number; s: number; v: number };  // h: 0-360, s/v: 0-100
  hsl: { h: number; s: number; l: number };  // h: 0-360, s/l: 0-100
}
```

---

## Events

| Event    | Payload       | When it fires                                                   |
|----------|---------------|-----------------------------------------------------------------|
| `input`  | `ColorOutput` | Continuous — every pointer move while dragging, every key press.|
| `change` | `ColorOutput` | Committed — on `pointerup`/`pointercancel`, and on programmatic `setColor`/`setHue`. |

```ts
picker.on("input", (color) => updateLivePreview(color));
picker.on("change", (color) => commitColorToHistory(color));
```

---

## Code Examples

### Basic usage (HTML + module script)

```html
<div id="picker"></div>

<script type="module">
  import { ColorWheelPicker } from "./color-wheel/index.js";

  const picker = new ColorWheelPicker(document.getElementById("picker"), {
    shape: "triangle",
    size: 220,
    color: "#D9FF66",
  });

  picker.on("change", (color) => {
    document.body.style.background = color.hex;
  });
</script>
```

### Square shape, no inner shape rotation

```ts
const picker = new ColorWheelPicker(container, {
  shape: "square",
  size: 200,
  wheelThickness: 20,
  wheelSpacing: 6,
  color: "#ff6600",
});
```

### Disk shape with rotating triangle off

```ts
const picker = new ColorWheelPicker(container, { shape: "disk" });
picker.on("input", (c) => console.log(c.hsv));
```

### Hue-only picker (`none` shape)

```ts
const picker = new ColorWheelPicker(container, {
  shape: "none",
  size: 140,
  wheelThickness: 28,
});
picker.on("change", (c) => applyHue(c.hsv.h));
```

### Programmatic updates

```ts
picker.setColor("#211A30");
picker.setHue(180);
picker.setShape("square");
picker.setSize(260);
```

### React wrapper

```tsx
"use client";
import { useRef, useEffect, useState } from "react";
import { ColorWheelPicker, type ColorOutput } from "@/lib/components/color-wheel";

export function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const instRef = useRef<ColorWheelPicker | null>(null);
  const [color, setColor] = useState("#4287f5");

  useEffect(() => {
    if (!ref.current) return;
    const picker = new ColorWheelPicker(ref.current, { color });
    instRef.current = picker;
    picker.on("change", (c: ColorOutput) => setColor(c.hex));
    return () => picker.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    instRef.current?.setColor(color);
  }, [color]);

  return <div ref={ref} />;
}
```

The repo ships a prebuilt wrapper at
`src/components/color-wheel/color-wheel-picker-react.tsx` — prefer it over
rolling your own.

### Keyboard interaction

| Key                        | Action                            |
|----------------------------|-----------------------------------|
| `ArrowLeft` / `ArrowRight` | Hue −1° / +1° (Shift = 10°)       |
| `ArrowUp` / `ArrowDown`    | Value +1 / −1 (Shift = 10)        |
| `Ctrl/Cmd + ArrowLeft/Right` | Saturation −1 / +1              |
| `Home` / `End`             | Hue to 0° / 360°                  |

---

## Integration Notes

- **Plain HTML**: serve the compiled `.js` file and import it as an ES module.
  The class is the named export `ColorWheelPicker`.
- **React**: use the wrapper at
  `src/components/color-wheel/color-wheel-picker-react.tsx`. It owns the
  instance, forwards prop changes via the imperative API, and forwards
  `input`/`change` to callback props.
- **Vue / Svelte / Lit / Angular**: instantiate in `onMounted` / equivalent,
  call `destroy()` in the cleanup hook. Forward prop changes by calling
  `setColor`/`setShape`/`setSize` when the prop changes.
- **SSR**: the constructor accesses `document`, so guard the call site or
  mount only on the client. The React wrapper is `"use client"`.
- **Theming**: override the CSS custom properties on the host element:

  ```css
  .my-picker {
    --color-picker-marker-border: rgba(0, 0, 0, 0.85);
    --color-picker-marker-border-dark: rgba(255, 255, 255, 0.95);
    --color-picker-focus-ring: rgba(217, 255, 102, 0.6);
    --color-picker-bg: transparent;
  }
  ```

- **Multi-touch**: the component uses PointerEvent + `setPointerCapture`, so
  dragging works outside the element. Multi-touch is not specifically
  handled (each picker is a single-pointer device).
- **Accessibility**: the canvas has `role="application"` and an
  `aria-label` describing the keyboard model. `aria-valuenow` / `aria-valuetext`
  are updated with the current hue/S/V on every change.

---

## Related Components

- [Color Range](../color-range/SKILL.md) — 1D slider for one color dimension
  (hue / lightness / contrast / alpha).
- [Color Circle](../color-circle/SKILL.md) — Adobe Color-style harmony wheel
  with multiple markers.
- [Color Ramp](../color-ramp/SKILL.md) — multi-stop gradient editor.
