# SKILL.md — Nodes Graph

An infinite-canvas node graph (mindmap) with DOM-based rendering, pan/zoom, drag-to-connect, and keyboard navigation.

## Quick Start
```ts
import { NodesGraph } from "@workshop/nodes-graph";
const graph = new NodesGraph(container, {
  nodes: [{ id: "n1", x: 80, y: 120, width: 180, height: 80, title: "Idea" }],
  connections: [],
});
graph.on("node_moved", ({ nodeId }) => console.log("Moved:", nodeId));
```

## Options
nodes, connections, zoom, panX, panY, showGrid, gridSize, selectable, movable, connectable, readOnly, disabled.

## Methods
addNode, removeNode, addConnection, removeConnection, selectNode, selectConnection, clearSelection, setZoom, zoomBy, fitToView, setNodes, setConnections, getNodes, getConnections, setProperty, on, off, destroy.

## Events
node_selected, node_added, node_removed, node_moved, connection_added, connection_removed, connection_rejected, zoom_changed.

## Connection sides
top, bottom, left, right — at the center of each node edge. Each node can enable a subset via `sides`.

## SocketNodesGraph
Extends NodesGraph with socket nodes (horizontal left/right connections, vertical rows with controls). See its own SKILL.md.
