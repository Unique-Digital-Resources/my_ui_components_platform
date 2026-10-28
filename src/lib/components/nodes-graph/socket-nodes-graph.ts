/**
 * SocketNodesGraph — a node graph where each node is a "socket node" with
 * horizontal (left/right) connections and a vertical row layout.
 *
 * Built on top of the NodesGraph foundation. Each socket node contains
 * vertical rows; each row has at most one left socket and one right socket,
 * with a control component (checkbox, dropdown, range, text/number input,
 * label) between them. Connections go socket-to-socket (row-level), not
 * just side-to-side.
 *
 * The SocketNodesGraph class overrides:
 *   - `renderNodeContent()` — produces the row layout with sockets + controls.
 *   - `getConnectionPoint()` — returns the pixel position of a specific row
 *     socket (left edge or right edge of the row).
 *   - Node drag — the node height is derived from the number of rows.
 */

import {
  NodesGraph,
  type GraphNode,
  type GraphConnection,
  type GraphEventPayload,
  type GraphHandler,
  type ConnectionEndpoint,
  type ConnectionSide,
} from "./nodes-graph";

// ---- Public types ----

export type SocketSide = "left" | "right";

export type ControlType =
  | "label"
  | "checkbox"
  | "toggle"
  | "dropdown"
  | "range"
  | "text"
  | "number";

export interface SocketDef {
  id: string;
  label?: string;
  /** Allow multiple connections. Default: false. */
  multi?: boolean;
}

export interface ControlDef {
  type: ControlType;
  value?: unknown;
  label?: string;
  /** For dropdown: the options. */
  options?: { label: string; value: unknown }[];
  /** For range/number: min/max/step. */
  min?: number;
  max?: number;
  step?: number;
}

export interface SocketRow {
  id: string;
  leftSocket?: SocketDef;
  rightSocket?: SocketDef;
  control?: ControlDef;
}

export interface SocketNodeData {
  rows: SocketRow[];
  /** Optional description shown above the rows. */
  description?: string;
}

export interface SocketNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  sides?: ConnectionSide[];
  data: SocketNodeData;
  color?: string;
}

export interface SocketGraphOptions {
  nodes?: SocketNode[];
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
  nodeColor?: string;
}

export interface SocketGraphEventPayload extends GraphEventPayload {
  socketId?: string;
  controlId?: string;
  controlValue?: unknown;
}

export type SocketGraphHandler = (payload: SocketGraphEventPayload) => void;

// ---- Constants ----

const SOCKET_STYLE_ID = "socket-nodes-graph-styles";

/** Extra CSS for socket nodes (layered on top of the base ng- styles). */
function injectSocketStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(SOCKET_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = SOCKET_STYLE_ID;
  el.textContent = `
.ng-node.ng-socket-node {
  min-width: 200px;
  width: auto;
  height: auto;
}
.ng-socket-rows {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 4px 0;
}
.ng-socket-row {
  display: flex;
  align-items: center;
  min-height: 32px;
  padding: 0 8px;
  position: relative;
  border-bottom: 1px solid var(--ng-border);
}
.ng-socket-row:last-child { border-bottom: none; }
.ng-socket-row:hover {
  background: color-mix(in srgb, var(--ng-accent) 5%, transparent);
}

.ng-sock {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--ng-surface-3);
  border: 2px solid var(--ng-border);
  cursor: crosshair;
  z-index: 5;
  transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
}
.ng-sock:hover {
  border-color: var(--ng-accent);
  background: var(--ng-accent);
  transform: translateY(-50%) scale(1.4);
}
.ng-sock-left {
  left: -6px;
  transform: translateY(-50%);
}
.ng-sock-right {
  right: -6px;
  transform: translateY(-50%);
}
.ng-sock-left:hover { transform: translateY(-50%) scale(1.4); }
.ng-sock-right:hover { transform: translateY(-50%) scale(1.4); }

.ng-sock-label {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  color: var(--ng-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ng-sock-label-left {
  flex: 0 0 auto;
  width: 60px;
  padding-right: 8px;
  text-align: right;
}
.ng-sock-label-right {
  flex: 0 0 auto;
  width: 60px;
  padding-left: 8px;
  text-align: left;
}

.ng-control {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}
.ng-control-label {
  font-size: 11px;
  color: var(--ng-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ng-control input[type="text"],
.ng-control input[type="number"] {
  width: 100%;
  max-width: 100px;
  height: 22px;
  padding: 0 6px;
  background: var(--ng-surface-3);
  border: 1px solid var(--ng-border);
  border-radius: 3px;
  color: var(--ng-text);
  font: inherit;
  font-size: 11px;
  outline: none;
}
.ng-control input[type="text"]:focus,
.ng-control input[type="number"]:focus {
  border-color: var(--ng-accent);
}
.ng-control input[type="range"] {
  flex: 1 1 auto;
  height: 3px;
  appearance: none;
  background: var(--ng-surface-3);
  border-radius: 999px;
  cursor: pointer;
}
.ng-control input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--ng-accent);
  border: none;
  cursor: pointer;
}
.ng-control input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--ng-accent);
  border: none;
  cursor: pointer;
}
.ng-control select {
  height: 22px;
  padding: 0 6px;
  background: var(--ng-surface-3);
  border: 1px solid var(--ng-border);
  border-radius: 3px;
  color: var(--ng-text);
  font: inherit;
  font-size: 11px;
  outline: none;
  cursor: pointer;
}
.ng-control select:focus { border-color: var(--ng-accent); }
.ng-control input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--ng-accent);
  cursor: pointer;
}
.ng-control-toggle {
  position: relative;
  width: 32px;
  height: 18px;
  background: var(--ng-surface-3);
  border-radius: 999px;
  cursor: pointer;
  transition: background 120ms ease;
  flex: 0 0 auto;
}
.ng-control-toggle.on { background: var(--ng-accent); }
.ng-control-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: var(--ng-text);
  border-radius: 999px;
  transition: transform 120ms ease;
}
.ng-control-toggle.on::after { transform: translateX(14px); background: var(--ng-bg); }
`;
  document.head.appendChild(el);
}

// ---- Component ----

export class SocketNodesGraph extends NodesGraph {
  constructor(container: HTMLElement, options: SocketGraphOptions = {}) {
    injectSocketStyles();
    // Socket nodes only use left/right sides
    const nodes = (options.nodes ?? []).map((n) => ({
      ...n,
      sides: ["left", "right"] as ConnectionSide[],
      // Auto-size height based on rows; width is configurable
      height: n.height ?? 0, // will be computed
      width: n.width ?? 240,
    }));
    super(container, { ...options, nodes });
  }

  /** Add a socket node. data.rows defines the row layout. Returns the new id. */
  addSocketNode(partial: Partial<SocketNode>): string {
    const id = partial.id ?? `node-${Math.random().toString(36).slice(2, 9)}`;
    const node: GraphNode = {
      id,
      x: partial.x ?? 200,
      y: partial.y ?? 200,
      width: partial.width ?? 240,
      height: partial.height ?? 0,
      title: partial.title ?? "New Node",
      sides: ["left", "right"] as ConnectionSide[],
      data: partial.data ?? { rows: [] },
      color: partial.color,
    };
    return this.addNode(node);
  }

  // ---- Override: render the socket node body ----

  protected override renderNodeContent(node: GraphNode): HTMLElement {
    const body = document.createElement("div");
    body.className = "ng-socket-rows";
    const data = node.data as SocketNodeData | undefined;
    if (!data) return body;

    if (data.description) {
      const desc = document.createElement("div");
      desc.style.cssText = "padding: 4px 10px; font-size: 10px; color: var(--ng-muted); border-bottom: 1px solid var(--ng-border);";
      desc.textContent = data.description;
      body.appendChild(desc);
    }

    for (const row of data.rows) {
      const rowEl = document.createElement("div");
      rowEl.className = "ng-socket-row";
      rowEl.setAttribute("data-row-id", row.id);

      // Left socket
      if (row.leftSocket) {
        const sock = document.createElement("div");
        sock.className = "ng-sock ng-sock-left";
        sock.setAttribute("data-node-id", node.id);
        sock.setAttribute("data-side", "left");
        sock.setAttribute("data-socket-id", row.leftSocket.id);
        sock.setAttribute("role", "button");
        sock.setAttribute("aria-label", `Left socket: ${row.leftSocket.label ?? row.leftSocket.id}`);
        sock.addEventListener("pointerdown", (e) => this.onSocketPointerDown(e, node, "left", row.leftSocket!.id));
        rowEl.appendChild(sock);
      }

      // Left label
      if (row.leftSocket?.label) {
        const lbl = document.createElement("div");
        lbl.className = "ng-sock-label ng-sock-label-left";
        lbl.textContent = row.leftSocket.label;
        rowEl.appendChild(lbl);
      } else {
        const spacer = document.createElement("div");
        spacer.style.cssText = "flex: 0 0 auto; width: 60px;";
        rowEl.appendChild(spacer);
      }

      // Control
      const ctrlWrap = document.createElement("div");
      ctrlWrap.className = "ng-control";
      if (row.control) {
        ctrlWrap.appendChild(this.renderControl(node.id, row.id, row.control));
      }
      rowEl.appendChild(ctrlWrap);

      // Right label
      if (row.rightSocket?.label) {
        const lbl = document.createElement("div");
        lbl.className = "ng-sock-label ng-sock-label-right";
        lbl.textContent = row.rightSocket.label;
        rowEl.appendChild(lbl);
      } else {
        const spacer = document.createElement("div");
        spacer.style.cssText = "flex: 0 0 auto; width: 60px;";
        rowEl.appendChild(spacer);
      }

      // Right socket
      if (row.rightSocket) {
        const sock = document.createElement("div");
        sock.className = "ng-sock ng-sock-right";
        sock.setAttribute("data-node-id", node.id);
        sock.setAttribute("data-side", "right");
        sock.setAttribute("data-socket-id", row.rightSocket.id);
        sock.setAttribute("role", "button");
        sock.setAttribute("aria-label", `Right socket: ${row.rightSocket.label ?? row.rightSocket.id}`);
        sock.addEventListener("pointerdown", (e) => this.onSocketPointerDown(e, node, "right", row.rightSocket!.id));
        rowEl.appendChild(sock);
      }

      body.appendChild(rowEl);
    }

    // After the body is attached, measure the actual height and update the node
    requestAnimationFrame(() => {
      if (this._destroyed) return;
      const nodeEl = this.nodeEls.get(node.id);
      if (!nodeEl) return;
      const h = nodeEl.offsetHeight;
      const n = this.findNode(node.id);
      if (n && h > 0 && h !== n.height) {
        n.height = h;
        nodeEl.style.height = `${h}px`;
        this.drawConnections();
      }
    });

    return body;
  }

  /** Render a control component based on its type. */
  private renderControl(nodeId: string, rowId: string, control: ControlDef): HTMLElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display: flex; align-items: center; gap: 6px; width: 100%;";

    if (control.label && control.type !== "checkbox" && control.type !== "toggle") {
      const lbl = document.createElement("span");
      lbl.className = "ng-control-label";
      lbl.textContent = control.label;
      wrap.appendChild(lbl);
    }

    const emit = (value: unknown) => {
      this.emit("control_changed", {
        nodeId,
        socketId: rowId,
        controlId: rowId,
        controlValue: value,
        source: "pointer",
      });
    };

    switch (control.type) {
      case "label": {
        const lbl = document.createElement("span");
        lbl.className = "ng-control-label";
        lbl.textContent = control.value as string ?? control.label ?? "";
        wrap.appendChild(lbl);
        break;
      }
      case "checkbox": {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!control.value;
        input.addEventListener("change", () => emit(input.checked));
        if (control.label) {
          const lbl = document.createElement("span");
          lbl.className = "ng-control-label";
          lbl.textContent = control.label;
          wrap.appendChild(input);
          wrap.appendChild(lbl);
        } else {
          wrap.appendChild(input);
        }
        break;
      }
      case "toggle": {
        const toggle = document.createElement("div");
        toggle.className = "ng-control-toggle" + (control.value ? " on" : "");
        toggle.setAttribute("role", "switch");
        toggle.setAttribute("aria-checked", String(!!control.value));
        toggle.addEventListener("click", () => {
          const on = !toggle.classList.contains("on");
          toggle.classList.toggle("on", on);
          toggle.setAttribute("aria-checked", String(on));
          emit(on);
        });
        wrap.appendChild(toggle);
        if (control.label) {
          const lbl = document.createElement("span");
          lbl.className = "ng-control-label";
          lbl.textContent = control.label;
          wrap.appendChild(lbl);
        }
        break;
      }
      case "dropdown": {
        const sel = document.createElement("select");
        for (const opt of control.options ?? []) {
          const o = document.createElement("option");
          o.value = String(opt.value);
          o.textContent = opt.label;
          if (opt.value === control.value) o.selected = true;
          sel.appendChild(o);
        }
        sel.addEventListener("change", () => emit(sel.value));
        wrap.appendChild(sel);
        break;
      }
      case "range": {
        const input = document.createElement("input");
        input.type = "range";
        if (control.min !== undefined) input.min = String(control.min);
        if (control.max !== undefined) input.max = String(control.max);
        if (control.step !== undefined) input.step = String(control.step);
        input.value = String(control.value ?? control.min ?? 0);
        const valLbl = document.createElement("span");
        valLbl.className = "ng-control-label";
        valLbl.style.cssText = "font-family: var(--font-mono); font-size: 10px; min-width: 28px; text-align: right;";
        valLbl.textContent = input.value;
        input.addEventListener("input", () => {
          valLbl.textContent = input.value;
          emit(Number(input.value));
        });
        wrap.appendChild(input);
        wrap.appendChild(valLbl);
        break;
      }
      case "text": {
        const input = document.createElement("input");
        input.type = "text";
        input.value = (control.value as string) ?? "";
        input.placeholder = control.label ?? "";
        input.addEventListener("change", () => emit(input.value));
        wrap.appendChild(input);
        break;
      }
      case "number": {
        const input = document.createElement("input");
        input.type = "number";
        if (control.min !== undefined) input.min = String(control.min);
        if (control.max !== undefined) input.max = String(control.max);
        if (control.step !== undefined) input.step = String(control.step);
        input.value = String(control.value ?? "");
        input.addEventListener("change", () => emit(Number(input.value)));
        wrap.appendChild(input);
        break;
      }
    }
    return wrap;
  }

  // ---- Override: connection point for socket nodes ----

  protected override getConnectionPoint(ep: ConnectionEndpoint): { x: number; y: number } | null {
    const node = this.findNode(ep.node);
    if (!node) return null;
    // If no socketId, fall back to side center
    if (!ep.socketId) {
      return super.getConnectionPoint(ep);
    }
    // Find the row + socket DOM element and compute its world position
    const nodeEl = this.nodeEls.get(ep.node);
    if (!nodeEl) return null;
    const sockEl = nodeEl.querySelector(
      `[data-socket-id="${ep.socketId}"][data-side="${ep.side}"]`,
    ) as HTMLElement | null;
    if (!sockEl) return null;
    // The socket is positioned at left:-6 or right:-6 of the row.
    // World position = node.x + (sockEl offsetLeft relative to node) , node.y + (sockEl offsetTop + height/2)
    const row = sockEl.parentElement;
    if (!row) return null;
    // offsetTop within node body
    const rowTop = row.offsetTop;
    const rowH = row.offsetHeight;
    const y = node.y + rowTop + rowH / 2;
    // The header is above the body; account for it. offsetTop of the body container:
    const body = row.parentElement; // .ng-socket-rows
    const bodyOffset = body?.offsetTop ?? 0;
    const x = ep.side === "left" ? node.x : node.x + node.width;
    return { x, y: node.y + bodyOffset + rowTop + rowH / 2 };
  }

  // ---- Socket drag-to-connect ----

  private onSocketPointerDown(e: PointerEvent, node: GraphNode, side: "left" | "right", socketId: string): void {
    if (this.opts.readOnly || !this.opts.connectable) return;
    e.stopPropagation();
    e.preventDefault();
    this.panMode = "connect";
    this.dragConnectionFrom = { node: node.id, side, socketId };
    this.viewport.classList.add("ng-connecting");

    // Temp path
    this.tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.tempPath.classList.add("ng-conn-temp");
    this.svg.appendChild(this.tempPath);

    const onMove = (ev: PointerEvent) => {
      const from = this.getConnectionPoint(this.dragConnectionFrom!);
      if (!from || !this.tempPath) return;
      const to = this.screenToWorld(ev.clientX, ev.clientY);
      this.tempPath.setAttribute("d", bezierPathSimple(from, to, side));
    };
    const onUp = (ev: PointerEvent) => {
      this.viewport.classList.remove("ng-connecting");
      if (this.tempPath) {
        this.tempPath.remove();
        this.tempPath = null;
      }
      const releaseTarget = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const sockEl = releaseTarget?.closest(".ng-sock") as HTMLElement | null;
      if (sockEl) {
        const targetNode = sockEl.getAttribute("data-node-id");
        const targetSide = sockEl.getAttribute("data-side") as ConnectionSide;
        const targetSocket = sockEl.getAttribute("data-socket-id");
        if (targetNode && targetSide && targetSocket && targetNode !== node.id) {
          // Only left↔right connections make sense
          if (targetSide !== side) {
            this.addConnection(
              { node: node.id, side, socketId },
              { node: targetNode, side: targetSide, socketId: targetSocket },
            );
          }
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
}

// Simple bezier for socket connections (horizontal emphasis).
function bezierPathSimple(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: ConnectionSide,
): string {
  const dx = Math.abs(to.x - from.x);
  const offset = Math.max(40, dx * 0.5);
  const c1 = { x: from.x, y: from.y };
  const c2 = { x: to.x, y: to.y };
  if (fromSide === "left") c1.x -= offset; else c1.x += offset;
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}
