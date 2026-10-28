"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeTokens } from "./theme-tokens";
import { DEFAULT_TOKENS } from "./theme-tokens";

export interface ThemePreset {
  id: string;
  name: string;
  modes: ThemeMode[];
  activeModeId: string;
  readonly?: boolean;
}

export interface ThemeMode {
  id: string;
  name: string;
  tokens: ThemeTokens;
  readonly?: boolean;
}

interface ThemePresetState {
  presets: ThemePreset[];
  activePresetId: string | null;
  createTheme: (name?: string) => string;
  renameTheme: (id: string, name: string) => void;
  deleteTheme: (id: string) => void;
  setActiveTheme: (id: string) => void;
  createMode: (themeId: string, name?: string) => string;
  renameMode: (themeId: string, modeId: string, name: string) => void;
  deleteMode: (themeId: string, modeId: string) => void;
  setActiveMode: (themeId: string, modeId: string) => void;
  saveEditorIntoMode: (themeId: string, modeId: string, tokens: ThemeTokens) => void;
  resetPresets: () => void;
}

function genId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const LIGHT_TOKENS: ThemeTokens = {
  ...DEFAULT_TOKENS,
  colors: {
    ...DEFAULT_TOKENS.colors,
    background: "#FAFAFC", foreground: "#17151D",
    card: "#FFFFFF", "card-foreground": "#17151D",
    popover: "#FFFFFF", "popover-foreground": "#17151D",
    primary: "#6547C8", "primary-foreground": "#FFFFFF",
    secondary: "#F0F0F4", "secondary-foreground": "#17151D",
    muted: "#F0F0F4", "muted-foreground": "#666371",
    accent: "#F0F0F4", "accent-foreground": "#17151D",
    destructive: "#B42332", border: "#DCDCE4", input: "#DCDCE4", ring: "#6547C8",
    success: "#207A3B", warning: "#8A5A00", error: "#B42332", info: "#245CC5",
  },
};

const DEFAULT_PRESETS: ThemePreset[] = [
  {
    id: "preset_default", name: "Workshop Default", activeModeId: "mode_dark", readonly: true,
    modes: [
      { id: "mode_dark", name: "Dark", tokens: DEFAULT_TOKENS, readonly: true },
      { id: "mode_light", name: "Light", tokens: LIGHT_TOKENS, readonly: true },
    ],
  },
];

export const useThemePresets = create<ThemePresetState>()(
  persist(
    (set) => ({
      presets: DEFAULT_PRESETS,
      activePresetId: "preset_default",

      createTheme: (name) => {
        const id = genId();
        const modeId = genId();
        set((s) => ({ presets: [...s.presets, { id, name: (name?.trim()) || "Untitled Theme", activeModeId: modeId, modes: [{ id: modeId, name: "Default", tokens: DEFAULT_TOKENS }] }], activePresetId: id }));
        return id;
      },
      renameTheme: (id, name) => set((s) => ({ presets: s.presets.map((t) => t.id === id ? { ...t, name: (name?.trim()) || t.name } : t) })),
      deleteTheme: (id) => set((s) => {
        const theme = s.presets.find((t) => t.id === id);
        if (theme?.readonly) return s;
        const presets = s.presets.filter((t) => t.id !== id);
        return { presets, activePresetId: s.activePresetId === id ? (presets[0]?.id ?? null) : s.activePresetId };
      }),
      setActiveTheme: (id) => set({ activePresetId: id }),

      createMode: (themeId, name) => {
        const modeId = genId();
        set((s) => ({ presets: s.presets.map((t) => t.id === themeId ? { ...t, modes: [...t.modes, { id: modeId, name: (name?.trim()) || "New Mode", tokens: DEFAULT_TOKENS }] } : t) }));
        return modeId;
      },
      renameMode: (themeId, modeId, name) => set((s) => ({ presets: s.presets.map((t) => t.id === themeId ? { ...t, modes: t.modes.map((m) => m.id === modeId ? { ...m, name: (name?.trim()) || m.name } : m) } : t) })),
      deleteMode: (themeId, modeId) => set((s) => ({ presets: s.presets.map((t) => {
        if (t.id !== themeId) return t;
        const mode = t.modes.find((m) => m.id === modeId);
        if (mode?.readonly || t.modes.length <= 1) return t;
        const modes = t.modes.filter((m) => m.id !== modeId);
        return { ...t, modes, activeModeId: t.activeModeId === modeId ? modes[0].id : t.activeModeId };
      }) })),
      setActiveMode: (themeId, modeId) => set((s) => ({ presets: s.presets.map((t) => t.id === themeId ? { ...t, activeModeId: modeId } : t) })),
      saveEditorIntoMode: (themeId, modeId, tokens) => set((s) => ({ presets: s.presets.map((t) => t.id === themeId ? { ...t, modes: t.modes.map((m) => m.id === modeId ? { ...m, tokens } : m) } : t) })),
      resetPresets: () => set({ presets: DEFAULT_PRESETS, activePresetId: "preset_default" }),
    }),
    {
      name: "workshop-theme-presets",
      // Always merge with defaults so readonly flags are preserved even
      // if the persisted data was saved before they existed.
      merge: (persisted, current) => {
        const p = (persisted as Partial<ThemePresetState>) ?? {};
        const pPresets = p.presets ?? [];
        const dPresets = DEFAULT_PRESETS;
        // For each default preset, ensure it exists and has readonly flags.
        // For user-created presets, keep them as-is.
        const merged: ThemePreset[] = [];
        // First add all default presets (with readonly preserved from defaults)
        for (const dp of dPresets) {
          const pp = pPresets.find(t => t.id === dp.id);
          if (pp) {
            // Merge: keep user edits but enforce readonly from defaults
            const modes = dp.modes.map(dm => {
              const pm = pp.modes.find(m => m.id === dm.id);
              return pm ? { ...pm, readonly: dm.readonly } : dm;
            });
            // Also include any user-added modes to this theme
            const extraModes = pp.modes.filter(m => !dp.modes.some(d => d.id === m.id));
            merged.push({ ...pp, readonly: dp.readonly, modes: [...modes, ...extraModes] });
          } else {
            merged.push(dp);
          }
        }
        // Then add user-created presets (not in defaults)
        for (const pp of pPresets) {
          if (!dPresets.some(dp => dp.id === pp.id)) {
            merged.push(pp);
          }
        }
        return { ...current, ...p, presets: merged };
      },
    },
  ),
);
