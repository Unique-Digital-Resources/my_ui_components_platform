"use client";
import * as React from "react";
import { ConnectionPath, type ConnectionDef, type ConnectionPathOptions, type PathShape, type ArrowPosition, type ConnectionPathEventPayload } from "@/lib/components/connection-path";
export type { ConnectionDef, ConnectionPathOptions, PathShape, ArrowPosition, ConnectionPathEventPayload };
export function ConnectionPathReact({ connections, stroke, strokeWidth, shape, arrow, arrowSize, curvature, interactive, onPathClick, onPathHover, className, instanceRef }: {
  connections?: ConnectionDef[]; stroke?: string; strokeWidth?: number; shape?: PathShape;
  arrow?: ArrowPosition; arrowSize?: number; curvature?: number; interactive?: boolean;
  onPathClick?: (p: ConnectionPathEventPayload) => void;
  onPathHover?: (p: ConnectionPathEventPayload) => void;
  className?: string; instanceRef?: React.MutableRefObject<ConnectionPath | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<ConnectionPath | null>(null);
  const cbRef = React.useRef({ onPathClick, onPathHover });
  React.useEffect(() => { cbRef.current = { onPathClick, onPathHover }; });
  const initConns = React.useRef(connections);
  React.useEffect(() => {
    if (!ref.current) return;
    const opts: ConnectionPathOptions = { connections: initConns.current ?? [], stroke, strokeWidth, shape, arrow, arrowSize, curvature, interactive };
    const cp = new ConnectionPath(ref.current, opts);
    inst.current = cp; if (instanceRef) instanceRef.current = cp;
    cp.on("path_click", (p) => cbRef.current.onPathClick?.(p));
    cp.on("path_hover", (p) => cbRef.current.onPathHover?.(p));
    return () => { cp.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (stroke !== undefined) inst.current?.setProperty("stroke", stroke); }, [stroke]);
  React.useEffect(() => { if (strokeWidth !== undefined) inst.current?.setProperty("strokeWidth", strokeWidth); }, [strokeWidth]);
  React.useEffect(() => { if (shape !== undefined) inst.current?.setProperty("shape", shape); }, [shape]);
  React.useEffect(() => { if (arrow !== undefined) inst.current?.setProperty("arrow", arrow); }, [arrow]);
  React.useEffect(() => { if (arrowSize !== undefined) inst.current?.setProperty("arrowSize", arrowSize); }, [arrowSize]);
  React.useEffect(() => { if (curvature !== undefined) inst.current?.setProperty("curvature", curvature); }, [curvature]);
  React.useEffect(() => { if (interactive !== undefined) inst.current?.setProperty("interactive", interactive); }, [interactive]);
  React.useEffect(() => { if (connections !== undefined) inst.current?.setConnections(connections); }, [connections]);
  return <div ref={ref} className={className} />;
}
