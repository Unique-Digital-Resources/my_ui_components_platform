# SKILL.md — Avatar

A vanilla TypeScript avatar component. Renders one or more avatars (image
with initials fallback, or solid color), optional status dot (online /
offline / away / busy), five sizes (xs / sm / md / lg / xl), three shapes
(circle / square / rounded), optional `max` overflow indicator (`+N`), and
optional overlapping `grouping` mode. Pure DOM, display-only, framework-
independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  Avatar,
  type AvatarOptions,
  type AvatarItem,
  type AvatarSize,
  type AvatarShape,
  type AvatarStatus,
} from "@/lib/components/avatar";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const avatar = new Avatar(document.getElementById("host")!, {
  items: [
    { id: "1", name: "Ada Lovelace", src: "/avatars/ada.png", status: "online" },
    { id: "2", name: "Grace Hopper", status: "away" },
    { id: "3", initials: "GB", color: "#D9FF66", status: "busy" },
  ],
  size: "md",
  shape: "circle",
  showStatus: true,
});

// later
avatar.destroy();
```

---

## Constructor

```ts
new Avatar(container: HTMLElement, options?: AvatarOptions)
```

### Options

| Option        | Type                                  | Default     | Description                                                       |
|---------------|---------------------------------------|-------------|-------------------------------------------------------------------|
| `items`       | `AvatarItem[]`                        | `[]`        | Avatars to render.                                                |
| `size`        | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"`     | Avatar size.                                                      |
| `shape`       | `"circle" \| "square" \| "rounded"`   | `"circle"`  | Avatar shape.                                                     |
| `showStatus`  | `boolean`                             | `true`      | Render the status dot when `item.status` is set.                  |
| `max`         | `number`                              | `0`         | Render at most `max` avatars; show `+N` for the rest. `0` = no limit. |
| `grouping`    | `boolean`                             | `false`     | Overlap avatars (negative margins) instead of laying them out side by side. |

### Item shape

```ts
interface AvatarItem {
  id: string;
  name?: string;        // used for initials fallback + title attribute
  src?: string;         // image URL; falls back to initials on error
  initials?: string;    // overrides getInitials(name) when set
  color?: string;       // solid background color (used when no src, or as the avatar's background)
  status?: "online" | "offline" | "away" | "busy";
}
```

`getInitials(name)` returns `"?"` for an empty name. For a single-word name,
it returns the first 2 characters uppercased (`"Ada"` → `"AD"`). For a
multi-word name, it returns the first letter of the first word plus the first
letter of the last word (`"Ada Lovelace"` → `"AL"`).

### Size reference

| Size | Dimensions  | Font size | Status dot |
|------|-------------|-----------|------------|
| `xs` | 20 × 20 px  | 8 px      | 6 px       |
| `sm` | 28 × 28 px  | 10 px     | 8 px       |
| `md` | 36 × 36 px  | 12 px     | 10 px      |
| `lg` | 48 × 48 px  | 15 px     | 12 px      |
| `xl` | 64 × 64 px  | 20 px     | 14 px      |

---

## Methods

| Method                          | Returns | Description                                                       |
|---------------------------------|---------|-------------------------------------------------------------------|
| `setItems(items)`               | `void`  | Replace all items. Re-renders.                                    |
| `setProperty(name, value)`      | `void`  | Generic setter. Accepted `name`s: `size`, `shape`, `showStatus`, `max`, `grouping`, `items` (case-sensitive; unknown names are ignored). |
| `destroy()`                     | `void`  | Tear down. Idempotent. Empties the container.                     |

There is no `on` / `off` / `getItems` — Avatar is display-only. Use
`data-avatar-id` on the rendered DOM for click handling.

```ts
avatar.setItems([...]);
avatar.setProperty("size", "lg");
avatar.setProperty("grouping", true);
avatar.setProperty("max", 5);
avatar.setProperty("showStatus", false);
```

---

## Events

None. Avatar is display-only and emits no events. To handle clicks, attach
your own listener to the container and read the `data-avatar-id` attribute
from the event target:

```ts
host.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest("[data-avatar-id]");
  if (el) console.log("clicked avatar:", el.getAttribute("data-avatar-id"));
});
```

---

## CSS Custom Properties

All defined on `.av-root` (override on the host element or any ancestor):

| Variable       | Default     | Description                                            |
|----------------|-------------|--------------------------------------------------------|
| `--av-bg`      | `#211A30`   | Avatar background (when no image / no color).          |
| `--av-border`  | `#383343`   | 2px avatar border.                                     |
| `--av-text`    | `#F4F1FF`   | Initials text color.                                   |
| `--av-muted`   | `#B8B2CA`   | Overflow `+N` color; offline status dot.               |
| `--av-accent`  | `#D9FF66`   | Lemon Signal — reserved (not currently referenced in styles). |
| `--av-ok`      | `#8FE3A5`   | Online status dot.                                     |
| `--av-warn`    | `#FFD36B`   | Away status dot.                                       |
| `--av-danger`  | `#FF858B`   | Busy status dot.                                       |

---

## Examples

### Single avatar with image fallback

```ts
const avatar = new Avatar(host, {
  items: [{ id: "1", name: "Ada Lovelace", src: "/ada.png", status: "online" }],
  size: "lg",
});
// If /ada.png 404s, the avatar falls back to the initials "AL".
```

### Grouped avatars with overflow

```ts
const avatar = new Avatar(host, {
  items: teamMembers.map((m) => ({ id: m.id, name: m.name, src: m.avatar, status: m.presence })),
  size: "sm",
  shape: "circle",
  grouping: true,
  max: 5, // shows 5 avatars + "+(N-5)" indicator
});
```

### Solid-color initials avatar

```ts
const avatar = new Avatar(host, {
  items: [
    { id: "a", initials: "GB", color: "#D9FF66" },
    { id: "b", initials: "MK", color: "#FF858B" },
  ],
  shape: "rounded",
  showStatus: false,
});
```

### Updating via `setProperty`

```ts
avatar.setProperty("items", newMembers);
avatar.setProperty("size", "md");
avatar.setProperty("shape", "square");
avatar.setProperty("max", 8);
avatar.setProperty("grouping", false);
avatar.setProperty("showStatus", true);
```

### Wiring click handling externally

```ts
const avatar = new Avatar(host, { items, grouping: true });
host.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest("[data-avatar-id]");
  if (!el) return;
  const id = el.getAttribute("data-avatar-id");
  openProfile(id);
});
```

---

## Integration Notes

**When to use:** user lists, comment threads, team rosters, presence
indicators — any UI that needs to show one or more user identities compactly.

**When not to use:** if you need hover tooltips, dropdowns, or context menus
per avatar, use a richer component (or wrap each avatar in your own
container). Avatar itself has no interaction model beyond what you wire
yourself.

**Alternatives:** for a single large profile header, a plain `<img>` with
fallback may suffice. For interactive user pickers, consider a list or menu
component that uses Avatar as the leading visual.

**Image fallback:** the `<img>` `onerror` handler swaps to initials when the
URL fails. Note the known caveat (AGENT.md "Known Issues") that this can
also wipe the status dot — re-render via `setItems` to recover.

**Grouping:** with `grouping: true`, avatars overlap using a `-8px` left
margin (the first child has no margin). The overlap is fixed at 8px
regardless of size — at `xs` (20px) the overlap is significant; at `xl`
(64px) it's modest. Tune by overriding `.av-group .av-avatar { margin-left:
... }` in your own stylesheet if needed.

**Overflow `+N`:** the indicator inherits the size + shape classes of the
avatars (`av-size-{size} av-shape-{shape}`) so it visually matches. It has
no click handler — render your own "show all" UI if needed.

**Accessibility:** each avatar has a `title` attribute (set to `name ?? id`).
There is no `aria-label` or `role="img"` by default — add them yourself on
the host if needed for screen readers.

**Theming:** override the `--av-*` variables on the host element (or any
ancestor of the root). The accent defaults to Lemon Signal `#D9FF66`.

**Reduced motion:** Avatar has no transitions, so `prefers-reduced-motion`
is not relevant.
