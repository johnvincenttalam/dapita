import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Mock services simulate network latency, and role queries are slow in jsdom on large pages.
// 3s still timed out now and then on a busy machine (booking-flow "Request sent!").
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.className = ''
})

// jsdom doesn't implement these browser APIs that Radix, cmdk and the theme provider use.
// React Router's <ScrollRestoration> scrolls on navigation; jsdom only logs "not implemented".
window.scrollTo = vi.fn()

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

const elementStubs = {
  scrollIntoView: vi.fn(),
  hasPointerCapture: vi.fn(() => false),
  releasePointerCapture: vi.fn(),
}
for (const [name, value] of Object.entries(elementStubs)) {
  if (!(name in Element.prototype)) Object.defineProperty(Element.prototype, name, { value, writable: true })
}
