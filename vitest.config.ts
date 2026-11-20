import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Route modules under src/routes are application endpoints, not test suites.
    exclude: [...configDefaults.exclude, "src/routes/**"],
    // jsdom flows share the larger route graph; 5s was flaky on this machine.
    testTimeout: 10_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
