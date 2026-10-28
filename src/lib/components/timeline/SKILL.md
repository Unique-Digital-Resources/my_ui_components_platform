# SKILL.md — Timeline

A vanilla JavaScript vertical timeline component. Renders a list of dated
entries along a left, right, or alternating center spine. Each entry shows
a marker dot, an optional date, a title, and an optional description.
Layout is pure DOM with scoped CSS; no canvas, no event bus. Framework-
independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  Timeline,
  type TimelineEntry,
  type TimelineOptions,
  type TimelineSide,
} from "@/lib/components/timeline";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const timeline = new Timeline(document.getElementById("host")!, {
  side: "left",
  showDates: true,
  entries: [
    { id: "e1", title: "Project kickoff", date: "2024-01-15", description: "Met the team." },
    { id: "e2", title: "MVP shipped", date: "2024-03-02", description: "First release." },
    { id: "e3", title: "Public launch", date: "2024-05-20" },
  ],
});

// later
timeline.destroy();
```

---

## Constructor

```ts
new Timeline(container: HTMLElement, options?: TimelineOptions)
```

The container's existing children are replaced on construction and on every
state change. The container does not need a fixed height — the timeline
grows with its content.

### Options

| Option       | Type                                  | Default | Description                                                       |
|--------------|---------------------------------------|---------|-------------------------------------------------------------------|
| `entries`    | `TimelineEntry[]`                     | `[]`    | Initial entries. Rendered in array order.                         |
| `side`       | `"left" \| "right" \| "alternate"`    | `"left"`| Which side the spine line sits on; alternates per entry if `"alternate"`. |
| `showDates`  | `boolean`                             | `true`  | Render the `date` field above the title when set.                 |
| `showIcons`  | `boolean`                             | `false` | Declared but not currently implemented (see AGENT.md Known Issues). |

### Entry shape

```ts
interface TimelineEntry {
  id: string;            // unique; rendered as data-entry-id
  title: string;         // always rendered
  description?: string;  // rendered below the title if set
  date?: string;         // free-form string; rendered above the title if showDates
  color?: string;        // overrides the marker dot color (any CSS color)
  icon?: string;         // declared but not currently rendered
}
```

---

## Methods

| Method                          | Returns | Description                                                       |
|---------------------------------|---------|-------------------------------------------------------------------|
| `setEntries(entries)`           | `void`  | Replace all entries. Triggers a full re-render.                   |
| `setProperty(name, value)`      | `void`  | Update a single option at runtime. Supported `name`s: `"side"`, `"showDates"`, `"showIcons"`, `"entries"`. Triggers a re-render. |
| `destroy()`                     | `void`  | Tear down. Idempotent. Clears the container's innerHTML.          |

The Timeline does not expose `on()` / `off()` — it is a presentational
component. To detect clicks on entries, attach a delegated listener to
the container and read `data-entry-id` from the closest `.tl-entry`:

```ts
container.addEventListener("click", (e) => {
  const entryEl = (e.target as HTMLElement).closest("[data-entry-id]");
  if (entryEl) {
    const id = entryEl.getAttribute("data-entry-id");
    console.log("clicked", id);
  }
});
```

---

## Events

This component does not emit events. See the snippet above for click
handling.

---

## CSS Custom Properties

All variables are declared on `.tl-root` and cascade to children. Override
on any ancestor (or directly on the host element after construction) to
retheme.

| Variable        | Default     | Description                                            |
|-----------------|-------------|--------------------------------------------------------|
| `--tl-text`     | `#F4F1FF`   | Primary text color (titles).                           |
| `--tl-muted`    | `#B8B2CA`   | Muted text color (descriptions).                       |
| `--tl-accent`   | `#D9FF66`   | Lemon Signal — marker dot and date label color.        |
| `--tl-border`   | `#383343`   | Card border and the timeline spine line.               |
| `--tl-surface`  | `#211A30`   | Deep Violet — card background.                         |

The component also reads `--font-mono` for the date label (falls back to
`ui-monospace, monospace`).

---

## Examples

### Left-side timeline with custom marker colors

```ts
const timeline = new Timeline(host, {
  side: "left",
  entries: [
    { id: "1", title: "Planned", date: "Mon", color: "#B8B2CA" },
    { id: "2", title: "In progress", date: "Tue", color: "#D9FF66" },
    { id: "3", title: "Done", date: "Wed", color: "#7CFFB2" },
  ],
});
```

### Alternating center timeline

```ts
const timeline = new Timeline(host, {
  side: "alternate",
  showDates: true,
  entries: [
    { id: "1", title: "Q1", description: "Research" },
    { id: "2", title: "Q2", description: "Design" },
    { id: "3", title: "Q3", description: "Build" },
    { id: "4", title: "Q4", description: "Launch" },
  ],
});
```

### Update entries at runtime

```ts
timeline.setEntries([
  { id: "1", title: "Updated", date: "2024-06-01" },
]);
// or via setProperty
timeline.setProperty("entries", [{ id: "1", title: "Updated", date: "2024-06-01" }]);
```

### Flip layout at runtime

```ts
timeline.setProperty("side", "right");
timeline.setProperty("showDates", false);
```

### Click delegation for entry selection

```ts
host.addEventListener("click", (e) => {
  const entryEl = (e.target as HTMLElement).closest(".tl-entry");
  if (!entryEl) return;
  const id = entryEl.getAttribute("data-entry-id");
  onSelect(id);
});
```

### Retheme via CSS variables

```css
.my-timeline-host {
  --tl-accent: #FF6B9D;   /* pink markers */
  --tl-surface: #1A1A24;  /* darker cards */
}
```

```ts
const timeline = new Timeline(hostEl, { entries });
// hostEl has class "my-timeline-host"
```

---

## Integration Notes

**When to use:** Presenting a chronological or step-by-step sequence of
labeled events with optional dates and descriptions. Works well for
activity feeds, release notes, changelogs, onboarding flows, and project
milestones.

**When not to use:** When you need interactive entries (drag, inline
editing, expand/collapse), bidirectional dependencies between entries,
or a horizontal layout. The Timeline is presentational only.

**Alternatives:**
- For a horizontal time axis with draggable bars, see the
  [Gantt Timeline](../gantt/SKILL.md).
- For a vertical list with rich interactions (reorder, close, multi-select),
  see the [Toggle Group](../toggle-group/SKILL.md).
- For rendering arbitrary document content (headings, lists, code), see the
  [Rich Text Editor](../rich-text-editor/SKILL.md).

**Container sizing:** The Timeline has no explicit height — it grows with
its entries. Place it inside a scrollable parent if the list is long. For
a scroll container with shadow indicators, see
[Scroll Layout](../scroll-layout/SKILL.md).

**Accessibility:** Each entry is a plain `<div>` with `data-entry-id`. The
component does not apply ARIA roles; if you need a navigable feed, wrap
entries with `role="feed"` and `aria-label` yourself, or extend the
component. Markers are decorative and have no alt text.

**Retheming:** All colors come from `--tl-*` CSS variables. Override on
the host element or any ancestor. Per-entry `color` only affects the
marker dot, not the card.
