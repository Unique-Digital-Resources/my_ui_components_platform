/**
 * Public entry point for the NodesGraph + SocketNodesGraph components.
 *
 * NodesGraph is the foundation "mindmap" component — an infinite-canvas
 * node-and-connection graph with DOM-based rendering, pan/zoom, drag-to-
 * connect, selection, and keyboard navigation. Connection sides are top,
 * bottom, left, right (center of each edge).
 *
 * SocketNodesGraph extends NodesGraph with a socket-node layout: horizontal
 * (left/right) connections only, vertical rows, each row with at most one
 * left socket + a control component + one right socket.
 */

export { NodesGraph } from "./nodes-graph";
export { SocketNodesGraph } from "./socket-nodes-graph";
export type {
  ConnectionSide,
  GraphNode,
  ConnectionEndpoint,
  GraphConnection,
  GraphOptions,
  GraphEventPayload,
  GraphHandler,
} from "./nodes-graph";
export type {
  SocketSide,
  ControlType,
  SocketDef,
  ControlDef,
  SocketRow,
  SocketNodeData,
  SocketNode,
  SocketGraphOptions,
  SocketGraphEventPayload,
  SocketGraphHandler,
} from "./socket-nodes-graph";
