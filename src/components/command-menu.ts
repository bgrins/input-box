/**
 * CommandMenuElement - A lit web component for command selection
 *
 * Key Patterns for Lit Components:
 *
 * 1. Property Management:
 *    - Use @property for public reactive properties (can be set from outside)
 *    - Use @state for private reactive state (internal only)
 *    - Initialize in constructor to avoid class field shadowing issues
 *    - Use `!` assertion for required properties
 *
 * 2. Rendering Optimization:
 *    - Use `repeat` directive for lists with stable keys
 *    - Use `classMap` for conditional classes
 *    - Keep render methods focused and split into sub-renders
 *
 * 3. Event Handling:
 *    - Use arrow functions in templates to preserve `this` context
 *    - Stop propagation when handling keyboard events in shadow DOM
 *    - Use `.checked` syntax for property binding vs `checked` for attributes
 *
 * 4. Styling:
 *    - Use :host for component-level styles
 *    - Use :host([attribute]) for attribute-based styling
 *    - Shadow DOM provides style encapsulation
 *
 * 5. Testing:
 *    - Use @open-wc/testing for web component testing
 *    - Access shadow DOM via element.shadowRoot
 *    - Wait for updateComplete after state changes
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { classMap } from "lit/directives/class-map.js";
import type { CommandType, TabItem, SuggestionItem } from "../types";
import { getMockTabs, getRecentHistory, getBookmarks } from "../data";

export type CommandCallback = (
  command: CommandType,
  data: TabItem | SuggestionItem | null,
) => void;

export type ApplyCallback = (
  command: CommandType,
  data: (TabItem | SuggestionItem)[],
  toRemove: string[],
) => void;

@customElement("command-menu")
export class CommandMenuElement extends LitElement {
  static override styles = css`
    :host {
      position: absolute;
      z-index: 1001;
      display: none;
    }

    :host([active]) {
      display: block;
    }

    .menu-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 8px;
      min-width: 200px;
      max-width: 400px;
      max-height: 300px;
      display: flex;
      flex-direction: column;
    }

    .menu-items {
      overflow-y: auto;
      max-height: 250px;
    }

    /* Show max 6 items before scrolling */
    .menu-items:has(.command-item:nth-child(7)) {
      max-height: calc(6 * 44px);
    }

    .command-item {
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s ease;
    }

    .command-item:hover,
    .command-item.selected {
      background: #f3f4f6;
    }

    .command-item.checked {
      background: #e6f4ff;
    }

    .command-item.selected.checked {
      background: #d0e8ff;
    }

    .command-checkbox {
      flex-shrink: 0;
      cursor: pointer;
      margin-right: 4px;
    }

    .command-item-icon {
      width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .command-item-icon img {
      width: 16px;
      height: 16px;
    }

    .command-item-content {
      flex: 1;
      overflow: hidden;
    }

    .command-item-label {
      font-weight: 500;
      color: #1f2937;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .command-item-description {
      font-size: 12px;
      color: #6b7280;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .command-apply-section {
      border-top: 1px solid #e2e8f0;
      margin-top: 4px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .command-apply-btn {
      padding: 6px 12px;
      background: #3182ce;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: background 0.15s;
    }

    .command-apply-btn:hover {
      background: #2c5282;
    }

    .command-hint {
      font-size: 11px;
      color: #718096;
    }

    .no-results {
      padding: 12px;
      color: #6b7280;
    }
  `;

  @property({ type: Boolean, reflect: true })
  active!: boolean;

  @property({ type: String })
  currentCommand!: CommandType | null;

  @property({ type: Array })
  existingPillIds!: string[];

  @property({ type: String })
  query!: string;

  @state()
  private selectedIndex!: number;

  @state()
  private selectedItems!: Set<string>;

  @state()
  private initialPillIds!: Set<string>;

  private onSelect?: CommandCallback;
  private onApply?: ApplyCallback;

  constructor() {
    super();
    this.active = false;
    this.currentCommand = null;
    this.existingPillIds = [];
    this.query = "";
    this.selectedIndex = 0;
    this.selectedItems = new Set();
    this.initialPillIds = new Set();
  }

  setCallbacks(onSelect: CommandCallback, onApply: ApplyCallback) {
    this.onSelect = onSelect;
    this.onApply = onApply;
  }

  show(
    command: CommandType | null = null,
    existingPillIds: string[] = [],
    query = "",
  ) {
    this.active = true;
    this.currentCommand = command;
    this.existingPillIds = existingPillIds;
    this.query = query;
    this.selectedIndex = 0;

    // Initialize selection state for tabs
    if (command === "tabs" && existingPillIds.length > 0) {
      this.selectedItems = new Set(existingPillIds);
      this.initialPillIds = new Set(existingPillIds);
    } else if (
      command === "tabs" ||
      command === "history" ||
      command === "bookmarks"
    ) {
      this.selectedItems.clear();
      this.initialPillIds.clear();
    }

    this.positionMenu();
  }

  hide() {
    this.active = false;
    this.currentCommand = null;

    // Remove blur from suggestions when hiding
    const suggestionsDropdown = document.getElementById("suggestions");
    if (suggestionsDropdown) {
      suggestionsDropdown.classList.remove("blurred");
    }
  }

  private positionMenu() {
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
          this.style.left = `${Math.max(20, rect.left)}px`;
          this.style.top = `${rect.bottom + 5}px`;
        } else {
          // Fallback to positioning below editor
          this.style.left = `${editorRect.left}px`;
          this.style.top = `${editorRect.bottom + 5}px`;
        }
      } else {
        // Fallback to positioning below editor
        this.style.left = `${editorRect.left}px`;
        this.style.top = `${editorRect.bottom + 5}px`;
      }
    }
  }

  private getFilteredCommands() {
    const commands = [
      { name: "tabs", icon: "📑", description: "Insert open tabs" },
      { name: "history", icon: "📚", description: "Insert from history" },
      { name: "bookmarks", icon: "⭐", description: "Insert bookmarks" },
    ];

    return this.query
      ? commands.filter((cmd) => cmd.name.startsWith(this.query.toLowerCase()))
      : commands;
  }

  private getItems(): any[] {
    if (this.currentCommand === "tabs") {
      return getMockTabs();
    } else if (this.currentCommand === "history") {
      return getRecentHistory();
    } else if (this.currentCommand === "bookmarks") {
      return getBookmarks();
    }
    return [];
  }

  private getItemId(item: any, index: number): string {
    if (this.currentCommand === "tabs") {
      return item.id;
    } else if (this.currentCommand === "history") {
      return `history-${item.url}`;
    } else if (this.currentCommand === "bookmarks") {
      return `bookmark-${item.url}`;
    }
    return `item-${index}`;
  }

  private toggleItem(index: number) {
    const items = this.getItems();
    const item = items[index];
    if (!item) return;

    const itemId = this.getItemId(item, index);

    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
    } else {
      this.selectedItems.add(itemId);
    }
    this.requestUpdate();
  }

  private selectItem(index: number) {
    if (this.currentCommand === null) {
      const commands = this.getFilteredCommands();
      const selected = commands[index];
      if (selected) {
        if (selected.name === "tabs") {
          this.onSelect?.("complete-tabs", null);
          this.currentCommand = "tabs";
          this.selectedIndex = 0;
          // Get existing pills
          const pillsContainer = document.querySelector("pills-container");
          if (pillsContainer && pillsContainer.shadowRoot) {
            const existingIds = Array.from(
              pillsContainer.shadowRoot.querySelectorAll("[data-pill-id]"),
            )
              .map((el) => el.getAttribute("data-pill-id"))
              .filter((id): id is string => id !== null);
            this.selectedItems = new Set(existingIds);
            this.initialPillIds = new Set(existingIds);
          }
        } else if (
          selected.name === "history" ||
          selected.name === "bookmarks"
        ) {
          this.onSelect?.(`complete-${selected.name}` as CommandType, null);
          this.currentCommand = selected.name as CommandType;
          this.selectedIndex = 0;
        }
      }
    } else if (
      this.currentCommand === "tabs" ||
      this.currentCommand === "history" ||
      this.currentCommand === "bookmarks"
    ) {
      this.toggleItem(index);
    }
  }

  private applySelection() {
    const selectedData: (TabItem | SuggestionItem)[] = [];
    const toRemove: string[] = [];

    const items = this.getItems();

    if (this.currentCommand === "tabs") {
      selectedData.push(
        ...items.filter((item) => this.selectedItems.has(item.id)),
      );

      // Find items that were initially selected but are now unselected
      for (const id of this.initialPillIds) {
        if (!this.selectedItems.has(id)) {
          toRemove.push(id);
        }
      }
    } else if (this.currentCommand === "history") {
      selectedData.push(
        ...items.filter((item) =>
          this.selectedItems.has(`history-${item.url}`),
        ),
      );
    } else if (this.currentCommand === "bookmarks") {
      selectedData.push(
        ...items.filter((item) =>
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

  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.active) return false;

    if (event.key === "Backspace") {
      if (this.currentCommand === "tabs") {
        this.currentCommand = null;
        this.selectedIndex = 0;
        this.selectedItems.clear();
        return true;
      } else {
        return false;
      }
    } else if (event.key === "Tab") {
      event.preventDefault();
      const itemCount = this.getItemCount();
      if (event.shiftKey) {
        this.selectedIndex =
          this.selectedIndex <= 0 ? itemCount - 1 : this.selectedIndex - 1;
      } else {
        this.selectedIndex = (this.selectedIndex + 1) % itemCount;
      }
      this.scrollToSelected();
      return true;
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const itemCount = this.getItemCount();
      this.selectedIndex = Math.min(this.selectedIndex + 1, itemCount - 1);
      this.scrollToSelected();
      return true;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.scrollToSelected();
      return true;
    } else if (
      event.key === " " &&
      (this.currentCommand === "tabs" ||
        this.currentCommand === "history" ||
        this.currentCommand === "bookmarks")
    ) {
      event.preventDefault();
      this.toggleItem(this.selectedIndex);
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
      } else if (this.currentCommand === null) {
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

  private getItemCount(): number {
    if (this.currentCommand === null) {
      return this.getFilteredCommands().length;
    }
    return this.getItems().length;
  }

  private scrollToSelected() {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const container = this.shadowRoot?.querySelector(".menu-items");
      const selected = this.shadowRoot?.querySelector(".command-item.selected");

      if (container && selected) {
        const containerRect = container.getBoundingClientRect();
        const selectedRect = selected.getBoundingClientRect();

        if (selectedRect.top < containerRect.top) {
          selected.scrollIntoView({ block: "start", behavior: "smooth" });
        } else if (selectedRect.bottom > containerRect.bottom) {
          selected.scrollIntoView({ block: "end", behavior: "smooth" });
        }
      }
    });
  }

  override render() {
    if (!this.active) return null;

    return html`
      <div
        class="menu-container"
        role="listbox"
        aria-label="Command menu"
        @keydown=${(e: KeyboardEvent) => e.stopPropagation()}
      >
        ${this.currentCommand === null
          ? this.renderCommandList()
          : this.renderItemList()}
      </div>
    `;
  }

  private renderCommandList() {
    const commands = this.getFilteredCommands();

    if (commands.length === 0) {
      return html`
        <div class="menu-items">
          <div class="no-results">No matching commands</div>
        </div>
      `;
    }

    return html`
      <div class="menu-items">
        ${repeat(
          commands,
          (cmd) => cmd.name,
          (cmd, index) => html`
            <div
              class="command-item ${classMap({
                selected: this.selectedIndex === index,
              })}"
              role="option"
              aria-selected=${this.selectedIndex === index}
              tabindex="-1"
              @click=${() => this.selectItem(index)}
            >
              <span class="command-item-icon">${cmd.icon}</span>
              <div class="command-item-content">
                <div class="command-item-label">${cmd.name}</div>
                <div class="command-item-description">${cmd.description}</div>
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }

  private renderItemList() {
    const items = this.getItems();

    if (items.length === 0) {
      const message =
        this.currentCommand === "history"
          ? "No history items found"
          : this.currentCommand === "bookmarks"
            ? "No bookmarks found"
            : "No items found";

      return html`
        <div class="menu-items">
          <div class="no-results">${message}</div>
        </div>
      `;
    }

    return html`
      <div class="menu-items">
        ${repeat(
          items,
          (item, index) => this.getItemId(item, index),
          (item, index) => {
            const itemId = this.getItemId(item, index);
            const isChecked = this.selectedItems.has(itemId);
            const isSelected = this.selectedIndex === index;

            return html`
              <div
                class="command-item ${classMap({
                  selected: isSelected,
                  checked: isChecked,
                })}"
                role="option"
                aria-selected=${isSelected}
                aria-checked=${isChecked}
                tabindex="-1"
                @click=${() => this.selectItem(index)}
              >
                <input
                  type="checkbox"
                  class="command-checkbox"
                  .checked=${isChecked}
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this.toggleItem(index);
                  }}
                />
                ${this.renderItemIcon(item)}
                <div class="command-item-content">
                  <div class="command-item-label">${item.title}</div>
                  ${item.url
                    ? html`<div class="command-item-description">
                        ${item.url}
                      </div>`
                    : null}
                </div>
              </div>
            `;
          },
        )}
      </div>
      ${this.renderApplyButton()}
    `;
  }

  private renderItemIcon(item: any) {
    if (this.currentCommand === "tabs" || this.currentCommand === "history") {
      return html`
        <span class="command-item-icon">
          <img
            src=${item.faviconUrl}
            @error=${(e: Event) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </span>
      `;
    } else if (this.currentCommand === "bookmarks") {
      return html`<span class="command-item-icon">⭐</span>`;
    }
    return null;
  }

  private renderApplyButton() {
    const count = this.selectedItems.size;
    const label =
      this.currentCommand === "tabs"
        ? `Add ${count} tab${count !== 1 ? "s" : ""}`
        : this.currentCommand === "bookmarks"
          ? `Add ${count} bookmark${count !== 1 ? "s" : ""}`
          : `Add ${count} item${count !== 1 ? "s" : ""}`;

    return html`
      <div class="command-apply-section">
        <button class="command-apply-btn" @click=${() => this.applySelection()}>
          ${label}
        </button>
        <span class="command-hint">Space to toggle, Enter to apply</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "command-menu": CommandMenuElement;
  }
}
