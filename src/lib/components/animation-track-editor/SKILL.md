# SKILL.md — AnimationTrackEditor

A vanilla TypeScript timeline-based animation editor. Two track types —
**keyframe tracks** (discrete keyframes with a value and a transition curve to
the next key) and **clip tracks** (resizable boxes for audio/image/video).
Ruler with second-accurate ticks, scrubbable playhead, full playback transport
(play/pause/stop/loop/speed), zoom in pixels-per-second, drag-to-move
keyframes and clips with snapping, dual-edge clip resize, single + additive
selection, track add/remove/visibility/lock, keyboard control, and per-action
events. DOM-based with a small canvas ruler, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  AnimationTrackEditor,
  type AnimationTrackEditorOptions,
  type AnimationTrackEditorEventPayload,
  type AnimationTrackEditorHandler,
  type Track,
  type TrackType,
  type Keyframe,
  type Clip,
} from "@/lib/components/animation-track-editor";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const editor = new AnimationTrackEditor(document.getElementById("host")!, {
  duration: 5,
  pixelsPerSecond: 120,
  snapInterval: 0.1,
  loop: true,
});

// Seed a keyframe track + a clip track
const kfTrack = editor.addTrack("keyframe", { name: "Position X" });
editor.addKeyframe(kfTrack, 0, 0);
editor.addKeyframe(kfTrack, 2.5, 100);
editor.addKeyframe(kfTrack, 5, 0);

const clipTrack = editor.addTrack("clip", { name: "Footstep SFX" });
editor.addClip(clipTrack, 1, 1.8);

editor.on("playhead_change", ({ playhead }) => console.log("t =", playhead));
editor.on("keyframe_change", ({ trackId, keyframeId, time }) =>
  console.log("kf moved:", trackId, keyframeId, time),
);

editor.play();

// later
editor.destroy();
```

---

## Constructor

```ts
new AnimationTrackEditor(container: HTMLElement, options?: AnimationTrackEditorOptions)
```

The container should have a fixed height (the root fills it with
`height: 100%`). A `ResizeObserver` watches the root and redraws the ruler on
resize.

### Options

| Option              | Type                                                       | Default | Description                                                       |
|---------------------|------------------------------------------------------------|---------|-------------------------------------------------------------------|
| `tracks`            | `Track[]`                                                  | `[]`    | Initial tracks.                                                   |
| `duration`          | `number`                                                   | `10`    | Total timeline duration in seconds. Min 1.                        |
| `pixelsPerSecond`   | `number`                                                   | `100`   | Zoom: pixels per second. Min 10 (clamped in `setZoom`).           |
| `playhead`          | `number`                                                   | `0`     | Initial playhead position (seconds). Clamped to `[0, duration]`.  |
| `playing`           | `boolean`                                                  | `false` | Auto-start playback on construct.                                 |
| `loop`              | `boolean`                                                  | `false` | Loop playback back to 0 when reaching `duration`.                 |
| `speed`             | `number`                                                   | `1`     | Playback speed multiplier. Clamped to `[0.1, 10]`.                |
| `rowHeight`         | `number`                                                   | `36`    | Track row height in pixels (CSS only — not live-updatable).       |
| `snapInterval`      | `number`                                                   | `0`     | Snap interval in seconds for drag/scrub. `0` = no snap.           |
| `showRuler`         | `boolean`                                                  | `true`  | Show the time ruler.                                              |
| `showToolbar`       | `boolean`                                                  | `true`  | Show the toolbar (transport, speed, end, zoom, add-track).        |
| `readOnly`          | `boolean`                                                  | `false` | Disable all pointer + keyboard editing.                           |

### Track shape

```ts
type TrackType = "keyframe" | "clip";

interface Track {
  id: string;
  name: string;
  type: TrackType;
  owner?: string;          // optional grouping label (uppercase)
  keyframes?: Keyframe[];  // only on keyframe tracks
  clips?: Clip[];          // only on clip tracks
  visible?: boolean;       // default true; false dims the row
  locked?: boolean;        // default false; true blocks editing
  color?: string;          // optional track-name color
}

interface Keyframe {
  id: string;
  time: number;            // seconds
  value: number;
  /** Transition curve to the NEXT keyframe. */
  transition?: "linear" | "ease" | "ease-in" | "ease-out" | "step" | "hold";
  selected?: boolean;
}

interface Clip {
  id: string;
  start: number;           // seconds
  end: number;             // seconds
  label?: string;
  color?: string;
  selected?: boolean;
}
```

---

## Methods

### Playhead

| Method                                                  | Returns   | Description                                                       |
|---------------------------------------------------------|-----------|-------------------------------------------------------------------|
| `setPlayhead(time, source?)`                            | `void`    | Move the playhead. Clamped to `[0, duration]`. Emits `playhead_change` (only if value changed). `source` defaults to `"programmatic"`. |
| `getPlayhead()`                                         | `number`  | Current playhead position (seconds).                              |

### Playback

| Method              | Returns  | Description                                                       |
|---------------------|----------|-------------------------------------------------------------------|
| `togglePlay()`      | `void`   | Play if paused, pause if playing.                                 |
| `play()`            | `void`   | Start playback (RAF loop). Emits `playback_change`.               |
| `pause()`           | `void`   | Stop the RAF loop. Emits `playback_change`.                       |
| `stop()`            | `void`   | Pause + reset playhead to 0.                                      |
| `toggleLoop()`      | `void`   | Flip the loop flag. Emits `loop_change`.                          |
| `isPlaying()`       | `boolean`| Whether playback is active.                                       |

### Navigation

| Method        | Returns | Description                                                       |
|---------------|---------|-------------------------------------------------------------------|
| `nextKey()`   | `void`  | Jump the playhead to the next keyframe after the current position. If none, jumps to `duration`. |
| `prevKey()`   | `void`  | Jump to the previous keyframe before the current position. If none, jumps to 0. |

### Zoom

| Method                                  | Returns  | Description                                                       |
|-----------------------------------------|----------|-------------------------------------------------------------------|
| `setZoom(pps, source?)`                 | `void`   | Set pixels-per-second (min 10). Re-positions all keyframes/clips/playhead; redraws ruler + grid. Emits `zoom_change`. |
| `getZoom()`                             | `number` | Current pixels-per-second.                                        |

### Selection

| Method                                       | Returns | Description                                                       |
|----------------------------------------------|---------|-------------------------------------------------------------------|
| `selectKeyframe(trackId, kfId, additive)`    | `void`  | Toggle the keyframe's selected state. If `additive` is false, clears all other selections first. Emits `selection_change`. |
| `selectClip(trackId, clipId, additive)`      | `void`  | Toggle the clip's selected state. Same semantics as above.        |
| `clearSelection()`                           | `void`  | Deselect all keyframes and clips. Emits `selection_change`.       |

### Tracks

| Method                                  | Returns    | Description                                                       |
|-----------------------------------------|------------|-------------------------------------------------------------------|
| `addTrack(type, partial?)`              | `string`   | Append a track. `partial` overrides name/owner/keyframes/clips/visible/locked/color. Returns the new track ID. Emits `track_added`. |
| `removeTrack(trackId)`                  | `void`     | Remove a track by ID. Emits `track_removed`.                      |
| `toggleTrackVisible(trackId)`           | `void`     | Flip the track's `visible` flag. Emits `track_change`.            |
| `toggleTrackLock(trackId)`              | `void`     | Flip the track's `locked` flag. Emits `track_change`.             |
| `getTracks()`                           | `Track[]`  | Deep-cloned snapshot of all tracks.                               |
| `setTracks(tracks)`                     | `void`     | Replace all tracks (shallow-clone — see AGENT.md Known Issues).   |

### Keyframes

| Method                                       | Returns  | Description                                                       |
|----------------------------------------------|----------|-------------------------------------------------------------------|
| `addKeyframe(trackId, time?, value?)`        | `string` | Add a keyframe. `time` defaults to current playhead; `value` to 0; `transition` to `"linear"`. Keyframes are kept sorted by time. Returns the new ID. Emits `keyframe_added`. |
| `removeKeyframe(trackId, kfId)`              | `void`   | Remove a keyframe. Emits `keyframe_removed`.                      |

### Clips

| Method                                  | Returns  | Description                                                       |
|-----------------------------------------|----------|-------------------------------------------------------------------|
| `addClip(trackId, start?, end?)`        | `string` | Add a clip. `start` defaults to playhead; `end` to `start + 1`. Returns the new ID. Emits `clip_added`. |
| `removeClip(trackId, clipId)`           | `void`   | Remove a clip. Emits `clip_removed`.                              |

### Misc

| Method                          | Returns   | Description                                                       |
|---------------------------------|-----------|-------------------------------------------------------------------|
| `getDuration()`                 | `number`  | Current timeline duration (seconds).                              |
| `setProperty(name, value)`      | `void`    | Generic setter. Supports: `duration`, `pixelsPerSecond`, `playhead`, `playing`, `loop`, `speed`, `snapInterval`, `readOnly`, `tracks`. Does NOT support `rowHeight`, `showRuler`, `showToolbar`. |
| `on(event, handler)`            | `void`    | Subscribe to an event (see below).                                |
| `off(event, handler)`           | `void`    | Unsubscribe.                                                      |
| `destroy()`                     | `void`    | Tear down. Idempotent. Cancels RAF, disconnects ResizeObserver, clears listeners, empties container. |

---

## Events

All handlers receive an `AnimationTrackEditorEventPayload` (with a `type` field
equal to the event name injected by `emit()`).

| Event                | Payload fields                                                | When                                                          |
|----------------------|---------------------------------------------------------------|---------------------------------------------------------------|
| `playhead_change`    | `playhead`, `source`                                          | Playhead moved (scrub, keyboard, programmatic, or playback loop wrap). Only fires if the value actually changed. |
| `playback_change`    | `playing`, `source`                                           | `play()` or `pause()` called.                                 |
| `playback_tick`      | `playhead`, `source: "playback"`                              | Every RAF frame during playback.                              |
| `loop_change`        | `source`                                                      | `toggleLoop()` called.                                        |
| `zoom_change`        | `pixelsPerSecond`, `source`                                   | `setZoom()` called.                                           |
| `keyframe_drag`      | `trackId`, `keyframeId`, `time`, `source: "pointer"`          | During keyframe drag (per `pointermove`).                     |
| `keyframe_change`    | `trackId`, `keyframeId`, `time`, `oldTime`, `source`          | Keyframe drag committed (`pointerup`).                        |
| `keyframe_added`     | `trackId`, `keyframeId`, `time`, `source: "programmatic"`     | `addKeyframe()` succeeded.                                    |
| `keyframe_removed`   | `trackId`, `keyframeId`, `source: "programmatic"`             | `removeKeyframe()` succeeded.                                 |
| `clip_drag`          | `trackId`, `clipId`, `time`, `source: "pointer"`              | During clip move/resize (per `pointermove`). `time` is the clip's new `start`. |
| `clip_change`        | `trackId`, `clipId`, `time`, `oldTime`, `source`              | Clip drag/resize committed (`pointerup`). `oldTime` is the pre-drag `start`. |
| `clip_added`         | `trackId`, `clipId`, `time`, `source: "programmatic"`         | `addClip()` succeeded.                                        |
| `clip_removed`       | `trackId`, `clipId`, `source: "programmatic"`                 | `removeClip()` succeeded.                                     |
| `track_added`        | `trackId`, `source: "programmatic"`                           | `addTrack()` succeeded.                                       |
| `track_removed`      | `trackId`, `source: "programmatic"`                           | `removeTrack()` succeeded.                                    |
| `track_change`       | `trackId`, `source: "programmatic"`                           | `toggleTrackVisible()` or `toggleTrackLock()` called.         |
| `selection_change`   | `trackId?`, `keyframeId?`, `clipId?`, `source`                | Selection changed (click, additive click, or `clearSelection()`). |

```ts
editor.on("keyframe_change", ({ trackId, keyframeId, time, oldTime }) =>
  persistKeyframe(trackId, keyframeId, time, oldTime),
);
editor.on("playback_tick", ({ playhead }) => updateUi(playhead));
editor.on("selection_change", ({ keyframeId, clipId }) =>
  updateInspector(keyframeId ?? clipId),
);
```

The `source` field is one of `"pointer" | "keyboard" | "programmatic" |
"playback"`.

---

## CSS Custom Properties

All defined on `.ate-root` (override on the host element or any ancestor of
the root to retheme):

| Variable            | Default                  | Description                                            |
|---------------------|--------------------------|--------------------------------------------------------|
| `--ate-bg`          | `#151519`                | Root background.                                       |
| `--ate-surface`     | `#1E1E24`                | Left panel + toolbar background.                       |
| `--ate-surface-2`   | `#28282E`                | Inputs + ruler canvas background.                      |
| `--ate-surface-3`   | `#34343C`                | Hover state on track-label buttons.                    |
| `--ate-border`      | `#3A3A42`                | Dividers, input borders.                               |
| `--ate-text`        | `#F4F1FF`                | Primary text.                                          |
| `--ate-muted`       | `#888894`                | Labels, inactive controls, minor ruler ticks.          |
| `--ate-accent`      | `#D9FF66`                | Lemon Signal — focus ring, active state, hover.        |
| `--ate-accent-dim`  | `rgba(217,255,102,0.12)` | Active button background.                              |
| `--ate-danger`      | `#FF5C5C`                | Playhead, locked-track indicator, remove.              |
| `--ate-warn`        | `#FFD36B`                | Warning variant (alias of `--ate-kf`).                 |
| `--ate-ok`          | `#8FE3A5`                | "Visible" indicator, play button text.                 |
| `--ate-info`        | `#7DB8E8`                | Default clip border/fill tint.                         |
| `--ate-kf`          | `#FFD36B`                | Default keyframe diamond fill.                         |
| `--ate-kf-selected` | `#D9FF66`                | Selected keyframe fill.                                |
| `--ate-playhead`    | `#FF5C5C`                | Playhead line + head label background.                 |
| `--ate-radius`      | `6px`                    | Root border radius.                                    |

---

## Examples

### Minimal editor with one keyframe track

```ts
const editor = new AnimationTrackEditor(host, { duration: 3 });
const track = editor.addTrack("keyframe", { name: "Opacity" });
editor.addKeyframe(track, 0, 0);
editor.addKeyframe(track, 1.5, 1);
editor.addKeyframe(track, 3, 0);
```

### Snapping + read-only mode

```ts
const editor = new AnimationTrackEditor(host, {
  duration: 10,
  pixelsPerSecond: 200,
  snapInterval: 0.25,
  readOnly: true, // drag/scrub/keyboard editing disabled
});
```

### Programmatic playback control

```ts
editor.setPlayhead(1.5, "programmatic");
editor.play();
// ... later
editor.pause();
editor.stop(); // pause + reset to 0
editor.toggleLoop();
editor.setZoom(300, "programmatic");
```

### Reacting to edits

```ts
editor.on("keyframe_change", ({ trackId, keyframeId, time, oldTime }) => {
  sendToBackend({ trackId, keyframeId, time, oldTime });
});
editor.on("clip_change", ({ trackId, clipId, time }) => {
  sendToBackend({ trackId, clipId, start: time });
});
editor.on("track_removed", ({ trackId }) => dropFromBackend(trackId));
```

### Wiring `setProperty` to a host store

```ts
// `setProperty` is the generic channel — useful when the host owns a single
// state object and wants to push updates without knowing each setter.
editor.setProperty("duration", 20);
editor.setProperty("pixelsPerSecond", 150);
editor.setProperty("playhead", 2.5);
editor.setProperty("playing", true);
editor.setProperty("loop", true);
editor.setProperty("speed", 1.5);
editor.setProperty("snapInterval", 0.1);
editor.setProperty("readOnly", false);
editor.setProperty("tracks", newTracks);
```

### Pointer + keyboard interaction

| Action                | Effect                                                       |
|-----------------------|--------------------------------------------------------------|
| Click + drag the ruler | Scrub the playhead.                                         |
| Click a keyframe      | Toggle its selection (clears others unless Shift held).      |
| Drag a keyframe       | Move it (snaps if `snapInterval > 0`; clamped to timeline). |
| Click a clip          | Toggle its selection.                                        |
| Drag a clip body      | Move the clip.                                               |
| Drag a clip edge      | Resize that edge (min 0.05s width).                          |
| `Space`               | Play / pause.                                                |
| `ArrowLeft`/`Right`   | Step playhead by 0.1s (Shift = 1s).                          |
| `Home`/`End`          | Jump to 0 / `duration`.                                      |
| `Delete`/`Backspace`  | Remove all selected keyframes and clips.                     |
| `Escape`              | Clear selection.                                             |

---

## Integration Notes

**When to use:** any timeline-style animation or media editing UI — keyframe
property curves, NLE-style clip arrangement, audio scrubbing, motion preview.

**When not to use:** if you only need a single value slider, use a `slider`
component instead. If you need full curve-editing (Bezier handles on each
keyframe), this editor only stores a discrete `transition` enum per keyframe
— extend `renderKeyframe` and the `Keyframe.transition` type to add handles.

**Alternatives:** for a single-track scrubber without editing, a `slider` plus
a custom playhead is lighter. For multi-track audio specifically, a dedicated
waveform component would be more appropriate (this editor stores clips as
labeled boxes only — no audio playback).

**Performance:** `playback_tick` fires every RAF frame during playback. Avoid
heavy synchronous work in the handler. The `ResizeObserver` only redraws the
ruler canvas, not the full DOM.

**Horizontal overflow:** there is no horizontal pan. Long timelines at low
zoom will clip on the right. Either raise `pixelsPerSecond` or shorten
`duration`. See AGENT.md "Known Issues".

**Accessibility:** the root has `tabindex="0"` and the toolbar buttons have
`aria-label`s. Individual keyframes and clips are not keyboard-focusable as
separate elements; use the keyboard shortcuts above to navigate and edit.

**Reduced motion:** the `@media (prefers-reduced-motion: reduce)` query
disables keyframe/clip hover transitions. Playback itself is not affected
(it's RAF-driven, not CSS).

**Theming:** override the `--ate-*` variables on the host element (or any
ancestor of the root). The accent defaults to Lemon Signal `#D9FF66`.
