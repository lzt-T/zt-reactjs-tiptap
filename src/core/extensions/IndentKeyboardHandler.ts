import { Extension } from "@tiptap/core";
import {
  canDecreaseIndent,
  canIncreaseIndent,
  decreaseIndent,
  increaseIndent,
} from "@/core/commands/editorCommands";

// 缩进快捷键扩展。
export const IndentKeyboardHandler = Extension.create({
  name: "indentKeyboardHandler",

  /** 注册 Tab 与 Shift-Tab 缩进快捷键。 */
  addKeyboardShortcuts() {
    return {
      /** 在可增加缩进时拦截 Tab。 */
      Tab: ({ editor }) => {
        if (!canIncreaseIndent(editor)) return false;
        increaseIndent(editor);
        return true;
      },
      /** 在可减少缩进时拦截 Shift-Tab。 */
      "Shift-Tab": ({ editor }) => {
        if (!canDecreaseIndent(editor)) return false;
        decreaseIndent(editor);
        return true;
      },
    };
  },
});
