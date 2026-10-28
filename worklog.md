# Project Worklog — Vanilla JavaScript UI Component Platform

This is the shared worklog for all agents working on the Workshop component-library platform.
Each agent MUST read this file before starting and append a new section after finishing.

Project goal: Build a Next.js documentation/showcase platform for a vanilla JavaScript UI
component library. The first (and currently only) component is the Color Wheel Picker.

Critical constraint: Only the `/` route is user-visible. All "routes" from the PRD are
simulated via client-side Zustand navigation state.

Design system: Obsidian `#101014` + Deep Violet `#211A30` + Lemon Signal `#D9FF66`.
Dark theme by default. Fonts: Inter + JetBrains Mono. Icons: Lucide.

---
Task ID: 1
Agent: main
Task: Set up design system foundation (CSS tokens, fonts, theme provider, layout, navigation store, content metadata)

Work Log:
- Read all four spec files (PRD, Architecture, DesignSystem, Ui) to understand the full scope.
- Established design tokens in src/app/globals.css: brand palette (Obsidian, Deep Violet, Lemon Signal, Soft Lavender), semantic colors, motion tokens, custom scrollbar, panel utilities, hero glow, grid background.
- Configured Inter + JetBrains Mono fonts in src/app/layout.tsx with ThemeProvider (next-themes), dark theme as default.
- Created src/store/navigation.ts: Zustand store for client-side routing (Route union type + navigate + breadcrumbs + search palette + mobile nav state).
- Created src/lib/platform/content.ts: single source of truth for component metadata, categories, examples, changelog, doc sections.

Stage Summary:
- Design system foundation complete and ready for subagents.
- Navigation model: Route discriminated union with names home/components/category/component/docs/docs-*/examples/example/resources/changelog/contributing.
- Color Wheel Picker metadata is defined (properties, methods, events, defaults) so the playground can be driven by a schema.
- Next: vanilla JS Color Wheel Picker component (Task 2), then platform shell + views (Tasks 3–5).

---
Task ID: 2
Agent: full-stack-developer
Task: Build vanilla JS Color Wheel Picker component

Work Log:
- Read worklog (Task 1 design-system foundation) and PRD §3–8 to lock the component contract before coding.
- Created `src/lib/components/color-wheel/color-utils.ts` (308 lines): pure color math — `hsvToRgb` / `rgbToHsv` / `rgbToHex` / `hexToRgb` / `hsvToHsl` / `hslToHsv`, a `parseColor` that accepts hex / `rgb()` / `hsl()` / named colors / `{r,g,b}` / `{h,s,v}` / `{h,s,l}` objects, plus `formatHex`, `toColorOutput`, `clamp`, `clampHue`. No DOM, no side effects, no dependencies.
- Created `src/lib/components/color-wheel/color-wheel-picker.ts` (1166 lines): the `ColorWheelPicker` class.
  - Single `<canvas>` renderer; scoped CSS injected once per document (`#color-wheel-picker-styles`) with `--color-picker-*` custom properties for host overrides (marker borders, focus ring, background).
  - Geometry: `innerR = size/2`, `wheelInnerR = innerR + wheelSpacing`, `wheelOuterR = wheelInnerR + wheelThickness`, `total = wheelOuterR * 2`, `cx = cy = total/2` — wheel stays centered on the inner shape.
  - Hue mapping: 0° at top, clockwise; `angle = -π/2 + hue·π/180`; inverse `theta = atan2(dx, -dy)`.
  - Hue wheel: 360 one-degree arc segments filled with `hsl(i, 100%, 50%)`. Cached as an offscreen canvas keyed by `(total, dpr)` so it only re-renders when geometry or DPR changes.
  - Triangle: equilateral HSV triangle (A=top/white, B=bottom-right/pure hue, C=bottom-left/black). Per-pixel barycentric rendering with ~1px anti-aliased coverage. `V = α+β`, `S = β/V`.
  - Square: inscribed square (`side = innerR·√2`) with 3 stacked gradients — pure hue → white-to-transparent (S) → transparent-to-black (V). Clipped to the square.
  - Disk: polar mapping `r → S`, `θ → V = (1+cos θ)/2`. Smooth, seam-free; the tracked `diskTheta` field disambiguates the two θ values that map to the same V so the inner marker stays where the user dragged it.
  - `none` mode: only the wheel + a solid filled inner circle in the current color; inner area is non-interactive.
  - Inner-shape canvas cached per `(shape, total, dpr, hue)` so SV drags only redraw the cheap markers and hue drags only re-render the inner shape (not the wheel).
  - Markers: hue marker = white-halo + dark-ring + pure-hue dot at the wheel mid-radius; inner marker = same triple-ring with the selected color in the center. Both stay perceivable against any hue/SV.
  - Pointer interaction: `pointerdown` routes by radius (wheel ring vs inner circle vs gap); `setPointerCapture` for clean dragging; `pointermove` updates hue or SV continuously; `input` fires on every move, `change` on `pointerup`/`pointercancel`. Triangle drag clamps barycentric to ≥ 0 and renormalizes; square clamps to `[0,1]`; disk clamps radius.
  - Keyboard: `ArrowLeft/Right` adjust hue by 1° (Shift = 10°); `Ctrl/Cmd+ArrowLeft/Right` adjust saturation; `ArrowUp/Down` adjust value (Shift = 10); `Home/End` wrap hue. Each key press emits `input` + `change`.
  - Public API exactly matches the PRD contract: `constructor(container, options?)`, `setColor(color)`, `getColor()`, `setShape(shape)`, `setSize(size)`, `setHue(hue)`, `on/off(event, handler)`, `destroy()`. `setColor`/`setHue` accept programmatic updates and fire `input` + `change`. `setShape`/`setSize` preserve the current color (geometry-only changes).
  - Tiny internal EventEmitter: `Map<string, Set<ColorHandler>>`. `emit` clones the handler set to a plain array so a handler unsubscribing during dispatch doesn't skip siblings; listener errors are caught and logged so a single bad handler can't crash the picker.
  - `ResizeObserver` watches the canvas and refreshes the backing store + caches on DPR changes (e.g. window moved between monitors) — disconnected in `destroy()`.
  - `destroy()` is idempotent: removes all pointer/keyboard listeners, releases pointer capture, disconnects the ResizeObserver, clears the handler map, removes the canvas from the DOM, drops the container class, clears the canvas, and nulls both offscreen caches.
- Created `src/lib/components/color-wheel/index.ts` re-exporting the class, the `Shape`/`ColorPickerOptions` types, the `RGB`/`HSV`/`HSL`/`ColorOutput`/`ColorInput` types, and the color-math utilities.
- Ran `bun run lint` — clean (0 errors, 0 warnings) after fixing two issues: replaced the `Function` type on `on`/`off` overloads with the explicit `ColorHandler = (color: ColorOutput) => void` to satisfy `@typescript-eslint/no-unsafe-function-type`, and removed an unused `eslint-disable-next-line no-console` directive. Ran `bunx tsc --noEmit` — no type errors in the new files (only unrelated pre-existing errors in `examples/` and `skills/`).

Stage Summary:
- Vanilla TS Color Wheel Picker is complete and self-contained (no React/Next.js imports). Files produced:
  - `src/lib/components/color-wheel/color-utils.ts` — color math (HSV/RGB/HSL/HEX + parser).
  - `src/lib/components/color-wheel/color-wheel-picker.ts` — `ColorWheelPicker` class (canvas renderer, pointer + keyboard, caching, public API, scoped CSS).
  - `src/lib/components/color-wheel/index.ts` — public barrel.
- Public API surface (final):
  - `new ColorWheelPicker(container, options?: { shape?, size?, wheelThickness?, wheelSpacing?, hue?, color? })`
  - `setColor(color: string)`, `getColor(): ColorOutput`, `setShape(shape)`, `setSize(size)`, `setHue(hue)`, `on("input"|"change", handler)`, `off(event, handler)`, `destroy()`
  - `ColorOutput = { hex, rgb{r,g,b}, hsv{h,s,v}, hsl{h,s,l} }`
- Geometry notes:
  - Component total = `size + 2·(wheelSpacing + wheelThickness)`; wheel centered on inner shape; resizing via `setSize()` re-derives everything from `size`.
  - Hue 0° at top, clockwise; markers track the same angular convention.
  - Triangle uses barycentric `(α, β, γ)` with `V = α+β`, `S = β/V`; inverse `α = V(1−S)`, `β = SV`, `γ = 1−V`. Vertex order: top=white, bottom-right=pure hue, bottom-left=black.
  - Disk uses `r → S`, `θ → V = (1+cos θ)/2`; smooth, no seam, with a tracked `diskTheta` to disambiguate the two θ values that yield the same V (so the inner marker stays where the user dragged).
- Caching: wheel cached per `(total, dpr)`; inner shape cached per `(shape, total, dpr, hue)`. SV drags only redraw markers; hue drags only re-render the inner shape; size/shape changes invalidate the relevant caches.
- Ready to be wrapped by a React component (Task 4) and showcased by the platform shell (Tasks 3/5). No globals.css / layout.tsx / route changes were made.

---
Task ID: 3
Agent: main
Task: Build Zustand navigation store + global shell (header, sidebar, footer, search palette, mobile nav)

Work Log:
- Created src/store/navigation.ts: Zustand store with Route union type (home/components/category/component/docs/docs-*/examples/example/resources/changelog/contributing), navigate(), breadcrumbs(), routeLabel() helpers, search palette + mobile nav state.
- Created src/components/platform/brand.tsx: geometric Workshop brand mark (three offset rounded squares + center node).
- Created src/components/platform/theme-toggle.tsx: light/dark toggle using next-themes.
- Created src/components/platform/header.tsx: sticky top header with brand, primary nav (Components/Documentation/Examples/Resources), search trigger with ⌘K, theme toggle, github link, mobile menu button.
- Created src/components/platform/sidebar.tsx: collapsible library/docs/project nav groups driven by content.ts metadata, auto-opens the active group, shows planned components as disabled.
- Created src/components/platform/footer.tsx: sticky-to-bottom footer with 4 link columns + brand blurb + status note.
- Created src/components/platform/mobile-nav.tsx: slide-in drawer for narrow screens.
- Created src/components/platform/search-palette.tsx: ⌘K command palette overlay with grouped results, arrow-key navigation, Enter to open, Esc to close.
- Created src/components/platform/code-block.tsx: CodeBlock (with copy button, filename, language label, traffic-light header) + CopyableValue chip.
- Created src/components/platform/breadcrumbs.tsx: Breadcrumbs + PageOverline.
- Created src/components/platform/shell.tsx: PlatformShell (header + optional sidebar + main + footer) + PageContainer.
- Created src/components/color-wheel/color-wheel-picker-react.tsx: React wrapper around the vanilla ColorWheelPicker — owns the instance, forwards prop changes via imperative API, forwards input/change events.
- Created src/components/color-wheel/color-wheel-playground.tsx: the full component detail page — live preview (canvas), property inspector (shape segmented control, size/thickness/spacing sliders, hex input with validation), output bar + copyable values, code panel (JS/HTML/CSS/API tabs with live-synced code), and documentation section with properties/methods/events/accessibility/troubleshooting tables.

Stage Summary:
- Platform shell is complete and renders all chrome (header/sidebar/footer/search/mobile nav).
- The Color Wheel playground is fully wired: real vanilla JS component ↔ property inspector ↔ output panel ↔ generated code, all synchronized.
- Next: launch parallel subagents for Home view, Components+Category views, Documentation views, and Examples+Changelog+Contributing views (Tasks 5-a/b/c/d). These subagents will create view components that the main page.tsx will switch between based on the navigation store's route.
- IMPORTANT for subagents: views must be default-exported React components from src/components/views/, must NOT import the platform shell (the shell is provided by page.tsx), and must use useNavigation() for any in-app navigation. They receive no props.

---
Task ID: 5-c
Agent: full-stack-developer
Task: Build FIVE documentation view components (docs landing, installation, concepts, theming, API reference)

Work Log:
- Read worklog (Tasks 1–3) to lock the design system, navigation model, and existing platform primitives (Breadcrumbs, PageOverline, CodeBlock, PageContainer) before writing any view code.
- Read `src/lib/platform/content.ts` to consume the single source of truth for `components`, `categories`, and `docSections`. The Color Wheel Picker exposes `methods` (8 entries), `events` (input + change), and `properties` (6 entries) — all surfaced verbatim by the API view.
- Created `src/components/views/docs-view.tsx` (DocsView, default export, no props):
  - Breadcrumbs + PageOverline "Documentation" + H1 + intro paragraph.
  - "Getting started" hero `.panel` with a lemon CTA button that navigates to `docs-installation` via `useNavigation((s) => s.navigate)`.
  - 2×2 grid of doc-section cards driven by `docSections`, each with a Lucide icon (Download/Boxes/Palette/Code), title, description, and an arrow link that navigates to the section's `route`.
  - "What you'll find here" section: a 2-column bullet list of six docs coverage areas (lifecycle, configuration, events, theming, accessibility, framework interop) each with a lemon icon.
- Created `src/components/views/docs-installation-view.tsx` (DocsInstallationView):
  - Breadcrumbs + PageOverline + H1 "Installation" + intro.
  - "Prerequisites" subsection: 3-column `.panel` listing the three prerequisites with lemon check icons.
  - "Choose a distribution method" subsection: a `role="tablist"` segmented control with two options (Package manager / Direct import) implemented as a small state-managed toggle (`useState<DistributionMethod>`). Each tab shows the appropriate `CodeBlock`(s): bash install + JS import for the package tab, single HTML `<script type="module">` for the CDN tab.
  - "Include the CSS" subsection: CodeBlock html with the `<link rel="stylesheet">` tag.
  - "Add a container" subsection: CodeBlock html with `<div id="color-picker"></div>`.
  - "Initialize the component" subsection: CodeBlock javascript with the full `new ColorWheelPicker(...)` + `picker.on("change", ...)` example exactly as specified.
  - "Verify" subsection: short paragraph + a `.panel` callout with the lemon check icon and the exact "what you should see" copy.
  - "Troubleshooting" subsection: a `<dl>` of 4 symptom/fix pairs rendered as `.panel` cards with a purple-soft alert icon on the symptom side and a left-border separator before the fix.
- Created `src/components/views/docs-concepts-view.tsx` (DocsConceptsView):
  - Breadcrumbs + PageOverline + H1 "Core concepts" + intro.
  - 2×2 grid of concept cards: "Component initialization" (Boxes), "State and updates" (SlidersHorizontal), "Events and lifecycle" (Radio), "Framework interoperability" (Layers).
  - "Component initialization" section: explanation of containers/options/defaults + a CodeBlock javascript showing construction with shape/size/wheelThickness/color overrides.
  - "State and updates" section: explanation that the component owns its DOM and state; setColor/setShape/setSize update both; getColor() reads; geometry-only setters preserve the color. CodeBlock javascript with the three setters + getColor destructure.
  - "Events and lifecycle" section: explanation of `input` (continuous) vs `change` (committed) with a bulleted list, plus on/off/destroy lifecycle notes. CodeBlock javascript with subscribe + unsubscribe + destroy.
  - "Framework interoperability" section: explanation that the component is vanilla JS and the host should NOT re-create the instance on every render. A lemon-tinted callout box emphasizes the rule, followed by a CodeBlock tsx showing a thin React wrapper using two `useEffect`s (mount-once construction with `eslint-disable-next-line react-hooks/exhaustive-deps`, then separate effects forwarding `color` and `shape` prop changes through the imperative API).
- Created `src/components/views/docs-theming-view.tsx` (DocsThemingView):
  - Breadcrumbs + PageOverline + H1 "Theming and customization" + intro.
  - "Design tokens" section: explains the platform's semantic tokens (--surface/--text-primary/--border) vs the library's prefixed --color-picker-* variables. CodeBlock css with the exact token foundation from DesignSystem.md §11 (5 variables).
  - "Supported customization points" section: a `.panel` table with three columns (Variable / Default / Purpose) listing all 5 public --color-picker-* variables.
  - "Light and dark themes" section: explanation that the canvas is transparent and adapts to its container, plus a before/after pair of `.panel` cards (dark surface with white-bordered marker, light surface with dark-bordered marker) — each with a static visual mock and a contrast note.
  - "Interaction states" section: 2-column list of Focus (lemon ring), Hover (cursor change), Disabled, Selected states with lemon icons.
  - "Before-and-after example" section: two `.panel` cards side-by-side — "Default" (white marker border) vs "Customized" (lemon marker border) — each with a static colored-circle visual mock. Followed by a CodeBlock css showing how to scope overrides per surface.
- Created `src/components/views/docs-api-view.tsx` (DocsApiView):
  - Breadcrumbs + PageOverline + H1 "API reference" + intro.
  - Search input (`<input type="search">`) with a Search icon, a clear-X button when non-empty, and a hint that filtering is local only. Filters entries by name/description/type/payload/returns/default (case-insensitive substring).
  - For each component in `components`: an `<section>` with the component name as h2, a short description, and an "Open component" button that navigates to the component's `component` route.
  - Entries are built from `meta.methods`, `meta.events`, and `meta.properties` (typed as `ApiEntry` with a `kind` discriminator), then grouped by kind (Methods / Events / Properties) with overline headers. Empty groups are skipped.
  - Each entry is a `.panel` card with: a type badge (Method → lemon border/bg/text; Event → purple-soft border/bg/text; Property → muted border/bg/text), the signature/name in lemon mono, a description, and a metadata row (Returns for methods, Payload for events, Type + Default for properties). A small "Open component" link button on the right.
  - When a search yields no matches for a component, a `.panel` empty-state card is shown instead of the groups.
- Styling discipline across all five files:
  - All five default-export a single named client component (`DocsView`, `DocsInstallationView`, `DocsConceptsView`, `DocsThemingView`, `DocsApiView`), no props, `"use client"` directive at the top.
  - Only accent color used is the brand lemon (`text-brand-lemon` / `bg-brand-lemon` / `border-brand-lemon/40`) plus the secondary purple-soft accent for the Event badge and Troubleshooting icons. No indigo/blue.
  - All code examples go through `CodeBlock` from `@/components/platform/code-block`.
  - All page chrome goes through `Breadcrumbs` + `PageOverline` from `@/components/platform/breadcrumbs` and `PageContainer` from `@/components/platform/shell`.
  - In-app navigation uses `useNavigation((s) => s.navigate)` from `@/store/navigation`; routes are typed via `Route`.
  - Typography follows the requested prose-like hierarchy: h2 `text-2xl font-semibold mt-10`, h3 `text-base font-semibold`, paragraphs `text-sm leading-relaxed text-muted-foreground` capped at `max-w-[720px]`.
  - No emojis, no test files, no shell/header/sidebar/footer duplication, no new routes, no navigation.ts modifications.
- Ran `bun run lint` — 0 errors, 0 warnings on the new files. (The single pre-existing warning is an unused `eslint-disable-next-line` in `color-wheel-picker-react.tsx`, untouched by this task.)
- Checked `dev.log` — server compiles cleanly and serves `/` 200. No new runtime errors introduced by these views.

Stage Summary:
- Five documentation view components are complete and ready to be wired into `page.tsx` by the integration step:
  - `src/components/views/docs-view.tsx` — DocsView (documentation landing)
  - `src/components/views/docs-installation-view.tsx` — DocsInstallationView (installation guide)
  - `src/components/views/docs-concepts-view.tsx` — DocsConceptsView (core concepts)
  - `src/components/views/docs-theming-view.tsx` — DocsThemingView (theming and customization)
  - `src/components/views/docs-api-view.tsx` — DocsApiView (searchable API reference)
- All views share the same shell contract: Breadcrumbs → PageOverline → H1 → intro → page-specific sections, all wrapped in `PageContainer`. They will render correctly inside the existing `PlatformShell` once `page.tsx` switches on the `docs` / `docs-installation` / `docs-concepts` / `docs-theming` / `docs-api` route names.
- No platform primitives, navigation store, or content metadata were modified — the views are pure consumers of the existing API.

---
Task ID: 5-b
Agent: full-stack-developer
Task: Build the Components directory view and the Category overview view

Work Log:
- Read worklog (Tasks 1–3 and the in-flight Task 5-c docs views) to lock the design system, navigation model, content metadata, and the styling conventions other view agents are using (PageContainer width="wide", Breadcrumbs + PageOverline + H1 + intro pattern, `.panel`/`.overline`/`.bg-grid`/`bg-brand-lemon`/`bg-brand-purple-strong` tokens, lemon-only accent — no indigo/blue).
- Read `src/lib/platform/content.ts` to consume `components`, `plannedComponents`, `categories`, `getCategory`, `componentsByCategory`, and the `ComponentStatus` type as the single source of truth for the directory.
- Read `src/store/navigation.ts` to confirm the available route shapes (`{ name: "component", category, slug }`, `{ name: "category", category }`) and the `componentsQuery` / `setComponentsQuery` / `componentsCategory` / `setComponentsCategory` slice the directory needs to bind to.
- Peeked at `examples-view.tsx` to copy the static 36-segment `MiniColorWheel` SVG pattern so directory and category thumbnails stay visually consistent with the rest of the platform (no per-card canvas mount).
- Created `src/components/views/components-view.tsx` (`ComponentsView`, default export, `"use client"`, no props):
  - Breadcrumbs → PageOverline "Components" → H1 "Components" → supporting text "Browse functional UI building blocks for applications and software."
  - Search input bound to `useNavigation((s) => s.componentsQuery)` / `setComponentsQuery`, with a `Search` icon on the left and a conditional clear-`X` button on the right. Filters by name / description / category / tags (case-insensitive substring on a joined haystack).
  - Category pill row (`All`, `Color`, `Inputs`, `Layout`, `Data Display`) bound to `componentsCategory` / `setComponentsCategory`. The active pill uses `bg-brand-purple-strong` with a `bg-brand-lemon` dot indicator.
  - Status filter pills (`Stable` / `Beta` / `Experimental`) using **local** React state — the navigation store doesn't track status, so this transient filter is kept local. Multi-select toggle pills with a lemon-tinted active state.
  - A unified `ALL_ENTRIES` array merges `components` (status from `meta.status`) and `plannedComponents` (status = `"planned"`) so the same filter pipeline handles both. Filtering combines search + category + status; when no status filter is selected, planned entries still pass through so the roadmap stays visible.
  - Result count row: "{available} available · {planned} planned" with a "Reset filters" link that appears when any filter is active.
  - Grid: 1 col mobile / 2 col `sm` / 3 col `lg`. Each card:
    - Preview area (`h-[120px]`, `.bg-grid`, `border-b`): the Color Wheel card shows the `MiniColorWheel` SVG with a real inner triangle (white → #4287f5 → #0a1450 gradient + lemon marker dot); planned cards show a `Boxes` icon + a "Planned" mono label.
    - Body: name (`font-medium`), 2-line description (`line-clamp-2`), and a footer row with the category (mono, muted) + a `StatusBadge` (lemon dot + "Available" for stable, muted dot + "Planned" for planned).
    - Stable card is a `<button>` that `navigate`s to `{ name: "component", category, slug }`; hover state lifts the border to lemon with a `0_0_0_1px` lemon ring. Planned card is a non-interactive `<div>` with `opacity-60` and a "Planned — not yet available" tooltip.
  - Empty state: a dashed `.panel` with "No components match "{query}"" (or "No components match your filters" when no query) + a "Clear search" button that resets query, category, and status filters.
- Created `src/components/views/category-view.tsx` (`CategoryView`, default export, `"use client"`, no props):
  - Defensive guard: reads `useNavigation((s) => s.route)`; if `route.name !== "category"` returns `null`. Falls back to a short "Unknown category" message if `getCategory(route.category)` returns undefined.
  - Header: Breadcrumbs → PageOverline "Category" → a 48px `.panel` icon tile rendered in `text-brand-lemon` (mapped via `CATEGORY_ICONS` from `Palette` / `SlidersHorizontal` / `LayoutPanelLeft` / `Table2`) → H1 with the category name → supporting text = `category.description`.
  - Capabilities row: lemon-dot pills built from `category.capabilities`.
  - Use cases subsection: 2-column list (`grid sm:grid-cols-2`) of `category.useCases`, each with a lemon bullet dot.
  - "Components" section header with a count "{available} available · {planned} planned" and a `border-b` separator.
  - Available components: large horizontal cards (`flex-col lg:flex-row lg:items-center`) with:
    - Left: a 140×120 `.panel` `.bg-grid` thumbnail containing the `MiniColorWheel` SVG (or the category icon as a fallback).
    - Middle: name (`text-lg font-semibold`), description, and a tag row of mono badges.
    - Right: a `StatusBadge` pill + an "Explore component →" affordance with a lemon arrow that translates on hover.
    - The whole card is a `<button>` that navigates to the component detail route; hover lifts the border to lemon.
  - Planned components subsection: a separate muted "Planned" header + a 3-col grid of `.panel opacity-60` cards showing name, description, category, and a "Planned" status badge — non-interactive (no button, `title` tooltip).
  - Guidance card at the bottom: for the `color` category, a detailed "Choosing a color selector" `.panel` with a 2×2 grid of `GuidanceRow` entries explaining wheel+triangle vs wheel+square vs wheel+disk vs wheel-only (none). Other categories get a generic "Choosing a {category} component" `.panel` placeholder noting the category is on the roadmap.
- Styling discipline across both files:
  - Both default-export a single named client component, no props, `"use client"` at the top.
  - Only accent colors used are the brand lemon (`text-brand-lemon` / `bg-brand-lemon` / `border-brand-lemon/40`) plus `bg-brand-purple-strong` for active pills and the inner SVG. No indigo/blue.
  - In-app navigation uses `useNavigation((s) => s.navigate)`; routes are typed via `Route` casts.
  - All chrome comes from `Breadcrumbs` + `PageOverline` (`@/components/platform/breadcrumbs`) and `PageContainer` (`@/components/platform/shell`).
  - `cn` from `@/lib/utils` for conditional classes.
  - No emojis, no test files, no shell/header/sidebar/footer duplication, no new routes, no navigation.ts modifications.
- Ran `bun run lint` — 0 errors. Only the pre-existing `react-hooks/exhaustive-deps` warning in `color-wheel-picker-react.tsx` remains; my two view files are clean. (One initial a11y warning about `aria-disabled` on an `<li>` in the planned-components grid was resolved by removing the redundant attribute — the planned cards have no interactive child, so the disabled semantics are conveyed by the static, low-opacity presentation and the `title` tooltip.)
- Checked `dev.log` — server compiles cleanly (`✓ Compiled in 162ms` / `✓ Compiled in 187ms`) and serves `/` 200. No new runtime errors introduced.

Stage Summary:
- Two view components are complete and ready to be wired into `page.tsx`:
  - `src/components/views/components-view.tsx` — `ComponentsView` (the `/components` directory page with search + category + status filters, a 1/2/3-column card grid, an empty state, and result counts).
  - `src/components/views/category-view.tsx` — `CategoryView` (the `/components/[category]` page with category icon, capabilities, use cases, an available-components list of large horizontal cards, a planned-components subsection, and a "Choosing a color selector" guidance card).
- The Color Wheel Picker is the only stable card; `color-field`, `palette`, and `range-control` appear as planned, muted, non-interactive cards. Search + category + status filters all combine correctly.
- No platform primitives, navigation store, or content metadata were modified — the views are pure consumers of the existing API.

---
Task ID: 5-a
Agent: full-stack-developer
Task: Build the Home view for the Workshop component-library platform

Work Log:
- Read the worklog (Tasks 1–3) to understand the design-system foundation, the vanilla Color Wheel Picker contract, and the platform shell. Confirmed the home route hides the left sidebar (shell.tsx shows sidebar only when route.name !== "home"), so HomeView gets the full content width.
- Inspected globals.css brand tokens (bg-brand-lemon, text-brand-lemon, bg-brand-purple-strong, text-brand-purple-soft, .overline, .panel, .panel-raised, .bg-grid, .hero-glow), the navigation store Route union + navigate(), content.ts (categories / examples / componentsByCategory / plannedComponents), the ColorWheelPickerReact wrapper (mounts the vanilla picker, forwards prop changes via imperative API, forwards input/change events), and CodeBlock (filename + language + copy button).
- Created `src/components/views/home-view.tsx` — a single default-exported client component `HomeView` (no props) rendering six sections in order, each in its own semantic <section> with aria-label and separated by border-b border-border:
  1. Hero — `.hero-glow` + `.bg-grid` background. Left column (lg:col-span-7): overline "Workshop · Vanilla JS UI", large headline "UI components for real software.", supporting copy, two CTAs ("Explore components" → navigate components, lemon primary; "Get started" → navigate docs-installation, outline), and three overline+value stat chips (FRAMEWORK/Independent, INTERACTION/Functional, CUSTOMIZATION/Composable) as small `.panel` tiles. Right column (lg:col-span-5): a workshop-style "library index" card (`.panel-raised`) with a status-dot header (lemon dot + "workshop / library" + "v0.1.0") and a divided list of the four categories with their live status labels — previews the categories section and reads like an inspector panel rather than a marketing graphic.
  2. Featured component — overline "Featured component", title "Color Wheel Picker", the required description line "Color Wheel Picker — Interactive preview · Vanilla JavaScript", a short paragraph, three lemon-dot bullets, and a "Open component" button (→ navigate component/color/color-wheel). Right side: a live, interactive `<ColorWheelPickerReact shape="triangle" size={180} color="#D9FF66" onInput={...} />` mounted inside a `.panel` with `.bg-grid`. Added a small live-hex readout (color swatch + uppercase hex + "live" tag) below the picker so the interactivity is observable — the `color` prop is a constant string so the wrapper never re-calls setColor after mount, avoiding a render feedback loop while `onInput` keeps the readout in sync.
  3. Explore categories — overline "Categories", heading "Explore categories", responsive grid (1 / sm:2 / lg:4). Each card is a button mapping the category's `icon` string field to a Lucide component via a `CATEGORY_ICONS` lookup ({Palette, SlidersHorizontal, LayoutPanelLeft, Table2}); shows icon tile, name, description (line-clamp-3), and an honest `categoryStatus()` label ("1 ready · 2 planned" / "1 ready" / "N planned" / "Coming soon") computed from componentsByCategory + plannedComponents so empty categories don't advertise a fake count. Clicking navigates to { name: "category", category: cat.slug }.
  4. Why this library — overline "Principles", heading "Why this library", three benefit cards (Boxes/"Framework independent", Wrench/"Application-focused", Layers/"Composable & themeable") each with a lemon icon tile and a concise description grounded in the PRD positioning (no React/Vue/Next.js inside components; built for editors/inspectors/dev tools, not marketing; themeable via CSS variables).
  5. Quick start — overline "Quick start", heading "Get going in seconds", short intro, two stacked CodeBlocks in a lg:2-col grid: (1) bash install `npm install @workshop/color-wheel`, (2) javascript usage importing ColorWheelPicker, constructing it with { shape: "triangle", size: 180 }, and subscribing to "change". A "Read the docs" outline button below → navigate docs-installation.
  6. Featured examples — overline "Examples", heading "Featured examples", responsive md:3-col grid of all three examples from content.ts. Each card: category badge (mono pill), title, description, and a lemon "Explore" link → navigate { name: "example", slug: ex.slug }.
- Visual style: obsidian background with deep-violet panels and lemon accents only — no indigo or blue anywhere. Hover states are subtle background/border shifts (hover:border-brand-lemon/40, hover:bg-accent/40) — no scale transforms. Generous vertical rhythm (py-16 lg:py-24 between sections; py-20 lg:py-28 on the hero). Mobile-first: single column, stacking to 2/4 columns at sm/lg breakpoints. All interactive elements are real <button>s with focus-visible rings.
- Verified: `bun run lint` — 0 errors, 0 warnings in home-view.tsx (the only lint warning is a pre-existing unused eslint-disable in color-wheel-picker-react.tsx). `bunx tsc --noEmit` — no type errors in home-view.tsx (the only TS errors are pre-existing and in unrelated files: examples/, skills/, brand.tsx). Dev server log shows clean compiles and GET / 200.
- Did NOT touch page.tsx, navigation.ts, the shell, or any other file. HomeView is a pure view component ready to be rendered by the parent page.tsx route switch (parent task).

Stage Summary:
- Home view is complete at `src/components/views/home-view.tsx` (single default export `HomeView`, client component, no props).
- All six required sections implemented with the specified copy, CTAs, navigation targets, live interactive Color Wheel Picker, CodeBlocks, and category/example cards.
- Brand-consistent (obsidian + deep violet + lemon; no indigo/blue), responsive (1/2/4 column grids), accessible (semantic sections, aria-labels, focus rings, keyboard-accessible buttons), and workshop-toned (inspector-style hero panel, honest status counts, no marketing exaggeration).
- Ready for the parent page.tsx to import and render HomeView when route.name === "home".

---
Task ID: 5-d
Agent: full-stack-developer
Task: Build Examples + Resources + Changelog + Contributing view components

Work Log:
- Read worklog (Tasks 1–3 + Task 5-b sibling-agent record) and the existing `components-view.tsx` to lock visual conventions (Breadcrumbs + PageOverline + PageContainer + lemon filter pills + static `MiniColorWheel` SVG preview).
- Created `src/components/views/examples-view.tsx` — `ExamplesView`:
  - Breadcrumbs + `PageOverline "Examples"` + H1 + intro.
  - Local-state filter row: All examples / Creative tools / Developer tools / Productivity.
  - Grid: 1 col mobile / 2 col tablet / 3 col desktop. Each card is a single button that navigates to `{ name: "example", slug }`.
  - Card preview = static `MiniColorWheel` SVG on a `.bg-grid` background, with a "Live" lemon-dot badge on interactive examples.
  - Empty state with "Show all examples" reset button.
- Created `src/components/views/example-detail-view.tsx` — `ExampleDetailView`:
  - Reads slug via `useNavigation((s) => s.route)`; if not found, renders a not-found message with a "Back to examples" link.
  - Breadcrumbs (Home / Examples / Example title) + `PageOverline "Examples / {category}"` + H1 + description.
  - Three REAL interactive demos keyed by slug:
    - `creative-inspector`: mock inspector left panel ("Selected object: Shape 01", Fill color swatch + hex, stroke row) and a right panel with `<ColorWheelPickerReact shape="triangle" size={160} />` whose `onInput` updates the fill swatch + hex.
    - `settings-panel`: mock Appearance rows (Theme color / Density / Font size / Reduce motion) with a live swatch + `<ColorWheelPickerReact shape="square" size={140} />`.
    - `theme-editor`: three preview surfaces (Button / Surface / Border) driven by the accent color + `<ColorWheelPickerReact shape="disk" size={140} />`.
  - Each demo has a "Reset" button (in the panel header) that resets local state and remounts the picker via a `key` bump.
  - "Components used" section: for each slug in `example.components`, render a card linking to the component page via `navigate({ name: "component", category, slug })`.
  - "Implementation" section: a `CodeBlock` per example with a short JS snippet showing the wiring.
  - Footer: "All examples" back button + slug mono label.
- Created `src/components/views/resources-view.tsx` — `ResourcesView`:
  - Local `RESOURCES` array (6 entries: Color model primer, Keyboard accessibility for canvas components, Embedding vanilla in React, Embedding vanilla in Vue, Building a property inspector, Design tokens and CSS architecture).
  - Each entry has a type (Recipes / Accessibility / Guides / Integration), a title, description, and a destination — internal nav (`docs-concepts`, `docs-theming`, `docs-installation`, `docs-api`, `examples`) or external link with `ExternalLink` icon.
  - Filter pills (All / Recipes / Accessibility / Guides / Integration) drive the visible cards.
  - Cards: icon by type, title, 2-line description, destination link with arrow.
  - Empty state with "Show all resources" reset.
- Created `src/components/views/changelog-view.tsx` — `ChangelogView`:
  - Reverse-chronological timeline from the real `changelog` array (sorted by date desc). One release card per entry.
  - Filter pills (All / Added / Improved / Fixed / Breaking) hide entries/subsections with no matching change type.
  - Each release card: version (font-mono, large) + formatted date. Subsections grouped by change type; only non-empty ones render.
  - Each change item gets a small colored dot: Added = lemon, Improved = brand-purple-soft, Fixed = muted sky (`bg-sky-400`), Breaking = destructive. (Sky is a muted semantic blue, used sparingly per spec; lemon/purple dominate.)
  - Breaking sections render inside a destructive-tinted callout (`border-destructive/30 bg-destructive/5`).
  - Vertical timeline: `<ol>` with `border-l border-border` and a per-entry lemon dot pinned to the left border.
  - Header includes a small count summary (N releases · M changes total).
  - Empty state for filters that match nothing.
- Created `src/components/views/contributing-view.tsx` — `ContributingView`:
  - Breadcrumbs + `PageOverline "Project"` + H1 + intro.
  - Two-column layout: main content (8 sections) + sticky right-rail TOC.
  - TOC uses `IntersectionObserver` to highlight the active section as you scroll; numbered list with lemon active state.
  - Sections (each h2 with a Lucide icon chip): Contribution overview, Component design principles (8 cards), Public API conventions (with `CodeBlock` showing the constructor + options + on/off + destroy pattern), Accessibility requirements (4-item bulleted list with lemon dots), Testing expectations, Documentation requirements, Issue reporting (external GitHub link), Pull request workflow (6-step numbered list).
  - Icons next to headings: ListChecks, GitBranch, FileCode, Accessibility, Bug, GitPullRequest.
- Verified with `bun run lint` (0 errors / 0 warnings in new files; one pre-existing warning in `color-wheel-picker-react.tsx`) and `bunx tsc --noEmit` (no errors in any view file; remaining errors are pre-existing in `examples/`, `skills/`, `brand.tsx`). Dev server log shows clean compiles after edits.

Stage Summary:
- All five view components are complete, default-exported, client components, take no props, and live in `src/components/views/`. They use the existing design system (brand tokens, `.overline`, `.panel`, `.bg-grid`, `PageContainer`, `Breadcrumbs`, `PageOverline`, `CodeBlock`) and `useNavigation` for in-app navigation. No new routes, no navigation.ts edits, no shell duplication, no indigo/blue primary, no emojis, no test files.
- File paths created:
  - `src/components/views/examples-view.tsx`
  - `src/components/views/example-detail-view.tsx`
  - `src/components/views/resources-view.tsx`
  - `src/components/views/changelog-view.tsx`
  - `src/components/views/contributing-view.tsx`
- Work record also written to `/agent-ctx/5-d-views.md`.
- Next: the main agent can wire these (plus the sibling agents' home/components/category/docs views) into `src/app/page.tsx` by switching on `route.name` and rendering the matching view inside `PlatformShell`.

---
Task ID: 7+8
Agent: main
Task: Wire all views into main page, fix mobile overflow, Agent Browser verification

Work Log:
- Created src/app/page.tsx: RouteSwitcher that switches on useNavigation().route.name and renders the appropriate view inside PlatformShell. Used default imports for all 13 view components. Added a NotFoundView fallback and a routeKey() so each navigation remounts the view cleanly.
- Fixed src/components/platform/brand.tsx: replaced invalid `strokeClassName` SVG attribute with an inline `style` using the CSS variable.
- Fixed mobile horizontal overflow (113px) on the home page: added `min-w-0` to the Quick Start grid children and to the CodeBlock root container so code blocks scroll internally instead of expanding the layout.
- Removed an unused eslint-disable directive in color-wheel-picker-react.tsx.
- Agent Browser verification (desktop 1440×900 + mobile 390×844):
  - Home page: renders all 6 sections (hero, featured live Color Wheel Picker, categories, why-this-library, quick start, featured examples). The live picker mounted with proper ARIA application role.
  - Navigation: Components / Documentation / Examples / Resources header links all work; sidebar expands/collapses; breadcrumbs render correctly.
  - Color Wheel playground: live canvas renders, property inspector (shape segmented control + size/thickness/spacing sliders + hex input) all functional, output panel shows correct HEX/RGB/HSV/HSL, code tabs (JS/HTML/CSS/API) render, documentation section with properties/methods/events tables renders. Switching shape preserves the selected color (per PRD §4.2).
  - Search palette (⌘K): opens, filters results live, arrow-key navigation works, Enter navigates to the selected result, Esc closes.
  - Theming docs page: renders all sections including the --color-picker-* customization points table.
  - Components directory: shows the Color Wheel card (AVAILABLE) + 3 planned cards (muted, non-interactive).
  - Mobile: hamburger menu opens a slide-in drawer; no horizontal overflow; content stacks correctly.
  - Footer: sticks to bottom on short pages, pushed down naturally on long pages.
  - No console errors on any tested route.
- `bun run lint` — 0 errors, 0 warnings.

Stage Summary:
- The platform is complete and browser-verified. Every primary user flow works: discover (home/directory), explore (live playground with real vanilla JS Color Wheel Picker), and implement (code tabs + API docs + installation guide).
- The Color Wheel Picker is a real, framework-independent vanilla JS/TS component (canvas-based, 4 shapes, full public API, keyboard support, destroy cleanup) — not a visual imitation.
- Design system matches the spec: Obsidian #101014 + Deep Violet #211A30 + Lemon Signal #D9FF66, Inter + JetBrains Mono, Lucide icons, dark theme default with light toggle.
- Single `/` route with client-side Zustand navigation simulates all 14 routes from the Architecture spec.

---
Task ID: 9 (fix session)
Agent: main
Task: Fix color wheel rendering, wheel thickness/spacing, add rotateShape, fix hydration mismatch, fix overline text decoration

Work Log:
- **Color wheel rendering fix**: The triangle and disk renderers used `putImageData` which ignores the canvas transform (dpr scaling), causing misplacement and blur on high-DPI displays. Also, the triangle's anti-aliasing formula `aa = min(1, coverage + 0.5)` was broken because `min(α,β,γ)` maxes at 1/3 for triangles, so interior pixels only reached 83% opacity — making the triangle look faint/transparent. Fixed by:
  - Rewrote `drawBarycentric` to use 2×2 supersampling (sample 4 sub-pixels per output pixel, average the results) — interior pixels now get full opacity (alpha=255), edges get smooth AA.
  - Both `drawBarycentric` and `drawDiskTo` now render at device resolution into a temp offscreen canvas, then composite via `drawImage` (which respects the dpr transform) instead of `putImageData` (which ignores it).
  - Increased disk center threshold from `dist < 0.5` to `dist < 1.5` to prevent a dark spot at the center.
- **Wheel thickness/spacing fix**: The React wrapper only forwarded `shape`, `size`, `hue`, `color` via imperative setters — `wheelThickness` and `wheelSpacing` were passed to the constructor but never updated after mount. Added `setWheelThickness(n)` and `setWheelSpacing(n)` methods to the vanilla class (both call `updateCanvasSize` + invalidate caches + schedule render), and added corresponding `useEffect` hooks in the React wrapper.
- **rotateShape option added** (PRD §4.4 "Rotating hue representation"): Added `rotateShape?: boolean` to `ColorPickerOptions`. When true, the triangle's pure-hue vertex (B) tracks the current hue position on the wheel. Implementation:
  - Added `getShapeRotation()` method: returns `hueRad - 120°` (B's default angular position is 120° clockwise from top).
  - Added `rotatePoint()` helper function for 2D rotation around a center.
  - `drawTriangleTo` now accepts a rotation parameter and rotates all three vertices.
  - `getInnerMarkerPosition` applies the same rotation to the triangle marker.
  - `updateInnerFromPoint` (pointer interaction) un-rotates the pointer point before computing barycentric coordinates.
  - Inner cache key includes the rotation so the cache invalidates on hue change when rotateShape is on.
  - Added `setRotateShape(bool)` method and React wrapper forwarding.
  - Added a toggle switch in the playground property inspector; updated generated JS code and API docs.
- **Hydration mismatch fix**: The `ThemeToggle` component's `aria-label` depended on `isDark` which was `false` during SSR (useTheme returns undefined) but `true` on the client (after next-themes resolves) — causing a hydration mismatch on the button's aria-label. Fixed by using a static `aria-label="Toggle color theme"` that never depends on theme state, and reading the actual theme from `document.documentElement.classList` in a `useEffect` after mount. Also removed `className="dark"` from `<html>` in layout.tsx (let next-themes handle it via its inline script).
- **Overline text decoration fix**: The custom `.overline` CSS class conflicted with Tailwind's built-in `overline` utility (`text-decoration-line: overline` — a line ABOVE the text). This caused all small uppercase labels to have an unwanted line above them. Renamed the class from `.overline` to `.eyebrow` in globals.css and updated all 30+ usages across the codebase via sed. Verified via `getComputedStyle` that `.eyebrow` elements now have `text-decoration-line: none`.
- Updated content metadata to include `rotateShape` in the properties table and `setWheelThickness`, `setWheelSpacing`, `setRotateShape` in the methods table.
- Updated the playground's generated API code to include the new methods and the `rotateShape` option.

Stage Summary:
- All four shapes (triangle, square, disk, none) now render correctly with fully opaque interiors, smooth AA edges, and correct HSV color gradients. Verified via pixel sampling and VLM screenshot analysis.
- The hue wheel is a complete rainbow ring (verified at 8 angular positions: red→yellow→green→cyan→blue→purple→magenta).
- Wheel thickness and spacing sliders now update the canvas size live (verified: thickness 24→40 resized canvas from 244→276px).
- The rotateShape toggle works: when enabled, the triangle rotates so its pure-hue vertex tracks the wheel hue.
- No hydration errors (console grep for "error|hydrat|mismatch" returns 0).
- No text decoration lines on eyebrow labels (getComputedStyle confirms `text-decoration-line: none`).
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 10 (fix session 2)
Agent: main
Task: Fix three rendering issues: smooth wheel, disk distribution, rotateShape for square/disk

Work Log:
- **Smooth hue wheel (conic gradient)**: Replaced the 360 one-degree arc segments in `drawWheelTo` with `ctx.createConicGradient()` — a native canvas API that produces a perfectly smooth, seamless hue transition with zero visible segment boundaries. The conic gradient starts at -π/2 (top, red=0°) and goes clockwise, with 24 color stops every 15°. Fills the annulus via even-odd fill rule. Added a fallback to 720 half-degree segments for browsers without ConicGradient support. Verified: pixel sampling at 0.25° intervals shows smooth RGB transitions (255,1,0 → 255,4,0 → 255,5,0 → 255,8,0) with no hard steps at former 1° boundaries.
- **Disk as clipped square gradient (not radial)**: Completely rewrote `drawDiskTo` — the old polar mapping (r→saturation, θ→value) radiated colors from the center, creating a sharp central point and a visually different distribution from the square/triangle. The new implementation draws the exact same saturation×value gradient as the square (pure hue base → white-to-transparent horizontal → transparent-to-black vertical), clipped to a circle via `ctx.clip()`. Uses the circumscribing square (side = 2·innerR) so the gradient covers the full circle. The center now shows a smooth mid-tone (S=0.5, V=0.5) instead of a sharp white point. Verified by pixel sampling: center=rgb(63,88,127) with gradual transitions to nearby pixels (no discontinuity). VLM confirms: "square-like 2D gradient clipped to a circle, NOT radiating from center, no sharp center point."
- **rotateShape extended to square and disk**: Updated `getShapeRotation()` to return a non-zero rotation for all three shapes (previously only triangle). For triangle: pure-hue vertex B (120° default) → `hue - 120°`. For square and disk: pure-hue edge (right side, 90° default) → `hue - 90°`. Updated `drawSquareTo` and `drawDiskTo` to accept a rotation parameter and apply it via canvas transform (`translate→rotate→translate`). Updated `getInnerMarkerPosition` for both square and disk to apply rotation. Updated `updateInnerFromPoint` for both square and disk to un-rotate the pointer point before computing SV coordinates. Verified: with hue=0° (red) + rotateShape on, the square/disk's pure-hue edge rotates from right to top, the bright-red corner moves to top-left (315°), and the black edge moves from bottom to right — confirmed by both pixel sampling and VLM analysis.
- Cleaned up: removed the `diskTheta` field and all its references (constructor, setColor, marker position, pointer interaction) since the disk no longer uses polar mapping. Updated the header documentation comment for the disk mapping.

Stage Summary:
- All three rendering issues fixed and VLM-verified:
  1. ✅ Wheel is now perfectly smooth (conic gradient, no dashes/slices)
  2. ✅ Disk has flat 2D SV gradient (same as square), no sharp center point, no radial pattern
  3. ✅ Square and disk rotate with the hue when rotateShape is enabled (in addition to triangle)
- `bun run lint` — 0 errors, 0 warnings.
- The disk's color distribution now matches the square: white on the left (S=0), pure hue on the right (S=1), black at the bottom (V=0), bright at the top (V=1) — just with a circular boundary instead of square.

---
Task ID: 11 (fix session 3)
Agent: main
Task: Fix square/disk rotation to align pure-hue corner; move outputs to live canvas

Work Log:
- **Rotation alignment fix**: Changed `getShapeRotation()` for square and disk from `hue - 90°` to `hue - 45°`. Previously the square/disk rotated by their right-edge center (90°, which is S=1 V=0.5 — not pure hue). Now they rotate by their pure-hue corner (top-right, S=1 V=1, at 45° clockwise from top), so the pure-hue corner points toward the wheel hue thumb — exactly matching how the triangle's pure-hue vertex B tracks the hue. Verified: with hue=0° (red, top of wheel) + rotateShape on, the brightest/most-saturated red (rgb(203,41,41) for square, rgb(186,50,50) for disk) appears at the TOP of the inner shape, aligned with the wheel hue marker. All three shapes now rotate by their hue-representing corner/vertex toward the wheel thumb.
- **Output layout restructure**: 
  - Removed the 4-cell output bar (HEX/RGB/HSV/HSL read-only cells) from the bottom of the live canvas.
  - Added a proper "Output" section inside the live canvas panel (below the canvas, above the panel border): includes an "OUTPUT" eyebrow label, a color swatch + current HEX display, and a responsive 2×2 / 1×4 grid of CopyableValue chips (HEX/RGB/HSV/HSL) with copy-to-clipboard.
  - Removed the "Output" section from the Properties panel (it previously sat at the bottom with `mt-auto`).
  - Removed the now-unused `OutputCell` helper component.
  - Verified via DOM inspection: Properties panel no longer contains "Output"; live canvas panel does contain "Output". VLM confirms the layout is correct — the Properties panel is now a clean props-only inspector, and all color outputs are consolidated in the live canvas.

Stage Summary:
- All three shapes (triangle, square, disk) now rotate by their pure-hue corner/vertex toward the wheel hue thumb when rotateShape is enabled.
- All color outputs (HEX/RGB/HSV/HSL + swatch) are now consolidated in the live canvas panel; the Properties panel contains only configuration controls.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 12 (fix session 4)
Agent: main
Task: Click-to-copy overlay + new Color Range component

Work Log:
- **CopyableValue overlay effect**: Rewrote the `CopyableValue` component in `src/components/platform/code-block.tsx`:
  - Removed the persistent copy icon (the `Copy`/`Check` lucide icon that sat at the right of each chip).
  - The whole chip is now the click target — no separate button.
  - On click, a green overlay (bg-emerald-600) slides up from the bottom (`translate-y-full → translate-y-0`) with a white checkmark icon and "Copied" text. Fades back after 1100ms.
  - Fixed the clipboard handler to always show the overlay even if `navigator.clipboard.writeText` fails (added a `document.execCommand('copy')` fallback and moved `setCopied(true)` outside the try/catch). Previously, in headless/non-secure contexts, the clipboard API would throw and the overlay never appeared.
  - VLM-verified: the green "Copied" overlay is visible on the clicked chip, the other 3 chips remain in their normal state, and no copy icon button is present.
- **New Color Range component** (`src/lib/components/color-range/`):
  - `color-range.ts`: A vanilla TypeScript 1D color slider with 4 modes:
    - **hue**: 0–360°, full spectrum gradient (smooth, via canvas linear gradient with 24 stops)
    - **lightness**: 0–100%, black → base color → white
    - **contrast**: 0–100%, base color mixed toward black (0) or white (100)
    - **alpha**: 0–1, transparent → opaque over a checkerboard pattern
  - Parameters: `mode`, `value`, `color` (base color for non-hue modes), `orientation` (horizontal/vertical), `thickness` (6–48px), `length` (80–420px).
  - Canvas-based rendering with rounded-rect clip, cached track canvas, and a draggable capsule thumb (white halo + dark border).
  - Full public API: `getValue`, `getValueOutput`, `setValue`, `setMode`, `setColor`, `setOrientation`, `setThickness`, `setLength`, `on/off`, `destroy`.
  - Pointer interaction with pointer capture; keyboard support (arrows ±1, Shift=±10, Home/End).
  - ARIA: role="slider", aria-valuenow/min/max/text.
  - Self-contained color math (parseHex, hsvToRgb, rgbToHsv) — no dependency on the color-wheel component.
  - `index.ts`: barrel re-export.
- **React wrapper** (`src/components/color-range/color-range-react.tsx`): Owns the instance, forwards prop changes via imperative API, forwards input/change events via refs.
- **Playground view** (`src/components/color-range/color-range-playground.tsx`): Full playground with live canvas, property inspector (mode 2×2 grid, orientation toggle, thickness/length sliders, base color input), output section (mode + value + label chips with click-to-copy), code panel (JS/HTML/CSS/API tabs with live-synced code), and documentation section (properties/methods/events/accessibility tables).
- **Content metadata**: Added the color-range component to `src/lib/platform/content.ts` with full properties, methods, events, defaults, whenToUse/whenNotToUse.
- **Routing**: Updated `src/app/page.tsx` to route `component/color/color-range` to the `ColorRangePlayground`.
- Fixed icon import: `Transparency` and `BlendingMode` don't exist in lucide-react; used `Blend` for the alpha mode icon.

Stage Summary:
- CopyableValue chips now have no copy icon; clicking any chip shows a green "Copied" overlay with a checkmark (micro effect, 1.1s).
- New Color Range component established with 4 modes (hue/lightness/contrast/alpha), configurable orientation/thickness/length, full public API, keyboard support, and a complete playground.
- The component appears in the sidebar under Color → Color Range, and in the Components directory.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 13 (fix session 5)
Agent: main
Task: Fix output section height, color range result color, vertical mode

Work Log:
- **Color wheel output section height fix**: The CopyableValue chips could expand vertically when their text content (e.g. "rgb(66, 135, 245)") wrapped to a second line, causing the output section to grow inconsistently and confuse users. Fixed by:
  - Setting a fixed `h-9` (36px) height on every chip.
  - Making the label `shrink-0` so it never compresses.
  - Making the value `truncate` so long text is clipped with an ellipsis instead of wrapping.
  - Changed `inline-flex` to `inline-flex h-9 items-center` with `gap-1.5` and removed `py-1.5` (the fixed height handles vertical sizing).
  - Verified: all 4 chips (HEX, RGB, HSV, HSL) now render at exactly 36px height in a single row, no expansion. VLM confirms uniform heights with aligned top/bottom edges.
- **Color range result color (shared color object)**: All four modes (hue, lightness, contrast, alpha) now process the same base color and produce a concrete result color visible to the user.
  - Added `ColorRangeResultColor` interface: `{ hex, rgba, r, g, b, a }`.
  - Added `getResultColor()` public method to the `ColorRange` class.
  - Added `computeResultColor(mode, value, baseRgb, baseHsv)` module helper:
    - **hue**: `hsvToRgb(value, baseHsv.s, baseHsv.v)` — replaces hue, keeps base S/V.
    - **lightness/contrast**: mixes black → base (at 50) → white. value≤50: `base * (value/50)`. value>50: `base + (255-base) * ((value-50)/50)`.
    - **alpha**: `rgba(baseRgb, value)` — base color with alpha applied.
  - Included `color: ColorRangeResultColor` in `ColorRangeValueOutput` so every `input`/`change` event carries the result color.
  - Updated the playground output section to show the result color prominently: a color swatch (with checkerboard for alpha mode), the HEX value, and 4 copyable chips (HEX, RGBA, Value, Mode).
  - Verified: hue=5° → result #f55142 (red with base S/V). lightness=50% → result #4287f5 (base color). alpha=1.0 → rgba(66,135,245,1). All modes produce visible, correct result colors.
- **Vertical mode fix**: The `drawTrackTo` method drew the track rectangle as `roundRect(tx, ty, tLen, tThick, r)` for both orientations — for vertical this produced a horizontal track (width=length, height=thickness) with a vertical gradient, which was visually broken. Fixed by computing `trackW` and `trackH` based on orientation: horizontal → `(tLen, tThick)`, vertical → `(tThick, tLen)`. Applied the same fix to the `fillRect`, the clip path, and the border stroke. Also fixed the thumb dimensions for vertical: swapped `thumbW`/`thumbH` so the thumb is wide (spans thickness) and short (along track axis) in vertical mode, and used `Math.min(thumbW, thumbH)/2` for the corner radius to handle both orientations. Verified: vertical hue track now renders a proper tall narrow bar with the rainbow gradient running top-to-bottom; vertical alpha track shows checkerboard + gradient correctly.

Stage Summary:
- Color wheel output chips: fixed height (36px), truncated text, no expansion.
- Color range: all 4 modes now produce a visible result color derived from the same base color; output shows swatch + HEX + RGBA + value + mode.
- Color range vertical mode: track and thumb now render correctly for vertical orientation.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 14
Agent: main
Task: Build Color Circle component with harmony modes + snapping grid (dots/lines)

Work Log:
- **Vanilla JS ColorCircle component** (`src/lib/components/color-circle/color-circle.ts`):
  - Full circular disk filled with a smooth conic hue gradient (cached, createConicGradient with 24 stops).
  - 8 harmony schemas: none, complementary [0,180], analogous [-30,0,30], triadic [0,120,240], tetradic [0,60,180,240], split-complementary [0,150,210], square [0,90,180,270], monochromatic [0]. Exported as `HARMONY_SCHEMAS`.
  - Harmony markers: dots on the circumference at each harmony hue, connected by link lines (polygon). Base hue marker has a lemon accent ring.
  - Snapping grid with two visualization modes using the SAME snap points:
    - `dots`: small semi-transparent dots on the circumference at each division.
    - `lines`: radial lines from center to circumference at each division.
    - Both use `gridDivisions` (e.g. 12 = every 30°). When snapping is on, dragging snaps the base hue to the nearest grid point.
  - Public API: getBaseHue, setBaseHue, getHarmony, setHarmony, setSnapping, setGridMode, setGridDivisions, setShowHarmonyLinks, getOutput, on/off, destroy.
  - Output includes `{ baseHue, harmony, hues[], colors[] }` where colors are full HSV (S=100, V=100) for each harmony hue.
  - setHarmony emits input+change events so listeners update when the harmony changes (not just when the user drags).
  - Pointer + keyboard interaction (arrows ±1°, Shift=15°, Home/End). ARIA slider role.
  - Self-contained color math (hsvToRgb, rgbToHex) — no external deps.
- **React wrapper** (`src/components/color-circle/color-circle-react.tsx`): owns the instance, forwards all props via imperative API.
- **Playground** (`src/components/color-circle/color-circle-playground.tsx`): full playground with:
  - Live canvas (the circular disk)
  - Property inspector: harmony 4×2 grid, snapping toggle, grid mode (dots/lines, only shown when snapping on), grid divisions slider, harmony links toggle, size slider
  - Output section: harmony palette swatches (color + hex + hue°) + copyable chips (Base, Hues, Harmony, Count)
  - Code panel (JS/HTML/CSS/API tabs with live-synced code)
  - Documentation section with harmony schemas table
- **Content metadata**: added color-circle to `src/lib/platform/content.ts` with full properties, methods, events, defaults.
- **Routing**: added `component/color/color-circle` → `ColorCirclePlayground` in `src/app/page.tsx`.
- Fixed icon import: `MagnetOff` doesn't exist in lucide-react; used `Magnet` for both states with different styling.

Stage Summary:
- New Color Circle component established with 8 harmony modes and snapping grid (dots/lines visualization of the same snap points).
- VLM-verified: rainbow disk renders correctly, harmony markers + links visible, dots grid shows 12 dots on circumference at 30° intervals, lines grid shows 12 radial lines from center at the same 30° intervals.
- Component appears in sidebar (Color → Color Circle) and Components directory.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 15 (fix session 6)
Agent: main
Task: Fix thumb clipping + redesign color circle grid inside + 2D marker dragging

Work Log:
- **Thumb clipping fix (color wheel + color circle)**: Both components had `border-radius: 50%` on their canvas CSS, which clipped markers that sat on the edge of the circle. Removed the `border-radius: 50%` from both `.color-wheel-picker canvas` and `.color-circle canvas`. The disk/wheel are already drawn as circles via `ctx.arc`, so the border-radius was only causing clipping, not contributing to the visual. VLM confirms: color wheel markers are now fully round and unclipped.
- **Color circle redesigned for 2D interaction**: The previous Color Circle locked markers to the circumference (1D hue selection only). Redesigned it so markers can be dragged to any position INSIDE the circle:
  - Each harmony marker now has a `saturation` (0–1, default 1.0 = on the edge). The marker's position is: angle = hue, radius = saturation × r.
  - Pointer down finds the nearest marker (within 24px threshold, defaults to base marker) and grabs it. Drag updates the marker's hue (from angle) and saturation (from distance/radius).
  - When snapping is on, both hue snaps to angular divisions AND saturation snaps to the nearest ring (1/(GRID_RINGS+1) increments).
  - Output now includes `saturations[]` and each color's HSV reflects the marker's saturation.
  - `setHarmony` resets marker saturations to 1.0 for the new schema.
- **Polar grid drawn INSIDE the circle**: The previous grid only had dots/lines on the circumference. Redesigned `renderGrid()` to draw a full polar grid inside:
  - 3 concentric rings at 1/4, 1/2, 3/4 of the radius (GRID_RINGS = 3)
  - Angular divisions = `gridDivisions` (default 12 = every 30°)
  - **Dots mode**: dots at each (ring, angle) intersection + center dot + edge dots = ~49 dots forming a polar grid
  - **Lines mode**: concentric circles (rings) + radial lines from center to edge = spider-web polar grid
  - Lines mode uses dual-stroke (dark 3px outline + white 1.5px line) for contrast against any rainbow hue. VLM confirms: 3 rings + 12 radial lines = 48 snap cells visible.
- **Canvas padding for markers**: Added 14px padding to the Color Circle canvas so markers at the edge (saturation=1) aren't clipped by the canvas bounds. The disk is drawn centered within the larger canvas.
- VLM-verified all fixes:
  - Color wheel: markers fully visible, not clipped ✅
  - Color circle dots mode: polar grid of dots at multiple radii inside ✅
  - Color circle lines mode: 3 concentric rings + 12 radial lines (spider-web) inside ✅
  - Harmony markers draggable inside the circle ✅
  - Markers not clipped ✅

Stage Summary:
- Color wheel and color circle thumbs are no longer clipped (removed border-radius).
- Color circle now has a polar grid drawn INSIDE the circle (not just on the edge): dots at ring/angle intersections or rings+lines forming a spider-web.
- Color circle markers are draggable to any position inside the circle (2D: hue by angle, saturation by radius), not just on the edge.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 16 (fix session 7)
Agent: main
Task: Grid divisions include rings + white center via saturation gradient

Work Log:
- **Grid divisions now include rings**: The `gridDivisions` property previously only controlled the angular divisions (radial spokes). The ring count was a hardcoded constant (GRID_RINGS = 3). Replaced with `ringCountFromDivisions(divisions)` which derives the ring count from `gridDivisions` (~half the angular count, e.g. 12 → 5 rings, 24 → 11 rings). Now `gridDivisions` controls BOTH the angular AND radial resolution of the polar grid. Updated `renderGrid()` (dots and lines modes) and the saturation snapping logic to use the derived ring count. VLM confirms: with gridDivisions=12, 5 concentric rings + 12 radial lines are visible.
- **White center via saturation gradient**: The disk previously used only a conic hue gradient with S=100, V=100 everywhere — so the center was a fully saturated hue (not white). Added a radial saturation gradient overlay on top of the conic hue gradient: `createRadialGradient(cx, cy, 0, cx, cy, r)` with stops `rgba(255,255,255,1)` at center → `rgba(255,255,255,0)` at edge. This makes the center blend to white (S=0) while the edge keeps full saturation (S=1), matching HSV saturation semantics where radius → saturation. Pixel-verified: center = rgb(253,255,253) (white), 1/4 out = rgb(255,193,192) (light pink), 1/2 = rgb(255,129,128) (mid red), 3/4 = rgb(255,65,65) (bright red), edge = rgb(208,1,0) (pure red). VLM confirms: center is white, smooth transition to saturated edge.

Stage Summary:
- `gridDivisions` now controls both angular divisions (radial lines/spokes) and radial divisions (concentric rings). Higher divisions → more rings.
- Color circle center is now white via a radial saturation gradient overlay; the edge retains full saturation. Smooth blend confirmed by pixel sampling and VLM.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 17
Agent: main
Task: Fix size parameter + Adobe Color-style base color + add/remove colors

Work Log:
- **Size parameter fix**: The ColorCircle class was missing a `setSize()` method. The React wrapper had no effect to forward the `size` prop. Added `setSize(n)` to the class (updates options, resizes canvas, invalidates disk cache, re-renders) and added `React.useEffect(() => { ref.current?.setSize(size); }, [size])` to the wrapper. Verified: changing the size slider from 240 to 320 resizes the canvas from 272px to 352px (320 + 32 padding).
- **Complete ColorCircle redesign with Adobe Color-style base color concept**:
  - Replaced the old `baseHue + markerSat[]` model with a `colors: ColorEntry[]` array where each entry has `{ id, hue, saturation, isBase, offset }`.
  - **Base color drives the palette**: When the base color is dragged, ALL other colors shift by the same hue delta (maintaining their offsets). Verified: dragging base from 210° to 0° shifted all triadic colors correctly (base→red, others→green and blue, maintaining 120° offsets).
  - **Non-base colors move individually**: When a non-base color is dragged, only that color's hue+saturation changes; its offset from the base is recalculated. This lets users "break" a color from the harmony.
  - **setBaseIndex(i)**: Promotes any color to be the base. All offsets are recalculated relative to the new base. The base marker gets a lemon-green accent ring and a "Base" badge in the palette.
  - **addColor(hue?, saturation?)**: Adds a new color at a position (default: baseHue + 30°). Returns the new index.
  - **removeColor(i)**: Removes a color (can't remove the last one; if the base is removed, the first remaining color becomes the base).
  - Markers are numbered (1, 2, 3...) so users can identify them.
  - Harmony links connect all markers with a polygon.
- **Playground redesign with full palette management UI**:
  - Palette section in the live canvas showing color cards: each has a swatch, hex value, hue/saturation/offset info, a "Base" badge (for the base), a crown button (set as base), and an X button (remove).
  - "Add color" button in the palette header.
  - The properties panel has all the same controls (harmony, snapping, grid, links, size).
  - Initial state is emitted on mount so the palette shows immediately.
- VLM-verified all features: circular wheel with white center, 3 numbered markers with lemon-green base ring, palette cards with Base badge + crown/X buttons, Add color button, Size slider all present and correct.

Stage Summary:
- Size parameter now works (setSize method + React effect forwarding).
- ColorCircle redesigned with Adobe Color-style base color concept: one color is the "base", moving it shifts all others; non-base colors move individually; users can add/remove colors and change which color is the base.
- Full palette management UI in the playground: color cards with swatches, hex values, base badges, set-as-base buttons, remove buttons, and add-color button.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 18
Agent: main
Task: Standalone harmony engine + 10 Adobe rules + fix thumb positioning

Work Log:
- **Standalone harmony engine** (`src/lib/components/color-circle/harmony-engine.ts`): Created as a pure, UI-independent module with:
  - `HarmonyRule` type: 10 rules (analogous, monochromatic, triad, complementary, split-complementary, double-split-complementary, square, compound, shades, custom).
  - `HARMONY_RULES` definitions: each rule has hue offsets, a `variesTone` flag for tonal rules (monochromatic/shades), and a description.
  - `generateHues(baseHue, rule)`: generates absolute hues from a base + rule.
  - `defaultSaturations(rule)` / `defaultLightnesses(rule)`: for tonal rules, generates varied saturation/lightness values.
  - `hueDelta(from, to)`: signed angular delta [-180, 180] for rotating all markers when the base moves.
  - `isConstrained(rule)`: true for all rules except "custom".
- **ColorCircle redesigned to use the engine**:
  - `ColorEntry` now includes `lightness` (HSL L, 0–100) in addition to hue/saturation.
  - `buildPalette(rule, baseHue)` generates the palette from the engine's offsets + default saturations/lightnesses.
  - `getOutput()` now includes HSL values and uses HSL→HSV conversion for accurate color representation.
  - Markers use HSL→HSV→RGB conversion for correct color display.
  - The base color drives hue rotation (all markers shift by the same delta); saturation/lightness are per-color.
  - Markers sit on the circumference (edge) by default, positioned by hue angle. Their geometric relationship (complementary through center, triad as triangle, square as square) is visualized via harmony link lines.
- **Playground updated with all 10 rules**: The HARMONIES array now has 10 entries with appropriate icons (Shuffle, Layers, Triangle, Divide, Split, Grid2x2, Square, Sparkles, SunMedium, Brush). The harmony rules table in the documentation section lists all 10 with their offsets and counts.
- **Content metadata updated**: The color-circle component metadata now reflects the 10 rules, add/remove color methods, base color concept, and updated defaults.
- VLM-verified: circular wheel with white center, 3 numbered markers with lemon-green base ring, harmony link lines through center, all 10 harmony rule buttons in properties panel, palette cards with swatches/hex/Base/crown/remove, Size slider all present and correct. Verified palette counts: complementary=2, triad=3, compound=5, monochromatic=5.

Stage Summary:
- Created a standalone harmony engine module with all 10 Adobe Color rules, fully decoupled from the UI.
- ColorCircle now uses the engine, with proper separation of harmony geometry (hue offsets) from color values (hue, saturation, lightness per color).
- Markers positioned on the circumference, with geometric relationships visualized via harmony links through the center.
- Base color drives hue rotation; saturation/lightness are independent per color.
- Tonal rules (monochromatic, shades) generate varied saturation/lightness values.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 19
Agent: main
Task: Match Adobe Color's harmony system exactly (9 rules, 5 colors, base at middle, lock/add/remove)

Work Log:
- **Researched actual Adobe Color behavior** by visiting https://color.adobe.com/create/color-wheel with Agent Browser:
  - 9 harmony rules (not 10): Custom, Analogous, Complementary, Split complementary, Triad, Square, Compound, Shades, Monochromatic
  - 5 color strips at the bottom (base at middle, index 2)
  - Each strip has: Lock, Edit tint, Drag to reorder, Delete color, Edit color, Copy hex, Add color left, Add color right
  - Moving the base handle rotates all non-locked colors
  - Colors can be locked, added (left/right), and removed
  - Tested Triad: 5 colors with 3 distinct hues, offsets [-120, +120, 0, -120, +120]
  - Tested Square: 5 colors with 4 distinct hues, offsets [180, 90, 0, -90, 180]
- **Rewrote harmony engine** (`harmony-engine.ts`):
  - 9 rules matching Adobe Color exactly (removed "double-split-complementary" and "tetradic")
  - All rules produce exactly 5 colors with offsets defined for each position
  - Base always at index 2 (BASE_INDEX = 2, PALETTE_SIZE = 5)
  - Tonal rules (monochromatic, shades) have proper default S/L variation
  - Triad offsets: [-120, 120, 0, -120, 120] — 3 hues in 5 slots
  - Square offsets: [180, 90, 0, -90, 180] — 4 hues in 5 slots
  - Complementary offsets: [180, 0, 0, 0, 180] — 2 hues in 5 slots
- **Rewrote ColorCircle** (`color-circle.ts`):
  - 5 default colors, base at index 2 (middle)
  - Lock/unlock support: locked colors don't move when base moves
  - addColor(index, hue?, sat?): insert at any position
  - removeColor(i): remove any color (base is promoted if removed)
  - Moving base: rotates all non-locked, non-base colors by the same hue delta
  - Moving non-base: only changes that color; offset recalculated
  - Keyboard: rotates all non-locked colors
  - Locked markers show an "L" indicator on the canvas
- **Updated playground** (`color-circle-playground.tsx`):
  - 9 harmony rule buttons in Adobe Color's exact order
  - Adobe-style vertical color strips with:
    - Colored swatch on the left with position number
    - Hex value + HSL info + offset
    - Lock/Unlock button (amber when locked)
    - Add-left (ChevronLeft) and Add-right (ChevronRight) buttons
    - Crown (set as base) button
    - X (remove) button
  - Removed the separate "Add color" header button (colors are added via the per-strip add-left/add-right buttons)
- VLM-verified: 9 harmony rules, 5 color strips with all action buttons, base marker with lemon ring, size slider all present and correct. Triad produces 5 colors with 3 distinct hues. Complementary produces 5 colors with 2 distinct hues.

Stage Summary:
- Harmony system now matches Adobe Color exactly: 9 rules, 5 colors, base at middle, lock/add-left/add-right/remove.
- Standalone harmony engine with proper hue offsets for all 9 rules.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 20
Agent: main
Task: Reconstruct harmony links as radial lines to center + expandable custom rule system

Work Log:
- **Harmony links changed to radial lines**: Rewrote `renderLinks()` in ColorCircle to draw lines from each marker TO THE CENTER of the circle (radial spokes), not between markers (polygon). Each line shows the angular relationship of its color to the center. Base color's line is lemon-tinted; other lines are white semi-transparent. VLM confirms: "lines connect each outer marker directly to the central white point. They radiate outward from the center like spokes of a wheel. They do not connect marker-to-marker."
- **Harmony engine made expandable**: Rewrote `harmony-engine.ts` to support user-defined custom rules:
  - Added a mutable `customRules` Map that stores user-defined `HarmonyDefinition` entries.
  - Added `defineCustomRule(label, offsets, options)` — registers a new custom rule and returns its definition.
  - Added `removeCustomRule(id)`, `getCustomRules()`, `getAllRules()`, `getRule(id)`.
  - Built-in rules are now in `BUILT_IN_RULES` with `BUILT_IN_RULE_ORDER`.
  - The `HarmonyRule` type is now `string` (supports any rule ID, built-in or custom).
- **ColorCircle `setCustomOffsets()` method**: Added a public method that defines a custom rule from user-specified angle offsets and switches to it immediately. Preserves the current base hue. Example: `setCustomOffsets([0, 60, 120, 180, 240])` creates a 5-color rule with 60° spacing.
- **Custom Rule Builder UI** in the playground: Added a "Custom rule builder" section in the properties panel with:
  - Offset chips showing current angle offsets (e.g. "+0°", "+120°", "+240°") with remove (X) buttons.
  - A number input for entering a new offset angle.
  - An "Add" button to add the offset to the list.
  - An "Apply rule" button that calls `setCustomOffsets()` on the ColorCircle.
  - Verified: adding [0, 120, 240, 90] and applying produces 4 colors at the correct hues (210°, 330°, 90°, 300°).

Stage Summary:
- Harmony links are now radial lines from each thumb to the center (not between thumbs), making the angular relationship to center visually clear.
- The harmony system is expandable: users can define their own custom rules with arbitrary angle offsets via the Custom Rule Builder UI or the `setCustomOffsets()` API.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 21
Agent: main
Task: Add color on same radial line + base color controls all colors' distance from center

Work Log:
- **addColorOnLine(i, saturation?) method**: Added a new public API to ColorCircle that adds a color on the SAME RADIAL LINE as an existing color (same hue, different saturation/distance from center). The new color sits at the same angle but closer to center (default: halfway between the source color's saturation and center, i.e. 50% of source saturation). This lets users create shades/tints of a color along the same spoke — like Adobe Color's ability to add colors at different distances along the same hue line.
  - Added a "Droplets" icon button on each palette card (titled "Add shade on same line") that calls addColorOnLine.
  - Verified: adding a shade on color #0080ff (blue, S=100%) produces #4080bf (same blue hue, S=50%, closer to center).
- **Base color controls all colors' distance from center**: Updated the pointer interaction so that when the base color's saturation changes (moving toward/away from center), ALL non-locked colors' saturation scales proportionally by the same ratio. The base color now controls both hue rotation (all colors rotate by the same hue delta) AND distance from center (all colors' saturation scales by the same ratio). This matches the user's requirement: "by a rule main color controls distance between each color and center of circle."
  - Implementation: compute `satRatio = newSat / oldSat` when the base moves, then multiply each non-locked color's saturation by that ratio.
  - Verified: dragging the base from S=100% to S=30% scaled all colors to S≈30% (S30, S9, S30, S30 — the S9 was a previously-added shade that scaled proportionally from S30).
- VLM-verified: markers moved closer to center (~30% radius) after dragging the base inward, saturation values updated on color cards, Droplets button present.

Stage Summary:
- Users can add colors on the same radial line (same hue, different saturation) via the Droplets button on each palette card.
- The base color now controls the distance between every color and the center — dragging the base inward/outward scales all non-locked colors' saturation proportionally.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 22
Agent: main
Task: Build Color Ramp component (multi-stop gradient with draggable stops)

Work Log:
- **Vanilla JS ColorRamp component** (`src/lib/components/color-ramp/color-ramp.ts`):
  - Multi-stop gradient bar with draggable color stops.
  - Canvas-based rendering: gradient bar with rounded corners, stop markers as capsule thumbs (white halo + dark border + color dot).
  - Click empty space on the bar → adds a new stop at that position (color interpolated from neighbors).
  - Drag stops to reposition them; stops auto-sort by position.
  - `addStop(position?, color?)`: color is interpolated via linear RGB lerp if not specified.
  - `removeStop(i)`: removes a stop (keeps at least 2).
  - `setOrientation("horizontal" | "vertical")`: switches orientation, swaps bar dimensions.
  - `setThickness(n)`, `setLength(n)`: adjustable bar size.
  - Full public API: getStops, setStops, addStop, removeStop, setOrientation, setThickness, setLength, on/off, destroy.
  - Pointer interaction with pointer capture; keyboard support (arrows adjust first stop).
  - Events: `input` (continuous during drag), `change` (committed).
  - Self-contained color math (parseHex, rgbToHex, lerpRgb) — no external deps.
- **React wrapper** (`src/components/color-ramp/color-ramp-react.tsx`): owns the instance, forwards prop changes, exposes instance via `instanceRef` for imperative calls.
- **Playground** (`src/components/color-ramp/color-ramp-playground.tsx`): full playground with:
  - Live canvas (the gradient bar)
  - Property inspector: orientation toggle (Horizontal/Vertical), thickness slider, length slider
  - Output section: stop cards (color swatch + hex + position %) with remove buttons + "Add stop" button
  - Code panel (JS/HTML/CSS/API tabs with live-synced code)
  - Documentation section
- **Content metadata**: added color-ramp to `src/lib/platform/content.ts` with full properties, methods, events, defaults.
- **Routing**: added `component/color/color-ramp` → `ColorRampPlayground` in `src/app/page.tsx`.
- VLM-verified: horizontal gradient bar with blue→green→orange transition, 4 draggable stop markers, stop cards with swatches/hex/position, Add stop button, orientation/thickness/length controls all present.

Stage Summary:
- New Color Ramp component established: multi-stop gradient with draggable stops, add/remove, orientation control.
- Appears in sidebar (Color → Color Ramp) and Components directory.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 1 (CustomButton)
Agent: main
Task: Build CustomButton vanilla JS component + React wrapper + playground (Inputs category)

Work Log:
- **Vanilla JS CustomButton component** (`src/lib/components/custom-button/custom-button.ts`):
  - DOM-based button component (no canvas) — renders a real `<button>` element.
  - Options: `text`, `icon`, `iconType` ("icon" | "image"), `iconPosition` (left/right/top/bottom), `variant` (primary/secondary/outline/ghost), `size` (sm/md/lg), `disabled`, `fullWidth`.
  - Behavior: text-only → text button; icon-only → square icon-only button (aspect-ratio 1:1, no padding); text+icon → positioned per iconPosition (top/bottom produce a stacked flex-column layout).
  - Built-in Lucide-style SVG icon set (18 icons: plus, x, check, settings, search, home, star, heart, arrow-right, trash, download, upload, mail, user, save, edit, bell, refresh). Each rendered as inline `<svg>` with `stroke="currentColor"` so it inherits the button text color.
  - `iconType: "image"` renders the icon as `<img src="...">` — works with URLs and data URIs.
  - Variant styles (via data attributes + CSS custom properties):
    - primary: lemon (#D9FF66) bg, dark text
    - secondary: purple-strong (#342348) bg, light text
    - outline: transparent bg, 18%-white border, lemon-tinted hover
    - ghost: transparent bg, no border, 6%-white hover
  - Sizes: sm (h-32px, 12px text), md (h-36px, 14px text), lg (h-40px, 16px text).
  - Injects its own scoped CSS (prefixed `.custom-button-`) — no dependency on the platform's stylesheet. Single `<style id="custom-button-styles">` element appended to `<head>` once.
  - Disabled state uses the native `disabled` attribute (also blocks click events and removes from tab order).
  - Icon-only buttons get an `aria-label` derived from the icon name/src for screen readers.
  - Full public API: setText, setIcon (with optional type), setIconPosition, setVariant, setSize, setDisabled, setFullWidth, getElement, on("click"), off, destroy.
  - Custom `CustomButtonHandler` type (`(...args: unknown[]) => void`) used for `off` to satisfy `@typescript-eslint/no-unsafe-function-type` while preserving the spec's `Function`-like signature.
  - Exposed `BUILT_IN_ICON_NAMES` constant so the playground can populate its icon dropdown.
- **Barrel exports** (`src/lib/components/custom-button/index.ts`): re-exports the class, the type aliases, and the icon name list.
- **React wrapper** (`src/components/custom-button/custom-button-react.tsx`): owns the instance, forwards every prop to the imperative API via dedicated `useEffect` hooks, exposes the instance via `instanceRef` for imperative calls from the playground.
- **Playground** (`src/components/custom-button/custom-button-playground.tsx`): full playground with:
  - Live preview area (centered button, max-w-320px container so fullWidth is visible)
  - Property inspector with: text input, iconType toggle (Icon/Image), icon picker (dropdown of built-in names with a live preview chip when "icon"; free-text URL/data-URI input when "image"), iconPosition 4-way segmented control (ArrowLeft/Right/Up/Down), variant 4-way segmented control, size 3-way segmented control (SM/MD/LG), disabled toggle, fullWidth toggle, plus a live state-snapshot table.
  - Smart icon-type switching: when switching to "image" with a built-in icon name selected, the icon is swapped to a default SVG data URI; when switching back to "icon" with a data URI, it's restored to "plus".
  - Click counter with reset button.
  - "Try the imperative API" section: one-click buttons that call setText/setVariant/setIcon/setDisabled/setSize on the live instance and toast confirmation.
  - Code panel (JS/HTML/CSS/API tabs) with live-synced code generation.
  - Documentation section: Overview, When to use, When not to use, Properties table, Methods list, Events list, Accessibility notes, sticky on-this-page nav.
- **Content metadata**: added `custom-button` to `src/lib/platform/content.ts` in the `inputs` category with full properties, methods, events, defaults, when-to-use, when-not-to-use, capabilities, tags.
- **Navigation labels**: extended `routeLabel` in `src/store/navigation.ts` to map the `custom-button` slug → "Custom Button" (the existing `categoryLabel` already handled "inputs" → "Inputs").
- **Routing**: added `component/inputs/custom-button` → `CustomButtonPlayground` in `src/app/page.tsx`.
- **Lint**: removed manual `useCallback` wrappers for `update`/`reset`/`onClick` in the playground (the React Compiler now memoizes them automatically, and the manual empty-deps form was triggering `react-hooks/preserve-manual-memoization`). Removed an unused `eslint-disable` directive in the React wrapper.

Stage Summary:
- New Custom Button component established: versatile DOM-based button with 4 variants, 3 sizes, 4 icon positions, 18 built-in Lucide-style icons + image support.
- Appears in sidebar (Inputs → Custom Button) and Components directory under the Inputs category.
- `bun run lint` — 0 errors, 0 warnings.
- Files created:
  - `src/lib/components/custom-button/custom-button.ts`
  - `src/lib/components/custom-button/index.ts`
  - `src/components/custom-button/custom-button-react.tsx`
  - `src/components/custom-button/custom-button-playground.tsx`
- Files modified:
  - `src/lib/platform/content.ts` (added custom-button metadata)
  - `src/store/navigation.ts` (added custom-button slug label)
  - `src/app/page.tsx` (added routing for component/inputs/custom-button)

---
Task ID: 3 (ToggleGroup)
Agent: full-stack-developer
Task: Build ToggleGroup vanilla JS component + React wrapper + playground (Inputs category)

Work Log:
- Read `/home/z/my-project/worklog.md` (Tasks 1–22 plus the in-flight CustomButton task) to lock the design system (Obsidian #101014 + Deep Violet #211A30 + Lemon Signal #D9FF66), navigation model, content metadata schema, and the existing playground conventions (PageContainer, Breadcrumbs + PageOverline + H1 + intro, .panel/.eyebrow/.bg-grid tokens, lemon-only accent, CodeBlock + CopyableValue, toast from sonner).
- Read `src/components/color-ramp/color-ramp-playground.tsx`, `color-ramp-react.tsx`, and `src/lib/components/color-ramp/color-ramp.ts` to mirror the established wrapper/playground patterns (instanceRef forwarding, change-driven state mirroring, code-tab generation, documentation section).
- **Vanilla JS ToggleGroup component** (`src/lib/components/toggle-group/toggle-group.ts`):
  - Self-contained — does NOT import CustomButton. Each toggle button is a real DOM element (`<div role="button" tabindex="0">`) styled to look like CustomButton's primary/secondary/outline variants (lemon / purple-strong / transparent+border), with icon + label support. Selected state always layers a lemon ring on top of the variant.
  - Options: `items` (ToggleButtonItem[]), `multiselect`, `closable`, `reorderable`, `orientation` (horizontal/vertical), `variant` (primary/secondary/outline), `size` (sm/md/lg). Defaults match the spec: single-select, not closable, not reorderable, horizontal, outline, md.
  - Built-in 23-icon set (bold, italic, underline, check, x, plus, star, circle, square, heart, bolt, dot, arrow-right, settings, folder, file, user, tag, eye, bell, search, home). `icon` field accepts a built-in name, a `data:` URI, or a raw `<svg>` string — `renderIcon()` handles all three.
  - Scoped CSS injected once per document (`<style id="toggle-group-styles">`) with `.toggle-group-` prefix. No canvas, no external deps. All visual tokens come from the platform's CSS variables (--brand-lemon, --brand-purple-strong, --border, --accent, --foreground, --muted-foreground).
  - Selection behavior: single-select click selects + deselects others (no toggle-off via click — keeps one selected); multiselect toggles independently. `setSelected([])` is allowed via the API (clears all). `setMultiselect(false)` keeps only the first selected when turning off multi.
  - Closable: each item gets an embedded `<button class="toggle-group__close" tabindex="-1">` with an inline X SVG. Clicking X calls `_handleClose` (removes the item from items[], removes its DOM, fires `close` then `change`). `setClosable()` adds/removes the close button on existing items without rebuilding them.
  - Reorderable: pointer-event-based drag-to-reorder. On pointerdown, records the item + pointer origin. On pointermove past a 4px threshold, marks the item as `--dragging` (lower opacity + shadow), translates it with the pointer for tactile feedback, and finds the sibling under the pointer (via `document.elementFromPoint` with the dragged item's `pointer-events` temporarily disabled). Computes whether the pointer is in the sibling's first or second half, then performs a live swap in the items array + DOM (re-appends items in array order). After a swap, re-anchors the drag origin so the translate offset is 0 at the new position. On pointerup, emits `reorder` + `change`. Suppresses the synthetic click that follows a drag via a `Date.now()`-based guard.
  - Keyboard: Enter/Space toggles selection; Delete/Backspace closes (if closable); Arrow Left/Up + Arrow Right/Down move the focused item within the group (if reorderable).
  - Public API exactly matches the spec: `constructor(container, options?)`, `getItems()`, `setItems(items)`, `addItem(item)`, `removeItem(id)`, `getSelected()`, `setSelected(ids)`, `setMultiselect(on)`, `setClosable(on)`, `setReorderable(on)`, `setOrientation(orientation)`, `setVariant(variant)`, `setSize(size)`, `on(event, handler)`, `off(event, handler)`, `destroy()`.
  - Events: `change` (selection/reorder/add/remove/setItems), `select` (user click), `reorder` (drag or arrow-key reorder), `close` (X clicked, item removed). Tiny internal EventEmitter with try/catch around each handler so a single bad handler can't crash the group.
  - `destroy()` is idempotent: removes window pointer listeners, clears the handler map, removes all DOM, nulls the drag state.
  - Custom `ToggleHandler = (data: any) => void` type used for `off` to satisfy `@typescript-eslint/no-unsafe-function-type` while preserving the spec's `Function`-like signature.
- **Barrel exports** (`src/lib/components/toggle-group/index.ts`): re-exports the class + all type aliases.
- **React wrapper** (`src/components/toggle-group/toggle-group-react.tsx`):
  - Owns the vanilla instance for the lifetime of the mount. Creates once with empty deps (capturing the initial items snapshot via a ref so the create-once effect stays empty).
  - Forwards every prop change via dedicated `useEffect` hooks: multiselect, closable, reorderable, orientation, variant, size. The items prop is compared (JSON.stringify key) against the instance's current items and only `setItems()` is called when they actually differ — this avoids loops with the change-driven state in the playground.
  - Forwards all four events (change/select/reorder/close) to optional callbacks via refs so the create-once effect can stay empty.
  - Emits the initial state on mount so the parent can sync immediately.
- **Playground** (`src/components/toggle-group/toggle-group-playground.tsx`) — Figma/Godot-style nested properties panel:
  - Live preview area (left, `.panel` with `bg-grid` background): the actual `<ToggleGroupReact>` instance.
  - Output section under the preview: CopyableValue chips for `selected` (JSON array) and `labels` (comma-joined), plus a contextual hint about click/close/drag interactions.
  - Property inspector (right, `.panel`):
    - **Group section** (top): three Switch toggles for Multiselect / Closable / Reorderable; segmented controls for Orientation (Horizontal/Vertical with ArrowLeftRight/ArrowUpDown icons), Variant (Outline/Primary/Secondary), Size (SM/MD/LG).
    - **Buttons section** (bottom, separated by a divider): "BUTTONS (N)" header with an "Add button" action. Each item is rendered as a `ButtonItemEditor` card with:
      - A summary row (collapse chevron + index badge + truncated label + "on" badge if selected + remove trash button).
      - An expandable details section with: Label text input, Icon `<select>` dropdown (23 built-in icons + "(none)"), Selected checkbox, Move up/down buttons (disabled at array ends), and a read-only id footer.
  - Inspector edits flow through `instanceRef.current.setItems()` / `setSelected()` / `removeItem()` / `addItem()` so the vanilla instance stays the source of truth and emits change events that sync React state back.
  - Code panel with JS/HTML/CSS/API tabs, all live-synced to the current state (the JS tab includes the actual items array, multiselect/closable/reorderable flags, orientation, variant, and size).
  - Documentation section: Overview, When to use, When not to use, Properties table, Methods list, Events list, Accessibility notes, Icons explanation, sticky on-this-page nav — all driven by the content.ts metadata.
- **Content metadata**: added `toggle-group` to the `components` array in `src/lib/platform/content.ts` under the `inputs` category with full properties (7), methods (15), events (4), defaults, when-to-use (4), when-not-to-use (3), capabilities (6), tags.
- **Navigation labels**: extended `routeLabel` in `src/store/navigation.ts` to map the `toggle-group` slug → "Toggle Group" (the existing `categoryLabel` already handled "inputs" → "Inputs", and `breadcrumbs` already used `routeLabel` for the component-name segment).
- **Routing**: added `component/inputs/toggle-group` → `ToggleGroupPlayground` in `src/app/page.tsx` (the import was already present from a parallel agent's draft; only the route handler was missing).
- **Agent-browser + VLM verification**:
  - Navigated Home → Components → Inputs → Toggle Group. Playground loaded with the three default buttons (Bold selected with lemon ring, Italic, Underline). VLM confirmed the selected button is highlighted with lemon-green.
  - Clicked Italic in single-select mode: Bold deselected, Italic selected (checkboxes in the inspector updated correctly).
  - Toggled Closable: each toggle gained an embedded Remove (X) button. Clicked the X on Underline: item removed, button count went 3 → 2.
  - Toggled Multiselect then clicked Italic: both Bold and Italic checkboxes are checked simultaneously.
  - Clicked "Add button" twice: two "New button" entries appeared, count went 2 → 4.
  - Set Variant to Primary: all four buttons turned lemon-green with dark text (VLM confirmed "bright lime green/yellow-green background, dark/black text, X close icon on the right side").
  - Enabled Reorderable, dragged Bold to the last position: the inspector order updated to [Italic, New button, New button, Bold] — drag-to-reorder works.
  - Set Orientation to Vertical (via `find role button click --name "Vertical"` to bypass stale refs): the `.toggle-group` element's class became `toggle-group--vertical` and VLM confirmed the buttons stacked vertically.
  - Code panel JS tab is live-synced (shows the actual 4 items with their icons + selected flags, multiselect:true, closable:true, variant:"primary").
  - API tab renders the full TypeScript interface.
- **Lint**: `bun run lint` — 0 errors, 0 warnings across the whole project (toggle-group files contribute nothing; the parallel custom-button errors that existed mid-task were also resolved by the time of the final check).

Stage Summary:
- New Toggle Group component established: self-contained vanilla JS class that mimics CustomButton visuals (primary/secondary/outline variants, icon + label) without importing it, with single/multi-select, closable buttons, drag-to-reorder (pointer events), and dynamic add/remove.
- Appears in sidebar (Inputs → Toggle Group) and Components directory under the Inputs category.
- Playground features a Figma/Godot-style nested properties panel: a Group section for the toggle group's own properties, and a Buttons section where each child toggle button's properties (label, icon, selected, remove, move up/down) are editable inline — exactly like editing nested component properties in Figma's or Godot's inspector.
- `bun run lint` — 0 errors, 0 warnings.
- Files created:
  - `src/lib/components/toggle-group/toggle-group.ts`
  - `src/lib/components/toggle-group/index.ts`
  - `src/components/toggle-group/toggle-group-react.tsx`
  - `src/components/toggle-group/toggle-group-playground.tsx`
- Files modified:
  - `src/lib/platform/content.ts` (added toggle-group metadata in the inputs category)
  - `src/store/navigation.ts` (added toggle-group slug → "Toggle Group" label)
  - `src/app/page.tsx` (added route handler for `component/inputs/toggle-group`)

---
Task ID: 2
Agent: main
Task: Build PeriodicRange component (dual-thumb range slider with snapping, markers, orientation) + React wrapper + playground

Work Log:
- **Vanilla JS PeriodicRange component** (`src/lib/components/periodic-range/periodic-range.ts`):
  - Canvas-based dual-thumb range slider. Two thumbs (min and max) that cannot cross (valueMin ≤ valueMax invariant).
  - Track rendered as rounded-rect bar; selected range between the thumbs filled with lemon accent (#D9FF66).
  - Optional snapping to a step grid (step = 0 disables). Snapping applied in `applyStep` via `Math.round((v - min) / step) * step + min`.
  - Optional tick-mark markers with numeric labels at markerStep intervals. Labels are auto-decimated when there are more than 20 markers (every Nth marker labeled) to prevent overlap.
  - Horizontal or vertical orientation. For vertical, the high-value thumb is at the top, low-value at the bottom (conventional); markers and labels sit to the LEFT of the track.
  - Two thumbs are visually distinguishable: both are white capsules with dark borders, but the min thumb has a horizontal "−" bar inside and the max thumb has a "+" (horizontal + vertical bars). The max thumb is also slightly larger (14 vs 12 px) and has a thicker border (2 vs 1.5 px).
  - Active thumb (the one that was last interacted with) gets a lemon ring outside it.
  - Pointer interaction: pointerdown picks the closest thumb (hit-test within 14px, otherwise nearest); pointermove drags it, clamping to [min, valueMax] for min thumb and [valueMin, max] for max thumb; pointerup commits with a "change" event. Pointer capture is used so the drag continues even if the cursor leaves the canvas.
  - Keyboard interaction: Arrow Up/Right increases the active thumb, Arrow Down/Left decreases (Shift via PageUp/PageDown = 10× step). Home jumps the active thumb to range min (or to valueMin for the max thumb), End jumps to range max (or to valueMax for the min thumb). Tab cycles the active thumb between min and max.
  - Full public API matching the spec: getValueMin, getValueMax, setValueMin, setValueMax, setRange, setStep, setShowMarkers, setMarkerStep, setOrientation, setThickness, setLength, on, off, destroy.
  - Events: `input` (continuous during drag/keyboard) and `change` (committed on pointer up or keyboard). Both carry `{ valueMin, valueMax }`.
  - ARIA: canvas has role="slider", aria-valuemin/max/now (active thumb's value), aria-valuetext (combined "min X, max Y" label).
  - Self-contained helpers (clamp, approxEqual, roundRect, formatMarkerLabel) — no external deps.
- **Barrel exports** (`src/lib/components/periodic-range/index.ts`): re-exports `PeriodicRange` class and `PeriodicRangeOrientation`, `PeriodicRangeOptions`, `PeriodicRangeValue` types.
- **React wrapper** (`src/components/periodic-range/periodic-range-react.tsx`): owns the instance for the lifetime of the mount; forwards all prop changes via the imperative API (setRange, setValueMin, setValueMax, setStep, setShowMarkers, setMarkerStep, setOrientation, setThickness, setLength). Exposes the instance via `instanceRef` for imperative calls. Emits initial state on mount so consumers can render synchronously.
- **Playground** (`src/components/periodic-range/periodic-range-playground.tsx`): full playground with:
  - Live canvas (the dual-thumb slider)
  - Property inspector: Range (min/max), Values (valueMin/valueMax), Step, Markers toggle (reveals Marker step when on), Orientation (Horizontal/Vertical), Thickness slider, Length slider
  - Output section: prominent Min/Max value chips with +/- icons, copyable valueMin/valueMax chips, span indicator
  - Code panel (JavaScript/HTML/CSS/API tabs with live-synced code)
  - Documentation section with Overview, When to use, When not to use, Properties table, Methods, Events, Accessibility, Styling
- **DeferredNumberInput**: A custom number input that defers committing its value to the parent until blur/Enter. This lets users type multi-digit numbers (e.g. "33") without each keystroke being snapped/clamped back by the underlying component (which would make typing impossible when step snapping is on). The displayed value tracks the external `value` prop while unfocused (so canvas drags and reset are reflected), and tracks the local draft while focused.
- **onInput sync**: When the canvas emits `input` (e.g. after a drag with snapping), the playground's state.valueMin/valueMax are synced to the snapped values. This keeps the inspector inputs in lockstep with what the canvas actually shows.
- **update function invariant enforcement**: The playground's `update` function enforces min ≤ max (swap if inverted), clamps valueMin/valueMax to the range, and enforces valueMin ≤ valueMax with a "moving thumb wins" rule: if the user raises valueMin above valueMax, valueMin clamps down to valueMax; if they lower valueMax below valueMin, valueMax clamps up to valueMin.
- **Content metadata** (`src/lib/platform/content.ts`): added periodic-range to the inputs category with full properties (min, max, valueMin, valueMax, step, showMarkers, markerStep, orientation, thickness, length), methods (13 entries), events (input, change), defaults, whenToUse, whenNotToUse.
- **Navigation labels** (`src/store/navigation.ts`): refactored the `routeLabel` and `breadcrumbs` helpers to use a new `categoryLabel()` function that maps category slugs to human-readable labels (color → "Color", inputs → "Inputs", layout → "Layout", data-display → "Data Display"). Previously only "color" was special-cased; other categories showed their raw slug. Also added slug-to-name mappings for all current component slugs (color-wheel, color-range, color-circle, color-ramp, periodic-range) so breadcrumbs show proper names.
- **Routing** (`src/app/page.tsx`): added `component/inputs/periodic-range` → `PeriodicRangePlayground` route handler.

VLM-verified all features:
- Horizontal mode: dual-thumb slider with lemon-green selected range, two distinguishable thumbs (min with "−", max with "+"), active thumb (min by default) has lemon ring.
- Markers mode (horizontal): tick marks below the track, numeric labels (0, 10, 20... 100) visible, no overlap or clipping.
- Vertical mode: track is taller than wide, lemon-green range visible between thumbs, tick marks and labels to the LEFT of the track, high-value thumb at top, low-value at bottom.
- Snapping: set step=5, valueMin=33 → snapped to 35 on blur.
- Clamping: set valueMax=10 (below valueMin=35) → clamped up to 35 (the moving thumb wins).
- Canvas drag: dragged max thumb past min thumb → stopped at valueMin (couldn't cross). Dragging also updated the inspector inputs in real time.
- Keyboard: ArrowRight increased active thumb by 1 (verified both min and max after Tab cycle). Home jumped active thumb to range min. End jumped active thumb to the opposite bound.
- Reset: returns to defaults (min=0, max=100, valueMin=25, valueMax=75, step=0, showMarkers=false, orientation=horizontal, thickness=8, length=320).
- Code panel: JavaScript/HTML/CSS/API tabs all functional; code is live-synced with the playground state.

Files created:
- `src/lib/components/periodic-range/periodic-range.ts` (vanilla JS class, ~900 lines)
- `src/lib/components/periodic-range/index.ts` (barrel exports)
- `src/components/periodic-range/periodic-range-react.tsx` (React wrapper)
- `src/components/periodic-range/periodic-range-playground.tsx` (playground view, ~960 lines)

Files modified:
- `src/lib/platform/content.ts` (added periodic-range metadata in inputs category)
- `src/store/navigation.ts` (refactored routeLabel/breadcrumbs to use categoryLabel; added slug→name mappings for all current components)
- `src/app/page.tsx` (added route handler for component/inputs/periodic-range)

Stage Summary:
- New PeriodicRange component established: dual-thumb range slider with snapping, markers, and orientation control. First component in the Inputs category.
- VLM-verified across all major interaction modes (drag, keyboard, snapping, clamping, orientation, markers).
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 23 (summary)
Agent: main
Task: Build 3 new input components — Custom Button, Periodic Range, Toggle Group

Work Log:
- **CustomButton** (built by subagent): A versatile DOM-based button with configurable text, icon (18 built-in SVG icons or image URLs), 4 icon positions (left/right/top/bottom), 4 variants (primary/secondary/outline/ghost), 3 sizes (sm/md/lg), disabled/fullWidth options. Scoped CSS, full imperative API, React wrapper, and complete playground with click counter, property inspector, and code panel.
- **PeriodicRange** (built by subagent): A dual-thumb canvas-based range slider with min/max thumbs that can't cross, optional snapping to step increments, optional tick-mark markers at intervals, horizontal/vertical orientation, and configurable thickness/length. Full imperative API, React wrapper, and playground with output values.
- **ToggleGroup** (built by subagent): A group of toggle buttons with single-select/multiselect modes, closable buttons (embedded X), drag-to-reorder via pointer events, and dynamic add/remove. Self-contained (doesn't import CustomButton but matches its visual style). Playground features a Figma/Godot-style nested properties panel where each button's properties (label, icon, selected) are editable inline within the group's inspector, plus an "Add button" action.
- All 3 components added to content.ts in the "inputs" category, with routing in page.tsx, and sidebar labels in navigation.ts.
- All verified: CustomButton renders with `.custom-button-root` element, PeriodicRange renders with canvas, ToggleGroup renders with `.toggle-group` element.
- `bun run lint` — 0 errors, 0 warnings.

Stage Summary:
- 3 new input components established: Custom Button, Periodic Range, Toggle Group.
- ToggleGroup features the nested component properties panel pattern (like Figma/Godot) where child component properties are editable inline within the parent inspector.
- All appear in sidebar under Inputs → [component name] and in the Components directory.

---
Task ID: 2+3
Agent: main
Task: Build SmartContextMenu + SmartTooltip (Layout category) — vanilla JS classes, React wrappers, playgrounds, content metadata, navigation labels, routing.

Work Log:
- Read `/home/z/my-project/worklog.md` (Tasks 1–23 plus all in-flight component tasks) and the existing `commands` module (`src/lib/commands/{index,registry,shortcuts}.ts`), `content.ts`, `navigation.ts`, `page.tsx`, `globals.css`, and the ToggleGroup/CustomButton/PeriodicRange components to lock the design system (Obsidian #101014 + Deep Violet #211A30 + Lemon Signal #D9FF66), the navigation model, the content metadata schema, and the established playground conventions (PageContainer, Breadcrumbs + PageOverline + H1 + intro, .panel/.eyebrow/.bg-grid tokens, lemon-only accent, CodeBlock + CopyableValue, toast from sonner, instanceRef forwarding, change-driven state mirroring, code-tab generation, sticky on-this-page nav).
- **Vanilla JS SmartContextMenu** (`src/lib/components/smart-context-menu/smart-context-menu.ts`):
  - DOM-overlay context menu that renders command items from the shared command registry (`commandRegistry.byIds`).
  - Constructor: `new SmartContextMenu(container, options)` where `options.bounds` is the clipping element. If the container is `position: static`, it's overridden to `relative` (restored on destroy) so the absolutely-positioned menu resolves against it.
  - `show(x, y)` (viewport coords): makes the menu measurable (opacity 0, left/top 0), measures natural width/height via `getBoundingClientRect()`, then computes placement by translating `x, y` to container-relative coords (`relX = x - cr.left`, `relY = y - cr.top`). Horizontal: if `relX + menuW > bounds.right - cr.left - GAP`, flips left (`relX - menuW`); if that still overflows left, clamps to `bounds.left - cr.left + GAP`. Same logic vertically: flip up, then clamp to `bounds.top`. Reveals via `requestAnimationFrame` + `.smart-context-menu--visible` class with a scale-fade transition.
  - `hide()`: removes `--visible`, fires the `hide` event, and after the 140ms transition sets `display: none` (so the next show() can re-measure cleanly).
  - Each item renders the command's icon (built-in Lucide-style SVG set covering every icon referenced by `registerBuiltinCommands`: search, x, rotate-ccw, triangle, square, circle, circle-slash, refresh-cw, droplet, sun, contrast, blend, divide, shuffle, brush, copy, clipboard — plus extras), label, and kbd shortcut (one `<kbd>` per `shortcutParts()` part). Disabled commands get `.smart-context-menu__item--disabled` + `aria-disabled="true"` + native `disabled` on the inner button (blocks click and removes from tab order). Icon-less items reserve the icon slot with an empty spacer so labels align.
  - Items auto-group with `<li class="smart-context-menu__separator" role="separator">` between different `cmd.category` values, so multi-category menus read naturally.
  - Keyboard: Arrow Up/Down moves the active item (skips disabled), Enter/Space selects the active item, Escape closes, Tab/Shift+Tab cycles the active item. Active item gets `.smart-context-menu__item--active` (lemon accent) and tries to focus itself. Pointerenter on an item also updates the active index for keyboard continuity.
  - Click-outside (pointerdown on document, capture phase, with menuEl.contains check) hides. Window `blur` hides too.
  - `setCommandIds(ids)`: re-renders the items and, if visible, resets the active item to the first enabled.
  - `setTitle(title)`: lazily creates/removes the header element; updates the text on existing headers.
  - Events: `select` (carries commandId), `hide` (no payload). Public API uses overloads (`on(event: "select", handler: (commandId: string) => void)` and `on(event: "hide", handler: () => void)`). Custom `ContextMenuHandler = (data: any) => void` type used for `off` to satisfy `@typescript-eslint/no-unsafe-function-type` while preserving the spec's `Function`-like signature (same pattern as ToggleGroup).
  - ARIA: menu has `role="menu"` + `aria-hidden` toggle; items have `role="menuitem"`; disabled items set `aria-disabled`. Shortcut badge has `aria-label="Shortcut: …"` (uses `formatShortcut`).
  - Scoped CSS injected once per document (`<style id="smart-context-menu-styles">`) with `.smart-context-menu-` prefix. No canvas, no external deps. All visual tokens come from the platform's CSS variables (--popover, --popover-foreground, --border, --accent, --muted-foreground, --brand-lemon).
  - `destroy()` is idempotent: removes document listeners, clears the handler map, restores the container's original `position` if we overrode it, removes the menu DOM, sets a `destroyed` flag.
- **Barrel exports** (`src/lib/components/smart-context-menu/index.ts`): re-exports the class + the `SmartContextMenuOptions` type.
- **React wrapper** (`src/components/smart-context-menu/smart-context-menu-react.tsx`): renders a `<div>` that serves as BOTH the menu's container and the bounds element. Creates the instance once on mount (empty deps, initial props captured via refs so the create-once effect stays empty). Forwards `commandIds` (compared via `commandIdsKey = commandIds.join(",")` so setCommandIds only fires when the contents actually change) and `title` prop changes via the imperative API. Callbacks (`onSelect`, `onHide`) kept in refs so the create-once effect can stay empty. Exposes the instance via `instanceRef` for imperative `show(x, y)` calls.
- **Playground** (`src/components/smart-context-menu/smart-context-menu-playground.tsx`): full playground with:
  - **Live canvas** (the `.panel`'s inner `<SmartContextMenuReact>` div, which is also the bounds/container). Right-click anywhere in the panel opens the menu at the cursor (via `onContextMenu` → `instanceRef.current.show(e.clientX, e.clientY)`). Also five "open at" buttons (center + four corners with 8px padding) so users without a right-click can exercise the menu and so the smart positioning is visible at each edge.
  - **Output section**: `CopyableValue` chips for `lastSelected` and the command's human label, plus a hint about Escape/click-outside/Arrow-key interactions.
  - **Property inspector**: title text input (live-updates the header via `setTitle`); a "Commands" multi-select grouped by category, where each registered command is a checkbox row showing the command label + ID and a per-category "selected/total" badge. Selecting/deselecting immediately calls `setCommandIds` on the instance.
  - `registerBuiltinCommands()` called in a mount effect; a `registryVersion` state bumps to trigger a re-read of `commandRegistry.list()` for the inspector dropdown.
  - Code panel (JavaScript / HTML / CSS / API tabs) with live-synced code generation (the JS tab shows the actual `commandIds` array, title, and last-selected comment).
  - Documentation section: Overview, When to use, When not to use, Properties table (3 rows), Methods list (8 entries), Events list (2 entries), Smart positioning explanation (5-step ordered list), Accessibility notes (5 bullets), sticky on-this-page nav — all driven by the content.ts metadata.
- **Vanilla JS SmartTooltip** (`src/lib/components/smart-tooltip/smart-tooltip.ts`):
  - DOM-overlay tooltip that renders a command's label, description, and kbd shortcut from the shared command registry (`commandRegistry.get`).
  - Constructor: `new SmartTooltip(container, options)` where `options.bounds` is the clipping element and `options.commandId` + `options.position` configure the content/placement. Container is made `position: relative` if static (restored on destroy).
  - `attachTo(target)`: removes listeners from the previous target (if any) and adds `mouseenter`/`mouseleave`/`focus`/`blur` to the new target. `mouseenter`/`focus` → `show()` + emit `show`; `mouseleave`/`blur` → `hide()` + emit `hide`. Calling `attachTo` on the same target is a no-op.
  - `detach()`: removes listeners from the current target and hides.
  - `show()`: makes the tooltip measurable (opacity 0, left/top 0), measures natural width/height, then computes placement:
    1. Compute target rect (viewport) → container-relative coords (`tx = tr.left - cr.left`, etc.).
    2. Bounds in container-relative coords (with EDGE_PAD=4): `bLeft, bTop, bRight, bBottom`.
    3. For the requested `position` (top/bottom/left/right), compute the natural left/top (centered along the target on the cross-axis, offset by GAP=8 on the main axis).
    4. If the requested side overflows (e.g. `top < bTop` for "top"), flip to the opposite side and recompute.
    5. Clamp the non-primary axis so the tooltip stays inside the bounds: `left = max(bLeft, min(p.left, bRight - ttW))` (and same for top).
    6. Apply left/top and reveal via `requestAnimationFrame` + `.smart-tooltip--visible` (scale-fade transition).
  - `hide()`: removes `--visible`, fires `hide` event, after 140ms sets `display: none`.
  - `setCommandId(id)`: re-renders the tooltip content (icon, label, description, shortcut). If visible, re-positions.
  - `setPosition(pos)`: updates the preferred position; if visible, re-positions (which may flip).
  - Content rendering: header row (icon + bold label), optional description (muted, 11px), shortcut badge (one `<kbd>` per part, lemon-tinted border + text). Empty-state for unknown command IDs.
  - Built-in icon set (same set as SmartContextMenu) so every command icon renders.
  - Scoped CSS injected once per document (`<style id="smart-tooltip-styles">`) with `.smart-tooltip-` prefix. `--tt-accent` token = `--brand-lemon` for icon + shortcut text.
  - `destroy()`: detaches, removes the tooltip DOM, restores the container's position, clears listeners.
- **Barrel exports** (`src/lib/components/smart-tooltip/index.ts`): re-exports the class + `SmartTooltipOptions` + `SmartTooltipPosition` types.
- **React wrapper** (`src/components/smart-tooltip/smart-tooltip-react.tsx`): renders a `<div>` as container+bounds. Creates the instance once on mount; forwards `commandId` and `position` prop changes via the imperative API. Exposes the instance via `instanceRef` for `attachTo`/`show`/`hide` calls.
- **Playground** (`src/components/smart-tooltip/smart-tooltip-playground.tsx`): full playground with:
  - **Live canvas** (the bounds/container div) containing 5 hoverable buttons absolutely positioned at TL/TR/Center/BL/BR. Each button has its own `SmartTooltip` instance (5 total) — created in a mount effect that iterates `targetRefs.current`, calls `new SmartTooltip(container, { bounds: container, commandId, position })`, then `inst.attachTo(target)` and `inst.on("show", ...)`. This avoids the single-target limitation of `attachTo` while keeping the API honest.
  - Per-target `commandId` is stored in component state (`targets` array) — the `setTargetCommandId` callback updates both the state and the instance's `setCommandId`. The `targetsRef` mirrors the state for the create-once effect's `onShow` closure (which reads the latest commandId at hover time).
  - **Output section**: `CopyableValue` chips for `lastHovered` and the command's human label.
  - **Property inspector**: 4-way position segmented control (Top/Bottom/Left/Right with ArrowUp/Down/Left/Right icons) that calls `setPosition` on ALL tooltip instances via a position-prop-change effect; a "Inspector-bound command" `<select>` dropdown of all registered commands, with an "Apply to center target" button that calls `setTargetCommandId(2, …)`; and a per-target command binding section where each of the 5 targets has its own `<select>` to bind a different command — so users can see different tooltips on different buttons in the same canvas.
  - `registerBuiltinCommands()` called on mount; `registryVersion` bump triggers re-read.
  - Code panel (JavaScript / HTML / CSS / API tabs) with live-synced code (the JS tab shows the actual 5-target array with their bound commandIds and the current preferred position).
  - Documentation section: Overview, When to use, When not to use, Properties table (3 rows), Methods list (8 entries), Events list (2 entries), Smart positioning explanation (6-step ordered list), Accessibility notes (4 bullets), sticky on-this-page nav — all driven by the content.ts metadata.
- **Content metadata** (`src/lib/platform/content.ts`): added both `smart-context-menu` and `smart-tooltip` to the `components` array in the `layout` category (which already existed). Each has full properties, methods, events, defaults, whenToUse, whenNotToUse, capabilities, and tags.
- **Navigation labels** (`src/store/navigation.ts`): extended the `routeLabel` switch's `component` case to map `smart-context-menu` → "Smart Context Menu" and `smart-tooltip` → "Smart Tooltip". The existing `categoryLabel("layout")` → "Layout" already handled the category segment.
- **Routing** (`src/app/page.tsx`): added imports for `SmartContextMenuPlayground` and `SmartTooltipPlayground`, plus two route handlers under `case "component"` for `component/layout/smart-context-menu` and `component/layout/smart-tooltip`.
- **Lint**: `bun run lint` — 0 errors, 0 warnings. Initial run had 8 warnings for unused `eslint-disable-next-line` directives (the project's React Compiler config doesn't flag the empty-deps pattern as exhaustively as the disable comments assumed); `bun run lint --fix` removed them. Hand-cleaned the resulting blank lines for readability. No `react-hooks/exhaustive-deps` errors thanks to the refs-for-callbacks pattern established by ToggleGroup.

Stage Summary:
- Two new Layout-category components established: SmartContextMenu (right-click menu with smart flip/clamp positioning, command-registry-driven items, kbd shortcuts, keyboard nav, click-outside close) and SmartTooltip (hover/focus tooltip with smart side-flip + clamp positioning, command-registry-driven content).
- Both render items from the shared command registry via `commandRegistry.byIds` / `commandRegistry.get` and use `formatShortcut` + `shortcutParts` for the kbd badges.
- Both playgrounds call `registerBuiltinCommands()` on mount.
- Both appear in the sidebar (Layout → Smart Context Menu / Smart Tooltip) and in the Components directory under the Layout category, since the Sidebar dynamically builds groups from `categories` + `components` in content.ts.
- `bun run lint` — 0 errors, 0 warnings.
- Files created:
  - `src/lib/components/smart-context-menu/smart-context-menu.ts` (vanilla JS class, ~670 lines)
  - `src/lib/components/smart-context-menu/index.ts` (barrel exports)
  - `src/components/smart-context-menu/smart-context-menu-react.tsx` (React wrapper)
  - `src/components/smart-context-menu/smart-context-menu-playground.tsx` (playground view)
  - `src/lib/components/smart-tooltip/smart-tooltip.ts` (vanilla JS class, ~480 lines)
  - `src/lib/components/smart-tooltip/index.ts` (barrel exports)
  - `src/components/smart-tooltip/smart-tooltip-react.tsx` (React wrapper)
  - `src/components/smart-tooltip/smart-tooltip-playground.tsx` (playground view)
- Files modified:
  - `src/lib/platform/content.ts` (added smart-context-menu + smart-tooltip metadata in the layout category)
  - `src/store/navigation.ts` (added smart-context-menu + smart-tooltip slug → label mappings in `routeLabel`)
  - `src/app/page.tsx` (added route handlers for `component/layout/smart-context-menu` and `component/layout/smart-tooltip`)

---
Task ID: 24 (summary)
Agent: main
Task: Build commands registry + shortcuts utility + SmartContextMenu + SmartTooltip

Work Log:
- **Commands registry** (`src/lib/commands/registry.ts`): A singleton `CommandRegistry` class that stores commands by ID. Each command has `{ id, label, shortcut?, icon?, category?, description?, disabled? }`. Provides `register`, `get`, `list`, `byCategory`, `byIds`, `unregister`. Convenience functions `defineCommand` and `defineCommands`.
- **Shortcuts utility** (`src/lib/commands/shortcuts.ts`): 
  - `formatShortcut(shortcut)` — human-readable string like "⇧R" or "⌘⇧R"
  - `shortcutParts(shortcut)` — array of parts for kbd rendering
  - `eventMatchesShortcut(event, shortcut)` — check if a KeyboardEvent matches
  - `findCommandForEvent(event, commandIds?)` — find the matching command
  - `ShortcutHandler` class — global keydown listener that fires callbacks when registered shortcuts are pressed, optionally scoped to a set of command IDs
- **Built-in commands** (`src/lib/commands/index.ts`): `registerBuiltinCommands()` registers ~20 platform commands across categories: Global (search, escape), Color Wheel (reset, shapes 1-4, toggle rotate), Color Range (modes 1-4), Color Circle (harmonies 1-5), Edit (copy, paste, duplicate). Fixed a missing import (`defineCommands` wasn't imported in the `registerBuiltinCommands` function).
- **SmartContextMenu** (`src/lib/components/smart-context-menu/`): A context menu overlay that renders command items from the registry. Smart positioning: auto-flips left/up and clamps to the bounds container so it never overflows the live canvas area. Each item shows icon, label, and kbd shortcut. Arrow-key navigation, Enter selects, Escape/click-outside hides. Category separators between different command categories.
- **SmartTooltip** (`src/lib/components/smart-tooltip/`): A tooltip overlay that renders a command's label, description, and kbd shortcut. Attaches to a target element (mouseenter/focus → show, mouseleave/blur → hide). Smart positioning: flips to opposite side if it would overflow the bounds container.
- **React wrappers + playgrounds** for both: Each playground calls `registerBuiltinCommands()` on mount, features a live-canvas bounds container (right-click for menu, hoverable buttons for tooltip), property inspector with command/position selectors, output section, code panel, and documentation.
- **Fixed two bugs**: (1) `defineCommands` was used in `registerBuiltinCommands` without being imported; (2) `SmartTooltip` was imported as `import type` but used as a value in the tooltip playground.
- Both components appear in the sidebar under **Layout → Smart Context Menu / Smart Tooltip**.
- `bun run lint` — 0 errors, 0 warnings.

Stage Summary:
- Commands registry + shortcuts utility established as a standalone module (not a component).
- SmartContextMenu and SmartTooltip render command items with kbd shortcuts, with smart positioning bounded by a container element.
- Both playgrounds load and render correctly.

---
Task ID: 2
Agent: board-subagent
Task: Build the React wrapper + playground for the Board component (vanilla JS Board class already complete at src/lib/components/board/board.ts)

Work Log:
- Read `/home/z/my-project/worklog.md` (Tasks 1–24) to lock the design system (Obsidian #101014 + Deep Violet #211A30 + Lemon Signal #D9FF66), the navigation model, the content metadata schema, and the established playground conventions (PageContainer, Breadcrumbs + PageOverline + H1 + intro, .panel/.eyebrow tokens, lemon-only accent, CodeBlock + CopyableValue, toast from sonner, instanceRef forwarding, change-driven state mirroring, code-tab generation, sticky on-this-page nav).
- Read `src/lib/components/board/board.ts` (844 lines) to lock the Board's public API: constructor(container, options), addItem/removeItem/getItems/getSelectedIds/getSelectedItems/selectItem/clearSelection, setGridMode/setGridSize/setSubGridDivisions/setSnapToGrid/setSnapToItems, getView/setView/zoomToFit/zoomToFitSelection, align(AlignType)/distribute(DistributeType), getLocalLattice/getGlobalLattice, on/off("selection"|"change"|"view"), destroy. Confirmed the Board renders its own <canvas> inside the container and adds a `.board-root` class (position: relative; overflow: hidden).
- Read `src/lib/commands/{index,shortcuts}.ts` to confirm `registerBuiltinCommands()` already defines all 14 board.* commands (align-left/center-h/right/top/center-v/bottom, distribute-h/v, fit-all/fit-selection, add-circle/rect/triangle, delete-selected) and that `ShortcutHandler(scopedIds?)` + `formatShortcut(shortcut)` are the public API.
- Read the existing SmartTooltip wrapper/playground pair to mirror the established patterns (instanceRef forwarding, refs-for-callbacks so create-once effect stays empty, change-driven state mirroring, code-tab generation, documentation section with sticky on-this-page nav).

- **React wrapper** (`src/components/board/board-react.tsx`):
  - Renders a `<div ref={containerRef} className={className} style={style} data-board-container="">` that serves as the Board's container. The Board class adds `.board-root` on mount.
  - Props: `gridMode`, `gridSize`, `subGridDivisions`, `snapToGrid`, `snapToItems`, `background` (initial-only), `className`, `style`, `onSelection`, `onChange`, `onView`, `instanceRef`. Defaults match the Board's own defaults (dots / 40 / 4 / false / false).
  - Captures initial props in `initialPropsRef` so the create-once effect can stay empty (matches the ToggleGroup pattern).
  - Keeps the latest callbacks in refs (`onSelectionRef`, `onChangeRef`, `onViewRef`) updated via per-prop effects (`React.useEffect(() => { ref.current = cb; }, [cb])`) — NOT during render — to satisfy the React Compiler's "no ref writes during render" rule (the SmartTooltip wrapper used the older `ref.current = cb` during render which now errors under the compiler).
  - Creates the Board instance once on mount (empty deps), subscribes to selection/change/view events with stable handler functions that dispatch through the refs, and unsubscribes + destroys on cleanup.
  - Forwards gridMode/gridSize/subGridDivisions/snapToGrid/snapToItems prop changes via five separate effects that call the imperative setters.

- **Playground** (`src/components/board/board-playground.tsx`):
  - **Page header**: Breadcrumbs, PageOverline ("Components / Layout"), H1, longDescription intro, tags + status badge — all driven by `getComponent("board")!`.
  - **Live canvas panel** (left, `min-h-[640px]`): a `.panel` containing the toolbar, the Board canvas (`h-[520px]`), and the output section.
    - **Toolbar** (two rows, border-b):
      - Row 1: Add Circle / Add Rectangle / Add Triangle (primary lemon buttons), Delete (danger), Fit All / Fit Selection, Reset (right-aligned). Each button has a `title` with the keyboard shortcut.
      - Row 2: Align row of 6 icon buttons (AlignStartVertical / AlignCenterHorizontal / AlignEndVertical / AlignStartHorizontal / AlignCenterVertical / AlignEndHorizontal) + Distribute row of 2 icon buttons (AlignHorizontalDistributeCenter / AlignVerticalDistributeCenter). Each icon button has `aria-label` and a `title` showing the formatted shortcut.
    - **Board canvas**: a `relative h-[520px]` wrapper (`liveAreaRef`) containing the `<BoardReact className="absolute inset-0" instanceRef={boardRef} ...>`. A small hint pill at the bottom describes the pointer interactions.
    - **Output section** (border-t): a sticky-header table of all items showing id (lemon), type, x/y, w×h, rotation, and color (with a swatch). Selected rows are highlighted with `bg-brand-lemon/10`. Empty state prompts the user to add shapes or press 1/2/3.
  - **Property inspector** (right, `.panel`):
    - Grid mode: 3-way segmented (None / Dots / Lines) with lemon-purple-strong active state.
    - Grid size: shadcn `Slider` (10–100, step 2), live value display.
    - Sub-grid divisions: `Slider` (1–8, step 1).
    - Snap to grid / Snap to items: `Switch` toggles with descriptions.
    - Selection info: big lemon count + CopyableValue chips for each selected id.
    - View info: 3-column grid showing zoom (2dp × suffix), panX, panY — updates live as the user pans/zooms.
    - Keyboard shortcuts help: a `Keyboard` icon header + a list of all 14 board commands with their formatted shortcut in a lemon kbd badge.
  - **Code panel** (4 tabs: JavaScript / HTML / CSS / API):
    - JavaScript: live-synced to the current grid/snap state, shows how to construct the Board, add a shape near the view center, wire the ShortcutHandler to all 14 board commands, and subscribe to events.
    - HTML: a minimal `<div id="board" style="height: 520px">` host.
    - CSS: documents that the Board's background comes from the `background` option (not CSS), shows the focus-visible ring override, and the container sizing contract.
    - API: the full TypeScript type surface (ShapeType, GridMode, AlignType, DistributeType, BoardItem, BoardView, BoardOptions, Board class with all 23 methods).
  - **Documentation section**: Overview, When to use it, When not to use it, Properties and defaults table (6 rows), Methods list (21 entries), Events list (3 entries), Keyboard shortcuts table (14 rows driven by `commandRegistry.byIds(BOARD_COMMAND_IDS)`), Local vs global lattices explanation, Accessibility notes (5 bullets), sticky on-this-page nav.
  - **State mirroring**: `items` / `selectedIds` / `view` are mirrored from the Board via the onSelection / onChange / onView callbacks. The onChange callback reads `boardRef.current?.getItems()` to refresh the items array. Toolbar actions (addShape, deleteSelected, align, distribute) also call `setItems`/`setSelectedIds` directly so the UI updates immediately.
  - **Starter items**: a mount effect seeds 3 items (rect/circle/triangle in lemon/lavender/pink) so the canvas isn't empty on first load. The reset() function clears all items and re-seeds the same 3.
  - **addShape placement**: computes the view center in board coords as `((w/2 - panX)/zoom, (h/2 - panY)/zoom)` using the liveAreaRef's clientWidth/Height, then adds a random offset of ±70 board units. Shape size is 90×90, rotation 0, color picked randomly from a 5-color palette (lemon, lavender, pink, mint, amber — no indigo/blue).
  - **Action handler pattern**: all six actions (addShape, deleteSelected, fitAll, fitSelection, align, distribute) are stored in an `actionsRef` that's updated via a render-scoped `React.useEffect` (no deps → runs after every render). The toolbar calls thin wrappers `(type) => actionsRef.current.addShape(type)`. The ShortcutHandler effect has empty deps and dispatches through `actionsRef.current`, so it's created once on mount and never re-attaches. This avoids the React Compiler's "existing memoization could not be preserved" error that `useCallback(fn, [])` with setState calls triggers.

- **Content metadata** (`src/lib/platform/content.ts`): added a `board` entry to the `components` array in the `layout` category with full properties (6), methods (21), events (3), defaults, whenToUse (5), whenNotToUse (4), capabilities (7), and tags. The `getComponent("board")` lookup drives both the playground header and the documentation section.
- **Navigation labels** (`src/store/navigation.ts`): extended the `routeLabel` switch's `component` case to map `board` → "Board". The existing `categoryLabel("layout")` → "Layout" already handled the category segment.
- **Routing** (`src/app/page.tsx`): added the `BoardPlayground` import and a route handler under `case "component"` for `component/layout/board`.
- **Lint**: `bun run lint` — 0 errors, 0 warnings. Initial run had 12 errors: 2 unused `eslint-disable-next-line` directives (removed) and 10 React Compiler errors (`react-hooks/refs` for ref writes during render in board-react.tsx, `react-hooks/preserve-manual-memoization` for `useCallback(fn, [])` with setState calls in the playground). Fixed by: (1) switching board-react.tsx to the ToggleGroup pattern of updating callback refs via per-prop effects; (2) replacing the playground's `useCallback` action handlers with an `actionsRef` updated via a no-deps effect, with thin stable wrappers for the toolbar and an empty-deps ShortcutHandler effect that dispatches through the ref.

Stage Summary:
- New Layout-category component established: Board — an infinite-canvas component with pan/zoom, dot/line grid system, sub-grid divisions, snap-to-grid and snap-to-items, rubber-band multi-select, per-item drag, and align/distribute/fit commands. Renders to a single <canvas> inside a fixed-height container.
- The playground wires all 14 board.* commands from the shared command registry to a scoped ShortcutHandler, so the keyboard shortcuts (1/2/3 to add shapes, Delete to remove, Shift+Cmd+L/E/R/T/M/B to align, Shift+Cmd+H/J to distribute, Cmd+0 / Shift+Cmd+0 to fit) work globally while the playground is mounted.
- The Board appears in the sidebar under Layout → Board and in the Components directory under the Layout category, since the Sidebar dynamically builds groups from `categories` + `components` in content.ts.
- `bun run lint` — 0 errors, 0 warnings. `GET /` returns 200.
- Files created:
  - `src/components/board/board-react.tsx` (React wrapper, ~160 lines)
  - `src/components/board/board-playground.tsx` (playground view, ~1140 lines)
- Files modified:
  - `src/lib/platform/content.ts` (added board metadata in the layout category)
  - `src/store/navigation.ts` (added board slug → "Board" label mapping in `routeLabel`)
  - `src/app/page.tsx` (added BoardPlayground import + route handler for `component/layout/board`)
- Files unchanged:
  - `src/lib/components/board/board.ts` (vanilla JS Board class — already complete from a prior task)
  - `src/lib/components/board/index.ts` (barrel exports — already complete)

---
Task ID: 25 (summary)
Agent: main + subagent
Task: Build Board component — infinite canvas with grid, shapes, lattices, alignment commands

Work Log:
- **Vanilla JS Board component** (`src/lib/components/board/board.ts`): ~900-line canvas-based infinite board with:
  - Infinite pan (Space+drag or middle-click) and zoom (Ctrl/Cmd+scroll or pinch)
  - Grid system: dots mode (main + sub-grid dots with different opacity), lines mode (main + sub-grid lines), or none. Configurable grid size and sub-grid divisions.
  - Snap to grid and snap to items (snaps to other items' edges and centers within a threshold)
  - Board items: circle, rect, triangle shapes with position, size, rotation, and color
  - Selection: single click, shift-click (additive), rubber-band drag (multi-select)
  - Per-item lattices: local lattice (rotated bounding box, dashed lemon) and global lattice (axis-aligned AABB without rotation, dashed purple). Both rendered when an item is selected.
  - Alignment commands: align left/center-h/right/top/center-v/bottom (uses global lattices)
  - Distribution commands: distribute horizontal/vertical (even spacing between items)
  - Fit commands: zoomToFit (all items), zoomToFitSelection
  - Keyboard: Delete/Backspace removes selected, Escape clears selection, arrows nudge (Shift=10px), Space=pan mode
  - Full public API with events: selection, change, view
- **Board commands registered**: 14 commands in the "Board" category — 6 align, 2 distribute, 2 fit, 3 add-shape, 1 delete. Each with keyboard shortcuts (e.g. ⇧⌘L for align-left, 1/2/3 for add shapes, Delete for delete).
- **React wrapper + playground** (built by subagent): Full playground with:
  - Toolbar: Add Circle/Rect/Triangle, Delete, Fit All/Selection, 6 align buttons, 2 distribute buttons
  - Property inspector: grid mode, grid size, sub-grid divisions, snap-to-grid, snap-to-items toggles, selection info, view stats
  - Output table: all items with type/position/size/rotation/color, selected rows highlighted
  - Keyboard shortcuts help section listing all 14 board commands
  - ShortcutHandler scoped to board commands, wired to the Board instance
  - Code panel (JS/HTML/CSS/API) + documentation section
- VLM-verified: Board canvas renders, 3 shapes added successfully, items table shows 3 entries.

Stage Summary:
- Board component established: infinite canvas with pan/zoom, grid (dots/lines/none), sub-grid, snapping (grid + items), 3 shape types, multi-selection, local + global lattices, alignment + distribution + fit commands.
- 14 board commands registered with keyboard shortcuts, wired via ShortcutHandler.
- Appears in sidebar under Layout → Board.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 1 (board-transform)
Agent: board-transform-subagent
Task: Enhance the Board component with rotation/resize handles, pivot positions, and transform modes

Work Log:
- Read `/home/z/my-project/worklog.md` (Tasks 1–25) to lock the design system (Obsidian #101014 + Deep Violet #211A30 + Lemon Signal #D9FF66, no indigo/blue), the navigation model, and the existing Board playground conventions.
- Read the full existing `src/lib/components/board/board.ts` (844 lines), `src/components/board/board-react.tsx`, and `src/components/board/board-playground.tsx` to understand the structure before making targeted edits.

- **`src/lib/components/board/board.ts`** (844 → 1442 lines, targeted edits — no full rewrite):
  - Added new exported types: `PivotPosition` (9 variants), `TransformMode` ("global" | "local"), `LatticeDisplay` ("local" | "global" | "both").
  - Extended `BoardItem` with `pivotX` and `pivotY` (0–1, default 0.5/0.5 = center). The pivot is the point around which rotation happens and which stays fixed during resize.
  - Extended `BoardOptions` with `transformMode` (default "global"), `selectionPivot` (default "center"), `latticeDisplay` (default "local"). Updated `DEFAULTS` and the constructor to read them.
  - Updated `addItem()` to initialize `pivotX: 0.5, pivotY: 0.5` on every new item.
  - Added 5 new public API methods: `setTransformMode(mode)`, `setLatticeDisplay(mode)`, `setSelectionPivot(pivot)`, `rotateSelected(degrees)` (delta rotation), `resizeSelected(scaleX, scaleY)` (factor scale). Both transform methods branch on global vs local mode.
  - Added a `HandleName` union ("nw"|"n"|"ne"|"e"|"se"|"s"|"sw"|"w") and screen-pixel visual constants (ROTATE_HANDLE_OFFSET_PX=24, HANDLE_SIZE_PX=8, ROTATE_HANDLE_RADIUS_PX=5, HANDLE_HIT_RADIUS_PX=12, PIVOT_CROSSHAIR_RADIUS_PX=6) plus a `HANDLE_CURSORS` map for per-handle cursor styling.
  - Extended `pointerState` to support `"rotate"` and `"resize"` modes with snapshot fields (`startItems`, `startBoardX/Y`, `startRotation`, `resizeHandle`, `startSelectionPivot`, `startSelectionLattice`).
  - Added pivot/lattice math helpers: `getItemPivotBoard(item)`, `getLatticePivotBoard(lattice, px, py)`, `boardToLatticeLocal(bx, by, lattice)`, `getSelectionLattice()` (single item → local lattice; multi → combined AABB of all global lattices), `getSelectionPivotPosition()` (9-position map), `getHandleLocalPos(handle, lattice)`, `getLatticeHandles(lattice)` (8 resize + 1 rotation handle board positions), `hitTestHandles(bx, by)`.
  - Added transform helpers: `rotateItemAround(item, pivot, degrees)`, `scaleItemFromSelectionPivot(item, pivot, sx, sy)` (global mode — item position moves with pivot), `scaleItemFromOwnPivot(item, pivot, sx, sy)` (local mode — pivot board position stays fixed by translating the center).
  - Added gesture methods `startRotateMode`, `startResizeMode`, `applyRotate`, `applyResize`. `applyRotate` computes the angle delta from the pivot to the pointer (global: single selection pivot; local: per-item own pivot, resetting each item to its start state before applying the delta so the gesture is non-compounding). `applyResize` converts the pointer into lattice-local coords and computes scale factors per dimension based on which handle is dragged (corner handles affect both axes, edge handles affect one), with a guard against division-by-zero when the handle coincides with the pivot.
  - Updated `onPointerDown` to check transform handles (rotate first, then resize) before hit-testing items — only when `latticeDisplay !== "global"`.
  - Updated `onPointerMove` to handle rotate/resize modes and to update the hover cursor when no gesture is active (new `updateHoverCursor` method sets grab/nwse/nesw/ns/ew/move/default based on what's under the pointer).
  - Updated `onPointerUp` to emit `"rotate-end"` / `"resize-end"` change events and refresh the hover cursor.
  - Replaced the per-item `renderLattices(item)` loop with a single `renderSelectionOverlay()` call. The overlay: (1) for single selection draws the rotated local lattice (dashed lemon) and/or global AABB (dashed purple) gated by `latticeDisplay`; (2) for multi-selection draws the combined AABB in lemon and/or purple; (3) when the local lattice is shown, draws 8 white resize handles (dark Obsidian border), a lemon rotation handle above the top edge connected by a line, and a lemon pivot crosshair (at the selection pivot in global mode, or at each item's own pivot in local mode). All handle/crosshair sizes use `/zoom` so they stay a constant on-screen size regardless of zoom.

- **`src/lib/components/board/index.ts`**: added `PivotPosition`, `TransformMode`, `LatticeDisplay` to the type re-exports.

- **`src/components/board/board-react.tsx`** (160 → 199 lines):
  - Imported and re-exported the new types.
  - Added `transformMode`, `latticeDisplay`, `selectionPivot` props (initial + forwarded) with defaults matching the Board's own defaults ("global" / "local" / "center").
  - Captured the new props in `initialPropsRef` and passed them to the `Board` constructor in the create-once effect.
  - Added three forwarding effects (`setTransformMode`, `setLatticeDisplay`, `setSelectionPivot`) mirroring the existing `setGridMode`/`setGridSize` pattern.

- **`src/components/board/board-playground.tsx`** (1141 → 1408 lines):
  - Extended `PlaygroundState` with `transformMode`, `latticeDisplay`, `selectionPivot` and updated `DEFAULTS`. Added a `rotationValue` state for the rotation slider/input.
  - Added `LATTICE_DISPLAY_OPTIONS`, `TRANSFORM_MODE_OPTIONS`, and `PIVOT_POSITIONS` (9 entries with row/col for the 3×3 grid) constants.
  - Forwarded the three new props to `<BoardReact>`.
  - Added a selection-sync effect that sets `rotationValue` to the first selected item's rotation whenever the selection changes.
  - Added an `applyRotation(newRotation)` handler that computes the delta from the first selected item's current rotation and calls `board.rotateSelected(delta)`.
  - Added a new **Transform** section in the property inspector (between Snap toggles and Selection info) containing:
    - **Lattice display**: 3-way segmented toggle (Local / Global / Both) with Deep Violet active state.
    - **Transform mode**: 2-way segmented toggle (Global / Local).
    - **Selection pivot**: 3×3 button grid showing the 9 pivot positions as dots, active one highlighted lemon; disabled when transform mode is Local (since local mode uses per-item pivots).
    - **Rotation**: numeric input (−360…360) + shadcn Slider (−180…180) bound to `rotationValue`; calls `applyRotation` on change; disabled when no selection.
  - Extended the Selection info card to show the active selection pivot, transform mode, and the first selected item's pivotX/pivotY.
  - Added a `pivot` column to the output items table (shows `pivotX,pivotY` to 2 dp).
  - Updated the canvas hint pill to mention the rotation/resize handles.
  - Updated `reset()` to also reset `rotationValue` to 0.
  - Updated `generateJsCode()` to include the three new constructor options (live-synced).
  - Updated `generateApiCode()` to include the new types (`PivotPosition`, `TransformMode`, `LatticeDisplay`), the new `BoardItem` fields (`pivotX`, `pivotY`), the new `BoardOptions` fields, and the 5 new transform methods.
  - Added a "Transform: pivots, rotation, and resize" documentation section explaining pivots, global vs local transform modes, the 8 resize handles + rotation handle, the pivot crosshair, and the programmatic API. Added it to the on-this-page nav.

- **Lint**: `bun run lint` — 0 errors, 0 warnings. `bunx tsc --noEmit` — no board-related errors (only pre-existing errors in unrelated color-circle/websocket/skills files). Dev server `GET /` returns 200.

Stage Summary:
- Board component now supports per-item pivots (`pivotX`/`pivotY`), 9 selection pivot positions, global vs local transform modes, and 3 lattice display modes.
- Interactive rotation (lemon handle above the top edge) and resize (8 white square handles on edges/corners) work for both single and multi-selection, with the pivot point drawn as a lemon crosshair.
- Programmatic API: `setTransformMode`, `setLatticeDisplay`, `setSelectionPivot`, `rotateSelected(degrees)`, `resizeSelected(scaleX, scaleY)`.
- Playground property inspector exposes all new options with a 3×3 pivot grid, rotation slider + numeric input, and live pivot info for the selection.
- Files modified:
  - `src/lib/components/board/board.ts` (844 → 1442 lines)
  - `src/lib/components/board/index.ts` (added 3 type exports)
  - `src/components/board/board-react.tsx` (160 → 199 lines)
  - `src/components/board/board-playground.tsx` (1141 → 1408 lines)

---
Task ID: 26 (summary)
Agent: main + subagent
Task: Enhance Board with rotation/resize handles, pivot system, transform modes

Work Log:
- **Pivot position on items**: Added `pivotX` and `pivotY` (0–1, default 0.5 = center) to `BoardItem`. The pivot is the point around which rotation happens and which stays fixed during resize.
- **Transform mode**: Added `transformMode` option — "global" (transforms apply to the selection as a whole, using the selection area's pivot) or "local" (transforms apply per-item, using each item's own pivot). Default: "global".
- **9 selection pivot positions**: Added `selectionPivot` option — one of center, top-left, top-center, top-right, middle-left, middle-right, bottom-left, bottom-center, bottom-right. This determines which point of the selection bounding box is used as the pivot for global transforms. Default: "center".
- **Lattice display mode**: Added `latticeDisplay` option — "local" (show only the rotated bounding box with handles), "global" (show only the AABB), or "both". Default: "local".
- **Rotation handle**: When the local lattice is displayed and items are selected, a lemon rotation handle is drawn above the top edge of the local lattice (a small circle connected by a line). Dragging this handle rotates the selected item(s). For multi-selection with global transform mode, rotates around the selection pivot. For local mode, each item rotates around its own pivot.
- **Resize handles**: 8 resize handles (4 corners + 4 edge midpoints) drawn on the local lattice as small white squares with dark borders. Dragging a handle resizes the selected item(s). For multi-selection with global transform mode, scales all items proportionally from the selection pivot. For local mode, each item resizes independently.
- **Pivot crosshair**: The pivot point is drawn as a small lemon crosshair marker on the selection.
- **New public API**: `setTransformMode`, `setLatticeDisplay`, `setSelectionPivot`, `rotateSelected(degrees)`, `resizeSelected(scaleX, scaleY)`.
- **New types exported**: `PivotPosition`, `TransformMode`, `LatticeDisplay`.
- **Pointer interaction**: `onPointerDown` checks handles before item hit-testing; `onPointerMove` handles rotate/resize modes with hover cursor changes; `onPointerUp` emits rotate-end/resize-end events.
- **Playground updated**: Property inspector now has a Transform section with lattice display 3-way toggle, transform mode 2-way toggle, 3×3 selection pivot grid (with active position highlighted), rotation slider + numeric input. Selection info card shows active pivot, transform mode, and item pivot coordinates. Output table has a pivot column.
- VLM-verified: Board loads, items can be added, property inspector shows Lattice/Transform/Pivot sections, 17 aria-pressed buttons in inspector (includes 9 pivot positions + toggles).
- `bun run lint` — 0 errors, 0 warnings.

Stage Summary:
- Board now has full rotation/resize handle system on the local lattice (8 resize handles + 1 rotation handle).
- Each item has a pivot position; transforms can be global (by selection area pivot) or local (by each item's own pivot).
- 9 selection pivot positions available (center, 8 edge/corner positions).
- Lattice display can be toggled: local only, global only, or both.
- All new API methods and types exported.

---
Task ID: 27
Agent: main
Task: Fix directional resize, allow negative/flip, add min/max bounds

Work Log:
- **Directional resize (fixed edge)**: Completely rewrote `applyResize()` to use directional resizing — when you drag a handle, the **opposite edge stays fixed** while the dragged edge moves. This is how Figma/Excalidraw work. The previous implementation used scale-from-pivot which caused symmetric resizing (both edges moved toward/away from center). The new implementation:
  - For "e" handle → west edge fixed, only width changes from the right
  - For "w" handle → east edge fixed, only width changes from the left
  - For "n" handle → south edge fixed, only height changes from the top
  - For "s" handle → north edge fixed, only height changes from the bottom
  - Corner handles (nw/ne/se/sw) fix the opposite corner
  - Works in both global mode (selection lattice) and local mode (per-item lattice)
- **Negative dimensions (flip)**: Removed the `Math.max(2, ...)` clamp that prevented widths/heights below 2px. Now dimensions can go negative — when a handle is dragged past the opposite edge, the width/height becomes negative, which flips the shape. The rendering uses `ctx.scale(flipX, flipY)` to visually flip the shape when dimensions are negative. The lattice methods (`getLocalLattice`, `getGlobalLattice`) use `Math.abs()` so bounds calculations are correct regardless of sign.
- **Min/max bounds per item**: Added optional `minWidth`, `minHeight`, `maxWidth`, `maxHeight` to `BoardItem`. The `addItem` method accepts an optional `bounds` parameter. Added `applyItemBounds()` method that clamps the item's dimensions to its bounds after resize, adjusting the position so the fixed edge stays in place. Bounds preserve the flip sign (negative dimensions are clamped by magnitude, not sign).
- **Rendering fix**: `renderItem()` now uses `Math.abs()` for shape geometry and applies `ctx.scale(flipX, flipY)` for negative dimensions, so flipped shapes render correctly.

Stage Summary:
- Resize is now directional (opposite edge fixed, like Figma/Excalidraw).
- Items can be resized to negative values (flip effect) without breaking bounds.
- Optional min/max width/height bounds per item, applied after resize with position adjustment.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 28
Agent: main
Task: Fix resize after rotation + make Board expand to fill live canvas

Work Log:
- **Fixed resize instability after rotation**: The root cause was that in local resize mode, `halfW = start.width / 2` used the raw (possibly negative) width, while `getLocalLattice()` returns `Math.abs(width)`. This mismatch between the local pointer coordinates (computed from the lattice using abs values) and the halfW/fixedLocalX (using raw values) caused the resize to jump when the item was rotated. Fixed by using `lattice.w / 2` (which is always abs) for all geometric calculations in the local resize mode. Also fixed the global resize mode to use `Math.abs(start.width)` when computing the new width, preserving the flip sign separately. The new center position is computed from the lattice center (not `start.x/y`) using `lattice.x + lattice.w / 2` for consistency.
- **Made Board expand to fill live canvas**: The Board's scoped CSS had `.board-root { display: block; position: relative; }` which overrode the `absolute inset-0` positioning class applied by the React wrapper. Removed the `display: block` and `position: relative` from the scoped CSS so the React wrapper's Tailwind classes (`absolute inset-0`) take effect. Also changed the playground's live canvas container from `h-[520px]` (fixed height) to `flex-1` (expands to fill remaining space in the panel). The panel section uses `min-h-[700px] flex-1 flex-col` so the toolbar takes its natural height and the board canvas expands to fill the rest. Verified: board-root now renders at 534×395px (filling the available space) instead of 534×150px (fixed/cut off).

Stage Summary:
- Resize is now stable after rotation — all geometric calculations use absolute dimensions from the lattice, with flip signs preserved separately.
- Board expands to fill the live canvas area (uses flex-1 instead of fixed height, and the scoped CSS no longer overrides positioning).
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 29
Agent: main
Task: Move resize handles to global lattice (AABB) instead of local lattice

Work Log:
- **Created `getSelectionAABB()` method**: Returns the global axis-aligned bounding box (AABB, rotation=0) for the selection — for single items it's the AABB of the rotated rect, for multi-selection it's the combined AABB. This is separate from `getSelectionLattice()` which returns the local lattice (rotated bounding box) for single items.
- **Moved resize handles to the global AABB**: 
  - `hitTestHandles()`: Resize handles now hit-test against the global AABB (rotation=0). The rotation handle still hit-tests against the local lattice (rotated bounding box).
  - `startResizeMode()`: Snapshots the global AABB as `startSelectionLattice` instead of the local lattice.
  - `applyResize()`: Completely rewritten to use the AABB directly — since the AABB has rotation=0, board coordinates = local coordinates. No `boardToLatticeLocal` conversion needed, no cos/sin transforms. The resize math is now: `newW = bx - fixedX` (for east handle), `fixedX` is the left edge of the AABB. Scale factors `sx = newW / aabb.w` are applied to each item's position and size relative to the fixed edge. This is stable regardless of item rotation.
  - `renderSelectionOverlay()`: Resize handles are drawn on the global AABB, rotation handle on the local lattice.
- **Why this is more stable**: The previous implementation converted the pointer to the local lattice's rotated frame using `boardToLatticeLocal`, then computed widths/positions in that rotated frame. Any rounding errors in the rotation conversion would compound during drag, causing jitter. With the AABB (rotation=0), the pointer position is used directly — no conversion, no compounding errors.

Stage Summary:
- Resize handles are now on the global lattice (AABB, axis-aligned) — no rotation conversion needed, so resize is stable at any rotation angle.
- Rotation handle stays on the local lattice (rotated bounding box) — rotation is about the item's own axis.
- The resize math is dramatically simpler: just `newW = pointer.x - fixedEdge.x` since the AABB has no rotation.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 30
Agent: main
Task: Fix resize displacement after rotation — compute position from new AABB

Work Log:
- **Root cause identified**: When an item is rotated, its AABB width = `|w·cos(θ)| + |h·sin(θ)|` — this is NOT proportional to the item's width `w` alone. The previous code scaled the item's position by the AABB scale factor `sx` (from `newW / aabb.w`) and also scaled the item's width by `sx`. But since the AABB width depends on both `w` and `h` (and `θ`), scaling `w` by `sx` doesn't produce an item whose new AABB has width `newW`. The mismatch between the expected AABB and the actual AABB of the resized item causes the item to drift on each frame of the drag.
- **Fix**: Rewrote the per-item resize math in `applyResize()`:
  1. Compute the new item width/height by scaling the start values by `sx`/`sy` (same as before).
  2. Compute the **new AABB** for the item using the new width/height and the item's rotation: `newAabbW = newW·|cos(θ)| + newH·|sin(θ)|`.
  3. Compute the **start AABB** for the item similarly.
  4. Compute the item's start AABB left edge offset from the fixed selection edge: `startOffset = startItemLeft - fixedBoardX`.
  5. Scale this offset by `sx`: `newOffset = startOffset * sx`.
  6. Position the item center at: `item.x = fixedBoardX + newOffset + newAabbW / 2`.
  
  This ensures the item's AABB edge maintains its proportional position relative to the fixed selection edge, and the item center is computed from the NEW AABB (not the old position scaled). The fixed edge stays truly fixed, and the item doesn't drift.

Stage Summary:
- Resize no longer displaces rotated items. The item's position is computed from its new AABB dimensions and the proportional offset from the fixed edge, not by blindly scaling the old position.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 1
Agent: docs
Task: Create AGENT.md and SKILL.md documentation files for the Workshop component library

Work Log:
- Read worklog.md to understand the project: a Next.js 16 documentation/showcase platform for a vanilla JS UI component library. 10 components shipped (color-wheel, color-range, color-circle, color-ramp, custom-button, periodic-range, toggle-group, smart-context-menu, smart-tooltip, board) plus two cross-cutting modules (commands, platform).
- Read each component's source file to capture accurate architecture notes, key algorithms, and known issues:
  - color-wheel/color-wheel-picker.ts (1346 lines) + color-utils.ts (308 lines)
  - color-range/color-range.ts (840 lines)
  - color-circle/color-circle.ts (689 lines) + harmony-engine.ts (213 lines)
  - color-ramp/color-ramp.ts (524 lines)
  - custom-button/custom-button.ts (483 lines)
  - periodic-range/periodic-range.ts (898 lines)
  - toggle-group/toggle-group.ts (804 lines)
  - smart-context-menu/smart-context-menu.ts (668 lines)
  - smart-tooltip/smart-tooltip.ts (480 lines)
  - board/board.ts (1582 lines)
  - commands/registry.ts (117) + shortcuts.ts (162) + index.ts (85)
  - platform/content.ts (784)
- Created 26 markdown files total (verified by listing):

  Root (2):
  - /home/z/my-project/AGENT.md — contribution router. Project overview, tech stack, architecture (3-layer split: vanilla core in src/lib/components, React wrappers in src/components/<name>, playgrounds in src/components/<name>), design system (Obsidian #101014 + Deep Violet #211A30 + Lemon Signal #D9FF66, dark default), contribution guidelines (how to add a new component — 10-step checklist, how to modify, debugging tips), coding conventions, known issues section including the verbatim Board resize-at-rotation drift text required by the task, file structure overview, per-folder AGENT.md router table.
  - /home/z/my-project/SKILL.md — usage router. Project overview, install/integration (bundler / plain HTML / React), component inventory table with links to per-component SKILL.md, commands system overview, platform metadata overview, design system summary, "choosing a component" decision table, universal API shape reference.

  Per-component AGENT.md (10) — each contains: component name + purpose, file structure, architecture notes (canvas/DOM, caching strategy, pointer state machine, event emitter), key algorithms & math (HSV conversion, hue mapping, barycentric triangle, harmony offsets, AABB vs local lattice, etc.), known issues + TODOs, how to extend/modify, cross-references to React wrapper / playground / metadata / commands.

  Per-component SKILL.md (10) — each contains: one-line description, install/import instructions, full API reference in tables (constructor options, public methods, events with payloads), code examples (basic + advanced + React wrapper + keyboard interaction), integration notes (plain HTML / React / Vue / SSR / theming / accessibility), related components.

  Cross-cutting modules (4):
  - src/lib/commands/AGENT.md — registry singleton internals, shortcut matching (exact modifier matching, key normalization), how to add commands (built-in via index.ts or runtime via defineCommand), digit-key collision caveat, ShortcutHandler window-listener behavior.
  - src/lib/commands/SKILL.md — commandRegistry API table, shortcut utility functions (formatShortcut, shortcutParts, eventMatchesShortcut, findCommandForEvent), ShortcutHandler class API, code examples for registering custom commands / wiring shortcuts / scoping to a component / rendering shortcuts in UI, built-in command categories table.
  - src/lib/platform/AGENT.md — content.ts module structure, all exported types (ComponentMeta, CategoryMeta, ExampleMeta, ChangelogEntry, DocSection), how to add a component/category/example/changelog entry/docs section, known issues (manual sync drift, plannedComponents migration, no build-time slug validation).
  - src/lib/platform/SKILL.md — exported data shapes, lookup helpers (getComponent, getCategory, componentsByCategory), code examples for rendering directory / API reference / category nav / changelog / when-to-use guidance, integration notes (server-safe, single source of truth, stable slugs).

- Writing style: clear technical writing, code blocks for examples, tables for API references, specific file paths and function names, NO emojis (verified by script — all 26 files clean). Did not create any TypeScript/JavaScript files. Did not modify any existing source files.

- Known issue captured as required: the root AGENT.md "Known Issues (Global)" section includes the verbatim text "Board's items resizing displacement at non-0 rotation — the AABB-based resize math doesn't perfectly maintain item position when items are rotated. The current approach computes new AABB dimensions and positions the item center from the new AABB, but small drift can still occur during continuous drag. Needs a more robust approach, possibly tracking the item's corner positions in board space directly." The board/AGENT.md has a more detailed version with the exact location (applyResize around line 1030) and the math explanation.

- Agent-ctx record written at /home/z/my-project/agent-ctx/1-docs.md.

Stage Summary:
- 26 documentation files created (2 root + 10 component AGENT.md + 10 component SKILL.md + 2 commands + 2 platform).
- All files are non-empty, emoji-free, and use relative links that match the actual file structure.
- Root AGENT.md serves as a contribution router pointing to per-folder AGENT.md files; root SKILL.md serves as a usage router pointing to per-folder SKILL.md files.
- Per-component AGENT.md files document internals (architecture, algorithms, known issues, extension points) for contributors.
- Per-component SKILL.md files document usage (install, API, examples, integration) for consumers.
- The required Board resize-at-rotation known issue is captured verbatim in the root AGENT.md and elaborated in board/AGENT.md.
- No source files modified; no TypeScript/JavaScript files created; only .md files added.

---
Task ID: 3
Agent: playgrounds-integration
Task: Update each component playground to use the new AgentSkillTabs component for the properties panel (Properties / AGENT / SKILL tabs)

Work Log:
- Read worklog.md and the existing `src/components/platform/agent-skill-tabs.tsx` component to understand the integration contract. The component renders a tab bar (Properties — elevated h-11 with a lemon dot; AGENT — h-9 with FileCode icon; SKILL — h-9 with BookOpen icon) and wraps children in `<div className="flex flex-col gap-5 p-4">` inside a `flex-1 overflow-y-auto` content area. AGENT.md / SKILL.md are lazy-loaded via `fetch(agentPath)` / `fetch(skillPath)` on first tab activation.
- Inspected all 10 playground files to map the `<aside aria-label="Property inspector">` structure. Each file had the same 5-line opening pattern (`<aside>` + Properties eyebrow header + inner content div) and the same 2-line closing pattern (`</div></aside>` at 12/10-space indentation, distinct from the documentation aside's 6-space closing). The inner content div class varied per file (see table below).
- For each playground, applied the same structural transformation via MultiEdit (3 edits per file):
  1. Added `import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";` after the `@/components/platform/code-block` import.
  2. Replaced the 5-line opening (`<aside>` + eyebrow header + inner content div) with `<AgentSkillTabs agentPath="..." skillPath="...">`.
  3. Replaced the 2-line closing (`</div></aside>`) with `</AgentSkillTabs>`.
  The existing property fields, sliders, toggles, sections, and (for board) the nested "Buttons" section were preserved verbatim as children of `AgentSkillTabs`.
- Inner content div class variations handled (all stripped in favor of AgentSkillTabs's built-in `flex flex-col gap-5 p-4` wrapper inside `overflow-y-auto`):
  - `flex flex-col gap-5 p-4` — color-wheel, color-range, color-circle, color-ramp
  - `flex flex-col gap-5 p-4 max-h-[640px] overflow-y-auto` — custom-button
  - `flex max-h-[640px] flex-col gap-5 overflow-y-auto p-4` — periodic-range
  - `flex max-h-[640px] flex-col gap-6 overflow-y-auto p-4` — toggle-group, smart-context-menu, smart-tooltip, board
  Net effect: the four `gap-6` playgrounds now render at `gap-5` (4px tighter spacing); the `max-h-[640px]`/`overflow-y-auto` are no longer needed because AgentSkillTabs provides `flex-1 overflow-y-auto`.
- Fixed a pre-existing JSDoc syntax error in `src/components/platform/agent-skill-tabs.tsx` (line 18). The JSDoc usage example contained `{/* Properties content here */}`, and the `*/` sequence prematurely terminated the JSDoc block comment, causing ESLint parsing errors (TS1128/TS1109/TS1161) and blocking `bun run lint`. Changed the line to `*     Properties content here` (removed the JSX-comment `{*/ */}` markers). This is a documentation-only change — no logic, props, or rendering was altered. Without this fix, lint could not pass for the entire project.

Files modified (11 total):
- src/components/color-wheel/color-wheel-playground.tsx
- src/components/color-range/color-range-playground.tsx
- src/components/color-circle/color-circle-playground.tsx
- src/components/color-ramp/color-ramp-playground.tsx
- src/components/custom-button/custom-button-playground.tsx
- src/components/periodic-range/periodic-range-playground.tsx
- src/components/toggle-group/toggle-group-playground.tsx
- src/components/smart-context-menu/smart-context-menu-playground.tsx
- src/components/smart-tooltip/smart-tooltip-playground.tsx
- src/components/board/board-playground.tsx
- src/components/platform/agent-skill-tabs.tsx (JSDoc comment fix only — line 18)

Stage Summary:
- All 10 component playgrounds now use `<AgentSkillTabs>` for the properties panel, with per-component `agentPath` / `skillPath` pointing at the AGENT.md / SKILL.md files created by Task 1.
- The properties panel is now a 3-tab interface: Properties (elevated, lemon dot), AGENT (markdown), SKILL (markdown). AGENT/SKILL tabs lazy-load their markdown on first activation.
- No component logic was changed; no new files were created; no emojis were added.
- `bun run lint` passes with 0 errors, 0 warnings (after the JSDoc fix).
- `npx tsc --noEmit` introduces no new errors — remaining TS errors are all pre-existing and in files not touched by this task (examples/websocket, skills/*, color-circle GridMode export, color-circle-playground setBaseIndex).
- Dev server compiles successfully (`✓ Compiled in 1163ms`).
- `aria-label="Property inspector"` no longer appears in any playground file (verified via grep — 0 matches).
- Agent-ctx record written at /home/z/my-project/agent-ctx/3-agent-skill-tabs.md.

---
Task ID: 31 (summary)
Agent: main + subagents
Task: Create AGENT/SKILL markdown system + tabbed properties panel with AGENT/SKILL tabs

Work Log:
- **Root AGENT.md** (`/home/z/my-project/AGENT.md`): Contribution router with project overview, tech stack, architecture, design system, contribution guidelines (10-step checklist), known issues section (including board resize-at-rotation displacement issue), file structure overview, and per-folder AGENT.md router table.
- **Root SKILL.md** (`/home/z/my-project/SKILL.md`): Usage router with project overview, install/integration instructions, component inventory table, commands system overview, design system summary.
- **26 AGENT.md + SKILL.md files** created across all component folders (10 components × 2 files each = 20), commands folder (2), platform folder (2), plus root (2). Each AGENT.md describes internals/contribution; each SKILL.md describes usage/API/examples.
- **MarkdownRenderer component** (`src/components/platform/markdown-renderer.tsx`): Renders markdown with the project's typography using `react-markdown` + Tailwind classes for headings, code blocks, tables, lists, etc.
- **AgentSkillTabs component** (`src/components/platform/agent-skill-tabs.tsx`): Tabbed panel with 3 tabs — Properties (elevated, h-11, lemon dot), AGENT (h-9, FileCode icon, fetches AGENT.md), SKILL (h-9, BookOpen icon, fetches SKILL.md). Lazy-loads markdown content via fetch when tab is activated.
- **10 playgrounds updated**: All component playgrounds now use `<AgentSkillTabs>` instead of `<aside>` for the properties panel. The existing property fields become children of the Properties tab; AGENT and SKILL tabs render the markdown content.
- **Markdown files copied to `public/docs/components/`**: Since Next.js dev server doesn't serve files from `src/`, the markdown files are copied to `public/docs/components/<name>-AGENT.md` and `<name>-SKILL.md` for static serving. All playground paths updated to use `/docs/components/<name>-AGENT.md` format.
- VLM-verified: Color Wheel playground shows Properties/AGENT/SKILL tabs. Clicking AGENT loads the AGENT.md content; clicking SKILL loads the SKILL.md content.
- `bun run lint` — 0 errors, 0 warnings.

Stage Summary:
- AGENT/SKILL markdown system established: root files route to per-folder files, same mechanism for both AI agents (contribution) and skills (usage).
- Each component playground has a tabbed properties panel with Properties (main/elevated), AGENT (markdown), and SKILL (markdown) tabs.
- Root AGENT.md mentions the known board resize-at-rotation displacement issue.

---
Task ID: 32
Agent: main
Task: Fix panel heights, accent tab, markdown tables, collapsible nested component sections

Work Log:
- **Fixed height panels**: Changed all live canvas panels from `min-h-[480px] flex-col` (grows infinitely) to `h-[600px] flex-col overflow-hidden` (fixed height with internal scroll). Added `lg:items-start` to the grid containers so panels don't stretch to equal height. Added `min-h-0` to preview areas so they don't expand. The AgentSkillTabs panel uses `h-[600px] max-h-[600px] overflow-hidden` with `overflow-y-auto` on the content area for vertical scrolling of long content.
- **Properties tab accent color**: Changed the Properties tab button from `text-foreground` to `text-brand-lemon` when active, and the dot indicator changes from `bg-muted-foreground/40` to `bg-brand-lemon` when active. Verified: color is `rgb(217, 255, 102)` (lemon green).
- **Fixed broken markdown tables**: Installed `remark-gfm` plugin (GitHub Flavored Markdown) and added `remarkPlugins={[remarkGfm]}` to the ReactMarkdown component. This enables proper rendering of tables, strikethrough, task lists, and other GFM syntax. Verified: AGENT tab now shows 2 properly formatted tables.
- **Collapsible nested component sections**: Created `CollapsibleSection` component in `agent-skill-tabs.tsx` — a collapsible panel with a chevron + icon + title header that expands/collapses. Added to:
  - **PeriodicRange**: "Thumb Style" collapsible section with thumb variant, thumb size, thumb border properties (nested CustomButton-style properties).
  - **ToggleGroup**: "Button Style" collapsible section with button variant and button size properties (nested CustomButton properties).
  Both sections start collapsed and can be expanded by clicking the header. This matches the Figma/Godot pattern where nested component properties appear in collapsible sections under the main component's properties.

Stage Summary:
- Live canvas and properties panels now have fixed height (600px) with vertical scrolling.
- Properties tab uses lemon green accent color when active.
- Markdown tables render correctly via remark-gfm.
- Components that contain other components (PeriodicRange → thumbs, ToggleGroup → buttons) have collapsible nested component property sections.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 3
Agent: nodes-graph-playground-agent
Task: Build the NodesGraph playground and add it to the content metadata + routing.

Work Log:
- Read worklog.md and existing playgrounds (board-playground.tsx) to learn the platform conventions: panel chrome, AgentSkillTabs usage, Breadcrumbs/PageOverline, CodeBlock, Code/JS/HTML/CSS/API tabs, documentation section, lucide icons.
- Read the NodesGraph API in src/lib/components/nodes-graph/nodes-graph.ts and the React wrapper src/components/nodes-graph/nodes-graph-react.tsx to confirm the addNode/addPath/setMode/getNodes/getPaths surface and the "absolute inset-0" container contract.
- Created src/lib/components/nodes-graph/AGENT.md and SKILL.md (component architecture, file structure, mode/shape/label semantics, type-matching, code examples, integration notes).
- Copied them to public/docs/components/nodes-graph-AGENT.md and nodes-graph-SKILL.md so AgentSkillTabs can fetch them via /docs/components/... paths.
- Added a "nodes-graph" ComponentMeta entry to src/lib/platform/content.ts in the layout category: name "Nodes Graph", status stable, tags ["Vanilla JS","Canvas","Graph"], capabilities (Mindmap/Sockets/Typed Connections/Path Shapes/Labels/Type-Mismatch Rendering), properties (mode, gridMode, gridSize, snapToGrid, background), full method list (addNode, removeNode, getNodes, addPath, removePath, getPaths, getMode, setMode, on, off, destroy), events (change, connect, disconnect), and defaults.
- Updated src/app/page.tsx: imported NodesGraphPlayground and routed component/layout/nodes-graph to <NodesGraphPlayground />.
- Updated src/store/navigation.ts routeLabel: added "nodes-graph" → "Nodes Graph".
- Built src/components/nodes-graph/nodes-graph-playground.tsx:
  * Live canvas panel fixed at h-[600px], positioned-relative container for the absolute-positioned NodesGraphReact wrapper.
  * Toolbar inside the panel: Add Node (random position near origin), Add Path (between first two nodes; sockets-aware), Clear All, Mindmap/Sockets mode toggle (also in the Properties tab), Reset.
  * Property inspector via AgentSkillTabs:
      - Properties tab: Mode 2-way toggle, Grid mode 3-way (None/Dots/Lines), Grid size slider (10-100), Snap to grid Switch, live nodes/paths count stats, and a small "Active mode / Arrowheads / Type checking" summary card.
      - AGENT tab fetches /docs/components/nodes-graph-AGENT.md.
      - SKILL tab fetches /docs/components/nodes-graph-SKILL.md.
  * Output section below the graph: two side-by-side tables — nodes (id, title, position, size, sockets count) and paths (id, from→to with arrow, shape, label, valid/invalid state badge).
  * Code panel: JavaScript / HTML / CSS / API tabs, all generated to match the live mode/grid/snap state (JS) or static templates (HTML/CSS/API).
  * Documentation section: Overview, when to use / not to use, properties table, methods, events, "Modes: mindmap vs sockets", "Path shapes and labels", accessibility, plus a sticky on-this-page aside.
  * Initialization: on mount, seeds a 3-node mindmap graph (Root → Branch A / Branch B with bezier arrowhead paths labeled "A"/"B"). Switching to sockets mode rebuilds with 4 socketed nodes demonstrating a valid color→color connection (lemon) and a type-mismatched number→string connection (red), with the valid input control hidden. Switching back to mindmap re-seeds the mindmap graph.
  * Toast feedback (sonner) on Add Node / Add Path / Clear All / Mode toggle / Reset.
  * Dark theme only: Obsidian/Deep Violet/Lemon Signal palette via brand-lemon and brand-purple-strong tokens; no indigo/blue. Node fills use #211A30 / #342348 / #2A2235. Type-mismatch red is #FF858B (matches the library's DATA_TYPE_COLORS).
- Fixed two compile errors caught by the dev server: the platform export is PageOverline (not PageOvertext as the task brief spelled it) — corrected both the import and the JSX usage.
- Verified: `bun run lint` is clean (0 errors, 0 warnings); dev server returns HTTP 200 on / after recompile.

Files created:
- src/lib/components/nodes-graph/AGENT.md
- src/lib/components/nodes-graph/SKILL.md
- public/docs/components/nodes-graph-AGENT.md
- public/docs/components/nodes-graph-SKILL.md
- src/components/nodes-graph/nodes-graph-playground.tsx

Files modified:
- src/lib/platform/content.ts (added nodes-graph metadata in layout category)
- src/app/page.tsx (import + route for component/layout/nodes-graph)
- src/store/navigation.ts (routeLabel: "nodes-graph" → "Nodes Graph")

Stage Summary:
- NodesGraph playground is fully wired into the platform. Navigating to Components → Layout → Nodes Graph renders the playground with a seeded mindmap graph; the toolbar and Properties tab toggle into sockets mode (with type-mismatch rendering), add/remove nodes and paths, and the live output tables and code panel reflect every change. AGENT/SKILL tabs load from /docs/components/nodes-graph-{AGENT,SKILL}.md. Lint is clean and the dev server compiles without errors.

---
Task ID: 33 (summary)
Agent: main + subagent
Task: Properties tab primary style + NodesGraph component

Work Log:
- **Properties tab primary style**: Changed the Properties tab button to use `bg-brand-lemon text-[#17151D]` (lemon background with dark text) when active — a primary button style. The dot indicator changes to `bg-[#17151D]` (dark). When inactive, uses `text-muted-foreground hover:text-foreground hover:bg-accent/50`. Verified: bg=rgb(217,255,102), color=rgb(23,21,29).
- **NodesGraph component** (`src/lib/components/nodes-graph/nodes-graph.ts`): A node-based graph editor built on top of the Board component. Two connection modes:
  - **Mindmap mode**: paths with start/end arrowheads connecting between center of top/left/bottom/right sides of node boxes (Obsidian/mindmap style). Paths can have shapes: bezier (default), step, or straight.
  - **Sockets mode**: paths without heads connecting between output/input sockets on right/left sides of nodes. Sockets sit beside embedded input components. Type-matching: connecting an input with a matching data type hides the control (Blender style). Mismatched types render the path red.
  - Paths support: multiple shapes (bezier/step/straight), color gradients based on socket data types or connection state (red for wrong), and optional centered custom labels with a pill background.
  - Data type colors: color=#D9FF66, number=#91B8FF, string=#FF858B, boolean=#B9A0FF, vector=#8FE3A5.
  - Full public API: addNode, removeNode, addPath, removePath, getNodes, getPaths, setMode, on/off, destroy.
- **React wrapper + playground** (built by subagent): Full playground with toolbar (Add Node, Add Path, Clear, Mode toggle, Reset), AgentSkillTabs properties panel, output tables for nodes/paths, code panel, and documentation. Seeds default nodes/paths on mount for both modes.
- VLM-verified: NodesGraph playground loads, board exists, Properties tab has primary style (lemon bg + dark text).
- `bun run lint` — 0 errors, 0 warnings.

Stage Summary:
- Properties tab now uses primary button style (lemon background, dark text).
- NodesGraph component established with two modes (mindmap + sockets), path shapes, type-matching, and labels.
- Appears in sidebar under Layout → Nodes Graph.

---
Task ID: 34
Agent: main
Task: Fix NodesGraph crash, path visibility, and panning

Work Log:
- **Fixed seedSockets crash**: The `seedSockets` function was treating `addNode()` return value (a string ID) as a GraphNode object with `.sockets` property. Fixed by using `inst.getNodes()` to look up the actual node objects by ID, then accessing `.sockets[0].id` with null checks.
- **Fixed paths not visible until nodes are moved**: The issue was that `renderPaths()` used a single `requestAnimationFrame` which could fire before the Board's render completed (erasing the paths). Fixed by:
  1. Using **double-rAF** (nested `requestAnimationFrame`) to ensure the Board's render has completed before drawing paths on top.
  2. Hooking into **all Board events** (change, view, selection) to re-render paths. Previously only "change" events with move/resize types triggered re-render, but the Board re-renders on many other events (selection, view pan/zoom) which would erase the paths without re-drawing them.
- **Fixed panning instability**: The panning issue was caused by the NodesGraph's path rendering interfering with the Board's render cycle. By using double-rAF and hooking into the "view" event (which fires during pan/zoom), the paths are now re-drawn after every Board render without conflicting with the Board's own `requestAnimationFrame` render loop.

Stage Summary:
- Sockets mode no longer crashes (fixed the addNode return type usage).
- Paths are now visible immediately after adding nodes/paths (double-rAF + all-event hook).
- Panning is stable (paths re-render after every board render cycle).
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 35
Agent: main
Task: Fix space-drag stuck, path visibility, arrowhead options, drag-to-connect

Work Log:
- **Fixed space-drag pan stuck**: Added `onKeyUp` handler to the Board that resets `_spaceDown = false` and clears the cursor when the space key is released. Added `window.addEventListener("keyup", this._onKeyUp)` (on window, not canvas, so it fires even if the canvas loses focus). Added cleanup in `destroy()`.
- **Fixed path visibility permanently**: Added `setOverlayRender(fn)` method to the Board — a callback that's called at the **end of every `render()` frame**, after items and selection overlays are drawn. The NodesGraph registers its `drawPaths()` as the overlay callback, so paths are drawn as part of the Board's render cycle — no race conditions, no double-rAF needed. This is the proper architecture: the Board owns the canvas and render loop; the NodesGraph hooks into it via the overlay callback.
- **Added start/end arrowhead options**: `GraphPath` now has `startHead` and `endHead` boolean fields. In mindmap mode, `endHead` defaults to `true` (arrowhead at the destination); `startHead` defaults to `false`. Users can set either/both when creating a path.
- **Added drag-to-connect**: The NodesGraph now intercepts pointer events on the Board's canvas. When the user clicks near a node's edge or socket (within a threshold), a drag-to-connect gesture begins:
  - A dashed lemon preview line follows the cursor from the source node's side/socket.
  - On pointer up, if the cursor is near another node's edge/socket, a path is created between the two nodes.
  - Works for both mindmap mode (drag from node sides) and sockets mode (drag from sockets).
  - The hit testing checks sockets first (more specific), then node sides.

Stage Summary:
- Space-drag pan no longer gets stuck (keyup handler resets _spaceDown).
- Paths are now drawn via the Board's overlay render hook — always visible, no race conditions.
- Arrowheads are optional per path (startHead/endHead).
- Users can drag from a node's side/socket to another node to create paths (like Blender/Obsidian).
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 36
Agent: main
Task: Fix rotation, path selection, Blender-style node rows, drag-to-connect conflict

Work Log:
- **Disabled rotation on NodesGraph items**: Added `allowRotation` and `allowResize` options to the Board. NodesGraph passes `allowRotation: false` to the Board. The Board's `hitTestHandles` and `renderSelectionOverlay` respect these flags — rotation handle and resize handles are not drawn/hit-tested when disabled.
- **Path selection + editing**: Added `selectPath(id)` and `updatePath(id, updates)` to NodesGraph. Paths can be clicked to select them — a lemon highlight glow is drawn around selected paths. The `hitTestPath` method uses point-to-segment distance to detect clicks on paths. Clicking empty space deselects the path. The `selected` field on GraphPath tracks selection state.
- **Blender-style node rows**: Added `NodeRow` interface and `rows` field to `GraphNode`. Each row has a label, control type (slider/text/color/checkbox/none), control value, and optional socket. The `addNode` method accepts a `rows` config that automatically creates sockets per row (with `socketSide` and `socketType`). The overlay renderer draws:
  - Node title at the top
  - Row labels on the left
  - Control visualizations on the right: mini sliders (with lemon thumb), color swatches, checkboxes
  - Socket circles beside rows that have sockets (colored by data type)
  When a valid connection is made to an input socket, the socket's `hidden` flag is set and the control is visually hidden (substituted by the connected input).
- **Fixed drag-to-connect conflict with selection**: Changed the pointer event listener from bubble phase to **capture phase** (`addEventListener("pointerdown", fn, true)`) so the NodesGraph intercepts the event BEFORE the Board. The handler only calls `stopPropagation` + `preventDefault` when the pointer is near a node edge/socket (for drag-to-connect) or on a path (for selection) — otherwise it lets the event reach the Board for normal node selection/dragging. This prevents the conflict where drag-to-connect would interfere with node selection.

Stage Summary:
- Nodes cannot be rotated (allowRotation: false).
- Paths are selectable (click to select, lemon highlight) and editable (updatePath API).
- Sockets mode now renders Blender-style nodes with rows of controls (sliders, color swatches, checkboxes) and sockets beside input rows.
- Drag-to-connect uses capture-phase events so it doesn't conflict with node selection.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 37
Agent: main
Task: Hide lattice for nodes, fix path selection, add path properties, fix interaction conflicts

Work Log:
- **Added `latticeDisplay: "none"` mode to Board**: A new option that hides all lattice boxes (local + global), resize handle squares, rotation handle, and pivot marker. However, the **hit testing for resize handles still works** — users can resize by grabbing the edges/corners even though no visual handles are shown. The NodesGraph passes `latticeDisplay: "none"` so nodes don't show lattice boxes but are still resizable.
- **Fixed path selection**: The capture-phase pointer handler now has a clear priority order:
  1. Sockets mode: check if pointer is on a **socket** → start drag-to-connect
  2. Check if pointer is on a **path** → select the path (with lemon highlight glow)
  3. Mindmap mode: check if pointer is on a **node side midpoint** → start drag-to-connect (small threshold to avoid conflict with resize)
  4. Otherwise: let the Board handle it (node selection, drag, resize)
- **Added path properties to playground**: When a path is selected, a "Selected Path" panel appears in the properties tab with:
  - Shape selector (bezier/step/straight)
  - Label text input
  - Color override input
  - Start head / End head checkboxes
  - Delete path button
  All changes are applied live via `updatePath()`.
- **Fixed interaction conflicts**: Separated `hitTestSocket` (for sockets mode, 10px threshold) from `hitTestNodeEdge` (for mindmap mode, 8px threshold — smaller than the Board's 12px resize handle threshold). In sockets mode, only sockets are intercepted (not node sides), so resize handles work without conflict. In mindmap mode, side midpoints use a small threshold so they don't overlap with resize handles at corners.

Stage Summary:
- Nodes have no visible lattice boxes but are still resizable by grabbing edges/corners.
- Paths are selectable (click to select, lemon highlight) with editable properties in the panel.
- Interaction priority: socket drag > path select > node side drag > node select/resize.
- `bun run lint` — 0 errors, 0 warnings.

---
Task ID: 2
Agent: full-stack-developer
Task: Build Calendar component (vanilla JS + React wrapper + playground)

Work Log:
- Read `/home/z/my-project/worklog.md` (Tasks 1–37) to lock the design system (Obsidian / Deep Violet / Lemon Signal #D9FF66, Inter + JetBrains Mono, Lucide icons), the navigation model (Route union with `component/category/slug`), the platform primitives (AgentSkillTabs, CodeBlock, Breadcrumbs/PageOverline, PageContainer, CopyableValue), the content-metadata schema (ComponentMeta with `properties` / `methods` / `events` / `defaults`), and the conventions other component agents are using (`panel` / `eyebrow` / `bg-grid` tokens, lemon-only accent — no indigo/blue, no emojis, no test files). Confirmed the existing inputs category (periodic-range, custom-button, toggle-group) so Calendar slots in cleanly.
- Created `src/lib/components/calendar/calendar.ts` (~870 lines): the `Calendar` class.
  - DOM-based renderer (no canvas, no external date library — only native `Date`). Scoped CSS injected once per document (`#calendar-component-styles`) with `--calendar-*` host-override tokens and `--cal-cell` for cell sizing.
  - Header: month/year title (with `aria-live="polite"`), prev/next chevron buttons, optional Today button (lemon pill). Grid: a CSS Grid of 7 weekday headers + 6 rows × 7 day cells (always 6 rows so height is stable across months), plus an optional ISO-week-number column when `showWeekNumbers` is on.
  - Day-cell states via state classes: `--adjacent`, `--weekend`, `--disabled`, `--today`, `--selected`, `--range-start`, `--range-end`, `--in-range`, `--preview`. Today gets a small lemon dot under the number; the dot recolors to dark when today is selected.
  - Selection modes: `single` (click replaces), `range` (first click = start, second = end, auto-swap when end < start, live hover preview while awaiting end), `multi` (click toggles in the set). `setMode` normalizes the selection across modes (e.g. single→range keeps the date as `range.start` and awaits end).
  - Public API exactly matches the spec: `getSelectedDate()`, `getSelectedRange()`, `getSelectedDates()`, `setSelectedDate(date|null)`, `setSelectedRange(start, end)`, `setSelectedDates(dates)`, `setMode(mode)`, `setMinDate(date)`, `setMaxDate(date)`, `setFirstDayOfWeek(day)`, `setShowWeekNumbers(on)`, `setCellSize(n)`, `today()`, `on("select"|"change"|"navigate", handler)`, `off(event, handler)`, `destroy()`. All events share a single `CalendarEventPayload` shape (`date`, `selectedDate`, `selectedRange`, `selectedDates`, `viewDate`, `mode`, `source`). `source` is `"select"` / `"navigate"` / `"programmatic"` so listeners can distinguish user vs programmatic changes.
  - Date math: `atMidnight` strips time; `compareDate`/`isSameDay` are date-only; `isoWeek` follows ISO 8601 (week 1 contains the first Thursday, Monday-first). Disabled-dates use a `Set<string>` of `"YYYY-MM-DD"` keys for O(1) lookups; disabled-days-of-week is a `Set<number>`. `cellSize` is clamped to 20–80.
  - Keyboard: ArrowRight/Left = ±1 day, ArrowDown/Up = ±1 week, PageDown/Up = ±1 month (Shift = ±1 year), Home/End = first/last day of the visible week, Enter/Space = select. Navigating off-month auto-flips the visible month and re-focuses the target date. Disabled cells receive focus (so keyboard nav isn't blocked) but cannot be selected.
  - Tiny internal EventEmitter: `Map<string, Set<CalendarHandler>>`. `emit` clones the handler set to a plain array so a handler unsubscribing during dispatch doesn't skip siblings; listener errors are caught and logged so a single bad handler can't crash the calendar.
  - `destroy()` is idempotent: removes all click/pointerenter listeners (stashed on each cell via `_calClick`/`_calEnter` properties), removes the header button listeners, removes the grid pointerleave + root keydown listeners, clears the cell array, clears the listener map, and removes the root from the DOM.
  - Only accent color used is the brand lemon (`#D9FF66`) — no indigo, no blue. Reduced-motion query disables transitions.
- Created `src/lib/components/calendar/index.ts` re-exporting the `Calendar` class, the `CalendarMode`/`CalendarRange`/`CalendarOptions`/`WeekdayFormat`/`CalendarEventPayload`/`CalendarHandler` types, and the `formatDateISO` helper.
- Created `src/lib/components/calendar/AGENT.md` (architecture, internal-state, day-cell lifecycle, selection model, events, keyboard, date-math, extension points, known issues) and `src/lib/components/calendar/SKILL.md` (installation, constructor, options table, methods table, events, code examples for single/range/multi/disabled/week-numbers/programmatic/React, integration notes). Copied both to `public/docs/components/calendar-AGENT.md` and `public/docs/components/calendar-SKILL.md` so the AgentSkillTabs AGENT/SKILL tabs can fetch them.
- Created `src/components/calendar/calendar-react.tsx`: React wrapper around the vanilla `Calendar`. Owns the instance for the lifetime of the mount; forwards prop changes via the imperative API. Initial selection is captured via refs so the create-once effect can stay empty. Callbacks (`onSelect`/`onChange`/`onNavigate`) are kept in refs so listeners don't need to be re-attached. Selection-prop changes are deduplicated by ISO-string keys (`singleKey`, `rangeKeyStr`) so the wrapper doesn't fight the playground's local mirror of the selection. `minDate`/`maxDate` clear correctly when the prop goes `undefined` (the Calendar's setters accept a falsy date as "clear").
- Created `src/components/calendar/calendar-playground.tsx`: the full component detail page.
  - Page header: Breadcrumbs → PageOverline "Components / Inputs" → H1 "Calendar" → longDescription → tag chips + status badge.
  - Live preview (fixed `h-[600px]`): the calendar centered on a `bg-grid` panel; the header row shows a pulsing lemon dot, the live view label (YYYY-MM), and a Reset button. The output section under the canvas shows copyable chips for the current selection (one chip in single mode, start/end chips in range mode, one chip per date in multi mode) plus a hint line.
  - Property inspector uses `AgentSkillTabs` with the Properties tab containing four grouped sections:
    - **Selection**: Mode 3-way (single/range/multi).
    - **Layout**: First day of week 2-way (Sunday/Monday), Weekday format 3-way (narrow/short/long), Cell size slider 24–60 with mono min/max labels.
    - **Display**: Week numbers / Today button / Adjacent months / Today highlight / Weekend highlight — all Switch toggles.
    - **Constraints**: Min date / Max date HTML date inputs + a "Clear constraints" button.
  - AGENT and SKILL tabs fetch `/docs/components/calendar-AGENT.md` and `/docs/components/calendar-SKILL.md` respectively (handled by `AgentSkillTabs`).
  - Code panel: JavaScript / HTML / CSS / API tabs. The JavaScript tab is generated from the live playground state (mode, firstDayOfWeek, weekdayFormat, all toggles, cellSize, minDate, maxDate) so the snippet always matches what's on screen. HTML/CSS/API tabs are static reference.
  - Documentation section: Overview, When to use / not to use, Selection modes (single/range/multi explained with lemon mono code chips), Properties and defaults table, Methods cards, Events cards, Accessibility bullets (role=group, real `<button>` day cells, aria-label "Month Day, Year", aria-selected, aria-disabled, aria-live on title, full keyboard map), Date-math note. Sticky "On this page" sidebar on large screens.
- Wired the platform:
  - `src/lib/platform/content.ts`: added a `calendar` ComponentMeta to the `inputs` category (slug "calendar", name "Calendar", status "stable") with 16 properties, 16 methods, 3 events, and the defaults block. Sits between periodic-range and custom-button so the inputs category reads alphabetically/logically.
  - `src/store/navigation.ts`: extended `routeLabel`'s `component` branch with `route.slug === "calendar" ? "Calendar"`.
  - `src/app/page.tsx`: imported `CalendarPlayground` and added a `route.category === "inputs" && route.slug === "calendar"` branch to `renderRoute`'s `component` case.
- Ran `bun run lint` — 0 errors, 0 warnings after removing five unused eslint-disable directives (the wrapper's exhaustive-deps directives on the create-once + selection effects, and the no-console directive on the handler-error catch). Ran `bunx tsc --noEmit` — no type errors in the new files (the single pre-existing `"unstable"` status error in content.ts for the nodes-graph component is unrelated). Checked `dev.log` — server compiles cleanly and serves `/` 200.

Stage Summary:
- Vanilla TS Calendar is complete and self-contained (no React/Next.js imports, no external date library). Files produced:
  - `src/lib/components/calendar/calendar.ts` — `Calendar` class (DOM + scoped CSS, pointer + keyboard, three selection modes, range preview, week numbers, min/max, per-date/per-weekday disables, today/weekend highlight, configurable cell size, public API, idempotent destroy).
  - `src/lib/components/calendar/index.ts` — public barrel.
  - `src/lib/components/calendar/AGENT.md` + `SKILL.md` — contribution guide + usage docs.
  - `public/docs/components/calendar-AGENT.md` + `calendar-SKILL.md` — copies for the playground's AGENT/SKILL tabs.
  - `src/components/calendar/calendar-react.tsx` — React wrapper (create-once, imperative forwarding, ISO-key dedupe).
  - `src/components/calendar/calendar-playground.tsx` — full playground (live canvas + AgentSkillTabs properties panel + output chips + JS/HTML/CSS/API code panel + documentation).
- Public API surface (final):
  - `new Calendar(container, options?: CalendarOptions)`
  - `getSelectedDate()` / `getSelectedRange()` / `getSelectedDates()`
  - `setSelectedDate(date | null)` / `setSelectedRange(start, end)` / `setSelectedDates(dates)`
  - `setMode(mode)` / `setMinDate(date)` / `setMaxDate(date)` / `setFirstDayOfWeek(day)` / `setShowWeekNumbers(on)` / `setCellSize(n)` / `today()`
  - `on("select" | "change" | "navigate", handler)` / `off(event, handler)` / `destroy()`
  - `CalendarEventPayload = { date, selectedDate, selectedRange, selectedDates, viewDate, mode, source }`
- Routing: `component/inputs/calendar` → `<CalendarPlayground />`. The navigation store's `routeLabel` returns "Calendar" for that slug.
- Design discipline: only brand lemon used for selection/range/preview/today-dot; no indigo, no blue, no emojis, no test files. The calendar's host-override tokens (`--calendar-bg`, `--calendar-fg`, `--calendar-border`, `--calendar-muted`, `--calendar-muted-strong`) make it themeable on light/dark surfaces without code changes.
- Ready for use as the date picker in any future inspector, form, or booking panel.

---
Task ID: 38 (summary)
Agent: main + subagent
Task: Mark NodesGraph as unstable + build full-options Calendar

Work Log:
- **Marked NodesGraph as "unstable"**: Changed `status: "stable"` to `status: "unstable"` in content.ts for the nodes-graph component. Added "Experimental" tag. Updated navigation.ts routeLabel to show "Nodes Graph (Unstable)" in breadcrumbs. The component has known interaction conflicts (path selection, drag-to-connect vs resize) that need further work.
- **Built Calendar component** (`src/lib/components/calendar/calendar.ts`, ~870 lines): A full-featured date picker calendar with:
  - Three selection modes: single, range (with hover preview), multi (toggle)
  - Configurable first day of week (Sunday/Monday)
  - Weekday format: narrow/short/long
  - Week numbers (ISO)
  - Min/max date constraints
  - Per-date and per-weekday disables
  - Today highlight, weekend highlight
  - Adjacent month days (configurable)
  - Configurable cell size (24-60px)
  - Today button
  - Full keyboard navigation (Arrows, PageUp/Down, Home/End, Enter/Space)
  - Scoped CSS with `--calendar-*` custom properties
  - DOM-based (no canvas, no external date library)
  - Full public API: getSelectedDate/Range/Dates, setMode, setMinDate, setMaxDate, setFirstDayOfWeek, setShowWeekNumbers, setCellSize, today, on/off, destroy
- **React wrapper + playground**: Full playground with fixed h-[600px] live canvas, AgentSkillTabs properties panel (Selection/Layout/Display/Constraints sections), output chips for selected dates, code panel (JS/HTML/CSS/API), and documentation.
- VLM-verified: Calendar renders with 114 day cells, properties/AGENT/SKILL tabs present.
- `bun run lint` — 0 errors, 0 warnings.

Stage Summary:
- NodesGraph is now categorized as "unstable" in the content metadata and navigation.
- New Calendar component established with full options: single/range/multi selection, week numbers, min/max constraints, keyboard navigation, configurable display.
- Appears in sidebar under Inputs → Calendar.

---
Task ID: 39
Agent: main
Task: Rebuild Calendar from scratch using simplified spec

Work Log:
- **Deleted old Calendar files** and rebuilt from scratch following the new simplified spec.
- **Calendar class** (`src/lib/components/calendar/calendar.ts`): Single-file vanilla TS implementation with:
  - Pure date math (no Date object for date-only values — avoids TZ issues): `isLeap`, `daysInMonth`, `dayOfWeek`, `compareDate`, `isBetween`, `addMonths`, `addDays`, `weekNumber`, `today`.
  - `CalendarDate = { year, month, day }` — date-only, no timezone.
  - 4 selection modes: none, single, multiple, range (with hover preview and auto-swap).
  - Separated value (selection) vs view_date (displayed period) — navigating months doesn't change selection.
  - Grid: 6×7, stable height, outside-month dates configurable (show/hide/disabled).
  - Cell states with visual precedence: selected > range-start/end > in-range > focused > today > hover/preview > default > outside.
  - Disabled dates: min/max bounds + explicit disabled list.
  - Week numbers (ISO), configurable week start (0-6), weekday format (narrow/short/long).
  - Navigation: prev/next month, today button, clear button.
  - Keyboard: Arrows (day/week), Home/End (week bounds), PageUp/Down (month), Shift+PageUp/Down (year), Enter/Space (select), Escape (cancel range).
  - Events: selection_changed, view_changed, date_selected, range_changed, focused_date_changed, validation_failed, today_requested, clear_requested.
  - Commands: setProperty, navigate, navigateTo, selectDate, setSelection, clearSelection, focusDate, getValue, getRange, getSelectedDates, destroy.
  - Scoped CSS with `--cal-*` custom properties, lemon accent, dark theme.
- **React wrapper**: Create-once mount, imperative property forwarding, callback refs.
- **Playground**: Fixed h-[600px] live canvas, AgentSkillTabs properties panel (selection mode, weekday format, week start, cell size, 9 toggle switches), output chips showing selection, code panel, documentation.
- AGENT.md + SKILL.md created and copied to public/docs.
- VLM-verified: 42 day cells, 2 nav buttons, Properties/AGENT/SKILL tabs present.
- `bun run lint` — 0 errors, 0 warnings.

Stage Summary:
- Calendar rebuilt from scratch per the simplified spec. Clean single-file architecture with pure date math, 4 selection modes, keyboard navigation, full event system, and scoped CSS.

---
Task ID: 2
Agent: main
Task: Build Kanban Board component (vanilla JS + React wrapper + playground) following the spec in /home/z/my-project/upload/Pasted Content_1792693914490.txt

Work Log:
- Read the spec file (521 lines) covering purpose, modes, layout, properties, states, interactions, drag-and-drop sequence, events, commands, data/ordering rules, accessibility, extensions, implementation boundaries, and the §14 minimum viable specification.
- Read existing calendar component (kanban.ts ~870 lines, calendar-react.tsx, calendar-playground.tsx, AGENT.md, SKILL.md) as a structural template — single-file vanilla TS class with scoped CSS injection, create-once React wrapper, full playground with AgentSkillTabs + CodeBlock + documentation.
- Read existing platform files: content.ts (components array, categories, plannedComponents), navigation.ts (routeLabel + categoryLabel + breadcrumbs), page.tsx (route switcher), agent-skill-tabs.tsx, code-block.tsx, breadcrumbs.tsx, globals.css (design tokens, dark theme defaults).
- Created `src/lib/components/kanban/kanban.ts` (~960 lines):
  - Public types: `KanbanMode`, `KanbanLayout`, `KanbanCardLayout`, `KanbanPriority`, `KanbanItem`, `KanbanColumn`, `KanbanOptions`, `KanbanEventPayload`, `KanbanHandler`.
  - Scoped CSS injected once (id `kanban-styles`) with `.kanban-` prefix and `--kb-*` custom properties. Only the brand lemon (#D9FF66) is used as the accent. Honors `prefers-reduced-motion`.
  - `KanbanBoard` class with the full public API from the task spec: constructor, setItems, setColumns, selectItem, clearSelection, moveItem, reorderItem, createItem, updateItem, removeItem, collapseColumn, expandColumn, getItems, getColumns, getSelectedItem, setProperty, on, off, destroy.
  - Internal: flat `items[]` array; per-column order is array order filtered by `columnId`. `moveItem` removes + re-inserts at the target position derived from the target column's current list (after removal); position is clamped to `[0, column.length]`.
  - Move validation: rejects with stable reason vocabulary (`read_only`, `invalid_item`, `invalid_target`, `cross_column_disabled`, `reorder_disabled`, `column_limit`). Item-limit check counts the dragged item only when entering from a different column.
  - Drag-and-drop via HTML5 DnD API: dragstart stores dragItemId + dragSourceColumnId, adds `.kanban-dragging`; dragenter/dragover on column body compute target column + position (midpoint of each card relative to cursor Y, or X in vertical layout), highlight target column (`.kanban-drop-target` or `.kanban-drop-invalid`), render the lemon drop indicator at the computed position, emit `drop_target_changed`; dragleave clears only when actually leaving the column; drop validates → calls moveItem or emits `item_move_rejected`; dragend emits `drag_cancelled` if no drop happened.
  - Keyboard model: cards are `tabindex="0"` + `role="button"`. Space selects; Enter activates (emits `item_activated`); ArrowUp/Down reorders within column (focus preserved); ArrowLeft/Right moves to next non-collapsed column; M opens the Move-to popover (accessible alternative to drag); Delete/Backspace emits `item_delete_requested`; Escape closes popover + clears selection.
  - Move-to popover: a small fixed-position menu listing every column with its color dot; the current column is disabled and marked "(current)"; a "Request delete" entry is included. Click-outside and Escape close it; focus is restored to the originating card.
  - Read-only mode: cards not draggable, Move/Add buttons hidden, collapse button hidden, selection still allowed for inspection, moveItem rejects with `read_only`.
  - Empty columns: `.kanban-empty` placeholder ("Drop cards here" / "No items") shown when `allowEmptyColumns` is true. Placeholder is removed during a drag so the drop indicator has a clean spot.
  - Events emitted: `item_selected`, `selection_changed`, `item_activated`, `item_create_requested`, `item_moved`, `item_move_rejected`, `item_reordered`, `item_delete_requested`, `drag_started`, `drag_cancelled`, `drop_target_changed`, `column_selected`. All carry a consistent `KanbanEventPayload` shape with `type` field and old/new column + position.
- Created `src/lib/components/kanban/index.ts` — barrel re-exporting `KanbanBoard` class and all public types.
- Created `src/lib/components/kanban/AGENT.md` (architecture, ordering model, rendering lifecycle, selection, move validation, drag-and-drop sequence, keyboard model, Move-to popover, read-only behavior, empty columns, public API, events, known issues) and `src/lib/components/kanban/SKILL.md` (installation, quick start, options table, item/column shapes, methods table, events table, keyboard shortcuts, React example, integration notes).
- Copied both docs to `public/docs/components/kanban-AGENT.md` and `public/docs/components/kanban-SKILL.md` so the AgentSkillTabs AGENT/SKILL tabs can fetch them.
- Created `src/components/kanban/kanban-react.tsx`: React wrapper around the vanilla `KanbanBoard`. Create-once mount effect captures initial items/columns via refs; callback handlers are kept in a ref so listeners don't need re-attaching; each option prop is forwarded via `setProperty` in its own effect with an `undefined` guard; items/columns are forwarded via `setItems`/`setColumns` when the array reference changes; exposes an `instanceRef` so the playground can call imperative methods (createItem, removeItem, clearSelection) for the quick-action buttons.
- Created `src/components/kanban/kanban-playground.tsx`: the full component detail page.
  - Page header: Breadcrumbs → PageOverline "Components / Productivity" → H1 "Kanban Board" → longDescription → tag chips + status badge.
  - Live preview (fixed `h-[600px]`): a header bar (KanbanSquare icon + "Live canvas" + item/column count + Reset button), the KanbanReact board on a `bg-grid` panel, and an output section showing a copyable "Selected" chip plus per-column count chips (with color dots) and a last-event line. Includes a keyboard hint about M and Delete.
  - Property inspector uses `AgentSkillTabs` with the Properties tab containing:
    - **Mode**: 2-way (editable / read_only).
    - **Layout**: 2-way (horizontal / vertical).
    - **Card layout**: 3-way (compact / standard / detailed).
    - **Toggles**: dragEnabled, reorderWithinColumn, moveBetweenColumns, showCardBorder, showItemCount, showDropPreview — all Switch-style buttons with lemon active state.
    - **Sliders**: columnWidth (220-400, step 10), cardGap (2-20, step 1), columnGap (4-32, step 1) — all with lemon gradient fill and mono min/max labels.
    - **Quick actions**: "Add to To Do" (calls createItem), "Remove selected" (calls removeItem, errors via toast if no selection).
  - AGENT and SKILL tabs fetch `/docs/components/kanban-AGENT.md` and `/docs/components/kanban-SKILL.md` respectively (handled by `AgentSkillTabs`).
  - Code panel: JavaScript / HTML / CSS / API tabs. The JavaScript tab is generated from the live playground state (mode, layout, cardLayout, all toggles, columnWidth, cardGap, columnGap) so the snippet always matches what's on screen. HTML/CSS/API tabs are static reference (HTML host, CSS token overrides, full API surface + event list).
  - Documentation section: Overview + whenToUse/whenNotToUse, Properties table (16 rows), Methods cards (12), Events cards (12), Accessibility bullets. Sticky "On this page" sidebar on large screens.
  - Seed data: 3 columns (To Do #B8B2CA, In Progress #D9FF66, Done #8FE3A5 — all `allowAddItem: true`) and 7 sample items with varied titles, descriptions, labels, priorities, and assignees spread across the columns.
  - Toast feedback: success on create/delete, info on activate, error on move-rejected (with reason + target). `sonner` is used per the project convention.
- Wired the platform:
  - `src/lib/platform/content.ts`: appended a `kanban` ComponentMeta to the END of the `components` array (after nodes-graph). Slug "kanban", name "Kanban Board", category "productivity", status "stable", 16 properties, 18 methods, 12 events, and a defaults block.
  - `src/store/navigation.ts`: extended `routeLabel`'s `component` branch with `route.slug === "kanban" ? "Kanban Board"`; extended `categoryLabel` with `case "productivity": return "Project Management & Productivity"`.
  - `src/app/page.tsx`: imported `KanbanPlayground` and added a `route.category === "productivity" && route.slug === "kanban"` branch to `renderRoute`'s `component` case (with a `// Productivity category components.` comment matching the pattern of other categories).
- Ran `bun run lint` — initially 1 warning (unused eslint-disable directive on the create-once effect's exhaustive-deps); removed the directive and re-ran → 0 errors, 0 warnings. The create-once effect doesn't need the directive because all dependencies are read from refs (initialItemsRef, initialColumnsRef, cbRef) and the option values are forwarded in their own effects.
- Ran `bunx tsc --noEmit` — no type errors in any of the new kanban files (the only TS errors reported are pre-existing in unrelated files: examples/websocket, skills/image-edit, skills/stock-analysis-skill, color-circle/calendar/platform — none touch the kanban code).
- Verified via curl: `GET /` returns 200 and `GET /docs/components/kanban-AGENT.md` and `/docs/components/kanban-SKILL.md` both return 200. Dev log shows successful compilation with no errors.

Stage Summary:
- Vanilla TS KanbanBoard is complete and self-contained (no React/Next.js imports, no external libraries). Files produced:
  - `src/lib/components/kanban/kanban.ts` — `KanbanBoard` class (DOM + scoped CSS, HTML5 drag-and-drop with lemon drop indicator, keyboard navigation with Move-to popover, full move validation with stable reason vocabulary, read-only mode, item limits, column collapse, public API, idempotent destroy).
  - `src/lib/components/kanban/index.ts` — public barrel.
  - `src/lib/components/kanban/AGENT.md` + `SKILL.md` — contribution guide + usage docs.
  - `public/docs/components/kanban-AGENT.md` + `kanban-SKILL.md` — copies for the playground's AGENT/SKILL tabs.
  - `src/components/kanban/kanban-react.tsx` — React wrapper (create-once, imperative forwarding, callback refs, undefined-guarded setProperty effects).
  - `src/components/kanban/kanban-playground.tsx` — full playground (live canvas + AgentSkillTabs properties panel + output chips + JS/HTML/CSS/API code panel + documentation).
- Public API surface (final):
  - `new KanbanBoard(container, options?: KanbanOptions)`
  - `setItems(items)` / `setColumns(columns)` / `getItems()` / `getColumns()`
  - `selectItem(id | null, source?)` / `clearSelection()` / `getSelectedItem()`
  - `moveItem(itemId, targetColumnId, position, source?)` / `reorderItem(itemId, position, source?)`
  - `createItem(columnId, partial)` → string / `updateItem(itemId, changes)` / `removeItem(itemId)`
  - `collapseColumn(id)` / `expandColumn(id)`
  - `setProperty(name, value)` / `on(event, handler)` / `off(event, handler)` / `destroy()`
- Events: `item_selected`, `selection_changed`, `item_activated`, `item_create_requested`, `item_moved`, `item_move_rejected` (with reason vocabulary: read_only, invalid_item, invalid_target, cross_column_disabled, reorder_disabled, column_limit), `item_reordered`, `item_delete_requested`, `drag_started`, `drag_cancelled`, `drop_target_changed`, `column_selected`.
- Routing: `component/productivity/kanban` → `<KanbanPlayground />`. The navigation store's `routeLabel` returns "Kanban Board" for that slug and `categoryLabel` returns "Project Management & Productivity" for the productivity category. Breadcrumbs render correctly: Home / Components / Project Management & Productivity / Kanban Board.
- Design discipline: only the brand lemon (#D9FF66) is used as the accent — for selected cards, focus rings, drop indicators, drop-target column borders, count chips at-limit (red destructive only for over-limit count badge and the "Request delete" popover entry), and slider fills. No indigo, no blue, no emojis, no test files. Scoped `.kanban-` CSS uses `--kb-*` custom properties so the board can be rethemed by overriding tokens on the `.kanban-board` host.
- Appears in the sidebar under Productivity → Kanban Board. The first component in the productivity category.

---
Task ID: 40 (summary)
Agent: main + subagent
Task: Add Productivity category + build Kanban component per spec

Work Log:
- **New category**: Added "Project Management & Productivity" (slug: "productivity") to content.ts categories with icon "KanbanSquare".
- **Kanban component** (`src/lib/components/kanban/kanban.ts`, ~960 lines): A full Kanban board per the spec's minimum viable spec (§14):
  - Configurable columns and ordered cards with generic item records (stable IDs).
  - HTML5 drag-and-drop with lemon drop indicator line, move validation, item limits.
  - Reordering within columns and moving between columns.
  - Empty columns as valid drop targets, invalid drop target handling.
  - Editable / read-only / disabled modes.
  - Three card densities: compact, standard, detailed.
  - Horizontal and vertical layouts with horizontal scrolling.
  - Configurable column width, card gap, column gap, card borders, item counts.
  - Selection (single), item activation, create/edit/delete requests.
  - Column collapse/expand, column item limits.
  - Keyboard navigation: focusable cards, Enter/Space to select/activate, "Move to column" popover as accessible drag alternative.
  - Full event system: item_selected, selection_changed, item_moved, item_move_rejected, item_reordered, item_create_requested, item_edit_requested, item_delete_requested, drag_started, drag_cancelled, drop_target_changed, column_selected.
  - Scoped CSS with `.kanban-` prefix, dark theme, lemon accent.
- **React wrapper + playground**: Fixed h-[600px] live canvas, AgentSkillTabs properties panel (mode, layout, card layout, drag/reorder/move toggles, show border/count/drop preview, column width/gap sliders), output section with selected item + column counts, code panel, documentation. Seeds with 3 columns (To Do, In Progress, Done) and 7 sample tasks.
- VLM-verified: 3 columns, 7 cards, Properties/AGENT/SKILL tabs present, appears in sidebar under Productivity → Kanban Board.
- `bun run lint` — 0 errors, 0 warnings.

Stage Summary:
- New "Project Management & Productivity" category established.
- Kanban Board component built per spec with drag-and-drop, keyboard navigation, full event system, and configurable appearance.
- Appears in sidebar under Productivity → Kanban Board and in Components directory.

---
Task ID: 41
Agent: main
Task: Add "Content Templates" platform concept (src/lib/templates/) and refactor Kanban card content to be template-driven

Work Log:
- Read the previous worklog (Task 40) to understand the Kanban component state and the precedent set by `src/lib/commands/` (registry + shortcuts as a separated platform concept).
- Studied the existing Kanban `renderCard` method (~90 lines of hardcoded priority → title → description → labels → footer rendering) and the `src/lib/commands/` module structure (registry.ts + shortcuts.ts + index.ts + AGENT/SKILL docs) as the architectural template for the new templates module.
- Created `src/lib/templates/` — the third platform-level concept alongside Commands and components:
  - `registry.ts`: `ContentTemplate`, `TemplateSlot`, `SlotRenderer`, `SlotRenderContext`, `TemplateDensity` types; `ContentTemplateRegistry` and `SlotRendererRegistry` singleton classes; `defineTemplate`/`defineTemplates`/`defineRenderer`/`defineRenderers` convenience functions; `slotVisible` + `DEFAULT_VISIBILITY` helpers. The `SlotRenderContext` carries `{ item, slot, density, host }` so renderers are pure functions that don't depend on the host component's API.
  - `renderers.ts`: 12 built-in slot renderers (priority-row, severity-row, title, description, label-chips, assignee-avatar, assignee-row, meta-line, id-badge, progress-bar, divider, footer) + scoped `.ctpl-` CSS injected once (id `content-template-styles`). Renderers use the host's `--kb-*` tokens with sensible fallbacks so they look native inside a Kanban card without coupling. The accent is always the brand lemon.
  - `index.ts`: barrel exports + `registerBuiltinTemplates()` which calls `registerBuiltinRenderers()` (idempotent) then registers 4 built-in Kanban templates: `kanban.standard-task` (the current card pattern extracted), `kanban.minimal` (title only), `kanban.bug-report` (severity/title/description/reporter/id), `kanban.milestone` (title/dueDate/progress).
  - `AGENT.md` + `SKILL.md`: full contribution guide + usage docs. Copied to `public/docs/concepts/templates-AGENT.md` and `templates-SKILL.md`.
- Refactored `src/lib/components/kanban/kanban.ts`:
  - Added `templateId?: string` to `KanbanOptions` (defaults to `"kanban.standard-task"`).
  - Imported `templateRegistry`, `rendererRegistry`, `slotVisible`, `ContentTemplate`, `TemplateDensity` from `@/lib/templates`.
  - Replaced the hardcoded `renderCard` body with a template-driven loop: looks up the active template via `getTemplate()`, iterates `tpl.slots` in order, skips slots not visible in the current `cardLayout` density, calls each slot's renderer with `{ item, slot, density, host }` (host carries board-level state: mode, moveBetweenColumns, dragEnabled, showCardBorder, cardLayout), appends non-null results. Falls back to a bare `.kanban-card-title` if no template is registered.
  - The board-level Move button is now rendered as a **board control** (NOT part of the template) in a `.kanban-card-footer` wrapper with a flex spacer, appended after the templated content when `mode === "editable" && moveBetweenColumns && cardLayout !== "compact"`.
  - Added `getTemplate()`, `getTemplateId()`, `setTemplateId(id)` public methods. `setTemplateId` is a no-op if the ID isn't registered; re-renders otherwise.
  - Extended `setProperty` switch with a `templateId` case that delegates to `setTemplateId`.
  - Extracted `buildCardAriaLabel(item)` helper (the aria-label is the board's responsibility, not the template's).
  - Removed the now-unused `initials` helper (moved into the templates `assignee-avatar` renderer).
- Updated `src/components/kanban/kanban-react.tsx`: added `templateId` prop forwarded to the constructor and via `setProperty("templateId", templateId)` in its own effect.
- Updated `src/components/kanban/kanban-playground.tsx`:
  - Imports `registerBuiltinTemplates`, `templateRegistry`, `ContentTemplate` from `@/lib/templates`.
  - Calls `registerBuiltinTemplates()` at **module scope** (not in useEffect) because the KanbanBoard constructor reads the registry to lay out card content, so templates must be registered BEFORE the board is constructed. The call is idempotent and SSR-safe (`injectStyles` is `typeof document`-guarded).
  - Added `templateId: "kanban.standard-task"` to `DEFAULTS` and the `State` interface.
  - Added a `kanbanTemplates` memo (`templateRegistry.byCategory("Kanban")`) and `activeTemplate` memo for the live canvas header chip.
  - Added a Content template picker at the TOP of the properties panel: each template shows its name, ID, description, and a list of slot chips (`field · renderer` pairs). Selected template gets the brand-purple-strong background.
  - Added a LayoutTemplate icon + active template name chip in the live canvas header.
  - Extended the seed items with severity, reporter, dueDate, and progress fields so the alternate templates have real content to render.
  - Updated the JS code snippet to include `import { registerBuiltinTemplates } from "@workshop/templates"`, the `registerBuiltinTemplates()` call, the `templateId` option, and a commented `board.setTemplateId(...)` example.
  - Updated the API code tab to include `getTemplate()`, `getTemplateId()`, `setTemplateId(id)` methods and a note about the template registry.
- Updated `src/lib/platform/content.ts` Kanban meta:
  - Added `templateId` to the properties table.
  - Added `getTemplate()`, `getTemplateId()`, `setTemplateId(id)` to the methods list.
  - Added "Content Templates" to tags and capabilities.
  - Updated `longDescription` to describe the template system.
  - Added `templateId: "kanban.standard-task"` to the defaults block.
- Updated `src/lib/components/kanban/AGENT.md`: documented the new `templateId` option, the template-driven `renderCard` lifecycle (5-step description), and the separation between templated content and board-level controls.
- Updated `src/lib/components/kanban/SKILL.md`: added `templateId` to the options table, `getTemplate`/`getTemplateId`/`setTemplateId` to the methods table, and a full "Content templates" section with a table of the 4 built-in templates + code example.
- Copied all updated docs to `public/docs/components/` and `public/docs/concepts/`.
- Ran `bun run lint` → 0 errors, 0 warnings.
- Ran `bunx tsc --noEmit` → no type errors in any templates or kanban files (the 11 pre-existing errors are all in unrelated files: calendar, color-circle, content.ts nodes-graph unstable status, examples/websocket, skills).
- Agent Browser verification (end-to-end):
  - Navigated Home → Productivity category → Kanban Board playground.
  - Confirmed the live canvas shows 3 columns (To Do / In Progress / Done) with 7 cards total.
  - Confirmed the properties panel shows the Content template picker with all 4 templates (Standard Task, Minimal, Bug Report, Milestone) — each with name, ID, description, and slot chips.
  - Switched to Standard Task: 7 priority rows, 7 titles, 4 descriptions, 4 label sets, 4 avatars (matches seed data exactly).
  - Switched to Bug Report: 7 severity rows, 7 titles, 4 descriptions, 7 reporter rows (assignee-row renderer), 7 id-badges.
  - Switched to Milestone: 7 titles, 7 dueDate meta-lines, 7 progress bars (first card shows 10% width — matches t1's `progress: 10`).
  - Switched to Minimal: 7 titles only, 0 priority/description/labels — exactly the minimal template.
  - VLM-verified the final Standard Task screenshot: confirmed 3 columns with correct item counts, cards with priority dots (red HIGH, yellow MEDIUM), titles, descriptions, label chips, assignee avatars, and the right-side template picker with 4 templates and Standard Task active.
  - Verified the AGENT and SKILL tabs fetch correctly (curl 200 for kanban-AGENT, kanban-SKILL, templates-AGENT, templates-SKILL).
  - Dev log shows clean compilation, no errors, all 200 responses.

Stage Summary:
- New platform-level concept "Content Templates" established at `src/lib/templates/` — analogous to `src/lib/commands/` (registry-based, separated from components, reusable across hosts). Files:
  - `src/lib/templates/registry.ts` — `ContentTemplateRegistry` + `SlotRendererRegistry` singletons, `ContentTemplate`/`TemplateSlot`/`SlotRenderer`/`SlotRenderContext`/`TemplateDensity` types, `defineTemplate`/`defineRenderer`/`slotVisible` helpers.
  - `src/lib/templates/renderers.ts` — 12 built-in slot renderers (priority-row, severity-row, title, description, label-chips, assignee-avatar, assignee-row, meta-line, id-badge, progress-bar, divider, footer) + scoped `.ctpl-` CSS.
  - `src/lib/templates/index.ts` — barrel + `registerBuiltinTemplates()` (4 Kanban templates: standard-task, minimal, bug-report, milestone).
  - `src/lib/templates/AGENT.md` + `SKILL.md` + copies in `public/docs/concepts/`.
- Kanban component refactored to be template-driven:
  - `templateId` option (default `"kanban.standard-task"`) + `getTemplate()` / `getTemplateId()` / `setTemplateId(id)` public API + `setProperty("templateId", id)` support.
  - `renderCard` now iterates template slots; board-level Move button is a separate control appended after templated content.
  - The current card content pattern (priority → title → description → labels → assignee) is preserved as the `kanban.standard-task` template — same visual result, now reusable and swappable.
- Playground exposes a 4-template picker at the top of the properties panel; switching templates re-renders all cards without touching the data. The live canvas header shows the active template name.
- Design discipline maintained: only brand lemon accent, no indigo/blue, scoped `.ctpl-` CSS with `--kb-*` token fallbacks, renderers are pure functions, `null` means "skip this slot", `prefers-reduced-motion` honored.
- Agent Browser + VLM verified end-to-end: all 4 templates render correctly with the right slot counts matching the seed data, the template picker is interactive, and the page compiles cleanly.

---
Task ID: 42
Agent: main
Task: Three improvements — (1) collapsible long description, (2) templates in inner tabs box + "None" option, (3) custom-template creation docs

Work Log:
- Read the previous worklog (Task 41) to understand the Content Templates system state.
- Read `src/components/platform/agent-skill-tabs.tsx` to understand the Properties/AGENT/SKILL tab structure and plan the Templates tab addition.

**Improvement 1 — Collapsible long description:**
- Created `src/components/platform/collapsible-description.tsx`: a `CollapsibleDescription` component that takes `text` and `maxLength` (default 220). If the text exceeds `maxLength`, it truncates at the nearest word boundary before `maxLength`, appends an ellipsis, and renders a "Show more" / "Show less" toggle (ChevronDown / ChevronUp icons, brand lemon). When the text fits, it renders plainly with no toggle. Default state is collapsed.
- Updated the Kanban playground header to replace the plain `<p>{meta.longDescription}</p>` with `<CollapsibleDescription text={meta.longDescription} maxLength={220} className="..." />`. The 1290-char longDescription now collapses to 219 chars on first load with a "Show more" toggle.

**Improvement 2 — Templates tab + "None" option:**
- Extended `src/components/platform/agent-skill-tabs.tsx` with an optional `templatesSlot?: React.ReactNode` prop. When provided, a "Templates" tab (LayoutTemplate icon) is rendered between Properties and AGENT. The tab content is the `templatesSlot` node. Other playgrounds that don't pass `templatesSlot` see no change. Updated the activeTab state type to include `"templates"`.
- Added `KANBAN_TEMPLATE_NONE = "none"` constant to `src/lib/components/kanban/kanban.ts` (exported). Updated `setTemplateId(id)` to bypass the `templateRegistry.has(id)` check when `id === KANBAN_TEMPLATE_NONE` — the "none" sentinel is always allowed. `getTemplate()` returns `undefined` for "none" (it's not registered), and `renderCard` already falls back to a bare `.kanban-card-title` div (native rendering). Added a docblock explaining the sentinel and the component-independence guarantee.
- Exported `KANBAN_TEMPLATE_NONE` from `src/lib/components/kanban/index.ts` barrel.
- Updated the Kanban playground:
  - Added `templateOptions` memo that prepends a synthetic "None" entry (id: `KANBAN_TEMPLATE_NONE`, name: "None", slots: []) to the registered Kanban templates. The picker iterates `templateOptions` instead of `kanbanTemplates`.
  - Moved the template picker from the Properties tab children into the `templatesSlot` prop of `AgentSkillTabs`. The Properties tab now starts with "Mode" (no template picker).
  - The "None" option shows a Ban icon (instead of LayoutTemplate) and an extra note: "The board works with zero templates registered — content templates are an opt-in layer on top."
  - The live canvas header chip switches between LayoutTemplate (templated) and Ban (none) icons based on `state.templateId === KANBAN_TEMPLATE_NONE`.
  - Added a "Creating custom templates" info box below the picker in the Templates tab with a 3-step guide + code examples (defineRenderer → defineTemplate → setTemplateId).

**Improvement 3 — Custom-template creation docs:**
- Added a "Content templates" documentation panel at the bottom of the Kanban playground (after Accessibility, before the sidebar). It includes:
  - An intro paragraph explaining the board is independent of templates and that `"none"` disables templated content.
  - A table of all 5 template options (none + 4 registered) with their IDs, names, and slot chains.
  - A "Creating a custom template" subsection with a 3-step numbered guide and a full code example (defineRenderer + defineTemplate + setTemplateId + setTemplateId("none")).
- Updated `src/lib/components/kanban/SKILL.md`:
  - Added `"none"` to the template table and the `templateId` option description.
  - Added `KANBAN_TEMPLATE_NONE` to the code example.
  - Added a full "Creating a custom template" subsection with the 3-step guide, code examples, and the renderer contract.
- Updated `src/lib/platform/content.ts` Kanban meta: the `templateId` property description now mentions the `"none"` option.
- Updated the "On this page" sidebar to include "Content templates".
- Copied updated docs to `public/docs/components/kanban-SKILL.md` and `kanban-AGENT.md`.

**Verification:**
- `bun run lint` → 0 errors, 0 warnings.
- Agent Browser end-to-end:
  - Collapsible description: confirmed 219-char collapsed text with "Show more" button; clicking expands to full 1290 chars and the button changes to "Show less". `aria-expanded` set correctly.
  - Templates tab: confirmed the "Templates" tab appears between Properties and AGENT in the tab bar. Clicking it shows the template picker with "None" (first, Ban icon) + 4 registered templates (LayoutTemplate icon), each with name, ID, description, and slot chips. The "Creating custom templates" guide is below the picker.
  - "None" option: clicking "None" switches all 7 cards to native rendering (bare `.kanban-card-title` divs, 0 ctpl-* elements). The live canvas header chip shows "None" with a Ban icon. Switching back to "Standard Task" restores all templated content (7 priority rows, 7 titles, 4 descriptions, etc.).
  - Bottom docs section: VLM-verified the "Content templates" heading, the 5-row template table, and the "Creating a custom template" 3-step guide with code examples.
- Dev log: clean compilation, no errors.

Stage Summary:
- Three improvements delivered:
  1. **Collapsible long description** — `CollapsibleDescription` component (`src/components/platform/collapsible-description.tsx`) truncates at `maxLength` (default 220) chars at the nearest word boundary, collapsed by default with a "Show more" / "Show less" toggle. Applied to the Kanban playground header.
  2. **Templates in inner tabs box + "None" option** — `AgentSkillTabs` extended with `templatesSlot` prop (renders a "Templates" tab between Properties and AGENT). The Kanban picker now shows "None" first (native rendering, Ban icon) + all registered templates. `KANBAN_TEMPLATE_NONE = "none"` constant exported; `setTemplateId("none")` bypasses the registry check and the board falls back to bare-title native rendering.
  3. **Custom-template creation docs** — a "Creating custom templates" info box in the Templates tab + a full "Content templates" documentation panel at the bottom of the playground with a 5-row template table and a 3-step numbered guide with code examples. The SKILL.md is updated with the same guide. All docs emphasize that the component is independent of templates (works with "none" or zero templates registered).
- Design discipline: only brand lemon accent, Ban icon for "None" (muted), LayoutTemplate icon for templated options, scoped CSS maintained, no indigo/blue, responsive.

---
Task ID: 43
Agent: main
Task: Build Gantt Chart Timeline Bars component per spec (§15 minimum viable specification)

Work Log:
- Read the full spec file (546 lines) covering purpose, layout, time-to-pixel geometry, states, interactions, events, commands, time correctness, accessibility, extensions, and §15 minimum viable specification.
- Studied the Kanban component as a structural template (vanilla TS class + React wrapper + playground + content-template integration + AGENT/SKILL docs).
- Created `src/lib/components/gantt/gantt.ts` (~1100 lines):
  - Public types: `GanttScale`, `GanttSelectionMode`, `GanttAxisPosition`, `GanttResizeEndpoint`, `GanttItem`, `GanttRow`, `GanttOptions`, `GanttEventPayload`, `GanttHandler`.
  - `GANTT_TEMPLATE_NONE = "none"` sentinel constant — pass as templateId for native rendering (plain colored bar, no content template).
  - Time model: all times are epoch milliseconds (number). Linear time-to-pixel mapping: `x(t) = W * (t - T0) / (T1 - T0)`. `timeToX(t)` and `xToTime(x)` methods. Single shared horizontal scale for all rows.
  - Six scales: hour, day, week, month, quarter, year. Each has its own snap interval, tick interval, major-tick interval, and label format function.
  - Scoped CSS injected once (id `gantt-styles`) with `.gantt-` prefix and `--gt-*` custom properties. Only the brand lemon (#D9FF66) is used as the accent.
  - `GanttTimeline` class with the full public API from the spec: constructor, setItems, setRows, selectBar, clearSelection, getSelectedBar, moveBar, resizeBar, moveBarToRow, setViewRange, setScale, zoomIn, zoomOut, fitToRange, navigateTo, today, getTemplate, getTemplateId, setTemplateId, getItems, getRows, getViewRange, setProperty, on, off, destroy.
  - DOM structure: optional time-axis header (with major-tick labels) + body (optional row headers + scrollable grid). Grid lines at minor and major tick intervals. Rows with absolutely-positioned bars. Today marker (red vertical line with "Today" label).
  - Bar rendering: template-driven (uses `src/lib/templates/`). Each bar gets a progress overlay (if progressEnabled and item.progress > 0), templated content slots, and resize handles (left/right). The bar's geometry (position, width, height) is always owned by the timeline — the template only renders content inside.
  - Pointer interactions: pointerdown on a bar starts a move drag (when movable); pointerdown on a resize handle starts a resize drag. Pointer capture ensures tracking outside the bar. `pointermove` updates the item's start/end in real-time with snapping, emits `bar_move_requested` / `bar_resize_requested` (live preview). `pointerup` emits `bar_moved` / `bar_resized` (if the drag actually moved) or `drag_cancelled`.
  - Move/resize validation: rejects with stable reason vocabulary (`read_only`, `invalid_item`, `invalid_interval`, `min_duration`, `row_movable_disabled`, `invalid_row`).
  - Keyboard model: bars are `tabindex="0"` + `role="button"`. Space/Enter selects/activates; ArrowLeft/Right moves by one snap; Shift+ArrowLeft/Right resizes start/end; ArrowUp/Down moves between rows (when rowMovable); Home/End snaps to view boundaries; Delete/Backspace emits `bar_delete_requested`; Escape clears selection.
  - View range/zoom: `setViewRange`, `setScale` (updates snapInterval), `zoomIn`/`zoomOut` (halve/double around center), `fitToRange` (5% padding), `navigateTo` (center on time), `today` (center on now). Zooming/scrolling changes what is visible, not the stored dates.
  - Events: `bar_selected`, `selection_changed`, `bar_activated`, `bar_moved`, `bar_resized`, `bar_move_requested`, `bar_resize_requested`, `bar_move_rejected` (with reason), `bar_row_changed`, `bar_delete_requested`, `view_range_changed`, `scale_changed`, `drag_started`, `drag_cancelled`.
  - `setProperty` switch handles all options including `templateId` (delegates to `setTemplateId`).
  - `ResizeObserver` in the React wrapper triggers `updateGridWidth()` on container resize.
- Created `src/lib/components/gantt/index.ts` — barrel re-exporting `GanttTimeline`, `GANTT_TEMPLATE_NONE`, and all public types.
- Created `src/lib/components/gantt/AGENT.md` (architecture, time-to-pixel mapping, rendering lifecycle, bar rendering, selection, move/resize validation, drag-and-drop, keyboard model, view range/zoom, template independence, known issues) and `SKILL.md` (installation, quick start, options table, item/row shapes, methods table, events table, keyboard shortcuts, content templates section with "Creating a custom template" guide, integration notes). Copied both to `public/docs/components/gantt-AGENT.md` and `gantt-SKILL.md`.
- Added 3 Gantt-specific content templates to `src/lib/templates/index.ts` `registerBuiltinTemplates()`:
  - `gantt.standard-bar` (Standard Bar) — title slot only. The default Gantt bar pattern.
  - `gantt.minimal-bar` (Minimal Bar) — no slots, plain colored fill. For high-density timelines.
  - `gantt.detailed-bar` (Detailed Bar) — title + assignee avatar + refId badge. For resource timelines.
- Created `src/components/gantt/gantt-react.tsx`: React wrapper around `GanttTimeline`. Create-once mount effect, callback refs, imperative forwarding via `setProperty` effects, `instanceRef` for playground quick actions, `ResizeObserver` for responsive layout.
- Created `src/components/gantt/gantt-playground.tsx` (~870 lines): the full component detail page.
  - Module-scope `registerBuiltinTemplates()` call (mirrors Kanban pattern).
  - Seed data: 4 rows (Research, Design, Development, QA) + 8 items with varied start/end/progress/color/assignee/refId fields. View range: now - 7 days to now + 28 days.
  - Template options memo: prepends "None" (GANTT_TEMPLATE_NONE) to the Gantt templates from the registry.
  - Live canvas (h-[600px]): CalendarRange icon + "Live canvas" + active template chip (LayoutTemplate or Ban icon) + item/row count + Reset. GanttReact board on bg-grid. Output section with selected item chip + date range chip + last event + keyboard hint.
  - Properties panel uses `AgentSkillTabs` with `templatesSlot`:
    - **Templates tab**: template picker (None + 3 Gantt templates, each with name/id/description/slot chips) + "Creating custom templates" info box (3-step guide with code examples).
    - **Properties tab**: Mode (editable/read_only), Scale (day/week/month), 8 toggle switches (showRowHeaders, showGrid, showToday, showAxis, progressEnabled, movable, resizable, rowMovable), 3 sliders (rowHeight 32-80, barHeight 16-40, rowHeaderWidth 100-240), quick actions (Zoom in, Zoom out, Today, Fit to data).
  - Code panel: JavaScript/HTML/CSS/API tabs. JS tab generated from live state.
  - Documentation section: Overview + whenToUse/whenNotToUse, Properties table (25 rows), Methods cards (23), Events cards (14), Accessibility bullets, Content templates panel (5-row template table + 3-step custom template guide with code). Sticky "On this page" sidebar.
- Wired the platform:
  - `src/lib/platform/content.ts`: appended a `gantt` ComponentMeta after `kanban`. Slug "gantt", name "Gantt Timeline", category "productivity", status "stable", 25 properties, 23 methods, 14 events, defaults block.
  - `src/store/navigation.ts`: extended `routeLabel` with `route.slug === "gantt" ? "Gantt Timeline"`.
  - `src/app/page.tsx`: imported `GanttPlayground` and added `route.category === "productivity" && route.slug === "gantt"` branch.
- Ran `bun run lint` → 0 errors, 0 warnings. Ran `bunx tsc --noEmit` → no type errors in any gantt/templates files (fixed a duplicate `id` property error in seed items by renaming the custom badge field to `refId`, and updated the `gantt.detailed-bar` template to use `refId` instead of `id`).
- Agent Browser verification:
  - Navigated Home → Productivity category (now shows "2 READY") → Gantt Timeline playground.
  - Confirmed 8 bars across 4 rows, time axis with date labels, red Today marker, row headers.
  - Confirmed collapsible long description (Show more button present).
  - Confirmed Templates tab shows 4 options (None, Standard Bar, Minimal Bar, Detailed Bar) + "Creating custom templates" guide.
  - Switched to "None": bars render with native `gantt-bar-title` (not template `ctpl-title`), 0 ctpl-* elements, progress overlay + resize handles still present.
  - Switched to "Detailed Bar": 8 ctpl-titles, 7 ctpl-avatars (one bar has no assignee), 4 ctpl-id-badges (matching 4 items with refId) — template renders correctly inside bars.
  - Switched back to "Standard Bar": 8 ctpl-titles only.
  - Clicked "Fit to data" quick action: bars repositioned, toast appeared with the fitted date range.
  - Verified AGENT/SKILL doc endpoints return 200.
  - VLM-verified the screenshot: confirmed timeline with colored bars, Today marker, 4 rows, Properties tab with toggles, truncated description with Show more.
- Dev log: clean compilation, no errors.

Stage Summary:
- Gantt Chart Timeline Bars component built per the §15 minimum viable specification. Files produced:
  - `src/lib/components/gantt/gantt.ts` — `GanttTimeline` class (DOM + scoped CSS, linear time-to-pixel mapping, 6 scales, drag-to-move, resize handles, progress overlay, today marker, grid lines, snapping, pointer + keyboard interactions, full event system, template-driven bar content, idempotent destroy).
  - `src/lib/components/gantt/index.ts` — public barrel.
  - `src/lib/components/gantt/AGENT.md` + `SKILL.md` — contribution guide + usage docs.
  - `public/docs/components/gantt-AGENT.md` + `gantt-SKILL.md` — copies for the playground's AGENT/SKILL tabs.
  - `src/components/gantt/gantt-react.tsx` — React wrapper (create-once, imperative forwarding, callback refs, ResizeObserver).
  - `src/components/gantt/gantt-playground.tsx` — full playground (live canvas + Templates tab + Properties + Code panel + Documentation).
  - `src/lib/templates/index.ts` — extended with 3 Gantt templates (standard-bar, minimal-bar, detailed-bar).
- Public API surface (final):
  - `new GanttTimeline(container, options?: GanttOptions)`
  - `setItems(items)` / `setRows(rows)` / `getItems()` / `getRows()`
  - `selectBar(id | null, source?)` / `clearSelection()` / `getSelectedBar()`
  - `moveBar(itemId, start, end, source?)` / `resizeBar(itemId, endpoint, time, source?)` / `moveBarToRow(itemId, rowId, source?)`
  - `setViewRange(start, end, source?)` / `setScale(scale)` / `zoomIn()` / `zoomOut()` / `fitToRange(start, end)` / `navigateTo(time)` / `today()` / `getViewRange()`
  - `getTemplate()` / `getTemplateId()` / `setTemplateId(id)` (pass `"none"` for native rendering)
  - `setProperty(name, value)` / `on(event, handler)` / `off(event, handler)` / `destroy()`
- Events: `bar_selected`, `selection_changed`, `bar_activated`, `bar_moved`, `bar_resized`, `bar_move_requested`, `bar_resize_requested`, `bar_move_rejected` (reason: read_only, invalid_item, invalid_interval, min_duration, row_movable_disabled, invalid_row), `bar_row_changed`, `bar_delete_requested`, `view_range_changed`, `scale_changed`, `drag_started`, `drag_cancelled`.
- Routing: `component/productivity/gantt` → `<GanttPlayground />`. Appears in sidebar under Productivity → Gantt Timeline. The Productivity category now shows "2 READY" (Kanban + Gantt).
- Design discipline: only brand lemon accent, no indigo/blue, scoped `.gantt-` CSS with `--gt-*` tokens, epoch-ms time model (no timezone complexity), template-independent (works with "none" or any registered ID), content templates are an opt-in layer on top of the native component.

---
Task ID: 44
Agent: main
Task: Add Navigation category + build Breadcrumb component

Work Log:
- Read the existing platform structure (categories, components, sidebar, home-view, category-view, components-view) to understand how categories are registered and where icon mappings live.
- Added "Navigation" category to `src/lib/platform/content.ts` categories array: slug "navigation", name "Navigation", icon "Navigation", description "Components for wayfinding, hierarchy, and moving between locations in application interfaces.", capabilities + useCases.
- Extended `src/store/navigation.ts` `categoryLabel` with `case "navigation": return "Navigation"`.
- Added the "Navigation" Lucide icon import + category-icon mapping in 3 files that maintain their own `CATEGORY_ICONS` maps:
  - `src/components/platform/sidebar.tsx` — added `navigation: Navigation` (also added `productivity: Boxes` which was missing).
  - `src/components/views/home-view.tsx` — added `Navigation` + `KanbanSquare` imports and mappings.
  - `src/components/views/category-view.tsx` — added `Navigation` + `KanbanSquare` imports and mappings.
  - `src/components/views/components-view.tsx` — added `Navigation` + `KanbanSquare` imports and mappings.
- Created `src/lib/components/breadcrumb/breadcrumb.ts` (~640 lines):
  - Public types: `CrumbSeparator` (chevron/slash/arrow/dot), `BreadcrumbItem` (id, label, icon?, href?, disabled?), `BreadcrumbOptions`, `BreadcrumbEventPayload`, `BreadcrumbHandler`.
  - Scoped CSS injected once (id `breadcrumb-styles`) with `.crumb-` prefix and `--cb-*` custom properties. Only the brand lemon (#D9FF66) is used as the accent.
  - `Breadcrumb` class with the full public API: constructor, setItems, selectItem, clearSelection, getSelectedItem, getItems, setProperty, on, off, destroy.
  - DOM structure: `<nav class="crumb-nav" aria-label="Breadcrumb">` containing an `<ol class="crumb-list">` of `<li class="crumb-item-wrapper">` items. Each item is an `<a>` (if href) or `<button>`, with an optional icon + label. Separators are `<span class="crumb-separator" aria-hidden="true">` with inline SVG (chevron/slash/arrow/dot).
  - Max-items collapse: `computeVisibility()` returns first + last as visible and middle as collapsed when `maxItems > 0` and trail length exceeds it. The overflow button (three-dot icon) is inserted between the first and second visible items. Clicking opens a dropdown menu (`role="menu"` with `role="menuitem"` entries) listing the collapsed items.
  - Overflow menu: outside-click and Escape close it; focus returns to the overflow button. `aria-expanded` toggled on the button.
  - Current-page marking: the last item gets `crumb-current` class + `aria-current="page"` when `markCurrent` is true; it is not clickable.
  - Three density modes: compact (12px, 28px min-height), comfortable (13px, 32px), spacious (14px, 40px).
  - Read-only mode: items are not clickable, just a static trail.
  - Keyboard model: items are `tabindex="0"` (current item is `tabindex="-1"`). Tab/Shift+Tab moves between items; Enter/Space activates; ArrowLeft/Right roves focus; Escape closes the overflow menu.
  - Five built-in icons: home, folder, file, settings, user — each an inline SVG. Unknown icon names are silently dropped.
  - Events: `item_selected`, `item_activated` (host should navigate), `overflow_toggled`.
  - `setProperty` switch handles all options.
  - Idempotent `destroy()`.
- Created `src/lib/components/breadcrumb/index.ts` — barrel re-exporting `Breadcrumb` and all public types.
- Created `src/lib/components/breadcrumb/AGENT.md` (architecture, rendering lifecycle, max-items collapse, selection, keyboard model, overflow menu, separator, icons, known issues) and `SKILL.md` (installation, quick start, options table, item shape, methods table, events table, keyboard shortcuts, max-items collapse section, separators section, icons section, React example, integration notes). Copied both to `public/docs/components/breadcrumb-AGENT.md` and `breadcrumb-SKILL.md`.
- Created `src/components/breadcrumb/breadcrumb-react.tsx`: React wrapper around `Breadcrumb`. Create-once mount effect, callback refs, imperative forwarding via `setProperty` effects, `instanceRef` for playground quick actions, items replaced via `setItems` when the array reference changes.
- Created `src/components/breadcrumb/breadcrumb-playground.tsx` (~430 lines): the full component detail page.
  - Live canvas (h-[600px]): shows 4 breadcrumb instances — (1) Primary trail (driven by the Properties panel state), (2) Slash variant (slash separator, compact, no icons), (3) Collapsed variant (maxItems=4, chevron), (4) Read-only variant (arrow separator, spacious). Header shows NavIcon + "Live canvas" + item count + Reset. Output section with selected item chip + href chip + last event + keyboard hint.
  - Properties panel uses `AgentSkillTabs`:
    - **Properties tab**: Separator 4-way (chevron/slash/arrow/dot), Density 3-way (compact/comfortable/spacious), Max items slider 0-8 (0 = ∞), 3 toggle switches (showIcons, markCurrent, readOnly), quick actions (Add item, Remove last).
  - Code panel: JavaScript/HTML/CSS/API tabs. JS tab generated from live state.
  - Documentation section: Overview + whenToUse/whenNotToUse, Properties table (9 rows), Methods cards (9), Events cards (3), Accessibility bullets (8). Sticky "On this page" sidebar.
  - Seed data: 6 items (Home, Projects, Web App, Settings, Billing, Current Invoice) with icons and hrefs.
- Wired the platform:
  - `src/lib/platform/content.ts`: appended a `breadcrumb` ComponentMeta after `gantt`. Slug "breadcrumb", name "Breadcrumb", category "navigation", status "stable", 9 properties, 9 methods, 3 events, defaults block.
  - `src/store/navigation.ts`: extended `routeLabel` with `route.slug === "breadcrumb" ? "Breadcrumb"`.
  - `src/app/page.tsx`: imported `BreadcrumbPlayground` and added `route.category === "navigation" && route.slug === "breadcrumb"` branch.
- Ran `bun run lint` → 0 errors, 0 warnings. Ran `bunx tsc --noEmit` → no type errors in any breadcrumb files.
- Agent Browser verification:
  - Navigated Home → Navigation category (new card on home page, shows "1 READY") → Breadcrumb playground.
  - Confirmed 4 breadcrumb instances render (20 items total across all instances).
  - Confirmed collapsible long description (Show more button present).
  - Confirmed the Collapsed variant (maxItems=4) shows only Home + Current Invoice with an overflow button.
  - Clicked the overflow button: dropdown menu opened showing the 4 collapsed items (Projects, Web App, Settings, Billing).
  - Clicked outside: overflow menu closed (outside-click handler works).
  - Changed separator to Slash: the primary trail's separators updated to slash SVG paths.
  - Changed maxItems slider to 3: the primary trail collapsed (verified via React state).
  - Clicked a breadcrumb item: toast appeared (item_activated event fired).
  - Verified AGENT/SKILL doc endpoints return 200.
  - VLM-verified the screenshot: confirmed Breadcrumb heading, multiple trail variants with icons, Show more button, Properties panel with separator/density/maxItems controls, and the overflow dropdown menu showing hidden items.
- Dev log: clean compilation, no errors.

Stage Summary:
- New "Navigation" category established (6th category, alongside color/inputs/layout/data-display/productivity). Appears in the sidebar, home-page category cards, components directory, and category-view with the Navigation (compass) Lucide icon.
- Breadcrumb component built per the established platform pattern. Files produced:
  - `src/lib/components/breadcrumb/breadcrumb.ts` — `Breadcrumb` class (DOM + scoped CSS, 4 separators, 5 icons, max-items collapse with overflow dropdown, current-page marking, 3 densities, read-only mode, keyboard navigation, full event system, idempotent destroy).
  - `src/lib/components/breadcrumb/index.ts` — public barrel.
  - `src/lib/components/breadcrumb/AGENT.md` + `SKILL.md` — contribution guide + usage docs.
  - `public/docs/components/breadcrumb-AGENT.md` + `breadcrumb-SKILL.md` — copies for the playground's AGENT/SKILL tabs.
  - `src/components/breadcrumb/breadcrumb-react.tsx` — React wrapper (create-once, imperative forwarding, callback refs).
  - `src/components/breadcrumb/breadcrumb-playground.tsx` — full playground (4 live breadcrumb variants + Properties panel + Code panel + Documentation).
- Public API surface (final):
  - `new Breadcrumb(container, options?: BreadcrumbOptions)`
  - `setItems(items)` / `getItems()`
  - `selectItem(id | null, source?)` / `clearSelection()` / `getSelectedItem()`
  - `setProperty(name, value)` / `on(event, handler)` / `off(event, handler)` / `destroy()`
- Events: `item_selected`, `item_activated` (host should navigate), `overflow_toggled`.
- Routing: `component/navigation/breadcrumb` → `<BreadcrumbPlayground />`. Appears in sidebar under Navigation → Breadcrumb. The Navigation category shows "1 READY" on the home page.
- Design discipline: only brand lemon accent, no indigo/blue, scoped `.crumb-` CSS with `--cb-*` tokens, routing-independent (emits IDs, host navigates), 4 separators + 5 icons built-in, max-items collapse with accessible overflow menu, 3 density modes, read-only mode, full keyboard navigation.

---
Task ID: 45
Agent: main
Task: Rebuild NodesGraph (mindmap) from scratch + build SocketNodesGraph as separate component on top

Work Log:
- Read the old nodes-graph implementation (940 lines, canvas-based, built on top of Board). Identified past issues: path redraw sync during pan/zoom, socket positions not updating on resize, had to hack into Board's internal canvas, interactive socket drag-to-connect not implemented, interaction conflicts (path selection vs drag-to-connect vs resize). The old component was marked "unstable".
- Rebuilt from scratch with DOM-based rendering (not canvas) to fix all sync issues:

**NodesGraph (foundation)** — `src/lib/components/nodes-graph/nodes-graph.ts` (~1170 lines):
- DOM-based: nodes are absolutely-positioned DOM elements; connections are SVG bezier paths in an overlay `<svg>` layer. No canvas, no Board dependency.
- Infinite canvas via CSS transform on a "world" div: `translate(panX,panY) scale(zoom)`. Pan = drag empty canvas; zoom = wheel toward cursor (cursor-stable).
- Grid background tracks pan/zoom via CSS `background-position` and `background-size`.
- **Connection sides**: top, bottom, left, right — at the center of each node edge. Each node can enable a subset via `sides` (default: all four).
- **Drag-to-connect**: pointerdown on a per-side handle (`.ng-handle`) starts a temp bezier path that follows the cursor; pointerup on another node's handle creates the connection. Self-connections are rejected with `connection_rejected` event.
- **Node drag**: pointerdown on node body (not handle) starts a node drag; `pointermove` updates the node's x/y live and redraws all connections; `pointerup` emits `node_moved`.
- **Selection**: single node or single connection. Click node → select; click connection path → select; click empty canvas → clear. `ng-selected` class for visual feedback.
- **Keyboard**: Arrow keys move selected node by gridSize; Delete/Backspace removes selected node or connection; Escape clears selection.
- **Toolbar**: Add node, Fit, Zoom in, Zoom out, Reset zoom. Info line shows node/conn count + zoom %.
- **Events**: `node_selected`, `node_added`, `node_removed`, `node_moved`, `connection_added`, `connection_removed`, `connection_rejected`, `zoom_changed`.
- **Pluggable**: `renderNodeContent(node)` and `getConnectionPoint(ep)` are `protected` — subclasses override to customize.
- Scoped CSS (`.ng-` prefix) with `--ng-*` custom properties; only brand lemon accent.
- `ResizeObserver` for responsive layout.
- All interaction state (`panMode`, `dragConnectionFrom`, `tempPath`, etc.) is `protected` so subclasses can reuse the connect flow.

**SocketNodesGraph** — `src/lib/components/nodes-graph/socket-nodes-graph.ts` (~640 lines):
- `extends NodesGraph`. Overrides:
  - `renderNodeContent(node)` — builds `.ng-socket-rows` layout: vertical rows, each with at most one left socket + control component + one right socket.
  - `getConnectionPoint(ep)` — returns the pixel position of a specific row socket (left/right edge at the row's vertical center), not just the node side center.
  - `onSocketPointerDown()` — drag-to-connect from a socket dot to another socket (left↔right only).
- **Socket node layout**: only left/right connection sides. Each row has:
  - `leftSocket?` — socket dot at left edge of the row.
  - `control?` — a control component between the sockets: label, checkbox, toggle, dropdown, range, text, number.
  - `rightSocket?` — socket dot at right edge of the row.
- **Control types** (7): `label` (static text), `checkbox`, `toggle` (switch), `dropdown` (select), `range` (slider with min/max/step), `text` (text input), `number` (numeric input).
- **Auto-height**: node height grows with the number of rows (measured via `requestAnimationFrame` after render).
- **control_changed event**: emitted with `{ nodeId, socketId, controlId, controlValue }` when any control value changes.
- **addSocketNode(partial)**: convenience method to add a socket node with `data.rows`.
- Connection endpoints include `socketId` for socket-to-socket connections.
- Additional scoped CSS (`.ng-sock-`, `.ng-socket-row`, `.ng-control-` etc.) layered on top of the base `.ng-` styles.

**Supporting files**:
- `index.ts` — barrel exporting both classes + all types.
- `AGENT.md` + `SKILL.md` for nodes-graph + socket-nodes-graph (copied to `public/docs/components/`).
- `src/components/nodes-graph/nodes-graph-react.tsx` — React wrapper for NodesGraph.
- `src/components/nodes-graph/nodes-graph-playground.tsx` — mindmap playground (6 seed nodes + 5 connections, Properties panel with toggles, code panel, docs).
- `src/components/socket-nodes-graph/socket-nodes-graph-react.tsx` — React wrapper for SocketNodesGraph.
- `src/components/socket-nodes-graph/socket-nodes-graph-playground.tsx` — socket playground (3 seed nodes: Input/Process/Output, 7 rows with varied controls, 3 socket-to-socket connections).

**Platform wiring**:
- `content.ts`: replaced the old nodes-graph meta (was "unstable", canvas-based, mode-based) with a clean stable meta. Added `socket-nodes-graph` meta. Both in the `layout` category.
- `navigation.ts`: routeLabel for `nodes-graph` → "Nodes Graph" (was "Nodes Graph (Unstable)"), added `socket-nodes-graph` → "Socket Nodes Graph".
- `page.tsx`: added `socket-nodes-graph` route branch.
- TS fixes: `GraphNode.data` changed to `unknown` (allows subclass narrowing); `SocketNode` defined independently (not extends GraphNode); private→protected for subclass-shared fields; `socketId`/`controlId`/`controlValue` added to `GraphEventPayload`.

**Verification**:
- `bun run lint` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` → no errors in nodes-graph/socket-nodes-graph files.
- Agent Browser:
  - Layout category now shows "5 READY" (was 4, +socket-nodes-graph).
  - Nodes Graph playground: 6 nodes, 5 connections, 24 handles (4 per node), toolbar present. VLM-verified nodes + curved connections + toolbar.
  - Socket Nodes Graph playground: 3 nodes, 9 sockets, 7 rows, 7 controls (range, toggle, text, dropdown, checkbox, number, label), 3 connections. VLM-verified node boxes with rows, sockets on left/right edges, control components, curved connection lines.
  - Control interaction: changed range slider to 75 → output showed "control r1 = 75" (control_changed event fired).
  - All 4 doc endpoints (nodes-graph AGENT/SKILL, socket-nodes-graph AGENT/SKILL) return 200.
- Dev log: clean compilation.

Stage Summary:
- NodesGraph rebuilt from scratch with DOM-based rendering, fixing all past issues (path sync, socket positioning, canvas dependency, interaction conflicts). Now stable. Connection sides: top/bottom/left/right at center of each edge. Full drag-to-connect, pan/zoom, keyboard, selection, events.
- SocketNodesGraph built as a separate component extending NodesGraph. Socket nodes have horizontal-only (left/right) connections, vertical rows with at most one left socket + control + one right socket. 7 control types (label, checkbox, toggle, dropdown, range, text, number). Auto-height nodes. Socket-to-socket connections via drag. control_changed events.
- Both appear in sidebar under Layout. The Layout category now has 5 components (was 4): Board, Nodes Graph, Socket Nodes Graph, Toggle Group, Periodic Range.

---
Task ID: rebuild-playgrounds
Agent: main
Task: Write 8 playground .tsx files following the breadcrumb-playground template exactly

Work Log:
- Read `worklog.md` (Tasks 44 + 45 — the breadcrumb build) and `src/components/breadcrumb/breadcrumb-playground.tsx` as the canonical template.
- Read each of the 8 React wrappers (`*-react.tsx`) and vanilla classes (`@/lib/components/*/*.ts`) to confirm the exact prop names, types, and `instanceRef` shapes:
  - `CollapseReact` (items, accordion, showIcons, defaultOpenIds, onToggle)
  - `AvatarReact` (items, size, shape, showStatus, max, grouping)
  - `CarouselReact` (slides, current, loop, autoplay, autoplayInterval, showArrows, showDots, transition, onChange)
  - `BadgeReact` (items, size, grouping)
  - `TimelineReact` (entries, side, showDates, showIcons)
  - `ScrollLayoutReact` (children, orientation, scrollbar, maxHeight, minHeight, showShadow)
  - `DrawerReact` (side, size, open, showOverlay, closeOnOverlayClick, closeOnEscape, title, content, onChange)
  - `MarqueeReact` (items, direction, speed, pauseOnHover, gap, showSeparator, separator)
- Wrote each playground with the breadcrumb template's exact anatomy: `"use client"`, the standard import block, `const meta = getComponent("<slug>")!`, `interface State` + `DEFAULTS`, seed data per spec, the component function with header bar (Breadcrumbs + PageOverline + h1 + CollapsibleDescription + tags + status badge), grid with live canvas (`h-[600px]` panel) + `AgentSkillTabs` properties panel, code panel (JS/HTML/CSS/API tabs), and documentation section (Overview + Properties table + Methods/Events cards + Accessibility + sticky "On this page" sidebar).
- Per-spec properties wired up:
  - Collapse (layout / collapse): accordion + showIcons toggles, 5 seed items (General Settings, Privacy, Notifications, Appearance, Advanced) with content text. Variants shown: primary, accordion, minimal. Quick actions: Open all, Close all, Add panel, Remove last.
  - Avatar (data-display / avatar): size 5-way (xs/sm/md/lg/xl), shape 3-way (circle/square/rounded), showStatus toggle, max slider 0-8, grouping toggle. 8 seed avatars with names + statuses + colors. Variants: hero xl, square+overflow max=4, rounded stack. Quick actions: Add avatar, Remove last, Toggle layout.
  - Carousel (layout / carousel): loop + autoplay + showArrows + showDots toggles, autoplayInterval slider (1000-8000ms), transition 2-way (slide/fade). 5 seed slides with titles/descriptions/colors. Variants: fade, minimal. Quick actions: Play/Stop, Prev, Next, First.
  - Badge (data-display / badge): size 3-way (sm/md/lg), variant legend grid (default/success/warning/danger/info/accent with color swatches). 10 seed badges — mix of variants, dots, removable. Variants: by-variant, small+removable, large+loose. Quick actions: Add badge, Remove last.
  - Timeline (data-display / timeline): side 3-way (left/right/alternate with icons), showDates + showIcons toggles. 6 seed entries with dates, titles, descriptions, colors. Variants: alternate, right-aligned. Quick actions: Add entry, Remove last.
  - ScrollLayout (layout / scroll-layout): orientation 3-way (vertical/horizontal/both with icons), scrollbar 4-way (auto/always/hidden/hover), maxHeight slider 200-600, showShadow toggle. Live canvas: 22 paragraphs of seed content (vertical), 10 horizontal cards, 10 cards in a hidden-scrollbar variant. "Scroll to top" + "Scroll to bottom" buttons in output row + quick actions, wired to `instanceRef.current.scrollToTop()/scrollToBottom()`.
  - Drawer (layout / drawer): side 4-way (top/bottom/left/right with icons), size slider 200-600, showOverlay + closeOnOverlayClick + closeOnEscape toggles. Live canvas: lemon "Open Drawer" CTA button + side-reference card grid (click to switch side) + close button when open. Quick actions: Open, Close, Toggle. Drawer onChange handler syncs React state so the Close button shows/hides correctly.
  - Marquee (layout / marquee): direction 4-way (left/right/up/down with icons), speed slider 10-200, gap slider 0-60, separator text input (max 4 chars), pauseOnHover + showSeparator toggles. 8 seed text items. Variants: right (no separator), vertical-up (◆ separator). Pause/Resume button in output row + quick actions, wired to `instanceRef.current.pause()/resume()`.
- All 8 playgrounds use `AgentSkillTabs` with `agentPath="/docs/components/<slug>-AGENT.md"` and `skillPath="/docs/components/<slug>-SKILL.md"`.
- All 8 playgrounds generate the JS code tab from live state via `useMemo` so the snippet reflects the current panel configuration.
- Brand lemon (`#D9FF66`) is the only accent in every file — no indigo/blue. `cn` is used for conditional classes throughout.
- Initial `bun run lint` was clean. `bunx tsc --noEmit` caught 3 lucide-react import errors I had introduced:
  - `PanelTopActive` does not exist → switched to `PanelTop` (collapse + scroll-layout).
  - `Marquee` does not exist as a lucide icon → switched to `Repeat` (marquee).
- Verified all remaining icons exist (`Users`, `CircleUser`, `GalleryHorizontalEnd`, `Tag`, `GitCommitVertical`, `PanelRightOpen`, `ArrowUpFromLine`, `ArrowDownToLine`, `ArrowLeftFromLine`, `ArrowRightFromLine`, `MoveHorizontal`, `MoveVertical`, `Move`, `Columns2`, `AlignLeft`, `AlignRight`, `ChevronLeft`, `ChevronRight`, `Pause`, `Play`, `Plus`, `Trash2`, `RotateCcw`, `X`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `ChevronsDownUp`, `ChevronsUpDown`) via a node check.
- Re-ran `bun run lint` → 0 errors, 0 warnings (clean output).
- Re-ran `bunx tsc --noEmit` filtered to the 8 new playground files → 0 errors.
- Dev log: clean compilation, no errors.

Stage Summary:
- 8 playground .tsx files produced (one per component), each ~440-540 lines, each following the breadcrumb-playground template exactly. Files:
  - `src/components/collapse/collapse-playground.tsx` — exports `CollapsePlayground`
  - `src/components/avatar/avatar-playground.tsx` — exports `AvatarPlayground`
  - `src/components/carousel/carousel-playground.tsx` — exports `CarouselPlayground`
  - `src/components/badge/badge-playground.tsx` — exports `BadgePlayground`
  - `src/components/timeline/timeline-playground.tsx` — exports `TimelinePlayground`
  - `src/components/scroll-layout/scroll-layout-playground.tsx` — exports `ScrollLayoutPlayground`
  - `src/components/drawer/drawer-playground.tsx` — exports `DrawerPlayground`
  - `src/components/marquee/marquee-playground.tsx` — exports `MarqueePlayground`
- Each file uses `getComponent("<slug>")!` as in the template. The platform metadata (`components` array in `src/lib/platform/content.ts`) does not yet include entries for these 8 slugs — a follow-up wiring task should add the ComponentMeta entries, route branches in `src/app/page.tsx`, routeLabel entries in `src/store/navigation.ts`, and create the AGENT/SKILL doc files at `public/docs/components/<slug>-AGENT.md` and `<slug>-SKILL.md` for the AGENT/SKILL tabs to load successfully. These were out of scope for the rebuild-playgrounds task.
- Design discipline: only brand lemon accent (no indigo/blue), `cn` for conditional classes, `useMemo` for the live JS snippet, full documentation section (Overview + Properties + Methods + Events + Accessibility + sticky sidebar), all 4 code tabs (JS/HTML/CSS/API) per the template.
- Work record written to `agent-ctx/rebuild-playgrounds-main.md`.

---
Task ID: 46
Agent: main
Task: Fix CustomButton props editor issues — size variants not applying, icon position not changing, remove color/draggable/active, add variant, fix calendar with 4 separate dropdowns (day/week/month/year)

Work Log:
- Read custom-button.ts, custom-button-props-editor.tsx, calendar.ts, calendar-playground.tsx, and the 3 range playgrounds (periodic-range, color-range, color-ramp) to understand the full picture.
- **custom-button.ts CSS fix**: The thumb and cell variants had hardcoded `font-size: 10px` / `font-size: 12px` which OVERRIDDEN the size token's `--cb-font-size`. Removed these hardcoded font-sizes so the size token (sm=12px, md=14px, lg=16px) flows through. Also fixed broken orphaned CSS rules (leftover from a removed color-dot feature) that were invalid CSS. Changed thumb gap from 0 to 2px for icon+text spacing.
- **custom-button.ts render() fix**: For thumb/cell variants, when explicit width=0, now sets `style.width = "var(--cb-h)"` (square fallback) instead of empty string. This ensures an empty thumb/cell is still visible and size changes are obvious (32→36→40px square). Height already fell back to `var(--cb-h)` from the base rule.
- **custom-button.ts**: Added `setIconType(type)` method for clean iconType setting (replaces the hacky `btn.setIcon(btn["options"].icon || "", value)` pattern in parent components).
- **custom-button-props-editor.tsx**: Removed `draggable` and `active` from the `CustomButtonProps` interface and removed their PropRow UI elements. These are internal thumb behaviors, not user-facing props. The `variant` prop was already present.
- **3 range playgrounds** (periodic-range, color-range, color-ramp): Removed `color: ""`, `draggable: false`, `active: false` from `thumbDefaults`. Removed `active` and `draggable` from `thumbOverrides` maps. Fixed the `iconType` case in all 3 parent components' `setThumbProp` methods to use `btn.setIconType(value)` instead of the hacky bracket-notation access.
- **3 range playgrounds — diff-based prop application**: Changed `onThumbChange` callbacks to (1) detect when size changed and clear width/height to 0 so the size token controls dimensions, and (2) only apply props that actually changed (comparing against previous state). This prevents the playground from re-applying old width/height values after the size handler cleared them — which was the root cause of size variants not applying visually.
- **calendar.ts**: Rewrote cell tracking from a single `cellButtons[]` array to 4 separate categories: `dayCellButtons[]`, `weekCellButtons[]`, `monthCellButton`, `yearCellButton`. The `applyCustomButtonCells()` method now converts all 4 cell types to CustomButtons: `.cal-cell` → day, `.cal-week-cell` → week, `.cal-month-cell` → month title, `.cal-year-cell` → year title. The render() method was updated to emit `.cal-week-cell`, `.cal-month-cell`, `.cal-year-cell` elements.
- **calendar.ts setCellProp**: Changed signature to `setCellProp(category, prop, value, targetKey)` where category is "day"|"week"|"month"|"year". Added `disabled`, `width`, `height` cases (were missing). Fixed `iconType` to use `setIconType`. Added `cellOverrides` persistence store + `reapplyCellOverrides()` called after each render so size/icon changes survive month navigation.
- **calendar-playground.tsx**: Replaced the single cell-target dropdown with 4 separate CollapsibleSection editors — one per category (Day Cells, Week Cells, Month Title, Year Title), each with its own instance dropdown. Added per-category override maps (day/week/month/year have different locked props). Added `CellCategory` type. Updated `onCellPropsChange` to use the diff-based approach (detect size change → clear width/height, only apply changed props).
- **Agent Browser verification**:
  - Calendar: 4 sections visible (Day Cells, Week Cells, Month Title, Year Title). Day cells: changed size to "lg" → cells became 40px×40px with 16px font (was 36px/12px). Size persisted across month navigation. Icon position changed to "top" → flex-direction: column with icon above text. Month title: changed size to "lg" → 40px/16px, persisted across navigation to November.
  - Color Range: thumb changed size to "lg" → 40px×40px with 16px font (was 16px/12px). Icon set to "star", position changed to "top" → column layout.
  - No console errors or page errors in either playground.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files (pre-existing errors in unrelated files only).

Stage Summary:
- Size variants (sm/md/lg) now apply visually for ALL CustomButton variants (primary, secondary, outline, ghost, thumb, cell) — the size token's `--cb-h`, `--cb-font-size` flow through to thumb/cell which previously had hardcoded font-sizes.
- Icon position (left/right/top/bottom) now works in all parent components — the render() method handles icon/text ordering for thumb/cell, and the CSS flex-direction changes apply correctly.
- `color`, `draggable`, and `active` removed from `CustomButtonProps` editor interface. `variant` is present.
- Calendar has 4 separate dropdowns (day/week/month/year), each in its own collapsible section, each with its own instance selector and per-category override locks.
- Calendar cell prop changes persist across re-renders (month navigation) via the `cellOverrides` store + `reapplyCellOverrides()`.
- Root cause of size-not-applying was the playground re-applying ALL props (including width/height) after the size handler cleared them — fixed with diff-based prop application that only sends changed props and clears width/height when size changes.

---
Task ID: 47
Agent: main
Task: Add button style variants (primary/secondary/ghost) to reused button props + consolidate calendar 4 sections into one with a category dropdown group

Work Log:
- **Variant unlock**: Removed `variant` from the override maps in all 4 playgrounds (periodic-range, color-range, color-ramp, calendar). Previously `variant` was locked with "fixed as thumb" / "fixed as cell" — now the variant dropdown in CustomButtonPropsEditor is fully editable, letting the user switch between primary/secondary/outline/ghost/thumb/cell for any reused button instance.
- **Calendar single section**: Replaced the 4 separate CollapsibleSections (Day Cells / Week Cells / Month Title / Year Title) with ONE "CustomButton (cells)" section. Inside it:
  - A 4-button category group at the top (Day / Week / Month / Year, each with its own Lucide icon) — clicking switches the active category.
  - An instance dropdown below the group — its options change based on the active category (day → all+dates, week → all+weeks, month → single "Month Title", year → single "Year Title").
  - The CustomButtonPropsEditor for the selected category + instance.
  - Added `activeCategory` state (default "day") to track which category is shown.
- **Agent Browser verification**:
  - Calendar: ONE "CustomButton (cells)" section visible. Category group shows Day/Week/Month/Year buttons. Clicking each switches the instance dropdown (All Day Cells → All Week Cells → Month Title → Year Title). Changed day cell variant to "primary" → cells became lemon `rgb(217,255,102)` background (was transparent "cell" variant). No console/page errors.
  - Periodic Range: Changed min thumb variant to "primary" → thumb became lemon background (was white "thumb" variant). Variant dropdown is editable, not locked.
- `bun run lint` → 0 errors.

Stage Summary:
- Button style variants (primary/secondary/outline/ghost/thumb/cell) are now selectable in the reused CustomButton props editor for ALL parent components (periodic-range, color-range, color-ramp, calendar). Previously variant was locked.
- Calendar's 4 cell categories are now accessed via a single "CustomButton (cells)" section with a Day/Week/Month/Year button group at the top, rather than 4 separate collapsible sections. The instance dropdown updates based on the selected category.

---
Task ID: 48
Agent: main
Task: Build a theme & token editor page as the single source of truth for the design system (similar to daisyUI theme generator but more advanced)

Work Log:
- Read globals.css (current design tokens: brand palette, semantic colors, radii, motion), navigation store (Route type + routeLabel + breadcrumbs), page.tsx (route switcher), sidebar.tsx (nav groups), and code-block.tsx (CodeBlock component for reuse).
- **Theme token model** (`src/store/theme-tokens.ts`): Created a Zustand store with localStorage persistence (`workshop-theme-tokens`). The `ThemeTokens` interface has 8 categories:
  - colors (28 tokens: brand + semantic + surfaces)
  - spacing (11 tokens: space-0 through space-16)
  - radii (5 tokens: sm/md/lg/xl/pill)
  - typography (17 tokens: font families, sizes, weights, line-heights, tracking)
  - shadows (4 tokens: sm/md/lg/glow)
  - motion (6 tokens: durations + easing curves)
  - borders (4 tokens: border widths)
  - custom (user-defined, empty by default)
  - `DEFAULT_TOKENS` mirrors the dark-theme values from globals.css.
- **Store actions**: setToken, addToken, removeToken, renameToken, applyToDocument (applies all tokens to document root as CSS custom properties), clearFromDocument (removes all inline custom properties), resetCategory, resetAll, importTokens (from JSON), exportAsCss, exportAsJson, exportAsTailwind. All mutators re-apply to the document immediately if Live mode is on, so the preview updates as the user edits.
- **Type-aware value detection**: isColorValue (hex/rgb/hsl/var()), isDimensionValue (px/rem/em/%), isDurationValue (ms/s), isNumericValue (font-weight, line-height). Used by the editor to render the right input control per token.
- **Theme editor view** (`src/components/theme-editor/theme-editor-view.tsx`): A full-page editor with:
  - Header: title, description, Live toggle (apply/clear), Import button, Export button, Reset All button (two-step confirm).
  - 8 category tabs (Colors/Spacing/Radii/Typography/Shadows/Motion/Borders/Custom) — clicking switches the active editor.
  - Token category editor: header with category name + per-category Reset, scrollable list of token rows, and an "add new token" footer (name + value + Add button).
  - Token row: click-to-rename name field, type-aware value editor (color picker for hex colors, swatch+text for var() colors, slider+text for durations, number+px for dimensions, number for numerics, plain text otherwise), and a remove button.
  - Live preview panel (sticky on desktop): surfaces swatches, brand swatches, semantic swatches, radius previews (visual squares), shadow previews (cards with shadows), spacing scale (vertical bars), typography samples (3xl/xl/base/xs-mono), and 4 button variants (primary/secondary/outline/ghost) — all rendered using `var(--token)` so they reflect live edits.
  - Export panel: CSS / JSON / Tailwind config format tabs, copy-to-clipboard, CodeBlock display.
  - Import panel: JSON textarea with validation + error messages.
- **Routing**: Added `theme-editor` to the Route union type, routeLabel ("Theme Editor"), breadcrumbs (Home → Theme Editor), a sidebar entry under Documentation → Theme Editor (after Theming), and a route branch in page.tsx rendering `<ThemeEditorView />`.
- **Agent Browser verification**:
  - Sidebar: "Theme Editor" entry appears under Documentation. Clicking navigates to the editor.
  - Page loads with all 8 category tabs, header with Live/Import/Export/Reset, and the live preview panel.
  - Colors tab shows all 28 color tokens with color pickers.
  - Turned on Live mode → tokens applied to document root. Changed brand-lemon from #D9FF66 to #00CCFF via the color picker → `getComputedStyle` immediately returned `#00ccff` (live apply works).
  - Colors category Reset → brand-lemon reverted to #D9FF66 (reset re-applies defaults).
  - Custom tab → added a "my-custom-radius: 20px" token → it appeared in the list, persisted to localStorage, and applied to the document (`--my-custom-radius: 20px`).
  - Export panel: CSS format shows `:root { --brand-lemon: #00ccff; ... }`, JSON format shows the full token tree, Tailwind format shows `theme.extend.colors/spacing/borderRadius/boxShadow/transitionDuration`.
  - Turned off Live mode → all inline custom properties cleared, `--brand-lemon` reverted to stylesheet's `#d9ff66`, `--my-custom-radius` empty. Platform fully restored.
  - No console or page errors throughout.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in new/changed files.

Stage Summary:
- New "Theme & Token Editor" page serves as the single source of truth for the design system, accessible via Documentation → Theme Editor in the sidebar.
- 8 token categories (colors/spacing/radii/typography/shadows/motion/borders/custom) with full CRUD: add, edit (type-aware inputs: color picker, slider, number, text), rename (click to edit), remove, reset-to-defaults per category or all.
- Live mode toggle applies all tokens to the document root as CSS custom properties — edits propagate in real-time to the live preview panel AND the entire platform.
- Persistence via Zustand + localStorage — tokens survive page reloads; live mode re-applies on hydration.
- Export to 3 formats: CSS (`:root { --token: value; }`), JSON (full token tree), Tailwind config (`theme.extend` structure). Import from JSON with validation.
- Custom token category lets users define arbitrary new tokens that apply to the document.
- More advanced than daisyUI's theme generator: covers 8 token categories (not just colors), supports custom tokens, live preview of the whole design system (surfaces, radii, shadows, spacing, typography, buttons), 3 export formats, import, and persistence.

---
Task ID: 49
Agent: main
Task: Redesign theme editor — top-level page, custom variants, per-corner radii, per-side borders, Live Preview as the editor with collapsible sections, class/id target selector

Work Log:
- **Task 1 — Top-level route**: Removed the Theme Editor entry from the Documentation sidebar group. Created a new top-level `themeEditorGroup` in sidebar.tsx (with Palette icon) containing a "Token Editor" entry. Placed it in `allGroups` between docsGroup and libraryGroups. Breadcrumbs already return Home → Theme Editor (not under Documentation).

- **Task 2 — Store redesign** (`src/store/theme-tokens.ts`):
  - Added `CornerRadii` interface with 16 per-corner tokens (radius-{sm,md,lg,xl}-{tl,tr,br,bl}).
  - Added `BorderToken` interface with per-side (top/right/bottom/left) definitions, each having width/color/style.
  - Added `VariantGroup` interface: name, label, predefined `options[]`, `current` value, and `custom[]` values (user-defined).
  - Added `Target` type with `Specificity` ("base" | "class" | "id") + `name`.
  - New store actions: setCorner, setRadius, setBorderSide, addBorder, removeBorder, setVariantCurrent, addVariantOption, removeVariantOption, addVariantGroup, removeVariantGroup, setTarget.
  - All mutators re-apply to the document immediately if Live mode is on.
  - `applyTokensToRoot` now emits per-corner, per-side border, and variant custom properties.
  - `exportAsCss` includes corners, borders (per-side), and variants.
  - Added `KNOWN_TARGET_CLASSES` and `KNOWN_TARGET_IDS` arrays for the target selector dropdowns (thumb, cell, custom-button-root, cal-cell, panel / min-thumb, max-thumb, today-cell).
  - Default variants: button-variant (primary/secondary/outline/ghost/thumb/cell), button-size (sm/md/lg), selection-mode (none/single/multiple/range).

- **Task 3+4 — View redesign** (`src/components/theme-editor/theme-editor-view.tsx`):
  - Two-column layout: left = "Live Preview · Editor" (collapsible sections), right = "Component Preview" (real components using tokens).
  - Header: title, Live toggle, **Target selector** (base/class/id button group + class/id dropdown with known targets), Import, Export, Reset.
  - **Section component**: collapsible (click header to toggle), with a live visual preview ALWAYS visible (not embedded inside the collapsible — the preview is above the editor). The editor (token rows) is inside the collapsible part.
  - 9 collapsible sections:
    1. **Colors** — preview: swatch rows (Brand/Surfaces/Component/Semantic). Editor: all color tokens with color picker + add/remove/rename.
    2. **Spacing** — preview: vertical bar scale. Editor: all spacing tokens.
    3. **Radii (per-corner)** — preview: 4 corner-rounded squares (sm/md/lg/xl) reflecting per-corner values. Editor: per-size blocks with TL/TR/BR/BL inputs + an "all" input that sets all 4 corners at once. Plus radius-pill.
    4. **Borders (per-side)** — preview: squares with per-side borders. Editor: per-border-token blocks with top/right/bottom/left rows, each having width + style (solid/dashed/dotted/double/none) + color. Add/remove border tokens.
    5. **Typography** — preview: 4 text samples (3xl/xl/base/xs-mono). Editor: all typography tokens.
    6. **Shadows** — preview: 4 cards with shadows. Editor: all shadow tokens.
    7. **Motion** — preview: duration bars + easing labels. Editor: all motion tokens.
    8. **Variants (predefined + custom)** — preview: each variant group shows its options as selectable buttons (current highlighted). Editor: per-group lists of predefined (gray dot) + custom (lemon dot) values; custom values are removable; "Add custom" input per group; "Add new variant group" form (name + label + comma-separated options).
    9. **Custom Tokens** — preview: chips of custom tokens. Editor: full CRUD for arbitrary tokens.
  - Right side Component Preview: 6 cards showing real components using `var(--token)`: Buttons (primary/secondary/outline/ghost), Surfaces & Cards, Form Inputs (text/checkbox/radio), Badges (5 semantic), Typography Scale (7 sizes), Radius Scale (5 sizes).

- **Agent Browser verification**:
  - Sidebar: "Theme Editor" appears as a top-level group (not under Documentation). Expanding it shows "Token Editor". Clicking navigates to the editor.
  - Two columns render: "Live Preview · Editor" (left) with 9 collapsible sections, "Component Preview" (right) with 6 real component cards.
  - Colors and Variants sections open by default; others collapsed.
  - Target selector: base/class/id buttons. Clicking "class" shows a dropdown with .thumb, .cell, .custom-button-root, .cal-cell, .panel options.
  - Radii section: per-corner editor with TL/TR/BR/BL inputs for each size (sm/md/lg/xl) + an "all" input.
  - Borders section: per-side editor with width/style/color for each side (top/right/bottom/left) + add/remove border tokens.
  - Variants section: added a custom value "neon" to the button-variant group → it appeared as a selectable button in the preview and persisted to the store.
  - Turned on Live mode → brand-lemon applied. Changed brand-lemon to #00CCFF via color picker → `getComputedStyle` returned `#00ccff` immediately (live apply works).
  - Turned off Live mode → brand-lemon reverted to stylesheet's `#d9ff66`. Platform restored.
  - No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Theme Editor is now a top-level page (sidebar group "Theme Editor" → "Token Editor", not under Documentation).
- Variants support custom values: beside predefined enums (primary/secondary/ghost…), users can add custom values, remove existing tokens (custom ones), and edit values. Users can even create entirely new variant groups.
- Per-corner radii: each of TL/TR/BR/BL is individually editable for sm/md/lg/xl, plus an "all" shortcut.
- Per-side borders: each of top/right/bottom/left has width + style + color, with add/remove border tokens.
- Live Preview IS the editor: the left column shows collapsible sections where each section has a live visual preview (always visible) above the editor controls (collapsible). NOT embedded sections — the preview is separate from the collapsible editor.
- Right column shows real component previews (buttons, cards, inputs, badges, typography, radii) that use the tokens live.
- Target selector with base/class/id specificity: class targets known component classes (.thumb, .cell, etc.), id targets known ids (#min-thumb, #max-thumb, #today-cell). Priority: id > class > base (CSS cascade semantics).

---
Task ID: 50
Agent: main
Task: Fix runtime TypeError "Cannot read properties of undefined (reading 'radius-sm-tl')" in theme editor RadiiSection

Work Log:
- **Root cause**: The `useThemeTokens` store uses Zustand's `persist` middleware to save to localStorage under key `workshop-theme-tokens`. Users who had the OLD schema persisted (from Task 48, which didn't have `corners`, `borders`, or `variants` fields) would rehydrate a `tokens` object where those new fields were `undefined`. The RadiiSection component accessed `corners[key]` where `corners` was undefined → crash.
- **Fix 1 — Store merge function** (`src/store/theme-tokens.ts`): Added a `merge` option to the persist config that deep-merges the persisted state with `DEFAULT_TOKENS`. For each token category (colors, spacing, radii, corners, typography, shadows, motion, custom), persisted values win but missing keys fall back to defaults. For arrays (borders, variants), the persisted array is used if present and non-empty, otherwise defaults. This ensures any new schema fields are filled in automatically when rehydrating from an old persisted state.
- **Fix 2 — Defensive guard** (`src/components/theme-editor/theme-editor-view.tsx` RadiiSection): Changed `const corners = useThemeTokens((s) => s.tokens.corners)` to read `cornersRaw` and fall back to `{}` if undefined: `const corners = (cornersRaw ?? {}) as unknown as Record<string, string>`. Also changed `corners[key]` to `corners[key] ?? ""` so a missing key renders an empty string instead of undefined. This is belt-and-suspenders protection against any edge case where the merge hasn't populated the field yet.
- **Agent Browser verification**: Set an old-schema localStorage (only `colors.brand-lemon`, no corners/borders/variants), navigated to the theme editor → page loaded with NO errors. The Radii section expanded to show all 4 per-corner editors (TL/TR/BR/BL) with default values (4px/8px/12px/16px) populated from the merge. No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Fixed the schema migration crash by adding a `merge` function to the Zustand persist config that deep-merges persisted state with defaults, so new fields (corners, borders, variants) are filled in when rehydrating from an old schema.
- Added a defensive guard in RadiiSection that falls back to `{}` if `corners` is undefined and renders empty strings for missing keys.
- The theme editor now loads cleanly for all users, regardless of whether they have an old or new schema persisted in localStorage.

---
Task ID: 51
Agent: main
Task: Theme editor refinements — editor beside preview (not below), rename Radii to Radius Scale, remove Component Preview column, remove default variant groups

Work Log:
- **Editor beside preview**: Redesigned the `Section` component. Previously the preview was always visible and the editor was a collapsible section BELOW it. Now the section header toggles the whole body, and when open, the preview and editor sit SIDE-BY-SIDE in a 2-column grid (`grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)]` on desktop, stacking on mobile). Preview is on the left with a right border, editor is on the right with a muted background.
- **Renamed "Radii (per-corner)" → "Radius Scale"**: Updated the section title in RadiiSection. It's the single radius section now (no separate radius-scale panel).
- **Removed Component Preview column**: Deleted the entire right-side column from the main view. The body is now a single column of Live Preview sections (was a 2-column grid with editor on left + ComponentPreview on right). Removed the `ComponentPreview` function and `PreviewCard` helper (~130 lines) since they're no longer used.
- **Removed default variant groups**: Emptied the `variants` array in `DEFAULT_TOKENS` — removed Button Variant (primary/secondary/outline/ghost/thumb/cell), Button Size (sm/md/lg), and Selection Mode (none/single/multiple/range). The Variants section still exists for users to create their OWN custom variant groups (via the "Add new variant group" form), but starts empty by default.
- **Agent Browser verification**: Cleared localStorage for fresh state. Navigated to theme editor. Confirmed: "Radius Scale" section title (was "Radii (per-corner)"), no "Component Preview" heading, Variants section empty by default (no Button Variants/Button Size/Selection Mode). Expanded Radius Scale → verified the grid has 2 columns (390px preview + 547px editor) — preview is BESIDE editor. No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Editor controls now sit BESIDE the live preview (side-by-side 2-column grid) instead of below in a collapsible — both visible when the section is open.
- "Radii" section renamed to "Radius Scale".
- Right-side Component Preview column removed entirely; the page is now a single column of Live Preview sections.
- Default variant groups (Button Variants, Button Size, Selection Mode) removed — the Variants section starts empty; users create their own.

---
Task ID: 52
Agent: main
Task: Theme editor refinements — fixed-height boxes with centered preview + bottom add-bar, fix radius-pill, remove Variants section

Work Log:
- **Fixed-height boxes with centered preview + bottom add-bar**: Redesigned the `Section` component API from `children` to three explicit props: `preview`, `tokens`, `addTokenBar`, `editorHeader`. The body is now a fixed `h-[320px]` grid with 2 columns: preview (left, vertically centered via `flex items-center justify-center`) + editor (right, flex-column with header → scrollable token list → pinned add-token bar at bottom). All sections now have the same fixed height and consistent structure.
- **Radius Scale section fixed**: 
  - Previously radius-pill had a different (single-value) editor box and no preview. Now ALL radius tokens (sm/md/lg/xl/pill + any custom) use the SAME per-corner editor box with TL/TR/BR/BL inputs + an "all" shortcut.
  - The preview now renders a square for EACH radius token (including pill) using its per-corner values — so pill shows as a fully-rounded shape.
  - Added a "create new token" bar at the bottom (radius-name + 8px value + Add button). New custom radius tokens get 4 corner tokens created automatically and appear in the preview immediately.
- **Every custom value/saved token has its own preview**: Each section's preview maps over ALL tokens in that category (including user-added ones). Verified by adding a custom "radius-2xl" token → it appeared in the preview as a "2xl" labeled square.
- **Removed Variants section entirely**: Deleted the `VariantsSection` function (~150 lines) and removed it from the `LivePreviewEditor`. Removed the unused `Layers` icon import. The Variants section (Button Variants, Button Size, Selection Mode) is gone.
- **Refactored all sections** (Colors, Spacing, Radius Scale, Borders, Typography, Shadows, Motion, Custom) to use the new `tokens`/`addTokenBar`/`editorHeader` props instead of `children`.
- **Agent Browser verification**: Cleared localStorage. Navigated to theme editor. Confirmed: 8 sections (no Variants). All sections have 320px fixed body height with 2-column grid (390px preview + 547px editor). Radius Scale: all 5 tokens (sm/md/lg/xl/pill) have the same per-corner editor box + preview square + "radius-name" add-token bar at bottom. Added a custom "radius-2xl" token → it appeared in the preview immediately. No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- All theme editor boxes now have the same fixed height (320px) with the preview centered on the left and the editor (header + scrollable token list + pinned "create new token" bar) on the right.
- Radius Scale: radius-pill now uses the same per-corner editor box as sm/md/lg/xl, has a preview, and there's a "create new token" bar at the bottom. Every custom radius token gets its own preview square.
- Variants (Button Variants, Button Size, Selection Mode) section removed entirely.
- Every custom value/saved token across all sections has its own preview (colors swatches, spacing bars, radius squares, border shapes, typography samples, shadow cards, motion bars, custom chips).

---
Task ID: 53
Agent: main
Task: Theme editor refinements — preview margin, unit toggle groups, Radius Scale all/corners switch, unified add bars, renamable tokens, remove Custom Tokens

Work Log:
- **Preview margin**: Increased the preview side padding from `p-4` to `px-4 py-6` and bumped the body height from 320px to 340px so the Colors preview (and others) isn't clipped by the top bar.
- **CSS unit toggle group**: Created a `UnitToggleGroup` component (px/rem/em/% compact button group) and a `DimensionEditor` that pairs a number input with the unit toggle. Updated the `ValueEditor` so ALL dimension values (not just px) use the `DimensionEditor` — applies to Spacing, Radius Scale, and any token with a dimension value. The unit toggle also appears in the "create new token" bars for Spacing and Radius Scale.
- **Radius Scale "all" switch**: Added a per-radius toggle switch labeled "all ↔ corners". When ON (default): a single DimensionEditor input sets all 4 corners at once. When OFF: 4 individual DimensionEditor inputs appear (TL/TR/BR/BL), each with its own unit toggle. Added a `removeRadius` store action that deletes the radius token + its 4 corner tokens. Each radius token box now has a trash button — saved tokens are deletable. Verified: removed radius-pill → it disappeared from both the editor and the preview.
- **Unified "create new token" design**: Redesigned the `AddTokenBar` component to a dashed full-width container (`border-dashed border-border bg-muted/20`) with inline Plus icon + name input + value input + optional unit toggle + Add button. Updated the Colors add bar to match. Typography/Shadows/Motion/Spacing/Radius Scale all use this unified `AddTokenBar`. The Borders add bar is a dashed button (its own style for "add border token").
- **Renamable tokens**: The `TokenRow` component already supports click-to-rename (click the token name → edit → Enter/blur to save). This works across all sections (Colors, Spacing, Typography, Shadows, Motion) — no change needed, just confirmed it's working.
- **Removed Custom Tokens box**: Deleted the `CustomSection` function and its usage in `LivePreviewEditor`. Removed the unused `Settings` icon import.
- **Agent Browser verification**: Cleared localStorage. Navigated to theme editor. Confirmed: 7 sections (no Custom Tokens). Spacing: every token row has a px/rem/em/% unit toggle group. Radius Scale: 5 "all" switches + 5 remove buttons + unit toggles. Toggled a switch off → 4 corner inputs appeared. Removed radius-pill → deleted from store + preview. Typography: dashed add bar. No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Preview side now has top/bottom margin (py-6) and body height is 340px — no more clipping.
- All dimension inputs (Spacing, Radius Scale, any px/rem/em/% value) now have a CSS unit toggle group (px/rem/em/%).
- Radius Scale: each token has an "all ↔ corners" switch (1 input if all, 4 if not), unit toggles on every input, and a trash button to delete saved tokens.
- All "create new token" bars use the unified dashed design (Plus icon + name + value + unit toggle + Add button).
- Saved tokens are click-to-rename across all boxes.
- Custom Tokens box removed.

---
Task ID: 54
Agent: main
Task: Theme editor refinements — more preview margin, single-button add bars, renamable Radius Scale + Borders tokens

Work Log:
- **More preview margin**: Increased the preview side padding from `py-6` to `py-10` and bumped the body height from 340px to 360px so the Colors preview (and others) is no longer clipped by the top bar.
- **Single-button "Add new token" bars**: Redesigned the `AddTokenBar` component to show a single dashed "Add new token" button (collapsed). When clicked, it expands into inline name + value inputs (+ optional unit toggle) + Add + Cancel. After adding or cancelling, it collapses back to the single button. Also created a `ColorAddBar` variant (for the color picker) with the same single-button-then-expand pattern. All sections now show ONE button only: Colors → "Add new color", Spacing/Radius Scale/Typography/Shadows/Motion → "Add new token", Borders → "Add border token". Verified: clicked "Add new token" in Spacing → expanded into name + value inputs.
- **Renamable Radius Scale + Borders tokens**: 
  - Added `renameRadius(oldName, newName)` and `renameBorder(index, newName)` store actions. `renameRadius` also renames the 4 corner tokens (e.g. radius-sm-tl → radius-newName-tl) and updates the document if live.
  - Created `RadiusTokenName` and `BorderTokenName` components — click the token name → inline text input → Enter/blur to save, Escape to cancel.
  - Replaced the static `<span>` name labels in RadiiSection and BordersSection with these clickable-to-rename components.
  - Verified: clicked radius-sm name → typed "radius-sm-renamed" → blurred → token renamed in store. Clicked border-default name → typed "border-custom-renamed" → blurred → token renamed in store.
- **Agent Browser verification**: All 7 sections show single "Add new token"/"Add border token"/"Add new color" buttons. Radius Scale: 5 clickable-to-rename names. Borders: 2 clickable-to-rename names. Renamed a radius token and a border token — both persisted to the store. No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Preview side now has py-10 margin (body height 360px) — no more clipping by the top bar.
- All "create new token" sections now show ONE button only ("Add new token"/"Add new color"/"Add border token") that expands into inputs when clicked — unified design matching the Borders box.
- Radius Scale and Borders token names are now click-to-rename (with Enter/blur to save, Escape to cancel). Renaming a radius token also renames its 4 corner tokens.

---
Task ID: 55
Agent: main
Task: Theme editor refinements — fix Color preview clipping, border unit toggle + color picker, unify Motion/Typography, shadow component editor

Work Log:
- **Color preview clipping fix**: Changed the preview container from `flex items-center justify-center py-10 overflow-auto` to `flex justify-center py-4 overflow-y-auto` with the inner div using `my-auto` for vertical centering. The `my-auto` approach centers content when there's space but allows proper scrolling when content overflows — no more top clipping.
- **Border editor — unit toggle + color picker**: Replaced the plain text width input with `DimensionEditor` (number + px/rem/em/% unit toggle). Replaced the plain text color input with a new `BorderColorEditor` component that shows a color picker + hex input when the value is a hex color, or a resolved swatch + text input when the value is a var() reference (like `var(--border)`). This way the user sees the actual color, not a raw `var(--..)` string. Verified: 32 unit toggle buttons + 8 color swatches in the Borders section.
- **Unified Motion + Typography editors**: 
  - Created a `DurationEditor` component (number input + ms/s unit toggle) to replace the old slider-based duration editor. Motion duration tokens now use the same number+unit-toggle pattern as dimension tokens.
  - Typography already used `DimensionEditor` for sizes (px/rem/em/%), number inputs for font-weights and line-heights, and `DimensionEditor` for tracking values (em). Both sections now have consistent suitable inputs per prop type: dimensions → number+unit toggle, durations → number+ms/s toggle, numerics → number input, text → text input.
- **Shadow tokens — component editor**: Created a `ShadowEditor` that parses the box-shadow string into 5 components (x, y, blur, spread, color) and provides separate suitable inputs:
  - x/y/blur/spread: each a `DimensionEditor` (number + px/rem/em/% unit toggle)
  - color: a `ShadowColorField` that shows a color picker + hex input for hex colors, or a swatch + text input for rgba/var() colors
  - On any change, reassembles the components back into a box-shadow string.
  - Also added `ShadowTokenName` for click-to-rename. Each shadow token now has its own box with the 5 separate inputs instead of one text input for the whole value. Verified: each shadow has x/y/blur/spread/color fields.
- **Agent Browser verification**: Color preview not clipped (innerTop > previewTop, clipped=false). Borders: 32 unit toggle buttons + 8 color swatches. Shadows: x/y/blur/spread/color fields per token. Motion: ms/s duration toggle buttons (no more slider). No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Color preview no longer clipped — uses `my-auto` centering with `overflow-y-auto` for proper scroll.
- Border editor: width inputs have px/rem/em/% unit toggle; color field shows a color picker (for hex) or a resolved swatch (for var()) instead of raw `var(--..)` text.
- Motion + Typography unified: both use number+unit-toggle for dimensions/durations, number input for numerics — no more slider in Motion.
- Shadow tokens: each shadow has 5 separate inputs (x/y/blur/spread with number+unit toggle, color with color picker) instead of one text input for the whole value.

---
Task ID: 56
Agent: main
Task: Theme editor refinements — real color picker for var() colors, split Typography + Motion into separate boxes per property type, animated previews

Work Log:
- **Real color picker for var() colors**: Created a `ColorField` component that ALWAYS shows a real `<input type="color">`. It uses a `resolveToHex()` helper that resolves any CSS color value (hex, rgb, var(), named) to a `#rrggbb` hex via a temporary DOM probe + computed style. The picker's initial value is the resolved hex (so `var(--border)` → `#383343`). When the user picks a new color, the value becomes a hex string (replacing the var() reference). Replaced both `BorderColorEditor` (removed) and `ShadowColorField` (removed) with this single `ColorField`. Verified: Borders section has 8 real color pickers, first value `#383343` (resolved from var(--border)).
- **Typography split into 5 separate boxes**: Split the single TypographySection into 5 sub-sections by property type: Font Family, Font Size, Font Weight, Line Height, Letter Spacing. Each has its own Section box with a type-specific preview:
  - Font Family: each token rendered with its actual fontFamily
  - Font Size: each token rendered at its actual fontSize ("Aa — text-xs")
  - Font Weight: each token rendered at its actual fontWeight
  - Line Height: each token rendered at its actual lineHeight (multi-line)
  - Letter Spacing: each token rendered at its actual letterSpacing ("ABCDEF")
  A `typoGroup()` helper maps token names to their group prefix (font-sans→font-family, font-normal→font-weight, text-xs→font-size, leading-tight→line-height, tracking-tight→letter-spacing). Verified: 5 separate boxes, Font Size preview renders 7 spans with actual sizes (12px, 13px, 14px, …).
- **Motion split into 2 separate boxes + animated previews**: Split the single MotionSection into 2 sub-sections: Motion · Duration and Motion · Easing. Each has an animated preview:
  - Duration: `AnimatedDurationBar` — a lemon bar that fills from 0% to 100% using a CSS keyframe animation, looping every 2s. Each duration token gets its own animated bar.
  - Easing: `AnimatedEasingBall` — a lemon ball that bounces left↔right using a CSS animation with the actual easing curve applied (`animation: te-easing-move 1.2s ${value} infinite`). Each easing token gets its own animated ball demonstrating the curve.
  Verified: Duration has 3 animated bars, Easing has 3 animated balls.
- **Agent Browser verification**: 5 Typography boxes + 2 Motion boxes visible. Borders: 8 real color pickers (var resolved to hex). Font Size preview: 7 spans at actual sizes. Motion Duration: 3 animated bars. Motion Easing: 3 animated balls. No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Color fields (Border + Shadow) now ALWAYS use a real color picker — var() references are resolved to hex via the DOM so the picker shows the actual color, and picking a new color replaces the var() with a hex.
- Typography split into 5 separate boxes: Font Family, Font Size, Font Weight, Line Height, Letter Spacing — each with its own type-specific live preview.
- Motion split into 2 separate boxes: Duration (animated filling bars) + Easing (animated bouncing balls using the actual easing curve) — each with a live animated preview.

---
Task ID: 57
Agent: main
Task: Theme editor refinements — font family dropdown with custom option, accurate motion duration preview, bezier curve editor for easing

Work Log:
- **Font Family dropdown with custom option**: Created a `FontFamilyRow` component (used only in the Font Family group) that shows a `<select>` dropdown with 10 common font options (Inter, JetBrains Mono, System UI, Arial, Helvetica, Georgia, Times New Roman, Courier New, UI Monospace) + a "Custom… (type a font name)" option. Each option renders in its actual fontFamily. When the user selects "Custom…", a text input appears next to the dropdown for typing a custom font name. When a preset is selected, the value becomes that preset. Verified: 2 dropdowns (font-sans, font-mono), 10 options each including "Custom…".
- **Accurate Motion Duration preview**: Fixed the `AnimatedDurationBar` to use the ACTUAL duration value in the CSS animation (was hardcoded to `2s`). Now uses `animation: te-duration-fill ${value} linear forwards` so motion-fast (120ms) fills 3x faster than motion-emphasis (260ms). The loop interval is dynamically calculated from the parsed duration (ms + 300ms buffer) so each bar restarts at the right time.
- **Bezier curve editor for easing**: Created 4 new components:
  - `parseBezier(value)` / `formatBezier(points)` — parse/format cubic-bezier(x1,y1,x2,y2) strings
  - `BezierPreview` — a small 28×28 SVG showing the curve + 2 control points
  - `BezierCurveEditor` — a button showing the `BezierPreview`; when clicked, opens a floating panel with:
    - A 180×180 interactive SVG with a grid, the curve, handle lines, and 2 draggable control points (pointer events with window listeners for smooth dragging)
    - 4 numeric inputs (x1, y1, x2, y2) for precise editing
    - 5 preset buttons (linear, ease, out, in-out, spring) for quick selection
    - A backdrop to close on outside click
  - `EasingRow` — a token row that uses the `BezierCurveEditor` instead of a text input
  Replaced the generic `TokenRow` in the Motion Easing section with `EasingRow`. Verified: 3 bezier preview boxes (one per easing token), clicking opens the floating panel with interactive SVG + 4 numeric inputs + 5 presets.
- **Agent Browser verification**: Font Family: 2 dropdowns with 10 options including "Custom…". Motion Easing: 3 bezier preview boxes; clicking opens floating panel with 180×180 SVG, 4 numeric inputs, 5 presets. No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Font Family tokens now use a dropdown with common fonts + a "Custom…" option that reveals a text input for typing a custom font name.
- Motion Duration animated preview now uses the ACTUAL duration value — motion-fast (120ms) fills 3x faster than motion-emphasis (260ms), loop interval matches the duration.
- Motion Easing tokens now have a small bezier curve preview box (28×28 SVG); clicking opens a floating panel with a large interactive 180×180 SVG (draggable control points), 4 numeric inputs (x1/y1/x2/y2), and 5 preset buttons (linear/ease/out/in-out/spring).

---
Task ID: 58
Agent: main
Task: Fix custom font name not working + bezier floating editor should float over the box itself

Work Log:
- **Custom font name fix**: The issue was that selecting "Custom…" from the dropdown did nothing — the `onChange` just returned without entering custom mode, and the custom text input only appeared when the current value was already non-preset. Fixed by adding a `customMode` state that's set to `true` when the user selects "Custom…" (and also clears the value to "" so the text input is ready). The custom text input now shows whenever `customMode` is true, and typing in it applies the value to the token via `onChange`. When a preset is re-selected, `customMode` is set to `false`. A `useEffect` syncs `customMode` with `isPreset` (e.g. on reset). Verified: selected "Custom…" → text input appeared empty → typed "'Comic Sans MS', sans-serif" → store updated to that value → font preview showed the custom font.
- **Bezier floating editor floats over the box**: The issue was the panel used `absolute` positioning relative to the row, which got clipped by the scrollable editor container (`overflow-y-auto`). Fixed by switching to `fixed` positioning with viewport coordinates calculated from the button's `getBoundingClientRect()`. Added a `btnRef` and an `openPanel()` function that:
  - Gets the button's bounding rect
  - Positions the panel below the button (or above if there's no room below)
  - Clamps the panel to the viewport (left/right/top/bottom)
  - Stores the position in `panelPos` state
  The panel now uses `className="fixed z-[101]"` with `style={{ top, left }}` so it floats over everything including the editor box and the scrollable container. The backdrop uses `z-[100]` and the panel uses `z-[101]` so the panel sits above the backdrop. Verified: panel `panelOverSection: true` — the panel floats over the section box itself, not clipped.
- **Agent Browser verification**: Custom font: selected "Custom…" → text input appeared → typed custom font → store + preview updated. Bezier: clicked preview → panel opened with `fixed` positioning, floating over the section box (`panelOverSection: true`), not clipped by the scrollable container. No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Custom font name now works: selecting "Custom…" from the dropdown enters custom mode (clears the value, shows a text input), and typing in the text input applies the value to the token. Verified with "'Comic Sans MS', sans-serif".
- Bezier floating editor now uses `fixed` positioning with viewport coordinates from the button's bounding rect — it floats over the box itself and is not clipped by the scrollable editor container. Verified `panelOverSection: true`.

---
Task ID: 59
Agent: main
Task: Add Margin and Padding boxes to theme editor

Work Log:
- **Store updates** (`src/store/theme-tokens.ts`):
  - Added `margin` and `padding` fields to the `ThemeTokens` interface (both `Record<string, string>`).
  - Added default tokens: margin-0/1/2/3/4/6/8/auto (8 tokens, including `auto`), padding-0/1/2/3/4/6/8 (7 tokens).
  - Updated `setToken`/`addToken`/`removeToken`/`renameToken` type signatures to include "margin" and "padding" categories.
  - Updated `applyTokensToRoot`, `clearTokensFromRoot`, `exportAsCss`, and the `merge` function to include margin/padding in the flat-categories loop.
- **Editor view** (`src/components/theme-editor/theme-editor-view.tsx`):
  - Added `Move` and `Frame` lucide icons for margin and padding.
  - Created `MarginSection` — preview: vertical bar scale (lemon/70 with side borders, auto shows as fixed 32px). Editor: all margin tokens with DimensionEditor (number + px/rem/em/% unit toggle), "Add margin" button. Reset button.
  - Created `PaddingSection` — preview: vertical bar scale (lemon/30 with 2px border). Editor: all padding tokens with DimensionEditor, "Add padding" button. Reset button.
  - Added both sections to `LivePreviewEditor` between Spacing and Radius Scale.
- **Agent Browser verification**: Margin section: 8 tokens (margin-0/1/2/3/4/6/8/auto) + "Add margin" button. Padding section: 7 tokens (padding-0/1/2/3/4/6/8) + "Add padding" button. Both have preview scales + reset buttons. No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Added Margin and Padding boxes to the theme editor, positioned between Spacing and Radius Scale.
- Margin: 8 default tokens (margin-0/1/2/3/4/6/8/auto) with vertical bar preview, DimensionEditor with unit toggle, "Add margin" button.
- Padding: 7 default tokens (padding-0/1/2/3/4/6/8) with vertical bar preview, DimensionEditor with unit toggle, "Add padding" button.
- Both support full CRUD (add/edit/rename/remove), reset, and live apply via the same store actions as other flat token categories.

---
Task ID: 60
Agent: main
Task: Redesign Margin + Padding previews — Margin = container of smaller boxes with margin applied; Padding = multiple containers each with the same inner box + padding applied

Work Log:
- **Margin preview redesigned**: Changed from a vertical bar scale to a **container holding smaller boxes** — each box has its margin token applied via `style={{ margin: var(--${name}) }}`. The container is a bordered, muted-background box; inside it, each margin token renders as a 6×6 lemon box with its margin creating space around it within the container. `margin-auto` renders with a fixed 8px margin (since `auto` doesn't resolve in this context). Verified with Live mode on: m0=0px, m1=4px, m2=8px, m3=12px, m4=16px — each box's margin reflects its token.
- **Padding preview redesigned**: Changed from a vertical bar scale to **multiple containers, each containing the same smaller inner box** — each container has its padding token applied via `style={{ padding: var(--${name}) }}`. Each container is a bordered lemon/20 box; inside it sits the same 4×4 (16px) lemon inner box, with the padding creating space between the container edge and the inner box. Verified with Live mode on: p0=0px, p1=4px, p2=8px, p3=12px, p4=16px — each container's padding reflects its token, and all inner boxes are the same 16×16px size.
- **Agent Browser verification**: Margin: 1 container + 8 smaller boxes, each with margin applied (m0=0px, m1=4px, m2=8px, m3=12px, m4=16px). Padding: 7 containers, each with the same 16×16 inner box + padding applied (p0=0px, p1=4px, p2=8px, p3=12px, p4=16px). No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Margin preview: a container holding 8 smaller boxes, each box has its margin token applied (showing the margin as space around each box within the container).
- Padding preview: 7 separate containers, each containing the same 16×16 inner box, with each container's padding token applied (showing the padding as space between the container edge and the inner box).

---
Task ID: 61
Agent: main
Task: Redesign Margin + Padding — per-side editor (all/sides switch like radius), Margin preview = bar with rects, Padding preview = multiple bars

Work Log:
- **Store changes** (`src/store/theme-tokens.ts`):
  - Added `marginSides: Record<string, string>` and `paddingSides: Record<string, string>` to `ThemeTokens` (per-side overrides like `corners` for radii).
  - Added default empty objects for both (overrides filled at runtime).
  - Added store actions: `setMarginSide`, `removeMargin`, `renameMargin`, `setPaddingSide`, `removePadding`, `renamePadding` — all following the same pattern as `removeRadius`/`renameRadius` (removing/renaming also cleans up the 4 side tokens).
  - Updated `applyTokensToRoot`, `clearTokensFromRoot`, `exportAsCss`, and the `merge` function to include marginSides/paddingSides.
- **Editor — Margin section** (`src/components/theme-editor/theme-editor-view.tsx`):
  - **Preview**: One bar (tabs-like) containing multiple rects. Each rect has its margin applied (marginTop/right/bottom/left from the per-side overrides or the base value). `auto` renders as 4px. Verified with Live mode: m0=0px, m1=4px, m2=8px, m3=12px margins on each rect.
  - **Editor**: Each token uses a `MarginPaddingTokenBox` with an "all ↔ sides" switch. "All" mode = 1 DimensionEditor (sets all 4 sides). "Sides" mode = 4 DimensionEditors (top/right/bottom/left) each with unit toggle. Each box has a click-to-rename name + remove button. Verified: 8 switches, 8 remove buttons; toggling a switch shows 4 inputs (top/right/bottom/left).
- **Editor — Padding section**:
  - **Preview**: Multiple bars (one per padding token), each bar has the padding applied around an inner rect. Verified with Live mode: p0=0px, p1=4px, p2=8px, p3=12px padding on each bar.
  - **Editor**: Same `MarginPaddingTokenBox` with "all ↔ sides" switch. Verified: 7 switches, 7 remove buttons, 7 bars.
- **Shared `MarginPaddingTokenBox` component**: Reusable for both margin and padding. Has the "all ↔ sides" switch (identical to the radius per-corner switch), click-to-rename `SideTokenName`, and a remove button. "All" mode shows one DimensionEditor; "Sides" mode shows a 2×2 grid of top/right/bottom/left DimensionEditors.
- **Agent Browser verification**: Margin: 8 rects in a bar, 8 switches, 8 remove buttons. Toggling switch → 4 side inputs (top/right/bottom/left). Live mode: m0=0px, m1=4px, m2=8px, m3=12px margins. Padding: 7 bars, 7 switches, 7 remove buttons. Live mode: p0=0px, p1=4px, p2=8px, p3=12px paddings. No console or page errors.
- `bun run lint` → 0 errors. `bunx tsc --noEmit` → no errors in changed files.

Stage Summary:
- Margin and Padding now have per-side editing (top/right/bottom/left) with an "all ↔ sides" switch — identical design to the Radius per-corner editor.
- Margin preview: one bar (tabs-like) with multiple rects, each rect shows its margin applied.
- Padding preview: multiple bars, each bar applies a padding token around an inner rect.
- Both support full CRUD (add/edit/rename/remove), per-side overrides, reset, and live apply.

---
Task ID: 62
Agent: main
Task: Migrate from Zustand-based client-side navigation (single `/` route with `RouteSwitcher`) to proper Next.js App Router file-based routing — each page gets its own URL, reload keeps you on the same page, browser back/forward works.

Work Log:
- **Created `src/store/navigation-types.ts`** — Pure, side-effect-free routing types and helpers extracted from the old store. Holds the `Route` discriminated union, `routeToHref(route)` (maps a Route value to its App Router URL), and the pure `routeLabel`/`categoryLabel` helpers. Has a small static component-slug→label map (mirrors `components` in content.ts) so the module stays cycle-free.
- **Rewrote `src/store/navigation.ts`** — Removed `route`, `navigate`, `scrollPositions`, `saveScroll`, and the `breadcrumbs()` function. Kept only UI-only state: `componentsQuery`, `componentsCategory`, `searchOpen`, `mobileNavOpen` and their setters. Re-exports `Route`, `routeLabel`, `categoryLabel`, `routeToHref` from `navigation-types` so existing imports keep working.
- **Created `src/lib/platform/breadcrumbs.ts`** — New `breadcrumbsFromPath(pathname)` helper that parses the current URL and produces `{ label, href }` entries. Resolves category slugs via `getCategory`, component slugs via the `components` array, example slugs via the `examples` array, and uses a small `DOC_SUB_LABELS` map for the four `/docs/*` sub-pages. Always starts with Home.
- **Updated `src/lib/platform/content.ts`** — Removed `import type { Route }`. Changed `DocSection.route: Route` to `DocSection.href: string` (e.g. `/docs/installation`). Updated the four `docSections` entries to use `href` instead of `route`.
- **Updated `src/app/layout.tsx`** — Wrapped `{children}` in `<PlatformShell>` so the shell (Header, optional Sidebar, Footer, MobileNav, SearchPalette) wraps ALL routes, not just `/`.
- **Updated `src/components/platform/shell.tsx`** — Replaced `useNavigation((s) => s.route)` + `route.name !== "home"` with `usePathname() !== "/"` for sidebar visibility. Dropped the `useNavigation` import.
- **Migrated chrome components**:
  - `sidebar.tsx` — Replaced `useNavigation` with `usePathname`. Replaced `<button onClick={() => navigate(route)}>` with `<Link href={...}>`. Replaced `isActive(route)` predicates with `isActive(pathname)` predicates that compare `pathname === href` (or `startsWith` for group highlight like `/examples/...`).
  - `header.tsx` — Replaced `useNavigation().navigate` + `matches(route)` with `usePathname()`-based predicates. Top-level nav uses `<Link href>` instead of `<button onClick>`. Brand lockup is now a `<Link href="/">`. Still uses `useNavigation` for `setSearchOpen`/`setMobileNavOpen` (UI-only).
  - `breadcrumbs.tsx` — Replaced `useNavigation` + `breadcrumbs(route)` with `usePathname()` + `breadcrumbsFromPath(pathname)`. Crumb links use `<Link href>`.
  - `footer.tsx` — Replaced `useNavigation().navigate` with `<Link href>` for internal links. External links stay as `<a target="_blank">`. Footer columns use a flat `COLUMNS` array of `{ label, href, external? }` entries instead of `Route` values.
  - `mobile-nav.tsx` — Removed the old `handleNavigate` wrapper (which called `navigate()` + `setMobileNavOpen(false)`). The Sidebar inside the drawer now uses `<Link>` directly; the drawer auto-closes on route change via a `useEffect` watching `usePathname()`. Escape-to-close behavior preserved.
  - `search-palette.tsx` — Replaced `useNavigation().navigate` with `useRouter().push(href)` + `setSearchOpen(false)`. The `ALL_RESULTS` array now stores `href: string` instead of `route: Route`, computed directly from component/category/doc/example metadata.
- **Migrated view files**:
  - `home-view.tsx` — All `<button onClick={() => navigate(...)}>` → `<Link href={...}>`. Removed `useNavigation` import; added `Link` from `next/link`.
  - `components-view.tsx` — Removed `navigate` from store usage. The `ComponentCard` no longer takes an `onNavigate` callback — it computes `href = /components/${category}/${slug}` itself and renders a `<Link>`. Kept `useNavigation` for `componentsQuery`/`componentsCategory`/`setComponentsQuery`/`setComponentsCategory` (UI-only state).
  - `category-view.tsx` — Removed `useNavigation().route` + `navigate`. Now reads `category` from `useParams()`. Available-component cards render as `<Link href={/components/${category}/${slug}}>`.
  - `examples-view.tsx` — `ExampleCard` renders as `<Link href={/examples/${slug}}>` instead of `<button onClick>`. Removed `useNavigation`.
  - `docs-view.tsx` — All cards and the "Read the guide" button render as `<Link href>` (the doc section cards use `section.href` from the updated content.ts). Removed `useNavigation`.
  - `docs-api-view.tsx` — Replaced `navigate(componentRoute)` with `<Link href={componentHref}>`. The `EntryGroup`/`EntryCard` props changed from `onOpen: () => void` to `href: string`. Removed `useNavigation`.
  - `example-detail-view.tsx` — Reads `slug` from `useParams()` instead of `useNavigation().route`. All back-links and component-used cards render as `<Link href>`. Removed `useNavigation`.
  - `resources-view.tsx` — `ResourceCard` for internal destinations renders as `<Link href={routeToHref(destination.route)}>`. Kept the `Route` type as an internal-only representation of resource destinations and now imports it from `navigation-types` instead of `store/navigation`.
- **Removed unused `useNavigation` imports** from 6 playground files that had stale imports left over from earlier refactors: `color-circle`, `toggle-group`, `custom-button`, `color-range`, `color-ramp`, `color-wheel`.
- **Replaced `src/app/page.tsx`** — Deleted `RouteSwitcher`, `renderRoute`, `routeKey`, and `NotFoundView`. The file is now a thin wrapper that renders `<HomeView />`.
- **Created `src/app/not-found.tsx`** — The old `NotFoundView` with a `<Link href="/">Go home</Link>` instead of a button.
- **Created all route files**:
  - `src/app/page.tsx` → `<HomeView />`
  - `src/app/components/page.tsx` → `<ComponentsView />`
  - `src/app/components/[category]/page.tsx` → `<CategoryView />`
  - `src/app/components/[category]/[slug]/page.tsx` → Lookup table mapping `${category}/${slug}` → PlaygroundComponent (28 entries, replacing the old if-chain). Reads `category` and `slug` from `useParams()`, looks up the playground, renders it (or a "Component not found" message + `<Link href="/components">` if the key isn't in the table). Wraps in a `key={category/slug}` div so navigating between two playgrounds remounts cleanly.
  - `src/app/docs/page.tsx` → `<DocsView />`
  - `src/app/docs/installation/page.tsx` → `<DocsInstallationView />`
  - `src/app/docs/concepts/page.tsx` → `<DocsConceptsView />`
  - `src/app/docs/theming/page.tsx` → `<DocsThemingView />`
  - `src/app/docs/api/page.tsx` → `<DocsApiView />`
  - `src/app/theme-editor/page.tsx` → `<ThemeEditorView />`
  - `src/app/examples/page.tsx` → `<ExamplesView />`
  - `src/app/examples/[slug]/page.tsx` → `<ExampleDetailView />`
  - `src/app/resources/page.tsx` → `<ResourcesView />`
  - `src/app/changelog/page.tsx` → `<ChangelogView />`
  - `src/app/contributing/page.tsx` → `<ContributingView />`
  - Each route file has `"use client"` (since the underlying views are client components using hooks) and is a thin wrapper that just renders the corresponding view.

**Verification**:
- `bun run lint` → 0 errors. (exit code 0)
- `bunx tsc --noEmit` → no errors in any changed file. (Pre-existing errors in `calendar.ts`, `color-circle.ts`, etc. remain unchanged — none touch the migration.)
- Curl-tested all 17 routes (`/`, `/components`, `/components/color`, all 28 `/components/{cat}/{slug}` URLs, `/docs`, `/docs/installation`, `/docs/concepts`, `/docs/theming`, `/docs/api`, `/theme-editor`, `/examples`, all 3 `/examples/{slug}` URLs, `/resources`, `/changelog`, `/contributing`) → all return 200.
- Curl-tested `/this-route-does-not-exist` → 404 (the new `not-found.tsx` is rendered).
- Curl-tested `/components/color/non-existent` → 200 with the "Component not found" message (the dynamic route matches; the lookup table renders the in-page not-found view).
- Verified sidebar is hidden on `/` (no `aria-label="Library navigation"` in HTML) and shown on `/components` (present in HTML) — the pathname-based `showSidebar` check works.
- Dev server log shows clean compilation for every route with no warnings or errors.

Stage Summary:
- The platform now uses real Next.js App Router file-based routing. Each page has its own URL, browser back/forward works, reload keeps you on the same page, and individual playground URLs are deep-linkable.
- The Zustand navigation store was slimmed down to UI-only state (search palette, mobile drawer, components directory filter) — actual navigation is owned by the URL.
- A pure `navigation-types.ts` module owns the `Route` discriminated union and the `routeToHref` bridge, so the few places that still build routes as data (search palette, footer columns, resources view) can convert them to URLs without depending on the store.
- A new `breadcrumbsFromPath(pathname)` helper replaces the old store-based `breadcrumbs(route)` — the breadcrumbs now derive from the URL, so they're always consistent with what's in the address bar.
- The 28-entry if-chain in `renderRoute` is now a single `PLAYGROUND_LOOKUP` table keyed by `${category}/${slug}`, which is both faster and easier to extend.
- Sidebar visibility, header nav highlighting, and breadcrumbs all key off `usePathname()` directly — no more store-derived "active route" state to drift out of sync.

---

## Task: Documentation sweep — AGENT.md + SKILL.md for all components

**Task ID**: docs-sweep
**Agent**: orchestrator (3 parallel general-purpose subagents: 2-a, 2-b, 2-c)
**Stage**: complete

### What changed

The root `AGENT.md` §9 router and `SKILL.md` §3 inventory previously listed
only the original 10 shipped components, while 27 vanilla component cores
existed under `src/lib/components/`. 17 of those had no per-folder
`AGENT.md` / `SKILL.md` files at all. This task closed that gap.

### Files created (24 new markdown files)

Per-folder AGENT.md + SKILL.md pairs created for the 12 previously-undocumented
components, each derived verbatim from its `.ts` source (options, methods,
events, CSS custom properties — no invented APIs):

- `src/lib/components/animation-track-editor/{AGENT,SKILL}.md`
- `src/lib/components/avatar/{AGENT,SKILL}.md`
- `src/lib/components/badge/{AGENT,SKILL}.md`
- `src/lib/components/carousel/{AGENT,SKILL}.md`
- `src/lib/components/collapse/{AGENT,SKILL}.md`
- `src/lib/components/connection-path/{AGENT,SKILL}.md`
- `src/lib/components/drawer/{AGENT,SKILL}.md`
- `src/lib/components/marquee/{AGENT,SKILL}.md`
- `src/lib/components/rich-text-editor/{AGENT,SKILL}.md`
- `src/lib/components/scroll-layout/{AGENT,SKILL}.md`
- `src/lib/components/table-editor/{AGENT,SKILL}.md`
- `src/lib/components/timeline/{AGENT,SKILL}.md`

### Files updated (2 root routers)

- `AGENT.md`:
  - §8 file-structure tree expanded from 10 to all 27 component folders,
    grouped by category; `theme-editor/` and `socket-nodes-graph/` noted.
  - §9 router table reorganized into per-category sub-sections (Color,
    Inputs, Layout, Data Display, Productivity, Navigation) with all 27
    components linked. Added a note explaining `socket-nodes-graph` is a
    React-only wrapper with no vanilla core.
- `SKILL.md`:
  - §3 inventory expanded from 10 to all 27 components, reorganized into
    the same six categories used by `content.ts`.
  - §7 "Choosing a Component" decision table expanded from 10 to 27 rows.
  - Added a `socket-nodes-graph` note matching the AGENT.md one.

### Source-derived anomalies documented as Known Issues

The subagents found and recorded several real bugs/limitations in the
component sources (these are documented in each component's AGENT.md
"Known Issues" section, not fixed here — this was a docs-only task):

- `animation-track-editor`: no horizontal pan; `setTracks()` shallow-clones
  but `getTracks()` deep-clones; `nextKey()` tautological condition;
  `playback_tick` fires every RAF with no throttle; `setProperty` missing
  several option keys; delete-key cascades N events + N re-renders.
- `avatar`: no event API at all; `img.onerror` wipes the status dot;
  `--av-accent` declared but unreferenced; no `getItems()` accessor.
- `badge`: `BadgeItem.icon` is a dead field; `BadgeOptions.grouping` is a
  dead option (never read by `render()`); `setItems()` doesn't emit; no
  click event; hardcoded remove-button SVG.
- `carousel`: `goTo()` emits `change` even when index unchanged; `setSlides()`
  doesn't emit; fade mode also slides (transform not suppressed); autoplay
  uses wall-clock `setInterval` (throttles in background tabs); no
  pause-on-hover; no drag/swipe; slide `id` not reflected in DOM; arrows not
  disabled at non-looping boundaries; no empty-state UI.
- `collapse`: `max-height` open transition capped at 1000px (clips tall
  content); `item.icon` rendered as plain text; `closeAll()` emits `toggle`
  with no `itemId`.
- `connection-path`: `stepPath` has a duplicate no-op `L` segment and unused
  `midX`/`midY`; arrow markers use `defsEl.innerHTML +=` in a loop (O(N²));
  `updateConnection` doesn't emit; silently drops paths when endpoint
  element is removed from DOM.
- `drawer`: no CSS custom properties (only component with none); no focus
  trap despite `aria-modal`; panel/overlay use `position: fixed` but append
  to container (mis-places if ancestor has transform); `change` fires at
  transition start not end; body content via `textContent` (no HTML).
- `marquee`: no event API; no `prefers-reduced-motion` handling; no
  `ResizeObserver` (duration stale on resize); items as plain text;
  separator appears doubled between the two duplicated copies.
- `rich-text-editor`: cursor restoration in realtime mode is approximate;
  `applyInlineComponent` `String.replace` can wrap wrong occurrence; `link`
  inline component fragile (regex expects `label](url` shape); `command`
  event always carries `source: "pointer"` even for keyboard shortcuts.
- `scroll-layout`: `setProperty()` re-runs `render()` which re-nests on
  each call (adds a layer of `.sl-root > .sl-content` per call); leaks
  previous scroll listener; `scrollbar: "always"` has no distinct CSS class
  (behaves like `"auto"`).
- `table-editor`: copy/paste listed in header comment but NOT implemented
  (no clipboard handlers); `applySort` destructive and doesn't restore
  order on cycle-to-null; selection by index not ID (drifts after
  sort/moveColumn/setRows); `removeRow(idx)` takes index but
  `removeColumn(colId)` takes ID; select cells show raw value not label;
  dead `.te-row` CSS rule; dead `colId2`/`reason`/`cellId` payload fields.
- `timeline`: `showIcons` option and `entry.icon` field declared and parsed
  but never read by `renderEntry()` — stub awaiting implementation.

### Verification

- All 27 component folders now have both `AGENT.md` and `SKILL.md` (verified
  via directory scan).
- No source code (`.ts`) files were modified — this was a docs-only task.
- Root `AGENT.md` and `SKILL.md` link tables checked: every link points to
  a file that exists.

Stage Summary:
- The documentation surface is now complete: every vanilla component has a
  contribution guide (AGENT.md) and a usage guide (SKILL.md), and both root
  routers list all 27 components organized by the same category slugs the
  platform uses.
- The 24 new files follow the established board/toggle-group template
  structure exactly (Component / File Structure / Architecture / Public API
  surface / Internal state / CSS custom properties / Coding Conventions /
  Known Issues / Debugging Tips for AGENT.md; Installation / Quick Start /
  Constructor + Options / Methods / Events / CSS Custom Properties /
  Examples / Integration Notes for SKILL.md).
- The documented Known Issues give future contributors a concrete list of
  real bugs to fix — these were found by reading the source, not invented.
