"use client";
import * as React from "react";
import { ScrollLayout, type ScrollOrientation, type ScrollbarMode } from "@/lib/components/scroll-layout";
export type { ScrollOrientation, ScrollbarMode };
export function ScrollLayoutReact({ children, orientation, scrollbar, maxHeight, minHeight, showShadow, className, instanceRef }: {
  children?: React.ReactNode; orientation?: ScrollOrientation; scrollbar?: ScrollbarMode;
  maxHeight?: number; minHeight?: number; showShadow?: boolean;
  className?: string; instanceRef?: React.MutableRefObject<ScrollLayout | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<ScrollLayout | null>(null);
  React.useEffect(() => {
    if (!ref.current) return;
    const s = new ScrollLayout(ref.current, { orientation, scrollbar, maxHeight, minHeight, showShadow });
    inst.current = s; if (instanceRef) instanceRef.current = s;
    return () => { s.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (orientation !== undefined) inst.current?.setProperty("orientation", orientation); }, [orientation]);
  React.useEffect(() => { if (scrollbar !== undefined) inst.current?.setProperty("scrollbar", scrollbar); }, [scrollbar]);
  React.useEffect(() => { if (maxHeight !== undefined) inst.current?.setProperty("maxHeight", maxHeight); }, [maxHeight]);
  React.useEffect(() => { if (minHeight !== undefined) inst.current?.setProperty("minHeight", minHeight); }, [minHeight]);
  React.useEffect(() => { if (showShadow !== undefined) inst.current?.setProperty("showShadow", showShadow); }, [showShadow]);
  return <div ref={ref} className={className}>{children}</div>;
}
