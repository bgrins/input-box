import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";

export class EditorManager {
  private editor: Editor;

  constructor(element: HTMLElement) {
    this.editor = new Editor({
      element,
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
      },
    });
  }

  getEditor(): Editor {
    return this.editor;
  }

  getText(): string {
    return this.editor.getText().trim();
  }

  getJSON() {
    return this.editor.getJSON();
  }

  clearContent(): void {
    this.editor.commands.clearContent();
  }

  focus(): void {
    this.editor.commands.focus();
  }

  setContent(content: string): void {
    this.editor.commands.setContent(content);
  }

  deleteRange(from: number, to: number): void {
    this.editor.chain().focus().deleteRange({ from, to }).run();
  }

  insertContent(content: string): void {
    this.editor.chain().focus().insertContent(content).run();
  }

  on(
    event: "update" | "focus" | "blur",
    callback: (props: { editor: Editor }) => void,
  ): void {
    this.editor.on(event as any, callback);
  }

  setKeyboardHandler(
    handler: (view: unknown, event: KeyboardEvent) => boolean,
  ): void {
    const currentProps = this.editor.options.editorProps;
    this.editor.setOptions({
      editorProps: {
        ...currentProps,
        handleKeyDown: handler,
      },
    });
  }

  hasLineBreaks(): boolean {
    const json = this.getJSON();

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
      return true;
    } else if (json.content && json.content[0]) {
      return checkForBreaks(json.content[0]);
    }

    return false;
  }

  getSelection() {
    return this.editor.state.selection;
  }

  getTextBeforeCursor(length: number = 10): string {
    const { from } = this.editor.state.selection;
    return this.editor.state.doc.textBetween(Math.max(0, from - length), from);
  }

  destroy(): void {
    this.editor.destroy();
  }
}
