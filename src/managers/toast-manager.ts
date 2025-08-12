import { getFaviconUrl } from "../data";

export class ToastManager {
  private container: HTMLElement;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Element with id ${containerId} not found`);
    }
    this.container = element;
  }

  show(text: string): void {
    let actionType = "search";
    let actionText = `Searching for "${text}"...`;
    let faviconUrl = "";

    if (this.isURL(text) || text.includes(".com") || text.includes(".org")) {
      actionType = "navigate";
      actionText = `Navigating to ${text}...`;
      faviconUrl = getFaviconUrl(text);
    }

    const toastDiv = document.createElement("div");
    toastDiv.className = `toast-item ${actionType}`;

    const iconDiv = document.createElement("div");
    iconDiv.className = "action-icon";

    if (faviconUrl) {
      const favicon = document.createElement("img");
      favicon.src = faviconUrl;
      favicon.style.width = "16px";
      favicon.style.height = "16px";
      favicon.onerror = () => {
        iconDiv.textContent = "🌐";
      };
      iconDiv.appendChild(favicon);
    } else {
      iconDiv.textContent = actionType === "navigate" ? "🌐" : "🔍";
    }

    const contentDiv = document.createElement("div");
    contentDiv.className = "action-content";
    contentDiv.textContent = actionText;

    toastDiv.appendChild(iconDiv);
    toastDiv.appendChild(contentDiv);
    this.container.appendChild(toastDiv);

    // Fade out older toasts
    const allToasts = this.container.querySelectorAll(".toast-item");
    allToasts.forEach((toast, index) => {
      if (index > 2) {
        (toast as HTMLElement).classList.add("fade-out");
        setTimeout(() => toast.remove(), 300);
      } else if (index > 0) {
        (toast as HTMLElement).style.opacity = Math.max(
          0.7,
          1 - index * 0.15,
        ).toString();
      }
    });

    // Auto-remove this toast
    setTimeout(() => {
      toastDiv.classList.add("fade-out");
      setTimeout(() => toastDiv.remove(), 300);
    }, 2500);
  }

  showWithPills(text: string, pillCount: number): void {
    const pillInfo = `with ${pillCount} tab${pillCount !== 1 ? "s" : ""}`;
    const actionText = text || "Message";
    this.show(`${actionText} ${pillInfo}`);
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
}
