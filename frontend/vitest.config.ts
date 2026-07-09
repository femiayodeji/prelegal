import { defineConfig } from "vitest/config";

// Unit tests only. Playwright end-to-end specs live in e2e/ and are run
// separately via `npx playwright test`, so exclude them here.
export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
