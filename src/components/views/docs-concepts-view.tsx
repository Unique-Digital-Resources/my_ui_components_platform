"use client";

import * as React from "react";
import {
  Boxes,
  SlidersHorizontal,
  Radio,
  Layers,
} from "lucide-react";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock } from "@/components/platform/code-block";
import { PageContainer } from "@/components/platform/shell";
import { cn } from "@/lib/utils";

const CONCEPT_CARDS: { icon: React.ElementType; title: string; description: string }[] = [
  {
    icon: Boxes,
    title: "Component initialization",
    description:
      "Construct a picker by handing it a container element and an options object. Defaults are merged with your overrides.",
  },
  {
    icon: SlidersHorizontal,
    title: "State and updates",
    description:
      "The component owns its DOM and internal state. Setter methods update both the state and the rendered output atomically.",
  },
  {
    icon: Radio,
    title: "Events and lifecycle",
    description:
      "Subscribe with on(), unsubscribe with off(), and clean up with destroy(). Continuous events fire during interaction; committed events fire on release.",
  },
  {
    icon: Layers,
    title: "Framework interoperability",
    description:
      "The library is vanilla JavaScript. Wrap it in React, Vue, or Svelte with a thin effect-based wrapper that owns the instance.",
  },
];

export default function DocsConceptsView() {
  return (
    <PageContainer>
      <Breadcrumbs />
      <PageOverline>Documentation</PageOverline>
      <h1 className="text-3xl font-semibold tracking-tight">Core concepts</h1>
      <p className="mt-3 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
        The component library follows a small set of conventions. Once you
        understand initialization, state ownership, the event lifecycle, and
        how to wrap the vanilla API in a framework, every component feels the
        same.
      </p>

      {/* Concept cards */}
      <section className="mt-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CONCEPT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="panel p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/40 text-brand-lemon">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-semibold text-foreground">{card.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Component initialization */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Component initialization</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          Every component is constructed with the same shape: a host element
          followed by an optional options object. The library reads the
          container's dimensions, creates its DOM, and binds its event
          listeners during construction. You never append children yourself.
        </p>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          Options are merged with sensible defaults — you only need to specify
          the things you want to change. After construction, the picker is
          immediately interactive.
        </p>
        <div className="mt-4">
          <CodeBlock
            language="javascript"
            filename="init.js"
            code={`import { ColorWheelPicker } from "@workshop/color-wheel";

// Defaults: shape = "triangle", size = 180, color = "#4287f5"
const picker = new ColorWheelPicker(document.querySelector("#picker"), {
  shape: "square",
  size: 220,
  wheelThickness: 28,
  color: "#D9FF66",
});`}
          />
        </div>
      </section>

      {/* State and updates */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">State and updates</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          The component owns its DOM and its internal state. Setter methods
          such as <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">setColor</code>,{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">setShape</code>, and{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">setSize</code>{" "}
          update both the underlying state and the rendered output in one
          atomic operation. Reads happen through{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">getColor()</code>,{" "}
          which always reflects the current state.
        </p>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          Geometry-only setters (like{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">setShape</code>{" "}
          and{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">setSize</code>)
          preserve the current color so reconfiguring the component never
          throws away a user's selection.
        </p>
        <div className="mt-4">
          <CodeBlock
            language="javascript"
            filename="state.js"
            code={`// Update the color programmatically — state and canvas update together.
picker.setColor("#FF6B6B");

// Reconfigure geometry without losing the current selection.
picker.setShape("disk");
picker.setSize(240);

// Read the current state at any time.
const { hex, hsv, rgb, hsl } = picker.getColor();`}
          />
        </div>
      </section>

      {/* Events and lifecycle */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Events and lifecycle</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          The component distinguishes between two events:
        </p>
        <ul className="mt-3 max-w-[720px] space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-lemon" />
            <span>
              <span className="font-medium text-foreground">input</span> fires
              continuously while the user drags a marker. Use it for live
              previews and tied UI updates.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-lemon" />
            <span>
              <span className="font-medium text-foreground">change</span> fires
              once when the user commits a selection (releases the pointer).
              Use it to persist a value or trigger an expensive operation.
            </span>
          </li>
        </ul>
        <p className="mt-3 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          Subscribe with{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">on()</code>{" "}
          and unsubscribe with{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">off()</code>{" "}
          or{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">destroy()</code>.{" "}
          Always call{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">destroy()</code>{" "}
          when the host element leaves the DOM — it removes listeners,
          disconnects observers, and frees canvas memory.
        </p>
        <div className="mt-4">
          <CodeBlock
            language="javascript"
            filename="events.js"
            code={`const onInput = ({ hex }) => updatePreview(hex);
const onChange = ({ hex }) => saveColor(hex);

picker.on("input", onInput);
picker.on("change", onChange);

// Later — when the host element is removed:
picker.off("input", onInput);
picker.off("change", onChange);
picker.destroy();`}
          />
        </div>
      </section>

      {/* Framework interoperability */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Framework interoperability</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          Because the component is vanilla JavaScript, it drops cleanly into
          any framework. The pattern is the same everywhere: construct the
          instance once, forward prop changes through the imperative API, and
          destroy on unmount.
        </p>
        <div
          className={cn(
            "mt-4 rounded-lg border border-brand-lemon/30 bg-brand-lemon/[0.04] p-4"
          )}
        >
          <p className="text-[13px] leading-relaxed text-foreground">
            <span className="font-semibold text-brand-lemon">Important.</span>{" "}
            The host framework should <span className="font-medium">not</span>{" "}
            re-create the instance on every render. Construct it in an effect
            (or on first mount) and store the reference; subsequent renders
            should only call the imperative setters when props actually change.
          </p>
        </div>
        <div className="mt-4">
          <CodeBlock
            language="tsx"
            filename="ColorWheel.tsx"
            code={`import { useEffect, useRef } from "react";
import { ColorWheelPicker } from "@workshop/color-wheel";

export function ColorWheel({ color, shape, onChange }) {
  const ref = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<ColorWheelPicker | null>(null);

  useEffect(() => {
    const picker = new ColorWheelPicker(ref.current!, { color, shape });
    picker.on("change", (c) => onChange(c.hex));
    pickerRef.current = picker;
    return () => picker.destroy();
    // Construct once — don't re-create on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Forward prop changes through the imperative API.
  useEffect(() => {
    pickerRef.current?.setColor(color);
  }, [color]);

  useEffect(() => {
    pickerRef.current?.setShape(shape);
  }, [shape]);

  return <div ref={ref} />;
}`}
          />
        </div>
      </section>
    </PageContainer>
  );
}
