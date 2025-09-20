/**
 * SuggestionsDropdown - A lit web component for URL/search suggestions
 *
 * This component handles the dropdown list of suggestions that appears
 * when users type in the input field. It provides smooth scrolling,
 * keyboard navigation, and efficient rendering of suggestion items.
 */

import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { classMap } from "lit/directives/class-map.js";
import type { SuggestionItem } from "../types";
import { getFaviconUrl, processHistoryData } from "../data";
import { enableHMR } from "../hmr-setup";

@customElement("suggestions-dropdown")
export class SuggestionsDropdown extends LitElement {
  static override styles = css`
    :host {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 0;
      background: white;
      border-radius: 0 0 20px 20px;
      box-shadow: none;
      max-height: 320px;
      overflow-y: auto;
      overflow-x: hidden;
      display: none;
      z-index: 1000;
      border-top: 1px solid #f3f4f6;
    }

    :host([active]) {
      display: block;
      animation: slideDown 0.2s ease-out;
    }

    :host([blurred]) {
      filter: blur(0.8px);
      transition: filter 0.2s;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .suggestion-item {
      padding: 12px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;
      border-bottom: 1px solid #f3f4f6;
      position: relative;
    }

    .suggestion-item:last-child {
      border-bottom: none;
    }

    .suggestion-item:hover {
      background: #f9fafb;
    }

    .suggestion-item.selected {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      box-shadow: inset 0 0 0 1px rgba(102, 126, 234, 0.1);
    }

    .suggestion-item.selected .suggestion-title {
      color: #4c1d95;
      font-weight: 600;
    }

    .suggestion-item.selected .suggestion-type {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
    }

    .suggestion-icon-wrapper {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .suggestion-favicon {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }

    .suggestion-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .suggestion-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .suggestion-title {
      color: #1f2937;
      font-size: 14px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .suggestion-url {
      color: #6b7280;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .suggestion-type {
      color: #9ca3af;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      background: #f3f4f6;
      border-radius: 12px;
      flex-shrink: 0;
    }
  `;

  @property({ type: Boolean, reflect: true })
  active!: boolean;

  @property({ type: Boolean, reflect: true })
  blurred!: boolean;

  @property({ type: Number })
  selectedIndex!: number;

  @state()
  suggestions: SuggestionItem[] = [];

  @state()
  private processedSuggestions: SuggestionItem[] = [];

  private onSelect?: (item: SuggestionItem, index: number) => void;

  constructor() {
    super();
    this.active = false;
    this.blurred = false;
    this.selectedIndex = -1;
    this.suggestions = [];
    this.processedSuggestions = [];
    this.refreshData();
  }

  refreshData(): void {
    this.processedSuggestions = processHistoryData();
  }

  setOnSelect(callback: (item: SuggestionItem, index: number) => void): void {
    this.onSelect = callback;
  }

  show(query: string): void {
    this.suggestions = this.filterSuggestions(query);
    this.selectedIndex = -1;
    this.active = this.suggestions.length > 0;
  }

  hide(): void {
    this.active = false;
    this.selectedIndex = -1;
    this.suggestions = [];
  }

  blur(): void {
    this.blurred = true;
  }

  unblur(): void {
    this.blurred = false;
  }

  selectNext(): void {
    if (this.suggestions.length === 0) return;
    this.selectedIndex = Math.min(
      this.selectedIndex + 1,
      this.suggestions.length - 1,
    );
    this.scrollToSelected();
  }

  selectPrevious(): void {
    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
    this.scrollToSelected();
  }

  getSelected(): SuggestionItem | null {
    if (
      this.selectedIndex >= 0 &&
      this.selectedIndex < this.suggestions.length
    ) {
      return this.suggestions[this.selectedIndex];
    }
    return null;
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  private isURL(str: string): boolean {
    try {
      const pattern =
        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      return pattern.test(str);
    } catch {
      return false;
    }
  }

  private filterSuggestions(query: string): SuggestionItem[] {
    if (!query) {
      return this.processedSuggestions.slice(0, 6);
    }

    const lowerQuery = query.toLowerCase();

    const filtered = this.processedSuggestions.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(lowerQuery);
      const urlMatch = item.url && item.url.toLowerCase().includes(lowerQuery);
      return titleMatch || urlMatch;
    });

    // Add direct navigation option
    if (this.isURL(query) || query.includes(".")) {
      filtered.unshift({
        title: query,
        url: query.startsWith("http") ? query : `https://${query}`,
        type: "navigate",
        faviconUrl: getFaviconUrl(
          query.startsWith("http") ? query : `https://${query}`,
        ),
      });
    }

    // Add search option
    if (!this.isURL(query)) {
      filtered.push({
        title: `Search for "${query}"`,
        url: null,
        type: "search",
        icon: "🔍",
      });
    }

    return filtered.slice(0, 8);
  }

  private scrollToSelected(): void {
    requestAnimationFrame(() => {
      const selected = this.shadowRoot?.querySelector(
        ".suggestion-item.selected",
      );
      if (selected) {
        selected.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    });
  }

  private handleItemClick(index: number): void {
    const item = this.suggestions[index];
    if (item) {
      this.onSelect?.(item, index);
    }
  }

  override render() {
    if (!this.active || this.suggestions.length === 0) {
      return null;
    }

    return html`
      ${repeat(
        this.suggestions,
        (item, index) => `${item.type}-${item.url || item.title}-${index}`,
        (item, index) => {
          const isSelected = index === this.selectedIndex;

          return html`
            <div
              class="suggestion-item ${classMap({ selected: isSelected })}"
              role="option"
              aria-selected=${isSelected}
              tabindex="-1"
              @click=${() => this.handleItemClick(index)}
              @mouseenter=${() => {
                this.selectedIndex = index;
              }}
            >
              <div class="suggestion-icon-wrapper">
                ${this.renderIcon(item)}
              </div>
              <div class="suggestion-text">
                <div class="suggestion-title">${item.title}</div>
                ${item.url
                  ? html`<div class="suggestion-url">${item.url}</div>`
                  : null}
              </div>
              <span class="suggestion-type">${item.type}</span>
            </div>
          `;
        },
      )}
    `;
  }

  private renderIcon(item: SuggestionItem) {
    if (item.faviconUrl) {
      return html`
        <img
          src=${item.faviconUrl}
          alt=""
          class="suggestion-favicon"
          @error=${(e: Event) => {
            const img = e.target as HTMLImageElement;
            img.style.display = "none";
            const fallback = document.createElement("span");
            fallback.className = "suggestion-icon";
            fallback.textContent = item.icon || "🌐";
            img.parentElement?.appendChild(fallback);
          }}
        />
      `;
    }
    return html`<span class="suggestion-icon">${item.icon || "🌐"}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "suggestions-dropdown": SuggestionsDropdown;
  }
}

// Enable HMR for this component (tree-shaken in production)
if (import.meta.hot) {
  enableHMR(SuggestionsDropdown, "suggestions-dropdown");
}
