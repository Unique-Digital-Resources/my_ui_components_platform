# AGENT.md — AnimationTrackEditor

Contribution guide for `src/lib/components/animation-track-editor/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Component

**AnimationTrackEditor** — a timeline-based animation track editor (vanilla
TypeScript, no framework). Inspired by Godot's animation timeline and DCC
tools. Supports two track types: **keyframe tracks** (discrete keyframes with
values and a transition curve to the next key) and **clip tracks** (resizable
boxes for audio/image/video clips). Features: ruler with tick marks + time
labels (seconds), scrubbable playhead, playback (play/pause/stop/loop/speed),
zoom (pixels per second), keyframe drag with snapping + selection + add/remove,
clip drag + dual-edge resize + selection + add/remove, track management
(add/remove/visibility/lock), tracks grouped by owner, and keyboard control
(Space, arrows, Home/End, Delete, Escape).

## File Structure

```
src/lib/components/animation-track-editor/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── animation-track-editor.ts  ← the AnimationTrackEditor class
└── index.ts            ← barrel: class, types
```

## Architecture

DOM-based layout with a single small `<canvas>` reserved for the ruler tick
marks. Everything else (track rows, keyframes, clips, playhead, grid lines) is
real DOM, which keeps hit-testing cheap and accessibility hooks (focusable
root, `aria-label`s on toolbar buttons) easy.

The root is `<div class="ate-root" tabindex="0">` and contains, top to bottom:

1. **Toolbar** (`ate-toolbar`, optional via `showToolbar`) — transport buttons
   (Stop / Prev key / Play-Pause / Next key / Loop), a Speed `<input type=number>`,
   an End (duration) `<input type=number>`, a Zoom `<input type=range>`, a
   spacer, "Add keyframe track" / "Add clip track" buttons, and a
   `data-time-info` readout showing `playhead / duration`.
2. **Body** (`ate-body`, flex row):
   - **Left panel** (`ate-left`, fixed 200px) — a header reading "Tracks" and
     a vertically-scrollable list of track labels (`ate-track-label`). Each
     label shows the owner (uppercase, if set), the track name, and three
     buttons: visibility (eye), lock, and remove (trash).
   - **Right panel** (`ate-right`, flex 1) — the ruler (`ate-ruler` with a
     `<canvas>` inside), a vertically-scrollable track area
     (`ate-right-scroll` > `ate-track-area` > one `ate-track-row` per track),
     and the `ate-playhead-overlay` (a 2px-wide div spanning the ruler + track
     area, positioned at `playhead * pixelsPerSecond` px).

### Style injection

`injectStyles()` is idempotent — guarded by
`document.getElementById("animation-track-editor-styles")`. The block defines
all `--ate-*` custom properties on `.ate-root` so they cascade only inside the
editor. The `@media (prefers-reduced-motion: reduce)` query disables
keyframe/clip transitions.

### Event system

Listeners are stored in `Map<string, Set<AnimationTrackEditorHandler>>`. `emit()`
spreads the payload, injects a `type` field equal to the event name, and
invokes each handler inside a `try { ... } catch (e) { console.error(e); }`
block so a throwing handler doesn't break the rest. `on()`/`off()` add/remove
handlers from the per-event `Set`.

### Pointer interaction model

`dragMode` is a single field that can be `"none" | "keyframe" | "clip-move" |
"clip-resize-left" | "clip-resize-right" | "scrub"`. Each gesture starts in a
`pointerdown` handler on the relevant element (ruler / keyframe / clip /
clip-resize handle), which:

1. Records `dragMode`, `dragTrackId`, `dragItemId`, `dragStartX`, and the
   pre-gesture values (`dragOrigTime` for keyframes; `dragOrigStart` +
   `dragOrigEnd` for clips).
2. Attaches `pointermove` + `pointerup` listeners to `window` (so the drag
   continues outside the editor).
3. On `pointermove`, computes `dx = (clientX - dragStartX) / pixelsPerSecond`
   and applies it to the in-memory model, snaps via `snapTime()` (only if
   `snapInterval > 0`), clamps to `[0, duration]`, updates the DOM `left`/
   `width` inline (no full re-render), and emits `keyframe_drag` /
   `clip_drag`.
4. On `pointerup`, removes the window listeners and emits the committed
   `keyframe_change` / `clip_change` event (with `oldTime`/`oldTime`).

Click vs. drag is disambiguated by the click handler — `pointerdown` always
starts a potential drag, and the click handler (which fires after `pointerup`
when the pointer didn't move much) does the selection toggle. The two
listeners are attached independently.

Locked tracks and `readOnly: true` both block pointer handlers at the source
(no listener attached, or early return inside the handler).

### Keyboard handling

`onKeyDown` on the root handles: `Space` (toggle play), `ArrowLeft`/`ArrowRight`
(step 0.1s, or 1s with Shift), `Home`/`End` (jump to 0 / duration), `Delete`/
`Backspace` (remove all selected keyframes and clips across all tracks),
`Escape` (clear selection). `readOnly: true` short-circuits the handler.

### Playback

`play()` sets `opts.playing = true`, records `lastFrameTime = performance.now()`,
and starts a `requestAnimationFrame` loop in `startPlayback()`. Each tick
computes `dt = (now - lastFrameTime) / 1000`, advances `playhead += dt * speed`,
loops to 0 or pauses at `duration` depending on `loop`, calls `updatePlayhead()`
(repositions the overlay + updates toolbar state), and emits `playback_tick`
with `source: "playback"`. `pause()` cancels the RAF. `destroy()` calls
`stopPlayback()` to cancel any in-flight RAF.

### Scroll sync

`rightScroll`'s `scroll` event mirrors `scrollTop` into `leftScroll` so the
track labels stay aligned with their rows. Horizontal scroll is **not**
supported — `.ate-right-scroll` is `overflow-x: hidden`. Long timelines at low
zoom are clipped at the right edge (see Known Issues).

### Zoom

`setZoom(pps)` re-renders only what's needed: redraws the ruler canvas, redraws
grid lines, re-positions every keyframe/clip element via inline `style.left`/
`style.width` (queried by `data-kf-id` / `data-clip-id`), and re-positions the
playhead. No full DOM rebuild. Emits `zoom_change`.

### Public API surface

```ts
class AnimationTrackEditor {
  constructor(container: HTMLElement, options?: AnimationTrackEditorOptions)

  // Playhead
  setPlayhead(time: number, source?: "pointer" | "keyboard" | "programmatic" | "playback"): void
  getPlayhead(): number

  // Playback
  togglePlay(): void
  play(): void
  pause(): void
  stop(): void
  toggleLoop(): void
  isPlaying(): boolean

  // Navigation
  nextKey(): void
  prevKey(): void

  // Zoom
  setZoom(pps: number, source?: "pointer" | "keyboard" | "programmatic"): void
  getZoom(): number

  // Selection
  selectKeyframe(trackId: string, kfId: string, additive: boolean): void
  selectClip(trackId: string, clipId: string, additive: boolean): void
  clearSelection(): void

  // Tracks
  addTrack(type: TrackType, partial?: Partial<Track>): string
  removeTrack(trackId: string): void
  toggleTrackVisible(trackId: string): void
  toggleTrackLock(trackId: string): void
  getTracks(): Track[]
  setTracks(tracks: Track[]): void

  // Keyframes
  addKeyframe(trackId: string, time?: number, value?: number): string
  removeKeyframe(trackId: string, kfId: string): void

  // Clips
  addClip(trackId: string, start?: number, end?: number): string
  removeClip(trackId: string, clipId: string): void

  // Misc
  getDuration(): number
  setProperty(name: string, value: unknown): void
  on(event: string, handler: AnimationTrackEditorHandler): void
  off(event: string, handler: AnimationTrackEditorHandler): void
  destroy(): void
}
```

Emitted events: `playhead_change`, `playback_change`, `playback_tick`,
`loop_change`, `zoom_change`, `keyframe_drag`, `keyframe_change`,
`keyframe_added`, `keyframe_removed`, `clip_drag`, `clip_change`, `clip_added`,
`clip_removed`, `track_added`, `track_removed`, `track_change`,
`selection_change`. (See SKILL.md for payloads.)

### Internal state

Key instance fields:

- `opts: Required<AnimationTrackEditorOptions>` — all options normalized with
  defaults.
- `tracks: Track[]` — the source of truth for track data. Each call to
  `getTracks()` returns deep clones; `setTracks()` shallow-clones (see Known
  Issues).
- `trackRowEls: Map<string, HTMLElement>` — trackId → the `ate-track-row` div.
  Used by `setZoom` and `updateSelectionDom` to find elements without a full
  re-render.
- `dragMode` / `dragTrackId` / `dragItemId` / `dragStartX` / `dragOrigTime` /
  `dragOrigStart` / `dragOrigEnd` — the active gesture snapshot. Cleared on
  `pointerup`.
- `playbackRAF: number | null` — the active `requestAnimationFrame` handle, or
  null. `lastFrameTime` anchors the dt computation.
- `resizeObserver: ResizeObserver | null` — watches `this.root`; redraws the
  ruler on container resize.
- `listeners: Map<string, Set<AnimationTrackEditorHandler>>` — event
  subscriptions.
- `_destroyed: boolean` — idempotent-`destroy()` guard. Most public methods
  early-return when true.

### CSS custom properties

All defined on `.ate-root` in `injectStyles()`:

| Variable            | Default                  | Purpose                                            |
|---------------------|--------------------------|----------------------------------------------------|
| `--ate-bg`          | `#151519`                | Root background.                                   |
| `--ate-surface`     | `#1E1E24`                | Left panel + toolbar background.                   |
| `--ate-surface-2`   | `#28282E`                | Inputs + ruler canvas background.                  |
| `--ate-surface-3`   | `#34343C`                | Hover state on track-label buttons.                |
| `--ate-border`      | `#3A3A42`                | Dividers, input borders.                           |
| `--ate-text`        | `#F4F1FF`                | Primary text.                                      |
| `--ate-muted`       | `#888894`                | Labels, inactive controls, minor ruler ticks.      |
| `--ate-accent`      | `#D9FF66`                | Lemon Signal — focus ring, active state, hover.    |
| `--ate-accent-dim`  | `rgba(217,255,102,0.12)` | Active button background.                          |
| `--ate-danger`      | `#FF5C5C`                | Playhead color, locked-track indicator, remove.    |
| `--ate-warn`        | `#FFD36B`                | Default keyframe fill (`--ate-kf`).                |
| `--ate-ok`          | `#8FE3A5`                | "Visible" indicator on the eye button, play btn.   |
| `--ate-info`        | `#7DB8E8`                | Default clip border/fill tint.                     |
| `--ate-kf`          | `#FFD36B`                | Default keyframe diamond fill.                     |
| `--ate-kf-selected` | `#D9FF66`                | Selected keyframe fill.                            |
| `--ate-playhead`    | `#FF5C5C`                | Playhead line + head label background.             |
| `--ate-radius`      | `6px`                    | Root border radius.                                |

## Coding Conventions

- TypeScript strict, named exports.
- `injectStyles()` idempotent — guarded by `document.getElementById(STYLE_ID)`.
- `destroy()` is idempotent — guarded by a `_destroyed` flag; cancels the
  playback RAF, disconnects the `ResizeObserver`, clears listeners, and empties
  the container.
- No React/framework imports in this folder.
- No emojis.
- All public mutating methods early-return on `_destroyed`.
- Pointer drag listeners attach to `window`, not the element, so drags continue
  outside the editor.
- `emit()` wraps each handler in `try/catch` so one bad handler doesn't break
  the rest.

## Known Issues

- **No horizontal pan/scroll.** `.ate-right-scroll` is `overflow-x: hidden`
  and `.ate-track-area` is `width: 100%`. Keyframes and clips positioned past
  `containerWidth / pixelsPerSecond` are clipped and unreachable. There's no
  pan gesture. For long timelines, raise `pixelsPerSecond` (zoom in) or
  shorten `duration`.
- **`setTracks()` shallow-clones.** It does `tracks.map(t => ({ ...t }))` —
  the inner `keyframes`/`clips` arrays are shared by reference with the
  caller's objects. `getTracks()` deep-clones; the asymmetry is a foot-gun.
  Mutating the caller's original arrays after `setTracks()` will silently
  affect the editor.
- **`nextKey()` always jumps.** The condition
  `if (next < this.opts.duration || next === this.opts.duration)` is a
  tautology — `next` is initialized to `duration` and only ever shrinks, so
  the branch always runs. When there is no key after the playhead, the
  playhead jumps to `duration`. This matches the inline comment ("If there's
  no key after playhead, jump to end") but the conditional is misleading.
- **`playback_tick` fires every RAF frame** (typically 60 Hz, faster on high-
  refresh displays). Hosts that do expensive work per tick (e.g. re-rendering
  a React tree) should throttle or debounce.
- **`setProperty("readOnly")` and `setTracks()` trigger a full `render()`** —
  the entire DOM is rebuilt, the playhead overlay is re-shown, and the ruler
  is redrawn on the next frame. Acceptable for occasional calls, expensive in
  a tight loop.
- **Delete key cascades.** `onKeyDown("Delete")` iterates every track and
  removes every selected keyframe/clip. Each `removeKeyframe`/`removeClip`
  call re-renders and emits its own `*_removed` event, so deleting N items
  fires N events and N renders. A batched variant would be cheaper.
- **Selection is toggle-only.** `selectKeyframe`/`selectClip` always flip the
  clicked item's `selected` flag (after clearing others, unless `additive`).
  There's no "set selection to exactly this set" API — use `clearSelection()`
  + iterate, or mutate `getTracks()` and `setTracks()`.
- **`setProperty` does not support `rowHeight`, `showRuler`, or
  `showToolbar`.** Changing those requires a fresh constructor (or a manual
  `render()`, which is private).

## Debugging Tips

1. **Blank ruler?** `drawRuler()` reads `getBoundingClientRect()` on the
   canvas. If the container (or any ancestor) has `display: none` or zero
   height at construct time, the canvas is 0×0 and the ruler stays blank. The
   `ResizeObserver` will redraw when the container becomes visible, but only
   if the size actually changes.
2. **Missing keyframes?** Confirm `pixelsPerSecond > 0` (it's clamped to a min
   of 10 inside `setZoom`, but the constructor accepts anything) and that
   `kf.time` is within `[0, duration]`. Keyframes outside that range are
   rendered off-screen and clipped.
3. **Want per-frame updates?** Use `playback_tick` (fires every RAF frame
   during playback), not `playhead_change` (only fires when the value
   actually changes — which is every frame during playback anyway, but
   `playback_tick` is the documented channel).
4. **Inspecting drag state.** Set a breakpoint in `onKeyframePointerDown` /
   `onClipPointerDown`. The `dragMode`, `dragTrackId`, `dragItemId`,
   `dragOrigTime`, `dragOrigStart`, `dragOrigEnd` fields are the gesture
   snapshot. The corresponding `data-*` attributes
   (`data-track-id`, `data-kf-id`, `data-clip-id`) are stable hooks for
   querying the live DOM.
5. **Stable DOM hooks for tests.** Beyond the per-item `data-*` attributes,
   the toolbar exposes `data-play-btn`, `data-loop-btn`, and `data-time-info`
   for assertions. The root has `class="ate-root"` and `tabindex="0"`.
6. **Playback stuck?** `play()` early-returns if `opts.playing` is already
   true. If the RAF loop died (e.g. the tab was backgrounded and the RAF was
   throttled to 0), call `pause()` then `play()` to reset `lastFrameTime`.
