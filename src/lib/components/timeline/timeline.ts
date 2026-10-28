export type TimelineSide = "left" | "right" | "alternate";
export type TimelineEntry = { id: string; title: string; description?: string; date?: string; color?: string; icon?: string; };
export type TimelineOptions = { entries?: TimelineEntry[]; side?: TimelineSide; showDates?: boolean; showIcons?: boolean; };
const STYLE_ID = "timeline-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style"); el.id = STYLE_ID;
  el.textContent = `.tl-root{--tl-text:#F4F1FF;--tl-muted:#B8B2CA;--tl-accent:#D9FF66;--tl-border:#383343;--tl-surface:#211A30;font-family:inherit;color:var(--tl-text);position:relative;width:100%;padding:8px 0}.tl-line{position:absolute;top:0;bottom:0;width:2px;background:var(--tl-border)}.tl-side-left .tl-line{left:16px}.tl-side-right .tl-line{right:16px}.tl-side-alternate .tl-line{left:50%;transform:translateX(-50%)}.tl-entry{position:relative;display:flex;align-items:flex-start;gap:16px;padding:12px 0;min-height:48px}.tl-side-left .tl-entry{padding-left:40px;padding-right:16px}.tl-side-right .tl-entry{padding-right:40px;padding-left:16px;flex-direction:row-reverse}.tl-side-alternate .tl-entry:nth-child(odd){padding-left:50%;padding-right:16px}.tl-side-alternate .tl-entry:nth-child(even){padding-right:50%;padding-left:16px;flex-direction:row-reverse}.tl-marker{position:absolute;top:16px;width:12px;height:12px;border-radius:999px;background:var(--tl-accent);border:2px solid var(--tl-surface);z-index:1}.tl-side-left .tl-marker{left:11px}.tl-side-right .tl-marker{right:11px}.tl-side-alternate .tl-marker{left:50%;transform:translateX(-50%)}.tl-content{flex:1 1 auto;background:var(--tl-surface);border:1px solid var(--tl-border);border-radius:6px;padding:8px 12px;min-width:0}.tl-date{font-family:var(--font-mono,ui-monospace,monospace);font-size:10px;color:var(--tl-accent);margin-bottom:2px}.tl-title{font-size:13px;font-weight:600;color:var(--tl-text)}.tl-desc{font-size:11px;color:var(--tl-muted);margin-top:2px;line-height:1.4}`;
  document.head.appendChild(el);
}
export class Timeline {
  private container: HTMLElement; private root!: HTMLElement; private opts: Required<TimelineOptions>;
  private entries: TimelineEntry[]; private _destroyed = false;
  constructor(container: HTMLElement, options: TimelineOptions = {}) {
    this.container = container; injectStyles();
    this.opts = { entries: options.entries ?? [], side: options.side ?? "left", showDates: options.showDates ?? true, showIcons: options.showIcons ?? false };
    this.entries = (this.opts.entries as TimelineEntry[]).map(e => ({ ...e })); this.render();
  }
  private render() {
    if (this._destroyed) return; const root = document.createElement("div"); root.className = `tl-root tl-side-${this.opts.side}`;
    const line = document.createElement("div"); line.className = "tl-line"; root.appendChild(line);
    for (const entry of this.entries) root.appendChild(this.renderEntry(entry));
    this.container.innerHTML = ""; this.container.appendChild(root); this.root = root;
  }
  private renderEntry(entry: TimelineEntry) {
    const el = document.createElement("div"); el.className = "tl-entry"; el.setAttribute("data-entry-id", entry.id);
    const marker = document.createElement("div"); marker.className = "tl-marker"; if (entry.color) marker.style.background = entry.color; el.appendChild(marker);
    const content = document.createElement("div"); content.className = "tl-content";
    if (this.opts.showDates && entry.date) { const d = document.createElement("div"); d.className = "tl-date"; d.textContent = entry.date; content.appendChild(d); }
    const title = document.createElement("div"); title.className = "tl-title"; title.textContent = entry.title; content.appendChild(title);
    if (entry.description) { const desc = document.createElement("div"); desc.className = "tl-desc"; desc.textContent = entry.description; content.appendChild(desc); }
    el.appendChild(content); return el;
  }
  setEntries(entries: TimelineEntry[]) { if (this._destroyed) return; this.entries = entries.map(e => ({ ...e })); this.render(); }
  setProperty(name: string, value: unknown) { if (this._destroyed) return; if (name === "side") this.opts.side = value as TimelineSide; else if (name === "showDates") this.opts.showDates = !!value; else if (name === "showIcons") this.opts.showIcons = !!value; else if (name === "entries") { this.setEntries(value as TimelineEntry[]); return; } else return; this.render(); }
  destroy() { if (this._destroyed) return; this._destroyed = true; this.container.innerHTML = ""; }
}
