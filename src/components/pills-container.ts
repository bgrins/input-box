/**
 * PillsContainer - A lit web component for managing attachment pills
 *
 * This component manages the display of attachment pills (tabs, history, bookmarks)
 * that users can add to their messages. It provides efficient DOM updates,
 * keyboard navigation, and focus management.
 */

import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import type { TabItem, SuggestionItem } from "../types";
import { getFaviconUrl } from "../data";

// Type that can be used as a pill
type PillItem = TabItem | SuggestionItem;

@customElement("pills-container")
export class PillsContainer extends LitElement {
  static override styles = css`
    :host {
      display: none;
      padding: 8px 16px;
      gap: 8px;
      flex-wrap: wrap;
      border-top: 1px solid #e5e7eb;
    }

    :host([has-pills]) {
      display: flex;
    }

    .tab-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      border: 1px solid #d1d5db;
      border-radius: 16px;
      font-size: 13px;
      transition: all 0.2s ease;
      cursor: default;
      animation: pillAppear 0.2s ease-out;
    }

    @keyframes pillAppear {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .tab-pill:hover {
      background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .pill-favicon {
      width: 14px;
      height: 14px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .pill-favicon-fallback {
      font-size: 14px;
      line-height: 1;
      flex-shrink: 0;
    }

    .pill-title {
      color: #374151;
      font-weight: 500;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pill-remove {
      width: 18px;
      height: 18px;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      padding: 0;
      font-size: 18px;
      line-height: 1;
      margin-left: 2px;
      flex-shrink: 0;
    }

    .pill-remove:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
    }

    .pill-remove:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
    }
  `;

  @state()
  private pills: Map<string, PillItem> = new Map();

  private onRemove?: (id: string) => void;

  setOnRemove(callback: (id: string) => void): void {
    this.onRemove = callback;
  }

  addPill(item: PillItem): void {
    // Generate ID for SuggestionItem if it doesn't have one
    const id = "id" in item ? item.id : `${item.type}-${item.url}`;

    if (this.pills.has(id)) return;

    this.pills.set(id, item);
    this.updateHasPillsAttribute();
    this.requestUpdate();
  }

  removePill(id: string): void {
    if (this.pills.delete(id)) {
      this.updateHasPillsAttribute();
      this.requestUpdate();
      this.onRemove?.(id);
    }
  }

  clear(): void {
    this.pills.clear();
    this.updateHasPillsAttribute();
    this.requestUpdate();
  }

  getPills(): PillItem[] {
    return Array.from(this.pills.values());
  }

  hasPill(id: string): boolean {
    return this.pills.has(id);
  }

  private updateHasPillsAttribute(): void {
    if (this.pills.size > 0) {
      this.setAttribute("has-pills", "");
    } else {
      this.removeAttribute("has-pills");
    }
  }

  private handleRemoveClick(e: Event, id: string, index: number): void {
    e.stopPropagation();

    // Store focus state before removal
    const wasFocused = this.shadowRoot?.activeElement === e.target;

    this.removePill(id);

    // Handle focus management after removal
    if (wasFocused) {
      requestAnimationFrame(() => {
        const remainingButtons =
          this.shadowRoot?.querySelectorAll(".pill-remove");
        if (remainingButtons && remainingButtons.length > 0) {
          if (index < remainingButtons.length) {
            // Focus the button at the same index (now the next pill)
            (remainingButtons[index] as HTMLElement).focus();
          } else {
            // If we removed the last one, focus the new last button
            (
              remainingButtons[remainingButtons.length - 1] as HTMLElement
            ).focus();
          }
        } else {
          // If no pills remain, focus the editor
          const editor = document.querySelector(".ProseMirror") as HTMLElement;
          editor?.focus();
        }
      });
    }
  }

  private renderIcon(item: PillItem) {
    const faviconUrl = item.faviconUrl || getFaviconUrl(item.url);

    return html`
      <img
        src=${faviconUrl}
        alt=""
        class="pill-favicon"
        @error=${(e: Event) => {
          const img = e.target as HTMLImageElement;
          img.style.display = "none";
          const fallback = document.createElement("span");
          fallback.className = "pill-favicon-fallback";
          fallback.textContent = "🌐";
          img.parentElement?.insertBefore(fallback, img);
        }}
      />
    `;
  }

  override render() {
    const pillEntries = Array.from(this.pills.entries());

    return html`
      ${repeat(
        pillEntries,
        ([id]) => id,
        ([id, item], index) => {
          return html`
            <div class="tab-pill" data-pill-id=${id} title=${item.url}>
              ${this.renderIcon(item)}
              <span class="pill-title">${item.title}</span>
              <button
                class="pill-remove"
                aria-label="Remove ${item.title}"
                @click=${(e: Event) => this.handleRemoveClick(e, id, index)}
              >
                ×
              </button>
            </div>
          `;
        },
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pills-container": PillsContainer;
  }
}
