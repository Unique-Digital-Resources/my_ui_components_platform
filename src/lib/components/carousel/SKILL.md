# SKILL.md — Carousel

A vanilla TypeScript slide carousel. Renders a viewport with title +
optional description slides, prev/next arrow buttons, a dot indicator row,
optional `setInterval`-driven autoplay, loop or bounded navigation, slide
or fade transition, and keyboard navigation (ArrowLeft / ArrowRight). Pure
DOM, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  Carousel,
  type CarouselOptions,
  type CarouselSlide,
  type CarouselEventPayload,
  type CarouselHandler,
} from "@/lib/components/carousel";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const carousel = new Carousel(document.getElementById("host")!, {
  slides: [
    { id: "s1", title: "First", description: "The opening slide." },
    { id: "s2", title: "Second", description: "The middle slide.", color: "#2A2238" },
    { id: "s3", title: "Third", description: "The closing slide." },
  ],
  loop: true,
  autoplay: true,
  autoplayInterval: 4000,
});

carousel.on("change", ({ index, previousIndex, slideId, source }) => {
  console.log(`${previousIndex} -> ${index} (${slideId}, ${source})`);
});

// later
carousel.destroy();
```

---

## Constructor

```ts
new Carousel(container: HTMLElement, options?: CarouselOptions)
```

### Options

| Option              | Type                       | Default  | Description                                                       |
|---------------------|----------------------------|----------|-------------------------------------------------------------------|
| `slides`            | `CarouselSlide[]`          | `[]`     | Initial slides.                                                   |
| `current`           | `number`                   | `0`      | Initial active slide index. Clamped to `[0, slides.length - 1]`.  |
| `loop`              | `boolean`                  | `true`   | Wrap around at the boundaries.                                    |
| `autoplay`          | `boolean`                  | `false`  | Auto-advance slides on a `setInterval`.                           |
| `autoplayInterval`  | `number`                   | `3000`   | Autoplay interval in milliseconds.                                |
| `showArrows`        | `boolean`                  | `true`   | Show the prev/next arrow buttons.                                 |
| `showDots`          | `boolean`                  | `true`   | Show the dot indicator row.                                       |
| `transition`        | `"slide" \| "fade"`        | `"slide"`| Transition style. `"fade"` also translates the track (see AGENT.md). |

### Slide shape

```ts
interface CarouselSlide {
  id: string;
  title: string;
  description?: string;
  color?: string;        // slide background color (CSS color string)
}
```

The slide `id` is emitted in the `change` payload (`slideId`) but is NOT
reflected as a `data-*` attribute on the rendered slide div. To query a
slide by ID in the DOM, add your own attribute after render.

---

## Methods

| Method                                  | Returns | Description                                                       |
|-----------------------------------------|---------|-------------------------------------------------------------------|
| `next(source?)`                         | `void`  | Advance one slide. Wraps to 0 if `loop` and at end; no-op (no event) otherwise. Emits `change` (unless no-op). |
| `prev(source?)`                         | `void`  | Go back one slide. Wraps to last if `loop` and at 0; no-op otherwise. Emits `change` (unless no-op). |
| `goTo(index, source?)`                  | `void`  | Jump to a specific index. Clamped to `[0, slides.length - 1]`. **Always emits `change`, even if index is unchanged** (see AGENT.md). |
| `startAutoplay()`                       | `void`  | Start the autoplay interval (clears any existing one first).      |
| `stopAutoplay()`                        | `void`  | Stop the autoplay interval.                                       |
| `getCurrent()`                          | `number`| Current slide index.                                              |
| `setSlides(slides)`                     | `void`  | Replace all slides. Re-clamps `current`. Re-renders. **Does not emit `change`** (see AGENT.md). |
| `setProperty(name, value)`              | `void`  | Generic setter. Accepted `name`s: `loop`, `autoplay`, `autoplayInterval`, `showArrows`, `showDots`, `transition`, `slides` (case-sensitive; unknown names are ignored). |
| `on(event, handler)`                    | `void`  | Subscribe to `change`.                                            |
| `off(event, handler)`                   | `void`  | Unsubscribe.                                                      |
| `destroy()`                             | `void`  | Tear down. Idempotent. Clears autoplay interval, clears listeners, empties container. |

The `source` argument for `next` / `prev` / `goTo` is one of `"pointer" |
"keyboard" | "programmatic" | "autoplay"` and defaults to `"programmatic"`.
It's forwarded to the `change` payload so hosts can distinguish user-initiated
navigation from autoplay or programmatic calls.

```ts
carousel.next();             // programmatic
carousel.next("pointer");    // user clicked an arrow
carousel.goTo(2, "keyboard");
carousel.setSlides(newSlides);
carousel.setProperty("autoplay", true);
carousel.setProperty("autoplayInterval", 5000);
carousel.setProperty("loop", false);
carousel.setProperty("transition", "fade");
```

---

## Events

Handler signature: `(p: CarouselEventPayload) => void`. The `type` field is
injected by `emit()` and equals the event name.

| Event    | Payload                                                                  | When                                            |
|----------|--------------------------------------------------------------------------|-------------------------------------------------|
| `change` | `{ type: "change", index, previousIndex, slideId, source }`              | `goTo()` called (directly or via `next`/`prev`). Note: fires even when `index === previousIndex`. |

`setSlides()` and `setProperty()` do **not** emit.

```ts
carousel.on("change", ({ index, previousIndex, slideId, source }) => {
  if (index === previousIndex) return; // skip no-op (see AGENT.md)
  analytics.track("slide_viewed", { slideId, source });
});
```

The `source` field is one of `"pointer" | "keyboard" | "programmatic" |
"autoplay"`.

---

## CSS Custom Properties

All defined on `.crl-root` (override on the host element or any ancestor):

| Variable        | Default     | Description                                            |
|-----------------|-------------|--------------------------------------------------------|
| `--crl-bg`      | `#211A30`   | Root background (visible between/around slides).       |
| `--crl-surface` | `#2A2238`   | Arrow button background; dots row background.          |
| `--crl-border`  | `#383343`   | Root + arrow + dots row borders.                       |
| `--crl-text`    | `#F4F1FF`   | Slide title text; arrow icon color.                    |
| `--crl-muted`   | `#B8B2CA`   | Slide description text.                                |
| `--crl-accent`  | `#D9FF66`   | Lemon Signal — active dot, arrow hover, focus ring.    |
| `--crl-radius`  | `8px`       | Root border radius.                                    |

---

## Examples

### Basic carousel

```ts
const carousel = new Carousel(host, {
  slides: [
    { id: "1", title: "Welcome", description: "Get started with the Workshop library." },
    { id: "2", title: "Components", description: "Vanilla TS, framework-independent." },
    { id: "3", title: "Theming", description: "Override --crl-* variables on the host." },
  ],
});
carousel.on("change", ({ index }) => console.log("now showing slide", index));
```

### Autoplay with manual controls

```ts
const carousel = new Carousel(host, {
  slides,
  autoplay: true,
  autoplayInterval: 5000,
  loop: true,
});

// Pause on hover
host.addEventListener("mouseenter", () => carousel.stopAutoplay());
host.addEventListener("mouseleave", () => carousel.startAutoplay());

// Manual controls elsewhere in the UI
document.getElementById("prev-btn")!.addEventListener("click", () => carousel.prev("pointer"));
document.getElementById("next-btn")!.addEventListener("click", () => carousel.next("pointer"));
```

### Bounded (non-looping) carousel

```ts
const carousel = new Carousel(host, {
  slides,
  loop: false, // next/prev are no-ops at the boundaries
});
```

### Fade transition

```ts
const carousel = new Carousel(host, {
  slides,
  transition: "fade",
});
// Note: fade mode also translates the track (see AGENT.md Known Issues).
// For pure fade, override in CSS: .crl-track.crl-fade { transform: none !important; }
```

### Programmatic navigation

```ts
carousel.goTo(2, "programmatic");
carousel.next("programmatic");
carousel.prev("programmatic");
console.log(carousel.getCurrent());
```

### Updating via `setProperty`

```ts
carousel.setProperty("slides", newSlides);
carousel.setProperty("loop", false);
carousel.setProperty("autoplay", true);
carousel.setProperty("autoplayInterval", 3000);
carousel.setProperty("showArrows", false);
carousel.setProperty("showDots", true);
carousel.setProperty("transition", "fade");
```

### Colored slides

```ts
const carousel = new Carousel(host, {
  slides: [
    { id: "r", title: "Red",   color: "#FF858B" },
    { id: "g", title: "Green", color: "#8FE3A5" },
    { id: "b", title: "Accent", color: "#D9FF66" },
  ],
});
```

### Pointer + keyboard interaction

| Action                | Effect                                                       |
|-----------------------|--------------------------------------------------------------|
| Click the left arrow  | Previous slide (no-op if at start and not looping).          |
| Click the right arrow | Next slide (no-op if at end and not looping).                |
| Click a dot           | Jump to that slide.                                          |
| Focus + ArrowLeft     | Previous slide.                                              |
| Focus + ArrowRight    | Next slide.                                                  |

---

## Integration Notes

**When to use:** onboarding flows, image showcases, hero banners, feature
tours — any UI with a small set of full-width content slides and simple
next/prev navigation.

**When not to use:** large slide counts (the DOM scales linearly with
slides; there's no virtualization), rich per-slide content (only title +
description + background color are supported — fork or wrap for more), or
swipe-first mobile carousels (there's no drag gesture — see AGENT.md).

**Alternatives:** for a single rotating banner, a simple `setInterval` + CSS
animation may suffice. For swipeable mobile carousels, consider a dedicated
touch-carousel library.

**Autoplay caveats:** `setInterval` is throttled in backgrounded tabs to
~1000ms minimum, so autoplay slows when the user switches tabs. Autoplay
does not pause on hover or focus — wire that yourself with
`stopAutoplay()` / `startAutoplay()` if needed.

**Fade transition:** the `transition: "fade"` mode also translates the
track (the transform isn't skipped in fade mode). For a pure fade, override
`.crl-track.crl-fade { transform: none !important; }` in your stylesheet.

**Empty / single-slide edge cases:** with zero slides, the carousel renders
an empty viewport with non-functional arrows and an empty dots row. With one
slide, the dots show a single active dot and the arrows are no-ops (with
`loop: true` they emit `change` with `previousIndex === index === 0`).

**`change` event idempotency:** `goTo(currentIndex)` fires `change` with
`previousIndex === index` (no equality check). Filter in your handler if you
only care about real changes.

**Accessibility:** the root has `tabindex="0"` so it's keyboard-focusable.
Arrow buttons and dot buttons are real `<button>`s with `aria-label`s
(`"Previous"`, `"Next"`, `"Go to slide N"`). There is no `role="region"` or
`aria-live` on the slide region — add them yourself on the host if needed.

**Theming:** override the `--crl-*` variables on the host element (or any
ancestor of the root). The accent defaults to Lemon Signal `#D9FF66`. The
viewport is fixed at `240px` tall — override `.crl-viewport { height: ... }`
in your stylesheet to change it.

**Reduced motion:** the `@media (prefers-reduced-motion: reduce)` query
disables track + dot transitions. Autoplay itself is not affected (it's
`setInterval`-driven, not CSS).
