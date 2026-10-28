# SKILL.md — Badge

A vanilla TypeScript pill-style badge component. Six variants (default /
success / warning / danger / info / accent), three sizes (sm / md / lg),
optional leading status dot, optional removable close button, dynamic
add/remove, and `add` / `remove` events. Pure DOM, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  Badge,
  type BadgeOptions,
  type BadgeItem,
  type BadgeVariant,
  type BadgeSize,
} from "@/lib/components/badge";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const badge = new Badge(document.getElementById("host")!, {
  items: [
    { id: "open", label: "Open", variant: "info", dot: true },
    { id: "urgent", label: "Urgent", variant: "danger", dot: true, removable: true },
    { id: "done", label: "Done", variant: "success", removable: true },
  ],
  size: "md",
});

badge.on("remove", ({ itemId }) => console.log("removed:", itemId));
badge.on("add", ({ itemId }) => console.log("added:", itemId));

badge.add({ id: "wip", label: "In Progress", variant: "warning", dot: true });

// later
badge.destroy();
```

---

## Constructor

```ts
new Badge(container: HTMLElement, options?: BadgeOptions)
```

### Options

| Option      | Type                       | Default | Description                                                       |
|-------------|----------------------------|---------|-------------------------------------------------------------------|
| `items`     | `BadgeItem[]`              | `[]`    | Initial badges.                                                   |
| `size`      | `"sm" \| "md" \| "lg"`     | `"md"`  | Badge size.                                                       |
| `grouping`  | `boolean`                  | `true`  | Parsed and stored but currently a no-op (see AGENT.md Known Issues). Badges always wrap with a 6px gap. |

### Item shape

```ts
interface BadgeItem {
  id: string;
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "accent";
  dot?: boolean;          // render a leading colored dot
  removable?: boolean;    // render a close (X) button
  icon?: string;          // declared but NOT rendered (dead field — see AGENT.md)
}
```

### Size reference

| Size | Height | Font size | Padding   |
|------|--------|-----------|-----------|
| `sm` | 18 px  | 9 px      | `0 6px`   |
| `md` | 22 px  | 11 px     | `0 8px`   |
| `lg` | 28 px  | 13 px     | `0 10px`  |

### Variant reference

| Variant    | Text / dot / border color source |
|------------|----------------------------------|
| `default`  | `--bdg-text` / `--bdg-muted` / `--bdg-border` (neutral) |
| `success`  | `--bdg-ok` (`#8FE3A5`)           |
| `warning`  | `--bdg-warn` (`#FFD36B`)         |
| `danger`   | `--bdg-danger` (`#FF858B`)       |
| `info`     | `--bdg-info` (`#7DB8E8`)         |
| `accent`   | `--bdg-accent` (`#D9FF66`)       |

All variants share the `--bdg-surface` background. Border color is a 40%
`color-mix` of the variant color with transparent.

---

## Methods

| Method                          | Returns       | Description                                                       |
|---------------------------------|---------------|-------------------------------------------------------------------|
| `add(item)`                     | `void`        | Append a badge. Re-renders. Emits `add` with `{ itemId }`.        |
| `remove(itemId)`                | `void`        | Remove a badge by ID. No-op if not found. Re-renders. Emits `remove` with `{ itemId }`. |
| `getItems()`                    | `BadgeItem[]` | Deep-cloned snapshot of all items.                                |
| `setItems(items)`               | `void`        | Replace all items. Re-renders. **Does not emit** (see AGENT.md).  |
| `setProperty(name, value)`      | `void`        | Generic setter. Accepted `name`s: `size`, `grouping` (no-op), `items` (case-sensitive; unknown names are ignored). |
| `on(event, handler)`            | `void`        | Subscribe to `add` or `remove`.                                   |
| `off(event, handler)`           | `void`        | Unsubscribe.                                                      |
| `destroy()`                     | `void`        | Tear down. Idempotent. Clears listeners, empties container.       |

```ts
badge.add({ id: "new", label: "New", variant: "accent", dot: true });
badge.remove("open");
badge.getItems();
badge.setItems([{ id: "x", label: "Only" }]);
badge.setProperty("size", "lg");
```

---

## Events

Handler signature: `(p: { type?: string; itemId?: string }) => void`. The
`type` field is injected by `emit()` and equals the event name.

| Event    | Payload                 | When                                            |
|----------|-------------------------|-------------------------------------------------|
| `add`    | `{ type: "add", itemId }`    | `add()` called. Fires AFTER the re-render. |
| `remove` | `{ type: "remove", itemId }` | `remove()` called and the item existed. Fires AFTER the re-render. |

```ts
badge.on("add", ({ itemId }) => console.log("added:", itemId));
badge.on("remove", ({ itemId }) => persistRemoval(itemId));
```

`setItems()` and `setProperty()` do **not** emit. To react to bulk replace,
compare `getItems()` snapshots yourself.

---

## CSS Custom Properties

All defined on `.bdg-root` (override on the host element or any ancestor):

| Variable        | Default     | Description                                            |
|-----------------|-------------|--------------------------------------------------------|
| `--bdg-text`    | `#F4F1FF`   | Default-variant label text.                            |
| `--bdg-muted`   | `#B8B2CA`   | Default-variant dot color.                             |
| `--bdg-accent`  | `#D9FF66`   | Accent variant text/border/dot.                        |
| `--bdg-ok`      | `#8FE3A5`   | Success variant text/border/dot.                       |
| `--bdg-warn`    | `#FFD36B`   | Warning variant text/border/dot.                       |
| `--bdg-danger`  | `#FF858B`   | Danger variant text/border/dot.                        |
| `--bdg-info`    | `#7DB8E8`   | Info variant text/border/dot.                          |
| `--bdg-border`  | `#383343`   | Default-variant border.                                |
| `--bdg-surface` | `#2A2238`   | Badge background fill for all variants.                |

---

## Examples

### Status tags

```ts
const badge = new Badge(host, {
  items: [
    { id: "open", label: "Open", variant: "info", dot: true },
    { id: "review", label: "In Review", variant: "warning", dot: true },
    { id: "done", label: "Done", variant: "success", dot: true },
  ],
});
```

### Removable filter chips

```ts
const filters = new Badge(host, {
  items: activeFilters.map((f) => ({
    id: f.id,
    label: f.label,
    variant: "default",
    removable: true,
  })),
  size: "sm",
});
filters.on("remove", ({ itemId }) => {
  activeFilters = activeFilters.filter((f) => f.id !== itemId);
  reapplyQuery();
});
```

### Counters

```ts
const counts = new Badge(host, {
  items: [
    { id: "alerts", label: "3 alerts", variant: "danger" },
    { id: "messages", label: "12 messages", variant: "accent" },
  ],
});
// To update a count, rebuild and setItems (no per-item update method):
counts.setItems([
  { id: "alerts", label: "5 alerts", variant: "danger" },
  { id: "messages", label: "12 messages", variant: "accent" },
]);
```

### Dynamic add

```ts
const tags = new Badge(host, { items: [], size: "md" });
tags.on("add", ({ itemId }) => console.log("added tag:", itemId));

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && input.value.trim()) {
    tags.add({ id: uid(), label: input.value.trim(), variant: "default", removable: true });
    input.value = "";
  }
});
```

### Updating via `setProperty`

```ts
badge.setProperty("size", "lg");
badge.setProperty("items", newItems); // same as setItems()
// `grouping` is accepted but currently a no-op.
```

---

## Integration Notes

**When to use:** status indicators, tag lists, filter chips, counters, metadata
labels — any small pill-style label that benefits from a colored variant and
optional dot.

**When not to use:** interactive buttons (use a button component instead —
the badge itself has no click handler), tooltips (use a tooltip component),
or anything needing an icon (the `icon` field is dead — see AGENT.md).

**Alternatives:** for a single inline status indicator without removal, an
ordinary `<span>` with the same `--bdg-*` classes is lighter. For
selectable tag pickers, consider a `toggle-group` instead.

**`setItems()` vs `add()` / `remove()`:** `setItems()` rebuilds without
emitting; `add()` / `remove()` emit. For external state sync, prefer
incremental `add()` / `remove()` so your handlers fire.

**Wrapping:** `.bdg-root` is `inline-flex` with `flex-wrap: wrap` and a 6px
gap. It shrinks to content. Set a `width` / `max-width` on the container to
force wrapping at a specific breakpoint.

**Accessibility:** the remove button is a real `<button type="button">` with
an `aria-label` of `Remove {label}`, so it's keyboard-accessible (Tab to
focus, Enter/Space to activate). The badge span itself has no `role` or
`tabindex` — add `role="status"` on the host if the badges represent live
state.

**Theming:** override the `--bdg-*` variables on the host element (or any
ancestor of the root). The accent defaults to Lemon Signal `#D9FF66`. To
fully fill a variant (instead of the default surface + colored text), override
`.bdg-variant-{variant} { background: var(--bdg-{color}); color: #101014; }`
in your own stylesheet.

**Reduced motion:** Badge has no transitions, so `prefers-reduced-motion` is
not relevant.
