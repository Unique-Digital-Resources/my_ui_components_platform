# SKILL.md — Marquee

A vanilla JavaScript infinite-scrolling ticker. Renders a list of text
items in a horizontal or vertical track that loops seamlessly (the
content is duplicated and the CSS animation translates by exactly 50%
of the track's scroll size). Four directions (left / right / up /
down), configurable speed in px/s, pause on hover, configurable gap
and separator, and programmatic pause/resume. Pure CSS animation,
framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  Marquee,
  type MarqueeOptions,
  type MarqueeDirection,
} from "@/lib/components/marquee";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const ticker = new Marquee(document.getElementById("host")!, {
  items: ["Breaking news", "Stocks up 2%", "Weather: sunny"],
  direction: "left",
  speed: 60,
  pauseOnHover: true,
});

// pause/resume programmatically
ticker.pause();
ticker.resume();

// later
ticker.destroy();
```

---

## Constructor

```ts
new Marquee(container: HTMLElement, options?: MarqueeOptions)
```

For vertical directions (`"up"` / `"down"`), the container must have a
fixed height — the root sets `height: 100%`, so a zero-height container
collapses the marquee to nothing.

### Options

| Option          | Type               | Default | Description                                                       |
|-----------------|--------------------|---------|-------------------------------------------------------------------|
| `items`         | `string[]`         | `[]`    | Text items to render.                                             |
| `direction`     | `MarqueeDirection` | `"left"`| Scroll direction: `"left"`, `"right"`, `"up"`, `"down"`.          |
| `speed`         | `number`           | `50`    | Scroll speed in pixels per second. Higher = faster.               |
| `pauseOnHover`  | `boolean`          | `true`  | Pause the animation when the pointer enters the marquee.          |
| `gap`           | `number`           | `24`    | Gap (px) between items (and between items and separators).        |
| `showSeparator` | `boolean`          | `true`  | Render a separator span after each item.                          |
| `separator`     | `string`           | `"•"`   | Separator text (rendered in the accent color).                    |

```ts
type MarqueeDirection = "left" | "right" | "up" | "down";
```

---

## Methods

| Method                       | Returns   | Description                                                            |
|------------------------------|-----------|------------------------------------------------------------------------|
| `pause()`                    | `void`    | Pause the animation. Adds the `mq-paused` class.                       |
| `resume()`                   | `void`    | Resume the animation. Removes the `mq-paused` class.                   |
| `isPaused()`                 | `boolean` | Current pause state.                                                   |
| `setItems(items)`            | `void`    | Replace all items. Triggers a full re-render.                          |
| `setProperty(name, value)`   | `void`    | Update any option: `direction`, `speed`, `pauseOnHover`, `gap`, `showSeparator`, `separator`, `items`. |
| `destroy()`                  | `void`    | Tear down. Idempotent.                                                 |

**Note:** `setProperty("speed", n)` is the only property change that does
not trigger a full re-render — it calls `applyAnimation()` directly to
recompute the duration. All other property changes re-render the track.

**There is no `on()` / `off()` method and no emitted events.** The
marquee is a fire-and-forget visual component. Hosts that need to react
to item clicks or scroll position must attach their own DOM listeners.

---

## Events

None. The marquee does not emit events.

---

## CSS Custom Properties

All variables are defined on `.mq-root` and inherited by descendants.
Override on the host element (or any ancestor of the marquee root) to
re-theme.

| Variable       | Default   | Description                                            |
|----------------|-----------|--------------------------------------------------------|
| `--mq-text`    | `#F4F1FF` | Primary item text color.                              |
| `--mq-muted`   | `#B8B2CA` | Reserved for muted text (available for overrides).    |
| `--mq-accent`  | `#D9FF66` | Lemon Signal — separator color.                       |
| `--mq-border`  | `#383343` | Root border.                                           |
| `--mq-surface` | `#211A30` | Root background (Deep Violet surface).                 |

```css
#my-ticker { --mq-accent: #FFB400; --mq-surface: #1A1A22; }
```

---

## Examples

### Horizontal news ticker

```ts
const ticker = new Marquee(host, {
  items: ["Breaking: market hits record high", "Sports: local team wins", "Weather: rain tomorrow"],
  direction: "left",
  speed: 60,
  separator: "—",
});
```

### Vertical marquee (e.g. a scrolling list)

```ts
// The container must have a height:
//   <div id="host" style="height: 200px"></div>
const ticker = new Marquee(host, {
  items: ["Item 1", "Item 2", "Item 3", "Item 4"],
  direction: "up",
  speed: 30,
  gap: 12,
  showSeparator: false,
});
```

### Reverse direction

```ts
const ticker = new Marquee(host, {
  items: ["Scrolling rightward..."],
  direction: "right",
  speed: 40,
});
```

### Programmatic pause/resume

```ts
const ticker = new Marquee(host, { items, pauseOnHover: false });
ticker.pause();
// ...do something...
ticker.resume();
console.log(ticker.isPaused()); // false
```

### Dynamic item updates

```ts
ticker.setItems(["New item A", "New item B", "New item C"]);
ticker.setProperty("speed", 80);   // faster, no full re-render
ticker.setProperty("separator", "|");
```

### Custom theming via CSS variables

```css
.status-bar { --mq-surface: transparent; --mq-border: transparent; --mq-accent: #D9FF66; }
.status-bar .mq-item { font-size: 11px; }
```

### React wrapper pattern

```tsx
"use client";
import { useEffect, useRef } from "react";
import { Marquee } from "@/lib/components/marquee";

export function Ticker({ items }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ticker = new Marquee(ref.current, { items, speed: 60 });
    return () => ticker.destroy();
  }, [items]);
  return <div ref={ref} style={{ width: "100%" }} />;
}
```

---

## Integration Notes

**When to use:** news tickers, status bars, log streams, promotional
carousels, or any "scrolling text" UI where the content is meant to be
glanced at rather than read in full. Good for ambient information
display.

**When not to use:** content that needs to be read carefully (the
constant motion is distracting), interactive carousels with
user-controlled navigation (use a proper carousel component instead),
or accessibility-critical content (the marquee has no `prefers-reduced-
motion` handling and no ARIA roles for the scrolling content).

**Alternatives:**
- CSS-only `@keyframes` animation on a `display: flex` track — if you
  don't need the JS API, a static HTML structure with a CSS animation
  is simpler and lighter.
- A proper carousel component — for user-controlled, paginated content
  rather than ambient scrolling.
- Static list — if the content fits in the available space, just render
  it without animation.

**Accessibility:** the marquee has no `prefers-reduced-motion` handling
— the animation always runs. There are no ARIA roles on the scrolling
content. For accessibility, consider hiding the marquee from assistive
technology (`aria-hidden="true"`) and providing the same information in
a static, accessible element elsewhere.

**Vertical mode:** for `direction: "up"` or `"down"`, the container
must have a fixed height (the root sets `height: 100%`). Without a
height, the marquee collapses to zero.

**Pause behavior:** `pauseOnHover` and programmatic `pause()` share
the same `paused` flag. If you call `pause()` while the pointer is over
the marquee and then move the pointer away, `mouseleave` will call
`resume()` and override your pause. For independent programmatic
control, set `pauseOnHover: false` and manage pause state yourself.

**Animation duration:** computed once at render time from
`trackEl.scrollWidth / 2 / speed` (or `scrollHeight` for vertical). If
the container or items change size after construction (e.g. font
loads, container resizes), the duration becomes stale and the loop may
become non-seamless. Re-call `setItems(items)` (or any
`setProperty` other than `speed`) to force a re-render and recompute
the duration.

**Theming:** override the `--mq-*` variables on the host (or any
ancestor) to re-skin. The accent color drives the separator.
