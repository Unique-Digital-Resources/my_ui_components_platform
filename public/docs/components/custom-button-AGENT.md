# AGENT.md — Custom Button

Contribution guide for `src/lib/components/custom-button/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**CustomButton** — a versatile button component. DOM-based (no canvas).
Renders a `<button>` element with configurable content (text, icon, or
both), icon positioning (left / right / top / bottom), four visual variants
(`primary` / `secondary` / `outline` / `ghost`), three sizes (`sm` / `md` /
`lg`), and `disabled` / `fullWidth` states. Supports both inline-SVG
Lucide-style icons (looked up by name from a built-in set) and `<img>`-based
images (data URI or URL).

## File Structure

```
src/lib/components/custom-button/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── custom-button.ts    ← the CustomButton class (DOM + scoped CSS)
└── index.ts            ← barrel: class, types, BUILT_IN_ICON_NAMES
```

## Architecture

The class creates a real `<button>` element (not a div) and manages its
content via three child slots: an icon container (`<span class="custom-button-icon">`)
and a text label (`<span class="custom-button-label">`). The DOM tree is
rebuilt on every setter call that changes content / position — there is no
virtual DOM. Reconstruction is cheap (3-5 elements) and preserves the
`<button>` element itself (so focus is not lost).

Scoped CSS is injected once per document under
`#custom-button-styles`. All visual tokens are CSS custom properties on
`.custom-button-root` (`--cb-bg`, `--cb-bg-hover`, `--cb-color`, `--cb-border`,
`--cb-h`, `--cb-font-size`, `--cb-pad-x`, `--cb-gap`, `--cb-focus-ring`).
Variant and size are applied via `data-variant` and `data-size` attributes;
the CSS overrides the tokens per attribute. This means a host can override
any single token on a specific button without rewriting the whole stylesheet.

### Built-in icon set

`LUCIDE_ICONS` is a `Record<string, string>` of inner SVG markup (the `<svg>`
wrapper is added by `getIconSvg`). All icons use a 24×24 viewBox with
`fill="none"` and `stroke="currentColor"`. Curated set: `plus`, `x`, `check`,
`settings`, `search`, `home`, `star`, `heart`, `arrow-right`, `trash`,
`download`, `upload`, `mail`, `user`, `save`, `edit`, `bell`, `refresh`.

`BUILT_IN_ICON_NAMES` is the sorted list, exported for playground dropdowns.

Unknown icon names fall back to a small placeholder dot (a centered
`<circle>`) so you get visual feedback rather than an empty box.

### Image icons

When `iconType = "image"`, the `icon` string is treated as an `<img src>`
(data URI or URL). The image is rendered inside the icon container with
`object-fit: contain` and sized to match the icon SVG dimensions.

### Icon positioning

`iconPosition` controls flex direction:

- `left` (default) / `right`: horizontal flex; `right` reverses the order.
- `top` / `bottom`: vertical flex (column); adds vertical padding and a
  smaller gap because the button grows taller. `min-height` is preserved.

Icon-only buttons (no text) get a `custom-button-icon-only` class that makes
them square (`aspect-ratio: 1/1; width: var(--cb-h); padding: 0`).

### Event handling

The class attaches a single `click` listener to the `<button>` and forwards
to its EventEmitter (`Map<string, Set<Handler>>`). Disabled buttons
(`disabled` or `aria-disabled="true"`) don't fire `click` — the CSS sets
`pointer-events: none`-equivalent via `cursor: not-allowed` and `transform:
none`, and the handler checks `disabled` before emitting.

## How to Extend / Modify

- **Add a built-in icon**: add an entry to `LUCIDE_ICONS` (inner SVG markup
  only — the `<svg>` wrapper is added by `getIconSvg`). Update
  `BUILT_IN_ICON_NAMES` is auto-derived from `Object.keys().sort()`.
- **Add a variant**: add a `[data-variant="..."]` block in `injectStyles`
  that overrides `--cb-bg`, `--cb-bg-hover`, `--cb-color`, `--cb-border`.
  Extend the `CustomButtonVariant` type.
- **Add a size**: add a `[data-size="..."]` block overriding `--cb-h`,
  `--cb-font-size`, `--cb-pad-x`, `--cb-gap`. Extend the
  `CustomButtonSize` type.
- **Custom theming per instance**: the host can set `style.setProperty('--cb-bg', ...)`
  on the root, or add a class that overrides the tokens. No code change
  needed.
- **Async click (loading state)**: not currently supported. A future
  enhancement could add a `loading` option that swaps the icon for a
  spinner and disables the button.

## Known Issues & TODOs

- The DOM is rebuilt on every setter call. This is intentional (cheap,
  preserves focus) but means there's no transition between icon positions —
  the layout snaps. A smoother transition would require keeping the icon
  and label elements stable and only changing their order/parent.
- The `image` icon type uses `<img>` which doesn't inherit `currentColor` —
  the image must be a fully-colored asset (no monochrome SVG recoloring).
- No `loading` state, no spinner, no async-click guard. Callers must
  disable the button themselves during async operations.
- The built-in icon set is curated, not exhaustive. For a full Lucide set,
  the host would need to pass `iconType = "image"` with a data URI, or
  extend `LUCIDE_ICONS`.
- The button is always a `<button>` element — there's no `<a>` mode for
  link buttons. A future enhancement could add an `as` option.

## Files This Component Touches

- React wrapper: `src/components/custom-button/custom-button-react.tsx`
- Playground: `src/components/custom-button/custom-button-playground.tsx`
- Metadata: `src/lib/platform/content.ts` (slug `"custom-button"`)
- No built-in commands (the button doesn't register keyboard shortcuts).
