import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// The jsdom suite runs many workers on constrained machines; give async queries
// enough time to settle without weakening the assertions themselves.
configure({ asyncUtilTimeout: 5_000 });

/**
 * Node 26+ exposes an experimental global `localStorage` getter that resolves to
 * undefined without --localstorage-file, and jsdom only provides Storage for a
 * non-opaque origin. Provide an in-memory fallback so component tests exercise
 * the same Storage contract regardless of the runtime.
 */
function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    },
  };
}

let storage: Storage | undefined;
try {
  // Vitest exposes the jsdom instance on `window.jsdom`; read Storage from there
  // because Node 26's own global getter shadows the jsdom one with `undefined`.
  const jsdomWindow = (
    window as unknown as { jsdom?: { window?: { localStorage?: Storage } } }
  ).jsdom?.window;
  storage = jsdomWindow?.localStorage ?? window.localStorage;
} catch {
  storage = undefined;
}
storage ??= createMemoryStorage();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  writable: true,
  value: storage,
});
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: storage,
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
