import type { TabItem } from "../types";
import { getFaviconUrl } from "../data";

export class PillManager {
  private container: HTMLElement;
  private pills: Map<string, TabItem> = new Map();
  private onRemove?: (id: string) => void;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Element with id ${containerId} not found`);
    }
    this.container = element;
  }

  setOnRemove(callback: (id: string) => void) {
    this.onRemove = callback;
  }

  addPill(item: TabItem) {
    if (this.pills.has(item.id)) return;

    this.pills.set(item.id, item);
    const pill = this.createPillElement(item);
    this.container.appendChild(pill);

    // Show container if it was hidden
    this.container.style.display = "flex";
  }

  removePill(id: string) {
    const element = this.container.querySelector(`[data-pill-id="${id}"]`);
    if (element) {
      element.remove();
      this.pills.delete(id);

      // Hide container if no pills
      if (this.pills.size === 0) {
        this.container.style.display = "none";
      }

      this.onRemove?.(id);
    }
  }

  private createPillElement(item: TabItem): HTMLElement {
    const pill = document.createElement("div");
    pill.className = "tab-pill";
    pill.dataset.pillId = item.id;

    // Favicon
    const favicon = document.createElement("img");
    favicon.src = item.faviconUrl || getFaviconUrl(item.url);
    favicon.className = "pill-favicon";
    favicon.onerror = () => {
      favicon.style.display = "none";
      const fallback = document.createElement("span");
      fallback.className = "pill-favicon-fallback";
      fallback.textContent = "🌐";
      favicon.replaceWith(fallback);
    };

    // Title
    const title = document.createElement("span");
    title.className = "pill-title";
    title.textContent = item.title;
    title.title = item.url; // Tooltip with full URL

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "pill-remove";
    removeBtn.innerHTML = "×";
    removeBtn.setAttribute("aria-label", `Remove ${item.title}`);
    removeBtn.onclick = (e) => {
      e.stopPropagation();

      // Store the current focus state and index before removal
      const wasFocused = document.activeElement === removeBtn;
      const allCloseButtons = this.container.querySelectorAll(".pill-remove");
      const currentIndex = Array.from(allCloseButtons).indexOf(removeBtn);

      this.removePill(item.id);

      // If the close button was focused (via keyboard), manage focus after removal
      if (wasFocused) {
        requestAnimationFrame(() => {
          const remainingButtons =
            this.container.querySelectorAll(".pill-remove");
          if (remainingButtons.length > 0) {
            if (currentIndex < remainingButtons.length) {
              // Focus the button at the same index (which is now the next pill)
              (remainingButtons[currentIndex] as HTMLElement).focus();
            } else {
              // If we removed the last one, focus the new last button
              (
                remainingButtons[remainingButtons.length - 1] as HTMLElement
              ).focus();
            }
          } else {
            // If no pills remain, focus the editor
            const editor = document.querySelector(
              ".ProseMirror",
            ) as HTMLElement;
            if (editor) {
              editor.focus();
            }
          }
        });
      }
    };

    pill.appendChild(favicon);
    pill.appendChild(title);
    pill.appendChild(removeBtn);

    return pill;
  }

  clear() {
    this.container.innerHTML = "";
    this.pills.clear();
    this.container.style.display = "none";
  }

  getPills(): TabItem[] {
    return Array.from(this.pills.values());
  }

  hasPill(id: string): boolean {
    return this.pills.has(id);
  }
}
