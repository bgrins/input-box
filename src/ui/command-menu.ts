import type { CommandType, TabItem, SuggestionItem } from "../types";
import { getMockTabs, getRecentHistory, getBookmarks } from "../data";
import { Editor } from "@tiptap/core";

export class CommandMenu {
  private container: HTMLElement | null = null;
  private selectedIndex = 0;
  private isActive = false;
  currentCommand: CommandType | null = null; // Made public for access
  private onSelect?: (
    command: CommandType,
    data: TabItem | SuggestionItem | null,
  ) => void;
  private selectedItems: Set<string> = new Set();
  private onApply?: (
    command: CommandType,
    data: (TabItem | SuggestionItem)[],
    toRemove: string[],
  ) => void;
  private currentQuery: string = "";
  private initialPillIds: Set<string> = new Set();

  constructor(_editor: Editor) {
    // Editor parameter reserved for future use
    void _editor; // Acknowledge the parameter
    this.createContainer();
  }

  private createContainer() {
    this.container = document.createElement("div");
    this.container.className = "command-menu";
    this.container.style.display = "none";
    document.body.appendChild(this.container);
  }

  setOnSelect(
    callback: (
      command: CommandType,
      data: TabItem | SuggestionItem | null,
    ) => void,
  ) {
    this.onSelect = callback;
  }

  setOnApply(
    callback: (
      command: CommandType,
      data: (TabItem | SuggestionItem)[],
      toRemove: string[],
    ) => void,
  ) {
    this.onApply = callback;
  }

  getSelectedItems(): string[] {
    return Array.from(this.selectedItems);
  }

  show(
    command: CommandType | null = null,
    existingPillIds: string[] = [],
    query: string = "",
  ) {
    if (!this.container) return;

    this.isActive = true;
    this.currentCommand = command;
    this.selectedIndex = 0;

    // If showing tabs, initialize with existing pills
    if (command === "tabs" && existingPillIds.length > 0) {
      this.selectedItems = new Set(existingPillIds);
      this.initialPillIds = new Set(existingPillIds);
    } else if (
      command === "tabs" ||
      command === "history" ||
      command === "bookmarks"
    ) {
      // Clear selection for any list view
      this.selectedItems.clear();
      this.initialPillIds.clear();
    }

    // Store the query for filtering
    this.currentQuery = query;

    // Position menu near the editor
    const editorElement = document.querySelector("#editor");
    if (editorElement) {
      const editorRect = editorElement.getBoundingClientRect();

      // Try to get cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Position below cursor if we have a valid position
        if (rect.left > 0 && rect.top > 0) {
          this.container.style.left = `${Math.max(20, rect.left)}px`;
          this.container.style.top = `${rect.bottom + 5}px`;
        } else {
          // Fallback to positioning below editor
          this.container.style.left = `${editorRect.left}px`;
          this.container.style.top = `${editorRect.bottom + 5}px`;
        }
      } else {
        // Fallback to positioning below editor
        this.container.style.left = `${editorRect.left}px`;
        this.container.style.top = `${editorRect.bottom + 5}px`;
      }
    }

    this.render();
    this.container.style.display = "block";
  }

  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
    this.isActive = false;
    this.currentCommand = null;

    // Remove blur from suggestions when hiding
    const suggestionsDropdown = document.getElementById("suggestions");
    if (suggestionsDropdown) {
      suggestionsDropdown.classList.remove("blurred");
    }
  }

  private render() {
    if (!this.container) return;

    if (this.currentCommand === null) {
      // Show command options, filtered by query
      const commands = [
        { name: "tabs", icon: "📑", description: "Insert open tabs" },
        { name: "history", icon: "📚", description: "Insert from history" },
        { name: "bookmarks", icon: "⭐", description: "Insert bookmarks" },
      ];

      // Filter commands based on query
      const filteredCommands = this.currentQuery
        ? commands.filter((cmd) =>
            cmd.name.startsWith(this.currentQuery.toLowerCase()),
          )
        : commands;

      if (filteredCommands.length === 0) {
        this.container.innerHTML = `
          <div class="command-menu-items">
            <div style="padding: 12px; color: #6b7280;">No matching commands</div>
          </div>
        `;
      } else {
        const items = filteredCommands
          .map(
            (cmd, index) => `
            <div class="command-item ${this.selectedIndex === index ? "selected" : ""}" data-index="${index}" data-command="${cmd.name}">
              <span class="command-item-icon">${cmd.icon}</span>
              <div>
                <div class="command-item-label">${cmd.name}</div>
                <div class="command-item-description">${cmd.description}</div>
              </div>
            </div>
          `,
          )
          .join("");

        this.container.innerHTML = `<div class="command-menu-items">${items}</div>`;
      }
    } else if (this.currentCommand === "tabs") {
      // Show available tabs with checkboxes
      const tabs = getMockTabs();
      const items = tabs
        .map((tab, index) => {
          const isChecked = this.selectedItems.has(tab.id);
          return `
          <div class="command-item ${this.selectedIndex === index ? "selected" : ""} ${isChecked ? "checked" : ""}" data-index="${index}" data-item-id="${tab.id}">
            <input type="checkbox" class="command-checkbox" ${isChecked ? "checked" : ""} />
            <img src="${tab.faviconUrl}" class="command-item-icon" style="width: 16px; height: 16px;" />
            <div style="flex: 1; overflow: hidden;">
              <div class="command-item-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tab.title}</div>
            </div>
          </div>
        `;
        })
        .join("");

      // Add apply button at the bottom
      const applyButton = `
        <div class="command-apply-section">
          <button class="command-apply-btn">
            Add ${this.selectedItems.size} tab${this.selectedItems.size !== 1 ? "s" : ""}
          </button>
          <span class="command-hint">Space to toggle, Enter to apply</span>
        </div>
      `;

      this.container.innerHTML = `<div class="command-menu-items">${items}</div>${applyButton}`;
    } else if (this.currentCommand === "history") {
      // Show recent history items with checkboxes
      const historyItems = getRecentHistory();
      const items = historyItems
        .map((item, index) => {
          const itemId = `history-${item.url}`;
          const isChecked = this.selectedItems.has(itemId);
          return `
          <div class="command-item ${this.selectedIndex === index ? "selected" : ""} ${isChecked ? "checked" : ""}" data-index="${index}" data-item-id="${itemId}">
            <input type="checkbox" class="command-checkbox" ${isChecked ? "checked" : ""} />
            <img src="${item.faviconUrl}" class="command-item-icon" style="width: 16px; height: 16px;" onerror="this.style.display='none'" />
            <div style="flex: 1; overflow: hidden;">
              <div class="command-item-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.title}</div>
              <div class="command-item-description" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: #6b7280;">${item.url}</div>
            </div>
          </div>
        `;
        })
        .join("");

      // Add apply button at the bottom
      const applyButton = items
        ? `
        <div class="command-apply-section">
          <button class="command-apply-btn">
            Add ${this.selectedItems.size} item${this.selectedItems.size !== 1 ? "s" : ""}
          </button>
          <span class="command-hint">Space to toggle, Enter to apply</span>
        </div>
      `
        : "";

      this.container.innerHTML = `<div class="command-menu-items">${items || '<div style="padding: 12px; color: #6b7280;">No history items found</div>'}</div>${applyButton}`;
    } else if (this.currentCommand === "bookmarks") {
      // Show bookmarked items with checkboxes
      const bookmarkItems = getBookmarks();
      const items = bookmarkItems
        .map((item, index) => {
          const itemId = `bookmark-${item.url}`;
          const isChecked = this.selectedItems.has(itemId);
          return `
          <div class="command-item ${this.selectedIndex === index ? "selected" : ""} ${isChecked ? "checked" : ""}" data-index="${index}" data-item-id="${itemId}">
            <input type="checkbox" class="command-checkbox" ${isChecked ? "checked" : ""} />
            <span class="command-item-icon">⭐</span>
            <div style="flex: 1; overflow: hidden;">
              <div class="command-item-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.title}</div>
              <div class="command-item-description" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: #6b7280;">${item.url}</div>
            </div>
          </div>
        `;
        })
        .join("");

      // Add apply button at the bottom
      const applyButton = items
        ? `
        <div class="command-apply-section">
          <button class="command-apply-btn">
            Add ${this.selectedItems.size} bookmark${this.selectedItems.size !== 1 ? "s" : ""}
          </button>
          <span class="command-hint">Space to toggle, Enter to apply</span>
        </div>
      `
        : "";

      this.container.innerHTML = `<div class="command-menu-items">${items || '<div style="padding: 12px; color: #6b7280;">No bookmarks found</div>'}</div>${applyButton}`;
    }

    // Add click handlers
    const items = this.container.querySelectorAll(".command-item");
    items.forEach((item, index) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectItem(index);
      });
    });

    // Add click handler for apply button
    const applyBtn = this.container.querySelector(".command-apply-btn");
    if (applyBtn) {
      applyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.applySelection();
      });
    }
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.isActive) return false;

    if (event.key === "Backspace") {
      if (this.currentCommand === "tabs") {
        // If in tabs menu, go back to main command menu
        this.currentCommand = null;
        this.selectedIndex = 0;
        this.selectedItems.clear();
        this.render();
        // Don't let editor handle it - we're just changing menu state
        return true;
      } else {
        // In main menu, let editor handle backspace normally
        return false;
      }
    } else if (event.key === "Tab") {
      event.preventDefault();
      const itemCount =
        this.container?.querySelectorAll(".command-item").length ?? 0;
      if (event.shiftKey) {
        // Tab backwards
        this.selectedIndex =
          this.selectedIndex <= 0 ? itemCount - 1 : this.selectedIndex - 1;
      } else {
        // Tab forwards
        this.selectedIndex = (this.selectedIndex + 1) % itemCount;
      }
      this.render();
      return true;
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const itemCount =
        this.container?.querySelectorAll(".command-item").length ?? 0;
      this.selectedIndex = Math.min(this.selectedIndex + 1, itemCount - 1);
      this.render();
      this.scrollToSelected();
      return true;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.render();
      this.scrollToSelected();
      return true;
    } else if (
      event.key === " " &&
      (this.currentCommand === "tabs" ||
        this.currentCommand === "history" ||
        this.currentCommand === "bookmarks")
    ) {
      event.preventDefault();
      this.toggleItemSelection(this.selectedIndex);
      return true;
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (
        (this.currentCommand === "tabs" ||
          this.currentCommand === "history" ||
          this.currentCommand === "bookmarks") &&
        this.selectedItems.size > 0
      ) {
        this.applySelection();
      } else if (this.currentCommand === null && this.selectedIndex === 0) {
        // If selecting "tabs" from command menu with Enter, complete the text first
        this.onSelect?.("complete-tabs", null);
        // Show tabs menu
        this.currentCommand = "tabs";
        this.selectedIndex = 0;
        // Get existing pills from the pill manager
        const pillElements = document.getElementById("pills-container");
        if (pillElements) {
          const existingIds = Array.from(
            pillElements.querySelectorAll("[data-pill-id]"),
          )
            .map((el) => el.getAttribute("data-pill-id"))
            .filter((id): id is string => id !== null);
          this.selectedItems = new Set(existingIds);
          this.initialPillIds = new Set(existingIds);
        }
        this.render();
      } else {
        this.selectItem(this.selectedIndex);
      }
      return true;
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.hide();
      return true;
    }

    return false;
  }

  private selectItem(index: number) {
    if (this.currentCommand === null) {
      // Selecting a command type from filtered list
      const allCommands: CommandType[] = ["tabs", "history", "bookmarks"];
      const filteredCommands = this.currentQuery
        ? allCommands.filter((cmd) =>
            cmd.startsWith(this.currentQuery.toLowerCase()),
          )
        : allCommands;
      const selected = filteredCommands[index];
      if (selected === "tabs") {
        // Trigger completion and show tab list
        this.onSelect?.("complete-tabs", null);
        // Show tabs menu (the onSelect callback will set existing pills)
        this.currentCommand = "tabs";
        this.selectedIndex = 0;
        // Get existing pills from the pill manager
        const pillElements = document.getElementById("pills-container");
        if (pillElements) {
          const existingIds = Array.from(
            pillElements.querySelectorAll("[data-pill-id]"),
          )
            .map((el) => el.getAttribute("data-pill-id"))
            .filter((id): id is string => id !== null);
          this.selectedItems = new Set(existingIds);
          this.initialPillIds = new Set(existingIds);
        }
        this.render();
      } else if (selected === "history" || selected === "bookmarks") {
        // Complete the text and show history or bookmarks list
        this.onSelect?.(`complete-${selected}`, null);
        this.currentCommand = selected;
        this.selectedIndex = 0;
        this.render();
      } else {
        // For others, just close for now
        this.onSelect?.(selected, null);
        this.hide();
      }
    } else if (
      this.currentCommand === "tabs" ||
      this.currentCommand === "history" ||
      this.currentCommand === "bookmarks"
    ) {
      // Toggle the specific item selection with click
      this.toggleItemSelection(index);
    }
  }

  private toggleItemSelection(index: number) {
    let itemId: string | null = null;

    if (this.currentCommand === "tabs") {
      const tabs = getMockTabs();
      const tab = tabs[index];
      if (tab) itemId = tab.id;
    } else if (this.currentCommand === "history") {
      const historyItems = getRecentHistory();
      const item = historyItems[index];
      if (item) itemId = `history-${item.url}`;
    } else if (this.currentCommand === "bookmarks") {
      const bookmarkItems = getBookmarks();
      const item = bookmarkItems[index];
      if (item) itemId = `bookmark-${item.url}`;
    }

    if (!itemId) return;

    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
    } else {
      this.selectedItems.add(itemId);
    }
    this.render();
  }

  private applySelection() {
    const selectedData: (TabItem | SuggestionItem)[] = [];
    const toRemove: string[] = [];

    if (this.currentCommand === "tabs") {
      const tabs = getMockTabs();
      selectedData.push(
        ...tabs.filter((tab) => this.selectedItems.has(tab.id)),
      );

      // Find items that were initially selected but are now unselected (to remove)
      for (const id of this.initialPillIds) {
        if (!this.selectedItems.has(id)) {
          toRemove.push(id);
        }
      }
    } else if (this.currentCommand === "history") {
      const historyItems = getRecentHistory();
      selectedData.push(
        ...historyItems.filter((item) =>
          this.selectedItems.has(`history-${item.url}`),
        ),
      );
    } else if (this.currentCommand === "bookmarks") {
      const bookmarkItems = getBookmarks();
      selectedData.push(
        ...bookmarkItems.filter((item) =>
          this.selectedItems.has(`bookmark-${item.url}`),
        ),
      );
    }

    if (
      (selectedData.length > 0 || toRemove.length > 0) &&
      this.currentCommand
    ) {
      this.onApply?.(this.currentCommand, selectedData, toRemove);
      this.selectedItems.clear();
      this.initialPillIds.clear();
      this.hide();
    }
  }

  private scrollToSelected() {
    if (!this.container) return;

    const selectedItem = this.container.querySelector(".command-item.selected");
    const scrollContainer = this.container.querySelector(".command-menu-items");

    if (selectedItem && scrollContainer) {
      const itemRect = selectedItem.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();

      if (itemRect.top < containerRect.top) {
        selectedItem.scrollIntoView({ block: "start", behavior: "smooth" });
      } else if (itemRect.bottom > containerRect.bottom) {
        selectedItem.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    }
  }
}
