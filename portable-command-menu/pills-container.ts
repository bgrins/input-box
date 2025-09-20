import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import type { TabItem, SuggestionItem } from "./types";

// Type that can be used as a pill
type PillItem = TabItem | SuggestionItem;

function getFaviconUrl(url: string, size: number = 32): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return "";
  }
}

@customElement("pills-container")
export class PillsContainer extends LitElement {
  static override styles = css`
    :host {
      display: none;
      position: relative;
      padding: 12px 16px;
      min-height: 48px;
      background: linear-gradient(to bottom, #ffffff, #fafbfc);
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
      transition: all 0.3s ease;
      transform-origin: center top;
    }

    :host([has-pills]),
    :host([visible]) {
      display: flex;
    }

    /* Cool spinning opening animation */
    @keyframes spinOpen {
      0% {
        transform: scaleY(0) rotateX(90deg);
        opacity: 0;
      }
      50% {
        transform: scaleY(0.5) rotateX(45deg);
        opacity: 0.5;
      }
      100% {
        transform: scaleY(1) rotateX(0deg);
        opacity: 1;
      }
    }

    :host([opening]) {
      animation: spinOpen 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    .pills-inner {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      flex: 1;
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

  @state()
  private opening = false;

  override connectedCallback() {
    super.connectedCallback();
    this.updateVisibility();
  }

  private getPillId(item: PillItem): string {
    if ("id" in item) {
      return item.id;
    } else if (item.url) {
      return `${item.type}-${item.url}`;
    } else {
      return `${item.type}-${item.title}-${Date.now()}`;
    }
  }

  addPill(item: PillItem): void {
    const id = this.getPillId(item);
    const wasEmpty = this.pills.size === 0;
    
    if (!this.pills.has(id)) {
      this.pills.set(id, item);
      this.requestUpdate();
      
      if (wasEmpty) {
        this.opening = true;
        setTimeout(() => {
          this.opening = false;
        }, 500);
      }
      
      this.updateVisibility();
    }
  }

  removePill(id: string): void {
    this.pills.delete(id);
    this.requestUpdate();
    this.updateVisibility();
  }

  hasPill(id: string): boolean {
    return this.pills.has(id);
  }

  getPills(): PillItem[] {
    return Array.from(this.pills.values());
  }

  clear(): void {
    this.pills.clear();
    this.requestUpdate();
    this.updateVisibility();
  }

  private updateVisibility(): void {
    if (this.pills.size > 0) {
      this.setAttribute("has-pills", "");
      this.setAttribute("visible", "");
      if (this.opening) {
        this.setAttribute("opening", "");
      } else {
        this.removeAttribute("opening");
      }
    } else {
      this.removeAttribute("has-pills");
      this.removeAttribute("visible");
      this.removeAttribute("opening");
    }
  }

  private removePillHandler(id: string, event: Event): void {
    event.stopPropagation();
    this.removePill(id);
  }

  override render() {
    if (this.pills.size === 0) return null;

    return html`
      <div class="pills-inner">
        ${repeat(
          Array.from(this.pills.entries()),
          ([id]) => id,
          ([id, pill]) => html`
            <div class="tab-pill" data-pill-id="${id}">
              ${this.renderPillIcon(pill)}
              <span class="pill-title">${pill.title}</span>
              <button
                class="pill-remove"
                @click=${(e: Event) => this.removePillHandler(id, e)}
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderPillIcon(pill: PillItem): unknown {
    const url = "url" in pill ? pill.url : null;
    const faviconUrl = "faviconUrl" in pill ? pill.faviconUrl : null;

    if (faviconUrl || url) {
      const favicon = faviconUrl || (url ? getFaviconUrl(url) : null);
      if (favicon) {
        return html`
          <img
            class="pill-favicon"
            src=${favicon}
            @error=${(e: Event) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              const fallback = document.createElement("span");
              fallback.className = "pill-favicon-fallback";
              fallback.textContent = this.getPillIconFallback(pill);
              img.parentElement?.replaceChild(fallback, img);
            }}
          />
        `;
      }
    }

    return html`
      <span class="pill-favicon-fallback">
        ${this.getPillIconFallback(pill)}
      </span>
    `;
  }

  private getPillIconFallback(pill: PillItem): string {
    if ("id" in pill) return "📑"; // Tab
    if (pill.type === "bookmark") return "⭐";
    if (pill.type === "history") return "📚";
    return "🔗";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pills-container": PillsContainer;
  }
}