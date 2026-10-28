/**
 * AnimationTrackEditor — a timeline-based animation track editor (vanilla TS).
 *
 * Inspired by Godot's animation timeline + DCC tools. Supports two track types:
 *   - **Keyframe tracks**: discrete keyframes with values and transition paths.
 *   - **Clip tracks**: resizable boxes (for audio, image, video clips).
 *
 * Features:
 *   - Ruler with tick marks + time labels (seconds)
 *   - Playhead with scrubbing (click/drag ruler)
 *   - Playback: play, pause, reverse, loop, speed control
 *   - Zoom (pixels per second) + horizontal pan
 *   - Keyframe drag (with snapping), selection, add/remove
 *   - Clip drag + resize (both edges), selection, add/remove
 *   - Track management: add/remove, visibility, lock, reorder
 *   - Grouped tracks (by owner)
 *   - Keyboard: Space (play/pause), Left/Right (step), Home/End
 *   - Events for all changes
 */

// ---- Public types ----

export type TrackType = "keyframe" | "clip";

export interface Keyframe {
  id: string;
  time: number; // seconds
  value: number;
  /** Transition curve to the NEXT keyframe. */
  transition?: "linear" | "ease" | "ease-in" | "ease-out" | "step" | "hold";
  selected?: boolean;
}

export interface Clip {
  id: string;
  start: number; // seconds
  end: number;   // seconds
  label?: string;
  color?: string;
  selected?: boolean;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  owner?: string;
  keyframes?: Keyframe[];
  clips?: Clip[];
  visible?: boolean;
  locked?: boolean;
  color?: string;
}

export interface AnimationTrackEditorOptions {
  tracks?: Track[];
  duration?: number;     // total timeline duration in seconds
  pixelsPerSecond?: number; // zoom (px/s)
  playhead?: number;     // current playhead position (seconds)
  playing?: boolean;
  loop?: boolean;
  speed?: number;        // playback speed multiplier
  rowHeight?: number;
  snapInterval?: number; // seconds; 0 = no snap
  showRuler?: boolean;
  showToolbar?: boolean;
  readOnly?: boolean;
}

export interface AnimationTrackEditorEventPayload {
  type?: string;
  trackId?: string;
  keyframeId?: string;
  clipId?: string;
  time?: number;
  oldTime?: number;
  value?: number;
  oldValue?: number;
  playhead?: number;
  playing?: boolean;
  pixelsPerSecond?: number;
  source?: "pointer" | "keyboard" | "programmatic" | "playback";
  reason?: string;
}

export type AnimationTrackEditorHandler = (payload: AnimationTrackEditorEventPayload) => void;

// ---- Constants ----

const STYLE_ID = "animation-track-editor-styles";
const DEFAULT_PPS = 100; // pixels per second
const DEFAULT_DURATION = 10; // seconds
const DEFAULT_ROW_HEIGHT = 36;

// ---- Style injection ----

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.ate-root {
  --ate-bg: #151519;
  --ate-surface: #1E1E24;
  --ate-surface-2: #28282E;
  --ate-surface-3: #34343C;
  --ate-border: #3A3A42;
  --ate-text: #F4F1FF;
  --ate-muted: #888894;
  --ate-accent: #D9FF66;
  --ate-accent-dim: rgba(217,255,102,0.12);
  --ate-danger: #FF5C5C;
  --ate-warn: #FFD36B;
  --ate-ok: #8FE3A5;
  --ate-info: #7DB8E8;
  --ate-kf: #FFD36B;
  --ate-kf-selected: #D9FF66;
  --ate-playhead: #FF5C5C;
  --ate-radius: 6px;
  font-family: inherit;
  color: var(--ate-text);
  background: var(--ate-bg);
  border: 1px solid var(--ate-border);
  border-radius: var(--ate-radius);
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
.ate-root * { box-sizing: border-box; }

.ate-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--ate-border);
  background: var(--ate-surface);
  flex-wrap: wrap;
}
.ate-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--ate-border);
  border-radius: 4px;
  background: var(--ate-surface-2);
  color: var(--ate-muted);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: color .12s, border-color .12s, background .12s;
  white-space: nowrap;
}
.ate-btn:hover { color: var(--ate-text); border-color: var(--ate-accent); }
.ate-btn:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--ate-accent) 40%, transparent); }
.ate-btn svg { width: 12px; height: 12px; }
.ate-btn.ate-active { color: var(--ate-accent); border-color: var(--ate-accent); background: var(--ate-accent-dim); }
.ate-btn.ate-play { color: var(--ate-ok); }
.ate-sep { width: 1px; height: 20px; background: var(--ate-border); margin: 0 2px; }
.ate-input {
  height: 24px;
  width: 50px;
  padding: 0 4px;
  border: 1px solid var(--ate-border);
  border-radius: 4px;
  background: var(--ate-surface-2);
  color: var(--ate-text);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  text-align: center;
  outline: none;
}
.ate-input:focus { border-color: var(--ate-accent); }
.ate-label { font-size: 10px; color: var(--ate-muted); white-space: nowrap; }
.ate-spacer { flex: 1 1 auto; }

.ate-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.ate-left {
  flex: 0 0 auto;
  width: 200px;
  display: flex;
  flex-direction: column;
  border-right: 2px solid var(--ate-border);
  background: var(--ate-surface);
  overflow: hidden;
}
.ate-left-header {
  flex: 0 0 auto;
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-bottom: 1px solid var(--ate-border);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ate-muted);
}
.ate-left-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.ate-left-scroll::-webkit-scrollbar { display: none; }
.ate-track-label {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  border-bottom: 1px solid var(--ate-border);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  transition: background .12s;
}
.ate-track-label:hover { background: var(--ate-surface-2); }
.ate-track-label.ate-hidden { opacity: 0.4; }
.ate-track-owner {
  font-size: 9px;
  color: var(--ate-muted);
  font-weight: 600;
  text-transform: uppercase;
}
.ate-track-name {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ate-text);
}
.ate-track-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--ate-muted);
  cursor: pointer;
  border-radius: 3px;
  outline: none;
  flex: 0 0 auto;
  font-size: 9px;
}
.ate-track-btn:hover { color: var(--ate-text); background: var(--ate-surface-3); }
.ate-track-btn.ate-on { color: var(--ate-ok); }
.ate-track-btn.ate-lock-on { color: var(--ate-danger); }

.ate-right {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.ate-ruler {
  flex: 0 0 auto;
  height: 32px;
  position: relative;
  background: var(--ate-surface-2);
  border-bottom: 1px solid var(--ate-border);
  cursor: pointer;
  overflow: hidden;
}
.ate-ruler canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.ate-right-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  scrollbar-width: thin;
}
.ate-right-scroll::-webkit-scrollbar { width: 8px; }
.ate-right-scroll::-webkit-scrollbar-track { background: transparent; }
.ate-right-scroll::-webkit-scrollbar-thumb { background: var(--ate-border); border-radius: 999px; }

.ate-track-area {
  position: relative;
  width: 100%;
}
.ate-track-row {
  position: relative;
  border-bottom: 1px solid var(--ate-border);
  overflow: hidden;
}
.ate-track-row.ate-hidden { opacity: 0.3; }
.ate-grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--ate-border);
  opacity: 0.3;
  pointer-events: none;
}

.ate-keyframe {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%) rotate(45deg);
  background: var(--ate-kf);
  border: 1px solid rgba(0,0,0,0.4);
  cursor: grab;
  z-index: 2;
  transition: background .1s;
}
.ate-keyframe:hover { background: var(--ate-accent); }
.ate-keyframe.ate-selected { background: var(--ate-kf-selected); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ate-accent) 40%, transparent); }
.ate-keyframe.ate-dragging { cursor: grabbing; z-index: 10; }
.ate-keyframe.ate-locked { cursor: not-allowed; opacity: 0.5; }

.ate-clip {
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--ate-info) 30%, var(--ate-surface-3));
  border: 1px solid var(--ate-info);
  cursor: grab;
  z-index: 2;
  display: flex;
  align-items: center;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--ate-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  transition: border-color .1s, box-shadow .1s;
}
.ate-clip:hover { border-color: var(--ate-accent); }
.ate-clip.ate-selected { border-color: var(--ate-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ate-accent) 40%, transparent); }
.ate-clip.ate-dragging { cursor: grabbing; z-index: 10; }
.ate-clip.ate-locked { cursor: not-allowed; opacity: 0.5; }
.ate-clip-resize {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  z-index: 3;
}
.ate-clip-resize-left { left: 0; }
.ate-clip-resize-right { right: 0; }
.ate-clip-resize:hover { background: var(--ate-accent); }

.ate-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--ate-playhead);
  z-index: 20;
  pointer-events: none;
}
.ate-playhead-head {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  height: 18px;
  min-width: 40px;
  padding: 0 4px;
  background: var(--ate-playhead);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
}

.ate-playhead-overlay {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--ate-playhead);
  z-index: 20;
  pointer-events: none;
}

.ate-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 80px;
  color: var(--ate-muted);
  font-size: 12px;
  font-style: italic;
}

@media (prefers-reduced-motion: reduce) {
  .ate-keyframe, .ate-clip { transition: none; }
}
`;
  document.head.appendChild(el);
}

// ---- Icons ----

const ICON_PLAY = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 3l9 5-9 5z"/></svg>`;
const ICON_PAUSE = `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="3" height="10"/><rect x="9" y="3" width="3" height="10"/></svg>`;
const ICON_STOP = `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="4" width="8" height="8"/></svg>`;
const ICON_PREV = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M11 3L5 8l6 5z"/><rect x="3" y="3" width="1.5" height="10"/></svg>`;
const ICON_NEXT = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l6 5-6 5z"/><rect x="11.5" y="3" width="1.5" height="10"/></svg>`;
const ICON_REWIND = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11 4L6 8l5 4M7 4L2 8l5 4"/></svg>`;
const ICON_FORWARD = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5 4l5 4-5 4M9 4l5 4-5 4"/></svg>`;
const ICON_LOOP = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h8a2 2 0 0 1 2 2v1M3 6l2-2M3 6l2 2M13 10H5a2 2 0 0 1-2-2V7M13 10l-2-2M13 10l-2 2"/></svg>`;
const ICON_PLUS = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10M6.5 4V2.5h3V4M5 4l.7 9h4.6L11 4"/></svg>`;
const ICON_EYE = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>`;
const ICON_LOCK = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>`;
const ICON_KF = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2L14 8l-6 6-6-6z"/></svg>`;
const ICON_CLIP = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="4" width="12" height="8" rx="1"/><path d="M6 4v8M10 4v8"/></svg>`;

// ---- Utilities ----

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function snapTime(t: number, snap: number): number {
  if (!snap || snap <= 0) return t;
  return Math.round(t / snap) * snap;
}

// ---- Component ----

export class AnimationTrackEditor {
  private container: HTMLElement;
  private root!: HTMLDivElement;
  private rulerCanvas!: HTMLCanvasElement;
  private rightScroll!: HTMLDivElement;
  private leftScroll!: HTMLDivElement;
  private trackArea!: HTMLDivElement;
  private playheadEl!: HTMLDivElement;
  private playheadOverlay!: HTMLDivElement;
  private opts: Required<AnimationTrackEditorOptions>;
  private tracks: Track[];
  private listeners = new Map<string, Set<AnimationTrackEditorHandler>>();
  private _destroyed = false;
  private trackRowEls = new Map<string, HTMLElement>();
  private resizeObserver: ResizeObserver | null = null;
  private playbackRAF: number | null = null;
  private lastFrameTime = 0;

  // Drag state
  private dragMode: "none" | "keyframe" | "clip-move" | "clip-resize-left" | "clip-resize-right" | "scrub" = "none";
  private dragTrackId: string | null = null;
  private dragItemId: string | null = null;
  private dragStartX = 0;
  private dragOrigTime = 0;
  private dragOrigStart = 0;
  private dragOrigEnd = 0;

  constructor(container: HTMLElement, options: AnimationTrackEditorOptions = {}) {
    this.container = container;
    injectStyles();
    this.opts = {
      tracks: options.tracks ?? [],
      duration: options.duration ?? DEFAULT_DURATION,
      pixelsPerSecond: options.pixelsPerSecond ?? DEFAULT_PPS,
      playhead: options.playhead ?? 0,
      playing: options.playing ?? false,
      loop: options.loop ?? false,
      speed: options.speed ?? 1,
      rowHeight: options.rowHeight ?? DEFAULT_ROW_HEIGHT,
      snapInterval: options.snapInterval ?? 0,
      showRuler: options.showRuler ?? true,
      showToolbar: options.showToolbar ?? true,
      readOnly: options.readOnly ?? false,
    };
    this.tracks = (this.opts.tracks as Track[]).map(t => ({ ...t }));
    this.render();

    // Sync scrolls
    this.rightScroll.addEventListener("scroll", () => {
      this.leftScroll.scrollTop = this.rightScroll.scrollTop;
    });

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => this.drawRuler());
    this.resizeObserver.observe(this.root);

    // Start playback if needed
    if (this.opts.playing) this.startPlayback();
  }

  // ---- Rendering ----

  private render(): void {
    if (this._destroyed) return;
    this.trackRowEls.clear();

    const root = document.createElement("div");
    root.className = "ate-root";
    root.tabIndex = 0;

    if (this.opts.showToolbar) root.appendChild(this.renderToolbar());

    const body = document.createElement("div");
    body.className = "ate-body";

    // Left panel
    const left = document.createElement("div");
    left.className = "ate-left";
    const leftHeader = document.createElement("div");
    leftHeader.className = "ate-left-header";
    leftHeader.textContent = "Tracks";
    left.appendChild(leftHeader);

    const leftScroll = document.createElement("div");
    leftScroll.className = "ate-left-scroll";
    for (const track of this.tracks) {
      leftScroll.appendChild(this.renderTrackLabel(track));
    }
    left.appendChild(leftScroll);
    this.leftScroll = leftScroll;

    // Right panel
    const right = document.createElement("div");
    right.className = "ate-right";

    // Ruler
    if (this.opts.showRuler) {
      const ruler = document.createElement("div");
      ruler.className = "ate-ruler";
      const canvas = document.createElement("canvas");
      ruler.appendChild(canvas);
      ruler.addEventListener("pointerdown", (e) => this.onRulerPointerDown(e));
      this.rulerCanvas = canvas;
      right.appendChild(ruler);
    }

    // Scroll area for tracks
    const rightScroll = document.createElement("div");
    rightScroll.className = "ate-right-scroll";
    const trackArea = document.createElement("div");
    trackArea.className = "ate-track-area";

    for (const track of this.tracks) {
      trackArea.appendChild(this.renderTrackRow(track));
    }
    rightScroll.appendChild(trackArea);
    this.rightScroll = rightScroll;
    this.trackArea = trackArea;
    right.appendChild(rightScroll);

    // Playhead overlay (spans ruler + tracks)
    const playheadOverlay = document.createElement("div");
    playheadOverlay.className = "ate-playhead-overlay";
    playheadOverlay.style.display = "none"; // shown after layout
    right.appendChild(playheadOverlay);
    this.playheadOverlay = playheadOverlay;

    body.appendChild(left);
    body.appendChild(right);
    root.appendChild(body);
    this.container.innerHTML = "";
    this.container.appendChild(root);
    this.root = root;

    // Draw ruler + position playhead
    requestAnimationFrame(() => {
      if (!this._destroyed) {
        this.drawRuler();
        this.drawGridLines();
        this.updatePlayhead();
      }
    });

    // Keyboard
    root.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  private renderToolbar(): HTMLElement {
    const tb = document.createElement("div");
    tb.className = "ate-toolbar";

    // Transport
    const stopBtn = this.toolBtn(ICON_STOP, "Stop", () => this.stop());
    tb.appendChild(stopBtn);
    const prevBtn = this.toolBtn(ICON_PREV, "Prev key", () => this.prevKey());
    tb.appendChild(prevBtn);
    const playBtn = this.toolBtn(this.opts.playing ? ICON_PAUSE : ICON_PLAY, "Play/Pause", () => this.togglePlay());
    playBtn.classList.add("ate-play");
    if (this.opts.playing) playBtn.classList.add("ate-active");
    playBtn.setAttribute("data-play-btn", "true");
    tb.appendChild(playBtn);
    const nextBtn = this.toolBtn(ICON_NEXT, "Next key", () => this.nextKey());
    tb.appendChild(nextBtn);

    tb.appendChild(this.sep());

    // Loop
    const loopBtn = this.toolBtn(ICON_LOOP, "Loop", () => this.toggleLoop());
    if (this.opts.loop) loopBtn.classList.add("ate-active");
    loopBtn.setAttribute("data-loop-btn", "true");
    tb.appendChild(loopBtn);

    // Speed
    const speedLabel = document.createElement("span");
    speedLabel.className = "ate-label";
    speedLabel.textContent = "Speed:";
    tb.appendChild(speedLabel);
    const speedInput = document.createElement("input");
    speedInput.type = "number";
    speedInput.className = "ate-input";
    speedInput.value = String(this.opts.speed);
    speedInput.step = "0.1";
    speedInput.min = "0.1";
    speedInput.max = "10";
    speedInput.style.width = "40px";
    speedInput.addEventListener("change", () => {
      this.opts.speed = clamp(Number(speedInput.value) || 1, 0.1, 10);
      speedInput.value = String(this.opts.speed);
    });
    tb.appendChild(speedInput);

    tb.appendChild(this.sep());

    // Duration
    const durLabel = document.createElement("span");
    durLabel.className = "ate-label";
    durLabel.textContent = "End:";
    tb.appendChild(durLabel);
    const durInput = document.createElement("input");
    durInput.type = "number";
    durInput.className = "ate-input";
    durInput.value = String(this.opts.duration);
    durInput.step = "0.5";
    durInput.min = "1";
    durInput.style.width = "50px";
    durInput.addEventListener("change", () => {
      this.opts.duration = Math.max(1, Number(durInput.value) || DEFAULT_DURATION);
      durInput.value = String(this.opts.duration);
      this.drawRuler();
      this.drawGridLines();
      this.updatePlayhead();
    });
    tb.appendChild(durInput);

    tb.appendChild(this.sep());

    // Zoom
    const zoomLabel = document.createElement("span");
    zoomLabel.className = "ate-label";
    zoomLabel.textContent = "Zoom:";
    tb.appendChild(zoomLabel);
    const zoomSlider = document.createElement("input");
    zoomSlider.type = "range";
    zoomSlider.min = "20";
    zoomSlider.max = "400";
    zoomSlider.step = "10";
    zoomSlider.value = String(this.opts.pixelsPerSecond);
    zoomSlider.style.width = "80px";
    zoomSlider.style.height = "20px";
    zoomSlider.style.accentColor = "var(--ate-accent)";
    zoomSlider.addEventListener("input", () => {
      this.setZoom(Number(zoomSlider.value), "pointer");
    });
    tb.appendChild(zoomSlider);

    tb.appendChild(this.spacer());

    // Add track buttons
    const addKfBtn = this.toolBtn(ICON_KF, "Add keyframe track", () => this.addTrack("keyframe"));
    tb.appendChild(addKfBtn);
    const addClipBtn = this.toolBtn(ICON_CLIP, "Add clip track", () => this.addTrack("clip"));
    tb.appendChild(addClipBtn);

    // Info
    const info = document.createElement("span");
    info.className = "ate-label";
    info.style.fontFamily = "var(--font-mono, ui-monospace, monospace)";
    info.textContent = `${this.opts.playhead.toFixed(2)}s / ${this.opts.duration.toFixed(1)}s`;
    info.setAttribute("data-time-info", "true");
    tb.appendChild(info);

    return tb;
  }

  private toolBtn(icon: string, label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ate-btn";
    btn.innerHTML = icon;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
    btn.addEventListener("click", onClick);
    return btn;
  }
  private sep(): HTMLElement {
    const s = document.createElement("div"); s.className = "ate-sep"; return s;
  }
  private spacer(): HTMLElement {
    const s = document.createElement("div"); s.className = "ate-spacer"; return s;
  }

  private renderTrackLabel(track: Track): HTMLElement {
    const el = document.createElement("div");
    el.className = "ate-track-label";
    el.style.height = `${this.opts.rowHeight}px`;
    if (track.visible === false) el.classList.add("ate-hidden");
    el.setAttribute("data-track-id", track.id);

    if (track.owner) {
      const owner = document.createElement("span");
      owner.className = "ate-track-owner";
      owner.textContent = track.owner;
      el.appendChild(owner);
    }

    const name = document.createElement("span");
    name.className = "ate-track-name";
    name.textContent = track.name;
    if (track.color) name.style.color = track.color;
    el.appendChild(name);

    // Visibility toggle
    const visBtn = document.createElement("button");
    visBtn.type = "button";
    visBtn.className = "ate-track-btn";
    visBtn.innerHTML = ICON_EYE;
    visBtn.setAttribute("aria-label", "Toggle visibility");
    if (track.visible !== false) visBtn.classList.add("ate-on");
    visBtn.addEventListener("click", () => this.toggleTrackVisible(track.id));
    el.appendChild(visBtn);

    // Lock toggle
    const lockBtn = document.createElement("button");
    lockBtn.type = "button";
    lockBtn.className = "ate-track-btn";
    lockBtn.innerHTML = ICON_LOCK;
    lockBtn.setAttribute("aria-label", "Toggle lock");
    if (track.locked) lockBtn.classList.add("ate-lock-on");
    lockBtn.addEventListener("click", () => this.toggleTrackLock(track.id));
    el.appendChild(lockBtn);

    // Remove
    const rmBtn = document.createElement("button");
    rmBtn.type = "button";
    rmBtn.className = "ate-track-btn";
    rmBtn.innerHTML = ICON_TRASH;
    rmBtn.setAttribute("aria-label", "Remove track");
    rmBtn.addEventListener("click", () => this.removeTrack(track.id));
    el.appendChild(rmBtn);

    return el;
  }

  private renderTrackRow(track: Track): HTMLElement {
    const el = document.createElement("div");
    el.className = "ate-track-row";
    el.style.height = `${this.opts.rowHeight}px`;
    if (track.visible === false) el.classList.add("ate-hidden");
    el.setAttribute("data-track-id", track.id);

    // Keyframes
    if (track.type === "keyframe" && track.keyframes) {
      for (const kf of track.keyframes) {
        el.appendChild(this.renderKeyframe(track, kf));
      }
    }

    // Clips
    if (track.type === "clip" && track.clips) {
      for (const clip of track.clips) {
        el.appendChild(this.renderClip(track, clip));
      }
    }

    this.trackRowEls.set(track.id, el);
    return el;
  }

  private renderKeyframe(track: Track, kf: Keyframe): HTMLElement {
    const el = document.createElement("div");
    el.className = "ate-keyframe";
    if (kf.selected) el.classList.add("ate-selected");
    if (track.locked) el.classList.add("ate-locked");
    el.setAttribute("data-kf-id", kf.id);
    el.setAttribute("data-track-id", track.id);
    el.style.left = `${kf.time * this.opts.pixelsPerSecond}px`;

    if (!track.locked && !this.opts.readOnly) {
      el.addEventListener("pointerdown", (e) => this.onKeyframePointerDown(e, track.id, kf.id));
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectKeyframe(track.id, kf.id, e.shiftKey);
      });
    }
    return el;
  }

  private renderClip(track: Track, clip: Clip): HTMLElement {
    const el = document.createElement("div");
    el.className = "ate-clip";
    if (clip.selected) el.classList.add("ate-selected");
    if (track.locked) el.classList.add("ate-locked");
    el.setAttribute("data-clip-id", clip.id);
    el.setAttribute("data-track-id", track.id);
    el.style.left = `${clip.start * this.opts.pixelsPerSecond}px`;
    el.style.width = `${(clip.end - clip.start) * this.opts.pixelsPerSecond}px`;
    if (clip.color) { el.style.background = `color-mix(in srgb, ${clip.color} 30%, var(--ate-surface-3))`; el.style.borderColor = clip.color; }
    if (clip.label) el.textContent = clip.label;

    if (!track.locked && !this.opts.readOnly) {
      el.addEventListener("pointerdown", (e) => this.onClipPointerDown(e, track.id, clip.id, "move"));
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectClip(track.id, clip.id, e.shiftKey);
      });

      // Resize handles
      const leftHandle = document.createElement("div");
      leftHandle.className = "ate-clip-resize ate-clip-resize-left";
      leftHandle.addEventListener("pointerdown", (e) => { e.stopPropagation(); this.onClipPointerDown(e, track.id, clip.id, "resize-left"); });
      el.appendChild(leftHandle);

      const rightHandle = document.createElement("div");
      rightHandle.className = "ate-clip-resize ate-clip-resize-right";
      rightHandle.addEventListener("pointerdown", (e) => { e.stopPropagation(); this.onClipPointerDown(e, track.id, clip.id, "resize-right"); });
      el.appendChild(rightHandle);
    }
    return el;
  }

  // ---- Ruler drawing ----

  private drawRuler(): void {
    if (!this.rulerCanvas) return;
    const canvas = this.rulerCanvas;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pps = this.opts.pixelsPerSecond;
    const duration = this.opts.duration;

    // Background
    ctx.fillStyle = "#28282E";
    ctx.fillRect(0, 0, w, h);

    // Determine tick interval (aim for ~60px between ticks)
    const targetSpacing = 60;
    const rawInterval = targetSpacing / pps;
    // Round to nice numbers: 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60
    const niceIntervals = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60];
    let interval = niceIntervals[0];
    for (const ni of niceIntervals) {
      if (ni >= rawInterval) { interval = ni; break; }
      interval = ni;
    }

    // Draw ticks + labels
    ctx.strokeStyle = "#555560";
    ctx.fillStyle = "#888894";
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let t = 0; t <= duration; t += interval) {
      const x = t * pps;
      if (x > w + 10) break;
      // Major tick
      ctx.beginPath();
      ctx.moveTo(x, h - 8);
      ctx.lineTo(x, h);
      ctx.lineWidth = 1;
      ctx.stroke();
      // Label
      ctx.fillText(this.formatTime(t), x, h / 2);
      // Minor ticks
      const minorStep = interval / 5;
      for (let i = 1; i < 5; i++) {
        const mx = (t + minorStep * i) * pps;
        if (mx > w) break;
        ctx.beginPath();
        ctx.moveTo(mx, h - 4);
        ctx.lineTo(mx, h);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  private drawGridLines(): void {
    if (!this.trackArea) return;
    // Remove old grid lines
    this.trackArea.querySelectorAll(".ate-grid-line").forEach(el => el.remove());
    const pps = this.opts.pixelsPerSecond;
    const duration = this.opts.duration;
    const targetSpacing = 60;
    const rawInterval = targetSpacing / pps;
    const niceIntervals = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60];
    let interval = niceIntervals[0];
    for (const ni of niceIntervals) {
      if (ni >= rawInterval) { interval = ni; break; }
      interval = ni;
    }
    const w = this.trackArea.clientWidth;
    for (let t = 0; t <= duration; t += interval) {
      const x = t * pps;
      if (x > w + 10) break;
      const line = document.createElement("div");
      line.className = "ate-grid-line";
      line.style.left = `${x}px`;
      this.trackArea.appendChild(line);
    }
  }

  private formatTime(t: number): string {
    if (t < 1) return `${(t * 1000).toFixed(0)}ms`;
    return `${t.toFixed(t < 10 ? 1 : 0)}s`;
  }

  // ---- Playhead ----

  private updatePlayhead(): void {
    const x = this.opts.playhead * this.opts.pixelsPerSecond;
    this.playheadOverlay.style.left = `${x}px`;
    this.playheadOverlay.style.display = "block";

    // Update time info in toolbar
    const info = this.root.querySelector("[data-time-info]") as HTMLElement;
    if (info) info.textContent = `${this.opts.playhead.toFixed(2)}s / ${this.opts.duration.toFixed(1)}s`;

    // Update play button icon
    const playBtn = this.root.querySelector("[data-play-btn]") as HTMLElement;
    if (playBtn) {
      playBtn.innerHTML = this.opts.playing ? ICON_PAUSE : ICON_PLAY;
      playBtn.classList.toggle("ate-active", this.opts.playing);
    }

    // Update loop button
    const loopBtn = this.root.querySelector("[data-loop-btn]") as HTMLElement;
    if (loopBtn) loopBtn.classList.toggle("ate-active", this.opts.loop);
  }

  setPlayhead(time: number, source: "pointer" | "keyboard" | "programmatic" | "playback" = "programmatic"): void {
    if (this._destroyed) return;
    const old = this.opts.playhead;
    this.opts.playhead = clamp(time, 0, this.opts.duration);
    this.updatePlayhead();
    if (old !== this.opts.playhead) {
      this.emit("playhead_change", { playhead: this.opts.playhead, source });
    }
  }

  getPlayhead(): number { return this.opts.playhead; }

  // ---- Playback ----

  togglePlay(): void {
    if (this.opts.playing) this.pause();
    else this.play();
  }

  play(): void {
    if (this._destroyed || this.opts.playing) return;
    this.opts.playing = true;
    this.lastFrameTime = performance.now();
    this.startPlayback();
    this.updatePlayhead();
    this.emit("playback_change", { playing: true, source: "programmatic" });
  }

  pause(): void {
    if (this._destroyed || !this.opts.playing) return;
    this.opts.playing = false;
    this.stopPlayback();
    this.updatePlayhead();
    this.emit("playback_change", { playing: false, source: "programmatic" });
  }

  stop(): void {
    this.pause();
    this.setPlayhead(0, "programmatic");
  }

  private startPlayback(): void {
    if (this.playbackRAF !== null) return;
    const tick = (now: number) => {
      if (!this.opts.playing || this._destroyed) { this.playbackRAF = null; return; }
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      let newTime = this.opts.playhead + dt * this.opts.speed;
      if (newTime >= this.opts.duration) {
        if (this.opts.loop) newTime = 0;
        else { newTime = this.opts.duration; this.pause(); }
      }
      this.opts.playhead = newTime;
      this.updatePlayhead();
      this.emit("playback_tick", { playhead: newTime, source: "playback" });
      this.playbackRAF = requestAnimationFrame(tick);
    };
    this.playbackRAF = requestAnimationFrame(tick);
  }

  private stopPlayback(): void {
    if (this.playbackRAF !== null) {
      cancelAnimationFrame(this.playbackRAF);
      this.playbackRAF = null;
    }
  }

  toggleLoop(): void {
    this.opts.loop = !this.opts.loop;
    this.updatePlayhead();
    this.emit("loop_change", { source: "programmatic" });
  }

  // ---- Navigation ----

  nextKey(): void {
    let next = this.opts.duration;
    for (const track of this.tracks) {
      if (track.type === "keyframe" && track.keyframes) {
        for (const kf of track.keyframes) {
          if (kf.time > this.opts.playhead + 0.001 && kf.time < next) next = kf.time;
        }
      }
    }
    if (next < this.opts.duration || next === this.opts.duration) {
      // If there's no key after playhead, jump to end
      this.setPlayhead(next, "keyboard");
    }
  }

  prevKey(): void {
    let prev = -1;
    for (const track of this.tracks) {
      if (track.type === "keyframe" && track.keyframes) {
        for (const kf of track.keyframes) {
          if (kf.time < this.opts.playhead - 0.001 && kf.time > prev) prev = kf.time;
        }
      }
    }
    if (prev >= 0) this.setPlayhead(prev, "keyboard");
    else this.setPlayhead(0, "keyboard");
  }

  // ---- Zoom ----

  setZoom(pps: number, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    this.opts.pixelsPerSecond = Math.max(10, pps);
    this.drawRuler();
    this.drawGridLines();
    // Re-position keyframes + clips
    for (const track of this.tracks) {
      const rowEl = this.trackRowEls.get(track.id);
      if (!rowEl) continue;
      if (track.type === "keyframe" && track.keyframes) {
        for (const kf of track.keyframes) {
          const kfEl = rowEl.querySelector(`[data-kf-id="${kf.id}"]`) as HTMLElement;
          if (kfEl) kfEl.style.left = `${kf.time * this.opts.pixelsPerSecond}px`;
        }
      }
      if (track.type === "clip" && track.clips) {
        for (const clip of track.clips) {
          const clipEl = rowEl.querySelector(`[data-clip-id="${clip.id}"]`) as HTMLElement;
          if (clipEl) {
            clipEl.style.left = `${clip.start * this.opts.pixelsPerSecond}px`;
            clipEl.style.width = `${(clip.end - clip.start) * this.opts.pixelsPerSecond}px`;
          }
        }
      }
    }
    this.updatePlayhead();
    this.emit("zoom_change", { pixelsPerSecond: this.opts.pixelsPerSecond, source });
  }

  getZoom(): number { return this.opts.pixelsPerSecond; }

  // ---- Scrubbing (ruler drag) ----

  private onRulerPointerDown(e: PointerEvent): void {
    if (this.opts.readOnly) return;
    e.preventDefault();
    this.dragMode = "scrub";
    const rect = this.rulerCanvas.getBoundingClientRect();
    const setFromX = (clientX: number) => {
      const x = clientX - rect.left;
      const t = x / this.opts.pixelsPerSecond;
      this.setPlayhead(t, "pointer");
    };
    setFromX(e.clientX);
    const onMove = (ev: PointerEvent) => setFromX(ev.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      this.dragMode = "none";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ---- Keyframe drag ----

  private onKeyframePointerDown(e: PointerEvent, trackId: string, kfId: string): void {
    if (this.opts.readOnly) return;
    const track = this.tracks.find(t => t.id === trackId);
    if (!track || track.locked) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragMode = "keyframe";
    this.dragTrackId = trackId;
    this.dragItemId = kfId;
    this.dragStartX = e.clientX;
    const kf = track.keyframes?.find(k => k.id === kfId);
    this.dragOrigTime = kf?.time ?? 0;
    (e.target as HTMLElement).classList.add("ate-dragging");

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - this.dragStartX) / this.opts.pixelsPerSecond;
      let newTime = snapTime(this.dragOrigTime + dx, this.opts.snapInterval);
      newTime = clamp(newTime, 0, this.opts.duration);
      if (kf) { kf.time = newTime; (e.target as HTMLElement).style.left = `${newTime * this.opts.pixelsPerSecond}px`; }
      this.emit("keyframe_drag", { trackId, keyframeId: kfId, time: newTime, source: "pointer" });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      (e.target as HTMLElement).classList.remove("ate-dragging");
      if (kf) this.emit("keyframe_change", { trackId, keyframeId: kfId, time: kf.time, oldTime: this.dragOrigTime, source: "pointer" });
      this.dragMode = "none";
      this.dragTrackId = null;
      this.dragItemId = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ---- Clip drag + resize ----

  private onClipPointerDown(e: PointerEvent, trackId: string, clipId: string, mode: "move" | "resize-left" | "resize-right"): void {
    if (this.opts.readOnly) return;
    const track = this.tracks.find(t => t.id === trackId);
    if (!track || track.locked) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragMode = mode === "move" ? "clip-move" : mode === "resize-left" ? "clip-resize-left" : "clip-resize-right";
    this.dragTrackId = trackId;
    this.dragItemId = clipId;
    this.dragStartX = e.clientX;
    const clip = track.clips?.find(c => c.id === clipId);
    this.dragOrigStart = clip?.start ?? 0;
    this.dragOrigEnd = clip?.end ?? 0;
    (e.target as HTMLElement).closest(".ate-clip")?.classList.add("ate-dragging");

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - this.dragStartX) / this.opts.pixelsPerSecond;
      if (!clip) return;
      const clipEl = this.trackRowEls.get(trackId)?.querySelector(`[data-clip-id="${clipId}"]`) as HTMLElement;
      if (this.dragMode === "clip-move") {
        let newStart = snapTime(this.dragOrigStart + dx, this.opts.snapInterval);
        const dur = this.dragOrigEnd - this.dragOrigStart;
        newStart = clamp(newStart, 0, this.opts.duration - dur);
        clip.start = newStart;
        clip.end = newStart + dur;
      } else if (this.dragMode === "clip-resize-left") {
        let newStart = snapTime(this.dragOrigStart + dx, this.opts.snapInterval);
        newStart = clamp(newStart, 0, this.dragOrigEnd - 0.05);
        clip.start = newStart;
      } else if (this.dragMode === "clip-resize-right") {
        let newEnd = snapTime(this.dragOrigEnd + dx, this.opts.snapInterval);
        newEnd = clamp(newEnd, this.dragOrigStart + 0.05, this.opts.duration);
        clip.end = newEnd;
      }
      if (clipEl) {
        clipEl.style.left = `${clip.start * this.opts.pixelsPerSecond}px`;
        clipEl.style.width = `${(clip.end - clip.start) * this.opts.pixelsPerSecond}px`;
      }
      this.emit("clip_drag", { trackId, clipId, time: clip.start, source: "pointer" });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      (e.target as HTMLElement).closest(".ate-clip")?.classList.remove("ate-dragging");
      if (clip) this.emit("clip_change", { trackId, clipId, time: clip.start, oldTime: this.dragOrigStart, source: "pointer" });
      this.dragMode = "none";
      this.dragTrackId = null;
      this.dragItemId = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ---- Selection ----

  selectKeyframe(trackId: string, kfId: string, additive: boolean): void {
    // Clear others unless additive
    if (!additive) {
      for (const t of this.tracks) {
        if (t.keyframes) for (const k of t.keyframes) k.selected = false;
      }
    }
    const track = this.tracks.find(t => t.id === trackId);
    const kf = track?.keyframes?.find(k => k.id === kfId);
    if (kf) kf.selected = !kf.selected;
    this.updateSelectionDom();
    this.emit("selection_change", { trackId, keyframeId: kfId, source: "pointer" });
  }

  selectClip(trackId: string, clipId: string, additive: boolean): void {
    if (!additive) {
      for (const t of this.tracks) {
        if (t.clips) for (const c of t.clips) c.selected = false;
      }
    }
    const track = this.tracks.find(t => t.id === trackId);
    const clip = track?.clips?.find(c => c.id === clipId);
    if (clip) clip.selected = !clip.selected;
    this.updateSelectionDom();
    this.emit("selection_change", { trackId, clipId, source: "pointer" });
  }

  clearSelection(): void {
    for (const t of this.tracks) {
      if (t.keyframes) for (const k of t.keyframes) k.selected = false;
      if (t.clips) for (const c of t.clips) c.selected = false;
    }
    this.updateSelectionDom();
    this.emit("selection_change", { source: "programmatic" });
  }

  private updateSelectionDom(): void {
    for (const track of this.tracks) {
      const rowEl = this.trackRowEls.get(track.id);
      if (!rowEl) continue;
      if (track.keyframes) {
        for (const kf of track.keyframes) {
          const el = rowEl.querySelector(`[data-kf-id="${kf.id}"]`);
          el?.classList.toggle("ate-selected", !!kf.selected);
        }
      }
      if (track.clips) {
        for (const clip of track.clips) {
          const el = rowEl.querySelector(`[data-clip-id="${clip.id}"]`);
          el?.classList.toggle("ate-selected", !!clip.selected);
        }
      }
    }
  }

  // ---- Track management ----

  addTrack(type: TrackType, partial?: Partial<Track>): string {
    const id = partial?.id ?? uid("track");
    const track: Track = {
      id,
      name: partial?.name ?? (type === "keyframe" ? `Property ${this.tracks.length + 1}` : `Clip ${this.tracks.length + 1}`),
      type,
      owner: partial?.owner,
      keyframes: type === "keyframe" ? (partial?.keyframes ?? []) : undefined,
      clips: type === "clip" ? (partial?.clips ?? []) : undefined,
      visible: partial?.visible ?? true,
      locked: partial?.locked ?? false,
      color: partial?.color,
    };
    this.tracks.push(track);
    this.render();
    this.emit("track_added", { trackId: id, source: "programmatic" });
    return id;
  }

  removeTrack(trackId: string): void {
    if (this._destroyed) return;
    const idx = this.tracks.findIndex(t => t.id === trackId);
    if (idx < 0) return;
    this.tracks.splice(idx, 1);
    this.render();
    this.emit("track_removed", { trackId, source: "programmatic" });
  }

  toggleTrackVisible(trackId: string): void {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;
    track.visible = track.visible === false ? true : false;
    this.render();
    this.emit("track_change", { trackId, source: "programmatic" });
  }

  toggleTrackLock(trackId: string): void {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;
    track.locked = !track.locked;
    this.render();
    this.emit("track_change", { trackId, source: "programmatic" });
  }

  addKeyframe(trackId: string, time?: number, value?: number): string {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track || track.type !== "keyframe") return "";
    const id = uid("kf");
    const kf: Keyframe = { id, time: time ?? this.opts.playhead, value: value ?? 0, transition: "linear" };
    if (!track.keyframes) track.keyframes = [];
    track.keyframes.push(kf);
    track.keyframes.sort((a, b) => a.time - b.time);
    this.render();
    this.emit("keyframe_added", { trackId, keyframeId: id, time: kf.time, source: "programmatic" });
    return id;
  }

  removeKeyframe(trackId: string, kfId: string): void {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track?.keyframes) return;
    const idx = track.keyframes.findIndex(k => k.id === kfId);
    if (idx < 0) return;
    track.keyframes.splice(idx, 1);
    this.render();
    this.emit("keyframe_removed", { trackId, keyframeId: kfId, source: "programmatic" });
  }

  addClip(trackId: string, start?: number, end?: number): string {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track || track.type !== "clip") return "";
    const id = uid("clip");
    const s = start ?? this.opts.playhead;
    const e = end ?? s + 1;
    const clip: Clip = { id, start: s, end: e, label: "Clip" };
    if (!track.clips) track.clips = [];
    track.clips.push(clip);
    this.render();
    this.emit("clip_added", { trackId, clipId: id, time: s, source: "programmatic" });
    return id;
  }

  removeClip(trackId: string, clipId: string): void {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track?.clips) return;
    const idx = track.clips.findIndex(c => c.id === clipId);
    if (idx < 0) return;
    track.clips.splice(idx, 1);
    this.render();
    this.emit("clip_removed", { trackId, clipId, source: "programmatic" });
  }

  // ---- Keyboard ----

  private onKeyDown(e: KeyboardEvent): void {
    if (this.opts.readOnly) return;
    let handled = true;
    switch (e.key) {
      case " ":
        e.preventDefault();
        this.togglePlay();
        break;
      case "ArrowLeft":
        this.setPlayhead(this.opts.playhead - (e.shiftKey ? 1 : 0.1), "keyboard");
        break;
      case "ArrowRight":
        this.setPlayhead(this.opts.playhead + (e.shiftKey ? 1 : 0.1), "keyboard");
        break;
      case "Home":
        this.setPlayhead(0, "keyboard");
        break;
      case "End":
        this.setPlayhead(this.opts.duration, "keyboard");
        break;
      case "Delete":
      case "Backspace":
        // Remove selected keyframes + clips
        for (const track of this.tracks) {
          if (track.keyframes) {
            const toRemove = track.keyframes.filter(k => k.selected).map(k => k.id);
            for (const id of toRemove) this.removeKeyframe(track.id, id);
          }
          if (track.clips) {
            const toRemove = track.clips.filter(c => c.selected).map(c => c.id);
            for (const id of toRemove) this.removeClip(track.id, id);
          }
        }
        break;
      case "Escape":
        this.clearSelection();
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  }

  // ---- Data accessors ----

  getTracks(): Track[] { return this.tracks.map(t => ({ ...t, keyframes: t.keyframes?.map(k => ({ ...k })), clips: t.clips?.map(c => ({ ...c })) })); }
  getDuration(): number { return this.opts.duration; }
  isPlaying(): boolean { return this.opts.playing; }

  setTracks(tracks: Track[]): void {
    if (this._destroyed) return;
    this.tracks = tracks.map(t => ({ ...t }));
    this.render();
  }

  setProperty(name: string, value: unknown): void {
    if (this._destroyed) return;
    switch (name) {
      case "duration":
        this.opts.duration = Math.max(1, Number(value));
        this.drawRuler(); this.drawGridLines(); this.updatePlayhead();
        break;
      case "pixelsPerSecond": this.setZoom(Number(value)); break;
      case "playhead": this.setPlayhead(Number(value)); break;
      case "playing": if (value) this.play(); else this.pause(); break;
      case "loop": this.opts.loop = !!value; this.updatePlayhead(); break;
      case "speed": this.opts.speed = clamp(Number(value), 0.1, 10); break;
      case "snapInterval": this.opts.snapInterval = Number(value); break;
      case "readOnly": this.opts.readOnly = !!value; this.render(); break;
      case "tracks": this.setTracks(value as Track[]); break;
      default: return;
    }
  }

  // ---- Events ----

  on(event: string, handler: AnimationTrackEditorHandler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }
  off(event: string, handler: AnimationTrackEditorHandler): void {
    this.listeners.get(event)?.delete(handler);
  }
  private emit(event: string, payload: AnimationTrackEditorEventPayload): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const p = { ...payload, type: event };
    for (const h of set) { try { h(p); } catch (e) { console.error(e); } }
  }

  // ---- Destroy ----

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.stopPlayback();
    this.resizeObserver?.disconnect();
    this.listeners.clear();
    this.container.innerHTML = "";
  }
}
