# SKILL.md — Content Templates

A vanilla JavaScript content template registry and slot renderer system.
Templates are declarative descriptions of how to lay out a piece of content
(e.g. a Kanban card). They separate the *layout and properties* of a content
surface from the *data* that fills it. Templates are NOT components — they
are reusable content-layout definitions that any host component can iterate.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  templateRegistry,
  rendererRegistry,
  defineTemplate,
  defineTemplates,
  defineRenderer,
  defineRenderers,
  registerBuiltinTemplates,
  slotVisible,
  type ContentTemplate,
  type TemplateSlot,
  type SlotRenderer,
  type SlotRenderContext,
  type TemplateDensity,
} from "@/lib/templates";
```

No CSS import required — the scoped `.ctpl-` stylesheet is injected
automatically by `registerBuiltinTemplates()` (or `registerBuiltinRenderers()`).

---

## Quick Start

```ts
import { registerBuiltinTemplates, templateRegistry, rendererRegistry } from "@/lib/templates";

// 1. Register the built-in templates + renderers (once per app init).
registerBuiltinTemplates();

// 2. Look up a template by ID.
const tpl = templateRegistry.get("kanban.standard-task");
console.log(tpl?.name);   // "Standard Task"
console.log(tpl?.slots);  // [{ field: "priority", renderer: "priority-row", ... }, ...]

// 3. Iterate the template's slots in a host component.
function renderCardContent(item: Record<string, unknown>, density: TemplateDensity): HTMLElement {
  const wrap = document.createElement("div");
  for (const slot of tpl!.slots) {
    if (!slotVisible(slot, density)) continue;
    const renderer = rendererRegistry.get(slot.renderer);
    if (!renderer) continue;
    const el = renderer({ item, slot, density, host: { mode: "editable" } });
    if (el) wrap.appendChild(el);
  }
  return wrap;
}
```

---

## Template Registry API

### `templateRegistry` (singleton)

| Method                              | Returns                     | Description                                            |
|-------------------------------------|-----------------------------|--------------------------------------------------------|
| `register(tpl)`                    | `void`                      | Register or update a template.                         |
| `registerAll(tpls)`                | `void`                      | Register multiple templates.                           |
| `get(id)`                          | `ContentTemplate \| undefined` | Look up a template by ID.                          |
| `has(id)`                          | `boolean`                   | Check if a template exists.                            |
| `list()`                           | `ContentTemplate[]`         | All templates.                                         |
| `byCategory(category)`             | `ContentTemplate[]`         | Templates in a category (e.g. "Kanban").              |
| `unregister(id)`                   | `boolean`                   | Remove a template.                                     |
| `clear()`                          | `void`                      | Remove all templates.                                  |

### Convenience functions

| Function                | Returns      | Description                              |
|-------------------------|--------------|------------------------------------------|
| `defineTemplate(tpl)`   | `ContentTemplate` | Register a single template. Returns it. |
| `defineTemplates(tpls)` | `void`       | Register multiple templates.             |
| `registerBuiltinTemplates()` | `void`  | Register the platform's built-in templates and renderers (call once at app init). |
| `slotVisible(slot, density)` | `boolean` | Should this slot render at the given density? |

### Template shape

```ts
interface ContentTemplate {
  id: string;             // "kanban.standard-task" | "kanban.bug-report" | ...
  name: string;           // "Standard Task" | "Bug Report" | ...
  category: string;       // "Kanban" | "List" | "Tooltip" | ...
  description: string;
  slots: TemplateSlot[];
  defaultDensity?: TemplateDensity;  // optional
}

interface TemplateSlot {
  field: string;          // "priority" | "title" | "description" | "labels" | ...
  renderer: string;       // "priority-row" | "title" | ... (must be registered)
  visibleIn?: TemplateDensity[];  // default: all densities
  props?: Record<string, unknown>;  // per-slot props forwarded to renderer
}

type TemplateDensity = "compact" | "standard" | "detailed";
```

---

## Renderer Registry API

### `rendererRegistry` (singleton)

| Method                              | Returns           | Description                                            |
|-------------------------------------|-------------------|--------------------------------------------------------|
| `register(name, fn)`               | `void`            | Register or update a renderer.                         |
| `registerAll(entries)`             | `void`            | Register multiple renderers at once.                   |
| `get(name)`                        | `SlotRenderer \| undefined` | Look up a renderer by name.                |
| `has(name)`                        | `boolean`         | Check if a renderer exists.                            |
| `list()`                           | `string[]`        | All renderer names.                                    |
| `unregister(name)`                 | `boolean`         | Remove a renderer.                                     |
| `clear()`                          | `void`            | Remove all renderers.                                  |

### Convenience functions

| Function                  | Returns | Description                              |
|---------------------------|---------|------------------------------------------|
| `defineRenderer(name, fn)` | `void` | Register a single renderer.              |
| `defineRenderers(entries)` | `void` | Register multiple renderers.             |

### Renderer signature

```ts
type SlotRenderer = (ctx: SlotRenderContext) => HTMLElement | null;

interface SlotRenderContext<T = Record<string, unknown>> {
  item: T;                // the data record (e.g. a KanbanItem)
  slot: TemplateSlot;     // the slot being rendered
  density: TemplateDensity;  // the host's current density
  host?: Record<string, unknown>;  // ambient host state (opaque)
}
```

Returning `null` lets the host skip the slot entirely (no empty wrapper).

---

## Built-in Renderers

| Name              | Reads (field)  | Renders                                              | Props                              |
|-------------------|----------------|------------------------------------------------------|------------------------------------|
| `priority-row`    | `priority`     | Uppercase row: colored dot + label (Low/Medium/High) | `{ labels?: Record<string, string> }` |
| `severity-row`    | `severity`     | Like priority-row but for bug severities             | `{ labels?: Record<string, string> }` |
| `title`           | `title`        | Primary single-line title (fallback to `name`)       | `{ fallbackField?: string }`       |
| `description`     | `description`  | Clamped multi-line description                       | `{ lines?: number }` (default 2; 4 in detailed) |
| `label-chips`     | `labels`       | Wrap of monospace chips, `+N` for overflow           | `{ max?: number }` (default 4)     |
| `assignee-avatar` | `assignee`     | Circular initials avatar with title tooltip          | `{ size?: number }` (default 22)   |
| `assignee-row`    | `assignee`     | Avatar + name in a row                               | `{ size?: number }` (default 20)   |
| `meta-line`       | any field      | Muted mono line with optional uppercase prefix       | `{ prefix?: string }`              |
| `id-badge`        | any field      | Monospace pill, truncated                            | `{ maxLength?: number }` (default 8) |
| `progress-bar`    | `progress`     | 0–100 numeric progress bar                           | `{ showLabel?: boolean }`          |
| `divider`         | —              | Thin horizontal rule                                 | —                                  |
| `footer`          | —              | Empty footer wrapper (layout primitive)              | —                                  |

All renderers use the brand lemon accent (`#D9FF66`) and the host's `--kb-*`
tokens (or sensible fallbacks). No indigo, no blue.

---

## Built-in Templates

| ID                       | Name           | Category | Slots                                                        |
|--------------------------|----------------|----------|--------------------------------------------------------------|
| `kanban.standard-task`   | Standard Task  | Kanban   | priority, title, description, labels, assignee               |
| `kanban.minimal`         | Minimal        | Kanban   | title only                                                   |
| `kanban.bug-report`      | Bug Report     | Kanban   | severity, title, description, reporter, id                   |
| `kanban.milestone`       | Milestone      | Kanban   | title, dueDate (meta-line), progress                         |

The `kanban.standard-task` template is the **current Kanban card content
pattern** extracted into a reusable form. The other three demonstrate how
the same data can be rendered with different templates.

---

## Code Examples

### Register a custom template at runtime

```ts
import { defineTemplate } from "@/lib/templates";

defineTemplate({
  id: "my-app.epic-card",
  name: "Epic Card",
  category: "Kanban",
  description: "Title + child-count + progress.",
  slots: [
    { field: "title",      renderer: "title",        visibleIn: ["compact", "standard", "detailed"] },
    { field: "childCount", renderer: "meta-line",    visibleIn: ["standard", "detailed"], props: { prefix: "CHILDREN" } },
    { field: "progress",   renderer: "progress-bar", visibleIn: ["standard", "detailed"], props: { showLabel: true } },
  ],
});
```

### Register a custom renderer at runtime

```ts
import { defineRenderer } from "@/lib/templates";

defineRenderer("my-prefix", (ctx) => {
  const value = ctx.item[ctx.slot.field];
  if (!value) return null;
  const row = document.createElement("div");
  row.className = "ctpl-meta-line";
  row.textContent = String(value);
  return row;
});
```

### Iterate a template's slots in a host component

```ts
import { templateRegistry, rendererRegistry, slotVisible } from "@/lib/templates";

function renderCard(item: KanbanItem, templateId: string, density: TemplateDensity) {
  const tpl = templateRegistry.get(templateId);
  const wrap = document.createElement("div");
  if (!tpl) return wrap;
  for (const slot of tpl.slots) {
    if (!slotVisible(slot, density)) continue;
    const renderer = rendererRegistry.get(slot.renderer);
    if (!renderer) continue;
    const el = renderer({ item, slot, density, host: { mode: "editable" } });
    if (el) wrap.appendChild(el);
  }
  return wrap;
}
```

### List all Kanban templates (for a template picker)

```ts
import { templateRegistry } from "@/lib/templates";

const kanbanTemplates = templateRegistry.byCategory("Kanban");
// [
//   { id: "kanban.standard-task", name: "Standard Task", ... },
//   { id: "kanban.minimal",       name: "Minimal",       ... },
//   { id: "kanban.bug-report",    name: "Bug Report",    ... },
//   { id: "kanban.milestone",     name: "Milestone",     ... },
// ]
```

### Use a template from the Kanban component

```ts
import { KanbanBoard } from "@/lib/components/kanban";

const board = new KanbanBoard(container, {
  templateId: "kanban.bug-report",
  items: [
    { id: "b1", columnId: "todo", title: "Crash on save", severity: "critical", reporter: "Ava Kim", id_field: "BUG-1042" },
    // ... note: `id` is reserved for the item's stable identifier; the
    // bug-report template reads `id` for the badge. If your data model
    // conflicts, register a custom template with a different slot field.
  ],
  columns: [...],
});

// Switch templates at runtime:
board.setTemplateId("kanban.milestone");
```

---

## Integration Notes

- **Call `registerBuiltinTemplates()` once at app init**. Calling it multiple
  times is safe (later registrations overwrite earlier ones) but wasteful.
  Inside a React playground, call it in a `useEffect` (mirroring how
  `registerBuiltinCommands()` is used).
- **Templates are global**: the registry is a singleton. A template
  registered by one component is visible to all other components. Use
  category prefixes (e.g. `"kanban."`, `"list."`) to namespace IDs.
- **Renderers are also global**: two templates cannot register different
  renderers under the same name. Use distinct names if you need divergent
  behavior.
- **Density is the host's call**. The template declares `visibleIn`; the host
  decides which density it is currently rendering in. The Kanban component
  derives density from its `cardLayout` option (`compact`/`standard`/`detailed`).
- **Renderers are pure functions**: no module-level state, no listeners. They
  never read component-level options directly; ambient host state is forwarded
  through `ctx.host`.
- **`null` is the absence of content**. Renderers return `null` for missing
  fields so the host can skip the slot entirely rather than render an empty
  wrapper.
- **The accent is always the brand lemon** (`#D9FF66`). No indigo, no blue.
  Priority/severity/progress colors use the host's `--kb-ok`, `--kb-warn`,
  `--kb-danger` tokens so they retheme automatically.
- **No SSR concerns**: the registries are plain `Map`s; it's safe to call
  `registerBuiltinTemplates()` on the server (it just populates the maps).
  The scoped CSS injection is guarded by `typeof document` and is a no-op
  on the server.

---

## Related Modules

- [Commands](../commands/SKILL.md) — declarative actions with keyboard
  shortcuts; the precedent for this registry-based pattern.
- [Kanban Board](../components/kanban/SKILL.md) — the first host component to
  use content templates for its card rendering.
