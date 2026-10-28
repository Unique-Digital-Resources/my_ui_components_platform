# AGENT.md — Platform

Contribution guide for `src/lib/platform/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Module

**Platform** — the single source of truth for component, category, example,
changelog, and documentation metadata. The directory, search palette,
sidebar, API reference view, examples view, and changelog view all consume
this file. It is NOT a component — it's a typed data module.

## File Structure

```
src/lib/platform/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
└── content.ts          ← all metadata: components, categories, examples, changelog, docs
```

## Architecture

`content.ts` exports typed constants and lookup helpers. Everything is a
plain TypeScript `export const` — no classes, no runtime state, no side
effects. The module is safe to import on the server (it's used by Next.js
layouts and views).

### Exports

| Export                  | Type                  | Description                                                  |
|-------------------------|-----------------------|--------------------------------------------------------------|
| `categories`            | `CategoryMeta[]`      | All categories (Color, Inputs, Layout, Data Display).        |
| `components`            | `ComponentMeta[]`     | All shipped components (10 as of this writing).              |
| `plannedComponents`     | `{ slug, name, category, description }[]` | Placeholder entries shown as "planned" in the directory. |
| `examples`              | `ExampleMeta[]`       | Example showcases grouped by category.                       |
| `changelog`             | `ChangelogEntry[]`    | Version history with added/improved/fixed/breaking sections. |
| `docSections`           | `DocSection[]`        | Documentation sections (installation, concepts, theming, api). |
| `getComponent(slug)`    | `ComponentMeta \| undefined` | Look up a component by slug.                          |
| `getCategory(slug)`     | `CategoryMeta \| undefined` | Look up a category by slug.                            |
| `componentsByCategory(category)` | `ComponentMeta[]` | All components in a category.                       |
| Types: `ComponentStatus`, `ComponentMeta`, `ComponentProperty`, `ComponentMethod`, `ComponentEvent`, `CategoryMeta`, `ExampleMeta`, `ChangelogEntry`, `DocSection` | | |

### `ComponentMeta` shape

```ts
interface ComponentMeta {
  slug: string;          // "color-wheel"
  name: string;          // "Color Wheel Picker"
  category: string;      // "color" (matches a CategoryMeta.slug)
  description: string;   // 1-line card description
  longDescription: string; // paragraph for the detail page
  status: "stable" | "beta" | "experimental" | "planned";
  tags: string[];
  capabilities: string[];
  whenToUse: string[];
  whenNotToUse: string[];
  properties: ComponentProperty[];   // for the API reference
  methods: ComponentMethod[];
  events: ComponentEvent[];
  defaults: Record<string, unknown>;
}
```

### `CategoryMeta` shape

```ts
interface CategoryMeta {
  slug: string;          // "color"
  name: string;          // "Color"
  description: string;
  icon: string;          // Lucide icon name
  capabilities: string[];
  useCases: string[];
}
```

### `ExampleMeta`, `ChangelogEntry`, `DocSection`

See `content.ts` for the exact shapes. Each has a `slug` for routing and a
human-readable title/description.

## How to Extend / Modify

### Add a new component to the directory

1. Add a `ComponentMeta` entry to the `components` array. The `slug` must
   be unique and match the route slug used in `page.tsx`. The `category`
   must match an existing `CategoryMeta.slug`.
2. Fill in `properties`, `methods`, `events`, and `defaults` from the
   component's actual public API. These drive the API reference view
   (`src/components/views/docs-api-view.tsx`) and the playground's
   documentation section.
3. If the component is planned but not yet shipped, add it to
   `plannedComponents` instead. Planned entries appear in the directory
   with a "Planned" badge and are not clickable.
4. Update the navigation store (`src/store/navigation.ts`) if a new
   slug→name mapping is needed for breadcrumbs / labels.
5. Update `page.tsx` to route the new slug to the component's playground.

### Add a new category

1. Add a `CategoryMeta` entry to `categories`. Use a unique `slug`.
2. Components with `category: "<new-slug>"` will appear in this category
   automatically (via `componentsByCategory`).
3. Update the navigation store's `routeLabel` / `breadcrumbs` to handle the
   new category slug.

### Add an example

1. Add an `ExampleMeta` entry to `examples`. The `slug` becomes the route
   `examples/<slug>`.
2. List the component slugs used in the example in the `components` array.
3. Set `interactive: true` if the example has live controls.

### Add a changelog entry

1. Add a `ChangelogEntry` to the start of the `changelog` array (newest
   first).
2. Fill in `added`, `improved`, `fixed`, `breaking` arrays as applicable.
   Empty arrays are fine.
3. The changelog view (`src/components/views/changelog-view.tsx`) renders
   these automatically.

### Add a documentation section

1. Add a `DocSection` entry to `docSections`. The `route` is a typed `Route`
   from `@/store/navigation`.
2. Add the matching route name to the `Route` union in
   `src/store/navigation.ts`.
3. Create a view component in `src/components/views/docs-<slug>-view.tsx`
   and wire it in `page.tsx`.

## Known Issues & TODOs

- The `longDescription`, `whenToUse`, and `whenNotToUse` fields are written
  by hand for each component. They can drift from the actual behavior if
  the component changes — keep them in sync when modifying a component's
  public API.
- The `plannedComponents` array is a flat list with minimal metadata. When
  a planned component ships, you must move its entry to `components` with
  the full `ComponentMeta` shape — there's no automatic migration.
- The `examples` array references component slugs but doesn't validate them
  at build time. A typo in a slug will silently break the example's
  component list.
- The changelog is purely informational — it's not generated from git
  history or any other source. Remember to update it when shipping.
- The `defaults` field is a `Record<string, unknown>` — there's no type
  checking that the keys match the component's actual option names. A
  future enhancement could derive this from the component's
  `Options` interface.
- Categories are hardcoded; there's no way to add a category at runtime.
  This is intentional (the directory structure is part of the platform's
  design), but it means new categories require a source change.

## Files This Module Touches

- Consumed by: `src/store/navigation.ts` (sidebar groups, breadcrumbs,
  search), `src/components/views/components-view.tsx` (directory),
  `src/components/views/category-view.tsx`, `src/components/views/docs-api-view.tsx`,
  `src/components/views/examples-view.tsx`, `src/components/views/example-detail-view.tsx`,
  `src/components/views/changelog-view.tsx`, `src/components/views/home-view.tsx`,
  `src/components/platform/sidebar.tsx`, `src/components/platform/search-palette.tsx`.
- Import type from: `src/store/navigation.ts` (`Route`).
- Each component playground reads its own `ComponentMeta` to render the
  properties/methods/events tables in the documentation section.
