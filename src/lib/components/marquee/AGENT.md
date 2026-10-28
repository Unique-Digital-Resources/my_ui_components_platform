# AGENT.md — Marquee

Contribution guide for `src/lib/components/marquee/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**Marquee** — a DOM-based infinite-scrolling ticker. Renders a list of
text items in a horizontal or vertical track that loops seamlessly. The
track's content is duplicated; the CSS animation translates the track
by exactly 50% of its scroll size, so the second copy lands precisely
where the first began. Features: four directions (left / right / up /
down), configurable speed (px/s), pause on hover, configurable gap and
separator, and programmatic pause/resume. Pure CSS animation — no
`requestAnimationFrame` loop.

Notable: this is the only component in the set with **no event API**.
There is no `on()` / `off()` method and no emitted events.

## File Structure

```
src/lib/components/marquee/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── marquee.ts          ← the Marquee class (DOM + scoped CSS)
└── index.ts            ← barrel: class, types
```

## Architecture

The class builds a single root `<div class="mq-root mq-{horizontal|vertical}">`
containing one `<div class="mq-track">`. The track's children are built by
`buildItems()`, which is called **twice** in `render()` — the entire item
list (with separators) is appended twice back-to-back. This duplication is
what makes the seamless loop possible: the CSS keyframes translate the
track from `0` to `-50%` (or `+50%` to `0` for reverse directions), so
when the animation completes one cycle, the second copy is exactly where
the first copy started, and the loop is visually continuous.

Each item is a `<span class="mq-item">` with `textContent` set to the item
string. If `showSeparator` is true, a `<span class="mq-separator">` with
the separator text is appended after every item (including the last item
of each copy — so two separators appear between the last item of copy 1
and the first item of copy 2; this is intentional and produces a
consistent visual rhythm for bullet-style separators).

The CSS keyframes are:

| Direction | Keyframes              | Effect                          |
|-----------|------------------------|---------------------------------|
| `left`    | `translateX(0)` → `translateX(-50%)` | Track moves left; new items enter from the right. |
| `right`   | `translateX(-50%)` → `translateX(0)` | Track moves right; new items enter from the left. |
| `up`      | `translateY(0)` → `translateY(-50%)` | Track moves up; new items enter from the bottom. |
| `down`    | `translateY(-50%)` → `translateY(0)` | Track moves down; new items enter from the top. |

The animation is applied to `.mq-track` via `trackEl.style.animation =
"mq-scroll-${direction} ${duration}s linear infinite"`. The duration is
computed in `applyAnimation()`:

```
size     = isVertical ? trackEl.scrollHeight : trackEl.scrollWidth
distance = size / 2                     // one full copy
duration = distance > 0 ? distance / speed : 10   // seconds
```

`speed` is in pixels per second (default 50). The half-size is used
because the track contains two copies, so a single cycle of the animation
covers one copy's worth of distance.

Styles are injected once per document by `injectStyles()`, guarded by
`document.getElementById(STYLE_ID)` (`STYLE_ID = "marquee-styles"`).

Pause / resume: `pause()` sets the internal `paused` flag and adds the
`.mq-paused` class to the root, which sets `animation-play-state: paused`
on the track. `resume()` clears both. When `pauseOnHover` is true, the
root gets `mouseenter` / `mouseleave` listeners that call `pause()` /
`resume()`. Note that `pauseOnHover` and programmatic `pause()` share the
same `paused` flag — moving the mouse away after a programmatic `pause()`
will call `resume()` and override it.

### Public API surface

```ts
class Marquee {
  constructor(container: HTMLElement, options?: MarqueeOptions)

  pause(): void
  resume(): void
  isPaused(): boolean

  setItems(items: string[]): void
  setProperty(name: string, value: unknown): void

  destroy(): void
}
```

Constructor options (`MarqueeOptions`):

| Field           | Type              | Default   | Notes                                              |
|-----------------|-------------------|-----------|----------------------------------------------------|
| `items`         | `string[]`        | `[]`      | Text items to render.                              |
| `direction`     | `MarqueeDirection`| `"left"`  | Scroll direction.                                  |
| `speed`         | `number`          | `50`      | Scroll speed in px/s.                              |
| `pauseOnHover`  | `boolean`         | `true`    | Pause when the pointer enters the root.            |
| `gap`           | `number`          | `24`      | Gap (px) between items (and separators).           |
| `showSeparator` | `boolean`         | `true`    | Render a separator span after each item.           |
| `separator`     | `string`          | `"•"`     | Separator text.                                    |

```ts
type MarqueeDirection = "left" | "right" | "up" | "down";
```

`setProperty(name, value)` accepts: `"direction"`, `"speed"` (calls
`applyAnimation` only — no full re-render), `"pauseOnHover"`, `"gap"`,
`"showSeparator"`, `"separator"`, `"items"` (delegates to `setItems`).
Any other name is ignored. Everything except `"speed"` triggers a full
`render()` (because the root class, track structure, or separator
styling may change).

**No events are emitted.** There is no `on()` or `off()` method. Hosts
that need to react to scroll position, item clicks, or animation state
must attach their own listeners to the DOM.

### Internal state

- `root: HTMLElement` — the `.mq-root` element.
- `trackEl: HTMLElement` — the `.mq-track` element (the animated child).
- `opts: Required<MarqueeOptions>` — fully defaulted copy of constructor options.
- `items: string[]` — shallow-cloned item list.
- `paused: boolean` — current pause state (shared by `pauseOnHover` and programmatic `pause()`).
- `_destroyed: boolean` — guards `destroy()` and all public methods against post-teardown use.

Note: there is no `listeners` map (no event system) and no `ResizeObserver`
(see Known Issues).

### CSS custom properties

All defined on `.mq-root` and inherited by descendants:

| Variable        | Default   | Purpose                                            |
|-----------------|-----------|----------------------------------------------------|
| `--mq-text`     | `#F4F1FF` | Primary item text color.                           |
| `--mq-muted`    | `#B8B2CA` | Reserved for muted text (not currently used in the default styles, but available for overrides). |
| `--mq-accent`   | `#D9FF66` | Lemon Signal — separator color.                    |
| `--mq-border`   | `#383343` | Root border.                                       |
| `--mq-surface`  | `#211A30` | Root background (Deep Violet surface).             |

## Coding Conventions

- TypeScript strict, named exports.
- `injectStyles()` is idempotent — guarded by `document.getElementById(STYLE_ID)`.
- `destroy()` is idempotent — guarded by the `_destroyed` flag; wipes
  the container via `innerHTML = ""`.
- All public methods short-circuit on `_destroyed`.
- Items and options are shallow-cloned on construction and on
  `setItems()` so external mutation does not leak into the rendered state.
- The track content is duplicated in `render()` (two calls to
  `buildItems()`); this is intentional and required for the seamless loop.
- No React/framework imports in this folder.
- No emojis.

## Known Issues

- No `prefers-reduced-motion` handling. The CSS animation runs
  unconditionally; users who prefer reduced motion will still see
  continuous scrolling. A `@media (prefers-reduced-motion: reduce)
  { .mq-track { animation: none !important; } }` rule should be added
  to `injectStyles`.
- No `ResizeObserver`. The animation duration is computed once at
  `render()` time from `trackEl.scrollWidth` / `scrollHeight`. If the
  container or items change size later (e.g. font loads, container
  resizes, items are added), the duration is stale and the loop may
  become non-seamless. A `ResizeObserver` on the track (or container)
  that re-runs `applyAnimation()` would fix this.
- No event API. There is no `on()` / `off()` method, so hosts cannot
  react to scroll position, item clicks, or pause/resume changes from
  outside. Hosts that need item clicks must attach their own listeners
  to `.mq-item` elements after construction.
- Items are rendered as plain text via `textContent` — no HTML, no
  icons, no per-item styling. For rich items, the host must manipulate
  `.mq-track` directly after construction (and avoid calling `setItems`
  afterwards).
- The animation runs even when the marquee is offscreen. No
  `IntersectionObserver` pauses the animation when the element is not
  visible, which wastes CPU on long pages.
- `pauseOnHover` and programmatic `pause()` share the same `paused`
  flag. If you call `pause()` while the pointer is over the marquee
  and then move the pointer away, `mouseleave` will call `resume()`
  and override your programmatic pause. Hosts that need independent
  programmatic control should disable `pauseOnHover` and manage pause
  state themselves.
- For vertical directions, the root needs a height. The CSS sets
  `.mq-root.mq-vertical { height: 100% }`, so the container must have
  a fixed height or the marquee will collapse to zero height.
- The separator is appended after every item, including the last item
  of each copy. For bullet separators (`"•"`) this looks correct; for
  long separators (e.g. `"---"`) the duplicate separator between the
  two copies may look doubled.
- If the items do not fill at least half the container's width (or
  height, for vertical), the seamless loop will show empty space.
  There is no min-content enforcement.

## Debugging Tips

- If the loop is not seamless (you see a jump or empty space at the
  loop point), the track's `scrollWidth` (or `scrollHeight`) is not
  exactly twice the visible content. Inspect `.mq-track` in DevTools
  and check `scrollWidth / 2` against the root's `clientWidth`. Add
  more items or use longer content to fill the gap.
- The `mq-paused` class is the single source of pause state. To verify
  pause, inspect the root in DevTools and check whether `mq-paused` is
  present.
- For vertical marquees, set an explicit height on the container
  (e.g. `style="height: 200px"`). Without it, the root collapses to
  zero height and nothing renders.
- The animation duration is computed in `applyAnimation()` from
  `trackEl.scrollWidth / 2 / speed`. To speed up or slow down, change
  `speed` (higher = faster) via the constructor or
  `setProperty("speed", n)` — the latter is efficient (no full re-render).
- To inspect the duplicated content, expand `.mq-track` in DevTools:
  the items appear twice, in the same order, with the same separators.
