# AGENT.md — Color Ramp

Contribution guide for `src/lib/components/color-ramp/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**ColorRamp** — a multi-stop color gradient bar with draggable stops. Stops
have a color (hex) and a position (0-1). Users can add (click empty space),
remove (double-click a stop), and reposition (drag) stops. The gradient is
linearly interpolated between stops. Horizontal or vertical orientation.

## File Structure

```
src/lib/components/color-ramp/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── color-ramp.ts       ← the ColorRamp class (canvas + interaction)
└── index.ts            ← barrel: class, types
```

## Architecture

Single `<canvas>` renderer. Two paint passes per frame:

1. **Gradient bar** — re-rendered every frame (the gradient depends on stop
   positions, which change during drag). Uses a single canvas
   `createLinearGradient` (horizontal: left → right; vertical: bottom → top)
   with one `addColorStop` per stop, in position order. The track has
   rounded corners via `ctx.roundRect`.
2. **Stops** — each stop is a small filled circle on the track edge with a
   white halo + dark border + colored center. The dragged stop has an
   additional lemon ring.

The component owns a small self-contained color math set (`parseHex`,
`rgbToHex`, `lerpRgb`) — it does NOT import `color-utils` from the
color-wheel. RGB-space linear interpolation is used (not HSL), which is fast
but can produce muddy midpoints for gradients between very different hues.
A future enhancement could offer an interpolation mode selector.

### Stop model

```ts
interface RampStop {
  id: number;          // unique per session (nextStopId++)
  position: number;    // 0-1
  color: string;       // hex "#RRGGBB"
}
```

Stops are kept sorted by `position` at all times. `getStops()` returns
clones. The minimum stop count is 2 (you can't remove below 2).

### Pointer interaction

- `pointerdown` on a stop → grab that stop (`pointerState.stopIdx`).
- `pointerdown` on empty track space → add a new stop at the click position
  with interpolated color, then grab it.
- Double-click on a stop → remove it (if count > 2).
- `pointermove` while grabbing → update the stop's position (clamped to
  [0, 1]). Stops can pass each other (no constraint that they stay in
  order — but the array is re-sorted, so the indices can swap mid-drag).
- `setPointerCapture` is called on `pointerdown` and released in
  `pointerup`/`pointercancel`/`destroy()`.

### Color interpolation

`interpolateColor(position)` walks the sorted stops, finds the bracketing
pair, and linearly interpolates in RGB space:

```
t = (position - left.position) / (right.position - left.position)
r = lerp(left.r, right.r, t)
g = lerp(left.g, right.g, t)
b = lerp(left.b, right.b, t)
return rgbToHex(r, g, b)
```

This is used when adding a stop without an explicit color (the new stop
inherits the color of the gradient at that position).

## How to Extend / Modify

- **Add an interpolation mode** (HSL / OKLCH): add an `interpolation`
  option, extend `interpolateColor` to switch on the mode, and add the
  conversion helpers (`rgbToHsl`, `hslToRgb` or `rgbToOklch`,
  `oklchToRgb`). Update the cache key if you start caching the gradient.
- **Change the stop visual**: edit `renderStops`. The dragged stop has an
  extra lemon ring; non-dragged stops have the standard triple-ring.
- **Add a click-to-add-position indicator**: currently the new stop appears
  immediately on `pointerdown` in empty space. A hover preview could be
  added in `onPointerMove` when not dragging.
- **Caching**: the gradient is currently re-rendered every frame. If drag
  performance becomes an issue on very long ramps, cache the gradient on an
  offscreen canvas keyed by the stop signature
  (`positions.join(",") + colors.join(",")`).

## Known Issues & TODOs

- RGB-space interpolation produces muddy midpoints for gradients between
  very different hues (e.g. red → green passes through brown). HSL or OKLCH
  interpolation would be smoother. Not implemented yet.
- Stops can pass each other during drag; the indices swap silently because
  the array is re-sorted. This is intentional but can be surprising if you
  track a stop by index.
- No alpha channel support — colors are RGB only. The `parseHex` helper
  ignores alpha even if `#RRGGBBAA` is provided.
- The minimum stop count is 2, but there's no maximum. Hundreds of stops
  would slow the gradient render. Consider a cap.
- No keyboard shortcut to add/remove stops — only pointer interaction.

## Files This Component Touches

- React wrapper: `src/components/color-ramp/color-ramp-react.tsx`
- Playground: `src/components/color-ramp/color-ramp-playground.tsx`
- Metadata: `src/lib/platform/content.ts` (slug `"color-ramp"`)
- No built-in commands (the ramp doesn't register keyboard shortcuts).
