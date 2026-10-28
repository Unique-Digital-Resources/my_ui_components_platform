"use client";
import * as React from "react";
import { AnimationTrackEditor, type Track, type AnimationTrackEditorOptions, type AnimationTrackEditorEventPayload } from "@/lib/components/animation-track-editor";
export type { Track, AnimationTrackEditorOptions, AnimationTrackEditorEventPayload };
export function AnimationTrackEditorReact({ tracks, duration, pixelsPerSecond, playhead, playing, loop, speed, snapInterval, readOnly, onPlayheadChange, onPlaybackChange, onKeyframeChange, onClipChange, onTrackAdded, onTrackRemoved, onSelectionChange, onZoomChange, className, instanceRef }: {
  tracks?: Track[]; duration?: number; pixelsPerSecond?: number; playhead?: number;
  playing?: boolean; loop?: boolean; speed?: number; snapInterval?: number; readOnly?: boolean;
  onPlayheadChange?: (p: AnimationTrackEditorEventPayload) => void;
  onPlaybackChange?: (p: AnimationTrackEditorEventPayload) => void;
  onKeyframeChange?: (p: AnimationTrackEditorEventPayload) => void;
  onClipChange?: (p: AnimationTrackEditorEventPayload) => void;
  onTrackAdded?: (p: AnimationTrackEditorEventPayload) => void;
  onTrackRemoved?: (p: AnimationTrackEditorEventPayload) => void;
  onSelectionChange?: (p: AnimationTrackEditorEventPayload) => void;
  onZoomChange?: (p: AnimationTrackEditorEventPayload) => void;
  className?: string; instanceRef?: React.MutableRefObject<AnimationTrackEditor | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<AnimationTrackEditor | null>(null);
  const cbRef = React.useRef({ onPlayheadChange, onPlaybackChange, onKeyframeChange, onClipChange, onTrackAdded, onTrackRemoved, onSelectionChange, onZoomChange });
  React.useEffect(() => { cbRef.current = { onPlayheadChange, onPlaybackChange, onKeyframeChange, onClipChange, onTrackAdded, onTrackRemoved, onSelectionChange, onZoomChange }; });
  const initTracks = React.useRef(tracks);
  React.useEffect(() => {
    if (!ref.current) return;
    const opts: AnimationTrackEditorOptions = { tracks: initTracks.current ?? [], duration, pixelsPerSecond, playhead, playing, loop, speed, snapInterval, readOnly };
    const e = new AnimationTrackEditor(ref.current, opts);
    inst.current = e; if (instanceRef) instanceRef.current = e;
    e.on("playhead_change", (p) => cbRef.current.onPlayheadChange?.(p));
    e.on("playback_change", (p) => cbRef.current.onPlaybackChange?.(p));
    e.on("keyframe_change", (p) => cbRef.current.onKeyframeChange?.(p));
    e.on("clip_change", (p) => cbRef.current.onClipChange?.(p));
    e.on("track_added", (p) => cbRef.current.onTrackAdded?.(p));
    e.on("track_removed", (p) => cbRef.current.onTrackRemoved?.(p));
    e.on("selection_change", (p) => cbRef.current.onSelectionChange?.(p));
    e.on("zoom_change", (p) => cbRef.current.onZoomChange?.(p));
    return () => { e.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (duration !== undefined) inst.current?.setProperty("duration", duration); }, [duration]);
  React.useEffect(() => { if (pixelsPerSecond !== undefined) inst.current?.setProperty("pixelsPerSecond", pixelsPerSecond); }, [pixelsPerSecond]);
  React.useEffect(() => { if (playhead !== undefined) inst.current?.setProperty("playhead", playhead); }, [playhead]);
  React.useEffect(() => { if (playing !== undefined) inst.current?.setProperty("playing", playing); }, [playing]);
  React.useEffect(() => { if (loop !== undefined) inst.current?.setProperty("loop", loop); }, [loop]);
  React.useEffect(() => { if (speed !== undefined) inst.current?.setProperty("speed", speed); }, [speed]);
  React.useEffect(() => { if (snapInterval !== undefined) inst.current?.setProperty("snapInterval", snapInterval); }, [snapInterval]);
  React.useEffect(() => { if (readOnly !== undefined) inst.current?.setProperty("readOnly", readOnly); }, [readOnly]);
  React.useEffect(() => { if (tracks !== undefined) inst.current?.setTracks(tracks); }, [tracks]);
  return <div ref={ref} className={className} />;
}
