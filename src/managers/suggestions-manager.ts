import type { SuggestionItem } from "../types";
import { getFaviconUrl, processHistoryData } from "../data";

export class SuggestionsManager {
  private container: HTMLElement;
  private currentSuggestions: SuggestionItem[] = [];
  private selectedIndex = -1;
  private processedSuggestions: SuggestionItem[] = [];

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Element with id ${containerId} not found`);
    }
    this.container = element;
    this.refreshSuggestions();
  }

  refreshSuggestions(): void {
    this.processedSuggestions = processHistoryData();
  }

  isURL(str: string): boolean {
    try {
      const pattern =
        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      return pattern.test(str);
    } catch {
      return false;
    }
  }

  filterSuggestions(query: string): SuggestionItem[] {
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

  render(): void {
    if (this.currentSuggestions.length === 0) {
      this.hide();
      return;
    }

    this.container.innerHTML = this.currentSuggestions
      .map((item, index) => {
        const iconContent = item.faviconUrl
          ? `<img src="${item.faviconUrl}" alt="" class="suggestion-favicon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span class="suggestion-icon" style="display:none;">${item.icon || "🌐"}</span>`
          : `<span class="suggestion-icon">${item.icon || "🌐"}</span>`;

        return `
          <div class="suggestion-item ${index === this.selectedIndex ? "selected" : ""}" data-index="${index}">
              <div class="suggestion-icon-wrapper">
                  ${iconContent}
              </div>
              <div class="suggestion-text">
                  <div class="suggestion-title">${item.title}</div>
                  ${item.url ? `<div class="suggestion-url">${item.url}</div>` : ""}
              </div>
              <span class="suggestion-type">${item.type}</span>
          </div>
      `;
      })
      .join("");

    this.container.classList.add("active");
  }

  show(query: string): void {
    this.currentSuggestions = this.filterSuggestions(query);
    this.selectedIndex = -1;
    this.render();
  }

  hide(): void {
    this.container.classList.remove("active");
    this.selectedIndex = -1;
    this.currentSuggestions = [];
  }

  blur(): void {
    this.container.classList.add("blurred");
  }

  unblur(): void {
    this.container.classList.remove("blurred");
  }

  isActive(): boolean {
    return this.container.classList.contains("active");
  }

  selectNext(): void {
    this.selectedIndex = Math.min(
      this.selectedIndex + 1,
      this.currentSuggestions.length - 1,
    );
    this.render();
    this.scrollSelectedIntoView();
  }

  selectPrevious(): void {
    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
    this.render();
    this.scrollSelectedIntoView();
  }

  private scrollSelectedIntoView(): void {
    if (this.selectedIndex >= 0) {
      const selectedElement = this.container.querySelector(
        `.suggestion-item[data-index="${this.selectedIndex}"]`,
      ) as HTMLElement;

      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }

  getSelected(): SuggestionItem | null {
    if (
      this.selectedIndex >= 0 &&
      this.selectedIndex < this.currentSuggestions.length
    ) {
      return this.currentSuggestions[this.selectedIndex];
    }
    return null;
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  getCurrentSuggestions(): SuggestionItem[] {
    return this.currentSuggestions;
  }

  setupClickHandler(callback: (index: number) => void): void {
    this.container.addEventListener("click", (e) => {
      const item = (e.target as HTMLElement).closest(
        ".suggestion-item",
      ) as HTMLElement;
      if (item) {
        const index = parseInt(item.dataset.index!);
        callback(index);
      }
    });
  }
}
