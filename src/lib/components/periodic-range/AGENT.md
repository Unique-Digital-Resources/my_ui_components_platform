# AGENT.md — Periodic Range

Contribution guide for `src/lib/components/periodic-range/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**PeriodicRange** — a dual-thumb range slider. Two draggable thumbs (low and
high) bound a selected range filled with the lemon accent color. Optional
snapping to a step increment, optional tick marks with numeric labels,
horizontal or vertical orientation.

The name "Periodic" refers to the component's design as a periodic value
selector (a value within a recurring range), not to the periodic table.

## File Structure

```
src/lib/components/periodic-range/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── periodic-range.ts   ← the PeriodicRange class (canvas + interaction)
└── index.ts            ← barrel: class, types
```

## Architecture

Single `<canvas>` renderer. Three paint passes per frame:

1. **Track** — a rounded-rect track in the muted background color.
2. **Selected range** — the lemon-accent filled rectangle between the two
   thumbs.
3. **Thumbs + markers + labels** — two thumbs (low and high), each a
   triple-ring (white halo + dark ring + lemon center). The active thumb has
   an additional lemon focus ring. Tick marks (small vertical lines below
   the track in horizontal mode, to the left in vertical mode) and numeric
   labels appear when `showMarkers` is on.

The component does NOT cache the track to an offscreen canvas — the gradient
and labels are simple enough that re-rendering every frame is fast even on
long tracks.

### Thumb model

Two thumbs: `valueMin` (low) and `valueMax` (high). The invariant
`valueMin <= valueMax` is enforced everywhere — setters re-clamp, and the
drag handler prevents the thumbs from crossing. When the user drags one
thumb past the other, the dragged thumb stops at the other's position (it
can't cross).

`pointerState` tracks the active thumb:
```ts
{ pointerId: number; thumb: "min" | "max" }
```

The "active" thumb (the one most recently interacted with) is the default
target for keyboard navigation. Tab cycles between the two thumbs.

### Step snapping

`step` is the snap increment (in value units, not pixels). When `step > 0`,
values are snapped to the nearest `min + k * step` on `pointerup` (not during
drag — the drag stays smooth). `step = 0` disables snapping.

`applyStep(value)` rounds to the nearest step grid point. `markerStep`
controls the tick mark interval independently of `step` (so you can have
markers every 10 units while snapping every 5).

### Geometry

```
PAD = 14 (so thumbs, which overhang the track, fit)
LABEL_AREA = 22 (reserved for marker labels when showMarkers is on)
totalW = length + PAD*2 (horizontal)
totalH = thickness + PAD*2 + (showMarkers ? LABEL_AREA : 0) (horizontal)
```

Vertical mode swaps `tLen`/`tThick` and puts labels to the left of the
track.

### Value → position mapping

```
fraction = (value - min) / (max - min)
thumbPos = fraction * tLen
```

Inverse:
```
value = min + (pointerOffset / tLen) * (max - min)
```

The thumbs overhang the track by half their width on each end, so the
clickable area extends slightly beyond `[0, tLen]`.

## How to Extend / Modify

- **Add a single-thumb mode**: not currently supported. The component is
  always dual-thumb. A future enhancement could add a `singleThumb` option
  that hides the max thumb.
- **Custom thumb styling**: edit `renderThumbs`. The thumbs use a
  triple-ring with a lemon center; the active thumb has an additional lemon
  focus ring.
- **Custom marker formatting**: edit `formatLabel`. Currently labels are
  plain numbers (no unit suffix). A `unit` option could be added.
- **Logarithmic scale**: not supported — the scale is linear. A `scale`
  option (`"linear" | "log"`) would require updating `valueToFraction` and
  `fractionToValue` together.
- **Caching**: the track is re-rendered every frame. For very long tracks
  with markers, caching the track + markers on an offscreen canvas keyed by
  `(mode, length, thickness, min, max, markerStep, dpr)` would help.

## Known Issues & TODOs

- The thumbs can't cross, but there's no "swap" gesture — if you drag the
  min thumb all the way to the right, it stops at the max thumb. Some
  range sliders allow a crossover that swaps the thumb roles; this one
  doesn't.
- `setRange` re-clamps values to the new range, but if the new range would
  invert `valueMin > valueMax`, it resets both to the range bounds
  (`valueMin = min`, `valueMax = max`). This is a destructive reset —
  consider preserving the proportional position instead.
- Marker labels can overlap on short tracks with small `markerStep`. There's
  no automatic label de-duplication.
- The `applyStep` function rounds to the nearest step, but `setStep` re-snaps
  the current values to the new grid — this can shift both values slightly.
- Vertical mode puts labels to the left of the track, which can collide
  with adjacent content. The host should reserve enough horizontal space.

## Files This Component Touches

- React wrapper: `src/components/periodic-range/periodic-range-react.tsx`
- Playground: `src/components/periodic-range/periodic-range-playground.tsx`
- Metadata: `src/lib/platform/content.ts` (slug `"periodic-range"`)
- No built-in commands (the slider doesn't register keyboard shortcuts).
