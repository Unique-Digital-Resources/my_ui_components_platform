# SKILL.md — Connection Path

A standalone SVG connection-curve overlay for drawing paths between points or DOM elements.

## Quick Start
```ts
import { ConnectionPath } from "@workshop/connection-path";
const overlay = new ConnectionPath(container, {
  shape: "bezier", arrow: "end", curvature: 0.4,
  connections: [
    { id: "c1", from: { type: "point", x: 60, y: 80, side: "right" }, to: { type: "point", x: 300, y: 60, side: "left" }, stroke: "#D9FF66", label: "data" },
    // Or track DOM elements:
    // { id: "c2", from: { type: "element", element: "#node-a", side: "right" }, to: { type: "element", element: "#node-b", side: "left" } },
  ],
});
overlay.on("path_click", ({ connectionId }) => console.log("Clicked:", connectionId));
```

## Path shapes: bezier, step, straight, rounded.
## Arrows: none, start, end, both.
## Endpoints: point ({ x, y, side }) or element (tracks DOM via ResizeObserver).
