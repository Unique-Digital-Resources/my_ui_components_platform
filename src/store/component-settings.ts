"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Shared component settings store — bridges component playgrounds and the
 * theme editor's Component Preview tab.
 *
 * When a user changes a setting on a component's playground page (e.g.
 * toggling "show markers" on Periodic Range), the playground writes that
 * setting here. The theme editor's RealComponentPreview reads from here
 * so the preview matches what the user configured on the component page.
 *
 * The store is keyed by component slug (e.g. "periodic-range") and holds
 * an arbitrary bag of settings that each component's preview can consume.
 */

export interface ComponentSettings {
  [componentSlug: string]: Record<string, unknown>;
}

interface ComponentSettingsState {
  settings: ComponentSettings;
  setSetting: (slug: string, key: string, value: unknown) => void;
  setSettings: (slug: string, settings: Record<string, unknown>) => void;
  getSettings: (slug: string) => Record<string, unknown>;
  reset: (slug: string) => void;
}

export const useComponentSettings = create<ComponentSettingsState>()(
  persist(
    (set, get) => ({
      settings: {},
      setSetting: (slug, key, value) =>
        set((s) => ({
          settings: {
            ...s.settings,
            [slug]: { ...(s.settings[slug] ?? {}), [key]: value },
          },
        })),
      setSettings: (slug, settings) =>
        set((s) => ({
          settings: { ...s.settings, [slug]: settings },
        })),
      getSettings: (slug) => get().settings[slug] ?? {},
      reset: (slug) =>
        set((s) => {
          const next = { ...s.settings };
          delete next[slug];
          return { settings: next };
        }),
    }),
    { name: "workshop-component-settings" },
  ),
);
