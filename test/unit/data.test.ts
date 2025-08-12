import { describe, it, expect } from "vitest";
import {
  getFaviconUrl,
  getTitleFromUrl,
  processHistoryData,
} from "../../src/data";

describe("Data utilities", () => {
  describe("getFaviconUrl", () => {
    it("should generate correct Google favicon URL", () => {
      const url = "https://github.com/user/repo";
      const faviconUrl = getFaviconUrl(url);

      expect(faviconUrl).toContain("https://www.google.com/s2/favicons");
      expect(faviconUrl).toContain("domain=github.com");
      expect(faviconUrl).toContain("sz=32");
    });

    it("should handle custom size parameter", () => {
      const url = "https://example.com";
      const faviconUrl = getFaviconUrl(url, 64);

      expect(faviconUrl).toContain("sz=64");
    });

    it("should return empty string for invalid URL", () => {
      const url = "not-a-valid-url";
      const faviconUrl = getFaviconUrl(url);

      expect(faviconUrl).toBe("");
    });
  });

  describe("getTitleFromUrl", () => {
    it("should extract domain as title", () => {
      const url = "https://example.com";
      const title = getTitleFromUrl(url);

      expect(title).toBe("Example.com");
    });

    it("should remove www prefix", () => {
      const url = "https://www.github.com";
      const title = getTitleFromUrl(url);

      expect(title).toBe("Github.com");
    });

    it("should include path context for specific pages", () => {
      const url = "https://github.com/facebook/react";
      const title = getTitleFromUrl(url);

      expect(title).toBe("Github.com - facebook");
    });

    it("should extract search query from Google search", () => {
      const url = "https://www.google.com/search?q=vitest+testing";
      const title = getTitleFromUrl(url);

      expect(title).toBe("Search: vitest testing");
    });

    it("should return original URL for invalid URLs", () => {
      const url = "not-a-valid-url";
      const title = getTitleFromUrl(url);

      expect(title).toBe(url);
    });
  });

  describe("processHistoryData", () => {
    it("should process history data into suggestion items", () => {
      const suggestions = processHistoryData();

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should have correct suggestion item structure", () => {
      const suggestions = processHistoryData();
      const firstItem = suggestions[0];

      expect(firstItem).toHaveProperty("title");
      expect(firstItem).toHaveProperty("url");
      expect(firstItem).toHaveProperty("type");
      expect(firstItem).toHaveProperty("faviconUrl");
    });

    it("should sort by visits and last visit time", () => {
      const suggestions = processHistoryData();

      // Check that items are sorted (higher visits should come first)
      for (let i = 1; i < Math.min(suggestions.length, 10); i++) {
        const prevVisits = suggestions[i - 1].visits || 0;
        const currVisits = suggestions[i].visits || 0;

        // If visits are equal, check timestamps
        if (prevVisits === currVisits) {
          const prevTime = suggestions[i - 1].lastVisitTime || "";
          const currTime = suggestions[i].lastVisitTime || "";
          expect(prevTime >= currTime).toBe(true);
        } else {
          expect(prevVisits >= currVisits).toBe(true);
        }
      }
    });
  });

  describe("getMockTabs", () => {
    it("should return an array of tab items", async () => {
      // Dynamic import since it's not exported from index
      const { getMockTabs } = await import("../../src/data");
      const tabs = getMockTabs();

      expect(Array.isArray(tabs)).toBe(true);
      expect(tabs.length).toBeGreaterThan(0);
    });

    it("should have valid tab structure", async () => {
      const { getMockTabs } = await import("../../src/data");
      const tabs = getMockTabs();
      const firstTab = tabs[0];

      expect(firstTab).toHaveProperty("id");
      expect(firstTab).toHaveProperty("title");
      expect(firstTab).toHaveProperty("url");
      expect(firstTab).toHaveProperty("faviconUrl");

      expect(typeof firstTab.id).toBe("string");
      expect(typeof firstTab.title).toBe("string");
      expect(typeof firstTab.url).toBe("string");
    });
  });
});
