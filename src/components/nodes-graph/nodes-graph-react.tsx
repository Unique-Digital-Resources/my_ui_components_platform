"use client";

import * as React from "react";
import {
  NodesGraph,
  type GraphNode,
  type GraphConnection,
  type GraphOptions,
  type GraphEventPayload,
} from "@/lib/components/nodes-graph";

export type { GraphNode, GraphConnection, GraphOptions, GraphEventPayload };

export interface NodesGraphReactProps {
  nodes?: GraphNode[];
  connections?: GraphConnection[];
  zoom?: number;
  panX?: number;
  panY?: number;
  showGrid?: boolean;
  gridSize?: number;
  selectable?: boolean;
  movable?: boolean;
  connectable?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  onNodeSelected?: (p: GraphEventPayload) => void;
  onNodeAdded?: (p: GraphEventPayload) => void;
  onNodeRemoved?: (p: GraphEventPayload) => void;
  onNodeMoved?: (p: GraphEventPayload) => void;
  onConnectionAdded?: (p: GraphEventPayload) => void;
  onConnectionRemoved?: (p: GraphEventPayload) => void;
  onConnectionRejected?: (p: GraphEventPayload) => void;
  onZoomChanged?: (p: GraphEventPayload) => void;
  className?: string;
  instanceRef?: React.MutableRefObject<NodesGraph | null>;
}

export function NodesGraphReact({
  nodes, connections, zoom, panX, panY, showGrid, gridSize,
  selectable, movable, connectable, readOnly, disabled,
  onNodeSelected, onNodeAdded, onNodeRemoved, onNodeMoved,
  onConnectionAdded, onConnectionRemoved, onConnectionRejected, onZoomChanged,
  className, instanceRef,
}: NodesGraphReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<NodesGraph | null>(null);
  const cbRef = React.useRef({
    onNodeSelected, onNodeAdded, onNodeRemoved, onNodeMoved,
    onConnectionAdded, onConnectionRemoved, onConnectionRejected, onZoomChanged,
  });
  React.useEffect(() => {
    cbRef.current = {
      onNodeSelected, onNodeAdded, onNodeRemoved, onNodeMoved,
      onConnectionAdded, onConnectionRemoved, onConnectionRejected, onZoomChanged,
    };
  });

  const initNodes = React.useRef(nodes);
  const initConns = React.useRef(connections);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const opts: GraphOptions = {
      nodes: initNodes.current ?? [],
      connections: initConns.current ?? [],
      zoom, panX, panY, showGrid, gridSize,
      selectable, movable, connectable, readOnly, disabled,
    };
    const graph = new NodesGraph(containerRef.current, opts);
    ref.current = graph;
    if (instanceRef) instanceRef.current = graph;

    graph.on("node_selected", (p) => cbRef.current.onNodeSelected?.(p));
    graph.on("node_added", (p) => cbRef.current.onNodeAdded?.(p));
    graph.on("node_removed", (p) => cbRef.current.onNodeRemoved?.(p));
    graph.on("node_moved", (p) => cbRef.current.onNodeMoved?.(p));
    graph.on("connection_added", (p) => cbRef.current.onConnectionAdded?.(p));
    graph.on("connection_removed", (p) => cbRef.current.onConnectionRemoved?.(p));
    graph.on("connection_rejected", (p) => cbRef.current.onConnectionRejected?.(p));
    graph.on("zoom_changed", (p) => cbRef.current.onZoomChanged?.(p));

    return () => {
      graph.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
  }, []);

  React.useEffect(() => { if (showGrid !== undefined) ref.current?.setProperty("showGrid", showGrid); }, [showGrid]);
  React.useEffect(() => { if (gridSize !== undefined) ref.current?.setProperty("gridSize", gridSize); }, [gridSize]);
  React.useEffect(() => { if (selectable !== undefined) ref.current?.setProperty("selectable", selectable); }, [selectable]);
  React.useEffect(() => { if (movable !== undefined) ref.current?.setProperty("movable", movable); }, [movable]);
  React.useEffect(() => { if (connectable !== undefined) ref.current?.setProperty("connectable", connectable); }, [connectable]);
  React.useEffect(() => { if (readOnly !== undefined) ref.current?.setProperty("readOnly", readOnly); }, [readOnly]);
  React.useEffect(() => { if (disabled !== undefined) ref.current?.setProperty("disabled", disabled); }, [disabled]);
  React.useEffect(() => { if (nodes !== undefined) ref.current?.setNodes(nodes); }, [nodes]);
  React.useEffect(() => { if (connections !== undefined) ref.current?.setConnections(connections); }, [connections]);

  return <div ref={containerRef} className={className} />;
}
