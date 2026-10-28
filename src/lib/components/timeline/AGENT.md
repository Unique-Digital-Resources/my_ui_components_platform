# AGENT.md — Timeline

Contribution guide for `src/lib/components/timeline/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**Timeline** — a vertical timeline component that renders a list of dated
entries along a left, right, or alternating center axis. Each entry shows a
marker dot, an optional date, a title, and an optional description. Surface
cards use the Deep Violet surface token; the marker uses Lemon Signal accent.
Pure DOM, no canvas, no event bus.

## File Structure

```
src/lib/components/timeline/
├── AGENT.md            <- this file
├── SKILL.md            <- usage docs
├── timeline.ts         <- the Timeline class (DOM + scoped CSS)
└── index.ts            <- barrel: class, types
```

## Architecture

The class builds a single `<div class="tl-root tl-side-<side>">` containing
a vertical `.tl-line` and one `.tl-entry` per entry. Each entry has:

1. A `.tl-marker` — a 12px circular dot positioned on the line. Its
   background defaults to `--tl-accent` (Lemon Signal) but can be overridden
   per-entry via `entry.color`.
2. A `.tl-content` card — Deep Violet surface (`--tl-surface`) with a
   1px border. Contains, in order:
   - `.tl-date` (optional, monospace, accent-colored) — only if
     `showDates` is true AND `entry.date` is set.
   - `.tl-title` (always) — entry title.
   - `.tl-desc` (optional) — entry description.

`render()` clears the container (`innerHTML = ""`) and rebuilds from
scratch on every state change. There is no diffing — the entry count is
expected to be small (tens to low hundreds). Each entry element carries
`data-entry-id` so external code can find specific entries.

### Layout sides

The `side` option (`"left" | "right" | "alternate"`) controls:

- The line position: `left: 16px`, `right: 16px`, or centered
  (`left: 50%; transform: translateX(-50%)`).
- Each entry's padding / flex direction:
  - `left` — content on the right of the line.
  - `right` — content on the left (flex-direction: row-reverse).
  - `alternate` — odd entries on the right, even on the left
    (uses `:nth-child(odd)` / `:nth-child(even)`).

### Public API surface

```ts
class Timeline {
  constructor(container: HTMLElement, options?: TimelineOptions);

  setEntries(entries: TimelineEntry[]): void;
  setProperty(name: string, value: unknown): void;
  destroy(): void;
}

interface TimelineEntry {
  id: string;
  title: string;
  description?: string;
  date?: string;
  color?: string;
  icon?: string;          // declared but not currently rendered (see Known Issues)
}

interface TimelineOptions {
  entries?: TimelineEntry[];
  side?: TimelineSide;        // "left" | "right" | "alternate"
  showDates?: boolean;
  showIcons?: boolean;        // declared but not currently wired (see Known Issues)
}

type TimelineSide = "left" | "right" | "alternate";
```

### Internal state

- `container: HTMLElement` — the host element; innerHTML is replaced on render.
- `root: HTMLElement` — the `.tl-root` div.
- `opts: Required<TimelineOptions>` — resolved options with defaults:
  `entries: []`, `side: "left"`, `showDates: true`, `showIcons: false`.
- `entries: TimelineEntry[]` — shallow-cloned copies of the provided entries.
  Mutating the originals after construction does NOT affect the rendered
  timeline; call `setEntries()` to update.
- `_destroyed: boolean` — idempotency guard for `destroy()`.

### CSS custom properties

All are defined on `.tl-root` in `injectStyles()`:

| Variable         | Default     | Purpose                                                |
|------------------|-------------|--------------------------------------------------------|
| `--tl-text`      | `#F4F1FF`   | Primary text color (titles).                           |
| `--tl-muted`     | `#B8B2CA`   | Muted text color (descriptions).                       |
| `--tl-accent`    | `#D9FF66`   | Lemon Signal — marker dot and date label color.        |
| `--tl-border`    | `#383343`   | Card border and the timeline spine line.               |
| `--tl-surface`   | `#211A30`   | Deep Violet — card background.                         |

The component also reads an external `--font-mono` CSS variable for the
date label; it falls back to `ui-monospace, monospace` if unset.

## Coding Conventions

- TypeScript strict, named exports (class + types).
- `injectStyles()` is idempotent — guarded by
  `document.getElementById(STYLE_ID)`. No-op if the `<style>` already exists.
- `destroy()` is idempotent — guarded by a `_destroyed` flag; clears the
  container's innerHTML. No listeners to remove (this component does not
  attach any).
- `render()` is the single source of truth for DOM. All public mutators
  (`setEntries`, `setProperty`) call `render()` after updating state.
- No event bus / no `on()` / `off()` — the Timeline is a presentational
  component. To react to clicks on entries, attach your own listener to
  the container and use `event.target.closest("[data-entry-id]")`.
- No React/framework imports in this folder.
- No emojis.

## Known Issues

- **`showIcons` option is not implemented.** The option is declared on
  `TimelineOptions` and parsed in the constructor (default `false`), and
  `entry.icon` is declared on `TimelineEntry`, but `renderEntry()` never
  reads either. Setting `showIcons: true` or `entry.icon` has no effect.
  This is a stub awaiting implementation.
- **Full re-render on every state change.** `render()` clears and rebuilds
  the entire DOM. For very long timelines (hundreds of entries) called
  frequently, this is O(n) per update. Not a problem for typical usage.
- **No virtualization.** All entries are in the DOM simultaneously. For
  very long timelines (1000+ entries), consider a windowing layer.
- **Date is a free-form string.** The component does not parse or validate
  the `date` field — it is rendered as-is in monospace. Sorting by date is
  the host's responsibility (entries render in the order provided).

## Debugging Tips

- If the timeline is not visible, check that the container has a height.
  The `.tl-root` has `width: 100%` but no explicit height; it grows with
  content. A zero-height container with `overflow: hidden` will hide it.
- To find a specific entry in DevTools, search for
  `[data-entry-id="your-id"]` in the Elements panel.
- To retheme without editing source, override the `--tl-*` variables on
  any ancestor of the container (e.g. `--tl-accent: #FF6B9D` for a pink
  marker). Variables cascade because they are declared on `.tl-root` but
  can be overridden on `.tl-root` via a more specific selector or directly
  on the host element before construction.
- The marker color is overridden per-entry via inline
  `style.background = entry.color`. If a custom `color` looks wrong, check
  that it is a valid CSS color string (the component does not validate).
- `setProperty("side", "alternate")` is the fastest way to flip layout at
  runtime; it triggers a full re-render.
