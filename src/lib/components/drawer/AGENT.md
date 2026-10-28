# AGENT.md — Drawer

Contribution guide for `src/lib/components/drawer/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**Drawer** — a DOM-based slide-in panel that covers one edge of the
viewport (top / bottom / left / right) with an optional dimmed overlay.
Features: configurable side and size, optional overlay, close on overlay
click, close on Escape, header with title and close button, scrollable
body, smooth transform-based slide animation, and programmatic
open/close/toggle with attributed source (`pointer` / `keyboard` /
`programmatic`). The panel and overlay are appended to the container but
use `position: fixed`, so they cover the viewport regardless of the
container's bounds.

## File Structure

```
src/lib/components/drawer/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── drawer.ts           ← the Drawer class (DOM + scoped CSS)
└── index.ts            ← barrel: class, types
```

## Architecture

On construction the class appends two elements to the container:

1. `<div class="dr-overlay">` — `position: fixed; inset: 0`, semi-
   transparent black, opacity transition. `aria-hidden` toggles with
   open state. When `closeOnOverlayClick` is true, a `click` listener
   calls `close("pointer")`.
2. `<div class="dr-panel dr-side-{side}">` — `position: fixed`, with
   `role="dialog"` and `aria-modal="true"`. `aria-label` is set to the
   title when provided. The panel has:
   - `<div class="dr-header">` containing a `<span class="dr-title">`
     and a `<button class="dr-close">` (with an inline SVG X icon).
   - `<div class="dr-body">` — the scrollable body; content is set via
     `textContent`.

The panel's off-screen transform depends on the side:
`dr-side-left` → `translateX(-100%)`, `dr-side-right` → `translateX(100%)`,
`dr-side-top` → `translateY(-100%)`, `dr-side-bottom` → `translateY(100%)`.
The `.dr-open` class resets the transform to `translate(0, 0)`. The
transition is `transform .28s cubic-bezier(.22, .61, .36, 1)`. Both the
overlay opacity and panel transform transitions are disabled under
`@media (prefers-reduced-motion: reduce)`.

Styles are injected once per document by `injectStyles()`, guarded by
`document.getElementById(STYLE_ID)` (`STYLE_ID = "drawer-styles"`).

Events are emitted via a `Map<string, Set<DrawerHandler>>`. The private
`emit()` shallow-clones the payload, stamps it with `type: event`, and
wraps each handler call in `try / catch` (errors go to `console.error`)
so one failing handler does not block the others.

Keyboard: when `closeOnEscape` is true, a `keydown` listener on
`document` calls `close("keyboard")` on Escape if the drawer is open.
The listener is registered at construction time and removed in
`destroy()`.

Size handling: for `left` / `right` sides, `size` sets the panel width
(in px); for `top` / `bottom`, it sets the height. The opposite
dimension is `100%` (full viewport edge).

### Public API surface

```ts
class Drawer {
  constructor(container: HTMLElement, options?: DrawerOptions)

  open(source?: "pointer" | "keyboard" | "programmatic"): void
  close(source?: "pointer" | "keyboard" | "programmatic"): void
  toggle(source?: "pointer" | "keyboard" | "programmatic"): void
  isOpen(): boolean

  setContent(content: string): void
  setTitle(title: string): void
  setProperty(name: string, value: unknown): void

  on(event: string, handler: DrawerHandler): void
  off(event: string, handler: DrawerHandler): void
  destroy(): void
}
```

Constructor options (`DrawerOptions`):

| Field                | Type         | Default   | Notes                                                          |
|----------------------|--------------|-----------|----------------------------------------------------------------|
| `side`               | `DrawerSide` | `"right"` | Edge the panel slides in from.                                 |
| `size`               | `number`     | `360`     | Panel width (left/right) or height (top/bottom) in px.         |
| `open`               | `boolean`    | `false`   | Initial open state.                                            |
| `showOverlay`        | `boolean`    | `true`    | Whether to render the dimmed overlay.                          |
| `closeOnOverlayClick`| `boolean`    | `true`    | Close when the overlay is clicked.                             |
| `closeOnEscape`      | `boolean`    | `true`    | Close on Escape (document-level keydown).                      |
| `title`              | `string`     | `""`      | Header title. Also sets `aria-label` on the panel.             |
| `content`            | `string`     | `""`      | Body content (plain text — set via `textContent`).             |

Emitted events (single event channel):

| Event    | Payload                                                                       | When                                       |
|----------|-------------------------------------------------------------------------------|--------------------------------------------|
| `change` | `{ type: "change", open: boolean, source: "pointer" \| "keyboard" \| "programmatic" }` | `open()` or `close()` actually changed the open state. No event if already in that state. |

`setProperty(name, value)` accepts: `"side"`, `"size"`, `"showOverlay"`,
`"closeOnOverlayClick"`, `"closeOnEscape"`, `"title"` (delegates to
`setTitle`), `"content"` (delegates to `setContent`), `"open"` (calls
`open("programmatic")` or `close("programmatic")`). Any other name is
ignored.

### Internal state

- `overlayEl: HTMLDivElement` — the overlay element.
- `panelEl: HTMLDivElement` — the panel element.
- `bodyEl: HTMLDivElement` — the body element (cached so `setContent` does not need a `querySelector`).
- `opts: Required<DrawerOptions>` — fully defaulted copy of constructor options.
- `_open: boolean` — current open state. The class short-circuits `open()` / `close()` when already in that state, so the `change` event only fires on actual transitions.
- `keydownHandler: ((e: KeyboardEvent) => void) | null` — bound Escape listener on `document`, or `null` when `closeOnEscape` is false.
- `listeners: Map<string, Set<DrawerHandler>>` — event subscriptions.
- `_destroyed: boolean` — guards `destroy()` and all public methods against post-teardown use.

### CSS custom properties

None. The drawer is the only component in this set whose injected CSS
hardcodes every color (surface `#211A30`, border `#383343`, text
`#F4F1FF`, muted `#B8B2CA`, accent `#D9FF66`, overlay `rgba(0,0,0,.5)`).
There are no `--dr-*` variables to override. To re-theme, override the
class rules directly (e.g. `.dr-panel { background: ... }`) in a
follow-up `<style>` with higher specificity, or fork the injected
stylesheet.

## Coding Conventions

- TypeScript strict, named exports.
- `injectStyles()` is idempotent — guarded by `document.getElementById(STYLE_ID)`.
- `destroy()` is idempotent — guarded by the `_destroyed` flag; removes
  the `keydown` listener, clears listeners, and wipes the container
  via `innerHTML = ""`.
- All public methods short-circuit on `_destroyed`.
- `open()` and `close()` are no-ops if already in the target state —
  no event is emitted, no DOM mutation occurs.
- Options are shallow-cloned on construction.
- No React/framework imports in this folder.
- No emojis.

## Known Issues

- No focus management. `aria-modal="true"` is set on the panel, but
  focus is not moved into the panel on open and Tab can leave the
  dialog. A proper implementation would trap focus and restore it to
  the previously-focused element on close.
- No `aria-controls` / `aria-labelledby` linking — the panel uses
  `aria-label` from the title instead of `aria-labelledby` pointing at
  the title span. Works for screen readers, but the wiring is implicit.
- The panel and overlay are appended to the container (not
  `document.body`) but use `position: fixed`. If any ancestor has
  `transform`, `filter`, `perspective`, or `will-change`, the fixed
  positioning resolves against that ancestor instead of the viewport,
  and the drawer will be mis-placed or clipped.
- All colors are hardcoded in the injected CSS — there are no
  `--dr-*` custom properties. Theming requires overriding the class
  rules directly.
- Body content is set via `textContent` — no HTML support. Hosts that
  need rich body content must grab `.dr-body` from the panel after
  construction and manipulate it directly (and avoid calling
  `setContent` afterwards, which would overwrite it).
- The `change` event fires synchronously at the start of the open/close
  transition, not when the CSS animation completes. Hosts that need to
  react after the animation finishes must attach their own
  `transitionend` listener on `.dr-panel`.
- The Escape `keydown` listener is on `document`. If multiple drawers
  are open simultaneously, pressing Escape closes whichever one
  receives the event first (the order is construction order — the
  listener added earliest runs first).
- `destroy()` clears the entire container via `innerHTML = ""`. If the
  host reuses the container for other content, that content will be
  wiped.
- `setProperty("side", ...)` swaps the side class but does not
  re-trigger the slide animation — the panel jumps to the new side
  instantly.

## Debugging Tips

- If the drawer appears in the wrong place (offset, clipped, or stuck
  inside a parent), inspect the container's ancestors for `transform`,
  `filter`, `perspective`, or `will-change`. `position: fixed` becomes
  relative to the nearest ancestor with any of those properties.
- If `change` events aren't firing, confirm the drawer actually
  transitioned — `open()` on an already-open drawer is a no-op and
  emits nothing.
- The `change` event fires before the slide animation finishes. To
  detect animation end, listen for `transitionend` on `.dr-panel`
  (the transition is on `transform`).
- For `side: "left"` / `"right"`, `size` is the panel width; for
  `"top"` / `"bottom"`, it's the height. The other dimension is
  always `100%` of the viewport.
- To inject HTML body content, after construction grab
  `drawerEl.querySelector(".dr-body")` and call `innerHTML` on it
  directly. Do not call `setContent` afterwards, or it will be
  overwritten with plain text.
