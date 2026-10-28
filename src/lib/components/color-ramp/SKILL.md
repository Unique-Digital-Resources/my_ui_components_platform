# SKILL.md — Color Ramp

A vanilla JavaScript multi-stop color gradient component. Draggable stops
with hex colors and 0-1 positions. Add (click empty space), remove
(double-click), and reposition stops. Horizontal or vertical. Canvas-based,
pointer + keyboard interaction, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  ColorRamp,
  type ColorRampOptions,
  type RampStop,
  type RampOrientation,
} from "@/lib/components/color-ramp";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const ramp = new ColorRamp(document.getElementById("ramp")!, {
  stops: [
    { position: 0, color: "#4287f5" },
    { position: 0.5, color: "#D9FF66" },
    { position: 1, color: "#ff6600" },
  ],
  orientation: "horizontal",
  length: 320,
  thickness: 32,
});

ramp.on("change", (stops) => {
  for (const s of stops) console.log(s.position, s.color);
});

// add a stop at the midpoint with interpolated color
ramp.addStop(0.25);

ramp.destroy();
```

---

## Constructor

```ts
new ColorRamp(container: HTMLElement, options?: ColorRampOptions)
```

### Options

| Option        | Type                            | Default | Description                                                |
|---------------|---------------------------------|---------|------------------------------------------------------------|
| `stops`       | `{ position: number; color: string }[]` | 3-stop blue→lemon→orange | Initial stops. At least 2 recommended. Positions 0-1, colors hex. |
| `orientation` | `"horizontal" \| "vertical"`    | `"horizontal"` | Track orientation.                                  |
| `thickness`   | `number`                        | `32`    | Gradient bar thickness (short dimension) in CSS pixels. Min 8. |
| `length`      | `number`                        | `280`   | Gradient bar length (long dimension) in CSS pixels. Min 40. |

Default stops: `[{0, "#4287f5"}, {0.5, "#D9FF66"}, {1, "#ff6600"}]`.

---

## Public Methods

| Method                          | Returns       | Description                                                        |
|---------------------------------|---------------|--------------------------------------------------------------------|
| `getStops()`                    | `RampStop[]`  | All stops (clones), sorted by position.                            |
| `setStops(stops)`               | `void`        | Replace all stops. Re-sorts by position. Fires `input` + `change`. |
| `addStop(position?, color?)`    | `number`      | Add a stop. Defaults: position 0.5, color interpolated from neighbors. Returns the new stop's index. Fires `input` + `change`. |
| `removeStop(i)`                 | `void`        | Remove stop at index `i`. No-op if it would leave fewer than 2 stops. Fires `input` + `change`. |
| `setOrientation(orientation)`   | `void`        | Swap horizontal ↔ vertical.                                        |
| `setThickness(n)`               | `void`        | Change the bar thickness.                                          |
| `setLength(n)`                  | `void`        | Change the bar length.                                             |
| `on(event, handler)`            | `void`        | Subscribe to `input` or `change`.                                  |
| `off(event, handler)`           | `void`        | Unsubscribe.                                                       |
| `destroy()`                     | `void`        | Tear down. Idempotent.                                             |

### Stop shape

```ts
interface RampStop {
  id: number;          // unique per session
  position: number;    // 0-1
  color: string;       // "#RRGGBB"
}
```

---

## Events

| Event    | Payload      | When it fires                                                                 |
|----------|--------------|-------------------------------------------------------------------------------|
| `input`  | `RampStop[]` | Continuous — every pointer move while dragging a stop.                        |
| `change` | `RampStop[]` | Committed — on `pointerup`/`pointercancel`, and on `setStops`/`addStop`/`removeStop`. |

---

## Code Examples

### Basic horizontal ramp

```ts
const ramp = new ColorRamp(container, {
  stops: [
    { position: 0, color: "#000000" },
    { position: 1, color: "#ffffff" },
  ],
});
ramp.on("change", (stops) => applyGradient(stops));
```

### Vertical ramp

```ts
const ramp = new ColorRamp(container, {
  stops: [
    { position: 0, color: "#211A30" },
    { position: 1, color: "#D9FF66" },
  ],
  orientation: "vertical",
  length: 240,
  thickness: 24,
});
```

### Programmatic manipulation

```ts
ramp.setStops([
  { position: 0, color: "#ff0000" },
  { position: 0.33, color: "#00ff00" },
  { position: 0.66, color: "#0000ff" },
  { position: 1, color: "#ff00ff" },
]);

ramp.addStop(0.5, "#ffff00");   // explicit color
ramp.addStop(0.5);               // interpolated color

ramp.removeStop(2);
```

### React wrapper

```tsx
"use client";
import { ColorRampReact } from "@/components/color-ramp/color-ramp-react";

export function Demo() {
  const [stops, setStops] = useState([
    { position: 0, color: "#4287f5" },
    { position: 1, color: "#D9FF66" },
  ]);
  return (
    <ColorRampReact
      stops={stops}
      onChange={(s) => setStops(s)}
    />
  );
}
```

### Pointer interactions

| Action                      | Effect                                                       |
|-----------------------------|--------------------------------------------------------------|
| Click on a stop             | Grab the stop, drag to reposition.                          |
| Click on empty track space  | Add a new stop at that position with interpolated color.     |
| Double-click on a stop      | Remove the stop (if more than 2 remain).                    |
| Drag a stop past another    | Stops re-sort; indices may swap.                            |

---

## Integration Notes

- **Plain HTML**: import the compiled `.js` file as an ES module.
- **React**: use the wrapper at
  `src/components/color-ramp/color-ramp-react.tsx`.
- **Min stops**: the component enforces a minimum of 2 stops. `removeStop`
  is a no-op if it would leave fewer than 2.
- **Interpolation**: colors are interpolated in RGB space. For gradients
  between very different hues (red → green), this can produce muddy
  midpoints. HSL or OKLCH interpolation would be smoother — see AGENT.md
  for how to add it.
- **Alpha**: not supported. Colors are RGB only.
- **Accessibility**: the canvas has `role="application"` and an `aria-label`
  describing the interaction model. Individual stops are not keyboard-
  focusable; use `addStop` / `removeStop` for programmatic control.
- **Theming**: override `--color-ramp-focus-ring` on the host element.

---

## Related Components

- [Color Wheel](../color-wheel/SKILL.md) — single-color HSV picker.
- [Color Range](../color-range/SKILL.md) — 1D color slider.
- [Color Circle](../color-circle/SKILL.md) — harmony-based multi-color
  picker.
