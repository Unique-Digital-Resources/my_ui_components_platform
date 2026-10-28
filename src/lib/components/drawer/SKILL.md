# SKILL.md — Drawer

A vanilla JavaScript slide-in panel that covers one edge of the viewport
(top / bottom / left / right). Optional dimmed overlay, close on overlay
click, close on Escape, header with title and close button, scrollable
body, and smooth transform-based slide animation. Programmatic open /
close / toggle with attributed source (pointer / keyboard /
programmatic). DOM-based, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  Drawer,
  type DrawerOptions,
  type DrawerSide,
  type DrawerEventPayload,
  type DrawerHandler,
} from "@/lib/components/drawer";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const drawer = new Drawer(document.getElementById("host")!, {
  side: "right",
  size: 360,
  title: "Settings",
  content: "Adjust your preferences here.",
});

drawer.on("change", ({ open, source }) => {
  console.log(source, "drawer now", open ? "open" : "closed");
});

document.getElementById("open-btn")!.addEventListener("click", () => drawer.open("pointer"));

// later
drawer.destroy();
```

---

## Constructor

```ts
new Drawer(container: HTMLElement, options?: DrawerOptions)
```

The panel and overlay are appended to the container but use
`position: fixed`, so they cover the viewport regardless of the
container's bounds. (If any ancestor of the container has `transform`,
`filter`, `perspective`, or `will-change`, the fixed positioning
resolves against that ancestor — see Integration Notes.)

### Options

| Option                | Type         | Default   | Description                                                       |
|-----------------------|--------------|-----------|-------------------------------------------------------------------|
| `side`                | `DrawerSide` | `"right"` | Edge the panel slides in from: `"top"`, `"bottom"`, `"left"`, `"right"`. |
| `size`                | `number`     | `360`     | Panel width (left/right) or height (top/bottom) in px.            |
| `open`                | `boolean`    | `false`   | Initial open state.                                               |
| `showOverlay`         | `boolean`    | `true`    | Whether to render the dimmed overlay behind the panel.            |
| `closeOnOverlayClick` | `boolean`    | `true`    | Close the drawer when the overlay is clicked.                     |
| `closeOnEscape`       | `boolean`    | `true`    | Close on Escape (document-level keydown).                         |
| `title`               | `string`     | `""`      | Header title. Also sets `aria-label` on the panel.                |
| `content`             | `string`     | `""`      | Body content (plain text).                                        |

```ts
type DrawerSide = "top" | "bottom" | "left" | "right";
```

---

## Methods

| Method                          | Returns  | Description                                                            |
|---------------------------------|----------|------------------------------------------------------------------------|
| `open(source?)`                 | `void`   | Open the drawer. No-op (and no event) if already open.                 |
| `close(source?)`                | `void`   | Close the drawer. No-op (and no event) if already closed.             |
| `toggle(source?)`               | `void`   | Toggle open/closed.                                                    |
| `isOpen()`                      | `boolean`| Current open state.                                                    |
| `setContent(content)`           | `void`   | Replace the body text (plain text — no HTML).                          |
| `setTitle(title)`               | `void`   | Replace the header title. Also updates `aria-label`.                   |
| `setProperty(name, value)`      | `void`   | Update any option: `side`, `size`, `showOverlay`, `closeOnOverlayClick`, `closeOnEscape`, `title`, `content`, `open`. |
| `on(event, handler)`            | `void`   | Subscribe to the `change` event.                                       |
| `off(event, handler)`           | `void`   | Unsubscribe.                                                           |
| `destroy()`                     | `void`   | Tear down. Idempotent.                                                 |

The `source` argument for `open` / `close` / `toggle` defaults to
`"programmatic"`. Use `"pointer"` for button-click triggers and
`"keyboard"` for keyboard-activated triggers so the `change` event
payload correctly attributes the source.

---

## Events

| Event    | Payload                                                                          | When                                              |
|----------|----------------------------------------------------------------------------------|---------------------------------------------------|
| `change` | `{ type: "change", open: boolean, source: "pointer" \| "keyboard" \| "programmatic" }` | The drawer actually opened or closed. No event if the state did not change. |

```ts
drawer.on("change", ({ open, source }) => {
  if (open && source === "pointer") analytics.track("drawer_opened_from_button");
});
```

Note: `change` fires synchronously at the start of the slide animation,
not when the transition completes.

---

## CSS Custom Properties

None. The drawer's injected CSS hardcodes every color (surface
`#211A30`, border `#383343`, text `#F4F1FF`, muted `#B8B2CA`, accent
`#D9FF66`, overlay `rgba(0,0,0,.5)`). To re-theme, override the class
rules directly in a follow-up stylesheet with higher specificity:

```css
.my-app .dr-panel { background: #1A1A22; border-color: #4A4259; }
.my-app .dr-title { color: #FFFFFF; }
.my-app .dr-close:hover { background: #2A2238; }
```

---

## Examples

### Right-side drawer with button trigger

```ts
const drawer = new Drawer(host, {
  side: "right",
  size: 320,
  title: "Filters",
  content: "Refine your search.",
});

document.getElementById("filters-btn")!.addEventListener("click", () => {
  drawer.open("pointer");
});
```

### Bottom sheet

```ts
const sheet = new Drawer(host, {
  side: "bottom",
  size: 240,
  title: "Quick Actions",
  content: "...",
  closeOnOverlayClick: true,
});
```

### No-overlay side panel

```ts
const panel = new Drawer(host, {
  side: "left",
  size: 280,
  showOverlay: false,
  closeOnOverlayClick: false,
  closeOnEscape: false,
  title: "Inspector",
  content: "Selection details.",
});
```

### Programmatic control

```ts
drawer.setContent("Updated content.");
drawer.setTitle("New Title");
drawer.setProperty("side", "left");
drawer.setProperty("size", 420);
drawer.toggle("programmatic");
```

### Injecting HTML body content

```ts
const drawer = new Drawer(host, { title: "Details" });
const body = drawer["container"].querySelector(".dr-body") as HTMLElement;
// or, more cleanly, query the panel after construction:
const body2 = host.querySelector(".dr-body") as HTMLElement;
body2.innerHTML = "<strong>Rich</strong> content here.";
// Do NOT call drawer.setContent afterwards — it would overwrite the HTML.
```

### React wrapper pattern

```tsx
"use client";
import { useEffect, useRef } from "react";
import { Drawer } from "@/lib/components/drawer";

export function Demo({ open, onClose }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const drawer = new Drawer(ref.current, { title: "Settings", side: "right" });
    drawer.on("change", ({ open }) => !open && onClose());
    return () => drawer.destroy();
  }, [onClose]);

  useEffect(() => {
    // open state is controlled externally
    drawerRef.current?.toggle("programmatic");
  }, [open]);

  return <div ref={ref} />;
}
```

---

## Integration Notes

**When to use:** a temporary, focused surface that slides in from a
viewport edge — settings panels, filter sheets, inspectors, detail
views. Good for any "open this, do a thing, close it" flow that
shouldn't navigate away from the current page.

**When not to use:** persistent sidebars (use a CSS grid layout
instead), modals that need to fully cover the viewport and trap focus
(use a proper dialog component with focus management — this Drawer
does not trap focus), or content that needs to scroll with the page
(the panel is `position: fixed`).

**Alternatives:**
- [Collapse](../collapse/SKILL.md) — for stacked expandable sections
  rather than a single slide-in panel.
- Native `<dialog>` — browser-native modal with built-in focus trap;
  use it if you need full modal semantics rather than a slide-in.
- CSS-only fixed sidebar — if you don't need the open/close animation
  or the JS API, a static sidebar is simpler.

**Accessibility:** the panel has `role="dialog"` and
`aria-modal="true"`. The title is mirrored to `aria-label`. Escape
closes the drawer (when `closeOnEscape` is true). However, focus is
not moved into the panel on open and Tab can leave the dialog — for
full accessibility, supplement with a focus-trap utility.

**Theming:** no CSS custom properties. Override the `.dr-*` class
rules directly (see "CSS Custom Properties" above).

**Animation:** the slide transition is `transform .28s
cubic-bezier(.22, .61, .36, 1)`. The `change` event fires at the start
of the animation, not at the end. `prefers-reduced-motion: reduce`
disables the transition.

**Caveats:** the panel and overlay are `position: fixed` but appended
to the container. If any ancestor of the container has `transform`,
`filter`, `perspective`, or `will-change`, the fixed positioning
resolves against that ancestor instead of the viewport, and the drawer
will be mis-placed or clipped. To avoid this, either ensure no
ancestor uses those properties, or move the drawer host to a top-level
element (e.g. `document.body`).
