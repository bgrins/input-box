import type { CommandType, TabItem } from "../types";
import { getMockTabs } from "../data";
import { Editor } from "@tiptap/core";

export class CommandMenu {
  private container: HTMLElement | null = null;
  private selectedIndex = 0;
  private isActive = false;
  currentCommand: CommandType | null = null; // Made public for access
  private onSelect?: (command: CommandType, data: TabItem | null) => void;
  private selectedTabs: Set<string> = new Set();
  private onApply?: (command: CommandType, data: TabItem[]) => void;

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

  setOnSelect(callback: (command: CommandType, data: TabItem | null) => void) {
    this.onSelect = callback;
  }

  setOnApply(callback: (command: CommandType, data: TabItem[]) => void) {
    this.onApply = callback;
  }

  getSelectedTabs(): string[] {
    return Array.from(this.selectedTabs);
  }

  show(command: CommandType | null = null, existingPillIds: string[] = []) {
    if (!this.container) return;

    this.isActive = true;
    this.currentCommand = command;
    this.selectedIndex = 0;

    // If showing tabs, initialize with existing pills
    if (command === "tabs" && existingPillIds.length > 0) {
      this.selectedTabs = new Set(existingPillIds);
    } else if (command === "tabs") {
      // Clear selection if no existing pills
      this.selectedTabs.clear();
    }

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
      // Show command options
      this.container.innerHTML = `
        <div class="command-item ${this.selectedIndex === 0 ? "selected" : ""}" data-index="0">
          <span class="command-item-icon">📑</span>
          <div>
            <div class="command-item-label">tabs</div>
            <div class="command-item-description">Insert open tabs</div>
          </div>
        </div>
        <div class="command-item ${this.selectedIndex === 1 ? "selected" : ""}" data-index="1">
          <span class="command-item-icon">📚</span>
          <div>
            <div class="command-item-label">history</div>
            <div class="command-item-description">Search history</div>
          </div>
        </div>
        <div class="command-item ${this.selectedIndex === 2 ? "selected" : ""}" data-index="2">
          <span class="command-item-icon">⭐</span>
          <div>
            <div class="command-item-label">bookmarks</div>
            <div class="command-item-description">Search bookmarks</div>
          </div>
        </div>
      `;
    } else if (this.currentCommand === "tabs") {
      // Show available tabs with checkboxes
      const tabs = getMockTabs();
      const items = tabs
        .map((tab, index) => {
          const isChecked = this.selectedTabs.has(tab.id);
          return `
          <div class="command-item ${this.selectedIndex === index ? "selected" : ""} ${isChecked ? "checked" : ""}" data-index="${index}" data-tab-id="${tab.id}">
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
            Add ${this.selectedTabs.size} tab${this.selectedTabs.size !== 1 ? "s" : ""}
          </button>
          <span class="command-hint">Space to toggle, Enter to apply</span>
        </div>
      `;

      this.container.innerHTML = items + applyButton;
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
        this.applyTabSelection();
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
        this.selectedTabs.clear();
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
      return true;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.render();
      return true;
    } else if (event.key === " " && this.currentCommand === "tabs") {
      event.preventDefault();
      this.toggleTabSelection(this.selectedIndex);
      return true;
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (this.currentCommand === "tabs" && this.selectedTabs.size > 0) {
        this.applyTabSelection();
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
          this.selectedTabs = new Set(existingIds);
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
      // Selecting a command type
      const commands: CommandType[] = ["tabs", "history", "bookmarks"];
      const selected = commands[index];
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
          this.selectedTabs = new Set(existingIds);
        }
        this.render();
      } else {
        // For others, just close for now
        this.onSelect?.(selected, null);
        this.hide();
      }
    } else if (this.currentCommand === "tabs") {
      // Toggle the specific tab selection with click
      this.toggleTabSelection(index);
    }
  }

  private toggleTabSelection(index: number) {
    const tabs = getMockTabs();
    const tab = tabs[index];
    if (!tab) return;

    if (this.selectedTabs.has(tab.id)) {
      this.selectedTabs.delete(tab.id);
    } else {
      this.selectedTabs.add(tab.id);
    }
    this.render();
  }

  private applyTabSelection() {
    const tabs = getMockTabs();
    const selectedTabItems = tabs.filter((tab) =>
      this.selectedTabs.has(tab.id),
    );
    if (selectedTabItems.length > 0) {
      this.onApply?.("tabs", selectedTabItems);
      this.selectedTabs.clear();
      this.hide();
    }
  }
}
