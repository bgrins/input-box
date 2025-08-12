import "./styles.css";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { PillManager } from "./ui/pills";
import { CommandMenu } from "./ui/command-menu";
import { SettingsManager } from "./ui/settings";
import { processHistoryData, getFaviconUrl, switchProfile } from "./data";
import type { SuggestionItem, TabItem } from "./types";

// Initialize data
let processedSuggestions = processHistoryData();

// Initialize UI components
const toastContainer = document.getElementById(
  "toast-container",
) as HTMLDivElement;
const suggestionsDropdown = document.getElementById(
  "suggestions",
) as HTMLDivElement;
const sendButton = document.getElementById("send-btn") as HTMLButtonElement;
const charCount = document.getElementById("char-count") as HTMLSpanElement;
const devButton = document.getElementById("dev-btn") as HTMLButtonElement;

// Initialize pill manager
const pillManager = new PillManager("pills-container");

// Initialize settings manager
const settingsManager = new SettingsManager();

// Load the initial profile if it's different from default
const savedProfile = settingsManager.getCurrentProfile();
if (savedProfile !== "anna") {
  switchProfile(savedProfile);
  processedSuggestions = processHistoryData();
}

settingsManager.setOnProfileChange((profile) => {
  // Switch profile data
  switchProfile(profile);

  // Refresh suggestions with new profile data
  processedSuggestions = processHistoryData();

  // Clear current suggestions
  hideSuggestions();

  // Trigger a new search if there's text
  const text = editor.getText();
  if (text && !text.startsWith("@")) {
    lastQuery = text;
    if (text) {
      currentSuggestions = filterSuggestions(text);
      if (currentSuggestions.length > 0) {
        renderSuggestions();
      } else {
        hideSuggestions();
      }
    }
  }
});

// State
let currentSuggestions: SuggestionItem[] = [];
let selectedIndex = -1;
let lastQuery = "";
let selectedUrl: string | null = null;
let devMode = false;
let isCommandMode = false;

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
      placeholder: "Type @ for commands, or search...",
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
      // Handle Shift+Tab to focus settings button
      if (event.key === "Tab" && event.shiftKey) {
        const settingsButton = document.querySelector(
          ".settings-button",
        ) as HTMLElement;
        if (settingsButton) {
          event.preventDefault();
          settingsButton.focus();
          return true;
        }
      }

      // Let command menu handle keys first
      if (commandMenu.handleKeyDown(event)) {
        return true;
      }

      // Don't show URL suggestions in command mode
      if (isCommandMode) {
        if (event.key === "Escape") {
          isCommandMode = false;
          commandMenu.hide();
          suggestionsDropdown.classList.remove("blurred");
          return true;
        }
        // Don't interfere with backspace - let it work normally
        return false;
      }

      // Handle arrow keys for URL suggestions
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

      // Handle Enter key
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
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
        return false;
      }

      return false;
    },
  },
});

// Initialize command menu
const commandMenu = new CommandMenu(editor);

// Set up command selection handler (for single selection - not used with checkboxes)
commandMenu.setOnSelect((command, data) => {
  if (command === "complete-tabs") {
    // Complete the text to @tabs when opening tabs menu
    const { from } = editor.state.selection;
    const text = editor.state.doc.textBetween(Math.max(0, from - 10), from);
    const atMatch = text.match(/@(\w*)$/);

    if (atMatch && atMatch[1] !== "tabs") {
      // Complete to @tabs
      const deleteLength = atMatch[1].length;
      editor
        .chain()
        .focus()
        .deleteRange({ from: from - deleteLength, to: from })
        .insertContent("tabs")
        .run();
    }

    // Note: CommandMenu will handle showing itself and getting existing pills
  } else if (command === "complete-history") {
    // Complete the text to @history when opening history menu
    const { from } = editor.state.selection;
    const text = editor.state.doc.textBetween(Math.max(0, from - 10), from);
    const atMatch = text.match(/@(\w*)$/);

    if (atMatch && atMatch[1] !== "history") {
      // Complete to @history
      const deleteLength = atMatch[1].length;
      editor
        .chain()
        .focus()
        .deleteRange({ from: from - deleteLength, to: from })
        .insertContent("history")
        .run();
    }
  } else if (command === "complete-bookmarks") {
    // Complete the text to @bookmarks when opening bookmarks menu
    const { from } = editor.state.selection;
    const text = editor.state.doc.textBetween(Math.max(0, from - 10), from);
    const atMatch = text.match(/@(\w*)$/);

    if (atMatch && atMatch[1] !== "bookmarks") {
      // Complete to @bookmarks
      const deleteLength = atMatch[1].length;
      editor
        .chain()
        .focus()
        .deleteRange({ from: from - deleteLength, to: from })
        .insertContent("bookmarks")
        .run();
    }
  } else if (command === "tabs" && data) {
    const tab = data as TabItem;
    pillManager.addPill(tab);

    // Clear the @tabs text from editor
    const { from } = editor.state.selection;
    const text = editor.state.doc.textBetween(Math.max(0, from - 6), from);

    if (text.includes("@tabs")) {
      const startPos = from - text.lastIndexOf("@tabs") - 5;
      editor.chain().focus().deleteRange({ from: startPos, to: from }).run();
    }

    isCommandMode = false;
    suggestionsDropdown.classList.remove("blurred");
  } else if ((command === "history" || command === "bookmarks") && data) {
    // Add history/bookmark item as a pill
    const item = data as SuggestionItem;
    pillManager.addPill(item);

    // Clear the @history or @bookmarks text from editor
    const { from } = editor.state.selection;
    const text = editor.state.doc.textBetween(Math.max(0, from - 15), from);
    const atMatch = text.match(/@(\w*)$/);

    if (atMatch) {
      // Delete the @history or @bookmarks text
      const deleteLength = atMatch[0].length;
      editor
        .chain()
        .focus()
        .deleteRange({ from: from - deleteLength, to: from })
        .run();
    }

    isCommandMode = false;
    suggestionsDropdown.classList.remove("blurred");
  }
});

// Set up apply handler for multiple selection
commandMenu.setOnApply((command, items, toRemove) => {
  // Remove unchecked pills
  if (toRemove && toRemove.length > 0) {
    toRemove.forEach((id) => {
      pillManager.removePill(id);
    });
  }

  // Add selected items as pills
  if (items.length > 0) {
    items.forEach((item) => {
      // For tabs, check if pill already exists
      if ("id" in item && !pillManager.hasPill(item.id)) {
        pillManager.addPill(item);
      } else if (!("id" in item)) {
        // For history/bookmarks, always add (they don't have stable IDs)
        pillManager.addPill(item);
      }
    });
  }

  // Clear the command text from editor only if we actually made changes
  if (items.length > 0 || (toRemove && toRemove.length > 0)) {
    const { from } = editor.state.selection;
    const text = editor.state.doc.textBetween(Math.max(0, from - 15), from);
    const commandPattern = `@${command}`;

    if (text.includes(commandPattern)) {
      const startPos =
        from - text.lastIndexOf(commandPattern) - commandPattern.length;
      editor.chain().focus().deleteRange({ from: startPos, to: from }).run();
    }

    isCommandMode = false;
    suggestionsDropdown.classList.remove("blurred");
  }
});

// Handle input changes
editor.on("update", ({ editor }) => {
  const text = editor.getText().trim();
  const { from } = editor.state.selection;

  // Update character count
  charCount.textContent = text.length.toString();

  // Check for @ command
  const textBeforeCursor = editor.state.doc.textBetween(
    Math.max(0, from - 10),
    from,
  );
  const atMatch = textBeforeCursor.match(/@(\w*)$/);

  if (atMatch) {
    isCommandMode = true;
    const query = atMatch[1].toLowerCase();

    if (query === "") {
      // Just typed @, show command menu
      commandMenu.show(null, [], "");
    } else if (query === "tabs") {
      // Show tabs menu when @tabs is fully typed
      const existingPillIds = pillManager
        .getPills()
        .filter((p): p is TabItem => "id" in p)
        .map((p) => p.id);
      commandMenu.show("tabs", existingPillIds);
    } else if (query === "history") {
      // Show history menu when @history is fully typed
      commandMenu.show("history");
    } else if (query === "bookmarks") {
      // Show bookmarks menu when @bookmarks is fully typed
      commandMenu.show("bookmarks");
    } else {
      // Keep command menu open while typing with filtering
      if (
        commandMenu.currentCommand !== "tabs" &&
        commandMenu.currentCommand !== "history" &&
        commandMenu.currentCommand !== "bookmarks"
      ) {
        commandMenu.show(null, [], query);
      }
    }

    // Don't hide suggestions, just blur them
    suggestionsDropdown.classList.add("blurred");
    return;
  } else {
    commandMenu.hide();
    isCommandMode = false;
    // Remove blur from suggestions
    suggestionsDropdown.classList.remove("blurred");
  }

  // Clear selected URL when user types
  selectedUrl = null;

  // Check if content has line breaks (multiline)
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

  const editorElement = document.querySelector(".ProseMirror") as HTMLElement;
  if (hasLineBreaks) {
    editorElement.classList.add("multiline");
  } else {
    editorElement.classList.remove("multiline");
  }

  // Hide suggestions when in multiline mode
  if (hasLineBreaks) {
    hideSuggestions();
  } else if (text !== lastQuery && !isCommandMode) {
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

// URL detection function
function isURL(str: string): boolean {
  try {
    const pattern =
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    return pattern.test(str);
  } catch {
    return false;
  }
}

// Filter suggestions
function filterSuggestions(query: string): SuggestionItem[] {
  if (!query) {
    return processedSuggestions.slice(0, 6);
  }

  const lowerQuery = query.toLowerCase();

  const filtered = processedSuggestions.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(lowerQuery);
    const urlMatch = item.url && item.url.toLowerCase().includes(lowerQuery);
    return titleMatch || urlMatch;
  });

  // Add direct navigation option
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

  // Add search option
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

// Render suggestions
function renderSuggestions(): void {
  if (currentSuggestions.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsDropdown.innerHTML = currentSuggestions
    .map((item, index) => {
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

// Hide suggestions
function hideSuggestions(): void {
  suggestionsDropdown.classList.remove("active");
  selectedIndex = -1;
  currentSuggestions = [];
}

// Scroll selected suggestion into view
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

// Select suggestion
function selectSuggestion(index: number): void {
  if (index >= 0 && index < currentSuggestions.length) {
    const suggestion = currentSuggestions[index];

    if (suggestion.type === "search") {
      selectedUrl = null;
    } else {
      selectedUrl = suggestion.url;
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

// Show toast notification
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
  toastContainer.appendChild(toastDiv);

  // Fade out older toasts
  const allToasts = toastContainer.querySelectorAll(".toast-item");
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

// Handle send
function handleSend(): void {
  const text = editor.getText().trim();
  const pills = pillManager.getPills();

  // Don't send if no text and no pills
  if (!text && pills.length === 0) return;

  // Include pill information in the toast if pills exist
  if (pills.length > 0) {
    const pillInfo = `with ${pills.length} tab${pills.length !== 1 ? "s" : ""}`;
    const actionText = selectedUrl || text || "Message";
    showToast(`${actionText} ${pillInfo}`);
  } else {
    const actionText = selectedUrl || text;
    showToast(actionText);
  }

  selectedUrl = null;

  // Clear pills after sending
  pillManager.clear();

  editor.commands.clearContent();
  hideSuggestions();
  editor.commands.focus();
}

// Event listeners
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
    handleSend();
  }
});

// Focus on editor when clicking input container
const inputContainer = document.querySelector(".input-container");
inputContainer?.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest(".suggestions-dropdown")) return;
  editor.commands.focus();
});

// Handle focus on other controls within wrapper
const inputWrapper = document.querySelector(".input-wrapper");
inputWrapper?.addEventListener("focusin", (e) => {
  const target = e.target as HTMLElement;
  if (
    !target.closest("#editor") &&
    suggestionsDropdown.classList.contains("active")
  ) {
    // Suggestions stay open
  }
});

// Developer button toggle
devButton.addEventListener("click", () => {
  devMode = !devMode;
  charCount.style.display = devMode ? "block" : "none";
  devButton.classList.toggle("active", devMode);
});

// Handle focus/blur for suggestions
editor.on("focus", () => {
  const text = editor.getText().trim();
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

  if (!hasLineBreaks && text && !isCommandMode) {
    currentSuggestions = filterSuggestions(text);
    if (currentSuggestions.length > 0) {
      renderSuggestions();
    }
  }
});

editor.on("blur", () => {
  setTimeout(() => {
    const activeElement = document.activeElement as HTMLElement;
    const focusInWrapper = activeElement?.closest(".input-wrapper");
    const hoveringOnSuggestions = suggestionsDropdown.matches(":hover");

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
  const isCommandMenu = target.closest(".command-menu");

  if (!isInputWrapper && !isSuggestion && !isCommandMenu) {
    hideSuggestions();
    commandMenu.hide();

    if (isCommandMode) {
      isCommandMode = false;
      suggestionsDropdown.classList.remove("blurred");
    }
  }
});

// Initial focus
editor.commands.focus();
