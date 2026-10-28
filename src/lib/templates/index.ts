/**
 * Content Templates — registry + built-in renderers and templates.
 *
 * Content templates are declarative descriptions of how to lay out a piece of
 * content (e.g. a Kanban card). They separate the *layout and properties* of
 * a content surface from the *data* that fills it. Templates are NOT
 * components — they are reusable content-layout definitions that any host
 * component can iterate.
 *
 * A template is an ordered list of *slots*. Each slot names a *field* on the
 * data record and a *renderer* that knows how to turn that field's value
 * into a DOM element. Renderers are registered separately so the same
 * renderer can be shared across many templates.
 *
 * Built-in renderers: priority-row, title, description, label-chips,
 * assignee-avatar, assignee-row, meta-line, id-badge, progress-bar,
 * severity-row, divider, footer.
 *
 * Built-in templates (see `registerBuiltinTemplates`):
 *   - kanban.standard-task  — priority, title, description, labels, assignee
 *   - kanban.minimal        — title only (compact-friendly)
 *   - kanban.bug-report     — severity, title, description, reporter, id
 *   - kanban.milestone      — title, due date, progress bar
 */

export {
  templateRegistry,
  rendererRegistry,
  defineTemplate,
  defineTemplates,
  defineRenderer,
  defineRenderers,
  slotVisible,
  DEFAULT_VISIBILITY,
} from "./registry";
export type {
  ContentTemplate,
  TemplateSlot,
  SlotRenderer,
  SlotRenderContext,
  TemplateDensity,
} from "./registry";

export {
  registerBuiltinRenderers,
  priorityRowRenderer,
  titleRenderer,
  descriptionRenderer,
  labelChipsRenderer,
  assigneeAvatarRenderer,
  assigneeRowRenderer,
  metaLineRenderer,
  idBadgeRenderer,
  progressBarRenderer,
  severityRowRenderer,
  dividerRenderer,
  footerRenderer,
} from "./renderers";

import { defineTemplates } from "./registry";
import { registerBuiltinRenderers } from "./renderers";

/**
 * Register the platform's built-in content templates and slot renderers.
 * Called once on app init. Individual component playgrounds can register
 * additional component-specific templates.
 *
 * Safe to call multiple times — later registrations overwrite earlier ones.
 */
export function registerBuiltinTemplates(): void {
  // Make sure all built-in renderers exist before templates reference them.
  registerBuiltinRenderers();

  defineTemplates([
    {
      id: "kanban.standard-task",
      name: "Standard Task",
      category: "Kanban",
      description:
        "Priority row, title, two-line description, label chips, and assignee avatar. The default Kanban card pattern.",
      slots: [
        { field: "priority",    renderer: "priority-row",    visibleIn: ["standard", "detailed"] },
        { field: "title",       renderer: "title",           visibleIn: ["compact", "standard", "detailed"] },
        { field: "description", renderer: "description",     visibleIn: ["standard", "detailed"] },
        { field: "labels",      renderer: "label-chips",     visibleIn: ["standard", "detailed"], props: { max: 4 } },
        { field: "assignee",    renderer: "assignee-avatar", visibleIn: ["standard", "detailed"] },
      ],
    },
    {
      id: "kanban.minimal",
      name: "Minimal",
      category: "Kanban",
      description:
        "Title only. Useful for high-density boards where the card content is dominated by the title.",
      slots: [
        { field: "title", renderer: "title", visibleIn: ["compact", "standard", "detailed"] },
      ],
    },
    {
      id: "kanban.bug-report",
      name: "Bug Report",
      category: "Kanban",
      description:
        "Severity row, title, description, reporter, and an id badge. For QA / issue-tracking boards.",
      slots: [
        { field: "severity",    renderer: "severity-row", visibleIn: ["compact", "standard", "detailed"] },
        { field: "title",       renderer: "title",        visibleIn: ["compact", "standard", "detailed"] },
        { field: "description", renderer: "description",  visibleIn: ["standard", "detailed"] },
        { field: "reporter",    renderer: "assignee-row", visibleIn: ["standard", "detailed"] },
        { field: "id",          renderer: "id-badge",     visibleIn: ["standard", "detailed"], props: { maxLength: 8 } },
      ],
    },
    {
      id: "kanban.milestone",
      name: "Milestone",
      category: "Kanban",
      description:
        "Title, due-date meta line, and a progress bar. For roadmap / milestone tracking.",
      slots: [
        { field: "title",   renderer: "title",         visibleIn: ["compact", "standard", "detailed"] },
        { field: "dueDate", renderer: "meta-line",     visibleIn: ["standard", "detailed"], props: { prefix: "DUE" } },
        { field: "progress", renderer: "progress-bar", visibleIn: ["standard", "detailed"], props: { showLabel: true } },
      ],
    },
    // ---- Gantt ----
    {
      id: "gantt.standard-bar",
      name: "Standard Bar",
      category: "Gantt",
      description:
        "Bar title with a duration meta-line. The default Gantt bar pattern: shows the task name and a compact date range.",
      slots: [
        { field: "title", renderer: "title",     visibleIn: ["compact", "standard", "detailed"] },
      ],
    },
    {
      id: "gantt.minimal-bar",
      name: "Minimal Bar",
      category: "Gantt",
      description:
        "No content inside the bar — just the colored fill. Useful for high-density timelines where the bar geometry is the primary information.",
      slots: [],
    },
    {
      id: "gantt.detailed-bar",
      name: "Detailed Bar",
      category: "Gantt",
      description:
        "Title + assignee avatar + reference id badge. For resource timelines where each bar shows who is assigned and a reference id.",
      slots: [
        { field: "title",    renderer: "title",           visibleIn: ["compact", "standard", "detailed"] },
        { field: "assignee", renderer: "assignee-avatar", visibleIn: ["standard", "detailed"] },
        { field: "refId",    renderer: "id-badge",        visibleIn: ["standard", "detailed"], props: { maxLength: 6 } },
      ],
    },
  ]);
}
