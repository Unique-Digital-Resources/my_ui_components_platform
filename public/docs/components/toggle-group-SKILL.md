# SKILL.md — Toggle Group

A vanilla JavaScript group of toggle buttons. Multi/single-select, closable
items, drag-to-reorder, dynamic add/remove. Three variants (primary /
secondary / outline), three sizes (sm / md / lg), horizontal or vertical
orientation. Built-in icon set. DOM-based, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  ToggleGroup,
  type ToggleGroupOptions,
  type ToggleButtonItem,
  type ToggleGroupOrientation,
  type ToggleGroupVariant,
  type ToggleGroupSize,
} from "@/lib/components/toggle-group";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const group = new ToggleGroup(document.getElementById("group")!, {
  items: [
    { id: "bold", label: "Bold", icon: "bold", selected: true },
    { id: "italic", label: "Italic", icon: "italic" },
    { id: "underline", label: "Underline", icon: "underline" },
  ],
  multiselect: true,
  closable: true,
  reorderable: true,
});

group.on("change", ({ selected }) => console.log("selected:", selected));
group.on("close", ({ id }) => console.log("closed:", id));
group.on("reorder", ({ items }) => console.log("reordered:", items.map((i) => i.id)));

group.destroy();
```

---

## Constructor

```ts
new ToggleGroup(container: HTMLElement, options?: ToggleGroupOptions)
```

### Options

| Option         | Type                                  | Default     | Description                                                       |
|----------------|---------------------------------------|-------------|-------------------------------------------------------------------|
| `items`        | `ToggleButtonItem[]`                  | Bold/Italic/Underline | Initial items. Each has `{ id, label, icon?, selected? }`. |
| `multiselect`  | `boolean`                             | `false`     | Allow multiple items to be selected simultaneously.               |
| `closable`     | `boolean`                             | `false`     | Show a close (X) button on each item.                             |
| `reorderable`  | `boolean`                             | `false`     | Allow drag-to-reorder.                                            |
| `orientation`  | `"horizontal" \| "vertical"`          | `"horizontal"` | Layout direction.                                              |
| `variant`      | `"primary" \| "secondary" \| "outline"` | `"outline"` | Visual style for items.                                          |
| `size`         | `"sm" \| "md" \| "lg"`                | `"md"`      | Item size.                                                        |

### Item shape

```ts
interface ToggleButtonItem {
  id: string;          // unique within the group
  label: string;
  icon?: string;       // built-in name | data URI | raw <svg> string
  selected?: boolean;  // default false
}
```

### Built-in icons

`check`, `x`, `plus`, `star`, `circle`, `square`, `heart`, `bolt`, `dot`,
`arrow-right`, `settings`, `folder`, `file`, `user`, `tag`, `eye`, `bell`,
`search`, `home`, `bold`, `italic`, `underline`.

Icons can also be:
- A `data:image/...` URI → rendered as `<img>`.
- A raw `<svg>...</svg>` string → rendered inline with the
  `toggle-group__icon` class injected.

---

## Public Methods

| Method                          | Returns                  | Description                                                          |
|---------------------------------|--------------------------|----------------------------------------------------------------------|
| `getItems()`                    | `ToggleButtonItem[]`     | All items (clones).                                                  |
| `setItems(items)`               | `void`                   | Replace all items. Fires `change`.                                   |
| `addItem(item)`                 | `void`                   | Append an item. Fires `change`.                                      |
| `removeItem(id)`                | `void`                   | Remove an item by ID. Fires `change`.                                |
| `getSelected()`                 | `string[]`               | Array of selected item IDs.                                          |
| `setSelected(ids)`              | `void`                   | Set the selection. Fires `change`.                                   |
| `setMultiselect(on)`            | `void`                   | Toggle multi-select mode.                                            |
| `setClosable(on)`               | `void`                   | Toggle close buttons.                                                |
| `setReorderable(on)`            | `void`                   | Toggle drag-to-reorder.                                              |
| `setOrientation(orientation)`   | `void`                   | Swap horizontal ↔ vertical.                                          |
| `setVariant(variant)`           | `void`                   | Change the visual variant.                                           |
| `setSize(size)`                 | `void`                   | Change the item size.                                                |
| `on(event, handler)`            | `void`                   | Subscribe to `change`, `select`, `reorder`, or `close`.              |
| `off(event, handler)`           | `void`                   | Unsubscribe.                                                          |
| `destroy()`                     | `void`                   | Tear down. Idempotent.                                               |

---

## Events

| Event     | Payload                                | When                                                          |
|-----------|----------------------------------------|---------------------------------------------------------------|
| `change`  | `{ items: ToggleButtonItem[], selected: string[] }` | Selection changed (click or `setSelected`).        |
| `select`  | `{ id: string, selected: boolean }`    | A single item's selection toggled.                            |
| `reorder` | `{ items: ToggleButtonItem[] }`        | Items reordered via drag.                                     |
| `close`   | `{ id: string }`                       | An item's close button clicked (the item is also removed).    |

```ts
group.on("change", ({ selected }) => applySelected(selected));
group.on("select", ({ id, selected }) => console.log(id, selected));
group.on("reorder", ({ items }) => persistOrder(items.map((i) => i.id)));
group.on("close", ({ id }) => console.log("user closed", id));
```

---

## Code Examples

### Single-select segmented control

```ts
const group = new ToggleGroup(container, {
  items: [
    { id: "list", label: "List", icon: "list" },
    { id: "grid", label: "Grid", icon: "square", selected: true },
    { id: "tree", label: "Tree", icon: "folder" },
  ],
  multiselect: false,
  variant: "outline",
});
group.on("change", ({ selected }) => setViewMode(selected[0]));
```

### Multi-select formatting toolbar

```ts
const group = new ToggleGroup(container, {
  items: [
    { id: "bold", label: "Bold", icon: "bold" },
    { id: "italic", label: "Italic", icon: "italic" },
    { id: "underline", label: "Underline", icon: "underline" },
  ],
  multiselect: true,
  variant: "secondary",
});
group.on("change", ({ selected }) => applyFormatting(selected));
```

### Closable + reorderable tabs

```ts
const group = new ToggleGroup(container, {
  items: openTabs.map((t) => ({ id: t.id, label: t.title, icon: "file" })),
  closable: true,
  reorderable: true,
  variant: "outline",
  size: "sm",
});
group.on("close", ({ id }) => closeTab(id));
group.on("reorder", ({ items }) => persistTabOrder(items.map((i) => i.id)));
```

### Programmatic manipulation

```ts
group.addItem({ id: "new", label: "New", icon: "plus" });
group.removeItem("old");
group.setSelected(["a", "b"]);
group.setVariant("primary");
group.setSize("lg");
```

### Custom icon (data URI)

```ts
const group = new ToggleGroup(container, {
  items: [
    { id: "x", label: "Custom", icon: "data:image/svg+xml;base64,..." },
  ],
});
```

### React wrapper

```tsx
"use client";
import { ToggleGroupReact } from "@/components/toggle-group/toggle-group-react";

export function Demo() {
  const [selected, setSelected] = useState<string[]>(["bold"]);
  return (
    <ToggleGroupReact
      items={[
        { id: "bold", label: "Bold", icon: "bold" },
        { id: "italic", label: "Italic", icon: "italic" },
      ]}
      multiselect
      selected={selected}
      onChange={({ selected: s }) => setSelected(s)}
    />
  );
}
```

---

## Integration Notes

- **Plain HTML**: import the compiled `.js` file as an ES module.
- **React**: use the wrapper at
  `src/components/toggle-group/toggle-group-react.tsx`.
- **Drag-to-reorder**: when `reorderable` is true, a 4px move threshold
  distinguishes a click from a drag. Below the threshold, the click toggles
  the item; above, the drag begins.
- **Closable items**: the close button stops event propagation so clicking
  it doesn't toggle the item. The `close` event fires before the item is
  removed from the DOM.
- **Selection in single-select mode**: clicking the selected item
  deselects it (toggle-off). Pass an empty array to `setSelected([])` to
  deselect all programmatically.
- **Accessibility**: each item is a real `<button>` with `aria-pressed`
  reflecting its selected state. The group has `role="group"`. Tab moves
  between items; Enter/Space toggles.
- **Theming**: items use the platform's `--brand-lemon` for the selected
  state. Override via CSS custom properties on the host element.
- **Reduced motion**: the `@media (prefers-reduced-motion: reduce)` query
  disables transitions.

---

## Related Components

- [Custom Button](../custom-button/SKILL.md) — for standalone buttons
  outside a group.
- [Smart Tooltip](../smart-tooltip/SKILL.md) — attach tooltips to toggle
  items for hover hints.
