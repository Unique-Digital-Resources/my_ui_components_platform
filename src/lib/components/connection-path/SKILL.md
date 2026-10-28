# SKILL.md — ConnectionPath

A vanilla JavaScript SVG overlay that draws bezier / step / straight /
rounded paths between two endpoints. Each endpoint is either a fixed
point or a DOM element (tracked via `ResizeObserver`, so the path
follows the element as it moves or resizes). Per-path stroke, dash,
opacity, arrowheads, midpoint labels, and animated dash-flow. Click and
hover events per path. Multiple paths in one overlay. Auto-redraws on
window, container, and element resize. Framework-independent.

The module also exports four standalone path-computation functions
(`bezierPath`, `stepPath`, `straightPath`, `roundedPath`) for use
without the component.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  ConnectionPath,
  bezierPath,
  stepPath,
  straightPath,
  roundedPath,
  type ConnectionPathOptions,
  type ConnectionDef,
  type Endpoint,
  type PointEndpoint,
  type ElementEndpoint,
  type PathShape,
  type ConnectionSide,
  type ArrowPosition,
  type ConnectionPathEventPayload,
  type ConnectionPathHandler,
} from "@/lib/components/connection-path";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const overlay = new ConnectionPath(document.getElementById("canvas-host")!, {
  stroke: "#D9FF66",
  arrow: "end",
  arrowSize: 10,
  connections: [
    {
      id: "a-to-b",
      from: { type: "element", element: "#node-a", side: "right" },
      to: { type: "element", element: "#node-b", side: "left" },
      label: "link",
      animated: true,
    },
  ],
});

overlay.on("path_click", ({ connectionId }) => selectConnection(connectionId));
overlay.on("path_hover", ({ connectionId }) => highlightConnection(connectionId));

// later
overlay.destroy();
```

The container should be `position: relative` (the overlay is
`position: absolute; inset: 0`).

---

## Constructor

```ts
new ConnectionPath(container: HTMLElement, options?: ConnectionPathOptions)
```

### Options

| Option         | Type                          | Default     | Description                                                       |
|----------------|-------------------------------|-------------|-------------------------------------------------------------------|
| `connections`  | `ConnectionDef[]`             | `[]`        | Initial connections.                                              |
| `stroke`       | `string`                      | `"#6B5FA8"` | Default stroke color (used when a connection omits `stroke`).     |
| `strokeWidth`  | `number`                      | `2`         | Default stroke width.                                             |
| `shape`        | `PathShape`                   | `"bezier"`  | Default path shape.                                               |
| `arrow`        | `ArrowPosition`               | `"none"`    | Default arrowhead position.                                       |
| `arrowSize`    | `number`                      | `10`        | Default arrowhead size (px).                                      |
| `curvature`    | `number`                      | `0.4`       | Default curvature (0-1) for bezier control-point offset.          |
| `interactive`  | `boolean`                     | `true`      | Whether paths receive pointer events (click / hover).             |

### Connection shape

```ts
interface ConnectionDef {
  id: string;                              // unique within the overlay
  from: Endpoint;                          // required
  to: Endpoint;                            // required
  shape?: PathShape;                       // overrides options.shape
  stroke?: string;                         // overrides options.stroke
  strokeWidth?: number;                    // overrides options.strokeWidth
  strokeDasharray?: string;                // e.g. "6 4"
  opacity?: number;                        // default 1
  arrow?: ArrowPosition;                   // overrides options.arrow
  arrowSize?: number;                      // overrides options.arrowSize
  label?: string;                          // text at the midpoint
  animated?: boolean;                      // dash-flow animation
  animationSpeed?: number;                 // px/s; default 50
  curvature?: number;                      // overrides options.curvature (0-1)
}
```

### Endpoint types

```ts
type PathShape       = "bezier" | "step" | "straight" | "rounded";
type ConnectionSide  = "top" | "bottom" | "left" | "right";
type ArrowPosition   = "none" | "start" | "end" | "both";

interface PointEndpoint {
  type: "point";
  x: number; y: number;
  side?: ConnectionSide;     // default "right"
}

interface ElementEndpoint {
  type: "element";
  element: HTMLElement | string;  // ref or CSS selector (resolved against container)
  side?: ConnectionSide;          // default "right"
  offset?: number;                // px from the side center; default 0
}

type Endpoint = PointEndpoint | ElementEndpoint;
```

For `ElementEndpoint`, the connection point is the center of the chosen
side of the element's bounding box (in container-local coordinates),
offset inward by `offset` pixels. The element is observed by a
`ResizeObserver`, so the path re-renders when the element resizes.

---

## Methods

| Method                                  | Returns              | Description                                                          |
|-----------------------------------------|----------------------|----------------------------------------------------------------------|
| `redraw()`                              | `void`               | Force a full re-render of all paths. Called automatically on resize. |
| `addConnection(conn)`                   | `void`               | Append a connection. Silently ignored if `conn.id` already exists. Emits `connection_added`. |
| `removeConnection(id)`                  | `void`               | Remove a connection by ID. Emits `connection_removed`.               |
| `updateConnection(id, changes)`         | `void`               | Merge `Partial<ConnectionDef>` into an existing connection.          |
| `setConnections(conns)`                 | `void`               | Replace all connections.                                             |
| `getConnections()`                      | `ConnectionDef[]`    | All connections (clones).                                            |
| `setProperty(name, value)`              | `void`               | Update `stroke`, `strokeWidth`, `shape`, `arrow`, `arrowSize`, `curvature`, `interactive`, or `connections`. |
| `on(event, handler)`                    | `void`               | Subscribe.                                                           |
| `off(event, handler)`                   | `void`               | Unsubscribe.                                                         |
| `destroy()`                             | `void`               | Tear down. Idempotent.                                               |

### Standalone path functions

These are exported for use without instantiating the component. Each
returns an SVG path `d` string.

```ts
bezierPath(from, to, fromSide?, toSide?, curvature?): string   // default sides "right"/"left", curvature 0.4
stepPath(from, to, fromSide?, toSide?): string                  // default sides "right"/"left"
straightPath(from, to): string                                  // ignores sides
roundedPath(from, to, fromSide?, toSide?): string               // default sides "right"/"left"
```

`from` and `to` are `{ x: number; y: number }`.

---

## Events

| Event                | Payload                                              | When                                            |
|----------------------|------------------------------------------------------|-------------------------------------------------|
| `path_click`         | `{ type, connectionId, source: "pointer" }`          | User clicked a path's hit area (interactive only). |
| `path_hover`         | `{ type, connectionId, source: "pointer" }`          | Pointer entered a path's hit area (interactive only). |
| `connection_added`   | `{ type, connectionId, source: "programmatic" }`     | `addConnection` succeeded.                      |
| `connection_removed` | `{ type, connectionId, source: "programmatic" }`     | `removeConnection` succeeded.                   |

```ts
overlay.on("path_click", ({ connectionId }) => select(connectionId));
overlay.on("connection_removed", ({ connectionId }) => cleanup(connectionId));
```

`updateConnection` and `setConnections` do not emit events.

---

## CSS Custom Properties

Only two `--cp-*` variables are defined, both on `.cp-label-bg`:

| Variable      | Default   | Description                                  |
|---------------|-----------|----------------------------------------------|
| `--cp-bg`     | `#101014` | Label background fill (Obsidian).            |
| `--cp-border` | `#383343` | Label background stroke.                     |

`.cp-label` also reads `--font-mono` (with fallback `ui-monospace,
monospace`). All other colors come from the connection definition or
`options.stroke` (default `"#6B5FA8"`), not from CSS variables.

```css
#my-overlay-host { --cp-bg: #211A30; --cp-border: #4A4259; }
```

---

## Examples

### Element-to-element bezier with arrow

```ts
const overlay = new ConnectionPath(host, {
  arrow: "end",
  stroke: "#D9FF66",
  connections: [
    {
      id: "a-b",
      from: { type: "element", element: "#node-a", side: "right" },
      to:   { type: "element", element: "#node-b", side: "left" },
    },
  ],
});
```

### Point-to-point with label and dash-flow

```ts
const overlay = new ConnectionPath(host, {
  shape: "rounded",
  connections: [
    {
      id: "flow-1",
      from: { type: "point", x: 20, y: 50, side: "right" },
      to:   { type: "point", x: 300, y: 50, side: "left" },
      label: "data",
      animated: true,
      animationSpeed: 80,
      strokeDasharray: "8 4",
    },
  ],
});
```

### Dynamic add / remove / update

```ts
overlay.addConnection({ id: "c", from: { type: "point", x: 0, y: 0 }, to: { type: "point", x: 100, y: 100 } });
overlay.updateConnection("c", { stroke: "#FF6B6B", strokeWidth: 3 });
overlay.removeConnection("c");
```

### Interactive: select a connection on click

```ts
overlay.on("path_click", ({ connectionId }) => {
  selectedId = connectionId;
  // Highlight by re-styling:
  overlay.updateConnection(connectionId, { strokeWidth: 4, opacity: 1 });
});
```

### Standalone path functions (no component)

```ts
import { bezierPath, straightPath } from "@/lib/components/connection-path";

const d = bezierPath({ x: 0, y: 0 }, { x: 200, y: 0 }, "right", "left", 0.5);
// "M 0 0 C 40 0, 160 0, 200 0"

document.querySelector<SVGPathElement>("#my-path")!.setAttribute("d", d);
```

### React wrapper pattern

```tsx
"use client";
import { useEffect, useRef } from "react";
import { ConnectionPath } from "@/lib/components/connection-path";

export function Diagram({ connections }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const overlay = new ConnectionPath(ref.current, { connections, arrow: "end" });
    overlay.on("path_click", ({ connectionId }) => console.log(connectionId));
    return () => overlay.destroy();
  }, [connections]);
  return <div ref={ref} style={{ position: "relative", width: "100%", height: 400 }} />;
}
```

---

## Integration Notes

**When to use:** node-graph edges, flow diagrams, annotation overlays on
top of an existing layout, or any "connect these two things with a line"
UI. Especially good when the endpoints are real DOM elements that move
or resize — the `ResizeObserver` keeps the path attached automatically.

**When not to use:** high-density graphs (hundreds of simultaneous
paths) — the `defsEl.innerHTML +=` arrow-marker pattern is O(N²) in
`<defs>` parsing. For very dense graphs, render paths to a `<canvas>`
instead. Also avoid for connections that need full accessible labeling
— the overlay has no ARIA attributes and paths are not exposed to
assistive technology.

**Alternatives:**
- [Board](../board/SKILL.md) — full infinite-canvas editor with its own
  item model; use it if you need pan/zoom/selection rather than just
  decorative lines.
- Raw SVG with the standalone path functions — if you don't need
  resize-tracking or interactivity, just call `bezierPath` etc. and
  set the `d` attribute yourself.

**Container:** must be `position: relative` (or any non-static value).
The overlay is `position: absolute; inset: 0` and sizes to the
container. A `ResizeObserver` watches the container; on resize, all
paths are recomputed.

**Element endpoints:** when an `ElementEndpoint`'s element is removed
from the DOM, the path silently disappears (no event, no error). Re-add
the element or call `removeConnection` to clean up.

**Animation:** `animated: true` adds a CSS dash-flow animation. If you
supply your own `strokeDasharray`, make sure it has visible gaps,
otherwise the flow will be invisible. `prefers-reduced-motion: reduce`
disables the animation automatically.

**Accessibility:** the SVG overlay has `pointer-events: none` when not
interactive, but no `role` or `aria-label`. For accessible diagrams,
add a separate textual description of the connections outside the
overlay.
