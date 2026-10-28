# AGENT.md — Connection Path

A standalone SVG connection-curve overlay. Draws bezier/step/straight/rounded paths between fixed points or DOM elements.

## Architecture
- `connection-path.ts` — `ConnectionPath` class. SVG overlay (absolute, fills container). Each connection is a `<path>` with an invisible hit-area `<path>` (16px stroke) for easy clicking.
- Endpoints: `{ type: "point", x, y, side }` or `{ type: "element", element, side, offset }`. Element endpoints are tracked via ResizeObserver — paths follow the element as it moves/resizes.
- Path shapes: bezier (side-aware control points), step (orthogonal), straight, rounded.
- Arrows: SVG `<marker>` definitions in `<defs>`. Configurable per-connection or globally.
- Animation: CSS `stroke-dashoffset` keyframe for dash-flow effect.
- Labels: `<text>` + `<rect>` background at the midpoint.
- Events: path_click, path_hover, connection_added, connection_removed.
- Auto-redraw: window resize + container ResizeObserver + tracked element ResizeObserver.
