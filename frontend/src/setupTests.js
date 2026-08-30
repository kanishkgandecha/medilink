import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Without this, React Testing Library only auto-unmounts between tests when
// vitest's `globals: true` is set (so its afterEach hook is on globalThis).
// This project imports test globals explicitly instead, so wire cleanup up
// by hand — otherwise each test's rendered DOM leaks into the next one.
afterEach(() => {
  cleanup()
})

// This jsdom/vitest combination doesn't wire up a working `localStorage`
// (ThemeContext and other app code read/write it on mount), so provide a
// minimal in-memory polyfill for the test environment only.
if (typeof globalThis.localStorage?.getItem !== 'function') {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}
