# AGENT.md — Content Templates

Contribution guide for `src/lib/templates/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Module

**Content Templates** — a registry-based content layout system. Templates
are declarative descriptions of how to lay out a piece of content (e.g. a
Kanban card, a list row, a tooltip body). They are NOT components. They
separate the *layout and properties* of a content surface from the *data*
that fills it, so the same template can be reused across instances and the
same data can be rendered with different templates.

This module is the **third platform-level concept** alongside Commands
(`src/lib/commands/`) and components (`src/lib/components/`). Like Commands,
it is a singleton registry + helper utilities; like components, it ends up
producing DOM.

## File Structure

```
src/lib/templates/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── registry.ts         ← ContentTemplateRegistry, SlotRendererRegistry,
│                         ContentTemplate/TemplateSlot/SlotRenderer types
├── renderers.ts        ← built-in slot renderers + scoped CSS
└── index.ts            ← barrel + registerBuiltinTemplates()
```

## Architecture

### Registry (`registry.ts`)

Two singletons:

- `templateRegistry` — `Map<string, ContentTemplate>`. Lookup by ID,
  `byCategory(category)` for the template browser.
- `rendererRegistry` — `Map<string, SlotRenderer>`. Lookup by name; each
  template's slots reference a renderer by name.

`ContentTemplate` shape:

```ts
interface ContentTemplate {
  id: string;             // "kanban.standard-task"
  name: string;           // "Standard Task"
  category: string;       // "Kanban" | "List" | ...
  description: string;
  slots: TemplateSlot[];
  defaultDensity?: TemplateDensity;  // optional
}

interface TemplateSlot {
  field: string;          // "priority" | "title" | "description" | ...
  renderer: string;       // "priority-row" | "title" | ... (must be registered)
  visibleIn?: TemplateDensity[];  // default: all densities
  props?: Record<string, unknown>;  // per-slot props forwarded to renderer
}

type TemplateDensity = "compact" | "standard" | "detailed";
```

`SlotRenderContext` (passed to every renderer):

```ts
interface SlotRenderContext<T = Record<string, unknown>> {
  item: T;                // the data record (e.g. a KanbanItem)
  slot: TemplateSlot;     // the slot being rendered
  density: TemplateDensity;  // the host's current density
  host?: Record<string, unknown>;  // ambient host state (opaque to the registry)
}

type SlotRenderer = (ctx: SlotRenderContext) => HTMLElement | null;
```

Public methods on `templateRegistry`: `register`, `registerAll`, `get`,
`has`, `list`, `byCategory`, `unregister`, `clear`.

Public methods on `rendererRegistry`: `register`, `registerAll`, `get`,
`has`, `list`, `unregister`, `clear`.

Convenience functions: `defineTemplate(tpl)`, `defineTemplates(tpls[])`,
`defineRenderer(name, fn)`, `defineRenderers(entries)`, `slotVisible(slot,
density)`.

### Renderers (`renderers.ts`)

Built-in slot renderers (all pure functions, no host-component imports):

| Name              | Reads         | Renders                                              |
|-------------------|---------------|------------------------------------------------------|
| `priority-row`    | `priority`    | Uppercase row: colored dot + label (Low/Medium/High) |
| `severity-row`    | `severity`    | Like priority-row but for bug severities             |
| `title`           | `title`       | Primary single-line title (fallback to `name`)       |
| `description`     | `description` | Clamped multi-line description (2 or 4 lines)        |
| `label-chips`     | `labels`      | Wrap of monospace chips, `+N` for overflow           |
| `assignee-avatar` | `assignee`    | Circular initials avatar with title tooltip          |
| `assignee-row`    | `assignee`    | Avatar + name in a row                               |
| `meta-line`       | any field     | Muted mono line with optional uppercase prefix       |
| `id-badge`        | any field     | Monospace pill, truncated to `maxLength`             |
| `progress-bar`    | `progress`    | 0–100 numeric progress bar with optional label       |
| `divider`         | —             | Thin horizontal rule                                 |
| `footer`          | —             | Empty footer wrapper (layout primitive)              |

Each renderer returns `HTMLElement | null`. Returning `null` lets the host
skip whitespace gaps for fields that are absent on the data record.

Scoped CSS is injected once (id `content-template-styles`), `.ctpl-` prefix.
Colors come from the host's `--kb-*` custom properties (or sensible
fallbacks) so templates look native inside a Kanban card without coupling to
the Kanban's class names. The accent is always the brand lemon.

### Built-in templates (`index.ts`)

`registerBuiltinTemplates()` is called once on app init (typically inside a
component playground's `useEffect`, mirroring how `registerBuiltinCommands()`
is used). It first calls `registerBuiltinRenderers()` (idempotent — safe to
call multiple times), then registers the built-in templates:

| ID                       | Name           | Slots                                                        |
|--------------------------|----------------|--------------------------------------------------------------|
| `kanban.standard-task`   | Standard Task  | priority, title, description, labels, assignee               |
| `kanban.minimal`         | Minimal        | title only                                                   |
| `kanban.bug-report`      | Bug Report     | severity, title, description, reporter, id                   |
| `kanban.milestone`       | Milestone      | title, dueDate (meta-line), progress                         |

These cover the **current Kanban card content pattern** (standard-task) plus
three alternatives that demonstrate the template system.

## How to Extend / Modify

### Add a new built-in template

Add an entry to the `defineTemplates([...])` array in
`src/lib/templates/index.ts`:

```ts
{
  id: "kanban.epic",
  name: "Epic",
  category: "Kanban",
  description: "Title + child-count meta line + progress.",
  slots: [
    { field: "title",       renderer: "title",         visibleIn: ["compact", "standard", "detailed"] },
    { field: "childCount",  renderer: "meta-line",     visibleIn: ["standard", "detailed"], props: { prefix: "CHILDREN" } },
    { field: "progress",    renderer: "progress-bar",  visibleIn: ["standard", "detailed"], props: { showLabel: true } },
  ],
}
```

### Add a template at runtime (no source change)

```ts
import { defineTemplate } from "@/lib/templates";

defineTemplate({
  id: "my-app.custom-card",
  name: "Custom Card",
  category: "Kanban",
  description: "Runtime-registered template.",
  slots: [
    { field: "title", renderer: "title", visibleIn: ["compact", "standard", "detailed"] },
  ],
});
```

The template is immediately available to `templateRegistry.get()` and to any
host component that looks up templates by ID.

### Add a new slot renderer

1. Implement a `SlotRenderer` in `renderers.ts` (or your own module):
   ```ts
   export const myRenderer: SlotRenderer = (ctx) => {
     const value = ctx.item[ctx.slot.field];
     if (!value) return null;
     const el = document.createElement("div");
     el.className = "ctpl-my-renderer";
     el.textContent = String(value);
     return el;
   };
   ```
2. Register it inside `registerBuiltinRenderers()`:
   ```ts
   defineRenderers({ ..., "my-renderer": myRenderer });
   ```
3. Add the scoped CSS to the `injectStyles()` template string.

Or register at runtime:

```ts
import { defineRenderer } from "@/lib/templates";
defineRenderer("my-renderer", (ctx) => { /* ... */ });
```

### Add a new category of templates (e.g. for a List component)

1. Add templates with `category: "List"` (or any name).
2. In the host component's playground, call
   `templateRegistry.byCategory("List")` to populate a template picker.
3. The host component iterates `template.slots` and calls each slot's
   renderer — no other integration is required.

## Design Discipline

- **Renderers are pure functions**: no module-level state, no listeners, no
  side effects beyond DOM creation. They never read component-level options
  directly; ambient host state is forwarded through `ctx.host`.
- **The accent is always the brand lemon** (`#D9FF66`). No indigo, no blue.
  Priority/severity/progress colors use the host's `--kb-ok`, `--kb-warn`,
  `--kb-danger` tokens so they retheme automatically.
- **Scoped `.ctpl-` CSS**. The class prefix is unique to this module so
  templates can be embedded in any host without selector clashes.
- **`null` is the absence of content**. Renderers return `null` for missing
  fields so the host can skip the slot entirely rather than render an empty
  wrapper.
- **Density is the host's call**. The template declares `visibleIn`; the host
  decides which density it is currently rendering in. Templates can suggest a
  `defaultDensity` but the host's runtime choice wins.

## Known Issues & TODOs

- **No template inheritance / composition**: a template cannot extend
  another template. If two templates share a slot prefix, you must duplicate
  the slot definitions. A future `extends` field could address this.
- **No per-template CSS overrides**: templates rely on the host's `--kb-*`
  tokens. A template that wants a different accent color has no built-in
  mechanism to scope a different token; the host would need to set the token
  on a wrapper element.
- **Renderers are global**: the renderer registry is a singleton. Two
  templates cannot register different renderers under the same name. Use
  distinct names (e.g. `kanban.priority-row` vs `list.priority-row`) if you
  need divergent behavior.
- **`registerBuiltinTemplates()` is called inside the Kanban playground's
  `useEffect`** (mirroring how `registerBuiltinCommands()` is called). It is
  idempotent but not free — repeated calls re-register every template. A
  future move to `layout.tsx` would call it exactly once.

## Files This Module Touches

- Consumed by: `KanbanBoard` (`src/lib/components/kanban/kanban.ts`) for
  card content rendering.
- Init: `registerBuiltinTemplates()` is called in the Kanban playground's
  `useEffect` (and may be lifted to `src/app/layout.tsx` later).
- The Kanban's `templateId` option accepts any registered template ID; the
  `getTemplate()` / `setTemplateId(id)` methods expose the current selection
  to the host application.
