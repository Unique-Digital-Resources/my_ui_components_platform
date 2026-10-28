# AGENT.md — Smart Tooltip

Contribution guide for `src/lib/components/smart-tooltip/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**SmartTooltip** — a tooltip overlay that renders a command's label,
description, and keyboard shortcut, with smart positioning bounded by a
container element. The tooltip attaches to a target element. On mouseenter
(or focus) it appears next to the target (top/bottom/left/right). If it
would overflow the bounds element, it flips to the opposite side. The
shortcut is rendered as `<kbd>` badges.

Like SmartContextMenu, this component depends on the command registry at
`@/lib/commands` — you pass it a command ID and it looks up the metadata.

## File Structure

```
src/lib/components/smart-tooltip/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── smart-tooltip.ts    ← the SmartTooltip class (DOM + scoped CSS)
└── index.ts            ← barrel: class, types
```

## Architecture

DOM-based overlay. The tooltip is a `<div class="smart-tooltip" role="tooltip">`
appended to the container (which is forced to `position: relative` if it was
`static`; the original value is restored on `destroy()`).

The tooltip has three content slots:

1. An optional icon (`<svg class="smart-tooltip__icon-svg">` looked up from
   `BUILTIN_ICONS` by the command's `icon` field).
2. A label + description block (`<div class="smart-tooltip__label">` and
   `<div class="smart-tooltip__description">`).
3. An optional shortcut row (`<div class="smart-tooltip__shortcut">` with
   `<kbd>` badges from `shortcutParts(command.shortcut)`).

If the command ID is not in the registry, the tooltip renders an empty
state (or nothing — see Known Issues).

### Attach / detach lifecycle

`attachTo(target)` adds `mouseenter` / `mouseleave` / `focus` / `blur`
listeners to the target. `detach()` removes them. The constructor doesn't
attach to anything — the host calls `attachTo` after construction.

- `mouseenter` or `focus` → `show()`
- `mouseleave` or `blur` → `hide()`

`show()` sets `display: block`, positions the tooltip, then adds the
`--visible` class on the next animation frame (so the CSS opacity transition
runs). `hide()` removes the `--visible` class and sets `display: none` after
a 140ms delay (to let the fade-out transition complete).

### Smart positioning

`positionTooltip()` measures the target's bounding rect (relative to the
container) and the tooltip's bounding rect, then places the tooltip on the
chosen side (`top` / `bottom` / `left` / `right`) with a `GAP = 8` px offset.

If the tooltip would overflow the bounds element on the chosen side, it
flips to the opposite side. If it still overflows, it clamps to the bounds
edge with `EDGE_PAD = 4` px.

For example, with `position = "top"`:
1. Default: tooltip bottom edge at `target.top - GAP`.
2. If `tooltip.top < bounds.top + EDGE_PAD`, flip to bottom: tooltip top
   edge at `target.bottom + GAP`.
3. If still overflowing, clamp to `bounds.top + EDGE_PAD`.

Horizontal centering (for top/bottom position) clamps the tooltip's left
edge to `[bounds.left + EDGE_PAD, bounds.right - tooltipW - EDGE_PAD]`.

### Container position override

Same as SmartContextMenu: if the container is `position: static`, it's set
to `relative` and restored on `destroy()`.

## How to Extend / Modify

- **Add an icon**: add an entry to `BUILTIN_ICONS` (inner SVG markup; the
  `<svg>` wrapper is added by `getIconSvg`). Note: SmartTooltip and
  SmartContextMenu share the same icon set in their respective files — keep
  them in sync if you add an icon.
- **Add a position** (e.g. `"top-left"`): extend `SmartTooltipPosition`,
  add a branch in `positionTooltip`. The current 4-position set covers the
  common cases.
- **Custom content**: not currently supported — the tooltip renders only
  command metadata. A future enhancement could accept a `content` option
  (HTML string or node) that overrides the command lookup.
- **Delay**: `show()` is immediate on `mouseenter`. A `showDelay` option
  (default 500ms) would match platform tooltip conventions.
- **Animation**: the current fade is 140ms. The duration is hardcoded in
  `hide()`'s `setTimeout`; it should be sourced from a CSS variable.

## Known Issues & TODOs

- No `showDelay` — the tooltip appears instantly on hover. Platform
  convention is 500ms; users may find the instant appearance jarring.
- The 140ms hide delay is hardcoded and must match the CSS transition
  duration. If you change the CSS, update the timeout.
- Unknown command IDs render an empty tooltip (just the wrapper div). Should
  probably render nothing or a "command not found" placeholder.
- The tooltip is appended to the container, not `document.body`. If the
  container has `overflow: hidden`, the tooltip may be clipped. Same caveat
  as SmartContextMenu.
- The tooltip doesn't reposition on window resize or scroll while visible.
  If the target moves (e.g. due to layout shift), the tooltip stays where
  it was first positioned until the next `show()`.
- The icon set is duplicated between SmartTooltip and SmartContextMenu.
  Consider extracting to a shared `icons.ts` module.

## Files This Component Touches

- React wrapper: `src/components/smart-tooltip/smart-tooltip-react.tsx`
- Playground: `src/components/smart-tooltip/smart-tooltip-playground.tsx`
- Metadata: `src/lib/platform/content.ts` (slug `"smart-tooltip"`)
- Depends on: `@/lib/commands` (registry + shortcuts utilities).
- No built-in commands of its own (it renders commands registered by other
  components).
