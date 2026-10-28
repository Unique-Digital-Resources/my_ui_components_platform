# SKILL.md — Collapse

A vanilla JavaScript accordion / collapse panel. Renders a list of titled
items, each with a clickable header (chevron + optional icon + title) and
an animated body section. Supports accordion mode (one open at a time),
per-item `defaultOpen`, disabled items, and keyboard activation
(Enter / Space). DOM-based, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  Collapse,
  type CollapseOptions,
  type CollapseItem,
  type CollapseEventPayload,
  type CollapseHandler,
} from "@/lib/components/collapse";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const panel = new Collapse(document.getElementById("host")!, {
  items: [
    { id: "general", title: "General", content: "App preferences.", defaultOpen: true },
    { id: "privacy", title: "Privacy", content: "Privacy settings." },
    { id: "advanced", title: "Advanced", content: "Power-user options.", disabled: true },
  ],
  accordion: true,
});

panel.on("toggle", ({ itemId, openIds, source }) => {
  console.log(source, "toggled", itemId, "->", openIds);
});

// later
panel.destroy();
```

---

## Constructor

```ts
new Collapse(container: HTMLElement, options?: CollapseOptions)
```

### Options

| Option          | Type             | Default | Description                                                       |
|-----------------|------------------|---------|-------------------------------------------------------------------|
| `items`         | `CollapseItem[]` | `[]`    | Initial items.                                                    |
| `accordion`     | `boolean`        | `false` | When true, opening one item closes all others.                    |
| `showIcons`     | `boolean`        | `true`  | Whether to render each item's `icon` field.                       |
| `defaultOpenIds`| `string[]`       | `[]`    | IDs that should be open at construction time.                     |

### Item shape

```ts
interface CollapseItem {
  id: string;            // unique within the panel
  title: string;
  content: string;
  icon?: string;         // rendered as plain text inside a 14px span
  disabled?: boolean;    // default false; disabled items cannot be toggled
  defaultOpen?: boolean; // default false; opens at construction
}
```

---

## Methods

| Method                                   | Returns     | Description                                                            |
|------------------------------------------|-------------|------------------------------------------------------------------------|
| `toggle(itemId, source?)`                | `void`      | Toggle an item open/closed. `source` defaults to `"programmatic"`.     |
| `open(itemId)`                           | `void`      | Open an item. In accordion mode, closes all others first.              |
| `close(itemId)`                          | `void`      | Close an item.                                                         |
| `closeAll()`                             | `void`      | Close every item. Emits `toggle` with `openIds: []`.                   |
| `getOpenIds()`                           | `string[]`  | IDs of currently open items.                                           |
| `setItems(items)`                        | `void`      | Replace all items. Resets `openIds` and re-applies `defaultOpen`.      |
| `setProperty(name, value)`               | `void`      | Update `"accordion"`, `"showIcons"`, or `"items"` (delegates to `setItems`). |
| `on(event, handler)`                     | `void`      | Subscribe to the `toggle` event.                                       |
| `off(event, handler)`                    | `void`      | Unsubscribe.                                                           |
| `destroy()`                              | `void`      | Tear down. Idempotent.                                                 |

---

## Events

| Event    | Payload                                                                          | When                                              |
|----------|----------------------------------------------------------------------------------|---------------------------------------------------|
| `toggle` | `{ type: "toggle", itemId?: string, openIds: string[], source: "pointer" \| "keyboard" \| "programmatic" }` | Any open/close action. `itemId` is omitted by `closeAll`. |

```ts
panel.on("toggle", ({ itemId, openIds, source }) => {
  if (source === "keyboard") logKeyboardActivation(itemId);
  persistOpenState(openIds);
});
```

---

## CSS Custom Properties

All variables are defined on `.clp-root` and inherited by descendants.
Override on the host element (or any ancestor of the collapse root) to
re-theme.

| Variable          | Default     | Description                                            |
|-------------------|-------------|--------------------------------------------------------|
| `--clp-surface`   | `#211A30`   | Item background (Deep Violet surface).                 |
| `--clp-surface-2` | `#2A2238`   | Trigger hover background.                              |
| `--clp-border`    | `#383343`   | Item border.                                           |
| `--clp-text`      | `#F4F1FF`   | Primary text color.                                    |
| `--clp-muted`     | `#B8B2CA`   | Chevron, icon, and body content text.                  |
| `--clp-accent`    | `#D9FF66`   | Lemon Signal — open chevron and focus ring.            |
| `--clp-radius`    | `8px`       | Item corner radius.                                    |

```css
#my-panel { --clp-accent: #FFB400; --clp-surface: #1A1A22; }
```

---

## Examples

### Accordion (one open at a time)

```ts
const panel = new Collapse(container, {
  items: [
    { id: "a", title: "Section A", content: "Content for A." },
    { id: "b", title: "Section B", content: "Content for B." },
    { id: "c", title: "Section C", content: "Content for C." },
  ],
  accordion: true,
  defaultOpenIds: ["a"],
});
```

### Multi-open panel

```ts
const panel = new Collapse(container, {
  items: [...],
  accordion: false,
});
panel.open("a");
panel.open("b"); // both stay open
```

### Programmatic control

```ts
panel.closeAll();
panel.open("c");
panel.setItems(newItems);
panel.setProperty("accordion", true);
```

### React wrapper pattern

```tsx
"use client";
import { useEffect, useRef } from "react";
import { Collapse } from "@/lib/components/collapse";

export function Demo({ items }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const panel = new Collapse(ref.current, { items, accordion: true });
    panel.on("toggle", ({ openIds }) => console.log(openIds));
    return () => panel.destroy();
  }, [items]);
  return <div ref={ref} />;
}
```

---

## Integration Notes

**When to use:** a vertically-stacked list of titled sections where each
section can be expanded or collapsed — FAQs, settings panels, navigation
groups, or disclosure widgets. Use accordion mode when only one section
should be visible at a time.

**When not to use:** tabbed interfaces (use `ToggleGroup` or a tabs
component instead), modals (use `Drawer` or a dialog), or anything
requiring rich HTML body content — `Collapse` only accepts a plain-text
`content` string.

**Alternatives:**
- [Drawer](../drawer/SKILL.md) — for a single, large, slide-in panel
  rather than a stacked list.
- [ToggleGroup](../toggle-group/SKILL.md) — for a flat row of toggle
  buttons rather than expandable sections.
- Native `<details>` / `<summary>` — zero-JS, but no accordion mode and
  no theming hooks.

**Accessibility:** each trigger is a real `<button>` with `aria-expanded`
reflecting its open state. Enter and Space both toggle. Disabled items
are visually muted and not focus-interactive. `prefers-reduced-motion`
disables the open/close transition.

**Theming:** override the `--clp-*` variables on the host (or any
ancestor) to re-skin. The accent color drives the open-chevron and the
focus ring.

**Caveats:** item content taller than ~1000px will be clipped during the
open animation (see AGENT.md "Known Issues"). For long content, prefer
accordion mode or a non-animated layout.
