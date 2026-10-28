# Component Tree — Dependency & Reuse Map

This document tracks how components inherit from and reuse each other.
The **Custom Button** is the foundational interactive element, reused as
thumbs, cells, and handles across the component library.

## Tree Diagram

```
CustomButton (foundational interactive element)
├── Color Wheel Picker
│   └── [thumb] hue marker on the wheel ring
│   └── [thumb] inner shape marker (S/V position)
├── Color Range
│   └── [thumb] single draggable capsule on the track
├── Color Ramp
│   └── [thumb] one per gradient stop (draggable, click-to-add)
├── Color Circle
│   └── [thumb] one per harmony color marker (draggable, lockable)
├── Periodic Range
│   └── [thumb] min thumb (draggable)
│   └── [thumb] max thumb (draggable)
├── Calendar
│   └── [cell] day cells (42 in the 6×7 grid)
│   └── [cell] month cells (in month view)
│   └── [cell] week cells (in week view)
├── Toggle Group
│   └── [cell] toggle buttons within the group
├── Table Editor
│   └── [cell] used for interactive cell rendering (optional)
├── Carousel
│   └── [button] navigation arrows + dots
├── Breadcrumb
│   └── [button] item triggers + overflow button
├── Drawer
│   └── [button] close button in header
├── Kanban Board
│   └── [button] move buttons + add-item buttons
└── Gantt Timeline
    └── [button] resize handles (optional)

NodesGraph (foundation — infinite canvas)
├── SocketNodesGraph (extends NodesGraph)
│   └── [reuses] pan/zoom, node drag, selection, SVG connections
└── ConnectionPath (standalone SVG overlay)
    └── [used by] NodesGraph + SocketNodesGraph for connection rendering

Content Templates (platform-level registry)
├── Kanban Board (card content via templates)
├── Gantt Timeline (bar content via templates)
└── SocketNodesGraph (control rendering via templates)

Commands (platform-level registry)
├── Smart Context Menu (renders commands)
├── Smart Tooltip (renders command shortcuts)
├── Board (keyboard shortcuts)
├── Color Wheel (keyboard shortcuts)
├── Color Range (keyboard shortcuts)
└── Color Circle (keyboard shortcuts)
```

## Reuse Details

### CustomButton as Thumbs (Canvas Components)

The following canvas-based components use CustomButton instances as DOM
overlays positioned on top of the canvas at thumb locations. The canvas
renders the track/gradient; the CustomButton renders the interactive thumb.

| Component | Thumb Count | Thumb Role | CustomButton Variant |
|-----------|-------------|------------|---------------------|
| Color Range | 1 | Value indicator | `thumb` (color-filled) |
| Color Ramp | N (per stop) | Gradient stop handle | `thumb` (color-filled) |
| Color Circle | N (per harmony) | Harmony color marker | `thumb` (color-filled, circular) |
| Color Wheel Picker | 2 | Hue + inner S/V marker | `thumb` (color-filled, circular) |
| Periodic Range | 2 | Min + max range handles | `thumb` (compact, accent) |

### CustomButton as Cells (DOM Components)

| Component | Cell Count | Cell Role | CustomButton Variant |
|-----------|------------|-----------|---------------------|
| Calendar | 42 | Day cells in 6×7 grid | `cell` (text, state classes) |
| Toggle Group | N | Toggle buttons | `ghost` / `primary` (toggled) |

### CustomButton Thumb Mode

When used as a thumb, CustomButton receives these host-specific defaults:

| Property | Default for Thumb | Original Default |
|----------|-------------------|------------------|
| `variant` | `"ghost"` | `"primary"` |
| `size` | `"sm"` | `"md"` |
| `text` | `""` (empty) | `""` |
| `fullWidth` | `false` | `false` |
| `disabled` | `false` | `false` |
| `width` | `14` (px, thumb-specific) | (auto) |
| `height` | `14` (px, thumb-specific) | (auto) |
| `color` | (set by host) | (none) |
| `draggable` | `true` (thumb-specific) | `false` |

### Inheritance Chain

```
BaseDOMComponent (implicit pattern)
└── CustomButton
    ├── [thumb mode] → used by Color Range, Ramp, Circle, Wheel, Periodic Range
    └── [cell mode] → used by Calendar

BaseCanvasComponent (implicit pattern)
└── NodesGraph
    └── SocketNodesGraph

PlatformRegistry (singleton)
├── CommandRegistry → SmartContextMenu, SmartTooltip, Board, Color components
├── TemplateRegistry → Kanban, Gantt
└── RTEComponentRegistry → RichTextEditor
```

## How to Add a New Reuse

1. Import `CustomButton` from `@/lib/components/custom-button`.
2. Create instances with `new CustomButton(container, { variant: "thumb", ... })`.
3. Position them absolutely within the host component's container.
4. Update positions on every render/drag cycle.
5. In the host's playground, add a collapsible section showing the
   CustomButton properties with host-specific defaults.
