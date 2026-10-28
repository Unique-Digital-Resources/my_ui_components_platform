"use client";
import * as React from "react";
import { Badge, type BadgeItem, type BadgeSize } from "@/lib/components/badge";
export type { BadgeItem, BadgeSize };
export function BadgeReact({ items, size, grouping, className, instanceRef }: {
  items?: BadgeItem[]; size?: BadgeSize; grouping?: boolean;
  className?: string; instanceRef?: React.MutableRefObject<Badge | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<Badge | null>(null);
  const initItems = React.useRef(items);
  React.useEffect(() => {
    if (!ref.current) return;
    const b = new Badge(ref.current, { items: initItems.current ?? [], size, grouping });
    inst.current = b; if (instanceRef) instanceRef.current = b;
    return () => { b.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (size !== undefined) inst.current?.setProperty("size", size); }, [size]);
  React.useEffect(() => { if (grouping !== undefined) inst.current?.setProperty("grouping", grouping); }, [grouping]);
  React.useEffect(() => { if (items !== undefined) inst.current?.setItems(items); }, [items]);
  return <div ref={ref} className={className} />;
}
