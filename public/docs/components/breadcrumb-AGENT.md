# AGENT.md — Breadcrumb

Contribution guide for the Breadcrumb component. For usage, see
[SKILL.md](./SKILL.md).

## Architecture

Single-file `breadcrumb.ts` with a DOM-based renderer and scoped CSS
(`.crumb-` prefix) injected once into `<head>`. The component owns a local
copy of items; the host is notified of clicks/activations through events and
may navigate accordingly. The breadcrumb is independent of routing — it
emits item identifiers and lets the host decide what to do.

### Key types
- `BreadcrumbItem = { id, label, icon?, href?, disabled?, ...[key]: unknown }`.
- `BreadcrumbOptions` — the full configuration surface (items, separator, maxItems, overflowMode, showIcons, markCurrent, density, readOnly, disabled).
- `BreadcrumbEventPayload` — discriminated payload for all events.

### Rendering lifecycle
`render()` clears the container, builds a `<nav class="crumb-nav">` with an
`<ol class="crumb-list">`. Each item is an `<li class="crumb-item-wrapper">`
containing the item element (an `<a>` if `href` is present, otherwise a
`<button>`) and a separator (except after the last item).

### Max-items collapse
When `maxItems > 0` and the trail length exceeds it, `computeVisibility()`
returns the first and last items as visible and the middle items as
collapsed. The overflow button (three-dot icon) is inserted between the first
and second visible items. Clicking it opens a dropdown menu listing the
collapsed items.

### Selection
The "current" page is the last item by convention. When `markCurrent` is
true (default), the last item gets the `crumb-current` class and
`aria-current="page"`, and is not clickable. `selectItem(id, source)` updates
the selection and re-renders to update the current-page marker.

### Keyboard model
- `Tab` / `Shift+Tab` — move focus between items (and out of the breadcrumb).
- `Enter` / `Space` — select + activate the focused item.
- `ArrowLeft` / `ArrowRight` — move focus between items (roving tabindex).
- `Escape` — close the overflow menu if open.

### Overflow menu
The overflow menu is a fixed-position dropdown appended to the overflow
button's wrapper. Outside-click and `Escape` close it; focus is returned to
the overflow button. Menu items are `role="menuitem"` with the same icon +
label as the original items.

### Separator
Four built-in separators: `chevron` (default), `slash`, `arrow`, `dot`. Each
is an inline SVG with `aria-hidden="true"`.

### Icons
Five built-in icons: `home`, `folder`, `file`, `settings`, `user`. Each is
an inline SVG. Unknown icon names are silently dropped (no broken image).

## Known Issues & TODOs

- **No router integration**: the breadcrumb emits item IDs and `href`s but
  does not push URL changes itself. The host wires `item_activated` to its
  router.
- **No custom separator renderer**: only the four built-in separators are
  supported. A future `separatorRenderer` option could allow custom SVG/HTML.
- **No custom item renderer**: items always render as icon + label. A future
  `itemRenderer` option (or content-template integration) could allow custom
  item content.
- **Overflow menu positioning**: the menu is positioned `top: 100%; left: 0`
  relative to the overflow wrapper. If the breadcrumb is at the right edge of
  the viewport, the menu may overflow. A flip/clamp step would fix this.
- **No virtualization**: all items are rendered (the overflow only collapses
  the middle, not the visible ones). For 100+ items this is fine; for 1000+
  a virtual list would be needed.

## Files This Module Touches

- Consumed by: the Breadcrumb React wrapper and playground.
- The Breadcrumb's `items` option accepts any `BreadcrumbItem[]`; the host
  owns the routing/navigation logic.
