# AGENT.md — Color Circle

Contribution guide for `src/lib/components/color-circle/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**ColorCircle** — Adobe Color-style circular color picker with harmony rules.
A wheel of color slots (5 by default; the base sits at index 2). Moving the
base rotates all unlocked colors. Non-base colors can be moved individually.
Colors can be locked, added, removed. The wheel shows hue (angle) AND
saturation (radius), so each marker has a 2D position inside the circle.

## File Structure

```
src/lib/components/color-circle/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── color-circle.ts     ← the ColorCircle class (canvas + interaction)
├── harmony-engine.ts   ← rule registry, hue generation, custom rules
└── index.ts            ← barrel: class, types, harmony helpers
```

## Architecture

Single `<canvas>` renderer. Three paint passes per frame:

1. **Rainbow disk** — cached on an offscreen canvas keyed by `(size, dpr)`.
   Filled with a radial+angular gradient: angle → hue (0-360), radius →
   saturation (0-1). One-time render per geometry change.
2. **Snapping grid** — dots (small filled circles at each angular division
   on the circumference + at each saturation ring) or radial lines (from each
   angular division toward the center). Only rendered when `snapping` is on.
   Controlled by `gridMode` (`"dots" | "lines" | "none"`) and `gridDivisions`
   (default 12 — 30° steps).
3. **Markers + harmony links** — each marker is a triple-ring (white halo +
   dark ring + color center). The base marker has an additional lemon ring.
   Harmony links are radial lines from each marker to the center (not between
   markers) so the angular relationship to the base is visually clear.

### Palette model (`ColorEntry`)

```ts
interface ColorEntry {
  id: number;          // unique per session
  hue: number;         // 0-360 absolute
  saturation: number;  // 0-1
  lightness: number;   // 0-100 (HSL L)
  isBase: boolean;
  isLocked: boolean;
  offset: number;      // hue offset from the base (degrees)
}
```

The base color is always the entry with `offset === 0`. There is exactly one
base per palette; `baseIndex` is its index. Adding/removing colors preserves
the base (you can't remove the base).

### Marker positioning

```
angle = hue (0° at top, clockwise) — same convention as the Color Wheel
radius = saturation × r            (0 = center, 1 = edge)
```

So a marker at `saturation = 1` sits on the circumference; a marker at
`saturation = 0.5` sits halfway out. This makes the circle a 2D picker, not
a 1D hue ring.

### Pointer interaction

`pointerdown` finds the nearest marker (within a 24px threshold; defaults to
the base marker if none is hit) and grabs it. `setPointerCapture` is called
and `pointerState.colorIdx` tracks the grabbed marker. `pointermove` updates
the marker's `hue` (from angle) and `saturation` (from distance / radius).

If the grabbed marker is the base:
- For constrained rules (anything except `custom`), all unlocked non-base
  markers re-derive their hues from `baseHue + offset`.
- For the `custom` rule, moving the base just moves the base; other markers
  stay put.

If the grabbed marker is non-base:
- For constrained rules, the marker's `offset` is updated to
  `hueDelta(base.hue, marker.hue)`. The rule effectively becomes `custom`
  once you move a non-base marker (but the rule ID is preserved).
- For `custom`, the marker's hue is set directly.

When `snapping` is on, hue snaps to the nearest `360 / gridDivisions` step
and saturation snaps to the nearest `1 / (GRID_RINGS + 1)` ring.

### Snapping grid

`gridDivisions` controls both hue snapping (angular) and the number of
saturation rings. `ringCountFromDivisions(divisions) = max(1, floor(divisions/2) - 1)`.
For the default 12 divisions: 12 angular steps (30° each) and 5 saturation
rings (at 1/6, 2/6, 3/6, 4/6, 5/6).

### Harmony engine (`harmony-engine.ts`)

A pure module — no DOM, no class state. Maintains:

- `BUILT_IN_RULES` — 9 rules: `custom`, `analogous`, `complementary`,
  `split-complementary`, `triad`, `square`, `compound`, `shades`,
  `monochromatic`.
- `customRules` — a mutable `Map<string, HarmonyDefinition>` for user-defined
  rules added at runtime via `defineCustomRule`.
- `generateHues(baseHue, rule)` — applies the rule's offsets to the base.
- `defaultSaturations(rule)` / `defaultLightnesses(rule)` — for rules that
  vary tone (`variesTone`), produces graduated saturation/lightness across
  the palette.
- `hueDelta(from, to)` — signed angular delta in [-180, 180].
- `wrapHue(h)` — normalize to [0, 360).

Each `HarmonyDefinition` is `{ id, label, offsets[], variesTone?,
variesLightnessOnly?, isCustom?, description }`.

## How to Extend / Modify

- **Add a built-in harmony rule**: add an entry to `BUILT_IN_RULES` and to
  `BUILT_IN_RULE_ORDER` in `harmony-engine.ts`. Set `variesTone` if the rule
  varies saturation/lightness, `variesLightnessOnly` for shades-style rules.
- **Add a custom rule at runtime**: `defineCustomRule("My Rule", [-30, 0, 30])`
  returns a `HarmonyDefinition`. Custom rules are stored in a module-level
  `Map` (not on the instance) — they persist across component instances.
- **Change the marker style**: edit `renderMarkers`. The base marker has an
  extra lemon ring; locked markers show a small lock glyph.
- **Change the grid visualization**: edit `renderGridDots` / `renderGridLines`.
  The two modes share the same snap points — they're different visualizations
  of the same underlying divisions.
- **Change the harmony link style**: edit `renderHarmonyLinks`. Links are
  radial (marker → center), not between markers. This is intentional — it
  makes the angular relationship to the base clear.

## Known Issues & TODOs

- Custom rules are stored in a module-level `Map`, so they leak across
  instances and across page reloads (within the same JS context). A future
  enhancement could scope custom rules per-instance or persist them to
  `localStorage`.
- `setHarmony` resets marker saturations to 1.0 for the new rule, discarding
  any user-dragged saturation values. This is intentional but surprising.
- The 2D dragging (hue + saturation) is implemented but the visual marker
  only shows hue position when `saturation = 1`. Markers with `saturation < 1`
  appear inside the circle, which can look odd at low saturations.
- The `compound` rule's offset list (`[0, 30, 150, 180, 210]`) is asymmetric
  and produces a 5-color palette where the base is not at the middle index.
  The base index is found by searching for `offset === 0`, not by position.
- The disk's saturation gradient is linear in radius — perceptually, HSL
  saturation doesn't map linearly to perceived chroma. A future enhancement
  could use OKLCH or CIECAM02 for a perceptually uniform disk.

## Files This Component Touches

- React wrapper: `src/components/color-circle/color-circle-react.tsx`
- Playground: `src/components/color-circle/color-circle-playground.tsx`
- Metadata: `src/lib/platform/content.ts` (slug `"color-circle"`)
- Commands: `color-circle.triad`, `color-circle.complementary`,
  `color-circle.analogous`, `color-circle.square`, `color-circle.custom` in
  `src/lib/commands/index.ts`.
