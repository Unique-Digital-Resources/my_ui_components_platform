# Task 1 — CustomButton (vanilla JS + React wrapper + playground)

Agent: main
Started: read worklog.md + content.ts + navigation.ts + page.tsx + existing component patterns (color-ramp, color-range) for consistency.

## Plan
1. Build vanilla JS `CustomButton` class in `src/lib/components/custom-button/custom-button.ts`.
2. Barrel exports in `src/lib/components/custom-button/index.ts`.
3. React wrapper `src/components/custom-button/custom-button-react.tsx`.
4. Playground `src/components/custom-button/custom-button-playground.tsx`.
5. Add `custom-button` metadata to `src/lib/platform/content.ts` (inputs category).
6. Extend `routeLabel` in `src/store/navigation.ts` for the `custom-button` slug.
7. Wire `component/inputs/custom-button` route in `src/app/page.tsx`.

## Key decisions
- **DOM-based, not canvas.** The spec calls for a `<button>` element. The class injects its own scoped CSS (prefixed `.custom-button-`) so it works outside the platform.
- **Built-in Lucide-style icon set** (18 icons) hardcoded as inner SVG markup. `getIconSvg(name)` wraps them in a 24×24 viewBox `<svg>` with `stroke="currentColor"`. `BUILT_IN_ICON_NAMES` is exported so the playground can populate its dropdown without duplicating the list.
- **Image support** via `iconType: "image"` — renders an `<img src="...">` instead of an SVG. Works with URLs and data URIs.
- **Variants/sizes driven by data-attributes** (`data-variant`, `data-size`) + CSS custom properties (`--cb-bg`, `--cb-color`, `--cb-h`, etc.) so the variant/size CSS is short and self-documenting.
- **Stacked layouts** (iconPosition top/bottom) switch `flex-direction: column`, add vertical padding, and use `height: auto` with `min-height` so the button grows to fit a two-line layout.
- **Icon-only buttons** get `aspect-ratio: 1/1` + `width: var(--cb-h)` + `padding: 0`, plus an `aria-label` derived from the icon name.
- **Lint-friendly handler type.** The spec calls for `off(event: string, handler: Function)`, but `@typescript-eslint/no-unsafe-function-type` rejects `Function`. Defined `export type CustomButtonHandler = (...args: unknown[]) => void;` and used it for both `off` and the listeners Map.
- **React Compiler memoization.** Initial draft used `useCallback` with empty deps for `update`/`reset`/`onClick`. The React Compiler inferred `setState`/`setClickCount` as deps and bailed out with `react-hooks/preserve-manual-memoization`. Fix: removed the manual `useCallback` wrappers — the compiler memoizes the plain functions automatically.
- **Smart icon-type switching in the playground.** Switching to "image" mode with a built-in icon name selected swaps in a default SVG data URI; switching back restores "plus". Implemented in the iconType `onValueChange` handler (not a `useEffect`) so it doesn't fight with manual edits.
- **Imperative-API demo section.** A row of one-click buttons in the playground calls `setText`/`setVariant`/`setIcon`/`setDisabled`/`setSize` on the live instance and toasts confirmation, so users can see the imperative API work end-to-end.

## Files created
- `src/lib/components/custom-button/custom-button.ts` — vanilla class (~480 lines: class + 18-icon Lucide set + scoped CSS).
- `src/lib/components/custom-button/index.ts` — barrel exports.
- `src/components/custom-button/custom-button-react.tsx` — React wrapper (owns instance, forwards props via effects, exposes via `instanceRef`).
- `src/components/custom-button/custom-button-playground.tsx` — playground with live preview, property inspector, click counter, imperative-API demo, code panel (JS/HTML/CSS/API), documentation.

## Files modified
- `src/lib/platform/content.ts` — added `custom-button` to `components` array (inputs category) with properties, methods, events, defaults, when-to-use, when-not-to-use, capabilities, tags.
- `src/store/navigation.ts` — added `custom-button` slug → "Custom Button" in the `routeLabel` switch (the existing `categoryLabel` helper already mapped "inputs" → "Inputs").
- `src/app/page.tsx` — imported `CustomButtonPlayground` and added the `route.category === "inputs" && route.slug === "custom-button"` branch.

## Verification
- `bun run lint` — 0 errors, 0 warnings.
- Dev server compiles cleanly (`✓ Compiled in 126ms` after the final playground edit).
- Sidebar (Inputs → Custom Button), Components directory (Inputs card), and breadcrumbs all resolve via the existing dynamic nav built from `content.ts`.
