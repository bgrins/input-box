import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    // Use Happy-DOM for faster tests
    environment: "happy-dom",

    // Enable globals like describe, it, expect
    globals: true,

    // Setup files
    setupFiles: ["./test/setup.ts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "test/",
        "*.config.ts",
        "*.config.js",
        "dist/",
      ],
    },

    // Test file patterns
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "test/**/*.{test,spec}.{ts,tsx}",
    ],

    // Exclude e2e tests from unit tests
    exclude: ["node_modules", "dist", "test/e2e/**"],

    // Watch mode
    watch: false,
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
