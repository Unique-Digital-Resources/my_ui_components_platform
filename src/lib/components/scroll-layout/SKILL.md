# SKILL.md — Scroll Layout

A vanilla JavaScript scroll-region wrapper. Adds a configurable scroll
container around any existing markup: vertical, horizontal, or both;
auto / always / hidden / hover scrollbars; optional min/max height;
optional top/bottom inset shadows that appear when content overflows.
DOM-based, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  ScrollLayout,
  type ScrollLayoutOptions,
  type ScrollOrientation,
  type ScrollbarMode,
} from "@/lib/components/scroll-layout";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const scroller = new ScrollLayout(document.getElementById("host")!, {
  orientation: "vertical",
  scrollbar: "auto",
  maxHeight: 400,
  showShadow: true,
});

// later
scroller.destroy();
```

The host element's existing children become the scrollable content.

---

## Constructor

```ts
new ScrollLayout(container: HTMLElement, options?: ScrollLayoutOptions)
```

The container's existing children are moved into a `.sl-content` div inside
a new `.sl-root` scroll container. No content is destroyed on first
construction.

### Options

| Option         | Type                                        | Default      | Description                                                       |
|----------------|---------------------------------------------|--------------|-------------------------------------------------------------------|
| `orientation`  | `"vertical" \| "horizontal" \| "both"`      | `"vertical"` | Which axes can scroll.                                            |
| `scrollbar`    | `"auto" \| "always" \| "hidden" \| "hover"` | `"auto"`     | Scrollbar visibility mode. `"always"` behaves like `"auto"` (see AGENT.md Known Issues). |
| `maxHeight`    | `number`                                    | `0`          | Max height in pixels. `0` means not set.                          |
| `minHeight`    | `number`                                    | `0`          | Min height in pixels. `0` means not set.                          |
| `showShadow`   | `boolean`                                   | `false`      | Show inset top/bottom shadows when content overflows.             |

---

## Methods

| Method                          | Returns      | Description                                                       |
|---------------------------------|--------------|-------------------------------------------------------------------|
| `scrollToTop()`                 | `void`       | Smoothly scrolls to the top of the content.                       |
| `scrollToBottom()`              | `void`       | Smoothly scrolls to the bottom of the content.                    |
| `getContentEl()`                | `HTMLElement`| Returns the `.sl-content` div. Append/insert children here to grow the scrollable region. |
| `setProperty(name, value)`      | `void`       | Update one option at runtime. Supported `name`s: `"orientation"`, `"scrollbar"`, `"maxHeight"`, `"minHeight"`, `"showShadow"`. **Warning:** triggers a full re-render; see AGENT.md Known Issues for the nesting side effect. |
| `destroy()`                     | `void`       | Tear down. Idempotent. Removes the scroll listener and clears the container's innerHTML. |

---

## Events

This component does not emit events. To react to scroll position, attach
your own listener to the root element via the returned content's parent:

```ts
const scroller = new ScrollLayout(host, { showShadow: true });
const root = scroller.getContentEl().parentElement!;
root.addEventListener("scroll", () => {
  const atBottom = root.scrollTop + root.clientHeight >= root.scrollHeight - 1;
  if (atBottom) loadMore();
});
```

---

## CSS Custom Properties

All declared on `.sl-root` and cascade to children.

| Variable       | Default         | Description                                                        |
|----------------|-----------------|--------------------------------------------------------------------|
| `--sl-bg`      | `transparent`   | Scroll container background.                                       |
| `--sl-border`  | `#383343`       | Scrollbar thumb color (also used as the `scrollbar-color` track).  |
| `--sl-shadow`  | `rgba(0,0,0,.3)`| Inset edge shadow color when `showShadow` is enabled.             |

The scrollbar thumb hover color is hardcoded to `#B8B2CA` in the
stylesheet (not a variable). To override it, target
`.sl-root::-webkit-scrollbar-thumb:hover` in your own CSS.

---

## Examples

### Basic vertical scroll region

```ts
const scroller = new ScrollLayout(host, {
  orientation: "vertical",
  maxHeight: 400,
});
const content = scroller.getContentEl();
for (let i = 0; i < 50; i++) {
  const p = document.createElement("p");
  p.textContent = `Item ${i}`;
  content.appendChild(p);
}
```

### Horizontal carousel strip

```ts
const scroller = new ScrollLayout(host, {
  orientation: "horizontal",
  scrollbar: "hover",
});
const content = scroller.getContentEl();
content.style.display = "flex";
content.style.gap = "8px";
items.forEach((item) => content.appendChild(renderCard(item)));
```

### Scroll with edge shadows

```ts
const scroller = new ScrollLayout(host, {
  orientation: "vertical",
  maxHeight: 300,
  showShadow: true,
});
```

### Hidden scrollbar (still scrollable)

```ts
const scroller = new ScrollLayout(host, {
  orientation: "vertical",
  scrollbar: "hidden",
  maxHeight: 320,
});
```

### Programmatic scroll-to-bottom (e.g. chat log)

```ts
appendMessage(text);
scroller.scrollToBottom();
```

### Append children dynamically

```ts
const scroller = new ScrollLayout(host, { maxHeight: 400 });
function addRow(text: string) {
  const el = document.createElement("div");
  el.textContent = text;
  scroller.getContentEl().appendChild(el);
}
```

### Retheme via CSS variables

```css
.my-scroller-host {
  --sl-border: #D9FF66;     /* lemon scrollbar thumb */
  --sl-shadow: rgba(217,255,102,0.15);
}
```

---

## Integration Notes

**When to use:** Wrapping any block of content that may overflow its
allotted height/width and needs a controlled, themeable scroll region.
Particularly useful for chat logs, long lists, code panels, and sidebars
that should not push page layout.

**When not to use:** When you need virtualized rendering for very long
lists (1000+ items) — ScrollLayout renders whatever children you give it.
For a list component with built-in virtualization, build on top of this
component or use a dedicated virtual list.

**When not to use:** When you need bidirectional synchronized scrolling,
custom scroll physics, or pull-to-refresh. This is a thin wrapper, not a
scroll engine.

**Alternatives:**
- For an interactive table that handles its own internal scroll, see
  [Table Editor](../table-editor/SKILL.md).
- For a tall document editor, see
  [Rich Text Editor](../rich-text-editor/SKILL.md).

**Avoid `setProperty()` for hot updates.** Because of the nesting side
effect described in AGENT.md, prefer `destroy()` + reconstruct when
changing orientation or scrollbar mode. For dynamic content, use
`getContentEl()` to add/remove children directly without touching the
layout options.

**Accessibility:** The `.sl-root` is a plain scroll container; it is
keyboard-scrollable when it has focus. To make it focusable, add
`tabindex="0"` to the host element before construction, or to `.sl-root`
after construction. The component does not apply ARIA roles — wrap with
`role="region"` and `aria-label` yourself if the region is meaningful.

**Retheming:** Override `--sl-bg`, `--sl-border`, and `--sl-shadow` on
the host element or any ancestor. The scrollbar thumb hover color is
hardcoded `#B8B2CA` — override `.sl-root::-webkit-scrollbar-thumb:hover`
in your own CSS if needed.
