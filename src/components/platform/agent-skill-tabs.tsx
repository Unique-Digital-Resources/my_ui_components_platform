"use client";

import * as React from "react";
import { FileCode, BookOpen, LayoutTemplate, ChevronDown, ChevronRight } from "lucide-react";
import { MarkdownRenderer } from "@/components/platform/markdown-renderer";
import { cn } from "@/lib/utils";

/**
 * A tabbed panel that shows Properties, AGENT.md, and SKILL.md content.
 * The Properties tab is the "main" tab (higher, accent-colored); AGENT and
 * SKILL are secondary tabs that render markdown content.
 *
 * An optional `templatesSlot` prop adds a "Templates" tab (between Properties
 * and AGENT) for playgrounds that use the content-template system. When the
 * prop is omitted, the tab is not rendered.
 *
 * The panel has a fixed height with vertical scrolling for overflow.
 *
 * Usage:
 *   <AgentSkillTabs
 *     agentPath="/docs/components/color-wheel-AGENT.md"
 *     skillPath="/docs/components/color-wheel-SKILL.md"
 *   >
 *     Properties content here
 *   </AgentSkillTabs>
 *
 * With templates:
 *   <AgentSkillTabs
 *     agentPath="/docs/components/kanban-AGENT.md"
 *     skillPath="/docs/components/kanban-SKILL.md"
 *     templatesSlot={<TemplatePicker ... />}
 *   >
 *     Properties content here
 *   </AgentSkillTabs>
 */
export function AgentSkillTabs({
  agentPath,
  skillPath,
  templatesSlot,
  children,
}: {
  agentPath: string;
  skillPath: string;
  /** When provided, a "Templates" tab is rendered between Properties and AGENT. */
  templatesSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = React.useState<"properties" | "templates" | "agent" | "skill">("properties");
  const [agentContent, setAgentContent] = React.useState<string>("");
  const [skillContent, setSkillContent] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (activeTab === "agent" && !agentContent) {
      setLoading(true);
      fetch(agentPath)
        .then((r) => r.text())
        .then(setAgentContent)
        .catch(() => setAgentContent("# Error\n\nCould not load AGENT.md."))
        .finally(() => setLoading(false));
    }
    if (activeTab === "skill" && !skillContent) {
      setLoading(true);
      fetch(skillPath)
        .then((r) => r.text())
        .then(setSkillContent)
        .catch(() => setSkillContent("# Error\n\nCould not load SKILL.md."))
        .finally(() => setLoading(false));
    }
  }, [activeTab, agentPath, skillPath, agentContent, skillContent]);

  return (
    <div className="panel flex h-[600px] max-h-[600px] flex-col overflow-hidden">
      {/* Tab bar — Properties tab is elevated + accent-colored */}
      <div className="flex shrink-0 items-end gap-0 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("properties")}
          className={cn(
            "relative flex h-11 items-center gap-1.5 rounded-t-md px-4 text-[13px] font-semibold transition-all",
            activeTab === "properties"
              ? "bg-brand-lemon text-[#17151D]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          <span className={cn(
            "h-2 w-2 rounded-full transition-colors",
            activeTab === "properties" ? "bg-[#17151D]" : "bg-muted-foreground/40"
          )} />
          Properties
        </button>
        {templatesSlot && (
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={cn(
              "relative flex h-9 items-center gap-1.5 px-3 text-[12px] font-medium transition-colors",
              activeTab === "templates"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Templates
            {activeTab === "templates" && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-lemon" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab("agent")}
          className={cn(
            "relative flex h-9 items-center gap-1.5 px-3 text-[12px] font-medium transition-colors",
            activeTab === "agent"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileCode className="h-3.5 w-3.5" />
          AGENT
          {activeTab === "agent" && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-lemon" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("skill")}
          className={cn(
            "relative flex h-9 items-center gap-1.5 px-3 text-[12px] font-medium transition-colors",
            activeTab === "skill"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          SKILL
          {activeTab === "skill" && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-lemon" />
          )}
        </button>
      </div>
      {/* Tab content — fixed height with vertical scroll */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "properties" && (
          <div className="flex flex-col gap-5 p-4">{children}</div>
        )}
        {activeTab === "templates" && templatesSlot && (
          <div className="flex flex-col gap-5 p-4">{templatesSlot}</div>
        )}
        {activeTab === "agent" && (
          <div className="p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading AGENT.md…</p>
            ) : (
              <MarkdownRenderer content={agentContent} />
            )}
          </div>
        )}
        {activeTab === "skill" && (
          <div className="p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading SKILL.md…</p>
            ) : (
              <MarkdownRenderer content={skillContent} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A collapsible section for nested component properties.
 * Used when a component contains other components (e.g., PeriodicRange
 * contains CustomButton thumbs, ToggleGroup contains toggle buttons).
 *
 * The section starts collapsed by default and can be expanded.
 */
export function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-accent"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {Icon && <Icon className="h-3.5 w-3.5 text-brand-lemon" />}
        <span className="text-[12px] font-semibold text-foreground">{title}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-border bg-muted/10 p-4">
          {children}
        </div>
      )}
    </div>
  );
}
