"use client";
import * as React from "react";
import { Drawer, type DrawerSide, type DrawerOptions, type DrawerEventPayload } from "@/lib/components/drawer";
export type { DrawerSide, DrawerOptions, DrawerEventPayload };
export function DrawerReact({ side, size, open, showOverlay, closeOnOverlayClick, closeOnEscape, title, content, onChange, className, instanceRef }: {
  side?: DrawerSide; size?: number; open?: boolean; showOverlay?: boolean;
  closeOnOverlayClick?: boolean; closeOnEscape?: boolean; title?: string; content?: string;
  onChange?: (p: DrawerEventPayload) => void;
  className?: string; instanceRef?: React.MutableRefObject<Drawer | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<Drawer | null>(null);
  const cbRef = React.useRef({ onChange });
  React.useEffect(() => { cbRef.current = { onChange }; });
  React.useEffect(() => {
    if (!ref.current) return;
    const opts: DrawerOptions = { side, size, open, showOverlay, closeOnOverlayClick, closeOnEscape, title, content };
    const d = new Drawer(ref.current, opts);
    inst.current = d; if (instanceRef) instanceRef.current = d;
    d.on("change", (p) => cbRef.current.onChange?.(p));
    return () => { d.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (side !== undefined) inst.current?.setProperty("side", side); }, [side]);
  React.useEffect(() => { if (size !== undefined) inst.current?.setProperty("size", size); }, [size]);
  React.useEffect(() => { if (open !== undefined) inst.current?.setProperty("open", open); }, [open]);
  React.useEffect(() => { if (showOverlay !== undefined) inst.current?.setProperty("showOverlay", showOverlay); }, [showOverlay]);
  React.useEffect(() => { if (closeOnOverlayClick !== undefined) inst.current?.setProperty("closeOnOverlayClick", closeOnOverlayClick); }, [closeOnOverlayClick]);
  React.useEffect(() => { if (closeOnEscape !== undefined) inst.current?.setProperty("closeOnEscape", closeOnEscape); }, [closeOnEscape]);
  React.useEffect(() => { if (title !== undefined) inst.current?.setProperty("title", title); }, [title]);
  React.useEffect(() => { if (content !== undefined) inst.current?.setProperty("content", content); }, [content]);
  return <div ref={ref} className={className} />;
}
