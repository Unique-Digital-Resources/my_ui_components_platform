# AGENT.md — Carousel

Contribution guide for `src/lib/components/carousel/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**Carousel** — a slide carousel component. Renders a viewport with a
flexbox track of slides (title + optional description + optional background
color), prev/next arrow buttons, a dot indicator row, optional autoplay
(`setInterval`-driven), loop or bounded navigation, slide or fade
transition, and keyboard navigation (ArrowLeft / ArrowRight). Pure DOM,
framework-independent.

## File Structure

```
src/lib/components/carousel/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── carousel.ts         ← the Carousel class
└── index.ts            ← barrel: class, types
```

## Architecture

Single `render()` builds the DOM tree:

```html
<div class="crl-root" tabindex="0">
  <div class="crl-viewport">
    <div class="crl-track">  <!-- .crl-fade added when transition === "fade" -->
      <div class="crl-slide" style="background?: {color}">
        <div class="crl-slide-title">{title}</div>
        <!-- if description: -->
        <div class="crl-slide-desc">{description}</div>
      </div>
      ...one per slide
    </div>
  </div>
  <!-- if showArrows: -->
  <button class="crl-arrow crl-arrow-left"  aria-label="Previous">{ICON_LEFT}</button>
  <button class="crl-arrow crl-arrow-right" aria-label="Next">{ICON_RIGHT}</button>
  <!-- if showDots: -->
  <div class="crl-dots">
    <button class="crl-dot" aria-label="Go to slide {i+1}"></button>  <!-- .crl-active on current -->
    ...
  </div>
</div>
```

The container is emptied (`container.innerHTML = ""`) before the new root is
appended — every state change is a full rebuild. The `trackEl` reference is
re-captured in each `render()` call so `updateTrack()` can mutate it without
a full re-render for slide changes.

`updateTrack()` does two things:
1. Sets `trackEl.style.transform = translateX(-{current * 100}%)`.
2. If `transition === "fade"`, iterates the track's children and sets
   `opacity: 1` for the current slide, `0` for others, with
   `transition: opacity .3s`.
3. Toggles the `crl-active` class on each dot.

Note that fade mode **also** translates the track (step 1 always runs), so
"fade" is really "fade + slide". See Known Issues.

### Style injection

`injectStyles()` is idempotent — guarded by
`document.getElementById("carousel-styles")`. All `--crl-*` variables are
defined on `.crl-root`. The `@media (prefers-reduced-motion: reduce)` query
disables track + dot transitions.

### Event system

Listeners are stored in `Map<string, Set<CarouselHandler>>` where the
handler signature is `(p: CarouselEventPayload) => void`. `emit()` spreads
the payload, injects a `type` field equal to the event name, and invokes
each handler inside a `try { ... } catch (e) { console.error(e); }` block.

Only one event is emitted: `change` (from `goTo()`). `next()` and `prev()`
are wrappers around `goTo()`, so they emit `change` too (unless they
short-circuit at a non-looping boundary — then no event fires).

### Pointer interaction model

There is **no drag/swipe gesture**. Interaction is via three real
`<button>` elements:

- **Arrow buttons** (`crl-arrow-left` / `crl-arrow-right`) — click calls
  `prev("pointer")` / `next("pointer")`. Always rendered when
  `showArrows: true`; they are not hidden at non-looping boundaries (clicking
  them just no-ops).
- **Dot buttons** (`crl-dot`) — click calls `goTo(i, "pointer")`. The
  current dot has the `crl-active` class (wider + accent-colored).

### Keyboard handling

The root has `tabindex="0"` so it's keyboard-focusable. A `keydown`
listener on the root handles `ArrowLeft` (calls `prev("keyboard")`) and
`ArrowRight` (calls `next("keyboard")`), both with `preventDefault()`. No
Home/End, no Space, no Tab cycling between slides.

### Autoplay

`startAutoplay()` clears any existing `setInterval` handle and starts a new
one that calls `next("autoplay")` every `autoplayInterval` milliseconds.
`stopAutoplay()` clears the interval. Autoplay uses **wall-clock time**
(`setInterval`), not `requestAnimationFrame` — so backgrounded tabs (which
browsers throttle to ~1000ms minimum) will slow autoplay down. Autoplay
does not pause on hover or focus (see Known Issues).

### Public API surface

```ts
class Carousel {
  constructor(container: HTMLElement, options?: CarouselOptions)

  next(source?: "pointer" | "keyboard" | "programmatic" | "autoplay"): void
  prev(source?: "pointer" | "keyboard" | "programmatic" | "autoplay"): void
  goTo(index: number, source?: "pointer" | "keyboard" | "programmatic" | "autoplay"): void

  startAutoplay(): void
  stopAutoplay(): void

  getCurrent(): number
  setSlides(slides: CarouselSlide[]): void

  setProperty(name: string, value: unknown): void
    // loop | autoplay | autoplayInterval | showArrows | showDots | transition | slides

  on(event: string, handler: CarouselHandler): void
  off(event: string, handler: CarouselHandler): void
  destroy(): void
}
```

Emitted events: `change` (see SKILL.md for payload).

### Internal state

- `opts: Required<CarouselOptions>` — all options normalized with defaults.
- `slides: CarouselSlide[]` — a shallow-clone of the slides passed in
  (`s => ({ ...s })`). Top-level fields are isolated; `CarouselSlide` has
  no nested fields, so this is safe.
- `current: number` — the active slide index. Clamped to
  `[0, slides.length - 1]` on construct and on `setSlides()`.
- `trackEl: HTMLElement` — the `crl-track` div. Re-captured on every
  `render()`. Mutated in place by `updateTrack()` (transform / opacity) so
  slide changes don't require a full re-render.
- `autoplayTimer: ReturnType<typeof setInterval> | null` — the active
  interval handle, or null. Cleared by `stopAutoplay()` and `destroy()`.
- `listeners: Map<string, Set<CarouselHandler>>` — event subscriptions.
- `_destroyed: boolean` — idempotent-`destroy()` guard.

### CSS custom properties

All defined on `.crl-root` in `injectStyles()`:

| Variable        | Default     | Purpose                                            |
|-----------------|-------------|----------------------------------------------------|
| `--crl-bg`      | `#211A30`   | Root background (visible between/around slides).   |
| `--crl-surface` | `#2A2238`   | Arrow button background; dots row background.      |
| `--crl-border`  | `#383343`   | Root + arrow + dots row borders.                   |
| `--crl-text`    | `#F4F1FF`   | Slide title text; arrow icon color.                |
| `--crl-muted`   | `#B8B2CA`   | Slide description text.                            |
| `--crl-accent`  | `#D9FF66`   | Lemon Signal — active dot, arrow hover, focus ring. |
| `--crl-radius`  | `8px`       | Root border radius.                                |

## Coding Conventions

- TypeScript strict, named exports.
- `injectStyles()` idempotent — guarded by `document.getElementById(STYLE_ID)`.
- `destroy()` is idempotent — guarded by a `_destroyed` flag; clears the
  autoplay interval, clears listeners, and empties the container.
- No React/framework imports in this folder.
- No emojis.
- All public mutating methods early-return on `_destroyed`.
- `emit()` wraps each handler in `try/catch` so one bad handler doesn't break
  the rest.

## Known Issues

- **`goTo()` always emits, even when the index is unchanged.** Unlike
  `setPlayhead` in `AnimationTrackEditor`, there's no equality check. Calling
  `goTo(currentIndex)` fires a `change` event with `previousIndex === index`.
  Hosts that re-render on `change` may loop.
- **`setSlides()` does not emit `change`**, even when the current index is
  clamped to fit the new slide count. Hosts listening for `change` won't be
  notified of the implicit repositioning.
- **Fade mode also translates.** `updateTrack()` always sets
  `transform: translateX(-current * 100%)`, even when
  `transition === "fade"`. So fade mode is really "fade + slide" — slides
  both translate and cross-fade. For pure fade, the transform should be
  skipped in fade mode.
- **Autoplay uses `setInterval` (wall-clock).** Backgrounded tabs throttle
  intervals to ~1000ms minimum, so autoplay slows down or appears to stall
  when the user switches tabs. A `requestAnimationFrame`-based timer with
  manual accumulation would be more consistent.
- **No pause-on-hover or pause-on-focus.** Autoplay continues regardless of
  user interaction. Hosts wanting pause-on-hover must wire it themselves
  (`mouseenter` → `stopAutoplay()`, `mouseleave` → `startAutoplay()`).
- **No drag/swipe gesture.** Touch devices only get the 32×32px arrow
  buttons. Adding pointer-drag support would require a `pointerdown` /
  `pointermove` / `pointerup` gesture on the viewport that tracks the
  delta and commits via `goTo()` on release.
- **No empty-state.** With zero slides, the carousel renders an empty
  viewport with non-functional arrows and an empty dots row. No "no slides"
  message.
- **Single-slide edge case.** With one slide, the dots show a single active
  dot and the arrows are no-ops (with `loop: true` they wrap to the same
  slide and emit `change` with `previousIndex === index === 0`).
- **Slide `id` is not reflected in the DOM.** The `CarouselSlide.id` field
  is in the type and emitted in the `change` payload (`slideId`), but the
  rendered slide div has no `data-slide-id` attribute. Hosts needing to
  query a slide by ID in the DOM must add their own attribute after render.
- **`setProperty` silently ignores unknown names.** Accepted names are
  `loop`, `autoplay`, `autoplayInterval`, `showArrows`, `showDots`,
  `transition`, `slides` (case-sensitive). Unknown names return without
  warning.
- **Arrows not hidden at non-looping boundaries.** When `loop: false` and
  at the start/end, the arrows remain visible and clicking them is a silent
  no-op (no event fires). Hosts wanting disabled-state styling must add
  their own classes.

## Debugging Tips

1. **Slides not changing?** Check `loop`. When `loop: false` and you're at
   the boundary, `next()` / `prev()` short-circuit and emit nothing — there's
   no error and no event. Wrap your `change` handler to log to confirm.
2. **Autoplay not running?** Confirm `opts.autoplay` is true and
   `autoplayInterval > 0`. `setInterval` is throttled in backgrounded tabs
   to ~1000ms minimum — keep the tab focused while testing.
3. **Fade looks weird?** Fade mode also translates the track (see Known
   Issues). For a pure fade, override `.crl-track.crl-fade { transform: none
   !important; }` in your stylesheet, or skip `goTo()` and toggle opacity
   manually.
4. **Keyboard not working?** The root has `tabindex="0"` — click it (or Tab
   to it) first to give it focus. The `keydown` listener is on the root, not
   `window`, so focus must be on the carousel itself.
5. **Inspecting slide state.** There are no `data-slide-id` attributes on
   the rendered slides. Query `.crl-track > .crl-slide` and index by
   `getCurrent()`. The active dot is `.crl-dot.crl-active`.
6. **`change` fires with `previousIndex === index`?** That means `goTo()`
   was called with the current index (see Known Issues). Filter in your
   handler if you only care about real changes.
