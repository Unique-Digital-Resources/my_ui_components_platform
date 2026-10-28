# AGENT.md — ConnectionPath

Contribution guide for `src/lib/components/connection-path/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**ConnectionPath** — a standalone SVG overlay component that draws
bezier / step / straight / rounded paths between two endpoints. Each
endpoint is either a fixed `{ x, y, side? }` point or a DOM element
reference (tracked via `ResizeObserver` so the path follows the element as
it moves or resizes). Features: per-path stroke / width / dash / opacity,
arrowheads (start / end / both / none) with configurable size, midpoint
labels, animated dash-flow, direction-aware control points (perpendicular
to each endpoint's `side`), click + hover events per path, multiple paths
managed in one overlay, and auto-redraw on window/container/element
resize.

The module also exports four standalone path-computation functions
(`bezierPath`, `stepPath`, `straightPath`, `roundedPath`) and the
`Endpoint` discriminated union (`PointEndpoint | ElementEndpoint`) so
callers can compute SVG path strings without instantiating the component.

## File Structure

```
src/lib/components/connection-path/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── connection-path.ts  ← the ConnectionPath class + standalone path functions
└── index.ts            ← barrel: class, functions, types
```

## Architecture

SVG-based overlay (not canvas). On construction the class appends a single
`<svg class="cp-overlay">` to the container (sized `100% × 100%`,
`position: absolute`, `inset: 0`). The container should be
`position: relative`; otherwise the overlay resolves against the nearest
positioned ancestor. A `<defs>` element holds the arrow `<marker>`
definitions; the rest of the SVG holds the per-connection paths and
labels.

`injectStyles()` is idempotent — guarded by
`document.getElementById(STYLE_ID)` where `STYLE_ID =
"connection-path-styles"`. The injected CSS includes the overlay, path,
hit-path, and label classes, the `cp-dash-flow` keyframes, and a
`prefers-reduced-motion` override that disables path animation.

Each connection produces up to four SVG elements on `redraw()`:

1. `<path class="cp-path-hit">` — invisible (`stroke: transparent`,
   `stroke-width: 16`), wider than the visible stroke so thin paths are
   still easy to click. This is the element that receives `click` and
   `mouseenter` listeners when `interactive` is enabled.
2. `<path class="cp-path">` — the visible stroke.
3. `<rect class="cp-label-bg">` — opaque background behind the label
   (optional, only when `conn.label` is set).
4. `<text class="cp-label">` — the label text at the connection midpoint
   (optional, only when `conn.label` is set).

Arrow markers are added to `<defs>` as `<marker>` elements with IDs
`cp-arrow-start-${conn.id}` and `cp-arrow-end-${conn.id}`. The visible
path references them via `marker-start` / `marker-end`.

### Endpoint model (discriminated union)

```ts
interface PointEndpoint {
  type: "point";
  x: number; y: number;
  side?: ConnectionSide;     // default "right"
}

interface ElementEndpoint {
  type: "element";
  element: HTMLElement | string;  // ref or CSS selector (resolved against container)
  side?: ConnectionSide;          // default "right"
  offset?: number;                // px from the side center; default 0
}

type Endpoint = PointEndpoint | ElementEndpoint;
```

`resolveEndpoint(ep)` resolves to `{ x, y, side }` in container-local
coordinates:

- `PointEndpoint` — returns `{ x, y, side ?? "right" }` directly.
- `ElementEndpoint` — looks up the element (via
  `container.querySelector(selector)` if a string was passed), reads its
  `getBoundingClientRect()`, and computes the connection point at the
  center of the chosen side, offset by `offset` pixels inward from that
  side. The element is also added to the `ResizeObserver` so the path
  re-renders when the element resizes.

If the element can't be found, `resolveEndpoint` returns `null` and the
connection is silently skipped on that redraw (no error, no event).

### Path computation

`computePath(conn)` resolves both endpoints, picks the shape
(`conn.shape ?? opts.shape`), and delegates to one of the four standalone
functions:

| Shape      | Function      | Notes                                                                              |
|------------|---------------|------------------------------------------------------------------------------------|
| `bezier`   | `bezierPath`  | Cubic bezier. Control points extend perpendicular to each endpoint's side by `max(40, dist * curvature)` px. |
| `step`     | `stepPath`    | Orthogonal. Exits 30px from the source side, then a single bend to the entry.      |
| `straight` | `straightPath`| Plain `M ... L ...`. Ignores sides.                                                |
| `rounded`  | `roundedPath` | Like `step` but with quadratic `Q` rounding at the bend (8px radius).              |

All four functions are exported so callers can compute path strings
without instantiating the component.

### Animation

When `conn.animated` is true, the visible path gets a CSS animation
`cp-dash-flow ${duration}s linear infinite`, where
`duration = 1000 / speed * 20` and `speed = conn.animationSpeed ?? 50`.
If no `strokeDasharray` is set, `"6 4"` is applied automatically so the
dash-flow is visible. The keyframes translate `stroke-dashoffset` from 0
to -1000. `prefers-reduced-motion: reduce` disables the animation.

### Auto-redraw

`redraw()` clears all `<g>`, `<path>`, `<text>`, `<rect>` children of the
SVG (preserving `<defs>`), rebuilds the `<defs>` markers, and re-creates
every connection's elements. It is called on:

- construction (via `render()`)
- `window` resize
- container resize (`ResizeObserver` on the container)
- element-endpoint resize (each `ElementEndpoint`'s element is added to
  the same `ResizeObserver` during `resolveEndpoint`)
- any data operation: `addConnection`, `removeConnection`,
  `updateConnection`, `setConnections`
- any property change via `setProperty` (except `connections`, which
  delegates to `setConnections`)

### Pointer interaction

When `opts.interactive` is `true` (default), the overlay gets the
`cp-interactive` class which sets `pointer-events: auto`. Each hit-path
gets `click` and `mouseenter` listeners that emit `path_click` and
`path_hover` events with the connection ID. When `interactive` is `false`,
the overlay has `pointer-events: none` and no listeners are attached;
paths can't be clicked at all.

### Events

Events are emitted via a `Map<string, Set<ConnectionPathHandler>>`. The
private `emit()` shallow-clones the payload, stamps it with `type: event`,
and wraps each handler call in `try / catch` (errors go to
`console.error`) so one failing handler does not block the others.

### Public API surface

```ts
class ConnectionPath {
  constructor(container: HTMLElement, options?: ConnectionPathOptions)

  redraw(): void
  addConnection(conn: ConnectionDef): void
  removeConnection(id: string): void
  updateConnection(id: string, changes: Partial<ConnectionDef>): void
  setConnections(conns: ConnectionDef[]): void
  getConnections(): ConnectionDef[]

  setProperty(name: string, value: unknown): void

  on(event: string, handler: ConnectionPathHandler): void
  off(event: string, handler: ConnectionPathHandler): void
  destroy(): void
}

// Standalone path functions (also exported)
function bezierPath(from: { x: number; y: number }, to: { x: number; y: number }, fromSide?: ConnectionSide, toSide?: ConnectionSide, curvature?: number): string
function stepPath(from: { x: number; y: number }, to: { x: number; y: number }, fromSide?: ConnectionSide, toSide?: ConnectionSide): string
function straightPath(from: { x: number; y: number }, to: { x: number; y: number }): string
function roundedPath(from: { x: number; y: number }, to: { x: number; y: number }, fromSide?: ConnectionSide, toSide?: ConnectionSide): string
```

Constructor options (`ConnectionPathOptions`): `connections?`,
`stroke?` (default `"#6B5FA8"`), `strokeWidth?` (default `2`),
`shape?` (default `"bezier"`), `arrow?` (default `"none"`),
`arrowSize?` (default `10`), `curvature?` (default `0.4`),
`interactive?` (default `true`).

`setProperty` accepts: `"stroke"`, `"strokeWidth"`, `"shape"`, `"arrow"`,
`"arrowSize"`, `"curvature"`, `"interactive"`, `"connections"` (delegates
to `setConnections`). Any other name is ignored.

Emitted events:

| Event                | Payload                                                                     | When                                            |
|----------------------|-----------------------------------------------------------------------------|-------------------------------------------------|
| `path_click`         | `{ type, connectionId, source: "pointer" }`                                 | User clicks a path's hit area (interactive only). |
| `path_hover`         | `{ type, connectionId, source: "pointer" }`                                 | Pointer enters a path's hit area (interactive only). |
| `connection_added`   | `{ type, connectionId, source: "programmatic" }`                            | `addConnection` succeeded.                      |
| `connection_removed` | `{ type, connectionId, source: "programmatic" }`                            | `removeConnection` succeeded.                   |

### Internal state

- `overlay: SVGSVGElement` — the root SVG.
- `defsEl: SVGDefsElement` — the `<defs>` holding arrow markers.
- `opts: Required<ConnectionPathOptions>` — fully defaulted copy of constructor options.
- `connections: ConnectionDef[]` — shallow-cloned connection list (so external mutation does not affect the rendered state).
- `pathEls: Map<string, { path, hitPath, label?, labelBg? }>` — cached SVG handles per connection ID.
- `resizeObserver: ResizeObserver | null` — observes the container and every `ElementEndpoint`'s element.
- `windowResizeHandler: (() => void) | null` — bound listener on `window`.
- `listeners: Map<string, Set<ConnectionPathHandler>>` — event subscriptions.
- `_destroyed: boolean` — guards `destroy()` and all public methods.

### CSS custom properties

Only two `--cp-*` variables are defined, both on `.cp-label-bg`:

| Variable     | Default   | Purpose                                            |
|--------------|-----------|----------------------------------------------------|
| `--cp-bg`    | `#101014` | Label background fill (Obsidian).                  |
| `--cp-border`| `#383343` | Label background stroke.                           |

`.cp-label` also reads `--font-mono` (with fallback `ui-monospace, monospace`)
for the label typeface. All other colors (path stroke, marker fill) come
from the connection definition or `opts.stroke` (default `"#6B5FA8"`), not
from CSS variables.

## Coding Conventions

- TypeScript strict, named exports. The class and the four path functions
  are all named exports (no default export).
- `injectStyles()` is idempotent — guarded by `document.getElementById(STYLE_ID)`.
- `destroy()` is idempotent — guarded by the `_destroyed` flag; removes
  the `window` resize listener, disconnects the `ResizeObserver`, clears
  listeners, and removes the overlay from the DOM.
- All public methods short-circuit on `_destroyed`.
- Connections and options are shallow-cloned on construction and on
  `setConnections()` / `addConnection()` so external mutation does not
  leak into the rendered state.
- SVG elements are created with `document.createElementNS` (not
  `createElement`).
- No React/framework imports in this folder.
- No emojis.

## Known Issues

- `stepPath` emits a path string with a duplicate `L ${entry.x} ${entry.y}
  L ${entry.x} ${entry.y}` segment — the second `L` is a no-op (same
  point). The function computes `midX` / `midY` but never uses them,
  suggesting the intended path was more elaborate (a true orthogonal
  step through the midpoint). The current output is effectively
  "exit source side, then a straight line to the entry point, then to
  the destination" — fine for most cases, but not a true L-shaped step
  for arbitrary side combinations.
- `roundedPath` rounds only a single bend at the midpoint between exit
  and entry; it does not round every turn. For connections where the
  exit/entry directions don't align, the rounding can look lopsided.
- Label background width is estimated as `label.length * 6 + 8` — only
  accurate for ASCII characters at 10px monospace. Wide characters
  (CJK, emoji) will overflow; narrow characters will look padded.
- Arrow markers are appended to `<defs>` via `defsEl.innerHTML +=
  arrowMarker(...)` inside a loop. Each iteration re-parses the existing
  markup, so adding N connections is O(N²) in `<defs>` parsing. For
  hundreds of connections, prefer `createElementNS` + `appendChild`.
- When an `ElementEndpoint`'s element is removed from the DOM, the
  `ResizeObserver` keeps a reference but `resolveEndpoint` returns
  `null` and the path silently disappears — no event is emitted, no
  console warning.
- The overlay has no `role`, `aria-label`, or `aria-describedby`
  attributes. Connections are not exposed to assistive technology. For
  accessible diagrams, supplement with a textual description of the
  connections.
- `interactive: false` makes the entire overlay `pointer-events: none`,
  so paths cannot be hovered or clicked at all. There is no per-path
  interactivity toggle.
- `updateConnection` does not emit an event (unlike `addConnection` and
  `removeConnection`). Hosts that need to react to updates must do so
  at the call site.

## Debugging Tips

- If a path is not rendering, open DevTools and check that the
  `ElementEndpoint`'s element exists in the DOM and is inside the
  overlay's container. `resolveEndpoint` silently returns `null` for
  missing elements.
- The hit-path is transparent and 16px wide. To see it while debugging,
  temporarily set `stroke: magenta` on `.cp-path-hit` in DevTools — it
  will reveal the actual click target.
- If the dash-flow animation looks static, verify the path has a
  `stroke-dasharray`. When `animated` is true, the component
  auto-applies `"6 4"` if none is set; if you supply your own
  dasharray, make sure it has visible gaps.
- `redraw()` is called on every container resize. If you see excessive
  redraws (e.g. when an element endpoint is being animated by a parent),
  throttle the parent animation or detach the `ResizeObserver`
  temporarily.
- The arrow marker `refX` is `size - 2`, which means the arrow tip
  sits 2px inside the path endpoint. If arrows look detached from the
  path, check that `arrowSize` is not larger than the path segment
  leading into the endpoint.
