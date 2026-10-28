"use client";
import * as React from "react";
import { RichTextEditor, type RichTextEditorOptions, type RichTextEditorEventPayload } from "@/lib/components/rich-text-editor";
export type { RichTextEditorOptions, RichTextEditorEventPayload };
export function RichTextEditorReact({ content, realtime, showToolbar, placeholder, readOnly, spellcheck, onChange, onCommand, onModeChange, className, instanceRef }: {
  content?: string; realtime?: boolean; showToolbar?: boolean; placeholder?: string;
  readOnly?: boolean; spellcheck?: boolean;
  onChange?: (p: RichTextEditorEventPayload) => void;
  onCommand?: (p: RichTextEditorEventPayload) => void;
  onModeChange?: (p: RichTextEditorEventPayload) => void;
  className?: string; instanceRef?: React.MutableRefObject<RichTextEditor | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<RichTextEditor | null>(null);
  const cbRef = React.useRef({ onChange, onCommand, onModeChange });
  React.useEffect(() => { cbRef.current = { onChange, onCommand, onModeChange }; });
  const initContent = React.useRef(content);
  React.useEffect(() => {
    if (!ref.current) return;
    const opts: RichTextEditorOptions = { content: initContent.current ?? "", realtime, showToolbar, placeholder, readOnly, spellcheck };
    const e = new RichTextEditor(ref.current, opts);
    inst.current = e; if (instanceRef) instanceRef.current = e;
    e.on("change", (p) => cbRef.current.onChange?.(p));
    e.on("command", (p) => cbRef.current.onCommand?.(p));
    e.on("mode_change", (p) => cbRef.current.onModeChange?.(p));
    return () => { e.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (realtime !== undefined) inst.current?.setProperty("realtime", realtime); }, [realtime]);
  React.useEffect(() => { if (readOnly !== undefined) inst.current?.setProperty("readOnly", readOnly); }, [readOnly]);
  React.useEffect(() => { if (spellcheck !== undefined) inst.current?.setProperty("spellcheck", spellcheck); }, [spellcheck]);
  React.useEffect(() => { if (content !== undefined) inst.current?.setContent(content); }, [content]);
  React.useEffect(() => { if (placeholder !== undefined) inst.current?.setProperty("placeholder", placeholder); }, [placeholder]);
  return <div ref={ref} className={className} />;
}
