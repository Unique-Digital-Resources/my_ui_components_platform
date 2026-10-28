"use client";

import * as React from "react";
import { Check, AlertTriangle, Package, Link2 } from "lucide-react";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock } from "@/components/platform/code-block";
import { PageContainer } from "@/components/platform/shell";
import { cn } from "@/lib/utils";

type DistributionMethod = "package" | "cdn";

const PREREQUISITES: { icon: React.ElementType; label: string; description: string }[] = [
  {
    icon: Check,
    label: "A modern browser",
    description: "Any evergreen browser (Chrome, Firefox, Safari, Edge).",
  },
  {
    icon: Check,
    label: "An HTML page",
    description: "A host document with a container element for the component.",
  },
  {
    icon: Check,
    label: "Optional build step",
    description: "A bundler is not required, but supported if you prefer one.",
  },
];

const TROUBLESHOOTING: { symptom: string; fix: string }[] = [
  {
    symptom: "No styles — the wheel appears unstyled or stacked",
    fix: "Check that the color-wheel-picker.css stylesheet is linked in your document head and loaded before initialization.",
  },
  {
    symptom: "Container has zero size — the canvas never appears",
    fix: "Ensure the container element has explicit dimensions or a layout context before constructing the picker.",
  },
  {
    symptom: "Duplicate initialization — two pickers render in one container",
    fix: "Destroy the previous instance with picker.destroy() before constructing a new one in the same container.",
  },
  {
    symptom: "Events fire twice — listeners stacked after re-init",
    fix: "Always call off() or destroy() to remove handlers before re-creating the component.",
  },
];

export default function DocsInstallationView() {
  const [method, setMethod] = React.useState<DistributionMethod>("package");

  return (
    <PageContainer>
      <Breadcrumbs />
      <PageOverline>Documentation</PageOverline>
      <h1 className="text-3xl font-semibold tracking-tight">Installation</h1>
      <p className="mt-3 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
        Get the Color Wheel Picker running in your project in a few minutes.
        Pick a distribution method, include the stylesheet, drop a container
        into your markup, and initialize the component.
      </p>

      {/* Prerequisites */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Prerequisites</h2>
        <div className="panel mt-4 p-5">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PREREQUISITES.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-lemon" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Distribution method */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Choose a distribution method</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          The library ships as both an installable package and a pre-built ES
          module. Pick whichever matches your toolchain.
        </p>

        <div
          role="tablist"
          aria-label="Distribution method"
          className="mt-5 inline-flex rounded-lg border border-border bg-muted/30 p-1"
        >
          <button
            role="tab"
            aria-selected={method === "package"}
            type="button"
            onClick={() => setMethod("package")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              method === "package"
                ? "bg-brand-lemon text-brand-black"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Package className="h-4 w-4" />
            Package manager
          </button>
          <button
            role="tab"
            aria-selected={method === "cdn"}
            type="button"
            onClick={() => setMethod("cdn")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              method === "cdn"
                ? "bg-brand-lemon text-brand-black"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Link2 className="h-4 w-4" />
            Direct import
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {method === "package" ? (
            <>
              <CodeBlock
                language="bash"
                filename="terminal"
                code={`npm install @workshop/color-wheel`}
              />
              <CodeBlock
                language="javascript"
                filename="app.js"
                code={`import { ColorWheelPicker } from "@workshop/color-wheel";`}
              />
            </>
          ) : (
            <CodeBlock
              language="html"
              filename="index.html"
              code={`<script type="module" src="https://unpkg.com/@workshop/color-wheel/dist/color-wheel-picker.js"></script>`}
            />
          )}
        </div>
      </section>

      {/* Include the CSS */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Include the CSS</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          The component depends on a small stylesheet that scopes the canvas,
          focus ring, and marker overrides. Link it in the document head.
        </p>
        <div className="mt-4">
          <CodeBlock
            language="html"
            filename="index.html"
            code={`<link rel="stylesheet" href="color-wheel-picker.css" />`}
          />
        </div>
      </section>

      {/* Add a container */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Add a container</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          The component renders inside a host element you provide. Give the
          container an identifier so you can target it from JavaScript.
        </p>
        <div className="mt-4">
          <CodeBlock
            language="html"
            filename="index.html"
            code={`<div id="color-picker"></div>`}
          />
        </div>
      </section>

      {/* Initialize the component */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Initialize the component</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          Construct a <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">ColorWheelPicker</code>{" "}
          instance, passing the container and any options you want to override.
          Subscribe to <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">change</code>{" "}
          to be notified when the user commits a color.
        </p>
        <div className="mt-4">
          <CodeBlock
            language="javascript"
            filename="app.js"
            code={`import { ColorWheelPicker } from "@workshop/color-wheel";

const picker = new ColorWheelPicker(document.querySelector("#color-picker"), {
  shape: "triangle",
  size: 180,
  color: "#4287f5",
});

picker.on("change", ({ hex }) => console.log(hex));`}
          />
        </div>
      </section>

      {/* Verify */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Verify</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          After initializing, the picker should render immediately. If nothing
          appears, open the browser console — the library logs clearly when a
          container cannot be found or has zero size.
        </p>
        <div className="panel mt-4 flex items-start gap-3 p-5">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-lemon" />
          <div className="max-w-[720px]">
            <p className="text-sm font-medium text-foreground">What you should see</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              You should see a circular hue wheel with a triangular inner area.
              Drag inside the wheel to change hue, drag inside the triangle to
              change saturation and value.
            </p>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Troubleshooting</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          Common installation issues and their fixes.
        </p>
        <dl className="mt-5 space-y-3">
          {TROUBLESHOOTING.map((item) => (
            <div
              key={item.symptom}
              className="panel flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4"
            >
              <dt className="flex items-start gap-2 sm:w-1/2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple-soft" />
                <span className="text-sm font-medium text-foreground">{item.symptom}</span>
              </dt>
              <dd className="text-sm leading-relaxed text-muted-foreground sm:w-1/2 sm:pl-4 sm:border-l sm:border-border">
                {item.fix}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </PageContainer>
  );
}
