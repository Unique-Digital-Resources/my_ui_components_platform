"use client";
import * as React from "react";
import { Avatar, type AvatarItem, type AvatarSize, type AvatarShape } from "@/lib/components/avatar";
export type { AvatarItem, AvatarSize, AvatarShape };
export function AvatarReact({ items, size, shape, showStatus, max, grouping, className, instanceRef }: {
  items?: AvatarItem[]; size?: AvatarSize; shape?: AvatarShape; showStatus?: boolean;
  max?: number; grouping?: boolean;
  className?: string; instanceRef?: React.MutableRefObject<Avatar | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<Avatar | null>(null);
  const initItems = React.useRef(items);
  React.useEffect(() => {
    if (!ref.current) return;
    const a = new Avatar(ref.current, { items: initItems.current ?? [], size, shape, showStatus, max, grouping });
    inst.current = a; if (instanceRef) instanceRef.current = a;
    return () => { a.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (size !== undefined) inst.current?.setProperty("size", size); }, [size]);
  React.useEffect(() => { if (shape !== undefined) inst.current?.setProperty("shape", shape); }, [shape]);
  React.useEffect(() => { if (showStatus !== undefined) inst.current?.setProperty("showStatus", showStatus); }, [showStatus]);
  React.useEffect(() => { if (max !== undefined) inst.current?.setProperty("max", max); }, [max]);
  React.useEffect(() => { if (grouping !== undefined) inst.current?.setProperty("grouping", grouping); }, [grouping]);
  React.useEffect(() => { if (items !== undefined) inst.current?.setItems(items); }, [items]);
  return <div ref={ref} className={className} />;
}
