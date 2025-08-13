import { describe, it, expect, beforeEach, vi } from "vitest";
import { fixture, html } from "@open-wc/testing";
import { SuggestionsDropdown } from "./suggestions-dropdown";

// Mock the data module
vi.mock("../data", () => ({
  getFaviconUrl: vi.fn((url: string) => `https://favicon.example.com/${url}`),
  processHistoryData: vi.fn(() => [
    {
      title: "Google",
      url: "https://google.com",
      type: "history",
      faviconUrl: "https://google.com/favicon.ico",
    },
    {
      title: "GitHub",
      url: "https://github.com",
      type: "history",
      faviconUrl: "https://github.com/favicon.ico",
    },
    {
      title: "Stack Overflow",
      url: "https://stackoverflow.com",
      type: "history",
      faviconUrl: "https://stackoverflow.com/favicon.ico",
    },
    {
      title: "MDN",
      url: "https://developer.mozilla.org",
      type: "history",
      faviconUrl: "https://mdn.com/favicon.ico",
    },
    {
      title: "YouTube",
      url: "https://youtube.com",
      type: "history",
      faviconUrl: "https://youtube.com/favicon.ico",
    },
    {
      title: "Twitter",
      url: "https://twitter.com",
      type: "history",
      faviconUrl: "https://twitter.com/favicon.ico",
    },
  ]),
}));

describe("SuggestionsDropdown", () => {
  let element: SuggestionsDropdown;

  beforeEach(async () => {
    element = await fixture(
      html`<suggestions-dropdown></suggestions-dropdown>`,
    );
  });

  describe("Basic rendering", () => {
    it("should create the component", () => {
      expect(element).toBeInstanceOf(SuggestionsDropdown);
    });

    it("should be hidden by default", () => {
      expect(element.active).toBe(false);
      expect(element).not.toHaveAttribute("active");
    });

    it("should show when active is set", async () => {
      element.show("test");
      await element.updateComplete;

      expect(element.active).toBe(true);
      expect(element).toHaveAttribute("active");
    });

    it("should hide when hide is called", async () => {
      element.show("test");
      await element.updateComplete;

      element.hide();
      await element.updateComplete;

      expect(element.active).toBe(false);
      expect(element).not.toHaveAttribute("active");
    });
  });

  describe("Blur functionality", () => {
    it("should apply blur class", async () => {
      element.blur();
      await element.updateComplete;

      expect(element.blurred).toBe(true);
      expect(element).toHaveAttribute("blurred");
    });

    it("should remove blur class", async () => {
      element.blur();
      await element.updateComplete;

      element.unblur();
      await element.updateComplete;

      expect(element.blurred).toBe(false);
      expect(element).not.toHaveAttribute("blurred");
    });
  });

  describe("Suggestions filtering", () => {
    it("should show suggestions when query matches", async () => {
      element.show("git");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const items = shadowRoot.querySelectorAll(".suggestion-item");

      expect(items.length).toBeGreaterThan(0);
      expect(
        element.suggestions.some((s) => s.title.toLowerCase().includes("git")),
      ).toBe(true);
    });

    it("should add search option for non-URL queries", async () => {
      element.show("test query");
      await element.updateComplete;

      const searchItem = element.suggestions.find((s) => s.type === "search");
      expect(searchItem).toBeTruthy();
      expect(searchItem?.title).toContain('Search for "test query"');
    });

    it("should add navigation option for URL-like queries", async () => {
      element.show("example.com");
      await element.updateComplete;

      const navItem = element.suggestions.find((s) => s.type === "navigate");
      expect(navItem).toBeTruthy();
      expect(navItem?.url).toContain("example.com");
    });

    it("should limit results to 8 items", async () => {
      element.show("");
      await element.updateComplete;

      expect(element.suggestions.length).toBeLessThanOrEqual(8);
    });
  });

  describe("Navigation", () => {
    beforeEach(async () => {
      element.show("test");
      await element.updateComplete;
    });

    it("should handle selectNext", async () => {
      expect(element.selectedIndex).toBe(-1);

      element.selectNext();
      await element.updateComplete;

      expect(element.selectedIndex).toBe(0);

      const shadowRoot = element.shadowRoot!;
      const items = shadowRoot.querySelectorAll(".suggestion-item");
      expect(items[0]).toHaveClass("selected");
    });

    it("should handle selectPrevious", async () => {
      element.selectedIndex = 2;
      await element.updateComplete;

      element.selectPrevious();
      await element.updateComplete;

      expect(element.selectedIndex).toBe(1);
    });

    it("should handle selectPrevious at boundary", async () => {
      element.selectedIndex = 0;
      await element.updateComplete;

      element.selectPrevious();
      await element.updateComplete;

      expect(element.selectedIndex).toBe(-1);
    });

    it("should handle selectNext at boundary", async () => {
      const maxIndex = element.suggestions.length - 1;
      element.selectedIndex = maxIndex;
      await element.updateComplete;

      element.selectNext();
      await element.updateComplete;

      expect(element.selectedIndex).toBe(maxIndex);
    });
  });

  describe("Selection", () => {
    beforeEach(async () => {
      element.show("test");
      await element.updateComplete;
    });

    it("should return selected item", () => {
      element.selectedIndex = 0;
      const selected = element.getSelected();

      expect(selected).toBeTruthy();
      expect(selected).toBe(element.suggestions[0]);
    });

    it("should return null when nothing selected", () => {
      element.selectedIndex = -1;
      const selected = element.getSelected();

      expect(selected).toBeNull();
    });

    it("should return selected index", () => {
      element.selectedIndex = 2;
      expect(element.getSelectedIndex()).toBe(2);
    });
  });

  describe("Click handling", () => {
    it("should call onSelect callback when item clicked", async () => {
      const onSelect = vi.fn();
      element.setOnSelect(onSelect);

      element.show("test");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const firstItem = shadowRoot.querySelector(
        ".suggestion-item",
      ) as HTMLElement;

      firstItem.click();

      expect(onSelect).toHaveBeenCalledWith(element.suggestions[0], 0);
    });

    it("should update selectedIndex on mouseenter", async () => {
      element.show("test");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const items = shadowRoot.querySelectorAll(".suggestion-item");

      // Make sure we have items before testing
      expect(items.length).toBeGreaterThan(0);

      if (items.length > 1) {
        const mouseEnterEvent = new MouseEvent("mouseenter");
        items[1].dispatchEvent(mouseEnterEvent);
        await element.updateComplete;

        expect(element.selectedIndex).toBe(1);
      } else {
        // Test with first item if only one exists
        const mouseEnterEvent = new MouseEvent("mouseenter");
        items[0].dispatchEvent(mouseEnterEvent);
        await element.updateComplete;

        expect(element.selectedIndex).toBe(0);
      }
    });
  });

  describe("Icon rendering", () => {
    it("should render favicon for items with faviconUrl", async () => {
      element.show("google");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const favicon = shadowRoot.querySelector(
        ".suggestion-favicon",
      ) as HTMLImageElement;

      expect(favicon).toBeTruthy();
      expect(favicon.src).toContain("favicon");
    });

    it("should render emoji icon for items without favicon", async () => {
      element.suggestions = [
        { title: "Test", url: null, type: "search", icon: "🔍" },
      ];
      element.active = true;
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const icon = shadowRoot.querySelector(".suggestion-icon");

      expect(icon).toBeTruthy();
      expect(icon?.textContent).toBe("🔍");
    });

    it("should handle favicon load error", async () => {
      element.suggestions = [
        {
          title: "Test",
          url: "https://test.com",
          type: "history",
          faviconUrl: "https://invalid.com/favicon.ico",
        },
      ];
      element.active = true;
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const favicon = shadowRoot.querySelector(
        ".suggestion-favicon",
      ) as HTMLImageElement;

      // Simulate error event
      const errorEvent = new Event("error");
      favicon.dispatchEvent(errorEvent);
      await element.updateComplete;

      expect(favicon.style.display).toBe("none");
    });
  });

  describe("Data refresh", () => {
    it("should refresh data when refreshData is called", () => {
      element.refreshData();

      // Should have mock data from processHistoryData
      expect(element["processedSuggestions"].length).toBe(6);
    });
  });

  describe("Empty state", () => {
    it("should render nothing when no suggestions", async () => {
      element.suggestions = [];
      element.active = true;
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const items = shadowRoot.querySelectorAll(".suggestion-item");

      expect(items.length).toBe(0);
    });

    it("should not render when inactive even with suggestions", async () => {
      element.suggestions = [
        { title: "Test", url: "https://test.com", type: "history" },
      ];
      element.active = false;
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const items = shadowRoot.querySelectorAll(".suggestion-item");

      expect(items.length).toBe(0);
    });
  });
});
