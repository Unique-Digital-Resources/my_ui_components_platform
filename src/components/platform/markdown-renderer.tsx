"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renders markdown content with the project's typography. Used for AGENT.md
 * and SKILL.md content displayed in component playground tabs.
 */
export function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-none text-sm leading-relaxed text-muted-foreground",
        "[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mt-6 [&_h1]:mb-3",
        "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-5 [&_h2]:mb-2",
        "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-2",
        "[&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-3 [&_h4]:mb-1",
        "[&_p]:mb-3 [&_p]:leading-relaxed",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-brand-lemon",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-[#0B0B10] [&_pre]:p-4 [&_pre]:my-3",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[#D8D4E8]",
        "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
        "[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
        "[&_li]:text-sm [&_li]:leading-relaxed",
        "[&_a]:text-brand-lemon [&_a]:underline [&_a]:underline-offset-2",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted/30 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-mono [&_th]:text-[11px] [&_th]:uppercase [&_th]:text-muted-foreground",
        "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-brand-lemon/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        "[&_hr]:border-border [&_hr]:my-4",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
