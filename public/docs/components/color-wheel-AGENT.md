# AGENT.md — Color Wheel Picker

Contribution guide for `src/lib/components/color-wheel/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**ColorWheelPicker** — a vanilla TypeScript color picker. Renders a hue wheel
surrounding a configurable inner HSV selection shape (triangle / square / disk /
none). Canvas-based, pointer + keyboard interaction, framework-independent.

## File Structure

```
src/lib/components/color-wheel/
├── AGENT.md                ← this file
├── SKILL.md                ← usage docs
├── color-utils.ts          ← pure color math (HSV/RGB/HSL/HEX + parser)
├── color-wheel-picker.ts   ← the ColorWheelPicker class (canvas + interaction)
└── index.ts                ← barrel: class, types, color-utils
```

## Architecture

Single `<canvas>` renderer. Three paint passes per frame:

1. **Hue wheel** — cached on an offscreen canvas keyed by `(total, dpr)`. Uses
   a `ConicGradient` (Chrome/Edge/Safari 16+) with 24 hue stops for a perfectly
   smooth, seam-free annulus. Falls back to 720 half-degree arc segments when
   `createConicGradient` is unavailable.
2. **Inner shape** — cached on a second offscreen canvas keyed by
   `(shape, total, dpr, hue, rotation)`. Triangle and disk are rendered
   per-pixel; square uses three stacked canvas gradients. `none` mode just
   fills a solid circle.
3. **Markers** — hue marker on the wheel mid-radius; inner marker on the
   selected (S, V) position. Re-drawn every frame (cheap).

Caching is what keeps drags smooth: SV drags only redraw markers; hue drags
only re-render the inner shape; size/shape changes invalidate the relevant
caches.

A `ResizeObserver` watches the canvas and refreshes the backing store +
caches on DPR changes (e.g. window moved between monitors).

Pointer events: `pointerdown` routes by radius — wheel ring vs inner circle vs
gap. `setPointerCapture(pointerId)` is called on `pointerdown` and released in
`pointerup`/`pointercancel`/`destroy()`. `pointerState` is a tagged union of
`{type:"wheel"} | {type:"inner"} | null`.

Keyboard: `ArrowLeft/Right` adjust hue by 1° (Shift = 10°);
`Ctrl/Cmd+ArrowLeft/Right` adjust saturation; `ArrowUp/Down` adjust value
(Shift = 10); `Home/End` wrap hue. Each key press emits `input` + `change`.

EventEmitter: `Map<string, Set<ColorHandler>>`. `emit` clones the handler set
to an array so handlers that unsubscribe during dispatch don't skip siblings.
Listener errors are caught and logged.

## Key Algorithms & Math

### Geometry

```
innerR       = size / 2
wheelInnerR  = innerR + wheelSpacing
wheelOuterR  = wheelInnerR + wheelThickness
total        = wheelOuterR * 2
cx = cy      = total / 2
```

The wheel is always centered on the inner shape.

### Hue mapping

Hue 0° (red) is at the top (12 o'clock), increasing clockwise. Canvas y-axis
is inverted (y-down), so "clockwise on screen" = increasing canvas angle.

```
angle(hue)  = -π/2 + hue * π/180            (canvas radians)
hue(angle)  = ((angle + π/2) * 180/π) mod 360
theta       = atan2(dx, -dy)                (0 = top, increasing clockwise)
```

### Inner shapes (HSV from hue)

**triangle** — equilateral. Vertices: A = top (S=0, V=1, white), B =
bottom-right (S=1, V=1, pure hue), C = bottom-left (V=0, black). For interior
point P = α·A + β·B + γ·C with α+β+γ=1:

```
V = α + β
S = β / V        (when V > 0; S undefined at black vertex)
```

Inverse:

```
α = V·(1 − S),  β = S·V,  γ = 1 − V
```

When `rotateShape` is enabled, the triangle's pure-hue vertex rotates to
track the current hue position on the wheel (PRD §4.4).

**square** — inscribed square (side = `innerR · √2`). x → saturation
(0..1, left → right), y → value (1..0, top → bottom). Three stacked canvas
gradients: pure hue fill → white-to-transparent (S) → transparent-to-black (V).

**disk** — polar mapping. r → S, θ → V = (1+cos θ)/2. Smooth, no seam. The
tracked `diskTheta` field disambiguates the two θ values that map to the same
V so the inner marker stays where the user dragged it.

**none** — only the wheel renders; the inner area shows the current solid
color and is not interactive.

### Color math (`color-utils.ts`)

Pure functions, no DOM, no side effects:

| Function       | Purpose                                            |
|----------------|----------------------------------------------------|
| `hsvToRgb`     | HSV (0-360, 0-100, 0-100) → RGB (0-255)            |
| `rgbToHsv`     | RGB → HSV                                          |
| `rgbToHex`     | RGB → `#RRGGBB`                                    |
| `hexToRgb`     | `#RGB` / `#RRGGBB` / `#RRGGBBAA` → RGB (alpha discarded) |
| `hsvToHsl`     | HSV → HSL (0-360, 0-100, 0-100)                    |
| `hslToHsv`     | HSL → HSV                                          |
| `parseColor`   | Accepts hex / `rgb()` / `hsl()` / named colors / `{r,g,b}` / `{h,s,v}` / `{h,s,l}` → HSV |
| `formatHex`    | Normalize to `#RRGGBB`                             |
| `toColorOutput`| HSV → `ColorOutput` (hex + rgb + hsv + hsl)        |
| `clamp`        | Number clamp                                        |
| `clampHue`     | Normalize to [0, 360)                              |

Internal HSV representation: `h: 0-360`, `s: 0-100`, `v: 0-100` (percent, not
fraction). RGB is 0-255. HSL is 0-360 / 0-100 / 0-100.

## How to Extend / Modify

- **Add a new inner shape**: extend the `Shape` union, add a `draw<Shape>To`
  method, add it to the `renderInner` switch and the inner cache key. Document
  the SV mapping in the file header and in SKILL.md.
- **Change the marker style**: override `--color-picker-marker-border`,
  `--color-picker-marker-border-dark`, `--color-picker-focus-ring`, or
  `--color-picker-bg` on the host element. To change the marker geometry,
  edit `renderMarkers` (the triple-ring: white halo + dark ring + center
  dot).
- **Change the hue convention** (e.g. red at the right instead of top): edit
  `angle(hue)` / `hue(angle)` together — they must be inverse. The conic
  gradient start angle and the fallback arc start angle must move together.
- **Change cache granularity**: the cache key string in `renderWheel` /
  `renderInner` must include every input that affects the cached pixels.
  Forgetting an input produces stale renders; including a non-varying input
  causes unnecessary cache invalidation.
- **Add keyboard shortcuts**: extend `onKeyDown`. Each shortcut must emit
  `input` + `change` and call `updateAria()` so screen readers re-announce.

## Known Issues & TODOs

- **`rotateShape` for the triangle** is implemented but the triangle's
  rotation makes the inner marker's screen position appear to "lag" the hue
  drag because the marker is positioned in unrotated shape space. This is
  intentional (the marker tracks the SV position, not the hue) but can be
  visually confusing. Documented in the docs-concepts view.
- The `none` shape still consumes pointer events in the inner area, but does
  nothing with them. Could be made truly non-interactive (pass-through).
- The fallback arc-segment wheel (when `createConicGradient` is unavailable)
  is 720 segments — slower than the conic path but rare in practice.
- `setColor` accepts alpha in `#RRGGBBAA` / `#RGBA` strings but discards the
  alpha channel (the picker is RGB-only). A future enhancement could add an
  alpha ring or alpha slider.
- The `parseColor` named-color list is small. Extend it if you need more
  CSS named colors.

## Files This Component Touches (for cross-reference)

- React wrapper: `src/components/color-wheel/color-wheel-picker-react.tsx`
- Playground: `src/components/color-wheel/color-wheel-playground.tsx`
- Metadata: `src/lib/platform/content.ts` (slug `"color-wheel"`)
- Commands: `color-wheel.reset`, `color-wheel.triangle`, `color-wheel.square`,
  `color-wheel.disk`, `color-wheel.none`, `color-wheel.toggle-rotate` in
  `src/lib/commands/index.ts`.
