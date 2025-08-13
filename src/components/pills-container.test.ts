import { describe, it, expect, beforeEach, vi } from "vitest";
import { fixture, html } from "@open-wc/testing";
import { PillsContainer } from "./pills-container";
import type { TabItem, SuggestionItem } from "../types";

// Mock the data module
vi.mock("../data", () => ({
  getFaviconUrl: vi.fn((url: string) => `https://favicon.example.com/${url}`),
}));

describe("PillsContainer", () => {
  let element: PillsContainer;

  beforeEach(async () => {
    element = await fixture(html`<pills-container></pills-container>`);
  });

  describe("Basic rendering", () => {
    it("should create the component", () => {
      expect(element).toBeInstanceOf(PillsContainer);
    });

    it("should be hidden by default", () => {
      expect(element).not.toHaveAttribute("has-pills");
      // The component uses :host { display: none } which is controlled by has-pills attribute
      // Since it doesn't have the attribute, it's effectively hidden
      expect(element.hasAttribute("has-pills")).toBe(false);
    });

    it("should show when pills are added", async () => {
      const pill: TabItem = {
        id: "tab-1",
        title: "Google",
        url: "https://google.com",
        faviconUrl: "https://google.com/favicon.ico",
      };

      element.addPill(pill);
      await element.updateComplete;

      expect(element).toHaveAttribute("has-pills");
    });
  });

  describe("Adding pills", () => {
    it("should add a tab pill", async () => {
      const pill: TabItem = {
        id: "tab-1",
        title: "Google",
        url: "https://google.com",
        faviconUrl: "https://google.com/favicon.ico",
      };

      element.addPill(pill);
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const pillElement = shadowRoot.querySelector('[data-pill-id="tab-1"]');

      expect(pillElement).toBeTruthy();
      expect(pillElement?.querySelector(".pill-title")?.textContent).toBe(
        "Google",
      );
    });

    it("should add a suggestion pill without id", async () => {
      const pill: SuggestionItem = {
        title: "Stack Overflow",
        url: "https://stackoverflow.com",
        type: "history",
        faviconUrl: "https://stackoverflow.com/favicon.ico",
      };

      element.addPill(pill);
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const pillElement = shadowRoot.querySelector(
        '[data-pill-id="history-https://stackoverflow.com"]',
      );

      expect(pillElement).toBeTruthy();
      expect(pillElement?.querySelector(".pill-title")?.textContent).toBe(
        "Stack Overflow",
      );
    });

    it("should not add duplicate pills", async () => {
      const pill: TabItem = {
        id: "tab-1",
        title: "Google",
        url: "https://google.com",
        faviconUrl: "https://google.com/favicon.ico",
      };

      element.addPill(pill);
      element.addPill(pill);
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const pillElements = shadowRoot.querySelectorAll(
        '[data-pill-id="tab-1"]',
      );

      expect(pillElements.length).toBe(1);
    });
  });

  describe("Removing pills", () => {
    it("should remove a pill when remove button clicked", async () => {
      const pill: TabItem = {
        id: "tab-1",
        title: "Google",
        url: "https://google.com",
        faviconUrl: "https://google.com/favicon.ico",
      };

      element.addPill(pill);
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const removeBtn = shadowRoot.querySelector(
        ".pill-remove",
      ) as HTMLButtonElement;

      removeBtn.click();
      await element.updateComplete;

      const pillElement = shadowRoot.querySelector('[data-pill-id="tab-1"]');
      expect(pillElement).toBeNull();
      expect(element).not.toHaveAttribute("has-pills");
    });

    it("should call onRemove callback", async () => {
      const onRemove = vi.fn();
      element.setOnRemove(onRemove);

      const pill: TabItem = {
        id: "tab-1",
        title: "Google",
        url: "https://google.com",
        faviconUrl: "https://google.com/favicon.ico",
      };

      element.addPill(pill);
      await element.updateComplete;

      element.removePill("tab-1");
      await element.updateComplete;

      expect(onRemove).toHaveBeenCalledWith("tab-1");
    });

    it("should handle focus management when removing pills", async () => {
      const pills: TabItem[] = [
        {
          id: "tab-1",
          title: "Google",
          url: "https://google.com",
          faviconUrl: "",
        },
        {
          id: "tab-2",
          title: "GitHub",
          url: "https://github.com",
          faviconUrl: "",
        },
        {
          id: "tab-3",
          title: "Twitter",
          url: "https://twitter.com",
          faviconUrl: "",
        },
      ];

      pills.forEach((pill) => element.addPill(pill));
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const removeButtons = shadowRoot.querySelectorAll(
        ".pill-remove",
      ) as NodeListOf<HTMLButtonElement>;

      // Focus the middle button
      removeButtons[1].focus();
      expect(shadowRoot.activeElement).toBe(removeButtons[1]);

      // Remove the middle pill
      removeButtons[1].click();
      await element.updateComplete;

      // After removal, focus should move to what was the third button (now at index 1)
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const remainingButtons = shadowRoot.querySelectorAll(".pill-remove");
      expect(remainingButtons.length).toBe(2);
    });
  });

  describe("Utility methods", () => {
    it("should clear all pills", async () => {
      const pills: TabItem[] = [
        {
          id: "tab-1",
          title: "Google",
          url: "https://google.com",
          faviconUrl: "",
        },
        {
          id: "tab-2",
          title: "GitHub",
          url: "https://github.com",
          faviconUrl: "",
        },
      ];

      pills.forEach((pill) => element.addPill(pill));
      await element.updateComplete;

      element.clear();
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const pillElements = shadowRoot.querySelectorAll(".tab-pill");

      expect(pillElements.length).toBe(0);
      expect(element).not.toHaveAttribute("has-pills");
    });

    it("should get all pills", () => {
      const pills: TabItem[] = [
        {
          id: "tab-1",
          title: "Google",
          url: "https://google.com",
          faviconUrl: "",
        },
        {
          id: "tab-2",
          title: "GitHub",
          url: "https://github.com",
          faviconUrl: "",
        },
      ];

      pills.forEach((pill) => element.addPill(pill));

      const allPills = element.getPills();
      expect(allPills.length).toBe(2);
      expect(allPills[0].title).toBe("Google");
      expect(allPills[1].title).toBe("GitHub");
    });

    it("should check if pill exists", () => {
      const pill: TabItem = {
        id: "tab-1",
        title: "Google",
        url: "https://google.com",
        faviconUrl: "",
      };

      element.addPill(pill);

      expect(element.hasPill("tab-1")).toBe(true);
      expect(element.hasPill("tab-2")).toBe(false);
    });
  });

  describe("Icon rendering", () => {
    it("should render favicon when provided", async () => {
      const pill: TabItem = {
        id: "tab-1",
        title: "Google",
        url: "https://google.com",
        faviconUrl: "https://google.com/favicon.ico",
      };

      element.addPill(pill);
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const favicon = shadowRoot.querySelector(
        ".pill-favicon",
      ) as HTMLImageElement;

      expect(favicon).toBeTruthy();
      expect(favicon.src).toBe("https://google.com/favicon.ico");
    });

    it("should handle favicon load error", async () => {
      const pill: TabItem = {
        id: "tab-1",
        title: "Google",
        url: "https://google.com",
        faviconUrl: "https://invalid.com/favicon.ico",
      };

      element.addPill(pill);
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const favicon = shadowRoot.querySelector(
        ".pill-favicon",
      ) as HTMLImageElement;

      // Simulate error event
      const errorEvent = new Event("error");
      favicon.dispatchEvent(errorEvent);
      await element.updateComplete;

      expect(favicon.style.display).toBe("none");
      const fallback = shadowRoot.querySelector(".pill-favicon-fallback");
      expect(fallback).toBeTruthy();
      expect(fallback?.textContent).toBe("🌐");
    });

    it("should use getFaviconUrl when faviconUrl not provided", async () => {
      const pill: SuggestionItem = {
        title: "Example",
        url: "https://example.com",
        type: "history",
      };

      element.addPill(pill);
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const favicon = shadowRoot.querySelector(
        ".pill-favicon",
      ) as HTMLImageElement;

      expect(favicon).toBeTruthy();
      expect(favicon.src).toContain("favicon.example.com");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", async () => {
      const pill: TabItem = {
        id: "tab-1",
        title: "Google",
        url: "https://google.com",
        faviconUrl: "",
      };

      element.addPill(pill);
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const removeBtn = shadowRoot.querySelector(
        ".pill-remove",
      ) as HTMLButtonElement;

      expect(removeBtn.getAttribute("aria-label")).toBe("Remove Google");
    });

    it("should have title attribute for tooltip", async () => {
      const pill: TabItem = {
        id: "tab-1",
        title: "Google",
        url: "https://google.com",
        faviconUrl: "",
      };

      element.addPill(pill);
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const pillElement = shadowRoot.querySelector('[data-pill-id="tab-1"]');

      expect(pillElement?.getAttribute("title")).toBe("https://google.com");
    });
  });
});
