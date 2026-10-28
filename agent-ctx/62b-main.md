# Task 62b — Migrate platform chrome + views from `useNavigation` (route/navigate) to file-based routing

Agent: main
Task ID: 62b

## Context

The previous task (62a) created the Next.js App Router file tree (`src/app/components/`, `src/app/docs/`, etc.), wired `layout.tsx` to wrap children in `PlatformShell`, and stripped the navigation store down to UI-only state (`searchOpen`, `mobileNavOpen`, `componentsQuery`, `componentsCategory`). A pure `navigation-types.ts` module was added holding the `Route` union and the `routeToHref` / `routeLabel` / `categoryLabel` helpers.

What 62a did NOT do: every chrome component and view still imported `route` / `navigate` from `useNavigation()` (no longer exported) and called `navigate(route)` from button `onClick` handlers. This task completed that migration.

## What changed

### 1. `src/lib/platform/content.ts` — `DocSection.route` → `DocSection.href`

- Removed the `import type { Route } from "@/store/navigation";` line.
- Changed `DocSection.route: Route` to `DocSection.href: string`.
- Updated each entry in `docSections` to use a URL string (`/docs/installation`, `/docs/concepts`, `/docs/theming`, `/docs/api`).

### 2. Platform chrome components — switched to `next/link` + `usePathname()`

- **`sidebar.tsx`**: Replaced `useNavigation().route` / `navigate` with `usePathname()`. Each `NavEntry` now carries both `route: Route` (for reference) and `href: string` (for rendering). The `isActive` predicate now takes a `pathname: string` instead of a `Route`. Entries are rendered as `<Link href={entry.href}>` instead of `<button onClick={() => navigate(entry.route)}>`. The `SidebarGroup` auto-opens when any entry is active OR when its category prefix matches the pathname. Helper `mkEntry(label, route, isActive, extra)` centralises the construction.
- **`header.tsx`**: Replaced `useNavigation().route` / `navigate` with `usePathname()`. Brand button → `<Link href={routeToHref({ name: "home" })}>`. The 4 primary nav buttons → `<Link>` elements. Each `NavItem` has both `href` and `matches(pathname)` predicate. `useNavigation()` retained only for `setSearchOpen`, `setMobileNavOpen`.
- **`breadcrumbs.tsx`**: The old `breadcrumbs(route)` helper was removed in 62a, so this file now builds the crumb trail from `usePathname()` directly via a new `buildBreadcrumbs(pathname)` function. The hierarchy mirrors the old `routeLabel` semantics: Home > section > [category] > [item]. Each non-final crumb is a `<Link href={c.href}>`; the last crumb is plain text. Uses `categoryLabel` from `navigation-types` and looks up component / doc / example labels from the content module.
- **`footer.tsx`**: Removed the `useNavigation()` call. Each internal column link is now `<Link href={routeToHref(link.route)}>`. External links unchanged (`<a href>`). `Route` type imported from `@/store/navigation-types`.
- **`mobile-nav.tsx`**: Replaced `useNavigation().navigate` with a click-capture pattern. The drawer wraps the `<Sidebar>` in a container whose `onClick` handler closes the drawer whenever the click target is inside an `<a>` (which is what `<Link>` renders). The brand lockup at the top is now `<Link href={routeToHref({ name: "home" })}>` with `onClick={() => setMobileNavOpen(false)}`. Escape-to-close and overlay-click-to-close behaviour preserved.
- **`search-palette.tsx`**: Replaced `useNavigation().navigate` with `useRouter().push()`. Each `SearchResult` now carries `href: string` (computed up front via `routeToHref(...)`) instead of `route: Route`. The `open(r)` callback calls `setSearchOpen(false)` then `router.push(r.href)`. Used `satisfies Route` on each route literal so the route-tagged union is still type-checked. Doc-section results read `d.href` (post-content.ts change) instead of `d.route`.

### 3. View components — switched to `<Link>` and `useParams()`

- **`home-view.tsx`**: All 7 CTAs (Explore components, Get started, Open component, Read the docs, 6 category cards, 3 example Explore buttons) converted from `<button onClick={navigate(...)}>` to `<Link href={routeToHref(...)}>`. Removed the `useNavigation` import. The `liveHex` state and the live `ColorWheelPickerReact` are unchanged.
- **`components-view.tsx`**: `ComponentCard` prop changed from `onNavigate: () => void` to `href: string`. The card renders `<Link href={href}>` instead of `<button onClick={onNavigate}>`. Planned entries remain a non-interactive `<div>`. `useNavigation()` retained only for `componentsQuery`, `componentsCategory`, `setComponentsQuery`, `setComponentsCategory`. Removed the `Route` type import (no longer needed) and added `routeToHref` + `Link` imports.
- **`category-view.tsx`**: Reads `category` from `useParams()` instead of `useNavigation().route`. Removed the `route.name !== "category"` bail-out (the route file `[category]/page.tsx` only mounts this view for category URLs). Each available-component card is now `<Link href={routeToHref({ name: "component", category, slug })}>`. Removed `useNavigation` import entirely.
- **`example-detail-view.tsx`**: Reads `slug` from `useParams()` instead of `useNavigation().route`. The not-found "Back to examples" button → `<Link>`. Each component-used card → `<Link>`. The footer "All examples" button → `<Link>`. Removed `useNavigation` and `Route` imports.
- **`examples-view.tsx`**: `ExampleCard` now renders `<Link href={routeToHref({ name: "example", slug })}>` instead of `<button onClick={navigate}>`. Removed `useNavigation` import.
- **`docs-view.tsx`**: "Read the guide" CTA → `<Link href={routeToHref({ name: "docs-installation" })}>`. Each doc-section card → `<Link href={section.href}>` (uses the new `href` field from content.ts). Removed `useNavigation` and `Route` imports.
- **`docs-api-view.tsx`**: Per-component "Open component" buttons → `<Link>`. Each `EntryCard`'s "Open component" button → `<Link>`. Changed `EntryGroup` and `EntryCard` props from `onOpen: () => void` to `href: string`. `Route` type now imported from `@/store/navigation-types` (still used to build the component route literal).
- **`resources-view.tsx`**: `ResourceCard` renders `<Link href={routeToHref(destination.route)}>` for internal destinations. The external-destination `<a>` is unchanged. Removed `useNavigation` import; `Route` type imported from `@/store/navigation-types`.

### 4. Playground files — removed unused `useNavigation` import

Six playground files imported `useNavigation` but never used anything from it (the import was left over from earlier view-style code). Removed the import line from:
- `src/components/color-wheel/color-wheel-playground.tsx`
- `src/components/toggle-group/toggle-group-playground.tsx`
- `src/components/custom-button/custom-button-playground.tsx`
- `src/components/color-circle/color-circle-playground.tsx`
- `src/components/color-ramp/color-ramp-playground.tsx`
- `src/components/color-range/color-range-playground.tsx`

(`calendar-playground.tsx` did not import `useNavigation` at all — verified.)

### 5. `src/lib/components/calendar/calendar.ts` — left alone

The `navigate(direction: "prev" | "next")` and `navigateTo(date)` methods on the `Calendar` class are internal month-navigation helpers, not related to the platform's `useNavigation` store. They were not touched.

### 6. Created missing `src/components/theme-editor/theme-editor-view.tsx`

`src/app/theme-editor/page.tsx` (created in 62a) imported `{ ThemeEditorView }` from `@/components/theme-editor/theme-editor-view`, but that module did not exist — causing the only `tsc` error in the `platform/ | views/ | store/navigation | app/` filter. Created a minimal but presentable placeholder view (PageContainer + Breadcrumbs + PageOverline + "Coming soon" panel) so the route is reachable and `tsc` passes. The full interactive theme editor is on the roadmap; the placeholder clearly says so and points users at the theming guide.

## Verification

- `bun run lint` → 0 errors, 0 warnings. ✓
- `bunx tsc --noEmit 2>&1 | grep -E "platform/|views/|store/navigation|app/" | head -20` → empty. ✓
  - The only remaining `tsc` errors are pre-existing and unrelated to this task: `examples/websocket/...` (missing `socket.io` types), `skills/...` (skill scripts), `src/components/color-circle/color-circle-playground.tsx(115,26)` (pre-existing `setBaseIndex` API mismatch), `src/lib/components/calendar/calendar.ts` (pre-existing event-payload type mismatches), `src/lib/components/color-circle/color-circle.ts(27,8)` (pre-existing `GridMode` export issue). Confirmed pre-existing by `git stash` test.
- Agent Browser smoke test:
  - `/` → renders hero, CTAs are links, category cards are links, sidebar hidden (full-width). ✓
  - `/components` → breadcrumb "Home / Components", sidebar visible with Documentation and Color groups expanded. ✓
  - `/components/color` → breadcrumb "Home / Components / Color", sidebar expanded for the active category. ✓
  - `/docs` → breadcrumb "Home / Documentation", getting-started CTA + doc-section cards all links. ✓
  - `/docs/api` → 10+ "Open component" links (one per section + one per entry card) all `<Link>`. ✓
  - `/examples` → 3 example cards as `<Link>`. ✓
  - `/examples/creative-inspector` → breadcrumb "Home / Examples / Creative application inspector", "All examples" link navigates back. ✓
  - `/examples/non-existent-slug` → "Example not found" page with "Back to examples" link. ✓
  - `/resources` → 6 resource cards as `<Link>` for internal destinations, `<a>` for external. Clicked "Color model primer" → navigated to `/docs/concepts`. ✓
  - Search palette: ⌘K button opens palette, typed "color", pressed Enter → navigated to `/components/color/color-wheel` (first result). ✓
  - Header nav: clicked "Components" link in primary nav → navigated to `/components`. ✓
  - Theme editor route: `/theme-editor` → renders the new placeholder view (200 OK). ✓
  - All 13 routes (`/`, `/components`, `/components/color`, `/components/color/color-wheel`, `/docs`, `/docs/installation`, `/docs/api`, `/examples`, `/examples/creative-inspector`, `/resources`, `/changelog`, `/contributing`, `/theme-editor`) return 200. ✓

## Files modified

1. `src/lib/platform/content.ts` — DocSection.route → href
2. `src/components/platform/sidebar.tsx` — full rewrite to usepathname + Link
3. `src/components/platform/header.tsx` — full rewrite to usepathname + Link
4. `src/components/platform/breadcrumbs.tsx` — full rewrite with buildBreadcrumbs(pathname) helper
5. `src/components/platform/footer.tsx` — Link instead of button
6. `src/components/platform/mobile-nav.tsx` — click-capture to close drawer on link clicks
7. `src/components/platform/search-palette.tsx` — useRouter().push + href-based results
8. `src/components/views/home-view.tsx` — all CTAs to Link
9. `src/components/views/components-view.tsx` — ComponentCard uses Link, kept useNavigation for filter state
10. `src/components/views/category-view.tsx` — useParams() for category slug, Link for component cards
11. `src/components/views/example-detail-view.tsx` — useParams() for slug, all buttons → Link
12. `src/components/views/examples-view.tsx` — ExampleCard uses Link
13. `src/components/views/docs-view.tsx` — CTAs and doc-section cards use Link
14. `src/components/views/docs-api-view.tsx` — per-section and per-entry "Open component" use Link
15. `src/components/views/resources-view.tsx` — ResourceCard uses Link for internal destinations
16. `src/components/color-wheel/color-wheel-playground.tsx` — removed unused useNavigation import
17. `src/components/toggle-group/toggle-group-playground.tsx` — removed unused useNavigation import
18. `src/components/custom-button/custom-button-playground.tsx` — removed unused useNavigation import
19. `src/components/color-circle/color-circle-playground.tsx` — removed unused useNavigation import
20. `src/components/color-ramp/color-ramp-playground.tsx` — removed unused useNavigation import
21. `src/components/color-range/color-range-playground.tsx` — removed unused useNavigation import

## Files created

22. `src/components/theme-editor/theme-editor-view.tsx` — placeholder view so `/theme-editor` route resolves and tsc passes

## Notes for downstream agents

- The `Route` type now lives in `@/store/navigation-types`. Components that need the literal type (e.g. to build a route object for `routeToHref`) should import it from there.
- The `useNavigation()` store now only exposes `searchOpen`, `setSearchOpen`, `mobileNavOpen`, `setMobileNavOpen`, `componentsQuery`, `setComponentsQuery`, `componentsCategory`, `setComponentsCategory`. Do NOT add `route` / `navigate` back to it.
- To detect the active section in a component, use `usePathname()` from `next/navigation` and compare with `routeToHref(routeLiteral)` or use prefix matching (`pathname.startsWith(...)`).
- To get a dynamic segment, use `useParams()` from `next/navigation`. The returned values can be `string | string[]` — always normalise with `Array.isArray(p) ? p[0] : (p ?? "")`.
- For navigation triggered from non-link contexts (e.g. keyboard handlers in the search palette), use `useRouter().push(href)` from `next/navigation`.
- Pre-existing `tsc` errors in `color-circle`, `calendar`, and `examples/websocket` are out of scope of this task and were not touched.
- A pre-existing hydration warning exists on pages that render the `MiniColorWheel` SVG (`/components`, `/components/color`, `/examples`) because `Math.cos`/`Math.sin` produce slightly different floating-point results between SSR (Node) and the browser. This warning is cosmetic and was present before this task; the page still hydrates and works correctly. Not addressed here — would need either deterministic rounding of the path coordinates or `dangerouslySetInnerHTML` with a precomputed string.
