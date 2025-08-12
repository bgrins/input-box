/// <reference types="@testing-library/jest-dom" />

import { expect, afterEach, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend Vitest's expect with @testing-library/jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  // Clear the DOM
  document.body.innerHTML = "";
  document.head.innerHTML = "";

  // Clear all mocks
  vi.clearAllMocks();

  // Reset modules if needed
  vi.resetModules();
});
