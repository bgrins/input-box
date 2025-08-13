import type { TabItem, SuggestionItem } from "../types";
import { EditorManager, ToastManager } from "../managers";
import { SettingsManager } from "../ui";
import { switchProfile } from "../data";
import { CommandMenuElement } from "../components/command-menu";
import { SuggestionsDropdown } from "../components/suggestions-dropdown";
import { PillsContainer } from "../components/pills-container";
import "../components/command-menu"; // Register the custom element
import "../components/suggestions-dropdown"; // Register the custom element
import "../components/pills-container"; // Register the custom element

export class App {
  private editorManager: EditorManager;
  private suggestionsDropdown: SuggestionsDropdown;
  private toastManager: ToastManager;
  private pillsContainer: PillsContainer;
  private commandMenu: CommandMenuElement;
  private settingsManager: SettingsManager;

  // State
  private lastQuery = "";
  private selectedUrl: string | null = null;
  private devMode = false;
  private isCommandMode = false;

  // UI Elements
  private sendButton: HTMLButtonElement;
  private charCount: HTMLSpanElement;
  private devButton: HTMLButtonElement;

  constructor() {
    // Initialize UI elements
    this.sendButton = document.getElementById("send-btn") as HTMLButtonElement;
    this.charCount = document.getElementById("char-count") as HTMLSpanElement;
    this.devButton = document.getElementById("dev-btn") as HTMLButtonElement;

    // Initialize managers
    const editorElement = document.querySelector("#editor") as HTMLElement;
    this.editorManager = new EditorManager(editorElement);
    this.toastManager = new ToastManager("toast-container");

    // Replace the pills container with our lit component
    const oldPillsContainer = document.getElementById("pills-container");
    this.pillsContainer = document.createElement("pills-container");
    if (oldPillsContainer && oldPillsContainer.parentElement) {
      oldPillsContainer.parentElement.replaceChild(
        this.pillsContainer,
        oldPillsContainer,
      );
    }

    // Replace the suggestions div with our lit component
    const oldSuggestions = document.getElementById("suggestions");
    this.suggestionsDropdown = document.createElement("suggestions-dropdown");
    if (oldSuggestions && oldSuggestions.parentElement) {
      oldSuggestions.parentElement.replaceChild(
        this.suggestionsDropdown,
        oldSuggestions,
      );
    }

    // Create and append the lit command menu
    this.commandMenu = document.createElement("command-menu");
    document.body.appendChild(this.commandMenu);

    this.settingsManager = new SettingsManager();

    this.setupEventHandlers();
    this.loadInitialProfile();
    this.editorManager.focus();
  }

  private loadInitialProfile(): void {
    const savedProfile = this.settingsManager.getCurrentProfile();
    if (savedProfile !== "anna") {
      switchProfile(savedProfile);
      this.suggestionsDropdown.refreshData();
    }

    this.settingsManager.setOnProfileChange((profile) => {
      switchProfile(profile);
      this.suggestionsDropdown.refreshData();
      this.suggestionsDropdown.hide();

      // Trigger a new search if there's text
      const text = this.editorManager.getText();
      if (text && !text.startsWith("@")) {
        this.lastQuery = text;
        if (text) {
          this.suggestionsDropdown.show(text);
        }
      }
    });
  }

  private setupEventHandlers(): void {
    // Editor keyboard handler
    this.editorManager.setKeyboardHandler((_view, event) =>
      this.handleKeyDown(event),
    );

    // Editor update handler
    this.editorManager.on("update", () => this.handleEditorUpdate());
    this.editorManager.on("focus", () => this.handleEditorFocus());
    this.editorManager.on("blur", () => this.handleEditorBlur());

    // Command menu handlers
    this.setupCommandMenuHandlers();

    // UI event handlers
    this.sendButton.addEventListener("click", () => this.handleSend());
    this.devButton.addEventListener("click", () => this.toggleDevMode());

    // Suggestions click handler
    this.suggestionsDropdown.setOnSelect((item, index) => {
      this.selectSuggestion(index);
      this.handleSend();
    });

    // Global click handler
    document.addEventListener("click", (e) => this.handleGlobalClick(e));

    // Input container click handler
    const inputContainer = document.querySelector(".input-container");
    inputContainer?.addEventListener("click", (e) => {
      if (!(e.target as HTMLElement).closest("suggestions-dropdown")) {
        this.editorManager.focus();
      }
    });
  }

  private setupCommandMenuHandlers(): void {
    this.commandMenu.setCallbacks(
      (command, data) => {
        if (command === "complete-tabs") {
          this.completeCommand("tabs");
        } else if (command === "complete-history") {
          this.completeCommand("history");
        } else if (command === "complete-bookmarks") {
          this.completeCommand("bookmarks");
        } else if ((command === "history" || command === "bookmarks") && data) {
          const item = data as SuggestionItem;
          this.pillsContainer.addPill(item);
          this.clearCommand();
          this.isCommandMode = false;
          this.suggestionsDropdown.unblur();
        }
      },
      (command, items, toRemove) => {
        // Remove unchecked pills
        if (toRemove && toRemove.length > 0) {
          toRemove.forEach((id) => {
            this.pillsContainer.removePill(id);
          });
        }

        // Add selected items as pills
        if (items.length > 0) {
          items.forEach((item) => {
            if ("id" in item && !this.pillsContainer.hasPill(item.id)) {
              this.pillsContainer.addPill(item);
            } else if (!("id" in item)) {
              this.pillsContainer.addPill(item);
            }
          });
        }

        // Clear the command text if we made changes
        if (items.length > 0 || (toRemove && toRemove.length > 0)) {
          this.clearCommand();
          this.isCommandMode = false;
          this.suggestionsDropdown.unblur();
        }
      },
    );
  }

  private handleKeyDown(event: KeyboardEvent): boolean {
    // Handle Shift+Tab to focus settings
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
    if (this.commandMenu.handleKeyDown(event)) {
      return true;
    }

    // Don't show URL suggestions in command mode
    if (this.isCommandMode) {
      if (event.key === "Escape") {
        this.isCommandMode = false;
        this.commandMenu.hide();
        this.suggestionsDropdown.unblur();
        return true;
      }
      return false;
    }

    // Handle arrow keys for URL suggestions
    if (this.suggestionsDropdown.active) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.suggestionsDropdown.selectNext();
        return true;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        this.suggestionsDropdown.selectPrevious();
        return true;
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.suggestionsDropdown.hide();
        return true;
      } else if (
        event.key === "Tab" &&
        this.suggestionsDropdown.getSelectedIndex() >= 0
      ) {
        event.preventDefault();
        this.selectSuggestion(this.suggestionsDropdown.getSelectedIndex());
        return true;
      }
    }

    // Handle Enter key
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (
        this.suggestionsDropdown.active &&
        this.suggestionsDropdown.getSelectedIndex() >= 0
      ) {
        this.selectSuggestion(this.suggestionsDropdown.getSelectedIndex());
        this.handleSend();
      } else {
        this.handleSend();
      }
      return true;
    }

    // Handle Shift+Enter for new line
    if (event.key === "Enter" && event.shiftKey) {
      return false;
    }

    return false;
  }

  private handleEditorUpdate(): void {
    const text = this.editorManager.getText();
    const textBeforeCursor = this.editorManager.getTextBeforeCursor();

    // Update character count
    this.charCount.textContent = text.length.toString();

    // Check for @ command
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      this.isCommandMode = true;
      const query = atMatch[1].toLowerCase();

      if (query === "") {
        this.commandMenu.show(null, [], "");
      } else if (query === "tabs") {
        const existingPillIds = this.pillsContainer
          .getPills()
          .filter((p): p is TabItem => "id" in p)
          .map((p) => p.id);
        this.commandMenu.show("tabs", existingPillIds);
      } else if (query === "history") {
        this.commandMenu.show("history");
      } else if (query === "bookmarks") {
        this.commandMenu.show("bookmarks");
      } else {
        if (
          this.commandMenu.currentCommand !== "tabs" &&
          this.commandMenu.currentCommand !== "history" &&
          this.commandMenu.currentCommand !== "bookmarks"
        ) {
          this.commandMenu.show(null, [], query);
        }
      }

      this.suggestionsDropdown.blur();
      return;
    } else {
      this.commandMenu.hide();
      this.isCommandMode = false;
      this.suggestionsDropdown.unblur();
    }

    // Clear selected URL when user types
    this.selectedUrl = null;

    // Update editor styling for multiline
    const hasLineBreaks = this.editorManager.hasLineBreaks();
    const editorElement = document.querySelector(".ProseMirror") as HTMLElement;
    if (hasLineBreaks) {
      editorElement.classList.add("multiline");
    } else {
      editorElement.classList.remove("multiline");
    }

    // Show suggestions if not multiline
    if (hasLineBreaks) {
      this.suggestionsDropdown.hide();
    } else if (text !== this.lastQuery && !this.isCommandMode) {
      this.lastQuery = text;
      if (text) {
        this.suggestionsDropdown.show(text);
      } else {
        this.suggestionsDropdown.hide();
      }
    }
  }

  private handleEditorFocus(): void {
    const text = this.editorManager.getText();
    const hasLineBreaks = this.editorManager.hasLineBreaks();

    if (!hasLineBreaks && text && !this.isCommandMode) {
      this.suggestionsDropdown.show(text);
    }
  }

  private handleEditorBlur(): void {
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      const focusInWrapper = activeElement?.closest(".input-wrapper");
      const suggestionsElement = document.getElementById("suggestions");
      const hoveringOnSuggestions = suggestionsElement?.matches(":hover");

      if (!focusInWrapper && !hoveringOnSuggestions) {
        this.suggestionsDropdown.hide();
      }
    }, 100);
  }

  private handleGlobalClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const isInputWrapper = target.closest(".input-wrapper");
    const isSuggestion = target.closest("suggestions-dropdown");
    const isCommandMenu = target.closest(".command-menu");

    if (!isInputWrapper && !isSuggestion && !isCommandMenu) {
      this.suggestionsDropdown.hide();
      this.commandMenu.hide();

      if (this.isCommandMode) {
        this.isCommandMode = false;
        this.suggestionsDropdown.unblur();
      }
    }
  }

  private completeCommand(command: string): void {
    const { from } = this.editorManager.getSelection();
    const text = this.editorManager.getTextBeforeCursor();
    const atMatch = text.match(/@(\w*)$/);

    if (atMatch && atMatch[1] !== command) {
      const deleteLength = atMatch[1].length;
      this.editorManager.deleteRange(from - deleteLength, from);
      this.editorManager.insertContent(command);
    }
  }

  private clearCommand(): void {
    const { from } = this.editorManager.getSelection();
    const text = this.editorManager.getTextBeforeCursor(15);
    const atMatch = text.match(/@(\w*)$/);

    if (atMatch) {
      const deleteLength = atMatch[0].length;
      this.editorManager.deleteRange(from - deleteLength, from);
    }
  }

  private selectSuggestion(index: number): void {
    // Set the selected index first
    this.suggestionsDropdown.selectedIndex = index;
    const suggestion = this.suggestionsDropdown.getSelected();
    if (!suggestion) return;

    if (suggestion.type === "search") {
      this.selectedUrl = null;
    } else {
      this.selectedUrl = suggestion.url;
      if (suggestion.url) {
        this.editorManager.setContent(suggestion.url);
      } else {
        this.editorManager.setContent(suggestion.title);
      }
    }

    this.suggestionsDropdown.hide();
    this.editorManager.focus();
  }

  private handleSend(): void {
    const text = this.editorManager.getText();
    const pills = this.pillsContainer.getPills();

    // Don't send if no text and no pills
    if (!text && pills.length === 0) return;

    // Show toast
    if (pills.length > 0) {
      this.toastManager.showWithPills(this.selectedUrl || text, pills.length);
    } else {
      const actionText = this.selectedUrl || text;
      this.toastManager.show(actionText);
    }

    this.selectedUrl = null;

    // Clear pills and editor
    this.pillsContainer.clear();
    this.editorManager.clearContent();
    this.suggestionsDropdown.hide();
    this.editorManager.focus();
  }

  private toggleDevMode(): void {
    this.devMode = !this.devMode;
    this.charCount.style.display = this.devMode ? "block" : "none";
    this.devButton.classList.toggle("active", this.devMode);
  }
}
