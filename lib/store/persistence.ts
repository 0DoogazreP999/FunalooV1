/**
 * Pluggable persistence adapter interface.
 * Swap between localStorage, API, or in-memory for tests.
 */
export interface PersistenceAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** localStorage adapter — default for production. SSR-safe. */
export const localStorageAdapter: PersistenceAdapter = {
  getItem(key) {
    if (typeof window === "undefined") return null
    return localStorage.getItem(key)
  },
  setItem(key, value) {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Quota exceeded — silently fail
    }
  },
  removeItem(key) {
    if (typeof window === "undefined") return
    localStorage.removeItem(key)
  },
}

/** In-memory adapter — for unit tests and SSR. */
export function createMemoryAdapter(): PersistenceAdapter {
  const store = new Map<string, string>()

  return {
    getItem(key) {
      return store.get(key) ?? null
    },
    setItem(key, value) {
      store.set(key, value)
    },
    removeItem(key) {
      store.delete(key)
    },
  }
}
