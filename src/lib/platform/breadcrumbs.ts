/**
 * Pathname-based breadcrumbs helper.
 *
 * Replaces the old store-based `breadcrumbs(route)` function. This parses the
 * current URL and produces a list of `{ label, href }` entries, resolving
 * component and category slugs against the canonical content metadata so the
 * labels match what's shown elsewhere on the platform.
 */

import {
  components,
  categories,
  examples,
  getCategory,
} from "@/lib/platform/content";
import { categoryLabel } from "@/store/navigation-types";

export interface BreadcrumbEntry {
  label: string;
  href: string;
}

/**
 * The "you are here" trail for the current URL. Always starts with Home.
 *
 * Examples:
 *   "/"                                    → [{ Home, "/" }]
 *   "/components"                          → [Home, Components]
 *   "/components/color"                    → [Home, Components, Color]
 *   "/components/color/color-wheel"        → [Home, Components, Color, Color Wheel Picker]
 *   "/docs/installation"                   → [Home, Documentation, Installation]
 *   "/examples/theme-editor"               → [Home, Examples, Theme editor]
 *   "/theme-editor"                        → [Home, Theme Editor]
 *   "/resources"                           → [Home, Resources]
 *   "/changelog"                           → [Home, Changelog]
 *   "/contributing"                        → [Home, Contributing]
 */
export function breadcrumbsFromPath(pathname: string): BreadcrumbEntry[] {
  const crumbs: BreadcrumbEntry[] = [{ label: "Home", href: "/" }];

  if (pathname === "/" ) return crumbs;

  const segments = pathname.split("/").filter(Boolean);

  // /components...
  if (segments[0] === "components") {
    crumbs.push({ label: "Components", href: "/components" });

    if (segments[1]) {
      const catSlug = segments[1];
      const cat = getCategory(catSlug);
      crumbs.push({
        label: cat?.name ?? categoryLabel(catSlug),
        href: `/components/${catSlug}`,
      });

      if (segments[2]) {
        const slug = segments[2];
        const comp = components.find(
          (c) => c.slug === slug && c.category === catSlug
        );
        crumbs.push({
          label: comp?.name ?? slug,
          href: `/components/${catSlug}/${slug}`,
        });
      }
    }
    return crumbs;
  }

  // /docs...
  if (segments[0] === "docs") {
    crumbs.push({ label: "Documentation", href: "/docs" });
    if (segments[1]) {
      const subSlug = segments[1];
      const label = DOC_SUB_LABELS[subSlug] ?? subSlug;
      crumbs.push({ label, href: `/docs/${subSlug}` });
    }
    return crumbs;
  }

  // /examples...
  if (segments[0] === "examples") {
    crumbs.push({ label: "Examples", href: "/examples" });
    if (segments[1]) {
      const slug = segments[1];
      const ex = examples.find((e) => e.slug === slug);
      crumbs.push({
        label: ex?.title ?? slug,
        href: `/examples/${slug}`,
      });
    }
    return crumbs;
  }

  // /theme-editor
  if (segments[0] === "theme-editor") {
    crumbs.push({ label: "Theme Editor", href: "/theme-editor" });
    return crumbs;
  }

  // /resources
  if (segments[0] === "resources") {
    crumbs.push({ label: "Resources", href: "/resources" });
    return crumbs;
  }

  // /changelog
  if (segments[0] === "changelog") {
    crumbs.push({ label: "Changelog", href: "/changelog" });
    return crumbs;
  }

  // /contributing
  if (segments[0] === "contributing") {
    crumbs.push({ label: "Contributing", href: "/contributing" });
    return crumbs;
  }

  return crumbs;
}

const DOC_SUB_LABELS: Record<string, string> = {
  installation: "Installation",
  concepts: "Core Concepts",
  theming: "Theming",
  api: "API Reference",
};

// Reference the categories import so it isn't tree-shaken away if a future
// refactor moves the resolver above. (categories is also imported by the
// resolver via getCategory, but keeping the explicit import documents the
// dependency.)
void categories;
