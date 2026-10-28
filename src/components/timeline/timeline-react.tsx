"use client";
import * as React from "react";
import { Timeline, type TimelineEntry, type TimelineSide } from "@/lib/components/timeline";
export type { TimelineEntry, TimelineSide };
export function TimelineReact({ entries, side, showDates, showIcons, className, instanceRef }: {
  entries?: TimelineEntry[]; side?: TimelineSide; showDates?: boolean; showIcons?: boolean;
  className?: string; instanceRef?: React.MutableRefObject<Timeline | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<Timeline | null>(null);
  const initEntries = React.useRef(entries);
  React.useEffect(() => {
    if (!ref.current) return;
    const t = new Timeline(ref.current, { entries: initEntries.current ?? [], side, showDates, showIcons });
    inst.current = t; if (instanceRef) instanceRef.current = t;
    return () => { t.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (side !== undefined) inst.current?.setProperty("side", side); }, [side]);
  React.useEffect(() => { if (showDates !== undefined) inst.current?.setProperty("showDates", showDates); }, [showDates]);
  React.useEffect(() => { if (showIcons !== undefined) inst.current?.setProperty("showIcons", showIcons); }, [showIcons]);
  React.useEffect(() => { if (entries !== undefined) inst.current?.setEntries(entries); }, [entries]);
  return <div ref={ref} className={className} />;
}
