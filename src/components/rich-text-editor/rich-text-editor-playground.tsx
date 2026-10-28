"use client";

import * as React from "react";
import { FileText, RotateCcw } from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import { RichTextEditorReact, type RichTextEditorEventPayload } from "./rich-text-editor-react";
import type { RichTextEditor } from "@/lib/components/rich-text-editor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SEED_CONTENT = `# Rich Text Editor

This is a **pluggable** rich-text editor with a *component registry*. You can type markdown-like syntax and see it rendered live — just like Obsidian's live preview.

## Features

- **Realtime mode**: syntax renders as you type
- **Source mode**: raw syntax is shown
- **Registry-based**: add custom components and syntax
- **Toolbar**: built-in formatting commands

### Inline formatting

You can use **bold**, *italic*, and \`code\` inline. Also [links](https://example.com).

### Block formatting

> This is a quote block. It renders with a lemon accent border.

\`\`\`
// Code block
const x = 42;
console.log(x);
\`\`\`

- Bullet item 1
- Bullet item 2
- Bullet item 3

1. Numbered item 1
2. Numbered item 2

---

Type in the editor above. Try toggling between **Source** and **Preview** modes with the toolbar button.`;

export function RichTextEditorPlayground() {
  const meta = getComponent("rich-text-editor")!;
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [realtime, setRealtime] = React.useState(true);
  const instanceRef = React.useRef<RichTextEditor | null>(null);

  const onChange = React.useCallback((p: RichTextEditorEventPayload) => {
    setLastEvent(`content changed (${p.content?.length ?? 0} chars)`);
  }, []);

  const onCommand = React.useCallback((p: RichTextEditorEventPayload) => {
    setLastEvent(`command: ${p.componentName}`);
    toast.info("Command applied", { description: p.componentName });
  }, []);

  const onModeChange = React.useCallback(() => {
    const rt = instanceRef.current?.isRealtime() ?? false;
    setRealtime(rt);
    setLastEvent(`mode → ${rt ? "realtime" : "source"}`);
  }, []);

  const reset = React.useCallback(() => {
    setLastEvent("reset");
    instanceRef.current?.setContent(SEED_CONTENT);
    toast.info("Editor reset");
  }, []);

  const jsCode = `import { RichTextEditor, registerBuiltinRTEComponents, defineRTEComponent } from "@workshop/rich-text-editor";

// Register built-in components (markdown-like syntax)
registerBuiltinRTEComponents();

// Add a custom component
defineRTEComponent({
  name: "callout",
  type: "block",
  trigger: "!! ",
  render: (text) => \`<div class="callout">\${text}</div>\`,
});

const editor = new RichTextEditor(container, {
  content: "# Hello World\\nThis is **bold**.",
  realtime: true,
});

editor.on("change", ({ content, html }) => {
  console.log("Content:", content);
  console.log("HTML:", html);
});`;

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Inputs</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Rich Text Editor</h1>
              <CollapsibleDescription text={meta.longDescription} maxLength={220} className="mt-2 max-w-2xl text-[15px] text-muted-foreground" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {meta.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">{t}</span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-lemon/30 bg-brand-lemon/10 px-2.5 py-1 text-[11px] font-mono text-brand-lemon">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon" />{meta.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <section aria-label="Live preview" className="panel relative flex h-[600px] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">{realtime ? "realtime" : "source"}</span>
              </div>
              <button type="button" onClick={reset} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-brand-lemon/40">
                <RotateCcw className="h-3 w-3" />Reset
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <RichTextEditorReact
                content={SEED_CONTENT}
                realtime={realtime}
                onChange={onChange}
                onCommand={onCommand}
                onModeChange={onModeChange}
                instanceRef={instanceRef}
                className="h-full"
              />
            </div>
            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">last: <span className="text-brand-lemon">{lastEvent}</span></span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tip: type <code className="font-mono text-brand-lemon/80">#</code> for headings, <code className="font-mono text-brand-lemon/80">**bold**</code>, <code className="font-mono text-brand-lemon/80">*italic*</code>, <code className="font-mono text-brand-lemon/80">`code`</code>, <code className="font-mono text-brand-lemon/80">&gt;</code> for quotes, <code className="font-mono text-brand-lemon/80">-</code> for bullets. Toggle Source/Preview with the toolbar button.
              </p>
            </div>
          </section>

          <AgentSkillTabs agentPath="/docs/components/rich-text-editor-AGENT.md" skillPath="/docs/components/rich-text-editor-SKILL.md">
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-muted-foreground">
                The editor has a built-in toolbar with formatting buttons (H1, H2, H3, Quote, Code, Bullet, Numbered, Divider, Bold, Italic, Code inline, Link) and a Source/Preview toggle. Use it directly in the live canvas above.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button type="button" onClick={() => { instanceRef.current?.toggleRealtime(); setRealtime(!!instanceRef.current?.isRealtime()); }}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
                  realtime ? "border-brand-lemon/40 bg-brand-lemon/10 text-brand-lemon" : "border-border bg-muted/30 text-foreground hover:border-brand-lemon/40 hover:bg-accent")}>
                {realtime ? "Source mode" : "Realtime mode"}
              </button>
              <button type="button" onClick={() => {
                const content = instanceRef.current?.getContent() ?? "";
                navigator.clipboard?.writeText(content);
                toast.success("Content copied", { description: `${content.length} chars` });
              }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                Copy content
              </button>
              <button type="button" onClick={() => {
                const html = instanceRef.current?.getHtml() ?? "";
                navigator.clipboard?.writeText(html);
                toast.success("HTML copied", { description: `${html.length} chars` });
              }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                Copy HTML
              </button>
            </div>
          </AgentSkillTabs>
        </div>

        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-2">
            <div className="flex">
              {([["javascript","JavaScript"],["html","HTML"],["css","CSS"],["api","API"]] as const).map(([k, l]) => (
                <button key={k} type="button"
                  className={cn("relative h-9 px-3 text-[12px] font-medium transition-colors text-muted-foreground hover:text-foreground")}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <CodeBlock code={jsCode} language="javascript" filename="init.js" />
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
          <div className="flex flex-col gap-6">
            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Overview</h2>
              <p className="mt-2 text-[14px] text-muted-foreground">{meta.description}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-brand-lemon">When to use</h3>
                  <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                    {meta.whenToUse.map((u) => <li key={u} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />{u}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Not for</h3>
                  <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                    {meta.whenNotToUse.map((u) => <li key={u} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />{u}</li>)}
                  </ul>
                </div>
              </div>
            </div>
            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Properties</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead><tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-4 font-mono font-medium">Property</th><th className="py-2 pr-4 font-mono font-medium">Type</th><th className="py-2 pr-4 font-mono font-medium">Default</th><th className="py-2 font-mono font-medium">Description</th>
                  </tr></thead>
                  <tbody>
                    {meta.properties.map((p) => (
                      <tr key={p.name} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-4 font-mono text-brand-lemon">{p.name}</td><td className="py-2 pr-4 font-mono text-foreground">{p.type}</td><td className="py-2 pr-4 font-mono text-muted-foreground">{p.default}</td><td className="py-2 text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-6 panel p-4">
              <h3 className="eyebrow mb-3">On this page</h3>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Overview</a></li>
                <li><a href="#" className="hover:text-foreground">Properties</a></li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
