# AGENT.md — Avatar

Contribution guide for `src/lib/components/avatar/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**Avatar** — a lightweight, display-only avatar component. Renders one or
more avatars (image, initials fallback, or solid color), optional status dot
(online / offline / away / busy), five sizes (xs / sm / md / lg / xl), three
shapes (circle / square / rounded), optional `max` overflow indicator
(`+N`), and optional `grouping` mode (overlapping avatars with negative
margins). Pure DOM, no events, no canvas, no framework.

## File Structure

```
src/lib/components/avatar/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── avatar.ts           ← the Avatar class
└── index.ts            ← barrel: class, types
```

## Architecture

Single `render()` builds a `<div class="av-root">` (with an extra `av-group`
class when `grouping: true`) and appends one `<div class="av-avatar ...">`
per item, plus an optional `+N` overflow div. The container is emptied
(`container.innerHTML = ""`) before the new root is appended — every state
change is a full rebuild.

Each avatar is `renderAvatar(item)`:

```html
<div class="av-avatar av-size-{size} av-shape-{shape}"
     data-avatar-id="{id}"
     title="{name ?? id}">
  <!-- if item.color: style="background: {color}" -->
  <!-- if item.src:    <img src="{src}" alt="{name ?? id}"> -->
  <!-- else:           text content = item.initials ?? getInitials(item.name ?? "") -->
  <!-- if showStatus && item.status: -->
  <span class="av-status av-status-{status}"></span>
</div>
```

The `img.onerror` handler swaps the broken image back to initials — see Known
Issues for the status-dot caveat.

### Style injection

`injectStyles()` is idempotent — guarded by
`document.getElementById("avatar-styles")`. All `--av-*` variables are
defined on `.av-root` so they cascade only inside the avatar root. Status
dot sizes scale per `av-size-*` class.

### Event system

**None.** The class has no `on` / `off` / `emit` and no `listeners` map.
Hosts that need click handling must attach their own listeners (the
`data-avatar-id` attribute is the stable hook). This is by design — Avatar
is display-only.

### Public API surface

```ts
class Avatar {
  constructor(container: HTMLElement, options?: AvatarOptions)

  setItems(items: AvatarItem[]): void
  setProperty(name: string, value: unknown): void  // size | shape | showStatus | max | grouping | items
  destroy(): void
}
```

No events. No `getItems()` — the host already owns the items it passed in.

### Internal state

- `opts: Required<AvatarOptions>` — all options normalized with defaults.
- `items: AvatarItem[]` — a flat shallow-clone of the items passed to the
  constructor / `setItems`. (The clone is one level deep — nested fields are
  shared by reference, but `AvatarItem` has no nested fields, so this is
  safe.)
- `root: HTMLElement` — the `av-root` div.
- `_destroyed: boolean` — idempotent-`destroy()` guard.

### CSS custom properties

All defined on `.av-root` in `injectStyles()`:

| Variable       | Default     | Purpose                                            |
|----------------|-------------|----------------------------------------------------|
| `--av-bg`      | `#211A30`   | Avatar background (when no image / no color).      |
| `--av-border`  | `#383343`   | 2px avatar border.                                 |
| `--av-text`    | `#F4F1FF`   | Initials text color.                               |
| `--av-muted`   | `#B8B2CA`   | Overflow `+N` indicator color.                     |
| `--av-accent`  | `#D9FF66`   | Lemon Signal — reserved for future use (not currently referenced in styles). |
| `--av-ok`      | `#8FE3A5`   | Online status dot.                                 |
| `--av-warn`    | `#FFD36B`   | Away status dot.                                   |
| `--av-danger`  | `#FF858B`   | Busy status dot.                                   |

Status `offline` uses `--av-muted` (no dedicated variable).

## Coding Conventions

- TypeScript strict, named exports.
- `injectStyles()` idempotent — guarded by `document.getElementById(STYLE_ID)`.
- `destroy()` is idempotent — guarded by a `_destroyed` flag; empties the
  container. There are no listeners or RAF handles to clean up (no events).
- No React/framework imports in this folder.
- No emojis.
- All public methods early-return on `_destroyed`.
- `render()` rebuilds the entire DOM on every state change (cheap — avatars
  are small).

## Known Issues

- **No events.** There is no `on("click", ...)` API. Hosts needing
  interactivity must attach their own listeners (the `data-avatar-id`
  attribute is the hook).
- **`img.onerror` wipes the status dot.** When an image fails to load,
  `onerror` calls `el.textContent = initials`, which clears ALL existing
  children — including the status `<span>` that was appended synchronously
  after the `<img>`. Because `onerror` fires asynchronously (after the
  status span has been appended), the status dot disappears when an avatar
  image 404s. The fix is to remove just the `<img>` and append a text node,
  rather than using `textContent`.
- **`getInitials` ignores middle names.** For a multi-word name, only the
  first letter of the first word and the first letter of the last word are
  used (`"Ada Lovelace"` → `"AL"`; `"John Ronald Tolkien"` → `"JT"`). For a
  single-word name, the first 2 characters are used (`"Madonna"` → `"MA"`,
  not `"M"`). This may surprise users expecting single-letter monograms.
- **No gap option for non-grouped avatars.** With `grouping: false` (the
  default), avatars are laid out `inline-flex` with no gap — adjacent
  avatars touch. To add spacing, wrap each avatar host in a flex container
  with `gap` set on the host, or use `grouping: true` (which overlaps them).
- **`setProperty` silently ignores unknown names.** A typo like
  `setProperty("shap", "square")` returns without warning. The accepted
  names are `size`, `shape`, `showStatus`, `max`, `grouping`, `items`
  (case-sensitive).
- **`+N` overflow indicator is non-interactive.** It has no tooltip, no
  expand-on-click, and no `data-avatar-id` of its own. Hosts wanting a
  "show more" interaction must render their own UI.
- **No `getItems()` accessor.** The host is expected to keep its own copy of
  the items array.

## Debugging Tips

1. **Avatars showing "?"**: the item has no `name`, no `initials`, and no
   `src`. Pass at least one. `getInitials("")` returns `"?"`.
2. **Image not showing?** Check the `src` URL in the DOM (`[data-avatar-id]`
   > img). The `onerror` handler silently falls back to initials — open the
   Network tab to see the failed request. Note the status-dot caveat above.
3. **Overflow `+N` not appearing?** It only renders when `max > 0` AND
   `items.length > max`. With the default `max: 0`, all items render.
4. **Status dot missing?** `showStatus` defaults to `true`, but the dot only
   renders if `item.status` is one of `"online" | "offline" | "away" |
   "busy"`. Other values (or `undefined`) produce no dot.
5. **Inspecting items in the DOM.** Query `[data-avatar-id="<id>"]` on the
   container — the attribute is the stable hook. The overflow indicator has
   class `av-overflow` (no `data-avatar-id`).
