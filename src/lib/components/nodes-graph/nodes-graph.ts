/**
 * NodesGraph — an infinite-canvas node-and-connection graph component
 * (vanilla TypeScript). This is the foundation "mindmap" component.
 *
 * Design principles:
 *   - DOM-based rendering (not canvas): nodes are absolutely-positioned DOM
 *     elements; connections are SVG paths in an overlay layer. This makes
 *     interactive content inside nodes trivial and avoids the sync issues
 *     that plagued the old canvas-based implementation.
 *   - Connection sides: top, bottom, left, right — at the center of each
 *     node edge. A node can enable any subset of sides.
 *   - Pan (drag empty canvas), zoom (wheel toward cursor), node drag,
 *     drag-to-connect from side handles, selection, keyboard.
 *   - Pluggable node rendering: subclasses (e.g. SocketNodesGraph) override
 *     `renderNodeContent()` and `getConnectionPoint()` to customize.
 *
 * The SocketNodesGraph is built on top of this foundation — see
 * `socket-nodes-graph.ts`.
 */

// ---- Public types ----

export type ConnectionSide = "top" | "bottom" | "left" | "right";

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  /** Which sides allow connections. Default: all four. */
  sides?: ConnectionSide[];
  /** Arbitrary data for subclasses (e.g. socket rows). */
  data?: unknown;
  /** Optional fill color override. */
  color?: string;
}

export interface ConnectionEndpoint {
  node: string;
  side: ConnectionSide;
  /** Optional socket/row id for socket graphs. */
  socketId?: string;
}

export interface GraphConnection {
  id: string;
  from: ConnectionEndpoint;
  to: ConnectionEndpoint;
  /** Optional label drawn at the midpoint. */
  label?: string;
}

export interface GraphOptions {
  nodes?: GraphNode[];
  connections?: GraphConnection[];
  zoom?: number;
  panX?: number;
  panY?: number;
  minZoom?: number;
  maxZoom?: number;
  gridSize?: number;
  showGrid?: boolean;
  selectable?: boolean;
  movable?: boolean;
  connectable?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  /** Default node fill color. */
  nodeColor?: string;
}

export interface GraphEventPayload {
  type?: string;
  nodeId?: string | null;
  previousNodeId?: string | null;
  connectionId?: string | null;
  nodeIds?: string[];
  connectionIds?: string[];
  node?: GraphNode | null;
  connection?: GraphConnection | null;
  from?: ConnectionEndpoint;
  to?: ConnectionEndpoint;
  reason?: string;
  zoom?: number;
  panX?: number;
  panY?: number;
  /** Socket/row id (for socket graphs). */
  socketId?: string;
  /** Control id (for socket graphs). */
  controlId?: string;
  /** Control value (for socket graphs). */
  controlValue?: unknown;
  source?: "pointer" | "keyboard" | "programmatic";
}

export type GraphHandler = (payload: GraphEventPayload) => void;

// ---- Constants ----

const STYLE_ID = "nodes-graph-styles";

const ALL_SIDES: ConnectionSide[] = ["top", "bottom", "left", "right"];

const SIDE_CURSORS: Record<ConnectionSide, string> = {
  top: "ns-resize",
  bottom: "ns-resize",
  left: "ew-resize",
  right: "ew-resize",
};

// ---- Style injection ----

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.ng-graph {
  --ng-bg: #101014;
  --ng-surface: #211A30;
  --ng-surface-2: #2A2238;
  --ng-surface-3: #342348;
  --ng-border: #383343;
  --ng-text: #F4F1FF;
  --ng-muted: #B8B2CA;
  --ng-accent: #D9FF66;
  --ng-accent-hover: #C8F34F;
  --ng-danger: #FF858B;
  --ng-node: #2A2238;
  --ng-conn: #6B5FA8;
  --ng-radius: 8px;
  font-family: inherit;
  color: var(--ng-text);
  background: var(--ng-bg);
  border: 1px solid var(--ng-border);
  border-radius: var(--ng-radius);
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}
.ng-graph * { box-sizing: border-box; }
.ng-graph.ng-disabled { opacity: 0.55; pointer-events: none; }

.ng-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--ng-border);
  background: var(--ng-surface);
}
.ng-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--ng-border);
  border-radius: 4px;
  background: var(--ng-surface-2);
  color: var(--ng-muted);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
}
.ng-toolbar-btn:hover {
  color: var(--ng-text);
  border-color: var(--ng-accent);
}
.ng-toolbar-btn:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ng-accent) 40%, transparent);
}
.ng-toolbar-btn svg { width: 13px; height: 13px; }
.ng-toolbar-spacer { flex: 1 1 auto; }
.ng-toolbar-info {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  color: var(--ng-muted);
  padding: 0 6px;
}

.ng-viewport {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  overflow: hidden;
  cursor: grab;
  background: var(--ng-bg);
}
.ng-viewport.ng-panning { cursor: grabbing; }
.ng-viewport.ng-dragging-node { cursor: move; }
.ng-viewport.ng-connecting { cursor: crosshair; }

.ng-grid-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.4;
}

.ng-world {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  width: 1px;
  height: 1px;
}

.ng-svg {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}

.ng-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--ng-node);
  border: 1px solid var(--ng-border);
  border-radius: 6px;
  cursor: move;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
  user-select: none;
  overflow: hidden;
}
.ng-node:hover {
  border-color: var(--ng-accent);
}
.ng-node.ng-selected {
  border-color: var(--ng-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ng-accent) 40%, transparent);
}
.ng-node.ng-dragging {
  opacity: 0.85;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  z-index: 100;
}
.ng-node.ng-readonly { cursor: default; }
.ng-node-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--ng-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--ng-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ng-node-body {
  flex: 1 1 auto;
  padding: 8px 10px;
  font-size: 11px;
  color: var(--ng-muted);
  overflow: hidden;
}

.ng-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--ng-surface-2);
  border: 2px solid var(--ng-border);
  border-radius: 999px;
  cursor: crosshair;
  z-index: 5;
  transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
}
.ng-handle:hover {
  border-color: var(--ng-accent);
  background: var(--ng-accent);
  transform: scale(1.3);
}
.ng-handle.ng-active {
  border-color: var(--ng-accent);
  background: var(--ng-accent);
}
.ng-handle-top { top: -6px; left: 50%; transform: translateX(-50%); }
.ng-handle-bottom { bottom: -6px; left: 50%; transform: translateX(-50%); }
.ng-handle-left { left: -6px; top: 50%; transform: translateY(-50%); }
.ng-handle-right { right: -6px; top: 50%; transform: translateY(-50%); }
.ng-handle-top:hover { transform: translateX(-50%) scale(1.3); }
.ng-handle-bottom:hover { transform: translateX(-50%) scale(1.3); }
.ng-handle-left:hover { transform: translateY(-50%) scale(1.3); }
.ng-handle-right:hover { transform: translateY(-50%) scale(1.3); }

.ng-conn-path {
  fill: none;
  stroke: var(--ng-conn);
  stroke-width: 2;
  pointer-events: stroke;
  cursor: pointer;
  transition: stroke 120ms ease, stroke-width 120ms ease;
}
.ng-conn-path:hover {
  stroke: var(--ng-accent);
  stroke-width: 3;
}
.ng-conn-path.ng-selected {
  stroke: var(--ng-accent);
  stroke-width: 3;
}
.ng-conn-temp {
  fill: none;
  stroke: var(--ng-accent);
  stroke-width: 2;
  stroke-dasharray: 5 4;
  pointer-events: none;
  opacity: 0.8;
}
.ng-conn-label {
  fill: var(--ng-text);
  font-size: 10px;
  font-family: var(--font-mono, ui-monospace, monospace);
  text-anchor: middle;
  pointer-events: none;
}

.ng-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ng-muted);
  font-size: 12px;
  font-style: italic;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .ng-node, .ng-handle, .ng-conn-path { transition: none; }
}
`;
  document.head.appendChild(el);
}

// ---- Utilities ----

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36).slice(-4)}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Compute the connection point (in world coordinates) for a side of a node. */
function sidePoint(node: GraphNode, side: ConnectionSide): { x: number; y: number } {
  switch (side) {
    case "top": return { x: node.x + node.width / 2, y: node.y };
    case "bottom": return { x: node.x + node.width / 2, y: node.y + node.height };
    case "left": return { x: node.x, y: node.y + node.height / 2 };
    case "right": return { x: node.x + node.width, y: node.y + node.height / 2 };
  }
}

/** Cubic bezier control points for a smooth connection between two points. */
function bezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: ConnectionSide,
  toSide: ConnectionSide,
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.max(40, dist * 0.4);

  const c1 = { x: from.x, y: from.y };
  const c2 = { x: to.x, y: to.y };
  switch (fromSide) {
    case "top": c1.y -= offset; break;
    case "bottom": c1.y += offset; break;
    case "left": c1.x -= offset; break;
    case "right": c1.x += offset; break;
  }
  switch (toSide) {
    case "top": c2.y -= offset; break;
    case "bottom": c2.y += offset; break;
    case "left": c2.x -= offset; break;
    case "right": c2.x += offset; break;
  }
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}

// ---- Component ----

export class NodesGraph {
  protected container: HTMLElement;
  protected root!: HTMLDivElement;
  protected viewport!: HTMLDivElement;
  protected world!: HTMLDivElement;
  protected svg!: SVGSVGElement;
  protected gridBg!: HTMLDivElement;
  protected opts: Required<GraphOptions>;
  protected nodes: GraphNode[];
  protected connections: GraphConnection[];
  protected selectedNodeId: string | null = null;
  protected selectedConnectionId: string | null = null;
  protected listeners = new Map<string, Set<GraphHandler>>();
  protected _destroyed = false;

  // DOM maps
  protected nodeEls = new Map<string, HTMLElement>();
  protected connEls = new Map<string, SVGPathElement>();

  // Interaction state (protected so SocketNodesGraph can reuse the connect flow)
  protected panMode: "none" | "pan" | "node-drag" | "connect" = "none";
  protected dragStartX = 0;
  protected dragStartY = 0;
  protected dragStartWorldX = 0;
  protected dragStartWorldY = 0;
  protected dragNodeStartX = 0;
  protected dragNodeStartY = 0;
  protected dragNodeId: string | null = null;
  protected dragConnectionFrom: ConnectionEndpoint | null = null;
  protected tempPath: SVGPathElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, options: GraphOptions = {}) {
    this.container = container;
    injectStyles();
    this.opts = {
      nodes: options.nodes ?? [],
      connections: options.connections ?? [],
      zoom: options.zoom ?? 1,
      panX: options.panX ?? 0,
      panY: options.panY ?? 0,
      minZoom: options.minZoom ?? 0.2,
      maxZoom: options.maxZoom ?? 3,
      gridSize: options.gridSize ?? 40,
      showGrid: options.showGrid ?? true,
      selectable: options.selectable ?? true,
      movable: options.movable ?? true,
      connectable: options.connectable ?? true,
      readOnly: options.readOnly ?? false,
      disabled: options.disabled ?? false,
      nodeColor: options.nodeColor ?? "#2A2238",
    };
    this.nodes = (this.opts.nodes as GraphNode[]).map((n) => ({ ...n }));
    this.connections = (this.opts.connections as GraphConnection[]).map((c) => ({ ...c }));
    this.render();
  }

  // ---- Rendering ----

  protected render(): void {
    if (this._destroyed) return;
    this.nodeEls.clear();
    this.connEls.clear();

    const root = document.createElement("div");
    root.className = "ng-graph";
    if (this.opts.readOnly) root.classList.add("ng-readonly");
    if (this.opts.disabled) root.classList.add("ng-disabled");

    // Toolbar
    root.appendChild(this.renderToolbar());

    // Viewport
    const viewport = document.createElement("div");
    viewport.className = "ng-viewport";
    viewport.tabIndex = 0;

    // Grid background
    const gridBg = document.createElement("div");
    gridBg.className = "ng-grid-bg";
    viewport.appendChild(gridBg);
    this.gridBg = gridBg;

    // World (transformed)
    const world = document.createElement("div");
    world.className = "ng-world";
    viewport.appendChild(world);
    this.world = world;

    // SVG layer for connections
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("ng-svg");
    world.appendChild(svg);
    this.svg = svg;

    // Nodes
    for (const node of this.nodes) {
      const el = this.renderNode(node);
      world.appendChild(el);
      this.nodeEls.set(node.id, el);
    }

    // Empty state
    if (this.nodes.length === 0) {
      const empty = document.createElement("div");
      empty.className = "ng-empty";
      empty.textContent = "No nodes — use the toolbar to add one.";
      viewport.appendChild(empty);
    }

    this.viewport = viewport;
    root.appendChild(viewport);
    this.container.innerHTML = "";
    this.container.appendChild(root);
    this.root = root;

    // Apply transform + draw connections
    this.applyTransform();
    this.updateGrid();
    this.drawConnections();

    // Attach viewport listeners
    this.attachViewportListeners();

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      if (!this._destroyed) this.updateGrid();
    });
    this.resizeObserver.observe(viewport);
  }

  protected renderToolbar(): HTMLElement {
    const tb = document.createElement("div");
    tb.className = "ng-toolbar";

    tb.appendChild(this.toolBtn("Add node", this.iconPlus(), () => this.addNode()));
    tb.appendChild(this.toolBtn("Fit", this.iconFit(), () => this.fitToView()));
    tb.appendChild(this.toolBtn("Zoom in", this.iconZoomIn(), () => this.zoomBy(1.25)));
    tb.appendChild(this.toolBtn("Zoom out", this.iconZoomOut(), () => this.zoomBy(0.8)));
    tb.appendChild(this.toolBtn("Reset zoom", this.iconReset(), () => this.setZoom(1)));

    const spacer = document.createElement("div");
    spacer.className = "ng-toolbar-spacer";
    tb.appendChild(spacer);

    const info = document.createElement("span");
    info.className = "ng-toolbar-info";
    info.textContent = `${this.nodes.length} nodes · ${this.connections.length} conns · ${Math.round(this.opts.zoom * 100)}%`;
    tb.appendChild(info);

    return tb;
  }

  protected toolBtn(label: string, iconHtml: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ng-toolbar-btn";
    btn.innerHTML = `${iconHtml}<span>${label}</span>`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  protected iconPlus(): string {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>`;
  }
  protected iconFit(): string {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3"/></svg>`;
  }
  protected iconZoomIn(): string {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="7" cy="7" r="4"/><path d="M10 10l3 3M7 5v4M5 7h4"/></svg>`;
  }
  protected iconZoomOut(): string {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="7" cy="7" r="4"/><path d="M10 10l3 3M5 7h4"/></svg>`;
  }
  protected iconReset(): string {
    return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a5 5 0 1 1 1.5 3.5M3 11v-3h3"/></svg>`;
  }

  /**
   * Render a single node. Subclasses override `renderNodeContent()` to
   * customize the body; the wrapper + handles are handled here.
   */
  protected renderNode(node: GraphNode): HTMLElement {
    const el = document.createElement("div");
    el.className = "ng-node";
    el.setAttribute("data-node-id", node.id);
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", node.title);
    el.setAttribute("tabindex", this.opts.readOnly ? "-1" : "0");
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.width = `${node.width}px`;
    el.style.height = `${node.height}px`;
    if (node.color) el.style.background = node.color;
    if (this.selectedNodeId === node.id) el.classList.add("ng-selected");
    if (this.opts.readOnly) el.classList.add("ng-readonly");

    // Header
    const header = document.createElement("div");
    header.className = "ng-node-header";
    header.textContent = node.title;
    el.appendChild(header);

    // Body (overridable)
    const body = this.renderNodeContent(node);
    body.className = "ng-node-body";
    el.appendChild(body);

    // Connection handles
    if (this.opts.connectable && !this.opts.readOnly) {
      const sides = node.sides ?? ALL_SIDES;
      for (const side of sides) {
        const handle = document.createElement("div");
        handle.className = `ng-handle ng-handle-${side}`;
        handle.setAttribute("data-node-id", node.id);
        handle.setAttribute("data-side", side);
        handle.setAttribute("role", "button");
        handle.setAttribute("aria-label", `Connect from ${side} of ${node.title}`);
        handle.addEventListener("pointerdown", (e) => this.onHandlePointerDown(e, node, side));
        el.appendChild(handle);
      }
    }

    // Interactions
    if (!this.opts.readOnly) {
      el.addEventListener("pointerdown", (e) => this.onNodePointerDown(e, node));
      el.addEventListener("click", (e) => {
        if (this._wasDragging) return;
        e.stopPropagation();
        this.selectNode(node.id, "pointer");
      });
      el.addEventListener("keydown", (e) => this.onNodeKeyDown(e, node));
    } else if (this.opts.selectable) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectNode(node.id, "pointer");
      });
    }

    return el;
  }

  /**
   * Render the body content of a node. Override in subclasses for custom
   * layouts (e.g. socket rows). Default: a muted text description from
   * `node.data.description` if present.
   */
  protected renderNodeContent(node: GraphNode): HTMLElement {
    const body = document.createElement("div");
    const data = node.data as { description?: unknown } | undefined;
    const desc = data?.description;
    if (typeof desc === "string") body.textContent = desc;
    else body.textContent = "";
    return body;
  }

  // ---- Coordinate mapping ----

  /** Convert screen (client) coordinates to world coordinates. */
  protected screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.viewport.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - this.opts.panX) / this.opts.zoom,
      y: (sy - this.opts.panY) / this.opts.zoom,
    };
  }

  /** Apply the current pan/zoom transform to the world element. */
  protected applyTransform(): void {
    this.world.style.transform = `translate(${this.opts.panX}px, ${this.opts.panY}px) scale(${this.opts.zoom})`;
  }

  /** Update the grid background to match the current pan/zoom. */
  protected updateGrid(): void {
    if (!this.opts.showGrid) {
      this.gridBg.style.background = "transparent";
      return;
    }
    const size = this.opts.gridSize * this.opts.zoom;
    const ox = this.opts.panX % size;
    const oy = this.opts.panY % size;
    this.gridBg.style.backgroundImage =
      `radial-gradient(circle, var(--ng-border) 1px, transparent 1px)`;
    this.gridBg.style.backgroundSize = `${size}px ${size}px`;
    this.gridBg.style.backgroundPosition = `${ox}px ${oy}px`;
  }

  // ---- Connection drawing ----

  /**
   * Get the pixel position (in world coordinates) of a connection endpoint.
   * Subclasses override to support per-socket connection points.
   */
  protected getConnectionPoint(ep: ConnectionEndpoint): { x: number; y: number } | null {
    const node = this.findNode(ep.node);
    if (!node) return null;
    return sidePoint(node, ep.side);
  }

  protected drawConnections(): void {
    // Clear existing paths
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    this.connEls.clear();

    for (const conn of this.connections) {
      const from = this.getConnectionPoint(conn.from);
      const to = this.getConnectionPoint(conn.to);
      if (!from || !to) continue;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("ng-conn-path");
      path.setAttribute("d", bezierPath(from, to, conn.from.side, conn.to.side));
      path.setAttribute("data-conn-id", conn.id);
      if (this.selectedConnectionId === conn.id) path.classList.add("ng-selected");
      path.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectConnection(conn.id, "pointer");
      });
      this.svg.appendChild(path);
      this.connEls.set(conn.id, path);

      // Label
      if (conn.label) {
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        const labelEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        labelEl.classList.add("ng-conn-label");
        labelEl.setAttribute("x", String(mx));
        labelEl.setAttribute("y", String(my - 6));
        labelEl.textContent = conn.label;
        this.svg.appendChild(labelEl);
      }
    }
  }

  // ---- Viewport listeners (pan, zoom, connect target) ----

  private attachViewportListeners(): void {
    this.viewport.addEventListener("pointerdown", (e) => this.onViewportPointerDown(e));
    this.viewport.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    this.viewport.addEventListener("keydown", (e) => this.onViewportKeyDown(e));
  }

  private onViewportPointerDown(e: PointerEvent): void {
    const target = e.target as HTMLElement;
    // If clicked on a node or handle, don't pan
    if (target.closest(".ng-node") || target.closest(".ng-handle")) return;
    if (this.opts.readOnly) return;
    // Pan
    this.panMode = "pan";
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragStartWorldX = this.opts.panX;
    this.dragStartWorldY = this.opts.panY;
    this.viewport.classList.add("ng-panning");
    this.clearSelection();
    this._wasDragging = false;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - this.dragStartX;
      const dy = ev.clientY - this.dragStartY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._wasDragging = true;
      this.opts.panX = this.dragStartWorldX + dx;
      this.opts.panY = this.dragStartWorldY + dy;
      this.applyTransform();
      this.updateGrid();
    };
    const onUp = () => {
      this.viewport.classList.remove("ng-panning");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      this.panMode = "none";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 1 / 1.1;
    const newZoom = clamp(this.opts.zoom * factor, this.opts.minZoom, this.opts.maxZoom);
    if (newZoom === this.opts.zoom) return;
    // Zoom toward cursor
    const rect = this.viewport.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const worldX = (cx - this.opts.panX) / this.opts.zoom;
    const worldY = (cy - this.opts.panY) / this.opts.zoom;
    this.opts.zoom = newZoom;
    this.opts.panX = cx - worldX * newZoom;
    this.opts.panY = cy - worldY * newZoom;
    this.applyTransform();
    this.updateGrid();
    this.emit("zoom_changed", { zoom: newZoom, panX: this.opts.panX, panY: this.opts.panY, source: "pointer" });
  }

  private onViewportKeyDown(e: KeyboardEvent): void {
    if (this.opts.readOnly) return;
    let handled = true;
    switch (e.key) {
      case "Delete":
      case "Backspace":
        if (this.selectedNodeId) {
          this.removeNode(this.selectedNodeId);
        } else if (this.selectedConnectionId) {
          this.removeConnection(this.selectedConnectionId);
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

  // ---- Node drag ----

  private _wasDragging = false;

  private onNodePointerDown(e: PointerEvent, node: GraphNode): void {
    if (this.opts.readOnly || !this.opts.movable) return;
    const target = e.target as HTMLElement;
    if (target.closest(".ng-handle")) return;
    e.stopPropagation();
    e.preventDefault();
    this.panMode = "node-drag";
    this.dragNodeId = node.id;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragNodeStartX = node.x;
    this.dragNodeStartY = node.y;
    this._wasDragging = false;
    this.viewport.classList.add("ng-dragging-node");
    const el = this.nodeEls.get(node.id);
    if (el) el.classList.add("ng-dragging");

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - this.dragStartX) / this.opts.zoom;
      const dy = (ev.clientY - this.dragStartY) / this.opts.zoom;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._wasDragging = true;
      const n = this.findNode(this.dragNodeId!);
      if (!n) return;
      n.x = this.dragNodeStartX + dx;
      n.y = this.dragNodeStartY + dy;
      const el2 = this.nodeEls.get(n.id);
      if (el2) {
        el2.style.left = `${n.x}px`;
        el2.style.top = `${n.y}px`;
      }
      this.drawConnections();
    };
    const onUp = (ev: PointerEvent) => {
      this.viewport.classList.remove("ng-dragging-node");
      const el2 = this.nodeEls.get(node.id);
      if (el2) el2.classList.remove("ng-dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (this._wasDragging) {
        this.emit("node_moved", { nodeId: node.id, node, source: "pointer" });
      }
      this.panMode = "none";
      this.dragNodeId = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ---- Connect (drag from handle) ----

  private onHandlePointerDown(e: PointerEvent, node: GraphNode, side: ConnectionSide): void {
    if (this.opts.readOnly || !this.opts.connectable) return;
    e.stopPropagation();
    e.preventDefault();
    this.panMode = "connect";
    this.dragConnectionFrom = { node: node.id, side };
    this.viewport.classList.add("ng-connecting");

    // Temp path
    this.tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.tempPath.classList.add("ng-conn-temp");
    this.svg.appendChild(this.tempPath);

    const onMove = (ev: PointerEvent) => {
      const from = this.getConnectionPoint(this.dragConnectionFrom!);
      if (!from || !this.tempPath) return;
      const to = this.screenToWorld(ev.clientX, ev.clientY);
      this.tempPath.setAttribute("d", bezierPath(from, to, this.dragConnectionFrom!.side, side));
    };
    const onUp = (ev: PointerEvent) => {
      this.viewport.classList.remove("ng-connecting");
      if (this.tempPath) {
        this.tempPath.remove();
        this.tempPath = null;
      }
      // Check if released on a handle
      const releaseTarget = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const handleEl = releaseTarget?.closest(".ng-handle") as HTMLElement | null;
      if (handleEl) {
        const targetNodeId = handleEl.getAttribute("data-node-id");
        const targetSide = handleEl.getAttribute("data-side") as ConnectionSide;
        if (targetNodeId && targetSide && targetNodeId !== node.id) {
          this.addConnection(
            { node: node.id, side },
            { node: targetNodeId, side: targetSide },
          );
        }
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      this.panMode = "none";
      this.dragConnectionFrom = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ---- Node keyboard ----

  private onNodeKeyDown(e: KeyboardEvent, node: GraphNode): void {
    if (this.opts.readOnly) return;
    let handled = true;
    const step = this.opts.gridSize;
    const n = this.findNode(node.id);
    if (!n) return;
    switch (e.key) {
      case " ":
      case "Enter":
        this.selectNode(node.id, "keyboard");
        break;
      case "ArrowLeft": n.x -= step; this.redrawNode(n); break;
      case "ArrowRight": n.x += step; this.redrawNode(n); break;
      case "ArrowUp": n.y -= step; this.redrawNode(n); break;
      case "ArrowDown": n.y += step; this.redrawNode(n); break;
      case "Delete":
      case "Backspace":
        this.removeNode(node.id);
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  }

  private redrawNode(node: GraphNode): void {
    const el = this.nodeEls.get(node.id);
    if (el) {
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
    }
    this.drawConnections();
  }

  // ---- Selection ----

  selectNode(nodeId: string | null, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    if (!this.opts.selectable) return;
    const prev = this.selectedNodeId;
    this.selectedNodeId = nodeId;
    this.selectedConnectionId = null;
    this.nodeEls.forEach((el, id) => el.classList.toggle("ng-selected", id === nodeId));
    this.connEls.forEach((el) => el.classList.remove("ng-selected"));
    if (prev !== nodeId) {
      this.emit("node_selected", { nodeId, previousNodeId: prev, source });
    }
  }

  selectConnection(connectionId: string | null, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this._destroyed) return;
    const prev = this.selectedConnectionId;
    this.selectedConnectionId = connectionId;
    this.selectedNodeId = null;
    this.nodeEls.forEach((el) => el.classList.remove("ng-selected"));
    this.connEls.forEach((el, id) => el.classList.toggle("ng-selected", id === connectionId));
    if (prev !== connectionId) {
      this.emit("connection_selected", { connectionId, source });
    }
  }

  clearSelection(): void {
    this.selectedNodeId = null;
    this.selectedConnectionId = null;
    this.nodeEls.forEach((el) => el.classList.remove("ng-selected"));
    this.connEls.forEach((el) => el.classList.remove("ng-selected"));
  }

  getSelectedNode(): string | null { return this.selectedNodeId; }
  getSelectedConnection(): string | null { return this.selectedConnectionId; }

  // ---- Data accessors ----

  setNodes(nodes: GraphNode[]): void {
    if (this._destroyed) return;
    this.nodes = nodes.map((n) => ({ ...n }));
    this.render();
  }
  setConnections(conns: GraphConnection[]): void {
    if (this._destroyed) return;
    this.connections = conns.map((c) => ({ ...c }));
    this.drawConnections();
  }
  getNodes(): GraphNode[] { return this.nodes.map((n) => ({ ...n })); }
  getConnections(): GraphConnection[] { return this.connections.map((c) => ({ ...c })); }

  addNode(partial?: Partial<GraphNode>): string {
    const id = partial?.id ?? uid("node");
    const node: GraphNode = {
      id,
      x: partial?.x ?? 100,
      y: partial?.y ?? 100,
      width: partial?.width ?? 180,
      height: partial?.height ?? 80,
      title: partial?.title ?? "New node",
      sides: partial?.sides ?? [...ALL_SIDES],
      data: partial?.data,
      color: partial?.color,
    };
    this.nodes.push(node);
    this.render();
    this.emit("node_added", { nodeId: id, node, source: "programmatic" });
    return id;
  }

  removeNode(nodeId: string): void {
    if (this._destroyed) return;
    const idx = this.nodes.findIndex((n) => n.id === nodeId);
    if (idx < 0) return;
    this.nodes.splice(idx, 1);
    // Remove connections touching this node
    this.connections = this.connections.filter((c) => c.from.node !== nodeId && c.to.node !== nodeId);
    if (this.selectedNodeId === nodeId) this.selectedNodeId = null;
    this.render();
    this.emit("node_removed", { nodeId, source: "programmatic" });
  }

  addConnection(from: ConnectionEndpoint, to: ConnectionEndpoint, label?: string): string {
    if (this._destroyed) return "";
    // Reject self-connection
    if (from.node === to.node) {
      this.emit("connection_rejected", { from, to, reason: "self_connection" });
      return "";
    }
    const id = uid("conn");
    this.connections.push({ id, from, to, label });
    this.drawConnections();
    this.emit("connection_added", { connectionId: id, from, to, source: "pointer" });
    return id;
  }

  removeConnection(connId: string): void {
    if (this._destroyed) return;
    const idx = this.connections.findIndex((c) => c.id === connId);
    if (idx < 0) return;
    this.connections.splice(idx, 1);
    if (this.selectedConnectionId === connId) this.selectedConnectionId = null;
    this.drawConnections();
    this.emit("connection_removed", { connectionId: connId, source: "programmatic" });
  }

  // ---- View ----

  setZoom(zoom: number): void {
    this.opts.zoom = clamp(zoom, this.opts.minZoom, this.opts.maxZoom);
    this.applyTransform();
    this.updateGrid();
    this.emit("zoom_changed", { zoom: this.opts.zoom, source: "programmatic" });
  }

  zoomBy(factor: number): void {
    this.setZoom(this.opts.zoom * factor);
  }

  setPan(x: number, y: number): void {
    this.opts.panX = x;
    this.opts.panY = y;
    this.applyTransform();
    this.updateGrid();
  }

  fitToView(): void {
    if (this.nodes.length === 0) return;
    const minX = Math.min(...this.nodes.map((n) => n.x));
    const minY = Math.min(...this.nodes.map((n) => n.y));
    const maxX = Math.max(...this.nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...this.nodes.map((n) => n.y + n.height));
    const w = maxX - minX;
    const h = maxY - minY;
    const rect = this.viewport.getBoundingClientRect();
    const padding = 60;
    const zx = (rect.width - padding * 2) / w;
    const zy = (rect.height - padding * 2) / h;
    const zoom = clamp(Math.min(zx, zy), this.opts.minZoom, this.opts.maxZoom);
    this.opts.zoom = zoom;
    this.opts.panX = padding - minX * zoom + (rect.width - w * zoom - padding * 2) / 2;
    this.opts.panY = padding - minY * zoom + (rect.height - h * zoom - padding * 2) / 2;
    this.applyTransform();
    this.updateGrid();
    this.emit("zoom_changed", { zoom, panX: this.opts.panX, panY: this.opts.panY, source: "programmatic" });
  }

  // ---- Helpers ----

  protected findNode(id: string): GraphNode | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  // ---- Property setter ----

  setProperty(name: string, value: unknown): void {
    if (this._destroyed) return;
    switch (name) {
      case "zoom": this.setZoom(Number(value)); return;
      case "panX": this.setPan(Number(value), this.opts.panY); return;
      case "panY": this.setPan(this.opts.panX, Number(value)); return;
      case "showGrid": this.opts.showGrid = !!value; this.updateGrid(); return;
      case "gridSize": this.opts.gridSize = Number(value); this.updateGrid(); return;
      case "selectable": this.opts.selectable = !!value; return;
      case "movable": this.opts.movable = !!value; return;
      case "connectable": this.opts.connectable = !!value; return;
      case "readOnly": this.opts.readOnly = !!value; this.render(); return;
      case "disabled": this.opts.disabled = !!value; this.render(); return;
      case "nodes": this.setNodes(value as GraphNode[]); return;
      case "connections": this.setConnections(value as GraphConnection[]); return;
      default: return;
    }
  }

  // ---- Events ----

  on(event: string, handler: GraphHandler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }
  off(event: string, handler: GraphHandler): void {
    this.listeners.get(event)?.delete(handler);
  }
  protected emit(event: string, payload: GraphEventPayload): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const p = { ...payload, type: event };
    for (const h of set) {
      try { h(p); } catch (err) { console.error(`NodesGraph handler error for ${event}:`, err); }
    }
  }

  // ---- Destroy ----

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.resizeObserver?.disconnect();
    this.listeners.clear();
    this.nodeEls.clear();
    this.connEls.clear();
    this.container.innerHTML = "";
  }
}
