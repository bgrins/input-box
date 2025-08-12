/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PillManager } from "./pills";
import type { TabItem } from "../types";

describe("PillManager", () => {
  let container: HTMLElement;
  let pillManager: PillManager;

  beforeEach(() => {
    // Create a container element for testing
    container = document.createElement("div");
    container.id = "test-pills-container";
    document.body.appendChild(container);

    pillManager = new PillManager("test-pills-container");
  });

  describe("addPill", () => {
    it("should add a pill to the container", () => {
      const tabItem: TabItem = {
        id: "tab-1",
        title: "Test Tab",
        url: "https://example.com",
        faviconUrl: "https://example.com/favicon.ico",
      };

      pillManager.addPill(tabItem);

      const pill = container.querySelector('[data-pill-id="tab-1"]');
      expect(pill).toBeInTheDocument();
      const pillTitle = pill?.querySelector(".pill-title");
      expect(pillTitle).toHaveTextContent("Test Tab");
    });

    it("should not add duplicate pills", () => {
      const tabItem: TabItem = {
        id: "tab-1",
        title: "Test Tab",
        url: "https://example.com",
      };

      pillManager.addPill(tabItem);
      pillManager.addPill(tabItem);

      const pills = container.querySelectorAll('[data-pill-id="tab-1"]');
      expect(pills).toHaveLength(1);
    });

    it("should show container when adding first pill", () => {
      const tabItem: TabItem = {
        id: "tab-1",
        title: "Test Tab",
        url: "https://example.com",
      };

      expect(container.style.display).toBe("");

      pillManager.addPill(tabItem);

      expect(container.style.display).toBe("flex");
    });
  });

  describe("removePill", () => {
    it("should remove a pill from the container", () => {
      const tabItem: TabItem = {
        id: "tab-1",
        title: "Test Tab",
        url: "https://example.com",
      };

      pillManager.addPill(tabItem);
      expect(
        container.querySelector('[data-pill-id="tab-1"]'),
      ).toBeInTheDocument();

      pillManager.removePill("tab-1");
      expect(
        container.querySelector('[data-pill-id="tab-1"]'),
      ).not.toBeInTheDocument();
    });

    it("should hide container when removing last pill", () => {
      const tabItem: TabItem = {
        id: "tab-1",
        title: "Test Tab",
        url: "https://example.com",
      };

      pillManager.addPill(tabItem);
      pillManager.removePill("tab-1");

      expect(container.style.display).toBe("none");
    });

    it("should call onRemove callback when removing pill", () => {
      const onRemove = vi.fn();
      pillManager.setOnRemove(onRemove);

      const tabItem: TabItem = {
        id: "tab-1",
        title: "Test Tab",
        url: "https://example.com",
      };

      pillManager.addPill(tabItem);
      pillManager.removePill("tab-1");

      expect(onRemove).toHaveBeenCalledWith("tab-1");
    });
  });

  describe("hasPill", () => {
    it("should return true for existing pill", () => {
      const tabItem: TabItem = {
        id: "tab-1",
        title: "Test Tab",
        url: "https://example.com",
      };

      pillManager.addPill(tabItem);
      expect(pillManager.hasPill("tab-1")).toBe(true);
    });

    it("should return false for non-existing pill", () => {
      expect(pillManager.hasPill("non-existent")).toBe(false);
    });
  });

  describe("getPills", () => {
    it("should return all pills", () => {
      const tab1: TabItem = {
        id: "tab-1",
        title: "Tab 1",
        url: "https://example1.com",
      };
      const tab2: TabItem = {
        id: "tab-2",
        title: "Tab 2",
        url: "https://example2.com",
      };

      pillManager.addPill(tab1);
      pillManager.addPill(tab2);

      const pills = pillManager.getPills();
      expect(pills).toHaveLength(2);
      expect(pills).toContainEqual(tab1);
      expect(pills).toContainEqual(tab2);
    });
  });

  describe("clear", () => {
    it("should remove all pills", () => {
      const tab1: TabItem = {
        id: "tab-1",
        title: "Tab 1",
        url: "https://example1.com",
      };
      const tab2: TabItem = {
        id: "tab-2",
        title: "Tab 2",
        url: "https://example2.com",
      };

      pillManager.addPill(tab1);
      pillManager.addPill(tab2);

      pillManager.clear();

      expect(container.innerHTML).toBe("");
      expect(pillManager.getPills()).toHaveLength(0);
      expect(container.style.display).toBe("none");
    });
  });
});
