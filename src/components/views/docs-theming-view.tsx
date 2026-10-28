"use client";

import * as React from "react";
import {
  Palette,
  Sun,
  Moon,
  Focus,
  MousePointerClick,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock } from "@/components/platform/code-block";
import { PageContainer } from "@/components/platform/shell";
import { cn } from "@/lib/utils";

interface CustomizationPoint {
  variable: string;
  default: string;
  purpose: string;
}

const CUSTOMIZATION_POINTS: CustomizationPoint[] = [
  {
    variable: "--color-picker-marker-border",
    default: "#ffffff",
    purpose: "Border color of the hue and inner markers.",
  },
  {
    variable: "--color-picker-marker-size",
    default: "14px",
    purpose: "Diameter of the markers drawn on the wheel and inner shape.",
  },
  {
    variable: "--color-picker-ring-width",
    default: "2px",
    purpose: "Stroke width of the marker ring.",
  },
  {
    variable: "--color-picker-cursor",
    default: "crosshair",
    purpose: "Cursor shown when hovering over interactive regions.",
  },
  {
    variable: "--color-picker-focus-ring",
    default: "#D9FF66",
    purpose: "Color of the focus ring drawn around an active canvas.",
  },
];

const INTERACTION_STATES: { icon: React.ElementType; label: string; description: string }[] = [
  {
    icon: Focus,
    label: "Focus",
    description: "When the canvas receives keyboard focus, a lemon ring is drawn around the component.",
  },
  {
    icon: MousePointerClick,
    label: "Hover",
    description: "The cursor switches to crosshair over the wheel and inner shape to signal interactivity.",
  },
  {
    icon: Ban,
    label: "Disabled",
    description: "Set a [data-disabled] attribute on the container to disable pointer and keyboard interaction.",
  },
  {
    icon: CheckCircle2,
    label: "Selected",
    description: "The inner marker reflects the current color; the wheel marker shows the active hue.",
  },
];

export default function DocsThemingView() {
  return (
    <PageContainer>
      <Breadcrumbs />
      <PageOverline>Documentation</PageOverline>
      <h1 className="text-3xl font-semibold tracking-tight">Theming and customization</h1>
      <p className="mt-3 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
        The component library is designed to fit into your design system rather
        than impose its own. Theming happens entirely through CSS custom
        properties — no JavaScript configuration, no build step, no override
        layer.
      </p>

      {/* Design tokens */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Design tokens</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          The platform uses semantic CSS custom properties such as{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">--surface</code>,{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">--text-primary</code>,{" "}
          and{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">--border</code>{" "}
          to describe its surfaces. The component library uses its own prefixed
          variables —{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">--color-picker-*</code>{" "}
          — so it never collides with host tokens.
        </p>
        <div className="mt-4">
          <CodeBlock
            language="css"
            filename="tokens.css"
            code={`:root {
  --color-picker-marker-border: #ffffff;
  --color-picker-marker-size: 14px;
  --color-picker-ring-width: 2px;
  --color-picker-cursor: crosshair;
  --color-picker-focus-ring: #d9ff66;
}`}
          />
        </div>
      </section>

      {/* Customization points */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Supported customization points</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          These are the public variables the component reads. Override them on
          the container, on a parent, or globally in{" "}
          <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-brand-lemon">:root</code>{" "}
          to change the look across every instance.
        </p>
        <div className="panel mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Variable
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Default
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody>
                {CUSTOMIZATION_POINTS.map((row) => (
                  <tr
                    key={row.variable}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <td className="px-4 py-3 align-top font-mono text-[12px] text-brand-lemon">
                      {row.variable}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-[12px] text-foreground">
                      {row.default}
                    </td>
                    <td className="px-4 py-3 align-top text-[13px] leading-relaxed text-muted-foreground">
                      {row.purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Light and dark themes */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Light and dark themes</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          The component draws on a transparent canvas, so it adapts to whatever
          surface you place it on. The hue wheel and inner gradients are
          rendered independently of the surrounding chrome — your responsibility
          is to provide a surface with sufficient contrast for the markers.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-brand-lemon" />
              <h3 className="text-base font-semibold text-foreground">Dark surface</h3>
            </div>
            <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-border bg-brand-black">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/80 bg-[#4287f5]">
                <div className="h-3 w-3 rounded-full border-2 border-white bg-[#4287f5]" />
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Markers with a white border sit cleanly on a dark surface. Default
              token values are tuned for this case.
            </p>
          </div>
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-brand-lemon" />
              <h3 className="text-base font-semibold text-foreground">Light surface</h3>
            </div>
            <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-border bg-[#FAFAFC]">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-brand-black/80 bg-[#4287f5]">
                <div className="h-3 w-3 rounded-full border-2 border-brand-black bg-[#4287f5]" />
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              On a light surface, override{" "}
              <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-brand-lemon">--color-picker-marker-border</code>{" "}
              to a darker value so the markers remain perceivable.
            </p>
          </div>
        </div>
      </section>

      {/* Interaction states */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Interaction states</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          The component communicates state through consistent visual and
          behavioral cues, all of which can be themed.
        </p>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {INTERACTION_STATES.map((state) => {
            const Icon = state.icon;
            return (
              <li
                key={state.label}
                className="flex items-start gap-3 rounded-lg border border-border bg-card/40 p-4"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-lemon" />
                <div>
                  <p className="text-sm font-medium text-foreground">{state.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                    {state.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Before-and-after example */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Before-and-after example</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          The most common customization is the marker border color. The pair
          below shows the same color selection rendered with the default white
          border (left) and with a lemon border (right) by overriding a single
          variable on the container.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Default</h3>
              <span className="eyebrow">--color-picker-marker-border: #fff</span>
            </div>
            <div className="mt-4 flex h-40 items-center justify-center rounded-md border border-border bg-brand-black">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-white bg-[#4287f5]">
                <div className="h-5 w-5 rounded-full border-[3px] border-white bg-[#4287f5] shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" />
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              The default white border reads well on dark surfaces but washes
              out on bright backgrounds.
            </p>
          </div>
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Customized</h3>
              <span className="eyebrow">--color-picker-marker-border: #D9FF66</span>
            </div>
            <div className="mt-4 flex h-40 items-center justify-center rounded-md border border-border bg-brand-black">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand-lemon bg-[#4287f5]">
                <div className="h-5 w-5 rounded-full border-[3px] border-brand-lemon bg-[#4287f5] shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" />
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              A lemon border ties the marker to the platform accent and stays
              visible across more surfaces.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <CodeBlock
            language="css"
            filename="override.css"
            code={`/* Scope overrides to a single container */
.dark-surface .color-picker {
  --color-picker-marker-border: #ffffff;
}

.light-surface .color-picker {
  --color-picker-marker-border: #17151D;
}

/* Or tie the marker to the brand accent everywhere */
.color-picker--accent {
  --color-picker-marker-border: #D9FF66;
}`}
          />
        </div>
      </section>
    </PageContainer>
  );
}
