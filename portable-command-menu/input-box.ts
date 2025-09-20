import { LitElement, html, css } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import "./command-menu";
import "./pills-container";
import "./suggestions-dropdown";
import type { CommandMenuElement } from "./command-menu";
import type { PillsContainer } from "./pills-container";
import type { SuggestionsDropdown } from "./suggestions-dropdown";
import type { TabItem, SuggestionItem, CommandType } from "./types";

export interface InputBoxConfig {
  placeholder?: string;
  dataProvider?: {
    getTabs?: () => TabItem[];
    getHistory?: () => SuggestionItem[];
    getBookmarks?: () => SuggestionItem[];
    getSuggestions?: (query: string) => SuggestionItem[];
  };
  onSubmit?: (text: string, pills: (TabItem | SuggestionItem)[]) => void;
}

@customElement("input-box")
export class InputBox extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      background: white;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .input-wrapper {
      position: relative;
      background: white;
      border-radius: 20px;
    }

    .editor-container {
      position: relative;
      min-height: 56px;
      padding: 16px;
      padding-right: 120px;
    }

    /* TipTap editor styles */
    .ProseMirror {
      outline: none;
      min-height: 24px;
      max-height: 120px;
      overflow-y: auto;
      font-size: 16px;
      line-height: 1.5;
      color: #1f2937;
    }

    .ProseMirror p {
      margin: 0;
    }

    .ProseMirror p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: #9ca3af;
      pointer-events: none;
      height: 0;
    }

    .ProseMirror.multiline {
      white-space: pre-wrap;
    }

    .toolbar {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .toolbar-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 16px;
      color: #6b7280;
    }

    .toolbar-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .toolbar-btn:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.5);
    }

    .send-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0 16px;
      width: auto;
      font-size: 14px;
      font-weight: 500;
    }

    .send-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .attachment-buttons {
      display: flex;
      gap: 4px;
      padding: 0 16px 12px;
    }

    .attachment-btn {
      padding: 6px 12px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      background: white;
      cursor: pointer;
      font-size: 13px;
      color: #6b7280;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .attachment-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .attachment-btn:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.5);
    }

    .char-count {
      position: absolute;
      bottom: 4px;
      right: 16px;
      font-size: 11px;
      color: #9ca3af;
      display: none;
    }

    :host([dev-mode]) .char-count {
      display: block;
    }
  `;

  @property({ type: Object })
  config: InputBoxConfig = {};

  @property({ type: Boolean, reflect: true, attribute: "dev-mode" })
  devMode = false;

  @state()
  private isCommandMode = false;

  @state()
  private lastQuery = "";

  @state()
  private charCount = 0;

  @query("#editor")
  private editorElement!: HTMLElement;

  @query("command-menu")
  private commandMenu!: CommandMenuElement;

  @query("pills-container")
  private pillsContainer!: PillsContainer;

  @query("suggestions-dropdown")
  private suggestionsDropdown!: SuggestionsDropdown;

  private editor?: Editor;
  private selectedUrl: string | null = null;

  override firstUpdated() {
    this.initializeEditor();
    this.setupCommandMenu();
    this.setupSuggestions();
  }

  private initializeEditor() {
    this.editor = new Editor({
      element: this.editorElement,
      extensions: [
        StarterKit.configure({
          hardBreak: {
            keepMarks: false,
          },
        }),
        Placeholder.configure({
          placeholder: this.config.placeholder || "Type @ for commands, or search...",
        }),
        Link.configure({
          openOnClick: false,
        }),
      ],
      content: "",
      autofocus: true,
      onUpdate: () => this.handleEditorUpdate(),
      onFocus: () => this.handleEditorFocus(),
      onBlur: () => this.handleEditorBlur(),
      editorProps: {
        handleKeyDown: (view, event) => this.handleKeyDown(event),
        attributes: {
          class: "prose prose-sm focus:outline-none",
        },
      },
    });
  }

  private setupCommandMenu() {
    if (this.config.dataProvider) {
      this.commandMenu.setDataProvider(this.config.dataProvider);
    }

    this.commandMenu.setCallbacks(
      (command, data) => this.handleCommandSelect(command, data),
      (command, items, toRemove) => this.handleCommandApply(command, items, toRemove)
    );
  }

  private setupSuggestions() {
    if (this.config.dataProvider) {
      this.suggestionsDropdown.setDataProvider(this.config.dataProvider);
    }

    this.suggestionsDropdown.setOnSelect((item, index) => {
      this.selectSuggestion(index);
      this.handleSend();
    });
  }

  private handleKeyDown(event: KeyboardEvent): boolean {
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
      } else if (event.key === "Tab" && this.suggestionsDropdown.getSelectedIndex() >= 0) {
        event.preventDefault();
        this.selectSuggestion(this.suggestionsDropdown.getSelectedIndex());
        return true;
      }
    }

    // Handle Enter key
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (this.suggestionsDropdown.active && this.suggestionsDropdown.getSelectedIndex() >= 0) {
        this.selectSuggestion(this.suggestionsDropdown.getSelectedIndex());
      }
      this.handleSend();
      return true;
    }

    return false;
  }

  private handleEditorUpdate() {
    if (!this.editor) return;

    const text = this.editor.getText().trim();
    const textBeforeCursor = this.getTextBeforeCursor();

    // Update character count
    this.charCount = text.length;

    // Check for @ command
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      this.isCommandMode = true;
      const query = atMatch[1].toLowerCase();

      if (query === "") {
        this.commandMenu.show(null, [], "");
      } else if (query === "tabs") {
        const existingPillIds = this.pillsContainer.getPills()
          .filter((p): p is TabItem => "id" in p)
          .map(p => p.id);
        this.commandMenu.show("tabs", existingPillIds);
      } else if (query === "history") {
        this.commandMenu.show("history");
      } else if (query === "bookmarks") {
        this.commandMenu.show("bookmarks");
      } else {
        this.commandMenu.show(null, [], query);
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
    const hasLineBreaks = this.hasLineBreaks();
    if (hasLineBreaks) {
      this.editorElement.classList.add("multiline");
      this.suggestionsDropdown.hide();
    } else {
      this.editorElement.classList.remove("multiline");
      if (text !== this.lastQuery && !this.isCommandMode) {
        this.lastQuery = text;
        if (text) {
          this.suggestionsDropdown.show(text);
        } else {
          this.suggestionsDropdown.hide();
        }
      }
    }
  }

  private handleEditorFocus() {
    if (!this.editor) return;
    const text = this.editor.getText().trim();
    const hasLineBreaks = this.hasLineBreaks();

    if (!hasLineBreaks && text && !this.isCommandMode) {
      this.suggestionsDropdown.show(text);
    }
  }

  private handleEditorBlur() {
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      const focusInWrapper = activeElement?.closest("input-box");
      const hoveringOnSuggestions = this.suggestionsDropdown?.matches(":hover");

      if (!focusInWrapper && !hoveringOnSuggestions) {
        this.suggestionsDropdown.hide();
      }
    }, 100);
  }

  private handleCommandSelect(command: CommandType, data: TabItem | SuggestionItem | null) {
    if (command === "complete-tabs") {
      this.completeCommand("tabs");
    } else if (command === "complete-history") {
      this.completeCommand("history");
    } else if (command === "complete-bookmarks") {
      this.completeCommand("bookmarks");
    } else if ((command === "history" || command === "bookmarks") && data) {
      this.pillsContainer.addPill(data);
      this.clearCommand();
      this.isCommandMode = false;
      this.suggestionsDropdown.unblur();
    }
  }

  private handleCommandApply(_command: CommandType, items: (TabItem | SuggestionItem)[], toRemove: string[]) {
    // Remove unchecked pills
    if (toRemove && toRemove.length > 0) {
      toRemove.forEach(id => {
        this.pillsContainer.removePill(id);
      });
    }

    // Add selected items as pills
    if (items.length > 0) {
      items.forEach(item => {
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
  }

  private completeCommand(command: string) {
    if (!this.editor) return;
    const { from } = this.editor.state.selection;
    const text = this.getTextBeforeCursor();
    const atMatch = text.match(/@(\w*)$/);

    if (atMatch && atMatch[1] !== command) {
      const deleteLength = atMatch[1].length;
      this.editor.chain()
        .focus()
        .deleteRange({ from: from - deleteLength, to: from })
        .insertContent(command)
        .run();
    }
  }

  private clearCommand() {
    if (!this.editor) return;
    const { from } = this.editor.state.selection;
    const text = this.getTextBeforeCursor(15);
    const atMatch = text.match(/@(\w*)$/);

    if (atMatch) {
      const deleteLength = atMatch[0].length;
      this.editor.chain()
        .focus()
        .deleteRange({ from: from - deleteLength, to: from })
        .run();
    }
  }

  private selectSuggestion(index: number) {
    this.suggestionsDropdown.selectedIndex = index;
    const suggestion = this.suggestionsDropdown.getSelected();
    if (!suggestion || !this.editor) return;

    if (suggestion.type === "search") {
      this.selectedUrl = null;
    } else {
      this.selectedUrl = suggestion.url;
      if (suggestion.url) {
        this.editor.commands.setContent(suggestion.url);
      } else {
        this.editor.commands.setContent(suggestion.title);
      }
    }

    this.suggestionsDropdown.hide();
    this.editor.commands.focus();
  }

  private handleSend() {
    if (!this.editor) return;
    
    const text = this.editor.getText().trim();
    const pills = this.pillsContainer.getPills();

    // Don't send if no text and no pills
    if (!text && pills.length === 0) return;

    // Call the onSubmit callback
    if (this.config.onSubmit) {
      this.config.onSubmit(this.selectedUrl || text, pills);
    }

    // Clear everything
    this.selectedUrl = null;
    this.pillsContainer.clear();
    this.editor.commands.clearContent();
    this.suggestionsDropdown.hide();
    this.editor.commands.focus();
  }

  private getTextBeforeCursor(maxLength?: number): string {
    if (!this.editor) return "";
    const { from } = this.editor.state.selection;
    const text = this.editor.state.doc.textContent;
    const start = maxLength ? Math.max(0, from - maxLength) : 0;
    return text.slice(start, from);
  }

  private hasLineBreaks(): boolean {
    if (!this.editor) return false;
    const json = this.editor.getJSON();
    
    const checkForBreaks = (node: any): boolean => {
      if (node.type === "hardBreak") return true;
      if (node.content && Array.isArray(node.content)) {
        return node.content.some((child: any) => checkForBreaks(child));
      }
      return false;
    };

    return checkForBreaks(json);
  }

  private showTabsMenu() {
    const existingPillIds = this.pillsContainer.getPills()
      .filter((p): p is TabItem => "id" in p)
      .map(p => p.id);
    this.commandMenu.show("tabs", existingPillIds, "", this.shadowRoot?.querySelector("#tabs-btn") as HTMLElement);
  }

  private showHistoryMenu() {
    this.commandMenu.show("history", [], "", this.shadowRoot?.querySelector("#history-btn") as HTMLElement);
  }

  private showBookmarksMenu() {
    this.commandMenu.show("bookmarks", [], "", this.shadowRoot?.querySelector("#bookmarks-btn") as HTMLElement);
  }

  private toggleDevMode() {
    this.devMode = !this.devMode;
  }

  override render() {
    return html`
      <div class="input-wrapper">
        <pills-container></pills-container>
        
        <div class="editor-container">
          <div id="editor"></div>
          
          <div class="toolbar">
            <button
              id="tabs-btn"
              class="toolbar-btn"
              @click=${this.showTabsMenu}
              title="Add tabs"
            >📑</button>
            <button
              id="history-btn"
              class="toolbar-btn"
              @click=${this.showHistoryMenu}
              title="Add from history"
            >📚</button>
            <button
              id="bookmarks-btn"
              class="toolbar-btn"
              @click=${this.showBookmarksMenu}
              title="Add bookmarks"
            >⭐</button>
            <button
              class="toolbar-btn ${this.devMode ? 'active' : ''}"
              @click=${this.toggleDevMode}
              title="Dev mode"
            >🛠</button>
            <button
              class="toolbar-btn send-btn"
              @click=${this.handleSend}
            >Send</button>
          </div>
        </div>

        <div class="attachment-buttons">
          <button class="attachment-btn" @click=${this.showTabsMenu}>
            <span>📑</span> Tabs
          </button>
          <button class="attachment-btn" @click=${this.showHistoryMenu}>
            <span>📚</span> History
          </button>
          <button class="attachment-btn" @click=${this.showBookmarksMenu}>
            <span>⭐</span> Bookmarks
          </button>
        </div>

        <div class="char-count">${this.charCount}</div>

        <suggestions-dropdown></suggestions-dropdown>
      </div>
      
      <command-menu></command-menu>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "input-box": InputBox;
  }
}