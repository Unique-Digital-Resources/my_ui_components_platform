"use client";

import * as React from "react";
import Link from "next/link";
import { Github, ExternalLink } from "lucide-react";
import { BrandMark } from "./brand";

interface FooterColumn {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: "Components",
    links: [
      { label: "All components", href: "/components" },
      { label: "Color", href: "/components/color" },
      { label: "Color Wheel Picker", href: "/components/color/color-wheel" },
    ],
  },
  {
    title: "Documentation",
    links: [
      { label: "Overview", href: "/docs" },
      { label: "Installation", href: "/docs/installation" },
      { label: "Core concepts", href: "/docs/concepts" },
      { label: "Theming", href: "/docs/theming" },
      { label: "API reference", href: "/docs/api" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Examples", href: "/examples" },
      { label: "Resources", href: "/resources" },
      { label: "Changelog", href: "/changelog" },
      { label: "Contributing", href: "/contributing" },
    ],
  },
  {
    title: "External",
    links: [
      { label: "GitHub", href: "https://github.com", external: true },
      { label: "Lucide icons", href: "https://lucide.dev", external: true },
      { label: "Inter font", href: "https://rsms.me/inter", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <BrandMark size={24} />
              <span className="font-semibold text-[15px]">Workshop</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground leading-relaxed">
              A framework-independent component library for the interfaces
              behind creative tools, editors, and applications.
            </p>
            <p className="mt-4 text-[11px] font-mono text-muted-foreground/70">
              Built with vanilla JavaScript · Next.js is the platform, not a
              dependency.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="eyebrow mb-3">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[13px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:underline"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-border pt-6">
          <p className="text-[11px] font-mono text-muted-foreground/70">
            © {new Date().getFullYear()} Workshop. Open source under the MIT
            License.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            Source on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
