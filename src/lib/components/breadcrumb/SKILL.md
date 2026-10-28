# SKILL.md — Breadcrumb

A navigation trail component for displaying hierarchical paths (e.g.
Home / Projects / Web App / Settings). Supports max-items collapse with an
overflow menu, configurable separators, per-item icons, and full keyboard
navigation.

## Installation

```ts
import { Breadcrumb } from "@workshop/breadcrumb";
```

No CSS import required — scoped styles (`.crumb-` prefix) are injected
automatically.

## Quick Start

```ts
import { Breadcrumb } from "@workshop/breadcrumb";

const trail = new Breadcrumb(container, {
  items: [
    { id: "home", label: "Home", icon: "home", href: "/" },
    { id: "projects", label: "Projects", icon: "folder", href: "/projects" },
    { id: "web-app", label: "Web App", icon: "file", href: "/projects/web-app" },
    { id: "settings", label: "Settings", icon: "settings", href: "/projects/web-app/settings" },
  ],
  separator: "chevron",
  maxItems: 0,
});

trail.on("item_activated", ({ itemId, item }) => {
  console.log(`Navigated to ${itemId}`, item);
  // Host router navigates to item.href here
});

trail.on("item_selected", ({ itemId, previousItemId }) => {
  console.log(`Selected ${itemId} (was ${previousItemId})`);
});
```

## Options

| Property | Type | Default | Purpose |
|---|---|---|---|
| `items` | `BreadcrumbItem[]` | `[]` | Items in the trail. The last item is the current page (when `markCurrent` is true). |
| `separator` | `"chevron" \| "slash" \| "arrow" \| "dot"` | `"chevron"` | Separator between items. |
| `maxItems` | `number` | `0` | Max visible items before the middle collapses into an overflow menu. `0` = no limit. |
| `overflowMode` | `"dropdown" \| "inline"` | `"dropdown"` | Overflow display mode. `dropdown` shows a popover menu; `inline` expands in place. |
| `showIcons` | `boolean` | `true` | Show per-item icons when present. |
| `markCurrent` | `boolean` | `true` | Mark the last item as the current page (`aria-current="page"`). |
| `density` | `"compact" \| "comfortable" \| "spacious"` | `"comfortable"` | Visual density. |
| `readOnly` | `boolean` | `false` | Items are not clickable, just a static trail. |
| `disabled` | `boolean` | `false` | Disables the whole component. |

## Item shape

```ts
interface BreadcrumbItem {
  id: string;          // stable identifier (required)
  label: string;       // display text (required)
  icon?: string;       // optional icon name: "home", "folder", "file", "settings", "user"
  href?: string;       // optional href; if present, renders as <a>, otherwise <button>
  disabled?: boolean;  // optional disabled state
  [key: string]: unknown; // generic extension fields
}
```

The breadcrumb does not require a specific item schema. Extension fields are
preserved when the component clones items.

## Methods

| Method | Purpose |
|---|---|
| `setItems(items)` | Replace the entire item collection. |
| `selectItem(id \| null, source?)` | Select an item (or clear). |
| `clearSelection()` | Clear the current selection. |
| `getSelectedItem()` | Returns the selected item id (or null). |
| `getItems()` | Defensive copy of the current items. |
| `setProperty(name, value)` | Update any option at runtime. |
| `on(event, handler)` / `off(event, handler)` | Subscribe / unsubscribe. |
| `destroy()` | Remove DOM, clear listeners. |

## Events

| Event | Payload | When |
|---|---|---|
| `item_selected` | `{ itemId, previousItemId, source }` | An item is selected. |
| `item_activated` | `{ itemId, item, source }` | An item is clicked or Enter/Space pressed. Host should navigate. |
| `overflow_toggled` | `{ overflowOpen, source }` | The overflow menu opens or closes. |

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move focus between items (and out of the breadcrumb). |
| `Enter` / `Space` | Select + activate the focused item. |
| `ArrowLeft` / `ArrowRight` | Move focus between items (roving tabindex). |
| `Escape` | Close the overflow menu if open. |

## Max-items collapse

When `maxItems > 0` and the trail length exceeds it, the middle items
collapse into an overflow menu. The first and last items always stay visible.

```ts
const trail = new Breadcrumb(container, {
  items: [
    { id: "home", label: "Home", icon: "home" },
    { id: "projects", label: "Projects", icon: "folder" },
    { id: "web-app", label: "Web App", icon: "file" },
    { id: "settings", label: "Settings", icon: "settings" },
    { id: "billing", label: "Billing", icon: "settings" },
    { id: "current", label: "Current Page", icon: "file" },
  ],
  maxItems: 4,  // shows: Home / …overflow… / Billing / Current Page
});
```

Clicking the overflow button (three-dot icon) opens a dropdown menu listing
the collapsed items. Outside-click and `Escape` close it.

## Separators

Four built-in separators:

| Separator | Visual |
|---|---|
| `chevron` (default) | `›` |
| `slash` | `/` |
| `arrow` | `→` |
| `dot` | `•` |

```ts
trail.setProperty("separator", "slash");
```

## Icons

Five built-in icons: `home`, `folder`, `file`, `settings`, `user`. Pass the
name in the item's `icon` field:

```ts
{ id: "home", label: "Home", icon: "home" }
```

Unknown icon names are silently dropped. Set `showIcons: false` to hide all
icons.

## React example

```tsx
import { useEffect, useRef } from "react";
import { Breadcrumb } from "@workshop/breadcrumb";

function Trail({ items, onNavigate }) {
  const ref = useRef<HTMLDivElement>(null);
  const instRef = useRef<Breadcrumb | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const trail = new Breadcrumb(ref.current, { items });
    instRef.current = trail;
    trail.on("item_activated", ({ item }) => onNavigate(item));
    return () => trail.destroy();
  }, []);

  useEffect(() => { instRef.current?.setItems(items); }, [items]);

  return <div ref={ref} />;
}
```

## Integration notes

- The breadcrumb owns a local copy of items. After each activation, the host
  receives an `item_activated` event and may call `setItems()` to update the
  trail (e.g. after navigation).
- The breadcrumb is **independent of routing** — it emits item IDs and `href`s
  but does not push URL changes itself. Wire `item_activated` to your router.
- The last item is the "current page" by convention. When `markCurrent` is
  true, it gets `aria-current="page"` and is not clickable.
- The overflow menu closes on outside-click and `Escape`. Focus is returned
  to the overflow button.
- The component injects scoped CSS once (id `breadcrumb-styles`). Multiple
  instances share the same stylesheet.
- All colors derive from the component's CSS custom properties (`--cb-*`).
  Override them on the `.crumb-nav` element to retheme.
