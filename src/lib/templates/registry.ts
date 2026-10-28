/**
 * Content Templates — a registry-based content layout system.
 *
 * Content templates are declarative descriptions of how to lay out a piece of
 * content (e.g. a Kanban card, a list row, a tooltip body). They are NOT
 * components. They separate the *layout and properties* of a content surface
 * from the *data* that fills it, so the same template can be reused across
 * instances and the same data can be rendered with different templates.
 *
 * A template is an ordered list of *slots*. Each slot names a *field* on the
 * data record and a *renderer* that knows how to turn that field's value into
 * a DOM element. Renderers are registered separately (see `renderers.ts`) so
 * the same renderer can be shared across many templates.
 *
 * Usage:
 *   import { templateRegistry, defineTemplate } from "@/lib/templates";
 *
 *   defineTemplate({
 *     id: "kanban.standard-task",
 *     name: "Standard Task",
 *     category: "Kanban",
 *     description: "Priority, title, description, labels, and assignee.",
 *     slots: [
 *       { field: "priority",   renderer: "priority-row",   visibleIn: ["standard", "detailed"] },
 *       { field: "title",      renderer: "title",          visibleIn: ["compact", "standard", "detailed"] },
 *       { field: "description", renderer: "description",   visibleIn: ["standard", "detailed"] },
 *       { field: "labels",     renderer: "label-chips",    visibleIn: ["standard", "detailed"], props: { max: 4 } },
 *       { field: "assignee",   renderer: "assignee-avatar", visibleIn: ["standard", "detailed"] },
 *     ],
 *   });
 *
 *   const tpl = templateRegistry.get("kanban.standard-task");
 *   const all = templateRegistry.list();
 *   const kanbanTemplates = templateRegistry.byCategory("Kanban");
 */

/** Density buckets. Matches the Kanban card layout option. */
export type TemplateDensity = "compact" | "standard" | "detailed";

/**
 * Context passed to every slot renderer. The host component (e.g. KanbanBoard)
 * may attach its own ambient state via `host` so renderers can branch on
 * component-level options without the template knowing the component's API.
 */
export interface SlotRenderContext<T = Record<string, unknown>> {
  /** The data record being rendered (e.g. a KanbanItem). */
  item: T;
  /** The slot definition being rendered. */
  slot: TemplateSlot;
  /** The current density bucket the host is rendering in. */
  density: TemplateDensity;
  /** Ambient host state (component options, board mode, etc.). Opaque to the registry. */
  host?: Record<string, unknown>;
}

/**
 * A slot renderer takes a render context and returns a DOM element to append
 * to the host, or `null` to render nothing for this slot. Returning `null`
 * (rather than an empty element) lets the host skip whitespace gaps.
 */
export type SlotRenderer = (ctx: SlotRenderContext) => HTMLElement | null;

export interface TemplateSlot {
  /**
   * The data field this slot reads. Standard field names are: "priority",
   * "title", "description", "labels", "assignee", "dueDate", "severity",
   * "reporter", "progress", "id". Custom fields are allowed — the host
   * component is responsible for surfacing them on the data record.
   */
  field: string;
  /** The named renderer to use. Must be registered in the renderer registry. */
  renderer: string;
  /**
   * Densities in which this slot is visible. Slots not visible in the
   * current density are skipped entirely. Use this to hide rich slots in
   * `compact` mode.
   */
  visibleIn?: TemplateDensity[];
  /** Optional per-slot props forwarded to the renderer (e.g. `{ max: 4 }`). */
  props?: Record<string, unknown>;
}

export interface ContentTemplate {
  /** Unique ID, e.g. "kanban.standard-task". */
  id: string;
  /** Display label, e.g. "Standard Task". */
  name: string;
  /** Grouping for the template browser, e.g. "Kanban", "List", "Tooltip". */
  category: string;
  /** One-line description of what this template is for. */
  description: string;
  /** Ordered list of slots rendered top-to-bottom. */
  slots: TemplateSlot[];
  /**
   * Optional default density. The host component may override this at
   * render time. If omitted, the host's current density wins.
   */
  defaultDensity?: TemplateDensity;
}

/** Default visibility for a slot that doesn't specify `visibleIn`. */
export const DEFAULT_VISIBILITY: TemplateDensity[] = ["compact", "standard", "detailed"];

/** Returns true if a slot should render at the given density. */
export function slotVisible(slot: TemplateSlot, density: TemplateDensity): boolean {
  const v = slot.visibleIn ?? DEFAULT_VISIBILITY;
  return v.includes(density);
}

/**
 * The template registry — a singleton map of template ID → ContentTemplate.
 * Components look up templates by ID; the host component iterates `slots`
 * and calls each slot's renderer.
 */
class ContentTemplateRegistry {
  private templates = new Map<string, ContentTemplate>();

  /** Register or update a template. */
  register(tpl: ContentTemplate): void {
    this.templates.set(tpl.id, { ...tpl, slots: tpl.slots.map((s) => ({ ...s })) });
  }

  /** Register multiple templates at once. */
  registerAll(tpls: ContentTemplate[]): void {
    for (const tpl of tpls) this.register(tpl);
  }

  /** Get a template by ID. */
  get(id: string): ContentTemplate | undefined {
    return this.templates.get(id);
  }

  /** Check if a template exists. */
  has(id: string): boolean {
    return this.templates.has(id);
  }

  /** List all templates. */
  list(): ContentTemplate[] {
    return Array.from(this.templates.values());
  }

  /** List templates by category. */
  byCategory(category: string): ContentTemplate[] {
    return this.list().filter((t) => t.category === category);
  }

  /** Remove a template by ID. */
  unregister(id: string): boolean {
    return this.templates.delete(id);
  }

  /** Clear all templates. */
  clear(): void {
    this.templates.clear();
  }
}

/** The singleton template registry instance. */
export const templateRegistry = new ContentTemplateRegistry();

/** Convenience function to define and register a single template. */
export function defineTemplate(tpl: ContentTemplate): ContentTemplate {
  templateRegistry.register(tpl);
  return tpl;
}

/** Convenience function to define and register multiple templates. */
export function defineTemplates(tpls: ContentTemplate[]): void {
  templateRegistry.registerAll(tpls);
}

// ---- Renderer registry ----

/**
 * The renderer registry — a singleton map of renderer name → SlotRenderer.
 * Renderers are pure functions from a SlotRenderContext to a DOM element (or
 * null). They do not depend on the host component's API; ambient host state
 * is forwarded through `ctx.host`.
 */
class SlotRendererRegistry {
  private renderers = new Map<string, SlotRenderer>();

  /** Register or update a renderer. */
  register(name: string, fn: SlotRenderer): void {
    this.renderers.set(name, fn);
  }

  /** Register multiple renderers at once. */
  registerAll(entries: Record<string, SlotRenderer>): void {
    for (const [name, fn] of Object.entries(entries)) this.register(name, fn);
  }

  /** Get a renderer by name. */
  get(name: string): SlotRenderer | undefined {
    return this.renderers.get(name);
  }

  /** Check if a renderer exists. */
  has(name: string): boolean {
    return this.renderers.has(name);
  }

  /** List all renderer names. */
  list(): string[] {
    return Array.from(this.renderers.keys());
  }

  /** Remove a renderer by name. */
  unregister(name: string): boolean {
    return this.renderers.delete(name);
  }

  /** Clear all renderers. */
  clear(): void {
    this.renderers.clear();
  }
}

/** The singleton renderer registry instance. */
export const rendererRegistry = new SlotRendererRegistry();

/** Convenience function to register a single renderer. */
export function defineRenderer(name: string, fn: SlotRenderer): void {
  rendererRegistry.register(name, fn);
}

/** Convenience function to register multiple renderers. */
export function defineRenderers(entries: Record<string, SlotRenderer>): void {
  rendererRegistry.registerAll(entries);
}
