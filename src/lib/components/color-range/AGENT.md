# AGENT.md — Color Range

Contribution guide for `src/lib/components/color-range/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**ColorRange** — a 1D color slider. Renders a horizontal or vertical gradient
track for a single color dimension, with a draggable thumb. Four modes: `hue`
(0-360), `lightness` (0-100, black → base color → white), `contrast` (0-100,
base mixed toward black/white), `alpha` (0-1, transparent → opaque over a
checkerboard).

## File Structure

```
src/lib/components/color-range/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── color-range.ts      ← the ColorRange class (canvas + interaction)
└── index.ts            ← barrel: class, types
```

## Architecture

Single `<canvas>` renderer. Two paint passes per frame:

1. **Track** — cached on an offscreen canvas keyed by
   `track-${mode}-${orientation}-${tLen}-${tThick}-${dpr}-${color}`. Re-rendered
   only when one of those inputs changes. The thumb is drawn on top of the
   cached track, so value changes don't invalidate the cache.
2. **Thumb** — re-drawn every frame (cheap). Horizontal mode: the thumb is a
   vertically-stretched rounded rect with a "notch" pointing down into the
   track. Vertical mode: the notch points right. The thumb uses a white fill
   with a dark border and a colored center indicating the result color at that
   position.

A `pointerState: { pointerId } | null` tracks the active drag. `setPointerCapture`
is called on `pointerdown` and released in `pointerup`/`pointercancel`/`destroy()`.

Keyboard: `ArrowLeft/Right` (horizontal) or `ArrowUp/Down` (vertical) adjust by
1 (Shift = 10). `Home`/`End` jump to the bounds. Each key press emits
`input` + `change`.

The component owns a small self-contained color math set (`parseHex`,
`rgbToHex`, `hsvToRgb`, `rgbToHsv`) — it does NOT import `color-utils` from
the color-wheel. This keeps the dependency surface minimal.

## Key Algorithms & Math

### Mode → track gradient

| Mode        | Track gradient                                            | Value range | Result color                                                |
|-------------|-----------------------------------------------------------|-------------|-------------------------------------------------------------|
| `hue`       | Full hue spectrum (HSL 0-360 at 100% S, 50% L)            | 0-360       | Pure hue at the value angle.                                |
| `lightness` | Black → base color → white (3-stop linear gradient)       | 0-100       | Base color mixed toward black (0) or white (100).           |
| `contrast`  | Black → base color → white, but the base sits at the middle (50); the slider picks a side | 0-100 | If value < 50: mix toward black. If value > 50: mix toward white. At 50: base color. |
| `alpha`     | Checkerboard (8x8 cells) → base color at full opacity    | 0-1         | Base color at the given alpha.                              |

### Result color (`computeResultColor`)

For `hue`: `hsvToRgb(value, 100, 100)`.
For `lightness`: `lerpRgb(black, base, value/100)` when value < 50, otherwise
`lerpRgb(base, white, (value-50)/50)` — actually computed in HSL space for a
smoother perceptual transition.
For `contrast`: similar to lightness but with a different curve that maximizes
contrast on the chosen side.
For `alpha`: `rgba(base.r, base.g, base.b, value)`.

### Geometry & thumb positioning

```
pad = 8 (so the thumb fits within the canvas)
totalW = length + pad*2 (horizontal)
totalH = thickness + pad*2 (horizontal)
thumbPos = valueToFraction(value, mode) * tLen
```

`valueToFraction` normalizes the value against the mode's range (0-360, 0-100,
or 0-1) to a 0-1 fraction along the track.

### Caching

The track cache key MUST include every input that affects the cached pixels:
`mode`, `orientation`, `tLen`, `tThick`, `dpr`, `color`. The thumb is drawn on
top of the cached track every frame, so value changes don't invalidate the
cache.

## How to Extend / Modify

- **Add a new mode**: extend the `ColorRangeMode` union, add a track-render
  branch in `renderTrack`, add a result-color branch in `computeResultColor`,
  add a default value in `defaultValueForMode`, and add a label formatter in
  `formatLabel`.
- **Change the thumb style**: edit `renderThumb`. The thumb uses a lemon-accent
  focus ring via `--color-range-focus-ring`.
- **Change the checkerboard cell size** (alpha mode): edit the `renderCheckerboard`
  helper.
- **Vertical mode** is fully symmetric to horizontal — the `orientation`
  flag swaps `tLen`/`tThick` and rotates the gradient direction. When adding
  a new mode, ensure it works in both orientations.

## Known Issues & TODOs

- `setColor` only accepts hex / `rgb()` / named colors (via `parseHex`). It
  does not accept `hsl()` or HSV objects, unlike the Color Wheel's `parseColor`.
  Could be unified by importing `color-utils`.
- The `contrast` mode's curve is heuristic — it's not a true WCAG contrast
  calculation. The name is descriptive, not technical.
- The thumb's "notch" pointer is drawn with two short line segments — it could
  be drawn as a triangle for a crisper look.
- The alpha checkerboard uses fixed 8x8 cells; on very small tracks (length <
  80) the cells may look coarse. Consider scaling cell size with `tThick`.

## Files This Component Touches

- React wrapper: `src/components/color-range/color-range-react.tsx`
- Playground: `src/components/color-range/color-range-playground.tsx`
- Metadata: `src/lib/platform/content.ts` (slug `"color-range"`)
- Commands: `color-range.hue`, `color-range.lightness`,
  `color-range.contrast`, `color-range.alpha` in `src/lib/commands/index.ts`.
