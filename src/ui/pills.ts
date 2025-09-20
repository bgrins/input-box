import type { TabItem, SuggestionItem } from "../types";
import { getFaviconUrl } from "../data";

// Type that can be used as a pill
type PillItem = TabItem | SuggestionItem;

export class PillManager {
  private container: HTMLElement;
  private innerContainer: HTMLElement;
  private commandButton: HTMLElement;
  private pills: Map<string, PillItem> = new Map();
  private onRemove?: (id: string) => void;
  private onCommandClick?: () => void;
  private tooltipTimeout?: number;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Element with id ${containerId} not found`);
    }
    this.container = element;

    // Create inner container for scrolling
    this.innerContainer = document.createElement("div");
    this.innerContainer.className = "pills-inner";
    this.container.appendChild(this.innerContainer);

    // Create command menu button
    this.commandButton = this.createCommandButton();
    this.container.appendChild(this.commandButton);
  }

  private createCommandButton(): HTMLElement {
    const button = document.createElement("button");
    button.className = "pills-command-btn";
    button.setAttribute("title", "Add more attachments");
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="12" cy="5" r="1"></circle>
        <circle cx="12" cy="19" r="1"></circle>
      </svg>
    `;
    button.addEventListener("click", () => {
      this.onCommandClick?.();
    });
    return button;
  }

  setOnRemove(callback: (id: string) => void) {
    this.onRemove = callback;
  }

  setOnCommandClick(callback: () => void) {
    this.onCommandClick = callback;
  }

  show() {
    this.container.style.display = "flex";
    this.container.classList.add("opening");
    // Remove the opening class after animation
    setTimeout(() => {
      this.container.classList.remove("opening");
    }, 600);
  }

  hide() {
    if (this.pills.size === 0) {
      this.container.style.display = "none";
    }
  }

  addPill(item: PillItem) {
    // Generate ID for SuggestionItem if it doesn't have one
    const id = "id" in item ? item.id : `${item.type}-${item.url}`;

    if (this.pills.has(id)) return;

    this.pills.set(id, item);
    const pill = this.createPillElement(item, id);
    this.innerContainer.appendChild(pill);

    // Update container state
    this.updateContainerState();

    // Scroll to show the new pill
    requestAnimationFrame(() => {
      pill.scrollIntoView({
        behavior: "smooth",
        inline: "end",
        block: "nearest",
      });
    });
  }

  removePill(id: string) {
    const element = this.container.querySelector(`[data-pill-id="${id}"]`);
    if (element) {
      // Add fade out animation
      element.classList.add("removing");
      setTimeout(() => {
        element.remove();
        this.pills.delete(id);
        this.updateContainerState();
        this.onRemove?.(id);
      }, 200);
    }
  }

  private updateContainerState() {
    const count = this.pills.size;

    if (count === 0) {
      this.container.style.display = "none";
    } else {
      this.container.style.display = "flex";
      this.container.setAttribute("data-count", count.toString());

      // Add stacked class for many pills
      if (count > 6) {
        this.container.classList.add("stacked");
      } else {
        this.container.classList.remove("stacked");
      }

      // Check for overflow
      requestAnimationFrame(() => {
        if (this.innerContainer.scrollWidth > this.innerContainer.clientWidth) {
          this.container.classList.add("has-overflow");
        } else {
          this.container.classList.remove("has-overflow");
        }
      });
    }
  }

  private createPillElement(item: PillItem, id: string): HTMLElement {
    const pill = document.createElement("div");
    pill.className = "tab-pill";
    pill.dataset.pillId = id;
    pill.setAttribute("tabindex", "0");
    pill.setAttribute("role", "button");
    pill.setAttribute("aria-label", `${item.title} - Press Delete to remove`);

    // Create tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "pill-tooltip";
    tooltip.innerHTML = `
      <div class="pill-tooltip-title">${item.title}</div>
      ${item.url ? `<div class="pill-tooltip-url">${item.url}</div>` : ""}
    `;
    pill.appendChild(tooltip);

    // Show/hide tooltip on hover
    pill.addEventListener("mouseenter", () => {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = window.setTimeout(() => {
        tooltip.classList.add("visible");
      }, 500);
    });

    pill.addEventListener("mouseleave", () => {
      clearTimeout(this.tooltipTimeout);
      tooltip.classList.remove("visible");
    });

    // Keyboard support for tooltip and navigation
    pill.addEventListener("focus", () => {
      tooltip.classList.add("visible");
    });

    pill.addEventListener("blur", () => {
      tooltip.classList.remove("visible");
    });

    // Keyboard navigation
    pill.addEventListener("keydown", (e) => {
      const allPills = Array.from(
        this.innerContainer.querySelectorAll(".tab-pill:not(.removing)"),
      );
      const currentIndex = allPills.indexOf(pill);

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (currentIndex > 0) {
            (allPills[currentIndex - 1] as HTMLElement).focus();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (currentIndex < allPills.length - 1) {
            (allPills[currentIndex + 1] as HTMLElement).focus();
          }
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          this.removePill(id);
          break;
        case "Escape": {
          e.preventDefault();
          const editor = document.querySelector(".ProseMirror") as HTMLElement;
          if (editor) {
            editor.focus();
          }
          break;
        }
      }
    });

    // Favicon
    const favicon = document.createElement("img");
    favicon.src = item.faviconUrl || getFaviconUrl(item.url || "");
    favicon.className = "pill-favicon";
    favicon.setAttribute("alt", "");
    favicon.onerror = () => {
      favicon.style.display = "none";
      const fallback = document.createElement("span");
      fallback.className = "pill-favicon-fallback";
      fallback.textContent = "icon" in item && item.icon ? item.icon : "🌐";
      favicon.replaceWith(fallback);
    };

    // Title
    const title = document.createElement("span");
    title.className = "pill-title";
    title.textContent = item.title;

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

      this.removePill(id);

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
    this.innerContainer.innerHTML = "";
    this.pills.clear();
    this.updateContainerState();
  }

  getPills(): PillItem[] {
    return Array.from(this.pills.values());
  }

  hasPill(id: string): boolean {
    return this.pills.has(id);
  }
}
