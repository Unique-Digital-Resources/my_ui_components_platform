"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { ColorWheelPlayground } from "@/components/color-wheel/color-wheel-playground";
import { ColorRangePlayground } from "@/components/color-range/color-range-playground";
import { ColorCirclePlayground } from "@/components/color-circle/color-circle-playground";
import { ColorRampPlayground } from "@/components/color-ramp/color-ramp-playground";
import { ToggleGroupPlayground } from "@/components/toggle-group/toggle-group-playground";
import { PeriodicRangePlayground } from "@/components/periodic-range/periodic-range-playground";
import { CalendarPlayground } from "@/components/calendar/calendar-playground";
import { KanbanPlayground } from "@/components/kanban/kanban-playground";
import { GanttPlayground } from "@/components/gantt/gantt-playground";
import { AnimationTrackEditorPlayground } from "@/components/animation-track-editor/animation-track-editor-playground";
import { BreadcrumbPlayground } from "@/components/breadcrumb/breadcrumb-playground";
import { CollapsePlayground } from "@/components/collapse/collapse-playground";
import { CarouselPlayground } from "@/components/carousel/carousel-playground";
import { ScrollLayoutPlayground } from "@/components/scroll-layout/scroll-layout-playground";
import { DrawerPlayground } from "@/components/drawer/drawer-playground";
import { MarqueePlayground } from "@/components/marquee/marquee-playground";
import { AvatarPlayground } from "@/components/avatar/avatar-playground";
import { BadgePlayground } from "@/components/badge/badge-playground";
import { TimelinePlayground } from "@/components/timeline/timeline-playground";
import { TableEditorPlayground } from "@/components/table-editor/table-editor-playground";
import { ConnectionPathPlayground } from "@/components/connection-path/connection-path-playground";
import { RichTextEditorPlayground } from "@/components/rich-text-editor/rich-text-editor-playground";
import { SocketNodesGraphPlayground } from "@/components/socket-nodes-graph/socket-nodes-graph-playground";
import { CustomButtonPlayground } from "@/components/custom-button/custom-button-playground";
import { SmartContextMenuPlayground } from "@/components/smart-context-menu/smart-context-menu-playground";
import { SmartTooltipPlayground } from "@/components/smart-tooltip/smart-tooltip-playground";
import { BoardPlayground } from "@/components/board/board-playground";
import { NodesGraphPlayground } from "@/components/nodes-graph/nodes-graph-playground";

/**
 * Lookup table mapping `${category}/${slug}` → the playground component.
 * Replaces the 28-entry if-chain from the legacy `RouteSwitcher`.
 */
const PLAYGROUND_LOOKUP: Record<string, React.ComponentType> = {
  // Color
  "color/color-wheel": ColorWheelPlayground,
  "color/color-range": ColorRangePlayground,
  "color/color-circle": ColorCirclePlayground,
  "color/color-ramp": ColorRampPlayground,
  // Inputs
  "inputs/periodic-range": PeriodicRangePlayground,
  "inputs/calendar": CalendarPlayground,
  "inputs/custom-button": CustomButtonPlayground,
  "inputs/toggle-group": ToggleGroupPlayground,
  "inputs/rich-text-editor": RichTextEditorPlayground,
  // Layout
  "layout/smart-context-menu": SmartContextMenuPlayground,
  "layout/smart-tooltip": SmartTooltipPlayground,
  "layout/board": BoardPlayground,
  "layout/nodes-graph": NodesGraphPlayground,
  "layout/socket-nodes-graph": SocketNodesGraphPlayground,
  "layout/collapse": CollapsePlayground,
  "layout/carousel": CarouselPlayground,
  "layout/scroll-layout": ScrollLayoutPlayground,
  "layout/drawer": DrawerPlayground,
  "layout/marquee": MarqueePlayground,
  "layout/connection-path": ConnectionPathPlayground,
  // Data Display
  "data-display/avatar": AvatarPlayground,
  "data-display/badge": BadgePlayground,
  "data-display/timeline": TimelinePlayground,
  "data-display/table-editor": TableEditorPlayground,
  // Productivity
  "productivity/kanban": KanbanPlayground,
  "productivity/gantt": GanttPlayground,
  "productivity/animation-track-editor": AnimationTrackEditorPlayground,
  // Navigation
  "navigation/breadcrumb": BreadcrumbPlayground,
};

export default function Page() {
  const params = useParams();
  const category = Array.isArray(params?.category)
    ? params.category[0]
    : (params?.category as string | undefined) ?? "";
  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : (params?.slug as string | undefined) ?? "";
  const key = `${category}/${slug}`;

  const Playground = PLAYGROUND_LOOKUP[key];

  if (!Playground) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Component not found.
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The component &ldquo;{slug}&rdquo; doesn&apos;t exist in the
          &ldquo;{category}&rdquo; category.
        </p>
        <div className="mt-6 flex gap-2">
          <Link
            href="/components"
            className="inline-flex h-9 items-center rounded-md bg-brand-lemon px-4 text-[13px] font-medium text-[#17151D] transition-colors hover:bg-brand-lemon-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse components
          </Link>
        </div>
      </div>
    );
  }

  // Key the wrapper by category+slug so navigating between two playgrounds
  // remounts cleanly (resetting scroll and local component state).
  return (
    <div key={key} className="flex-1">
      <Playground />
    </div>
  );
}
