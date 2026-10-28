# AGENT.md — Nodes Graph

The foundation node-graph (mindmap) component. DOM-based rendering (not canvas), fixing all past sync issues. See SKILL.md for usage.

## Architecture
- `nodes-graph.ts` — `NodesGraph` class. Infinite canvas via CSS transform on a "world" div. Nodes are absolutely-positioned DOM elements; connections are SVG bezier paths in an overlay layer.
- `socket-nodes-graph.ts` — `SocketNodesGraph extends NodesGraph`. Overrides `renderNodeContent()` and `getConnectionPoint()` for socket-node layout.

## Key design decisions (fixing past issues)
- **DOM, not canvas**: nodes can contain rich content (controls, text). No canvas sync issues.
- **Connections redraw live**: `drawConnections()` is called on every node move and pan/zoom frame — paths always track.
- **Pan/zoom via CSS transform**: the world div is `translate(panX,panY) scale(zoom)`. Grid background tracks via background-position/size.
- **Connection sides**: top/bottom/left/right at the center of each edge. Configurable per node.
- **Drag-to-connect**: pointerdown on a handle starts a temp bezier path; pointerup on another handle creates the connection.
- **Pluggable**: `renderNodeContent()` and `getConnectionPoint()` are overridable for subclasses.
