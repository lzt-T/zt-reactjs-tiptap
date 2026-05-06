import { useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import * as cmd from "@/core/commands/editorCommands";
import type {
  TextAlignValue,
  InsertTableOptions,
} from "@/core/commands/editorCommands";
import type { CommandItem } from "@/core/extensions/SlashCommands";

export interface UseEditorCommandsOptions {
  onOpenMathDialog?: (
    type: "inline" | "block",
    initialValue: string,
    callback: (latex: string) => void
  ) => void;
  onOpenImageDialog?: (callback: (src: string, alt?: string) => void) => void;
  onOpenVideoDialog?: (callback: (src: string, title?: string) => void) => void;
  onOpenFileUploadDialog?: (
    callback: (url: string, name: string) => void
  ) => void;
}

const noop = () => {};
const noopStr = noop as (s: string) => void;
const noopAlign = noop as (a: TextAlignValue) => void;
// 空编辑器状态下的禁用判断。
const noopFalse = () => false;

interface FileAttachmentChain {
  chain: () => {
    focus: () => {
      insertFileAttachment: (payload: { url: string; name: string }) => { run: () => boolean };
    };
  };
}

/** 向编辑器中插入附件节点，使用类型收窄避免 any。 */
function runInsertFileAttachment(
  editor: Editor,
  payload: { url: string; name: string }
): void {
  const fileAttachmentEditor = editor as unknown as FileAttachmentChain;
  fileAttachmentEditor.chain().focus().insertFileAttachment(payload).run();
}


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
  const {
    onOpenMathDialog,
    onOpenImageDialog,
    onOpenVideoDialog,
    onOpenFileUploadDialog,
  } = options;

  /**
   * 执行行内格式命令（加粗、斜体等）的统一入口。
   * 保留 TipTap/ProseMirror 原生选区，不在命令后额外调用 setTextSelection，
   * 以支持 BubbleMenu/Toolbar 在同一选区上连续操作。
   */
  const runFormat = useCallback(
    (fn: () => void) => {
      if (!editor) return;
      fn();
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
            setLink: noopStr,
            unsetLink: noop,
            toggleSuperscript: noop,
            toggleSubscript: noop,
            setTextAlign: noopAlign,
            setColor: noopStr,
            unsetColor: noop,
            setHighlight: noopStr,
            unsetHighlight: noop,
          }
        : {
            toggleBold: () => runFormat(() => cmd.toggleBold(editor)),
            toggleItalic: () => runFormat(() => cmd.toggleItalic(editor)),
            toggleUnderline: () => runFormat(() => cmd.toggleUnderline(editor)),
            toggleStrike: () => runFormat(() => cmd.toggleStrike(editor)),
            toggleCode: () => runFormat(() => cmd.toggleCode(editor)),
            setLink: (href: string) => runFormat(() => cmd.setLink(editor, href)),
            unsetLink: () => runFormat(() => cmd.unsetLink(editor)),
            toggleSuperscript: () =>
              runFormat(() => cmd.toggleSuperscript(editor)),
            toggleSubscript: () => runFormat(() => cmd.toggleSubscript(editor)),
            setTextAlign: (align: TextAlignValue) =>
              runFormat(() => cmd.setTextAlign(editor, align)),
            setColor: (color: string) => runFormat(() => cmd.setColor(editor, color)),
            unsetColor: () => runFormat(() => cmd.unsetColor(editor)),
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
            toggleHeading: noop as (level: 1 | 2 | 3) => void,
            toggleCodeBlock: noop,
            toggleBlockquote: noop,
            setCodeBlockLanguage: noopStr,
            toggleBulletList: noop,
            toggleOrderedList: noop,
            toggleTaskList: noop,
            increaseIndent: noop,
            decreaseIndent: noop,
            canIncreaseIndent: noopFalse,
            canDecreaseIndent: noopFalse,
            insertTable: noop as (options?: InsertTableOptions) => void,
          }
        : {
            setHeading: (level: 1 | 2 | 3) => cmd.setHeading(editor, level),
            toggleHeading: (level: 1 | 2 | 3) => cmd.toggleHeading(editor, level),
            toggleCodeBlock: () => cmd.toggleCodeBlock(editor),
            toggleBlockquote: () => cmd.toggleBlockquote(editor),
            setCodeBlockLanguage: (language: string) =>
              cmd.setCodeBlockLanguage(editor, language),
            toggleBulletList: () => cmd.toggleBulletList(editor),
            toggleOrderedList: () => cmd.toggleOrderedList(editor),
            toggleTaskList: () => cmd.toggleTaskList(editor),
            increaseIndent: () => cmd.increaseIndent(editor),
            decreaseIndent: () => cmd.decreaseIndent(editor),
            canIncreaseIndent: () => cmd.canIncreaseIndent(editor),
            canDecreaseIndent: () => cmd.canDecreaseIndent(editor),
            insertTable: (options?: InsertTableOptions) =>
              cmd.insertTable(editor, options),
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

  /** 打开附件上传弹窗，在回调中向编辑器插入文件块链接。 */
  const openFileUpload = useCallback(() => {
    if (!editor || !onOpenFileUploadDialog) return;
    onOpenFileUploadDialog((url, name) => {
      runInsertFileAttachment(editor, { url, name });
    });
  }, [editor, onOpenFileUploadDialog]);

  /** 打开视频上传弹窗，在回调中向编辑器插入视频节点。 */
  const openVideo = useCallback(() => {
    if (!editor || !onOpenVideoDialog) return;
    onOpenVideoDialog((src, title) => {
      editor.chain().focus().setVideo({ src, title }).run();
    });
  }, [editor, onOpenVideoDialog]);

  /**
   * 运行一个来自斜杠菜单的命令项：
   * - 若包含 `mathType` 则走数学公式弹窗流程；
   * - 若标记为 `imageUpload` 则走图片上传流程；
   * - 若标记为 `videoUpload` 则走视频上传流程；
   * - 若标记为 `fileAttachment` 则走附件上传流程；
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
      } else if (item.videoUpload && onOpenVideoDialog) {
        onOpenVideoDialog((src, title) => {
          editor.chain().focus().setVideo({ src, title }).run();
        });
      } else if (item.fileAttachment && onOpenFileUploadDialog) {
        onOpenFileUploadDialog((url, name) => {
          runInsertFileAttachment(editor, { url, name });
        });
      } else {
        item.command({ editor });
      }
    },
    [editor, onOpenMathDialog, onOpenImageDialog, onOpenVideoDialog, onOpenFileUploadDialog]
  );

  return {
    runFormat,
    format,
    block,
    dialogs: { openInlineMath, openBlockMath, openImage, openVideo, openFileUpload },
    runCommandItem,
  };
}
