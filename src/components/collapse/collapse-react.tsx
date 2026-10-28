"use client";
import * as React from "react";
import { Collapse, type CollapseItem, type CollapseOptions, type CollapseEventPayload } from "@/lib/components/collapse";
export type { CollapseItem, CollapseOptions, CollapseEventPayload };
export function CollapseReact({ items, accordion, showIcons, defaultOpenIds, onToggle, className, instanceRef }: {
  items?: CollapseItem[]; accordion?: boolean; showIcons?: boolean; defaultOpenIds?: string[];
  onToggle?: (p: CollapseEventPayload) => void;
  className?: string; instanceRef?: React.MutableRefObject<Collapse | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<Collapse | null>(null);
  const cbRef = React.useRef({ onToggle });
  React.useEffect(() => { cbRef.current = { onToggle }; });
  const initItems = React.useRef(items);
  React.useEffect(() => {
    if (!ref.current) return;
    const opts: CollapseOptions = { items: initItems.current ?? [], accordion, showIcons, defaultOpenIds };
    const c = new Collapse(ref.current, opts);
    inst.current = c; if (instanceRef) instanceRef.current = c;
    c.on("toggle", (p) => cbRef.current.onToggle?.(p));
    return () => { c.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (accordion !== undefined) inst.current?.setProperty("accordion", accordion); }, [accordion]);
  React.useEffect(() => { if (showIcons !== undefined) inst.current?.setProperty("showIcons", showIcons); }, [showIcons]);
  React.useEffect(() => { if (items !== undefined) inst.current?.setItems(items); }, [items]);
  return <div ref={ref} className={className} />;
}
