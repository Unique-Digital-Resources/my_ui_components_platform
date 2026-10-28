/**
 * Built-in slot renderers for the Content Templates system.
 *
 * Each renderer is a pure function (SlotRenderContext → HTMLElement | null).
 * Renderers use the brand lemon accent and the `--kb-*` custom properties so
 * they look native inside a Kanban card. They never read component-level
 * options directly; ambient state is forwarded via `ctx.host`.
 *
 * The renderers are designed to be **host-agnostic**: they read field values
 * from `ctx.item` and (optionally) per-slot props from `ctx.slot.props`. A
 * renderer used in a Kanban template today can be reused in a List template
 * tomorrow without code changes.
 */
import { defineRenderers, type SlotRenderer } from "./registry";

// ---- Helpers ----

const MONO_FONT = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function field(item: Record<string, unknown>, name: string): unknown {
  return item?.[name];
}

function asString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((x) => asString(x) ?? "").filter((s) => s.length > 0);
}

function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---- Renderers ----

/**
 * `priority-row` — small uppercase row with a colored dot and label.
 * Reads `priority` field. Accepts `low`/`medium`/`high` (or any string).
 * Per-slot props: `{ labels?: Record<string, string> }` to override labels.
 */
export const priorityRowRenderer: SlotRenderer = (ctx) => {
  const value = asString(field(ctx.item, ctx.slot.field));
  if (!value) return null;
  const labels: Record<string, string> = (ctx.slot.props?.labels as Record<string, string>) ?? {
    low: "Low",
    medium: "Medium",
    high: "High",
  };
  const row = el("div", "ctpl-priority-row");
  const dot = el("span", `ctpl-priority-dot ctpl-priority-${value}`);
  row.appendChild(dot);
  const lbl = el("span", "ctpl-priority-label");
  lbl.textContent = labels[value] ?? value;
  row.appendChild(lbl);
  return row;
};

/**
 * `title` — the primary single-line title. Always shown.
 * Reads `title` field. Falls back to `name` if `title` is absent.
 * Per-slot props: `{ fallbackField?: string }`.
 */
export const titleRenderer: SlotRenderer = (ctx) => {
  let value = asString(field(ctx.item, ctx.slot.field));
  if (!value) {
    const fallback = (ctx.slot.props?.fallbackField as string) ?? "name";
    value = asString(field(ctx.item, fallback));
  }
  if (!value) return null;
  const t = el("div", "ctpl-title");
  t.textContent = value;
  return t;
};

/**
 * `description` — clamped multi-line description.
 * Reads `description` field. Per-slot props: `{ lines?: number }` (default 2,
 * detailed density uses 4).
 */
export const descriptionRenderer: SlotRenderer = (ctx) => {
  const value = asString(field(ctx.item, ctx.slot.field));
  if (!value) return null;
  const lines = (ctx.slot.props?.lines as number) ?? (ctx.density === "detailed" ? 4 : 2);
  const d = el("div", "ctpl-description");
  d.style.setProperty("-webkit-line-clamp", String(lines));
  d.textContent = value;
  return d;
};

/**
 * `label-chips` — wrap of monospace chip elements.
 * Reads `labels` field (string[]). Per-slot props: `{ max?: number }` (default 4).
 * Surplus labels are summarized as `+N`.
 */
export const labelChipsRenderer: SlotRenderer = (ctx) => {
  const arr = asStringArray(field(ctx.item, ctx.slot.field));
  if (!arr || arr.length === 0) return null;
  const max = (ctx.slot.props?.max as number) ?? 4;
  const wrap = el("div", "ctpl-labels");
  for (const l of arr.slice(0, max)) {
    const chip = el("span", "ctpl-label");
    chip.textContent = l;
    wrap.appendChild(chip);
  }
  if (arr.length > max) {
    const more = el("span", "ctpl-label ctpl-label-more");
    more.textContent = `+${arr.length - max}`;
    wrap.appendChild(more);
  }
  return wrap;
};

/**
 * `assignee-avatar` — a circular initials avatar with title tooltip.
 * Reads `assignee` field. Returns null if absent.
 * Per-slot props: `{ size?: number }` (default 22).
 */
export const assigneeAvatarRenderer: SlotRenderer = (ctx) => {
  const value = asString(field(ctx.item, ctx.slot.field));
  if (!value) return null;
  const size = (ctx.slot.props?.size as number) ?? 22;
  const av = el("span", "ctpl-avatar");
  av.textContent = initials(value);
  av.setAttribute("title", value);
  av.style.width = `${size}px`;
  av.style.height = `${size}px`;
  return av;
};

/**
 * `assignee-row` — avatar + name in a row, used when both should show.
 * Reads `assignee` field. Returns null if absent.
 * Per-slot props: `{ size?: number }` (default 20).
 */
export const assigneeRowRenderer: SlotRenderer = (ctx) => {
  const value = asString(field(ctx.item, ctx.slot.field));
  if (!value) return null;
  const size = (ctx.slot.props?.size as number) ?? 20;
  const row = el("div", "ctpl-meta-row");
  const av = el("span", "ctpl-avatar ctpl-avatar-sm");
  av.textContent = initials(value);
  av.setAttribute("title", value);
  av.style.width = `${size}px`;
  av.style.height = `${size}px`;
  row.appendChild(av);
  const name = el("span", "ctpl-meta-text");
  name.textContent = value;
  row.appendChild(name);
  return row;
};

/**
 * `meta-line` — a single muted line of text from any field, with an optional
 * icon prefix (mono-code prefix). Used for things like "due in 3 days" or
 * "ID-1234".
 * Per-slot props: `{ prefix?: string, icon?: string }`.
 */
export const metaLineRenderer: SlotRenderer = (ctx) => {
  const value = asString(field(ctx.item, ctx.slot.field));
  if (!value) return null;
  const row = el("div", "ctpl-meta-line");
  const prefix = ctx.slot.props?.prefix as string | undefined;
  if (prefix) {
    const p = el("span", "ctpl-meta-prefix");
    p.textContent = prefix;
    row.appendChild(p);
  }
  const txt = el("span", "ctpl-meta-text");
  txt.textContent = value;
  row.appendChild(txt);
  return row;
};

/**
 * `id-badge` — a monospace pill showing the item ID (or any field).
 * Per-slot props: `{ maxLength?: number }` (default 8).
 */
export const idBadgeRenderer: SlotRenderer = (ctx) => {
  const value = asString(field(ctx.item, ctx.slot.field));
  if (!value) return null;
  const maxLen = (ctx.slot.props?.maxLength as number) ?? 8;
  const badge = el("span", "ctpl-id-badge");
  badge.textContent = value.length > maxLen ? value.slice(0, maxLen) : value;
  badge.setAttribute("title", value);
  return badge;
};

/**
 * `progress-bar` — a 0–100 numeric progress bar with optional label.
 * Reads `progress` field (number 0–100). Per-slot props: `{ showLabel?: boolean }`.
 */
export const progressBarRenderer: SlotRenderer = (ctx) => {
  const raw = field(ctx.item, ctx.slot.field);
  if (typeof raw !== "number" || !isFinite(raw)) return null;
  const pct = Math.max(0, Math.min(100, raw));
  const wrap = el("div", "ctpl-progress");
  const track = el("div", "ctpl-progress-track");
  const fill = el("div", "ctpl-progress-fill");
  fill.style.width = `${pct}%`;
  track.appendChild(fill);
  wrap.appendChild(track);
  if (ctx.slot.props?.showLabel) {
    const lbl = el("span", "ctpl-progress-label");
    lbl.textContent = `${Math.round(pct)}%`;
    wrap.appendChild(lbl);
  }
  return wrap;
};

/**
 * `severity-row` — like `priority-row` but uses a different color vocabulary
 * for bug reports (info / minor / major / critical / blocker).
 * Reads `severity` field. Per-slot props: `{ labels?: Record<string, string> }`.
 */
export const severityRowRenderer: SlotRenderer = (ctx) => {
  const value = asString(field(ctx.item, ctx.slot.field));
  if (!value) return null;
  const labels: Record<string, string> = (ctx.slot.props?.labels as Record<string, string>) ?? {
    info: "Info",
    minor: "Minor",
    major: "Major",
    critical: "Critical",
    blocker: "Blocker",
  };
  const row = el("div", "ctpl-priority-row ctpl-severity-row");
  const dot = el("span", `ctpl-priority-dot ctpl-severity-${value}`);
  row.appendChild(dot);
  const lbl = el("span", "ctpl-priority-label");
  lbl.textContent = labels[value] ?? value;
  row.appendChild(lbl);
  return row;
};

/**
 * `divider` — a thin horizontal rule. Reads no field; always renders (when
 * visible). Useful as a visual separator between sections of a template.
 */
export const dividerRenderer: SlotRenderer = () => {
  return el("div", "ctpl-divider");
};

/**
 * `footer` — a horizontal footer wrapper that groups subsequent slots.
 * Reads no field itself; the host is expected to use this as a layout
 * primitive by wrapping its own children. (Prefer `assignee-row` or
 * `meta-line` for typical content.)
 */
export const footerRenderer: SlotRenderer = () => {
  return el("div", "ctpl-footer");
};

// ---- Scoped CSS (injected once, .ctpl- prefix) ----

const STYLE_ID = "content-template-styles";

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.ctpl-priority-row {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 600;
  color: var(--kb-muted, #B8B2CA);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.ctpl-priority-dot {
  width: 7px; height: 7px; border-radius: 999px; flex: 0 0 auto;
  background: var(--kb-muted, #B8B2CA);
}
.ctpl-priority-low    { background: var(--kb-ok, #8FE3A5); }
.ctpl-priority-medium { background: var(--kb-warn, #FFD36B); }
.ctpl-priority-high   { background: var(--kb-danger, #FF858B); }
.ctpl-severity-info     { background: var(--kb-muted, #B8B2CA); }
.ctpl-severity-minor    { background: var(--kb-ok, #8FE3A5); }
.ctpl-severity-major    { background: var(--kb-warn, #FFD36B); }
.ctpl-severity-critical { background: #FF858B; }
.ctpl-severity-blocker  { background: #FF5C5C; }
.ctpl-priority-label { white-space: nowrap; }

.ctpl-title {
  font-size: 13px; font-weight: 600;
  color: var(--kb-text, #F4F1FF);
  line-height: 1.35; word-break: break-word;
}
.ctpl-description {
  font-size: 11.5px; color: var(--kb-muted, #B8B2CA);
  line-height: 1.4; word-break: break-word;
  display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;
}
.ctpl-labels {
  display: flex; flex-wrap: wrap; gap: 4px;
}
.ctpl-label {
  font-family: ${MONO_FONT};
  font-size: 10px; padding: 1px 6px; border-radius: 4px;
  background: var(--kb-surface-3, #342348);
  color: var(--kb-text, #F4F1FF);
  border: 1px solid var(--kb-border, #383343);
}
.ctpl-label-more { color: var(--kb-muted, #B8B2CA); }

.ctpl-meta-row {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--kb-muted, #B8B2CA);
}
.ctpl-meta-line {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--kb-muted, #B8B2CA);
  font-family: ${MONO_FONT};
}
.ctpl-meta-prefix {
  color: var(--kb-accent, #D9FF66);
  font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.ctpl-meta-text { color: var(--kb-text, #F4F1FF); }

.ctpl-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px;
  background: var(--kb-surface-3, #342348);
  color: var(--kb-text, #F4F1FF);
  font-size: 10px; font-weight: 600;
  border: 1px solid var(--kb-border, #383343);
  flex: 0 0 auto;
}
.ctpl-avatar-sm { font-size: 9px; }

.ctpl-id-badge {
  display: inline-flex; align-items: center;
  font-family: ${MONO_FONT};
  font-size: 10px; padding: 1px 6px; border-radius: 4px;
  background: var(--kb-surface-2, #2A2238);
  color: var(--kb-muted, #B8B2CA);
  border: 1px solid var(--kb-border, #383343);
}

.ctpl-progress {
  display: flex; align-items: center; gap: 6px;
}
.ctpl-progress-track {
  flex: 1 1 auto; height: 4px; border-radius: 999px;
  background: var(--kb-surface-3, #342348);
  overflow: hidden;
}
.ctpl-progress-fill {
  height: 100%; border-radius: 999px;
  background: var(--kb-accent, #D9FF66);
  transition: width 200ms ease;
}
.ctpl-progress-label {
  font-family: ${MONO_FONT};
  font-size: 10px; color: var(--kb-muted, #B8B2CA);
  flex: 0 0 auto;
}

.ctpl-divider {
  height: 1px; margin: 2px 0;
  background: var(--kb-border, #383343);
}

.ctpl-footer {
  display: flex; align-items: center; justify-content: space-between;
  gap: 6px; margin-top: 2px;
}
`;
  document.head.appendChild(style);
}

/** Register all built-in slot renderers and inject the scoped stylesheet. */
export function registerBuiltinRenderers(): void {
  injectStyles();
  defineRenderers({
    "priority-row": priorityRowRenderer,
    "title": titleRenderer,
    "description": descriptionRenderer,
    "label-chips": labelChipsRenderer,
    "assignee-avatar": assigneeAvatarRenderer,
    "assignee-row": assigneeRowRenderer,
    "meta-line": metaLineRenderer,
    "id-badge": idBadgeRenderer,
    "progress-bar": progressBarRenderer,
    "severity-row": severityRowRenderer,
    "divider": dividerRenderer,
    "footer": footerRenderer,
  });
}
