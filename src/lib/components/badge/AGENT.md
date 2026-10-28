# AGENT.md — Badge

Contribution guide for `src/lib/components/badge/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**Badge** — a small pill-style label component for tags, status indicators,
and metadata chips. Supports six variants (default / success / warning /
danger / info / accent), three sizes (sm / md / lg), optional leading dot,
and optional removable close button. Pure DOM, framework-independent, with
`add` / `remove` events.

## File Structure

```
src/lib/components/badge/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── badge.ts            ← the Badge class
└── index.ts            ← barrel: class, types
```

## Architecture

Single `render()` builds a `<div class="bdg-root">` and appends one
`<span class="bdg-badge bdg-size-{size} bdg-variant-{variant}">` per item.
The container is emptied (`container.innerHTML = ""`) before the new root is
appended — every state change is a full rebuild.

Each badge is `renderBadge(item)`:

```html
<span class="bdg-badge bdg-size-{size} bdg-variant-{variant ?? "default"}"
      data-badge-id="{id}">
  <!-- if item.dot: -->
  <span class="bdg-dot"></span>
  <span>{label}</span>
  <!-- if item.removable: -->
  <button class="bdg-remove" aria-label="Remove {label}" type="button">
    {ICON_X svg}
  </button>
</span>
```

`ICON_X` is a hardcoded `<svg viewBox="0 0 16 16">` stroke X icon, set via
`innerHTML` on the remove button. There is no way to customize it.

### Style injection

`injectStyles()` is idempotent — guarded by
`document.getElementById("badge-styles")`. All `--bdg-*` variables are
defined on `.bdg-root`. Variant styles use `color-mix(in srgb, var(--bdg-*)
40%, transparent)` for the border color, so variants share the surface fill
but get a colored text + border + dot.

### Event system

Listeners are stored in `Map<string, Set<handler>>` where the handler
signature is `(p: { type?: string; itemId?: string }) => void`. `emit()`
spreads the payload, injects a `type` field equal to the event name, and
invokes each handler inside a `try { ... } catch (e) { console.error(e); }`
block. `on()` / `off()` add/remove handlers from the per-event `Set`.

Only two events are emitted: `add` (from `add()`) and `remove` (from
`remove()`). `setItems()` and `setProperty()` do **not** emit — see Known
Issues.

### Public API surface

```ts
class Badge {
  constructor(container: HTMLElement, options?: BadgeOptions)

  add(item: BadgeItem): void              // emits "add"
  remove(itemId: string): void            // emits "remove"
  getItems(): BadgeItem[]                 // deep-cloned snapshot
  setItems(items: BadgeItem[]): void      // no event
  setProperty(name: string, value: unknown): void  // size | grouping | items
  on(event: string, handler: (p: { type?: string; itemId?: string }) => void): void
  off(event: string, handler: (p: { type?: string; itemId?: string }) => void): void
  destroy(): void
}
```

### Internal state

- `opts: Required<BadgeOptions>` — all options normalized with defaults.
  Note: `opts.grouping` is stored but never read during render (see Known
  Issues).
- `items: BadgeItem[]` — a shallow-clone of the items passed in. Each item
  is spread (`{ ...it }`), so the top-level fields are isolated, but
  `BadgeItem` has no nested fields, so this is safe.
- `root: HTMLElement` — the `bdg-root` div.
- `listeners: Map<string, Set<handler>>` — event subscriptions.
- `_destroyed: boolean` — idempotent-`destroy()` guard.

### CSS custom properties

All defined on `.bdg-root` in `injectStyles()`:

| Variable        | Default     | Purpose                                            |
|-----------------|-------------|----------------------------------------------------|
| `--bdg-text`    | `#F4F1FF`   | Badge label text (default variant).                |
| `--bdg-muted`   | `#B8B2CA`   | Default-variant dot color.                         |
| `--bdg-accent`  | `#D9FF66`   | Lemon Signal — accent variant text/border/dot.     |
| `--bdg-ok`      | `#8FE3A5`   | Success variant text/border/dot.                   |
| `--bdg-warn`    | `#FFD36B`   | Warning variant text/border/dot.                   |
| `--bdg-danger`  | `#FF858B`   | Danger variant text/border/dot.                    |
| `--bdg-info`    | `#7DB8E8`   | Info variant text/border/dot.                      |
| `--bdg-border`  | `#383343`   | Default-variant border.                            |
| `--bdg-surface` | `#2A2238`   | Badge background fill for all variants.            |

## Coding Conventions

- TypeScript strict, named exports.
- `injectStyles()` idempotent — guarded by `document.getElementById(STYLE_ID)`.
- `destroy()` is idempotent — guarded by a `_destroyed` flag; clears
  listeners and empties the container.
- No React/framework imports in this folder.
- No emojis.
- All public mutating methods early-return on `_destroyed`.
- `emit()` wraps each handler in `try/catch` so one bad handler doesn't break
  the rest.

## Known Issues

- **`BadgeItem.icon` is a dead field.** The type declares `icon?: string`
  but `renderBadge` never reads it. Setting `icon` on an item has no effect.
  To show an icon, prepend it to the `label` or wrap the badge in your own
  DOM.
- **`BadgeOptions.grouping` is a dead option.** It's parsed, stored on
  `opts.grouping`, and re-settable via `setProperty("grouping", ...)`, but
  `render()` never reads it. `.bdg-root` always uses
  `display: inline-flex; flex-wrap: wrap; gap: 6px;`. The intended
  "non-grouped" mode (no wrap, no gap) is not implemented.
- **`setItems()` does not emit.** Only `add()` and `remove()` emit events.
  Hosts that need to react to bulk replace must compare `getItems()` before
  and after, or watch the items array themselves.
- **Only two events.** There is no `change` event for `setItems()` /
  `setProperty()`, and no `click` event on a badge. The remove button has
  its own click handler that calls `remove()` — there is no way to make a
  badge itself clickable through the API.
- **Hardcoded remove icon.** `ICON_X` is a fixed `<svg>` string set via
  `innerHTML` on the remove button. There's no `removeIcon` option. To
  customize, replace the button in the DOM after render, or fork the
  component.
- **No `update(itemId, partial)` method.** To change a single badge, rebuild
  the items array and call `setItems()` (which doesn't emit — see above).
- **`setProperty` silently ignores unknown names.** A typo like
  `setProperty("siez", "lg")` returns without warning. Accepted names are
  `size`, `grouping`, `items` (case-sensitive; `grouping` is a no-op — see
  above).
- **No `role` or `tabindex` on the badge span.** The badge itself is not
  focusable; only the inner remove `<button>` is. Add your own
  `role="status"` or `aria-label` on the host if needed.

## Debugging Tips

1. **Icon not showing?** The `icon` field is dead (see Known Issues). Prepend
   the icon to the `label`, or wrap the badge in your own DOM.
2. **`setItems()` not firing your handler?** It doesn't emit — only `add()`
   and `remove()` do. Use those for incremental changes, or compare
   `getItems()` snapshots yourself.
3. **Badges not wrapping?** `.bdg-root` is `inline-flex` with `flex-wrap:
   wrap`, so it shrinks to content. Set a `width` (or `max-width`) on the
   container to force wrapping.
4. **Inspecting a badge.** Query `[data-badge-id="<id>"]` on the container —
   the attribute is the stable hook. The remove button is the inner
   `button.bdg-remove`.
5. **Variant not theming?** Variants only color the text, border, and dot —
   the background is always `--bdg-surface`. To get a fully-filled variant,
   override the `.bdg-variant-{variant}` background in your own stylesheet.
