import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type TableDensity = 'comfortable' | 'compact'

interface UiState {
  /** Command menu is opened from the navbar, the dashboard top bar and Ctrl/⌘+K. */
  commandMenuOpen: boolean
  setCommandMenuOpen: (open: boolean) => void
  tableDensity: TableDensity
  setTableDensity: (density: TableDensity) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      commandMenuOpen: false,
      setCommandMenuOpen: (commandMenuOpen) => set({ commandMenuOpen }),
      tableDensity: 'comfortable',
      setTableDensity: (tableDensity) => set({ tableDensity }),
    }),
    {
      name: 'starter-ui',
      storage: createJSONStorage(() => localStorage),
      // Only persist preferences, never transient UI state.
      partialize: (state) => ({ tableDensity: state.tableDensity }),
    },
  ),
)
