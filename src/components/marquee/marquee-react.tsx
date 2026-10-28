"use client";
import * as React from "react";
import { Marquee, type MarqueeDirection, type MarqueeOptions } from "@/lib/components/marquee";
export type { MarqueeDirection, MarqueeOptions };
export function MarqueeReact({ items, direction, speed, pauseOnHover, gap, showSeparator, separator, className, instanceRef }: {
  items?: string[]; direction?: MarqueeDirection; speed?: number; pauseOnHover?: boolean;
  gap?: number; showSeparator?: boolean; separator?: string;
  className?: string; instanceRef?: React.MutableRefObject<Marquee | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<Marquee | null>(null);
  const initItems = React.useRef(items);
  React.useEffect(() => {
    if (!ref.current) return;
    const opts: MarqueeOptions = { items: initItems.current ?? [], direction, speed, pauseOnHover, gap, showSeparator, separator };
    const m = new Marquee(ref.current, opts);
    inst.current = m; if (instanceRef) instanceRef.current = m;
    return () => { m.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (direction !== undefined) inst.current?.setProperty("direction", direction); }, [direction]);
  React.useEffect(() => { if (speed !== undefined) inst.current?.setProperty("speed", speed); }, [speed]);
  React.useEffect(() => { if (pauseOnHover !== undefined) inst.current?.setProperty("pauseOnHover", pauseOnHover); }, [pauseOnHover]);
  React.useEffect(() => { if (gap !== undefined) inst.current?.setProperty("gap", gap); }, [gap]);
  React.useEffect(() => { if (showSeparator !== undefined) inst.current?.setProperty("showSeparator", showSeparator); }, [showSeparator]);
  React.useEffect(() => { if (separator !== undefined) inst.current?.setProperty("separator", separator); }, [separator]);
  React.useEffect(() => { if (items !== undefined) inst.current?.setItems(items); }, [items]);
  return <div ref={ref} className={className} />;
}
