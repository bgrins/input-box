import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { PillManager } from "./ui/pills";
import { CommandMenu } from "./ui/command-menu";

// Initialize pill manager
const pillManager = new PillManager("pills-container");

// Initialize editor
const editor = new Editor({
  element: document.querySelector("#editor") as HTMLElement,
  extensions: [
    StarterKit,
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
    handleKeyDown: (_view, event) => {
      // Handle @ command detection
      if (commandMenu.handleKeyDown(event)) {
        return true;
      }

      // Your existing keyboard handlers...
      return false;
    },
  },
});

// Initialize command menu
const commandMenu = new CommandMenu(editor);

// Set up command selection handler
commandMenu.setOnSelect((command, data) => {
  if (command === "tabs" && data) {
    // Add tab as a pill
    const tab = data;
    pillManager.addPill(tab);

    // Replace @tabs text in editor with the tab title
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from - 5, from);
    if (text.includes("@tabs")) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: from - 5, to })
        .insertContent(tab.title)
        .run();
    }
  }
});

// Handle @ detection in editor
editor.on("update", ({ editor }) => {
  const { from } = editor.state.selection;
  const text = editor.state.doc.textBetween(Math.max(0, from - 10), from);

  // Check for @ trigger
  const atMatch = text.match(/@(\w*)$/);
  if (atMatch) {
    const query = atMatch[1];

    if (query === "") {
      // Just typed @, show command menu
      commandMenu.show();
    } else if (query === "tabs") {
      // Show tabs selection
      commandMenu.show("tabs");
    } else if (!["history", "bookmarks"].includes(query)) {
      // Hide if not a valid command
      commandMenu.hide();
    }
  } else {
    commandMenu.hide();
  }
});

// Example: Add some tabs on load to demonstrate
window.addEventListener("DOMContentLoaded", () => {
  // You could auto-add some tabs here for testing
  // const mockTabs = getMockTabs();
  // pillManager.addPill(mockTabs[0]); // Example
});

export { editor, pillManager, commandMenu };
