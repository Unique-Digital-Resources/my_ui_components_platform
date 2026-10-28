"use client";

import * as React from "react";
import {
  Breadcrumb,
  type BreadcrumbItem,
  type BreadcrumbOptions,
  type BreadcrumbEventPayload,
  type CrumbSeparator,
  type BreadcrumbHandler,
} from "@/lib/components/breadcrumb";

export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbEventPayload,
  CrumbSeparator,
  BreadcrumbHandler,
};

export interface BreadcrumbReactProps {
  items?: BreadcrumbItem[];
  separator?: CrumbSeparator;
  maxItems?: number;
  overflowMode?: "dropdown" | "inline";
  showIcons?: boolean;
  markCurrent?: boolean;
  density?: "compact" | "comfortable" | "spacious";
  readOnly?: boolean;
  disabled?: boolean;
  onItemSelected?: (p: BreadcrumbEventPayload) => void;
  onItemActivated?: (p: BreadcrumbEventPayload) => void;
  onOverflowToggled?: (p: BreadcrumbEventPayload) => void;
  className?: string;
  instanceRef?: React.MutableRefObject<Breadcrumb | null>;
}

export function BreadcrumbReact({
  items,
  separator,
  maxItems,
  overflowMode,
  showIcons,
  markCurrent,
  density,
  readOnly,
  disabled,
  onItemSelected,
  onItemActivated,
  onOverflowToggled,
  className,
  instanceRef,
}: BreadcrumbReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<Breadcrumb | null>(null);

  // Keep callback refs stable so we don't re-attach listeners on every render.
  const cbRef = React.useRef({ onItemSelected, onItemActivated, onOverflowToggled });
  React.useEffect(() => {
    cbRef.current = { onItemSelected, onItemActivated, onOverflowToggled };
  });

  // Initial items captured so the create-once effect doesn't depend on them.
  const initialItemsRef = React.useRef(items);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const opts: BreadcrumbOptions = {
      items: initialItemsRef.current ?? [],
      separator,
      maxItems,
      overflowMode,
      showIcons,
      markCurrent,
      density,
      readOnly,
      disabled,
    };
    const trail = new Breadcrumb(containerRef.current, opts);
    ref.current = trail;
    if (instanceRef) instanceRef.current = trail;

    trail.on("item_selected", (p) => cbRef.current.onItemSelected?.(p));
    trail.on("item_activated", (p) => cbRef.current.onItemActivated?.(p));
    trail.on("overflow_toggled", (p) => cbRef.current.onOverflowToggled?.(p));

    return () => {
      trail.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
  }, []);

  // Forward prop changes via setProperty.
  React.useEffect(() => { if (separator !== undefined) ref.current?.setProperty("separator", separator); }, [separator]);
  React.useEffect(() => { if (maxItems !== undefined) ref.current?.setProperty("maxItems", maxItems); }, [maxItems]);
  React.useEffect(() => { if (overflowMode !== undefined) ref.current?.setProperty("overflowMode", overflowMode); }, [overflowMode]);
  React.useEffect(() => { if (showIcons !== undefined) ref.current?.setProperty("showIcons", showIcons); }, [showIcons]);
  React.useEffect(() => { if (markCurrent !== undefined) ref.current?.setProperty("markCurrent", markCurrent); }, [markCurrent]);
  React.useEffect(() => { if (density !== undefined) ref.current?.setProperty("density", density); }, [density]);
  React.useEffect(() => { if (readOnly !== undefined) ref.current?.setProperty("readOnly", readOnly); }, [readOnly]);
  React.useEffect(() => { if (disabled !== undefined) ref.current?.setProperty("disabled", disabled); }, [disabled]);

  // items: replace when the array reference changes
  React.useEffect(() => {
    if (items !== undefined) ref.current?.setItems(items);
  }, [items]);

  return <div ref={containerRef} className={className} />;
}
