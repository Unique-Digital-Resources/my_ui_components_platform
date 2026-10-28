# AGENT.md — Collapse

Contribution guide for `src/lib/components/collapse/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**Collapse** — a DOM-based accordion/collapse panel that renders a list of
titled items, each with a clickable header (chevron + optional icon + title)
and a body section that animates open/closed via a `max-height` transition.
Supports accordion mode (only one item open at a time), per-item
`defaultOpen`, disabled items, and keyboard activation (Enter / Space).
Selection state is tracked as a `Set<string>` of open IDs; the same `toggle`
event fires for both pointer and keyboard activation, with the source
attributed in the payload.

## File Structure

```
src/lib/components/collapse/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── collapse.ts         ← the Collapse class (DOM + scoped CSS)
└── index.ts            ← barrel: class, types
```

## Architecture

The class builds a single root `<div class="clp-root">` and appends one
`.clp-item` per `CollapseItem`. Each item has:

1. A `<button class="clp-trigger">` (with `aria-expanded`) containing:
   - a `<span class="clp-chevron">` (rotates 90deg when open)
   - an optional `<span class="clp-icon">` (only when `showIcons && item.icon`)
   - a `<span class="clp-title">`
2. A `<div class="clp-content-wrap">` (the animated wrapper) containing a
   single `<div class="clp-content">` with the item's `content` set via
   `textContent`.

Styles are injected once per document by `injectStyles()`, guarded by
`document.getElementById(STYLE_ID)` (`STYLE_ID = "collapse-styles"`).

The open animation is a pure CSS `max-height` transition: the wrapper has
`max-height: 0` by default and `max-height: 1000px` when `.clp-open` is
applied. The chevron rotates via a `transform .2s` transition. Both
transitions are disabled under `@media (prefers-reduced-motion: reduce)`.

Events are emitted via a `Map<string, Set<CollapseHandler>>`. The private
`emit()` wraps each handler call in `try / catch` and logs errors to
`console.error`, so one failing handler does not block the others. The
payload is shallow-cloned and stamped with `type: event` before dispatch.

Pointer interaction: each trigger gets a `click` listener that calls
`toggle(id, "pointer")`. Keyboard: an additional `keydown` listener
intercepts `Enter` and `Space` (calling `preventDefault()` on Space to
suppress page scroll) and calls `toggle(id, "keyboard")`. Disabled items
get neither listener.

### Public API surface

```ts
class Collapse {
  constructor(container: HTMLElement, options?: CollapseOptions)

  toggle(itemId: string, source?: "pointer" | "keyboard" | "programmatic"): void
  open(itemId: string): void
  close(itemId: string): void
  closeAll(): void
  getOpenIds(): string[]
  setItems(items: CollapseItem[]): void
  setProperty(name: string, value: unknown): void

  on(event: string, handler: CollapseHandler): void
  off(event: string, handler: CollapseHandler): void
  destroy(): void
}
```

Constructor options (`CollapseOptions`):

| Field            | Type             | Default | Notes                                              |
|------------------|------------------|---------|----------------------------------------------------|
| `items`          | `CollapseItem[]` | `[]`    | Initial items.                                     |
| `accordion`      | `boolean`        | `false` | When true, opening one item closes all others.    |
| `showIcons`      | `boolean`        | `true`  | Whether to render the `icon` field.               |
| `defaultOpenIds` | `string[]`       | `[]`    | IDs open at construction.                          |

Item shape (`CollapseItem`): `{ id, title, content, icon?, disabled?, defaultOpen? }`.

Emitted events (single event channel):

| Event    | Payload                                                                      | When                                        |
|----------|------------------------------------------------------------------------------|---------------------------------------------|
| `toggle` | `{ type: "toggle", itemId?, openIds: string[], source: "pointer" \| "keyboard" \| "programmatic" }` | Any open/close action (pointer, keyboard, or programmatic). `itemId` is omitted by `closeAll`. |

`setProperty(name, value)` accepts: `"accordion"`, `"showIcons"`, `"items"`
(which delegates to `setItems`). Any other name is ignored.

### Internal state

- `opts: Required<CollapseOptions>` — fully defaulted copy of constructor options.
- `items: CollapseItem[]` — shallow-cloned item list (so external mutation does not affect the rendered state).
- `openIds: Set<string>` — the source of truth for which items are open.
- `itemEls: Map<string, { trigger, contentWrap, chevron }>` — cached DOM handles per item ID, used by `updateDom()` to avoid full re-renders on every toggle.
- `listeners: Map<string, Set<CollapseHandler>>` — event subscriptions.
- `_destroyed: boolean` — guards `destroy()` and all public methods against post-teardown use.

### CSS custom properties

All defined on `.clp-root` and inherited by descendants:

| Variable          | Default     | Purpose                                            |
|-------------------|-------------|----------------------------------------------------|
| `--clp-surface`   | `#211A30`   | Item background (Deep Violet surface).             |
| `--clp-surface-2` | `#2A2238`   | Trigger hover background.                          |
| `--clp-border`    | `#383343`   | Item border.                                       |
| `--clp-text`      | `#F4F1FF`   | Primary text color.                                |
| `--clp-muted`     | `#B8B2CA`   | Chevron, icon, and body content text.              |
| `--clp-accent`    | `#D9FF66`   | Lemon Signal — open chevron and focus ring.        |
| `--clp-radius`    | `8px`       | Item corner radius.                                |

## Coding Conventions

- TypeScript strict, named exports.
- `injectStyles()` is idempotent — guarded by `document.getElementById(STYLE_ID)`.
- `destroy()` is idempotent — guarded by the `_destroyed` flag; clears
  listeners and wipes the container via `innerHTML = ""`.
- All public methods short-circuit on `_destroyed`.
- Items and options are shallow-cloned on construction and on `setItems()`
  so external mutation does not leak into the rendered state.
- No React/framework imports in this folder.
- No emojis.

## Known Issues

- The `max-height` open transition is capped at `1000px`. Item content
  taller than ~1000px will be clipped during the animation and may not
  finish animating before the cap is hit. A measurement-based approach
  (set `max-height` to `scrollHeight` on open) would fix this.
- `item.icon` is rendered as plain text content of a `<span>`, not as an
  SVG / built-in icon set. Pass a single character or short string.
- The chevron SVG (`ICON_CHEVRON`) is hardcoded; there is no option to
  customize it.
- The trigger button has no `aria-controls` pointing at the content
  wrapper, and the content wrapper has no `role="region"` /
  `aria-labelledby`. Screen readers can still infer the relationship from
  `aria-expanded`, but explicit linking would be more correct.
- `closeAll()` emits `toggle` with no `itemId` (only `openIds: []`). Hosts
  that key off `payload.itemId` should null-check.
- `destroy()` clears the entire container via `innerHTML = ""`. If the
  host reuses the container for other content, that content will be wiped.

## Debugging Tips

- Toggle the `--clp-accent` value live in DevTools to confirm the theme
  variables are being inherited correctly — the open chevron is the most
  visible indicator.
- If an item fails to open, check `item.disabled` first — disabled items
  get the `.clp-disabled` class and have no click/keyboard listeners
  attached.
- If content is being clipped after the open animation, the 1000px
  `max-height` cap is the likely cause. Inspect `.clp-content-wrap` and
  check whether `scrollHeight > 1000`.
- To verify the `toggle` event fires for keyboard activation, focus a
  trigger and press Space — the payload's `source` should be
  `"keyboard"`.
- `setItems()` clears `openIds` and re-applies `defaultOpen` flags. If
  your open state appears to reset after a `setItems` call, that is
  expected behavior — re-apply the desired `openIds` afterwards.
