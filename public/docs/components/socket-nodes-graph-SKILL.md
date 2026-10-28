# SKILL.md — Socket Nodes Graph

A node graph with socket nodes: horizontal (left/right) connections, vertical rows with controls.

## Quick Start
```ts
import { SocketNodesGraph } from "@workshop/nodes-graph";
const graph = new SocketNodesGraph(container, {
  nodes: [{
    id: "n1", x: 40, y: 80, width: 240, title: "Input",
    data: { rows: [{ id: "r1", rightSocket: { id: "out", label: "Val" }, control: { type: "range", value: 50, min: 0, max: 100 } }] },
  }],
  connections: [],
});
graph.on("control_changed", ({ controlId, controlValue }) => console.log(controlId, controlValue));
```

## SocketRow
```ts
{ id: string, leftSocket?: SocketDef, rightSocket?: SocketDef, control?: ControlDef }
```

## ControlDef types
label, checkbox, toggle, dropdown, range, text, number.

## Events
control_changed, node_selected, node_moved, connection_added, connection_rejected (inherited).
