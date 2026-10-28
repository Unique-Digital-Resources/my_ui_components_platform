# AGENT.md — Scroll Layout

Contribution guide for `src/lib/components/scroll-layout/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**ScrollLayout** — a thin wrapper that turns any container into a
configurable scroll region with explicit control over orientation, scrollbar
visibility, min/max height, and optional top/bottom edge shadows that
appear when content overflows. Pure DOM, no canvas, no event bus.

## File Structure

```
src/lib/components/scroll-layout/
├── AGENT.md            <- this file
├── SKILL.md            <- usage docs
├── scroll-layout.ts    <- the ScrollLayout class (DOM + scoped CSS)
└── index.ts            <- barrel: class, types
```

## Architecture

The class builds a two-element structure inside the container:

```
container
└── .sl-root (.sl-orientation-<orientation> .sl-scrollbar-<scrollbar>)
    └── .sl-content
        └── ... (whatever children the container had at construction)
```

On construction, `render()` walks the container's existing children and
moves them into `.sl-content`. This means the host can place arbitrary
markup inside the container before instantiating `ScrollLayout`, and that
markup becomes the scrollable content. No content is destroyed on first
render.

`.sl-root` is the actual scroll container (`overflow: auto`). Its CSS
classes encode both the orientation and scrollbar mode:

- `.sl-orientation-vertical` — `overflow-y: auto; overflow-x: hidden`.
- `.sl-orientation-horizontal` — `overflow-y: hidden; overflow-x: auto`.
- `.sl-orientation-both` — `overflow: auto`.
- `.sl-scrollbar-auto` — no class hooks; uses the platform scrollbar
  styling defined for `.sl-root` (thin themed thumb via
  `scrollbar-width: thin` and `::-webkit-scrollbar-thumb`).
- `.sl-scrollbar-always` — same as auto (the platform always shows when
  content overflows).
- `.sl-scrollbar-hidden` — hides the scrollbar in both WebKit
  (`::-webkit-scrollbar { display: none }`) and Firefox
  (`scrollbar-width: none`).
- `.sl-scrollbar-hover` — thumb is transparent by default and only shows
  on `:hover`.

### Shadow indicators

When `showShadow: true`, the root gets up to two classes that render
inset box-shadows:

- `.sl-shadow-top` — added when `scrollTop > 4` (content above is hidden).
- `.sl-shadow-bottom` — added when
  `scrollTop + clientHeight < scrollHeight - 4` (content below is hidden).

A `scroll` listener on the root calls `updateShadows()` on every scroll
event. There is no debouncing — the work is just two `classList.toggle()`
calls, which is cheap. The listener is removed in `destroy()`.

### Public API surface

```ts
class ScrollLayout {
  constructor(container: HTMLElement, options?: ScrollLayoutOptions);

  scrollToTop(): void;
  scrollToBottom(): void;
  getContentEl(): HTMLElement;
  setProperty(name: string, value: unknown): void;
  destroy(): void;
}

interface ScrollLayoutOptions {
  orientation?: ScrollOrientation;  // "vertical" | "horizontal" | "both"
  scrollbar?: ScrollbarMode;        // "auto" | "always" | "hidden" | "hover"
  maxHeight?: number;
  minHeight?: number;
  showShadow?: boolean;
}

type ScrollOrientation = "vertical" | "horizontal" | "both";
type ScrollbarMode = "auto" | "always" | "hidden" | "hover";
```

### Internal state

- `container: HTMLElement` — the host element.
- `root: HTMLElement` — the `.sl-root` scroll container.
- `contentEl: HTMLElement` — the `.sl-content` div that holds the user's
  children. Exposed via `getContentEl()` so the host can append more
  children dynamically.
- `opts: Required<ScrollLayoutOptions>` — resolved options with defaults:
  `orientation: "vertical"`, `scrollbar: "auto"`, `maxHeight: 0`,
  `minHeight: 0`, `showShadow: false`. A `maxHeight` / `minHeight` of `0`
  means "not set" (no inline style applied).
- `scrollListener: (() => void) | null` — the bound shadow-update handler,
  attached only when `showShadow` is true. Removed in `destroy()`.
- `_destroyed: boolean` — idempotency guard for `destroy()`.

### CSS custom properties

All are declared on `.sl-root` in `injectStyles()`:

| Variable      | Default      | Purpose                                                        |
|---------------|--------------|----------------------------------------------------------------|
| `--sl-bg`     | `transparent`| Scroll container background.                                   |
| `--sl-border` | `#383343`    | Scrollbar thumb color (and `scrollbar-color` track-thumb).     |
| `--sl-shadow` | `rgba(0,0,0,.3)` | Color of the inset edge shadows when `showShadow` is on.   |

The scrollbar thumb hover color is hardcoded to `#B8B2CA` in the
stylesheet (it is not exposed as a variable).

## Coding Conventions

- TypeScript strict, named exports (class + types).
- `injectStyles()` is idempotent — guarded by
  `document.getElementById(STYLE_ID)`. No-op if the `<style>` already
  exists. Also no-ops on non-DOM environments (`typeof document ===
  "undefined"`) for SSR safety.
- `destroy()` is idempotent — guarded by a `_destroyed` flag; clears the
  scroll listener (if any) and empties the container's innerHTML.
- No React/framework imports in this folder.
- No emojis.
- No pointer capture is used — the component only listens to native
  `scroll` events on its own root.

## Known Issues

- **`setProperty()` re-renders by re-running `render()`, which re-parents
  the existing `.sl-root` into a new `.sl-content`.** The
  `while (this.container.firstChild) content.appendChild(...)` loop in
  `render()` is designed for first construction (when the container holds
  the user's pre-existing children). On a subsequent `setProperty()` call,
  the container's only child is the existing `.sl-root`, which gets moved
  inside a new `.sl-content` -> new `.sl-root`. Each `setProperty()` call
  adds one layer of nesting. To change a property safely, prefer
  `destroy()` + reconstruct, or call `getContentEl()` and manage the
  children yourself rather than calling `setProperty()`.
- **Leaked scroll listener on `setProperty()`.** When `showShadow` is
  true, `render()` attaches a fresh `scroll` listener to the new root
  without removing the previous one. The old root (now nested) retains
  its listener; this is a memory leak proportional to the number of
  `setProperty()` calls.
- **`scrollbar: "always"` behaves identically to `"auto"`.** The mode is
  declared and accepted but has no distinct CSS class — there is no
  `.sl-scrollbar-always` rule in the stylesheet. It works as expected
  because the platform always shows a scrollbar when content overflows,
  but a true "always visible" mode (showing a disabled track even when
  content fits) is not implemented.
- **Shadows rely on `scrollTop`/`scrollHeight`/`clientHeight`** — these
  are only meaningful when the root actually scrolls. With
  `orientation: "horizontal"` and `showShadow: true`, the shadows still
  respond to vertical scroll state, which may be misleading.
- **No programmatic scroll-to-position API.** Only `scrollToTop()` and
  `scrollToBottom()` are exposed. For arbitrary positions, call
  `getContentEl().parentElement.scrollTo(...)` yourself (the parent is
  the `.sl-root`).

## Debugging Tips

- If the scroll region is not scrolling, check that `.sl-content` is
  taller (or wider, for horizontal) than `.sl-root`. Use DevTools to
  inspect `clientHeight` vs `scrollHeight` on `.sl-root`.
- If `maxHeight` / `minHeight` appears not to apply, confirm the value
  passed `> 0`. A value of `0` (or undefined) is treated as "not set"
  and no inline style is added.
- The shadow classes `.sl-shadow-top` / `.sl-shadow-bottom` are toggled
  with a 4px dead zone at the extremes so they don't flicker when the
  user is exactly at `scrollTop = 0` or the bottom. If shadows look
  wrong, scroll a few pixels past the edge.
- To find the scroll container in DevTools when a host wraps it, look
  for `.sl-root` inside the host. The `getContentEl()` method returns
  the inner content div directly.
- For custom scroll behavior (e.g. smooth programmatic scroll to an
  element), use `getContentEl().querySelector(...).scrollIntoView()`.
  The browser handles the rest.
