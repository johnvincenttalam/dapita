import { create } from 'zustand'

export type DemoScenario = 'live' | 'loading' | 'empty' | 'error'

interface DemoState {
  /** Which response the mock services return. Not used by real services. */
  scenario: DemoScenario
  setScenario: (scenario: DemoScenario) => void
}

export const useDemoStore = create<DemoState>()((set) => ({
  scenario: 'live',
  setScenario: (scenario) => set({ scenario }),
}))
