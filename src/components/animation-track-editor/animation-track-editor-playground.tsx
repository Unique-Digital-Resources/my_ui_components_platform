"use client";

import * as React from "react";
import { Film, RotateCcw } from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import { AnimationTrackEditorReact, type Track, type AnimationTrackEditorEventPayload } from "./animation-track-editor-react";
import type { AnimationTrackEditor } from "@/lib/components/animation-track-editor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SEED_TRACKS: Track[] = [
  {
    id: "t1", name: "position.x", type: "keyframe", owner: "Player", color: "#D9FF66",
    keyframes: [
      { id: "k1", time: 0, value: 0, transition: "ease" },
      { id: "k2", time: 1.5, value: 100, transition: "linear" },
      { id: "k3", time: 3, value: 50, transition: "ease-out" },
      { id: "k4", time: 5, value: 200, transition: "step" },
      { id: "k5", time: 7, value: 0, transition: "ease" },
    ],
  },
  {
    id: "t2", name: "opacity", type: "keyframe", owner: "Player", color: "#7DB8E8",
    keyframes: [
      { id: "k1", time: 0, value: 1, transition: "linear" },
      { id: "k2", time: 2, value: 0.5, transition: "ease" },
      { id: "k3", time: 4, value: 0, transition: "hold" },
      { id: "k4", time: 6, value: 1, transition: "ease-in" },
    ],
  },
  {
    id: "t3", name: "Audio Clip", type: "clip", owner: "Audio", color: "#8FE3A5",
    clips: [
      { id: "c1", start: 0.5, end: 3.5, label: "Music Intro", color: "#8FE3A5" },
      { id: "c2", start: 4, end: 7.5, label: "Voice Over", color: "#FFD36B" },
    ],
  },
  {
    id: "t4", name: "Video Clip", type: "clip", owner: "Video", color: "#FF858B",
    clips: [
      { id: "c1", start: 0, end: 5, label: "Scene 1", color: "#FF858B" },
      { id: "c2", start: 5, end: 8, label: "Scene 2", color: "#B8B2CA" },
    ],
  },
  {
    id: "t5", name: "rotation", type: "keyframe", owner: "Player", color: "#FFD36B",
    keyframes: [
      { id: "k1", time: 0, value: 0, transition: "linear" },
      { id: "k2", time: 8, value: 360, transition: "linear" },
    ],
  },
];

export function AnimationTrackEditorPlayground() {
  const meta = getComponent("animation-track-editor")!;
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [playing, setPlaying] = React.useState(false);
  const instanceRef = React.useRef<AnimationTrackEditor | null>(null);

  const onPlayheadChange = React.useCallback((p: AnimationTrackEditorEventPayload) => {
    setLastEvent(`scrub → ${p.playhead?.toFixed(2)}s`);
  }, []);

  const onPlaybackChange = React.useCallback((p: AnimationTrackEditorEventPayload) => {
    setPlaying(!!p.playing);
    setLastEvent(p.playing ? "playing" : "paused");
  }, []);

  const onKeyframeChange = React.useCallback((p: AnimationTrackEditorEventPayload) => {
    setLastEvent(`kf ${p.keyframeId} → ${p.time?.toFixed(2)}s`);
  }, []);

  const onClipChange = React.useCallback((p: AnimationTrackEditorEventPayload) => {
    setLastEvent(`clip ${p.clipId} → ${p.time?.toFixed(2)}s`);
  }, []);

  const onTrackAdded = React.useCallback((p: AnimationTrackEditorEventPayload) => {
    setLastEvent(`track added ${p.trackId}`);
    toast.success("Track added", { description: p.trackId });
  }, []);

  const onSelectionChange = React.useCallback((p: AnimationTrackEditorEventPayload) => {
    if (p.keyframeId) setLastEvent(`selected kf ${p.keyframeId}`);
    else if (p.clipId) setLastEvent(`selected clip ${p.clipId}`);
  }, []);

  const reset = React.useCallback(() => {
    setLastEvent("reset");
    instanceRef.current?.stop();
    instanceRef.current?.setTracks(SEED_TRACKS);
    instanceRef.current?.setPlayhead(0);
    toast.info("Editor reset");
  }, []);

  const jsCode = `import { AnimationTrackEditor } from "@workshop/animation-track-editor";

const editor = new AnimationTrackEditor(container, {
  duration: 10,
  pixelsPerSecond: 100,
  tracks: [
    { id: "t1", name: "position.x", type: "keyframe", owner: "Player",
      keyframes: [
        { id: "k1", time: 0, value: 0, transition: "ease" },
        { id: "k2", time: 1.5, value: 100, transition: "linear" },
      ]
    },
    { id: "t2", name: "Audio", type: "clip", owner: "Audio",
      clips: [
        { id: "c1", start: 0.5, end: 3.5, label: "Music" },
      ]
    },
  ],
});

editor.on("playhead_change", ({ playhead }) => console.log("Time:", playhead));
editor.on("keyframe_change", ({ trackId, keyframeId, time }) => {
  console.log(\`Keyframe \${keyframeId} moved to \${time}s\`);
});`;

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Productivity</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Animation Track Editor</h1>
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
                <Film className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">{playing ? "▶ playing" : "⏸ paused"}</span>
              </div>
              <button type="button" onClick={reset} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-brand-lemon/40">
                <RotateCcw className="h-3 w-3" />Reset
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <AnimationTrackEditorReact
                tracks={SEED_TRACKS}
                duration={10}
                pixelsPerSecond={100}
                onPlayheadChange={onPlayheadChange}
                onPlaybackChange={onPlaybackChange}
                onKeyframeChange={onKeyframeChange}
                onClipChange={onClipChange}
                onTrackAdded={onTrackAdded}
                onSelectionChange={onSelectionChange}
                instanceRef={instanceRef}
                className="h-full"
              />
            </div>
            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">last: <span className="text-brand-lemon">{lastEvent}</span></span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyableValue label="State" value={playing ? "Playing" : "Paused"} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Space</kbd> play/pause · click ruler to scrub · drag keyframes/clips · <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">←→</kbd> step · <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Del</kbd> remove selected · use toolbar for add track/zoom.
              </p>
            </div>
          </section>

          <AgentSkillTabs agentPath="/docs/components/animation-track-editor-AGENT.md" skillPath="/docs/components/animation-track-editor-SKILL.md">
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-muted-foreground">
                The editor has a built-in toolbar with transport controls (play, stop, prev/next key), loop toggle, speed control, duration, zoom slider, and add-track buttons. Use it directly in the live canvas above.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button type="button" onClick={() => instanceRef.current?.play()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                Play
              </button>
              <button type="button" onClick={() => instanceRef.current?.pause()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                Pause
              </button>
              <button type="button" onClick={() => instanceRef.current?.stop()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                Stop
              </button>
              <button type="button" onClick={() => instanceRef.current?.prevKey()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                Prev key
              </button>
              <button type="button" onClick={() => instanceRef.current?.nextKey()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                Next key
              </button>
              <button type="button" onClick={() => instanceRef.current?.toggleLoop()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                Toggle loop
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
