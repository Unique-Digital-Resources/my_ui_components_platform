# AGENT.md — Animation Track Editor

A timeline-based animation track editor inspired by Godot's animation timeline + DCC tools. Supports keyframe tracks and clip (resizable box) tracks.

## Architecture
- `animation-track-editor.ts` — `AnimationTrackEditor` class. Split layout: left panel (track labels + controls) + right panel (ruler + track area + playhead overlay).
- **Two track types**: `keyframe` (discrete diamond markers with value + transition) and `clip` (resizable boxes for audio/video/images).
- **Ruler**: Canvas-drawn tick marks + time labels. Click/drag to scrub.
- **Playhead**: Red vertical line spanning the track area. Real-time position display.
- **Playback**: `requestAnimationFrame` loop with play/pause/reverse/loop/speed.
- **Zoom**: Pixels-per-second control. Re-positions all keyframes/clips on change.
- **Drag**: Keyframes drag horizontally with snapping. Clips drag to move + resize handles on both edges.
- **Selection**: Click to select, shift-click for additive. Delete removes selected.
- **Track management**: Add/remove tracks, toggle visibility, toggle lock.
- **Keyboard**: Space (play/pause), Arrows (step), Home/End, Delete, Escape.
- Scoped CSS (`.ate-` prefix); only the brand lemon is used as the accent.
