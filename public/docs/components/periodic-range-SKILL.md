# SKILL.md — Periodic Range

A vanilla JavaScript dual-thumb range slider. Two draggable thumbs (low and
high) bound a selected range. Optional step snapping, optional tick marks
with numeric labels, horizontal or vertical orientation. Canvas-based,
pointer + keyboard interaction, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  PeriodicRange,
  type PeriodicRangeOptions,
  type PeriodicRangeValue,
  type PeriodicRangeOrientation,
} from "@/lib/components/periodic-range";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const range = new PeriodicRange(document.getElementById("range")!, {
  min: 0,
  max: 100,
  valueMin: 25,
  valueMax: 75,
  step: 5,
  showMarkers: true,
  orientation: "horizontal",
});

range.on("change", (v) => {
  console.log(v.valueMin, v.valueMax);  // 25, 75
});

range.destroy();
```

---

## Constructor

```ts
new PeriodicRange(container: HTMLElement, options?: PeriodicRangeOptions)
```

### Options

| Option        | Type                                  | Default     | Description                                                       |
|---------------|---------------------------------------|-------------|-------------------------------------------------------------------|
| `min`         | `number`                              | `0`         | Range minimum.                                                    |
| `max`         | `number`                              | `100`       | Range maximum. Must be >= `min`.                                  |
| `valueMin`    | `number`                              | `25`        | Current low value. Clamped to `[min, valueMax]`.                  |
| `valueMax`    | `number`                              | `75`        | Current high value. Clamped to `[valueMin, max]`.                 |
| `step`        | `number`                              | `0`         | Snap step in value units. `0` = no snapping.                      |
| `showMarkers` | `boolean`                             | `false`     | Show tick marks + numeric labels.                                 |
| `markerStep`  | `number`                              | `10`        | Interval between markers (in value units). Min 1.                 |
| `orientation` | `"horizontal" \| "vertical"`          | `"horizontal"` | Track orientation.                                              |
| `thickness`   | `number`                              | `8`         | Track thickness in CSS pixels. Min 4.                             |
| `length`      | `number`                              | `280`       | Track length in CSS pixels. Min 40.                               |

---

## Public Methods

| Method                          | Returns                  | Description                                                              |
|---------------------------------|--------------------------|--------------------------------------------------------------------------|
| `getValueMin()`                 | `number`                 | Current low value.                                                       |
| `getValueMax()`                 | `number`                 | Current high value.                                                      |
| `setRange(min, max)`            | `void`                   | Set the range bounds. Re-clamps values to the new range. Fires `input` + `change`. |
| `setValueMin(v)`                | `void`                   | Set the low value (clamped to `[min, valueMax]`, snapped to step). Fires `input` + `change`. |
| `setValueMax(v)`                | `void`                   | Set the high value (clamped to `[valueMin, max]`, snapped to step). Fires `input` + `change`. |
| `setStep(step)`                 | `void`                   | Set the snap step. Re-snaps current values.                              |
| `setShowMarkers(on)`            | `void`                   | Toggle tick marks + labels.                                              |
| `setMarkerStep(step)`           | `void`                   | Set the marker interval.                                                 |
| `setOrientation(orientation)`   | `void`                   | Swap horizontal ↔ vertical.                                              |
| `setThickness(n)`               | `void`                   | Change the track thickness.                                              |
| `setLength(n)`                  | `void`                   | Change the track length.                                                 |
| `on(event, handler)`            | `void`                   | Subscribe to `input` or `change`.                                        |
| `off(event, handler)`           | `void`                   | Unsubscribe.                                                              |
| `destroy()`                     | `void`                   | Tear down. Idempotent.                                                   |

### Value shape

```ts
interface PeriodicRangeValue {
  valueMin: number;
  valueMax: number;
}
```

---

## Events

| Event    | Payload                | When it fires                                                          |
|----------|------------------------|------------------------------------------------------------------------|
| `input`  | `PeriodicRangeValue`   | Continuous — every pointer move while dragging a thumb.                |
| `change` | `PeriodicRangeValue`   | Committed — on `pointerup`/`pointercancel` (after step snap), and on `setValueMin`/`setValueMax`/`setRange`. |

---

## Code Examples

### Basic horizontal range

```ts
const range = new PeriodicRange(container, {
  min: 0,
  max: 100,
  valueMin: 20,
  valueMax: 80,
});
range.on("change", (v) => applyRange(v.valueMin, v.valueMax));
```

### With snapping and markers

```ts
const range = new PeriodicRange(container, {
  min: 0,
  max: 360,
  valueMin: 30,
  valueMax: 330,
  step: 15,           // snap to 15° steps
  showMarkers: true,
  markerStep: 30,     // tick every 30°
});
```

### Vertical range

```ts
const range = new PeriodicRange(container, {
  min: 0,
  max: 100,
  valueMin: 25,
  valueMax: 75,
  orientation: "vertical",
  length: 240,
  thickness: 8,
});
```

### Programmatic updates

```ts
range.setValueMin(40);
range.setValueMax(60);
range.setRange(0, 50);   // also re-clamps values to the new range
range.setStep(10);
range.setShowMarkers(true);
```

### React wrapper

```tsx
"use client";
import { PeriodicRangeReact } from "@/components/periodic-range/periodic-range-react";

export function Demo() {
  const [range, setRange] = useState({ valueMin: 25, valueMax: 75 });
  return (
    <PeriodicRangeReact
      min={0}
      max={100}
      valueMin={range.valueMin}
      valueMax={range.valueMax}
      onChange={(v) => setRange(v)}
    />
  );
}
```

### Keyboard interaction

| Key                          | Action                                                       |
|------------------------------|--------------------------------------------------------------|
| `Tab`                        | Cycle focus between the min and max thumbs.                  |
| `ArrowLeft` / `ArrowDown`    | Decrement the active thumb by 1 (Shift = 10).                |
| `ArrowRight` / `ArrowUp`     | Increment the active thumb by 1 (Shift = 10).                |
| `Home`                       | Active thumb to range min (or to the other thumb's position).|
| `End`                        | Active thumb to range max (or to the other thumb's position).|

The "active" thumb is the one most recently interacted with (default: min).

---

## Integration Notes

- **Plain HTML**: import the compiled `.js` file as an ES module.
- **React**: use the wrapper at
  `src/components/periodic-range/periodic-range-react.tsx`.
- **Thumb crossing**: thumbs cannot cross. Dragging one past the other
  stops at the other's position. There is no swap gesture.
- **Step snapping**: snapping happens on `pointerup`, not during drag —
  the drag stays smooth and the thumb snaps to the grid when released.
- **Marker labels**: labels are plain numbers (no unit suffix). On short
  tracks with small `markerStep`, labels can overlap — increase
  `markerStep` or decrease `length`.
- **Vertical mode**: labels go to the left of the track. Reserve enough
  horizontal space in the host layout.
- **Accessibility**: the canvas has `role="application"` and an
  `aria-label`. Individual thumbs are not keyboard-focusable as separate
  elements; Tab cycles the active thumb.
- **Theming**: override `--periodic-range-focus-ring` on the host element.

---

## Related Components

- [Color Range](../color-range/SKILL.md) — single-thumb 1D color slider.
- [Custom Button](../custom-button/SKILL.md) — for the "Apply" / "Reset"
  buttons often paired with a range slider.
