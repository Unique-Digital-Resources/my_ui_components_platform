# SKILL.md — Workshop Component Library

This file is the **usage router** for the Workshop component library. It tells
you (an AI agent or a human developer) which component to reach for and links
to per-component usage docs.

For contribution / internals / debugging, see [AGENT.md](./AGENT.md) instead.

---

## 1. What This Library Is

Workshop is a **vanilla JavaScript UI component library** — every component is
a plain TypeScript class with no React, no framework, no runtime dependencies.
Drop a component into any HTML page, call `new Component(container, options)`,
subscribe to its events, and you're done.

The same components power a Next.js documentation site that lives in this
repository, but the components themselves are framework-agnostic and can be
used in any web project: plain HTML, Vue, Svelte, Lit, Angular, or React.

The library focuses on **application UI** — color pickers, sliders, toggle
groups, context menus, infinite canvas — the kind of controls you'd find
inside illustration, design, or developer tools.

---

## 2. Installation & Integration

### 2.1 With a bundler (recommended)

```bash
# from this repo — copy the src/lib/components/<name>/ folder into your project,
# or use a path alias. There is no published npm package yet.
```

```ts
import { ColorWheelPicker } from "@/lib/components/color-wheel";

const picker = new ColorWheelPicker(document.getElementById("picker")!, {
  shape: "triangle",
  size: 200,
  color: "#4287f5",
});

picker.on("change", (color) => {
  console.log(color.hex, color.rgb, color.hsv, color.hsl);
});
```

### 2.2 Plain HTML / CDN (no bundler)

```html
<div id="picker"></div>

<script type="module">
  // Path assumes you served the compiled component file. The class is the
  // default export of each component's index.ts; transpile to ESM first.
  import { ColorWheelPicker } from "./color-wheel/index.js";

  const picker = new ColorWheelPicker(document.getElementById("picker"), {
    shape: "triangle",
    color: "#4287f5",
  });

  picker.on("change", (color) => {
    document.body.style.background = color.hex;
  });
</script>
```

### 2.3 With React

Each component has a thin React wrapper in `src/components/<name>/<name>-react.tsx`.
The wrapper owns the vanilla instance, forwards prop changes through the
imperative API, and forwards `input`/`change` events to callback props.

```tsx
"use client";
import { ColorWheelPickerReact } from "@/components/color-wheel/color-wheel-picker-react";

export function Demo() {
  const [color, setColor] = useState("#4287f5");
  return (
    <ColorWheelPickerReact
      shape="triangle"
      color={color}
      onChange={(c) => setColor(c.hex)}
    />
  );
}
```

### 2.4 Universal rules

- Each component injects its own scoped `<style>` once per document. You do
  not need to import any CSS.
- Visual customization is via `--<component>-*` CSS custom properties (see
  each component's SKILL.md for the full list).
- Always call `destroy()` when removing a component from the DOM, especially
  in React `useEffect` cleanups, to release pointer capture and disconnect
  observers.
- Components use PointerEvent and `setPointerCapture`, so dragging works
  outside the element bounds. Multi-touch is supported where it makes sense.
- All components are keyboard accessible. Tab to focus, then arrow keys.

---

## 3. Component Inventory

Organized by the same category slugs used in
`src/lib/platform/content.ts`. 27 vanilla components total.

### Color

| Component       | One-line description                                                | SKILL.md                                                                  |
|-----------------|---------------------------------------------------------------------|---------------------------------------------------------------------------|
| Color Wheel     | Hue wheel + inner HSV triangle/square/disk shape selector.          | [color-wheel/SKILL.md](./src/lib/components/color-wheel/SKILL.md)         |
| Color Range     | 1D color slider: hue / lightness / contrast / alpha.                | [color-range/SKILL.md](./src/lib/components/color-range/SKILL.md)         |
| Color Circle    | Adobe Color-style harmony wheel with multiple markers.              | [color-circle/SKILL.md](./src/lib/components/color-circle/SKILL.md)       |
| Color Ramp      | Multi-stop gradient bar with draggable stops.                       | [color-ramp/SKILL.md](./src/lib/components/color-ramp/SKILL.md)           |

### Inputs

| Component          | One-line description                                                | SKILL.md                                                                        |
|--------------------|---------------------------------------------------------------------|---------------------------------------------------------------------------------|
| Periodic Range     | Dual-thumb range slider with snapping and tick marks.               | [periodic-range/SKILL.md](./src/lib/components/periodic-range/SKILL.md)         |
| Calendar           | Month calendar with date/range selection and navigation.           | [calendar/SKILL.md](./src/lib/components/calendar/SKILL.md)                     |
| Custom Button      | Configurable button with variants, sizes, icons, and states.        | [custom-button/SKILL.md](./src/lib/components/custom-button/SKILL.md)           |
| Toggle Group       | Multi/single-select button group with closable + reorderable items. | [toggle-group/SKILL.md](./src/lib/components/toggle-group/SKILL.md)             |
| Rich Text Editor   | Markdown-style contenteditable editor with extensible component registry. | [rich-text-editor/SKILL.md](./src/lib/components/rich-text-editor/SKILL.md) |

### Layout

| Component           | One-line description                                              | SKILL.md                                                                          |
|---------------------|-------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| Smart Context Menu  | Container-bounded context menu that renders command items.        | [smart-context-menu/SKILL.md](./src/lib/components/smart-context-menu/SKILL.md)   |
| Smart Tooltip       | Container-bounded tooltip for commands with smart positioning.   | [smart-tooltip/SKILL.md](./src/lib/components/smart-tooltip/SKILL.md)             |
| Board               | Infinite pan/zoom canvas with items, selection, align, distribute. | [board/SKILL.md](./src/lib/components/board/SKILL.md)                           |
| Nodes Graph         | Node-and-edge graph canvas with ports and connections.            | [nodes-graph/SKILL.md](./src/lib/components/nodes-graph/SKILL.md)                 |
| Collapse            | Accordion/collapse panel with animated open/close and accordion mode. | [collapse/SKILL.md](./src/lib/components/collapse/SKILL.md)                   |
| Carousel            | Slide carousel with arrows, dots, autoplay, and loop.             | [carousel/SKILL.md](./src/lib/components/carousel/SKILL.md)                       |
| Scroll Layout       | Scroll-region wrapper with orientation, scrollbar mode, and shadows. | [scroll-layout/SKILL.md](./src/lib/components/scroll-layout/SKILL.md)         |
| Drawer              | Slide-in panel covering one viewport edge with optional overlay.  | [drawer/SKILL.md](./src/lib/components/drawer/SKILL.md)                           |
| Marquee             | Infinite-scrolling ticker, four directions, pause on hover.       | [marquee/SKILL.md](./src/lib/components/marquee/SKILL.md)                         |
| Connection Path     | SVG overlay drawing bezier/step/straight/rounded paths between endpoints. | [connection-path/SKILL.md](./src/lib/components/connection-path/SKILL.md) |

### Data Display

| Component     | One-line description                                                  | SKILL.md                                                              |
|---------------|-----------------------------------------------------------------------|-----------------------------------------------------------------------|
| Avatar        | Avatar renderer: image / initials / color, with status dot and grouping. | [avatar/SKILL.md](./src/lib/components/avatar/SKILL.md)           |
| Badge         | Pill badge with six variants, optional dot, and removable close button. | [badge/SKILL.md](./src/lib/components/badge/SKILL.md)             |
| Timeline      | Presentational vertical timeline with left/right/alternate spine.     | [timeline/SKILL.md](./src/lib/components/timeline/SKILL.md)           |
| Table Editor  | Spreadsheet-style table with selection, editing, sorting, and reorder. | [table-editor/SKILL.md](./src/lib/components/table-editor/SKILL.md) |

### Productivity

| Component              | One-line description                                                  | SKILL.md                                                                          |
|------------------------|-----------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| Kanban                 | Draggable column-and-card board for workflow management.              | [kanban/SKILL.md](./src/lib/components/kanban/SKILL.md)                           |
| Gantt                  | Gantt chart with task bars, dependencies, and a time axis.            | [gantt/SKILL.md](./src/lib/components/gantt/SKILL.md)                             |
| Animation Track Editor | Timeline animation editor with keyframe + clip tracks and playback.   | [animation-track-editor/SKILL.md](./src/lib/components/animation-track-editor/SKILL.md) |

### Navigation

| Component  | One-line description                                          | SKILL.md                                                          |
|------------|---------------------------------------------------------------|-------------------------------------------------------------------|
| Breadcrumb | Breadcrumb trail with separators and current-page indicator.  | [breadcrumb/SKILL.md](./src/lib/components/breadcrumb/SKILL.md)   |

> **`socket-nodes-graph`** — a React-only wrapper around `nodes-graph` that
> adds socket.io real-time sync. Registered in `content.ts` under `layout`
> but has no vanilla core; documented in the worklog.

---

## 4. Commands System

A cross-cutting **command registry** lets any component declare named actions
with labels, icons, keyboard shortcuts, and categories. `SmartContextMenu`
and `SmartTooltip` render commands directly — you don't pass them item arrays,
you pass them command IDs and they look up the metadata themselves.

A `ShortcutHandler` listens at the window level and dispatches keyboard
shortcuts to registered callbacks.

Full reference: [commands/SKILL.md](./src/lib/commands/SKILL.md).

---

## 5. Platform Metadata

`src/lib/platform/content.ts` is the single source of truth for component
metadata (slug, name, category, description, properties/methods/events
tables, defaults, when-to-use guidance). The directory, search palette,
sidebar, and API reference view all consume it. If you're rendering a
component page on the platform, read this file. See
[platform/SKILL.md](./src/lib/platform/SKILL.md).

---

## 6. Design System Summary

- **Obsidian** `#101014` — primary background.
- **Deep Violet** `#211A30` — secondary surface.
- **Lemon Signal** `#D9FF66` — accent / interactive highlight.
- **Soft Lavender** — secondary accent (used sparingly).
- Dark theme by default. Light theme supported via `next-themes`.
- Fonts: Inter (UI), JetBrains Mono (code, mono labels).
- Each component injects its own scoped `<style>` with `--<component>-*`
  custom properties for theming (marker borders, focus rings, etc.).
- **No indigo or blue** as accent colors — these are forbidden in the
  platform chrome. The components themselves accept arbitrary colors as
  values (the Color Wheel can output any hue), but their own UI chrome
  uses the lemon accent.

---

## 7. Choosing a Component

| You need to…                                    | Use                                                      |
|-------------------------------------------------|----------------------------------------------------------|
| Pick a single color (hue + saturation/value)    | Color Wheel                                              |
| Adjust one color dimension (hue/light/alpha)    | Color Range                                              |
| Build a palette from a harmony rule             | Color Circle                                             |
| Edit a gradient with multiple stops             | Color Ramp                                               |
| Pick a numeric range (min/max)                  | Periodic Range                                           |
| Pick a date, date range, or navigate months     | Calendar                                                 |
| Show a button with icon + text + variants       | Custom Button                                            |
| Group toggle buttons (segmented control)        | Toggle Group                                             |
| Edit rich text with markdown-style components   | Rich Text Editor                                         |
| Show a context menu bound to a container        | Smart Context Menu                                       |
| Show a tooltip for a command                    | Smart Tooltip                                            |
| Build a node-graph / whiteboard / vector canvas | Board                                                    |
| Build a node-graph with ports and connections   | Nodes Graph                                              |
| Collapse/expand grouped content (accordion)     | Collapse                                                 |
| Rotate through slides with arrows/dots/autoplay | Carousel                                                 |
| Wrap content in a styled scroll region          | Scroll Layout                                            |
| Slide a panel in from a viewport edge           | Drawer                                                   |
| Show an infinite scrolling ticker               | Marquee                                                  |
| Draw SVG paths between DOM elements or points   | Connection Path                                          |
| Render an avatar (image / initials / color)     | Avatar                                                   |
| Show a status/category pill badge               | Badge                                                    |
| Render a vertical timeline of dated entries     | Timeline                                                 |
| Edit tabular data with sorting and reordering   | Table Editor                                             |
| Manage workflow as columns of draggable cards  | Kanban                                                   |
| Show a Gantt chart of tasks over time           | Gantt                                                    |
| Edit animation keyframes and clips on a timeline | Animation Track Editor                                  |
| Show a breadcrumb trail                         | Breadcrumb                                               |

For deeper guidance (when-to-use, when-not-to-use, alternatives), each
component's SKILL.md has an "Integration notes" section.

---

## 8. Quick Reference — Universal API shape

Every component follows the same API surface:

```ts
const instance = new Component(container: HTMLElement, options?: ComponentOptions);

// Getters
instance.getValue(): T;
instance.getOutput(): OutputShape;

// Setters — fire `input` + `change` for value setters; only re-render for
// geometry/visual setters that don't change the value.
instance.setValue(v: T): void;
instance.setShape(shape): void;
instance.setSize(n): void;

// Events
instance.on("input" | "change" | ..., handler): void;
instance.off(event, handler): void;

// Teardown — idempotent, safe to call multiple times.
instance.destroy(): void;
```

See each component's SKILL.md for its specific options, methods, events,
and code examples.
