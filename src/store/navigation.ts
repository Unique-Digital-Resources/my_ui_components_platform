"use client";

import { create } from "zustand";

// Re-export the Route type and pure helpers so existing imports keep working.
// All actual navigation now happens through the URL (Next.js App Router).
export type { Route } from "./navigation-types";
export {
  routeLabel,
  categoryLabel,
  routeToHref,
} from "./navigation-types";

/**
 * UI-only navigation state. This store no longer tracks the current route —
 * the URL does that. What's left here is purely transient UI state that
 * doesn't belong in the URL: search palette open/close, mobile drawer
 * open/close, and the components directory search/filter (which is the kind
 * of state a user is happy to lose on a refresh).
 */
interface NavigationState {
  // Components directory search + filter (kept here so it survives navigating
  // between /components and a category page, but resets on full reload).
  componentsQuery: string;
  componentsCategory: string;
  // Search palette open state (⌘K).
  searchOpen: boolean;
  // Mobile sidebar drawer open state.
  mobileNavOpen: boolean;
  setComponentsQuery: (q: string) => void;
  setComponentsCategory: (c: string) => void;
  setSearchOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useNavigation = create<NavigationState>((set) => ({
  componentsQuery: "",
  componentsCategory: "all",
  searchOpen: false,
  mobileNavOpen: false,
  setComponentsQuery: (q) => set({ componentsQuery: q }),
  setComponentsCategory: (c) => set({ componentsCategory: c }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
