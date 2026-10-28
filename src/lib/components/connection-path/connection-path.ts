/**
 * ConnectionPath — a standalone SVG connection-curve overlay component
 * (vanilla TypeScript).
 *
 * Draws bezier / step / straight / rounded paths between two endpoints. Each
 * endpoint can be:
 *   - A fixed point { x, y, side? }
 *   - A DOM element reference (tracked via ResizeObserver — the path follows
 *     the element as it moves or resizes)
 *
 * Features:
 *   - Configurable path shape: bezier, step, straight, rounded
 *   - Per-path: stroke color, width, dash pattern, opacity
 *   - Arrowheads (start, end, both, none) with configurable size
 *   - Labels at the midpoint
 *   - Animated dash-flow (for "data flow" visuals)
 *   - Direction-aware curves: the control points extend perpendicular to the
 *     endpoint's side (top/bottom/left/right)
 *   - Click + hover events per path
 *   - Multiple paths managed together in one SVG overlay
 *   - Auto-redraw on window resize and element resize (ResizeObserver)
 *
 * The overlay is absolutely positioned and sized to fill its container. The
 * container should be `position: relative` (or the overlay will be fixed).
 */

// ---- Public types ----

export type PathShape = "bezier" | "step" | "straight" | "rounded";
export type ConnectionSide = "top" | "bottom" | "left" | "right";
export type ArrowPosition = "none" | "start" | "end" | "both";

/** A fixed point endpoint. */
export interface PointEndpoint {
  type: "point";
  x: number;
  y: number;
  side?: ConnectionSide;
}

/** A DOM-element endpoint. The path tracks the element's position. */
export interface ElementEndpoint {
  type: "element";
  element: HTMLElement | string; // element ref or selector
  side?: ConnectionSide;
  /** Offset from the element's side center (px). Default: 0. */
  offset?: number;
}

export type Endpoint = PointEndpoint | ElementEndpoint;

export interface ConnectionDef {
  id: string;
  from: Endpoint;
  to: Endpoint;
  shape?: PathShape;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
  arrow?: ArrowPosition;
  arrowSize?: number;
  label?: string;
  animated?: boolean;
  animationSpeed?: number; // px/s for dash flow
  curvature?: number; // 0-1, control point offset factor. Default: 0.4
}

export interface ConnectionPathOptions {
  connections?: ConnectionDef[];
  /** Default stroke color. */
  stroke?: string;
  /** Default stroke width. */
  strokeWidth?: number;
  /** Default path shape. */
  shape?: PathShape;
  /** Default arrow position. */
  arrow?: ArrowPosition;
  /** Default arrow size. */
  arrowSize?: number;
  /** Default curvature (0-1). */
  curvature?: number;
  /** Whether paths are interactive (click/hover). */
  interactive?: boolean;
}

export interface ConnectionPathEventPayload {
  type?: string;
  connectionId?: string;
  source?: "pointer" | "programmatic";
}

export type ConnectionPathHandler = (payload: ConnectionPathEventPayload) => void;

// ---- Constants ----

const STYLE_ID = "connection-path-styles";

const SIDE_VECTORS: Record<ConnectionSide, { dx: number; dy: number }> = {
  top: { dx: 0, dy: -1 },
  bottom: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// ---- Style injection ----

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.cp-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 10;
}
.cp-overlay.cp-interactive { pointer-events: auto; }
.cp-path {
  fill: none;
  transition: stroke-width 120ms ease, opacity 120ms ease;
  cursor: pointer;
}
.cp-path:hover { stroke-width: 3; opacity: 1 !important; }
.cp-path-hit {
  fill: none;
  stroke: transparent;
  stroke-width: 16;
  pointer-events: stroke;
  cursor: pointer;
}
.cp-label {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  user-select: none;
}
.cp-label-bg {
  fill: var(--cp-bg, #101014);
  stroke: var(--cp-border, #383343);
  stroke-width: 1;
  rx: 3;
  pointer-events: none;
}
@keyframes cp-dash-flow {
  to { stroke-dashoffset: -1000; }
}
@media (prefers-reduced-motion: reduce) {
  .cp-path { animation: none !important; }
}
`;
  document.head.appendChild(el);
}

// ---- Path computation ----

/** Returns the opposite side. */
function oppositeSide(side: ConnectionSide): ConnectionSide {
  switch (side) {
    case "top": return "bottom";
    case "bottom": return "top";
    case "left": return "right";
    case "right": return "left";
  }
}

/** Compute a bezier path string between two points with side-aware control points. */
export function bezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: ConnectionSide = "right",
  toSide: ConnectionSide = "left",
  curvature = 0.4,
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.max(40, dist * curvature);

  const c1 = { x: from.x, y: from.y };
  const c2 = { x: to.x, y: to.y };
  c1.x += SIDE_VECTORS[fromSide].dx * offset;
  c1.y += SIDE_VECTORS[fromSide].dy * offset;
  c2.x += SIDE_VECTORS[toSide].dx * offset;
  c2.y += SIDE_VECTORS[toSide].dy * offset;

  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}

/** Compute a step (orthogonal) path string. */
export function stepPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: ConnectionSide = "right",
  toSide: ConnectionSide = "left",
): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  // Exit from the source side
  const exitOffset = 30;
  let exit = { ...from };
  let entry = { ...to };
  exit.x += SIDE_VECTORS[fromSide].dx * exitOffset;
  exit.y += SIDE_VECTORS[fromSide].dy * exitOffset;
  entry.x += SIDE_VECTORS[toSide].dx * exitOffset;
  entry.y += SIDE_VECTORS[toSide].dy * exitOffset;
  return `M ${from.x} ${from.y} L ${exit.x} ${exit.y} L ${entry.x} ${exit.y} L ${entry.x} ${entry.y} L ${to.x} ${to.y}`;
}

/** Compute a straight line path. */
export function straightPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

/** Compute a rounded orthogonal path. */
export function roundedPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: ConnectionSide = "right",
  toSide: ConnectionSide = "left",
): string {
  const exitOffset = 30;
  const radius = 8;
  let exit = { ...from };
  let entry = { ...to };
  exit.x += SIDE_VECTORS[fromSide].dx * exitOffset;
  exit.y += SIDE_VECTORS[fromSide].dy * exitOffset;
  entry.x += SIDE_VECTORS[toSide].dx * exitOffset;
  entry.y += SIDE_VECTORS[toSide].dy * exitOffset;
  // Build path with rounded corners using Q (quadratic) at turn points
  const midX = (exit.x + entry.x) / 2;
  return `M ${from.x} ${from.y} L ${exit.x} ${exit.y} Q ${exit.x} ${(exit.y + entry.y) / 2}, ${midX} ${(exit.y + entry.y) / 2} L ${midX} ${(exit.y + entry.y) / 2} Q ${entry.x} ${(exit.y + entry.y) / 2}, ${entry.x} ${entry.y} L ${to.x} ${to.y}`;
}

/** Arrow marker definition. */
function arrowMarker(id: string, color: string, size: number): string {
  return `<marker id="${id}" markerWidth="${size}" markerHeight="${size}" refX="${size - 2}" refY="${size / 2}" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L${size},${size / 2} L0,${size} Z" fill="${color}"/></marker>`;
}

// ---- Component ----

export class ConnectionPath {
  private container: HTMLElement;
  private overlay!: SVGSVGElement;
  private defsEl!: SVGDefsElement;
  private opts: Required<ConnectionPathOptions>;
  private connections: ConnectionDef[];
  private listeners = new Map<string, Set<ConnectionPathHandler>>();
  private _destroyed = false;
  private resizeObserver: ResizeObserver | null = null;
  private windowResizeHandler: (() => void) | null = null;
  private pathEls = new Map<string, { path: SVGPathElement; hitPath: SVGPathElement; label?: SVGTextElement; labelBg?: SVGRectElement }>();

  constructor(container: HTMLElement, options: ConnectionPathOptions = {}) {
    this.container = container;
    injectStyles();
    this.opts = {
      connections: options.connections ?? [],
      stroke: options.stroke ?? "#6B5FA8",
      strokeWidth: options.strokeWidth ?? 2,
      shape: options.shape ?? "bezier",
      arrow: options.arrow ?? "none",
      arrowSize: options.arrowSize ?? 10,
      curvature: options.curvature ?? 0.4,
      interactive: options.interactive ?? true,
    };
    this.connections = (this.opts.connections as ConnectionDef[]).map(c => ({ ...c }));
    this.render();

    // Track window resize
    this.windowResizeHandler = () => this.redraw();
    window.addEventListener("resize", this.windowResizeHandler);

    // Track container resize
    this.resizeObserver = new ResizeObserver(() => this.redraw());
    this.resizeObserver.observe(this.container);
  }

  private render(): void {
    if (this._destroyed) return;

    // Create or reuse SVG overlay
    const existing = this.container.querySelector(":scope > .cp-overlay") as SVGSVGElement | null;
    if (existing) {
      existing.remove();
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("cp-overlay");
    if (this.opts.interactive) svg.classList.add("cp-interactive");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    // Defs for arrow markers
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.appendChild(defs);
    this.defsEl = defs;

    this.container.appendChild(svg);
    this.overlay = svg;
    this.pathEls.clear();

    this.redraw();
  }

  /** Resolve an endpoint to a pixel coordinate + side. */
  private resolveEndpoint(ep: Endpoint): { x: number; y: number; side: ConnectionSide } | null {
    if (ep.type === "point") {
      return { x: ep.x, y: ep.y, side: ep.side ?? "right" };
    }
    // Element endpoint
    let el: HTMLElement | null;
    if (typeof ep.element === "string") {
      el = this.container.querySelector(ep.element) as HTMLElement | null;
    } else {
      el = ep.element;
    }
    if (!el) return null;

    // Track element for resize
    this.resizeObserver?.observe(el);

    const containerRect = this.container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset = ep.offset ?? 0;
    const side = ep.side ?? "right";

    let x: number, y: number;
    switch (side) {
      case "top":
        x = elRect.left - containerRect.left + elRect.width / 2;
        y = elRect.top - containerRect.top + offset;
        break;
      case "bottom":
        x = elRect.left - containerRect.left + elRect.width / 2;
        y = elRect.bottom - containerRect.top - offset;
        break;
      case "left":
        x = elRect.left - containerRect.left + offset;
        y = elRect.top - containerRect.top + elRect.height / 2;
        break;
      case "right":
        x = elRect.right - containerRect.left - offset;
        y = elRect.top - containerRect.top + elRect.height / 2;
        break;
    }
    return { x, y, side };
  }

  /** Compute the path string for a connection. */
  private computePath(conn: ConnectionDef): { d: string; fromPoint: { x: number; y: number }; toPoint: { x: number; y: number } } | null {
    const from = this.resolveEndpoint(conn.from);
    const to = this.resolveEndpoint(conn.to);
    if (!from || !to) return null;

    const shape = conn.shape ?? this.opts.shape;
    const curvature = conn.curvature ?? this.opts.curvature;
    let d: string;

    switch (shape) {
      case "step":
        d = stepPath(from, to, from.side, to.side);
        break;
      case "straight":
        d = straightPath(from, to);
        break;
      case "rounded":
        d = roundedPath(from, to, from.side, to.side);
        break;
      case "bezier":
      default:
        d = bezierPath(from, to, from.side, to.side, curvature);
        break;
    }
    return { d, fromPoint: from, toPoint: to };
  }

  /** Redraw all connections. */
  redraw(): void {
    if (this._destroyed || !this.overlay) return;

    // Clear existing paths (keep defs)
    const pathsToRemove = this.overlay.querySelectorAll(":scope > g, :scope > path, :scope > text, :scope > rect");
    pathsToRemove.forEach(el => el.remove());
    this.pathEls.clear();

    // Rebuild arrow markers in defs
    this.defsEl.innerHTML = "";

    for (const conn of this.connections) {
      const computed = this.computePath(conn);
      if (!computed) continue;

      const stroke = conn.stroke ?? this.opts.stroke;
      const strokeWidth = conn.strokeWidth ?? this.opts.strokeWidth;
      const opacity = conn.opacity ?? 1;
      const arrow = conn.arrow ?? this.opts.arrow;
      const arrowSize = conn.arrowSize ?? this.opts.arrowSize;

      // Arrow markers
      let markerStart = "";
      let markerEnd = "";
      if (arrow === "start" || arrow === "both") {
        const markerId = `cp-arrow-start-${conn.id}`;
        this.defsEl.innerHTML += arrowMarker(markerId, stroke, arrowSize);
        markerStart = `url(#${markerId})`;
      }
      if (arrow === "end" || arrow === "both") {
        const markerId = `cp-arrow-end-${conn.id}`;
        this.defsEl.innerHTML += arrowMarker(markerId, stroke, arrowSize);
        markerEnd = `url(#${markerId})`;
      }

      // Hit area (invisible, wider for easier clicking)
      const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitPath.classList.add("cp-path-hit");
      hitPath.setAttribute("d", computed.d);
      hitPath.setAttribute("data-conn-id", conn.id);
      if (this.opts.interactive) {
        hitPath.addEventListener("click", () => {
          this.emit("path_click", { connectionId: conn.id, source: "pointer" });
        });
        hitPath.addEventListener("mouseenter", () => {
          this.emit("path_hover", { connectionId: conn.id, source: "pointer" });
        });
      }
      this.overlay.appendChild(hitPath);

      // Visible path
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("cp-path");
      path.setAttribute("d", computed.d);
      path.setAttribute("stroke", stroke);
      path.setAttribute("stroke-width", String(strokeWidth));
      path.setAttribute("opacity", String(opacity));
      path.setAttribute("fill", "none");
      if (conn.strokeDasharray) path.setAttribute("stroke-dasharray", conn.strokeDasharray);
      if (markerStart) path.setAttribute("marker-start", markerStart);
      if (markerEnd) path.setAttribute("marker-end", markerEnd);
      if (conn.animated) {
        const speed = conn.animationSpeed ?? 50;
        const duration = 1000 / speed * 20;
        path.style.animation = `cp-dash-flow ${duration}s linear infinite`;
        if (!conn.strokeDasharray) path.setAttribute("stroke-dasharray", "6 4");
      }
      this.overlay.appendChild(path);

      // Label
      let label: SVGTextElement | undefined;
      let labelBg: SVGRectElement | undefined;
      if (conn.label) {
        const mx = (computed.fromPoint.x + computed.toPoint.x) / 2;
        const my = (computed.fromPoint.y + computed.toPoint.y) / 2;
        labelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        labelBg.classList.add("cp-label-bg");
        const labelWidth = conn.label.length * 6 + 8;
        labelBg.setAttribute("x", String(mx - labelWidth / 2));
        labelBg.setAttribute("y", String(my - 8));
        labelBg.setAttribute("width", String(labelWidth));
        labelBg.setAttribute("height", "16");
        this.overlay.appendChild(labelBg);

        label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.classList.add("cp-label");
        label.setAttribute("x", String(mx));
        label.setAttribute("y", String(my));
        label.setAttribute("fill", stroke);
        label.textContent = conn.label;
        this.overlay.appendChild(label);
      }

      this.pathEls.set(conn.id, { path, hitPath, label, labelBg });
    }
  }

  // ---- Data operations ----

  addConnection(conn: ConnectionDef): void {
    if (this._destroyed) return;
    if (this.connections.find(c => c.id === conn.id)) return;
    this.connections.push({ ...conn });
    this.redraw();
    this.emit("connection_added", { connectionId: conn.id, source: "programmatic" });
  }

  removeConnection(id: string): void {
    if (this._destroyed) return;
    const idx = this.connections.findIndex(c => c.id === id);
    if (idx < 0) return;
    this.connections.splice(idx, 1);
    this.redraw();
    this.emit("connection_removed", { connectionId: id, source: "programmatic" });
  }

  updateConnection(id: string, changes: Partial<ConnectionDef>): void {
    if (this._destroyed) return;
    const conn = this.connections.find(c => c.id === id);
    if (!conn) return;
    Object.assign(conn, changes);
    this.redraw();
  }

  setConnections(conns: ConnectionDef[]): void {
    if (this._destroyed) return;
    this.connections = conns.map(c => ({ ...c }));
    this.redraw();
  }

  getConnections(): ConnectionDef[] {
    return this.connections.map(c => ({ ...c }));
  }

  // ---- Property setter ----

  setProperty(name: string, value: unknown): void {
    if (this._destroyed) return;
    switch (name) {
      case "stroke": this.opts.stroke = value as string; break;
      case "strokeWidth": this.opts.strokeWidth = Number(value); break;
      case "shape": this.opts.shape = value as PathShape; break;
      case "arrow": this.opts.arrow = value as ArrowPosition; break;
      case "arrowSize": this.opts.arrowSize = Number(value); break;
      case "curvature": this.opts.curvature = Number(value); break;
      case "interactive": this.opts.interactive = !!value; break;
      case "connections": this.setConnections(value as ConnectionDef[]); return;
      default: return;
    }
    this.redraw();
  }

  // ---- Events ----

  on(event: string, handler: ConnectionPathHandler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }
  off(event: string, handler: ConnectionPathHandler): void {
    this.listeners.get(event)?.delete(handler);
  }
  private emit(event: string, payload: ConnectionPathEventPayload): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const p = { ...payload, type: event };
    for (const h of set) { try { h(p); } catch (e) { console.error(e); } }
  }

  // ---- Destroy ----

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this.windowResizeHandler) window.removeEventListener("resize", this.windowResizeHandler);
    this.resizeObserver?.disconnect();
    this.listeners.clear();
    this.overlay?.remove();
  }
}
