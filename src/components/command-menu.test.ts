import { describe, it, expect, beforeEach, vi } from "vitest";
import { fixture, html } from "@open-wc/testing";
import { CommandMenuElement } from "./command-menu";

// Mock the data module
vi.mock("../data", () => ({
  getMockTabs: vi.fn(() => [
    {
      id: "tab-1",
      title: "Google",
      url: "https://google.com",
      faviconUrl: "https://google.com/favicon.ico",
    },
    {
      id: "tab-2",
      title: "GitHub",
      url: "https://github.com",
      faviconUrl: "https://github.com/favicon.ico",
    },
  ]),
  getRecentHistory: vi.fn(() => [
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
  ]),
  getBookmarks: vi.fn(() => [
    {
      title: "Reddit",
      url: "https://reddit.com",
      type: "bookmark",
      icon: "⭐",
    },
    {
      title: "Twitter",
      url: "https://twitter.com",
      type: "bookmark",
      icon: "⭐",
    },
  ]),
}));

describe("CommandMenuElement", () => {
  let element: CommandMenuElement;

  beforeEach(async () => {
    element = await fixture(html`<command-menu></command-menu>`);
  });

  describe("Basic rendering", () => {
    it("should create the component", () => {
      expect(element).toBeInstanceOf(CommandMenuElement);
    });

    it("should be hidden by default", () => {
      expect(element.active).toBe(false);
      expect(element).not.toHaveAttribute("active");
    });

    it("should show when active is set", async () => {
      element.show();
      await element.updateComplete;

      expect(element.active).toBe(true);
      expect(element).toHaveAttribute("active");
    });

    it("should hide when hide is called", async () => {
      element.show();
      await element.updateComplete;

      element.hide();
      await element.updateComplete;

      expect(element.active).toBe(false);
      expect(element).not.toHaveAttribute("active");
    });
  });

  describe("Command list rendering", () => {
    it("should show command list when no command is selected", async () => {
      element.show(null, [], "");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const items = shadowRoot.querySelectorAll(".command-item");

      expect(items.length).toBe(3); // tabs, history, bookmarks
      expect(items[0].textContent).toContain("tabs");
      expect(items[1].textContent).toContain("history");
      expect(items[2].textContent).toContain("bookmarks");
    });

    it("should filter commands based on query", async () => {
      element.show(null, [], "bo");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const items = shadowRoot.querySelectorAll(".command-item");

      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain("bookmarks");
    });

    it("should show no results when query doesn't match", async () => {
      element.show(null, [], "xyz");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const noResults = shadowRoot.querySelector(".no-results");

      expect(noResults).toBeTruthy();
      expect(noResults?.textContent).toContain("No matching commands");
    });
  });

  describe("Tabs functionality", () => {
    it("should show tabs with checkboxes", async () => {
      element.show("tabs", [], "");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const items = shadowRoot.querySelectorAll(".command-item");
      const checkboxes = shadowRoot.querySelectorAll(".command-checkbox");

      expect(items.length).toBe(2); // Two mock tabs
      expect(checkboxes.length).toBe(2);
    });

    it("should toggle item selection on click", async () => {
      element.show("tabs", [], "");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const firstItem = shadowRoot.querySelector(
        ".command-item",
      ) as HTMLElement;
      const checkbox = firstItem.querySelector(
        ".command-checkbox",
      ) as HTMLInputElement;

      expect(checkbox.checked).toBe(false);

      // Click the item
      firstItem.click();
      await element.updateComplete;

      const updatedCheckbox = shadowRoot.querySelector(
        ".command-checkbox",
      ) as HTMLInputElement;
      expect(updatedCheckbox.checked).toBe(true);
    });

    it("should initialize with existing pills selected", async () => {
      element.show("tabs", ["tab-1"], "");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const checkboxes = shadowRoot.querySelectorAll(
        ".command-checkbox",
      ) as NodeListOf<HTMLInputElement>;

      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(false);
    });

    it("should show apply button with correct count", async () => {
      element.show("tabs", [], "");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;

      // Select first item
      const firstItem = shadowRoot.querySelector(
        ".command-item",
      ) as HTMLElement;
      firstItem.click();
      await element.updateComplete;

      const applyBtn = shadowRoot.querySelector(".command-apply-btn");
      expect(applyBtn?.textContent).toContain("Add 1 tab");

      // Select second item
      const items = shadowRoot.querySelectorAll(".command-item");
      (items[1] as HTMLElement).click();
      await element.updateComplete;

      const updatedBtn = shadowRoot.querySelector(".command-apply-btn");
      expect(updatedBtn?.textContent).toContain("Add 2 tabs");
    });
  });

  describe("Keyboard navigation", () => {
    it("should handle ArrowDown key", async () => {
      element.show(null, [], "");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;

      expect(element["selectedIndex"]).toBe(0);

      const handled = element.handleKeyDown(
        new KeyboardEvent("keydown", { key: "ArrowDown" }),
      );
      await element.updateComplete;

      expect(handled).toBe(true);
      expect(element["selectedIndex"]).toBe(1);

      const items = shadowRoot.querySelectorAll(".command-item");
      expect(items[1]).toHaveClass("selected");
    });

    it("should handle ArrowUp key", async () => {
      element.show(null, [], "");
      await element.updateComplete;

      // Move down first
      element["selectedIndex"] = 2;
      await element.updateComplete;

      const handled = element.handleKeyDown(
        new KeyboardEvent("keydown", { key: "ArrowUp" }),
      );
      await element.updateComplete;

      expect(handled).toBe(true);
      expect(element["selectedIndex"]).toBe(1);
    });

    it("should handle Tab key cycling", async () => {
      element.show(null, [], "");
      await element.updateComplete;

      expect(element["selectedIndex"]).toBe(0);

      // Tab forward
      element.handleKeyDown(new KeyboardEvent("keydown", { key: "Tab" }));
      await element.updateComplete;
      expect(element["selectedIndex"]).toBe(1);

      // Tab backward
      element.handleKeyDown(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }),
      );
      await element.updateComplete;
      expect(element["selectedIndex"]).toBe(0);
    });

    it("should handle Space key for selection in tabs mode", async () => {
      element.show("tabs", [], "");
      await element.updateComplete;

      const handled = element.handleKeyDown(
        new KeyboardEvent("keydown", { key: " " }),
      );
      await element.updateComplete;

      expect(handled).toBe(true);

      const shadowRoot = element.shadowRoot!;
      const checkbox = shadowRoot.querySelector(
        ".command-checkbox",
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it("should handle Escape key", async () => {
      element.show(null, [], "");
      await element.updateComplete;

      expect(element.active).toBe(true);

      const handled = element.handleKeyDown(
        new KeyboardEvent("keydown", { key: "Escape" }),
      );

      expect(handled).toBe(true);
      expect(element.active).toBe(false);
    });
  });

  describe("Callbacks", () => {
    it("should call onSelect callback", async () => {
      const onSelect = vi.fn();
      const onApply = vi.fn();

      element.setCallbacks(onSelect, onApply);
      element.show(null, [], "");
      await element.updateComplete;

      // Select tabs command
      element["selectItem"](0);

      expect(onSelect).toHaveBeenCalledWith("complete-tabs", null);
    });

    it("should call onApply callback with selected items", async () => {
      const onSelect = vi.fn();
      const onApply = vi.fn();

      element.setCallbacks(onSelect, onApply);
      element.show("tabs", [], "");
      await element.updateComplete;

      // Select first tab
      const shadowRoot = element.shadowRoot!;
      const firstItem = shadowRoot.querySelector(
        ".command-item",
      ) as HTMLElement;
      firstItem.click();
      await element.updateComplete;

      // Apply selection
      element["applySelection"]();

      expect(onApply).toHaveBeenCalledWith(
        "tabs",
        [
          {
            id: "tab-1",
            title: "Google",
            url: "https://google.com",
            faviconUrl: "https://google.com/favicon.ico",
          },
        ],
        [],
      );
    });

    it("should detect items to remove", async () => {
      const onSelect = vi.fn();
      const onApply = vi.fn();

      element.setCallbacks(onSelect, onApply);
      element.show("tabs", ["tab-1", "tab-2"], "");
      await element.updateComplete;

      // Uncheck first tab
      const shadowRoot = element.shadowRoot!;
      const firstItem = shadowRoot.querySelector(
        ".command-item",
      ) as HTMLElement;
      firstItem.click();
      await element.updateComplete;

      // Apply selection
      element["applySelection"]();

      expect(onApply).toHaveBeenCalledWith(
        "tabs",
        [
          {
            id: "tab-2",
            title: "GitHub",
            url: "https://github.com",
            faviconUrl: "https://github.com/favicon.ico",
          },
        ],
        ["tab-1"],
      );
    });
  });

  describe("History and Bookmarks", () => {
    it("should render history items", async () => {
      element.show("history", [], "");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const items = shadowRoot.querySelectorAll(".command-item");

      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain("Stack Overflow");
      expect(items[1].textContent).toContain("MDN");
    });

    it("should render bookmark items", async () => {
      element.show("bookmarks", [], "");
      await element.updateComplete;

      const shadowRoot = element.shadowRoot!;
      const items = shadowRoot.querySelectorAll(".command-item");

      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain("Reddit");
      expect(items[1].textContent).toContain("Twitter");
    });
  });
});
