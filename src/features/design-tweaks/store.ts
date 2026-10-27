import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { DisplayFont, ThemeName, ThemeTweaks, TweakState } from '@/features/design-tweaks/tokens'

interface TweaksStore extends TweakState {
  setThemeTweak: (theme: ThemeName, patch: ThemeTweaks) => void
  setRadius: (radiusRem: number | undefined) => void
  setDisplayFont: (font: DisplayFont | undefined) => void
  resetTheme: (theme: ThemeName) => void
  resetAll: () => void
}

const initial: TweakState = { light: {}, dark: {} }

/** Tweaks persist in this browser only, so testers don't affect each other. */
export const useTweaksStore = create<TweaksStore>()(
  persist(
    (set) => ({
      ...initial,
      setThemeTweak: (theme, patch) => set((state) => ({ [theme]: { ...state[theme], ...patch } })),
      setRadius: (radiusRem) => set({ radiusRem }),
      setDisplayFont: (displayFont) => set({ displayFont }),
      resetTheme: (theme) => set({ [theme]: {} }),
      resetAll: () => set({ ...initial, radiusRem: undefined, displayFont: undefined }),
    }),
    {
      name: 'glamspot-design-tweaks',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ light, dark, radiusRem, displayFont }) => ({ light, dark, radiusRem, displayFont }),
    },
  ),
)
