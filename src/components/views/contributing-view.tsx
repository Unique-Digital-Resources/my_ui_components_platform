"use client";

import * as React from "react";
import {
  Accessibility,
  Bug,
  ExternalLink,
  FileCode,
  GitBranch,
  GitPullRequest,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { PageContainer } from "@/components/platform/shell";
import { CodeBlock } from "@/components/platform/code-block";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  icon: LucideIcon;
}

const SECTIONS: Section[] = [
  { id: "overview", title: "Contribution overview", icon: ListChecks },
  { id: "principles", title: "Component design principles", icon: GitBranch },
  { id: "api", title: "Public API conventions", icon: FileCode },
  { id: "accessibility", title: "Accessibility requirements", icon: Accessibility },
  { id: "testing", title: "Testing expectations", icon: FileCode },
  { id: "documentation", title: "Documentation requirements", icon: FileCode },
  { id: "issues", title: "Issue reporting", icon: Bug },
  { id: "pull-requests", title: "Pull request workflow", icon: GitPullRequest },
];

const DESIGN_PRINCIPLES: { name: string; description: string }[] = [
  {
    name: "Framework-agnostic",
    description:
      "Components are written in plain TypeScript with no framework dependency. They mount to a DOM node and work in any environment that runs JavaScript.",
  },
  {
    name: "Composable",
    description:
      "Components own a single responsibility and can be combined into larger interfaces without coupling to each other.",
  },
  {
    name: "Configurable",
    description:
      "Behavior is exposed through a typed options object. Sensible defaults mean components work out of the box, with deeper customization available when needed.",
  },
  {
    name: "Interactive",
    description:
      "Components respond to both pointer and keyboard input. Continuous and committed states are surfaced through distinct events.",
  },
  {
    name: "Accessible",
    description:
      "Keyboard navigation, focus management, and ARIA semantics are part of the core implementation, not bolted on after the fact.",
  },
  {
    name: "Lightweight",
    description:
      "No heavy runtime dependencies. The bundle for any single component should remain small enough to drop into any project.",
  },
  {
    name: "Themeable",
    description:
      "Visual styling is driven by CSS custom properties so that the host application can override tokens without forking the component.",
  },
  {
    name: "Consistent",
    description:
      "Components share naming, event, and lifecycle conventions so that learning one component transfers to the rest of the library.",
  },
];

const ACCESSIBILITY_REQUIREMENTS: string[] = [
  "All interactive controls must be operable with the keyboard alone, including arrow-key adjustment and Home/End jumps where appropriate.",
  "Visible focus rings must be present on every focusable element, using the platform focus token so they stay readable across themes.",
  "Use ARIA roles, states, and properties to expose semantics to assistive technologies. Canvas-rendered components need an accessible name and a live region or sibling control to surface the current value.",
  "Maintain WCAG AA color contrast for text and essential UI affordances in both light and dark themes.",
];

const API_CODE = `import type { ColorOutput } from "workshop-ui";

interface ColorPickerOptions {
  shape?: "triangle" | "square" | "disk" | "none";
  size?: number;
  color?: string;
  hue?: number;
}

type ColorHandler = (color: ColorOutput) => void;

class ColorPicker {
  constructor(container: HTMLElement, options?: ColorPickerOptions) {}

  setColor(color: string): void {}
  getColor(): ColorOutput { /* ... */ }

  on(event: "input" | "change", handler: ColorHandler): void {}
  off(event: "input" | "change", handler: ColorHandler): void {}

  destroy(): void {} // remove listeners, free resources
}`;

function SectionHeading({ section }: { section: Section }) {
  const Icon = section.icon;
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/30">
        <Icon className="h-4 w-4 text-brand-lemon" />
      </div>
      <h2
        id={section.id}
        className="scroll-mt-20 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
      >
        {section.title}
      </h2>
    </div>
  );
}

function TableOfContents() {
  const [activeId, setActiveId] = React.useState<string>("overview");

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Page sections" className="flex flex-col gap-1">
      <p className="eyebrow mb-2">On this page</p>
      <ol className="flex flex-col gap-0.5">
        {SECTIONS.map((s, i) => {
          const active = activeId === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    active ? "text-brand-lemon" : "text-muted-foreground/60"
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate">{s.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ContributingView() {
  return (
    <PageContainer>
      <Breadcrumbs />
      <div className="mt-6">
        <PageOverline>Project</PageOverline>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Contributing
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          How to contribute components, fixes, tests, and documentation.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_220px]">
        {/* Main content */}
        <div className="min-w-0 flex flex-col gap-12">
          {/* 1. Overview */}
          <section aria-labelledby="overview" className="flex flex-col gap-4">
            <SectionHeading section={SECTIONS[0]} />
            <div className="max-w-prose text-[15px] leading-relaxed text-foreground/90">
              <p>
                The Workshop library is built one component at a time, and
                every component should feel like it belongs to the same family.
                Whether you are adding a new component, fixing a bug, or
                improving documentation, this guide describes the conventions
                every contribution is expected to follow.
              </p>
              <p className="mt-4 text-muted-foreground">
                Contributions of all sizes are welcome. Small fixes — a clearer
                docstring, a missing keyboard shortcut, a contrast tweak — are
                just as valuable as new components. Before opening a pull
                request, please skim the sections below so your contribution
                can land quickly.
              </p>
            </div>
          </section>

          {/* 2. Principles */}
          <section aria-labelledby="principles" className="flex flex-col gap-4">
            <SectionHeading section={SECTIONS[1]} />
            <p className="max-w-prose text-[14px] leading-relaxed text-muted-foreground">
              Every component in the library adheres to the following design
              principles. New components should be evaluated against each one
              before being proposed for inclusion.
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DESIGN_PRINCIPLES.map((p) => (
                <li key={p.name} className="panel p-4">
                  <p className="text-[14px] font-medium text-foreground">
                    {p.name}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {p.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* 3. Public API conventions */}
          <section aria-labelledby="api" className="flex flex-col gap-4">
            <SectionHeading section={SECTIONS[2]} />
            <div className="max-w-prose text-[14px] leading-relaxed text-muted-foreground">
              <p>
                A consistent public API is what makes the library feel like a
                coherent set of tools rather than a loose collection of
                scripts. Every component follows these conventions:
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <span className="text-foreground">Naming.</span> Component
                  classes are PascalCase nouns (e.g. <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px] text-foreground">ColorPicker</code>);
                  options are camelCase.
                </li>
                <li>
                  <span className="text-foreground">Options object.</span> The
                  constructor takes a container element and an optional typed
                  options object. Every option has a default, so an empty
                  options object always produces a working component.
                </li>
                <li>
                  <span className="text-foreground">Events.</span> Use{" "}
                  <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px] text-foreground">on(event, handler)</code>{" "}
                  and{" "}
                  <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px] text-foreground">off(event, handler)</code>{" "}
                  for subscriptions. Distinguish{" "}
                  <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px] text-foreground">input</code>{" "}
                  (continuous) from{" "}
                  <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px] text-foreground">change</code>{" "}
                  (committed) where it makes sense.
                </li>
                <li>
                  <span className="text-foreground">Cleanup.</span> Implement a{" "}
                  <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px] text-foreground">destroy()</code>{" "}
                  method that removes every listener, releases pointer capture,
                  disconnects observers, and removes injected DOM. It must be
                  safe to call more than once.
                </li>
              </ul>
            </div>
            <CodeBlock
              code={API_CODE}
              language="typescript"
              filename="component-conventions.ts"
            />
          </section>

          {/* 4. Accessibility */}
          <section aria-labelledby="accessibility" className="flex flex-col gap-4">
            <SectionHeading section={SECTIONS[3]} />
            <p className="max-w-prose text-[14px] leading-relaxed text-muted-foreground">
              Accessibility is a functional requirement, not a polish step.
              Every contribution must meet the following bar before it can be
              merged.
            </p>
            <ul className="flex flex-col gap-2.5">
              {ACCESSIBILITY_REQUIREMENTS.map((req, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-lemon" aria-hidden />
                  <p className="text-[14px] leading-relaxed text-foreground/90">
                    {req}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* 5. Testing */}
          <section aria-labelledby="testing" className="flex flex-col gap-4">
            <SectionHeading section={SECTIONS[4]} />
            <div className="max-w-prose text-[14px] leading-relaxed text-muted-foreground">
              <p>
                Components are required to work in plain HTML — a single
                <code className="mx-1 rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px] text-foreground">
                  &lt;div&gt;
                </code>
                and a script tag should be enough to instantiate any component
                without a build step. This keeps the component honest about its
                dependencies and makes it trivial to debug.
              </p>
              <p className="mt-3">
                Both manual and automated checks are expected. Manual checks
                cover keyboard navigation, focus order, screen-reader output,
                and visual contrast against the brand palette. Automated checks
                cover the public API contract: construction, option defaults,
                event emission, and <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px] text-foreground">destroy()</code> idempotency.
              </p>
              <p className="mt-3">
                A pull request that adds or changes a public API method must
                include a test that exercises it. Bug-fix pull requests should
                include a regression test that fails before the fix and passes
                after.
              </p>
            </div>
          </section>

          {/* 6. Documentation */}
          <section aria-labelledby="documentation" className="flex flex-col gap-4">
            <SectionHeading section={SECTIONS[5]} />
            <p className="max-w-prose text-[14px] leading-relaxed text-muted-foreground">
              Every component ships with documentation. A component is not
              considered complete until the following exist:
            </p>
            <ul className="flex flex-col gap-2.5">
              {[
                "A playground page that mounts the live component and exposes its options interactively.",
                "An API table listing every option, method, and event with its type, default, and a one-line description.",
                "At least one copyable code example for the most common usage, plus an example for each non-default configuration.",
              ].map((req, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-lemon" aria-hidden />
                  <p className="text-[14px] leading-relaxed text-foreground/90">
                    {req}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* 7. Issue reporting */}
          <section aria-labelledby="issues" className="flex flex-col gap-4">
            <SectionHeading section={SECTIONS[6]} />
            <div className="max-w-prose text-[14px] leading-relaxed text-muted-foreground">
              <p>
                Found a bug or have a feature idea? Please open an issue on
                GitHub. A good issue includes the component name, the version,
                a minimal reproducible example, and the expected versus actual
                behavior. For visual bugs, attach a screenshot or a short
                screen recording.
              </p>
            </div>
            <a
              href="https://github.com/issues"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-brand-lemon/40 bg-brand-lemon/10 px-3 text-[13px] font-medium text-brand-lemon transition-colors hover:bg-brand-lemon/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bug className="h-4 w-4" />
              Open an issue on GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </section>

          {/* 8. Pull request workflow */}
          <section aria-labelledby="pull-requests" className="flex flex-col gap-4">
            <SectionHeading section={SECTIONS[7]} />
            <p className="max-w-prose text-[14px] leading-relaxed text-muted-foreground">
              The pull request workflow is intentionally linear so that
              reviews stay focused on substance.
            </p>
            <ol className="flex flex-col gap-3">
              {[
                {
                  step: "Fork",
                  text: "Fork the repository and clone your fork locally.",
                },
                {
                  step: "Branch",
                  text: "Create a descriptively named branch off of main, e.g. color-picker-keyboard-nav.",
                },
                {
                  step: "Implement",
                  text: "Write the component or fix following the conventions above. Keep the diff focused on one concern.",
                },
                {
                  step: "Test",
                  text: "Add or update tests so the change is covered. Run the full test suite locally and confirm it passes.",
                },
                {
                  step: "Document",
                  text: "Update the playground page, the API table, and any code examples that reference the changed behavior.",
                },
                {
                  step: "Open a PR",
                  text: "Open a pull request against main. Fill in the template, link any related issues, and request a review.",
                },
              ].map((item, i) => (
                <li
                  key={item.step}
                  className="panel flex items-start gap-4 p-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-lemon/40 bg-brand-lemon/10 font-mono text-[12px] font-semibold text-brand-lemon">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-foreground">
                      {item.step}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                      {item.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Sticky TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <TableOfContents />
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}

export default ContributingView;
