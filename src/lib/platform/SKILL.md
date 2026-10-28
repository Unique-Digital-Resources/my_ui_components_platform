# SKILL.md — Platform

The single source of truth for component, category, example, changelog, and
documentation metadata. Used by the directory, search palette, sidebar, API
reference view, examples view, and changelog view to render the
documentation site. NOT a component — a typed data module.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  components,
  categories,
  plannedComponents,
  examples,
  changelog,
  docSections,
  getComponent,
  getCategory,
  componentsByCategory,
  type ComponentMeta,
  type CategoryMeta,
  type ExampleMeta,
  type ChangelogEntry,
  type DocSection,
  type ComponentStatus,
} from "@/lib/platform/content";
```

No CSS import required — this is a pure TypeScript data module.

---

## Quick Start

```ts
import { components, getComponent, componentsByCategory } from "@/lib/platform/content";

// List all components.
for (const c of components) {
  console.log(c.slug, c.name, c.status);
}

// Look up a single component.
const wheel = getComponent("color-wheel");
if (wheel) {
  console.log(wheel.name);
  console.log(wheel.description);
  for (const m of wheel.methods) console.log(m.signature, m.description);
}

// List components in a category.
const colorComponents = componentsByCategory("color");
```

---

## Exported Data

### `components: ComponentMeta[]`

All shipped components. Each entry has full metadata for rendering the
directory card, the detail page, and the API reference.

```ts
interface ComponentMeta {
  slug: string;          // "color-wheel"
  name: string;          // "Color Wheel Picker"
  category: string;      // "color"
  description: string;   // 1-line card description
  longDescription: string;
  status: "stable" | "beta" | "experimental" | "planned";
  tags: string[];
  capabilities: string[];
  whenToUse: string[];
  whenNotToUse: string[];
  properties: ComponentProperty[];
  methods: ComponentMethod[];
  events: ComponentEvent[];
  defaults: Record<string, unknown>;
}

interface ComponentProperty {
  name: string;
  type: string;
  default: string;
  description: string;
}

interface ComponentMethod {
  signature: string;
  description: string;
  returns?: string;
}

interface ComponentEvent {
  name: string;
  payload: string;
  description: string;
}
```

### `categories: CategoryMeta[]`

The four top-level categories: Color, Inputs, Layout, Data Display.

```ts
interface CategoryMeta {
  slug: string;
  name: string;
  description: string;
  icon: string;          // Lucide icon name
  capabilities: string[];
  useCases: string[];
}
```

### `plannedComponents: { slug, name, category, description }[]`

Placeholder entries shown as "Planned" in the directory. Not clickable.
When a planned component ships, move its entry to `components` with the
full `ComponentMeta` shape.

### `examples: ExampleMeta[]`

Example showcases grouped by category (Creative tools / Developer tools /
Productivity). Each example references the component slugs it uses.

```ts
interface ExampleMeta {
  slug: string;
  title: string;
  category: "Creative tools" | "Developer tools" | "Productivity";
  description: string;
  components: string[];  // slugs of components used in the example
  interactive: boolean;
}
```

### `changelog: ChangelogEntry[]`

Version history, newest first.

```ts
interface ChangelogEntry {
  version: string;
  date: string;          // "YYYY-MM-DD"
  added: string[];
  improved: string[];
  fixed: string[];
  breaking: string[];
}
```

### `docSections: DocSection[]`

Documentation sections (installation, concepts, theming, api). Each maps
to a `Route` from `@/store/navigation`.

```ts
interface DocSection {
  slug: string;
  title: string;
  description: string;
  route: Route;
}
```

---

## Lookup Helpers

| Function                              | Returns                          | Description                              |
|---------------------------------------|----------------------------------|------------------------------------------|
| `getComponent(slug)`                  | `ComponentMeta \| undefined`     | Look up a component by slug.             |
| `getCategory(slug)`                   | `CategoryMeta \| undefined`      | Look up a category by slug.              |
| `componentsByCategory(category)`      | `ComponentMeta[]`                | All components in a category slug.       |

---

## Code Examples

### Render a directory of components

```tsx
import { components, componentsByCategory } from "@/lib/platform/content";

export function Directory({ category }: { category?: string }) {
  const list = category ? componentsByCategory(category) : components;
  return (
    <ul>
      {list.map((c) => (
        <li key={c.slug}>
          <h3>{c.name}</h3>
          <p>{c.description}</p>
          <span>{c.status}</span>
        </li>
      ))}
    </ul>
  );
}
```

### Render a component's API reference

```tsx
import { getComponent } from "@/lib/platform/content";

export function ApiReference({ slug }: { slug: string }) {
  const meta = getComponent(slug);
  if (!meta) return <p>Not found</p>;
  return (
    <section>
      <h2>{meta.name}</h2>
      <p>{meta.longDescription}</p>

      <h3>Methods</h3>
      <table>
        <tbody>
          {meta.methods.map((m) => (
            <tr key={m.signature}>
              <td><code>{m.signature}</code></td>
              <td>{m.description}</td>
              <td>{m.returns ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Events</h3>
      <ul>
        {meta.events.map((e) => (
          <li key={e.name}>
            <code>{e.name}</code> — {e.description} ({e.payload})
          </li>
        ))}
      </ul>
    </section>
  );
}
```

### Render category navigation

```tsx
import { categories, componentsByCategory } from "@/lib/platform/content";

export function CategoryNav() {
  return (
    <nav>
      {categories.map((cat) => (
        <div key={cat.slug}>
          <h4>{cat.name}</h4>
          <ul>
            {componentsByCategory(cat.slug).map((c) => (
              <li key={c.slug}>{c.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

### Render the changelog

```tsx
import { changelog } from "@/lib/platform/content";

export function Changelog() {
  return (
    <article>
      {changelog.map((entry) => (
        <section key={entry.version}>
          <h2>v{entry.version} — {entry.date}</h2>
          {entry.added.length > 0 && (
            <div>
              <h3>Added</h3>
              <ul>{entry.added.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
          {entry.fixed.length > 0 && (
            <div>
              <h3>Fixed</h3>
              <ul>{entry.fixed.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          )}
        </section>
      ))}
    </article>
  );
}
```

### Show "when to use" guidance

```tsx
import { getComponent } from "@/lib/platform/content";

const meta = getComponent("color-wheel");
return (
  <div>
    <h3>When to use</h3>
    <ul>{meta?.whenToUse.map((w) => <li key={w}>{w}</li>)}</ul>
    <h3>When not to use</h3>
    <ul>{meta?.whenNotToUse.map((w) => <li key={w}>{w}</li>)}</ul>
  </div>
);
```

---

## Integration Notes

- **Server-safe**: the module is plain TypeScript with no DOM access. It
  can be imported in server components, layouts, and route handlers.
- **Single source of truth**: don't duplicate component metadata elsewhere.
  If you need a component's name, description, or API, import it from here.
- **Status field**: use `status` to drive badges (Stable / Beta /
  Experimental / Planned) in the directory. The `plannedComponents` array
  is separate from `components` — planned entries don't have full metadata.
- **Slugs are stable identifiers**: they're used in routes, navigation, and
  the `getComponent` lookup. Don't rename a slug after shipping — it would
  break bookmarks and external links.
- **Category icons**: the `icon` field is a Lucide icon name (e.g.
  `"Palette"`, `"SlidersHorizontal"`). The sidebar and category view map
  these to Lucide React components.
- **Adding metadata for a new component**: see AGENT.md "How to Extend /
  Modify" — there's a checklist that includes updating `page.tsx` and the
  navigation store.
- **Validation**: there's no build-time validation that `category` slugs
  match `CategoryMeta.slug`, or that example `components` arrays reference
  real slugs. Be careful when editing.

---

## Related Modules

- [Navigation store](../../store/navigation.ts) — consumes `categories` and
  `components` for sidebar groups, breadcrumbs, and search.
- [Components view](../../components/views/components-view.tsx) — renders the
  directory from `components` + `plannedComponents`.
- [Category view](../../components/views/category-view.tsx) — renders a
  single category from `getCategory` + `componentsByCategory`.
- [API reference view](../../components/views/docs-api-view.tsx) — renders
  the searchable API reference from `components[i].methods` / `events` /
  `properties`.
- [Examples view](../../components/views/examples-view.tsx) — renders the
  examples grid from `examples`.
- [Changelog view](../../components/views/changelog-view.tsx) — renders the
  changelog from `changelog`.
