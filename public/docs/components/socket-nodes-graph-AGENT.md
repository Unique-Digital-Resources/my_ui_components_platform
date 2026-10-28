# AGENT.md — Socket Nodes Graph

Extends NodesGraph with socket-node layout. Each node has vertical rows; each row has at most one left socket + control + one right socket. Horizontal connections only.

## Architecture
`SocketNodesGraph extends NodesGraph`. Overrides:
- `renderNodeContent(node)` — builds the `.ng-socket-rows` layout with per-row sockets and controls.
- `getConnectionPoint(ep)` — returns the pixel position of a specific row socket (left/right edge at the row's vertical center).
- `onSocketPointerDown()` — drag-to-connect from a socket dot to another socket.

Control types: label, checkbox, toggle, dropdown, range, text, number. Changes emit `control_changed`.
