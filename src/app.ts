import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import theoData from "../public/theo.json" with { type: "json" };

interface SuggestionItem {
  title: string;
  url: string | null;
  type: "history" | "bookmark" | "search" | "command" | "navigate";
  icon?: string;
  faviconUrl?: string;
  visits?: number;
  lastVisitTime?: string;
}

interface HistoryData {
  [url: string]: {
    title?: string;
    visits: number;
    bookmarked: boolean;
    lastVisitTime: string;
  };
}

const historyData = theoData as HistoryData;
let processedSuggestions: SuggestionItem[] = [];

// Function to get favicon URL
function getFaviconUrl(url: string, size: number = 32): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return "";
  }
}

// Function to get title from URL
function getTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let title = urlObj.hostname.replace("www.", "");

    // Add path context if it's a search
    if (url.includes("search?")) {
      const params = new URLSearchParams(urlObj.search);
      const query = params.get("q");
      if (query) {
        return `Search: ${query}`;
      }
    }

    // Add path context for specific pages
    if (urlObj.pathname && urlObj.pathname !== "/") {
      const pathParts = urlObj.pathname.split("/").filter((p) => p);
      if (pathParts.length > 0) {
        title += ` - ${pathParts[0].replace(/-/g, " ")}`;
      }
    }

    return title.charAt(0).toUpperCase() + title.slice(1);
  } catch {
    return url;
  }
}

// Process the imported data into suggestions
function initializeSuggestions() {
  processedSuggestions = Object.entries(historyData)
    .map(([url, data]) => ({
      title: data.title || getTitleFromUrl(url),
      url,
      type: data.bookmarked ? ("bookmark" as const) : ("history" as const),
      faviconUrl: getFaviconUrl(url),
      visits: data.visits,
      lastVisitTime: data.lastVisitTime,
    }))
    .sort((a, b) => {
      // Sort by visits first, then by last visit time
      if (b.visits !== a.visits) {
        return (b.visits || 0) - (a.visits || 0);
      }
      return (b.lastVisitTime || "").localeCompare(a.lastVisitTime || "");
    });
}

// Initialize suggestions on startup
initializeSuggestions();

const toastContainer = document.getElementById(
  "toast-container",
) as HTMLDivElement;
const suggestionsDropdown = document.getElementById(
  "suggestions",
) as HTMLDivElement;
const sendButton = document.getElementById("send-btn") as HTMLButtonElement;
const charCount = document.getElementById("char-count") as HTMLSpanElement;
const devButton = document.getElementById("dev-btn") as HTMLButtonElement;

let currentSuggestions: SuggestionItem[] = [];
let selectedIndex = -1;
let lastQuery = "";
let selectedUrl: string | null = null;

// Initialize TipTap editor
const editor = new Editor({
  element: document.querySelector("#editor") as HTMLElement,
  extensions: [
    StarterKit.configure({
      hardBreak: {
        keepMarks: false,
      },
    }),
    Placeholder.configure({
      placeholder: "Search or type a URL...",
    }),
    Link.configure({
      openOnClick: false,
    }),
  ],
  content: "",
  autofocus: true,
  editorProps: {
    attributes: {
      class: "prose prose-sm focus:outline-none",
    },
    handleKeyDown: (_view, event) => {
      // Handle arrow keys for suggestions FIRST
      if (suggestionsDropdown.classList.contains("active")) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          selectedIndex = Math.min(
            selectedIndex + 1,
            currentSuggestions.length - 1,
          );
          renderSuggestions();
          scrollSelectedIntoView();
          return true;
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          renderSuggestions();
          scrollSelectedIntoView();
          return true;
        } else if (event.key === "Escape") {
          event.preventDefault();
          hideSuggestions();
          return true;
        } else if (event.key === "Tab" && selectedIndex >= 0) {
          event.preventDefault();
          selectSuggestion(selectedIndex);
          return true;
        }
      }

      // Handle Enter key - if a suggestion is selected, use it
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        // If a suggestion is selected, select it and send
        if (
          suggestionsDropdown.classList.contains("active") &&
          selectedIndex >= 0
        ) {
          selectSuggestion(selectedIndex);
          handleSend();
        } else {
          handleSend();
        }
        return true;
      }

      // Handle Shift+Enter for new line
      if (event.key === "Enter" && event.shiftKey) {
        // Let TipTap handle this naturally
        return false;
      }

      return false;
    },
  },
});

// Handle input changes
editor.on("update", () => {
  const text = editor.getText().trim();

  // Update character count
  charCount.textContent = text.length.toString();

  // Clear selected URL when user types (modifies the content)
  selectedUrl = null;

  // Check if content has line breaks (multiline) using TipTap's JSON structure
  const json = editor.getJSON();
  let hasLineBreaks = false;

  // Check if there are hard breaks in the content
  const checkForBreaks = (node: {
    type?: string;
    content?: unknown[];
  }): boolean => {
    if (node.type === "hardBreak") return true;
    if (node.content && Array.isArray(node.content)) {
      return node.content.some((child) =>
        checkForBreaks(child as { type?: string; content?: unknown[] }),
      );
    }
    return false;
  };

  // Check for multiple paragraphs or hard breaks within content
  if (json.content && json.content.length > 1) {
    hasLineBreaks = true;
  } else if (json.content && json.content[0]) {
    hasLineBreaks = checkForBreaks(json.content[0]);
  }

  const editorElement = document.querySelector(".ProseMirror") as HTMLElement;
  if (hasLineBreaks) {
    editorElement.classList.add("multiline");
  } else {
    editorElement.classList.remove("multiline");
  }

  // Hide suggestions when in multiline mode
  if (hasLineBreaks) {
    hideSuggestions();
  } else if (text !== lastQuery) {
    lastQuery = text;
    if (text) {
      currentSuggestions = filterSuggestions(text);
      if (currentSuggestions.length > 0) {
        renderSuggestions();
      } else {
        hideSuggestions();
      }
    } else {
      hideSuggestions();
    }
  }
});

function isURL(str: string): boolean {
  try {
    const pattern =
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    return pattern.test(str);
  } catch {
    return false;
  }
}

function filterSuggestions(query: string): SuggestionItem[] {
  if (!query) {
    // Show top visited sites when empty
    return processedSuggestions.slice(0, 6);
  }

  const lowerQuery = query.toLowerCase();

  const filtered = processedSuggestions.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(lowerQuery);
    const urlMatch = item.url && item.url.toLowerCase().includes(lowerQuery);
    return titleMatch || urlMatch;
  });

  // Add direct navigation option if it looks like a URL
  if (isURL(query) || query.includes(".")) {
    filtered.unshift({
      title: query,
      url: query.startsWith("http") ? query : `https://${query}`,
      type: "navigate",
      faviconUrl: getFaviconUrl(
        query.startsWith("http") ? query : `https://${query}`,
      ),
    });
  }

  // Add search option if no perfect URL match
  if (!isURL(query)) {
    filtered.push({
      title: `Search for "${query}"`,
      url: null,
      type: "search",
      icon: "🔍",
    });
  }

  return filtered.slice(0, 8);
}

function renderSuggestions(): void {
  if (currentSuggestions.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsDropdown.innerHTML = currentSuggestions
    .map((item, index) => {
      // Use favicon if available, otherwise fall back to icon or default
      const iconContent = item.faviconUrl
        ? `<img src="${item.faviconUrl}" alt="" class="suggestion-favicon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span class="suggestion-icon" style="display:none;">${item.icon || "🌐"}</span>`
        : `<span class="suggestion-icon">${item.icon || "🌐"}</span>`;

      return `
        <div class="suggestion-item ${index === selectedIndex ? "selected" : ""}" data-index="${index}">
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

  suggestionsDropdown.classList.add("active");
}

function hideSuggestions(): void {
  suggestionsDropdown.classList.remove("active");
  selectedIndex = -1;
  currentSuggestions = [];
}

function scrollSelectedIntoView(): void {
  if (selectedIndex >= 0) {
    const selectedElement = suggestionsDropdown.querySelector(
      `.suggestion-item[data-index="${selectedIndex}"]`,
    ) as HTMLElement;

    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }
}

function selectSuggestion(index: number): void {
  if (index >= 0 && index < currentSuggestions.length) {
    const suggestion = currentSuggestions[index];

    // For search suggestions, don't change the input text
    if (suggestion.type === "search") {
      // Don't store URL or change content for search suggestions
      // Just let the current text be used
      selectedUrl = null;
    } else {
      // Store the selected URL for the action log
      selectedUrl = suggestion.url;

      // Replace editor content with the suggestion
      if (suggestion.url) {
        editor.commands.setContent(suggestion.url);
      } else {
        editor.commands.setContent(suggestion.title);
      }
    }

    hideSuggestions();
    editor.commands.focus();
  }
}

function showToast(text: string): void {
  let actionType = "search";
  let actionText = `Searching for "${text}"...`;
  let faviconUrl = "";

  if (isURL(text) || text.includes(".com") || text.includes(".org")) {
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

  // Add to container
  toastContainer.appendChild(toastDiv);

  // Fade out older toasts
  const allToasts = toastContainer.querySelectorAll(".toast-item");
  allToasts.forEach((toast, index) => {
    if (index > 2) {
      // Remove toasts beyond the third one
      (toast as HTMLElement).classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    } else if (index > 0) {
      // Slightly fade older visible toasts
      (toast as HTMLElement).style.opacity = Math.max(
        0.7,
        1 - index * 0.15,
      ).toString();
    }
  });

  // Auto-remove this toast after 2.5 seconds
  setTimeout(() => {
    toastDiv.classList.add("fade-out");
    setTimeout(() => toastDiv.remove(), 300);
  }, 2500);
}

function handleSend(): void {
  const text = editor.getText().trim();

  if (!text) return;

  // Use the selected URL if available, otherwise use the typed text
  const actionText = selectedUrl || text;

  // Show toast notification
  showToast(actionText);

  // Clear the selected URL for next input
  selectedUrl = null;

  // Clear the editor
  editor.commands.clearContent();
  hideSuggestions();

  // Focus back on editor
  editor.commands.focus();
}

// Send button click handler
sendButton.addEventListener("click", () => {
  handleSend();
});

// Click handler for suggestions
suggestionsDropdown.addEventListener("click", (e) => {
  const item = (e.target as HTMLElement).closest(
    ".suggestion-item",
  ) as HTMLElement;
  if (item) {
    const index = parseInt(item.dataset.index!);
    selectSuggestion(index);

    // Blur the editor to dismiss keyboard on mobile
    editor.commands.blur();

    // Small delay to ensure keyboard dismisses before sending
    setTimeout(() => {
      handleSend();
      // Refocus after a moment for desktop users
      setTimeout(() => editor.commands.focus(), 100);
    }, 50);
  }
});

// Focus on editor when clicking the input container
const inputContainer = document.querySelector(".input-container");
inputContainer?.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest(".suggestions-dropdown")) return;
  editor.commands.focus();
});

// Handle focus on other controls within the wrapper
const inputWrapper = document.querySelector(".input-wrapper");
inputWrapper?.addEventListener("focusin", (e) => {
  const target = e.target as HTMLElement;
  // If focus is on a control button but not the editor, keep suggestions if they were visible
  if (
    !target.closest("#editor") &&
    suggestionsDropdown.classList.contains("active")
  ) {
    // Suggestions stay open
  }
});

// Developer button toggle
let devMode = false;
devButton.addEventListener("click", () => {
  devMode = !devMode;
  charCount.style.display = devMode ? "block" : "none";
  devButton.classList.toggle("active", devMode);
});

// Handle focus/blur for suggestions
editor.on("focus", () => {
  const text = editor.getText().trim();
  // Show suggestions on focus if there's text and not multiline
  const json = editor.getJSON();
  let hasLineBreaks = false;

  const checkForBreaks = (node: {
    type?: string;
    content?: unknown[];
  }): boolean => {
    if (node.type === "hardBreak") return true;
    if (node.content && Array.isArray(node.content)) {
      return node.content.some((child) =>
        checkForBreaks(child as { type?: string; content?: unknown[] }),
      );
    }
    return false;
  };

  if (json.content && json.content.length > 1) {
    hasLineBreaks = true;
  } else if (json.content && json.content[0]) {
    hasLineBreaks = checkForBreaks(json.content[0]);
  }

  if (!hasLineBreaks && text) {
    currentSuggestions = filterSuggestions(text);
    if (currentSuggestions.length > 0) {
      renderSuggestions();
    }
  }
});

editor.on("blur", () => {
  // Delay to check where focus went
  setTimeout(() => {
    const activeElement = document.activeElement as HTMLElement;
    const focusInWrapper = activeElement?.closest(".input-wrapper");
    const hoveringOnSuggestions = suggestionsDropdown.matches(":hover");

    // Only hide if focus left the input wrapper entirely
    if (!focusInWrapper && !hoveringOnSuggestions) {
      hideSuggestions();
    }
  }, 100);
});

// Click outside handler
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const isInputWrapper = target.closest(".input-wrapper");
  const isSuggestion = target.closest(".suggestions-dropdown");

  if (!isInputWrapper && !isSuggestion) {
    hideSuggestions();
  }
});

// Initial focus
editor.commands.focus();
