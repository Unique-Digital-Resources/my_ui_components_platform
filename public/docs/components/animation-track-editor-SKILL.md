# SKILL.md — Animation Track Editor

A timeline-based animation track editor with keyframe tracks and clip tracks.

## Quick Start
```ts
import { AnimationTrackEditor } from "@workshop/animation-track-editor";
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
      clips: [{ id: "c1", start: 0.5, end: 3.5, label: "Music" }]
    },
  ],
});
editor.on("playhead_change", ({ playhead }) => console.log("Time:", playhead));
editor.on("keyframe_change", ({ trackId, keyframeId, time }) => console.log(`Moved: ${time}s`));
```

## Track types: keyframe (diamond markers) and clip (resizable boxes).
## Keyboard: Space (play), Arrows (step), Home/End, Delete, Escape.
