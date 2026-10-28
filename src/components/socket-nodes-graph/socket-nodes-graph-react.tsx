"use client";

import * as React from "react";
import {
  SocketNodesGraph,
  type SocketNode,
  type SocketGraphOptions,
  type GraphConnection,
  type GraphNode,
  type SocketGraphEventPayload,
} from "@/lib/components/nodes-graph";

export type { SocketNode, SocketGraphOptions, GraphConnection, SocketGraphEventPayload };

export interface SocketNodesGraphReactProps {
  nodes?: SocketNode[];
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
  onControlChanged?: (p: SocketGraphEventPayload) => void;
  onNodeSelected?: (p: SocketGraphEventPayload) => void;
  onNodeAdded?: (p: SocketGraphEventPayload) => void;
  onNodeRemoved?: (p: SocketGraphEventPayload) => void;
  onNodeMoved?: (p: SocketGraphEventPayload) => void;
  onConnectionAdded?: (p: SocketGraphEventPayload) => void;
  onConnectionRemoved?: (p: SocketGraphEventPayload) => void;
  onConnectionRejected?: (p: SocketGraphEventPayload) => void;
  onZoomChanged?: (p: SocketGraphEventPayload) => void;
  className?: string;
  instanceRef?: React.MutableRefObject<SocketNodesGraph | null>;
}

export function SocketNodesGraphReact({
  nodes, connections, zoom, panX, panY, showGrid, gridSize,
  selectable, movable, connectable, readOnly, disabled,
  onControlChanged, onNodeSelected, onNodeAdded, onNodeRemoved, onNodeMoved,
  onConnectionAdded, onConnectionRemoved, onConnectionRejected, onZoomChanged,
  className, instanceRef,
}: SocketNodesGraphReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<SocketNodesGraph | null>(null);
  const cbRef = React.useRef({
    onControlChanged, onNodeSelected, onNodeAdded, onNodeRemoved, onNodeMoved,
    onConnectionAdded, onConnectionRemoved, onConnectionRejected, onZoomChanged,
  });
  React.useEffect(() => {
    cbRef.current = {
      onControlChanged, onNodeSelected, onNodeAdded, onNodeRemoved, onNodeMoved,
      onConnectionAdded, onConnectionRemoved, onConnectionRejected, onZoomChanged,
    };
  });

  const initNodes = React.useRef(nodes);
  const initConns = React.useRef(connections);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const opts: SocketGraphOptions = {
      nodes: initNodes.current ?? [],
      connections: initConns.current ?? [],
      zoom, panX, panY, showGrid, gridSize,
      selectable, movable, connectable, readOnly, disabled,
    };
    const graph = new SocketNodesGraph(containerRef.current, opts);
    ref.current = graph;
    if (instanceRef) instanceRef.current = graph;

    graph.on("control_changed", (p) => cbRef.current.onControlChanged?.(p));
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
  React.useEffect(() => { if (nodes !== undefined) ref.current?.setNodes(nodes as unknown as GraphNode[]); }, [nodes]);
  React.useEffect(() => { if (connections !== undefined) ref.current?.setConnections(connections); }, [connections]);

  return <div ref={containerRef} className={className} />;
}
