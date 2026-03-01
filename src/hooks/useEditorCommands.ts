import { useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import * as cmd from "@/lib/editorCommands";
import type { TextAlignValue } from "@/lib/editorCommands";
import type { CommandItem } from "@/extensions/SlashCommands";

export interface UseEditorCommandsOptions {
  onOpenMathDialog?: (
    type: "inline" | "block",
    initialValue: string,
    callback: (latex: string) => void
  ) => void;
  onOpenImageDialog?: (callback: (src: string, alt?: string) => void) => void;
}

const noop = () => {};
const noopStr = noop as (s: string) => void;
const noopAlign = noop as (a: TextAlignValue) => void;

/**
 * 将 TipTap 编辑器的常用命令封装为 Hook，统一给工具栏 / 斜杠命令等调用。
 *
 * - 当 `editor` 为空时，返回的所有命令都会降级为 no-op，调用方无需到处判空。
 * - 通过 `options` 注入「打开图片 / 数学公式弹窗」的 UI 行为，实现逻辑与展示解耦。
 */
export function useEditorCommands(
  editor: Editor | null,
  options: UseEditorCommandsOptions = {}
) {
  const { onOpenMathDialog, onOpenImageDialog } = options;

  /**
   * 执行格式化命令时，尽量保持选区的结束位置不变，
   * 避免点击按钮后光标跳到行首或选区丢失的体验问题。
   */
  const runFormat = useCallback(
    (fn: () => void) => {
      if (!editor) return;
      const { to } = editor.state.selection;
      fn();
      editor.commands.setTextSelection(to);
    },
    [editor]
  );

  const format = useMemo(
    () =>
      !editor
        ? {
            toggleBold: noop,
            toggleItalic: noop,
            toggleUnderline: noop,
            toggleStrike: noop,
            toggleCode: noop,
            toggleSuperscript: noop,
            toggleSubscript: noop,
            setTextAlign: noopAlign,
            setColor: noopStr,
            setHighlight: noopStr,
            unsetHighlight: noop,
          }
        : {
            toggleBold: () => runFormat(() => cmd.toggleBold(editor)),
            toggleItalic: () => runFormat(() => cmd.toggleItalic(editor)),
            toggleUnderline: () => runFormat(() => cmd.toggleUnderline(editor)),
            toggleStrike: () => runFormat(() => cmd.toggleStrike(editor)),
            toggleCode: () => runFormat(() => cmd.toggleCode(editor)),
            toggleSuperscript: () =>
              runFormat(() => cmd.toggleSuperscript(editor)),
            toggleSubscript: () => runFormat(() => cmd.toggleSubscript(editor)),
            setTextAlign: (align: TextAlignValue) =>
              runFormat(() => cmd.setTextAlign(editor, align)),
            setColor: (color: string) => runFormat(() => cmd.setColor(editor, color)),
            setHighlight: (color: string) =>
              runFormat(() => cmd.setHighlight(editor, color)),
            unsetHighlight: () => runFormat(() => cmd.unsetHighlight(editor)),
          },
    [editor, runFormat]
  );

  /**
   * 与块级结构相关的命令（标题、列表、表格等）。
   * 与 `format` 类似，在 `editor` 为空时返回 no-op 实现。
   */
  const block = useMemo(
    () =>
      !editor
        ? {
            setHeading: noop as (level: 1 | 2 | 3) => void,
            toggleBulletList: noop,
            toggleOrderedList: noop,
            toggleTaskList: noop,
            insertTable: noop,
          }
        : {
            setHeading: (level: 1 | 2 | 3) => cmd.setHeading(editor, level),
            toggleBulletList: () => cmd.toggleBulletList(editor),
            toggleOrderedList: () => cmd.toggleOrderedList(editor),
            toggleTaskList: () => cmd.toggleTaskList(editor),
            insertTable: () => cmd.insertTable(editor),
          },
    [editor]
  );

  /** 打开行内公式编辑弹窗，并在确认后插入行内数学公式节点。 */
  const openInlineMath = useCallback(() => {
    if (!editor || !onOpenMathDialog) return;
    onOpenMathDialog("inline", "E = mc^2", (latex) => {
      editor.chain().focus().insertInlineMath({ latex }).run();
    });
  }, [editor, onOpenMathDialog]);

  /** 打开块级公式编辑弹窗，并在确认后插入块级数学公式节点。 */
  const openBlockMath = useCallback(() => {
    if (!editor || !onOpenMathDialog) return;
    onOpenMathDialog(
      "block",
      "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}",
      (latex) => {
        editor.chain().focus().insertBlockMath({ latex }).run();
      }
    );
  }, [editor, onOpenMathDialog]);

  /** 打开图片上传 / 选择弹窗，在回调中向编辑器插入图片节点。 */
  const openImage = useCallback(() => {
    if (!editor || !onOpenImageDialog) return;
    onOpenImageDialog((src, alt) => {
      editor.chain().focus().setImage({ src, alt }).run();
    });
  }, [editor, onOpenImageDialog]);

  /**
   * 运行一个来自斜杠菜单的命令项：
   * - 若包含 `mathType` 则走数学公式弹窗流程；
   * - 若标记为 `imageUpload` 则走图片上传流程；
   * - 否则直接调用命令项自身的 `command`。
   */
  const runCommandItem = useCallback(
    (item: CommandItem) => {
      if (!editor) return;
      if (item.mathType && onOpenMathDialog) {
        const defaultValue =
          item.mathType === "inline"
            ? "E = mc^2"
            : "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}";
        onOpenMathDialog(item.mathType, defaultValue, (latex) => {
          if (item.mathType === "inline") {
            editor.chain().focus().insertInlineMath({ latex }).run();
          } else {
            editor.chain().focus().insertBlockMath({ latex }).run();
          }
        });
      } else if (item.imageUpload && onOpenImageDialog) {
        onOpenImageDialog((src, alt) => {
          editor.chain().focus().setImage({ src, alt }).run();
        });
      } else {
        item.command({ editor });
      }
    },
    [editor, onOpenMathDialog, onOpenImageDialog]
  );

  return {
    runFormat,
    format,
    block,
    dialogs: { openInlineMath, openBlockMath, openImage },
    runCommandItem,
  };
}
