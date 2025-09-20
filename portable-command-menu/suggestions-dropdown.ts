import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { classMap } from "lit/directives/class-map.js";
import type { SuggestionItem } from "./types";

function getFaviconUrl(url: string, size: number = 32): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return "";
  }
}

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
      font-weight: 600;
    }

    .no-suggestions {
      padding: 20px;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }
  `;

  @property({ type: Boolean, reflect: true })
  active = false;

  @property({ type: Boolean, reflect: true })
  blurred = false;

  @state()
  selectedIndex = -1;

  @state()
  private suggestions: SuggestionItem[] = [];

  private dataProvider?: {
    getSuggestions?: (query: string) => SuggestionItem[];
  };

  private onSelect?: (item: SuggestionItem, index: number) => void;
  private currentQuery = "";

  setDataProvider(provider: { getSuggestions?: (query: string) => SuggestionItem[] }) {
    this.dataProvider = provider;
  }

  setOnSelect(callback: (item: SuggestionItem, index: number) => void) {
    this.onSelect = callback;
  }

  show(query: string) {
    this.currentQuery = query;
    this.updateSuggestions();
    
    if (this.suggestions.length > 0) {
      this.active = true;
      this.selectedIndex = -1;
    } else {
      this.hide();
    }
  }

  hide() {
    this.active = false;
    this.selectedIndex = -1;
    this.suggestions = [];
  }

  blur() {
    this.blurred = true;
  }

  unblur() {
    this.blurred = false;
  }

  selectNext() {
    if (this.suggestions.length === 0) return;
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
    this.scrollToSelected();
  }

  selectPrevious() {
    if (this.suggestions.length === 0) return;
    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
    this.scrollToSelected();
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  getSelected(): SuggestionItem | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
      return this.suggestions[this.selectedIndex];
    }
    return null;
  }

  refreshData() {
    if (this.active && this.currentQuery) {
      this.updateSuggestions();
    }
  }

  private updateSuggestions() {
    if (!this.dataProvider?.getSuggestions) {
      // Default suggestions logic
      this.suggestions = this.generateDefaultSuggestions(this.currentQuery);
    } else {
      this.suggestions = this.dataProvider.getSuggestions(this.currentQuery);
    }
    this.requestUpdate();
  }

  private generateDefaultSuggestions(query: string): SuggestionItem[] {
    if (!query) return [];

    const suggestions: SuggestionItem[] = [];

    // Always add search suggestion
    suggestions.push({
      title: `Search for "${query}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      type: "search",
      icon: "🔍",
    });

    // Check if it's a URL-like query
    if (query.includes(".") && !query.includes(" ")) {
      const url = query.startsWith("http") ? query : `https://${query}`;
      suggestions.push({
        title: `Go to ${query}`,
        url: url,
        type: "navigate",
        icon: "🌐",
      });
    }

    return suggestions.slice(0, 5);
  }

  private scrollToSelected() {
    requestAnimationFrame(() => {
      const container = this.shadowRoot;
      const selected = container?.querySelector(".suggestion-item.selected");
      
      if (selected) {
        selected.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  }

  private handleItemClick(index: number) {
    this.selectedIndex = index;
    const item = this.suggestions[index];
    if (item && this.onSelect) {
      this.onSelect(item, index);
    }
  }

  override render() {
    if (!this.active) return null;

    if (this.suggestions.length === 0) {
      return html`
        <div class="no-suggestions">
          No suggestions available
        </div>
      `;
    }

    return html`
      ${repeat(
        this.suggestions,
        (item, index) => `${item.type}-${item.url || item.title}-${index}`,
        (item, index) => html`
          <div
            class="suggestion-item ${classMap({
              selected: this.selectedIndex === index
            })}"
            @click=${() => this.handleItemClick(index)}
          >
            ${this.renderIcon(item)}
            <div class="suggestion-text">
              <div class="suggestion-title">${item.title}</div>
              ${item.url ? html`
                <div class="suggestion-url">${item.url}</div>
              ` : null}
            </div>
            <span class="suggestion-type">${item.type}</span>
          </div>
        `
      )}
    `;
  }

  private renderIcon(item: SuggestionItem) {
    if (item.icon) {
      return html`
        <span class="suggestion-icon">${item.icon}</span>
      `;
    }

    if (item.faviconUrl || item.url) {
      const faviconUrl = item.faviconUrl || (item.url ? getFaviconUrl(item.url) : null);
      if (faviconUrl) {
        return html`
          <div class="suggestion-icon-wrapper">
            <img
              class="suggestion-favicon"
              src=${faviconUrl}
              @error=${(e: Event) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                const fallback = document.createElement("span");
                fallback.className = "suggestion-icon";
                fallback.textContent = this.getIconFallback(item);
                img.parentElement?.replaceChild(fallback, img);
              }}
            />
          </div>
        `;
      }
    }

    return html`
      <span class="suggestion-icon">${this.getIconFallback(item)}</span>
    `;
  }

  private getIconFallback(item: SuggestionItem): string {
    switch (item.type) {
      case "search": return "🔍";
      case "navigate": return "🌐";
      case "history": return "📚";
      case "bookmark": return "⭐";
      case "tab": return "📑";
      default: return "🔗";
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "suggestions-dropdown": SuggestionsDropdown;
  }
}