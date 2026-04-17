import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ImageWithDelete } from "@/core/extensions/ImageWithDelete";
import { FileAttachment } from "@/core/extensions/FileAttachment";
import { DeletionCallbacks } from "@/core/extensions/DeletionCallbacks";
import {
  clearEditorCallbacks,
  setEditorCallbacks,
} from "@/core/extensions/editorCallbackRegistry";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mathematics from "@tiptap/extension-mathematics";
import { createCodeBlockLowlightExtension } from "@/core/extensions/codeBlockLowlight";
import { SlashCommands } from "@/core/extensions/SlashCommands";
import { SelectionMirror } from "@/core/extensions/SelectionMirror";
import type { CommandItem } from "@/core/extensions/SlashCommands";
import { TableBackspaceHandler } from "@/core/extensions/TableBackspaceHandler";
import { CodeBlockKeyboardHandler } from "@/core/extensions/CodeBlockKeyboardHandler";
import { useRef, useEffect, useMemo, useCallback } from "react";
import type { Node } from "@tiptap/pm/model";
import debounce from "lodash/debounce";
import type { AnyExtension } from "@tiptap/core";
import type { EditorLocale } from "@/shared/locales";
import { DEFAULT_CODE_BLOCK_LANGUAGE } from "@/shared/config";

type MathClickHandler = (node: Node, pos: number) => void;

interface UseTiptapEditorOptions {
  value: string | undefined;
  onChangeDebounceMs: number;
  placeholder: string;
  disabled: boolean;
  editorRef: React.MutableRefObject<ReturnType<typeof useEditor> | null>;
  onChange: ((html: string) => void) | undefined;
  onImageDelete?: (params: { src: string; alt?: string; title?: string }) => void;
  onFileDelete?: (params: { url: string; name: string }) => void;
  onStart: () => void;
  onUpdate: (query: string) => void;
  onIndexChange: (index: number) => void;
  onClientRect: (rect: DOMRect | null) => void;
  onExit: () => void;
  onMathDialog: (
    type: "inline" | "block",
    initialValue: string,
    callback: (latex: string) => void
  ) => void;
  onImageUpload: (callback: (src: string, alt?: string) => void) => void;
  onFileUpload?: (callback: (url: string, name: string) => void) => void;
  getCommands?: () => CommandItem[];
  onFileAttachmentClick?: (params: { url: string; name: string }) => void;
  locale: EditorLocale;
  defaultCodeBlockLanguage?: string;
  onInlineMathClick: MathClickHandler;
  onBlockMathClick: MathClickHandler;
  /** 控制 editor 何时重建的依赖集合（例如模式切换时重建以刷新扩展回调） */
  recreateDeps?: ReadonlyArray<unknown>;
  /** 额外扩展：按顺序追加在内置扩展后。 */
  extensions?: AnyExtension[];
}

export function useTiptapEditor({
  value,
  onChangeDebounceMs,
  placeholder,
  disabled,
  editorRef,
  onChange,
  onImageDelete,
  onFileDelete,
  onStart,
  onUpdate,
  onIndexChange,
  onClientRect,
  onExit,
  onMathDialog,
  onImageUpload,
  onFileUpload,
  getCommands,
  onFileAttachmentClick,
  locale,
  defaultCodeBlockLanguage = DEFAULT_CODE_BLOCK_LANGUAGE,
  onInlineMathClick,
  onBlockMathClick,
  recreateDeps = [],
  extensions = [],
}: UseTiptapEditorOptions) {
  /* 是否是外部更新 */
  const isExternalUpdateRef = useRef(false);
  /* 是否是第一次更新 */
  const isFirstUpdateRef = useRef(true);
  /** 最近一次由本编辑器通过 onChange 抛出的 HTML，用于区分「父组件回传的 value」与「真正的外部更新」，避免回传时误调 setContent 导致光标被移到文末 */
  const lastEmittedHtmlRef = useRef<string | null>(null);
  /** 需要在 onChange 之后触发的事件队列（上传/删除） */
  const postChangeQueue = useMemo(() => {
    const callbacks: Array<() => void> = [];
    return {
      enqueue: (callback: () => void) => {
        callbacks.push(callback);
      },
      flush: () => {
        if (callbacks.length === 0) return;
        const pending = callbacks.splice(0, callbacks.length);
        pending.forEach((callback) => callback());
      },
    };
  }, []);

  const runAfterOnChange = useCallback(
    (callback: () => void) => {
      if (!onChange) {
        callback();
        return;
      }
      postChangeQueue.enqueue(callback);
    },
    [onChange, postChangeQueue]
  );

  const handleImageDeleteAfterChange = useCallback(
    (params: { src: string; alt?: string; title?: string }) => {
      runAfterOnChange(() => onImageDelete?.(params));
    },
    [onImageDelete, runAfterOnChange]
  );

  const handleFileDeleteAfterChange = useCallback(
    (params: { url: string; name: string }) => {
      runAfterOnChange(() => onFileDelete?.(params));
    },
    [onFileDelete, runAfterOnChange]
  );

  // 创建防抖后的 onChange
  const debouncedOnChange = useMemo(
    () =>
      debounce((html: string) => {
        onChange?.(html);
        postChangeQueue.flush();
      }, onChangeDebounceMs),
    [onChange, onChangeDebounceMs, postChangeQueue]
  );

  // 内置扩展集合（与历史行为保持一致）
  const builtInExtensions = useMemo<AnyExtension[]>(
    () => [
      StarterKit.configure({
        codeBlock: false,
      }),
      createCodeBlockLowlightExtension(defaultCodeBlockLanguage),
      ImageWithDelete,
      FileAttachment,
      DeletionCallbacks,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Subscript,
      Superscript,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      SelectionMirror,
      Mathematics.configure({
        inlineOptions: {
          onClick: onInlineMathClick,
        },
        blockOptions: {
          onClick: onBlockMathClick,
        },
        katexOptions: {
          throwOnError: false,
        },
      }),
      CodeBlockKeyboardHandler,
      TableBackspaceHandler,
      SlashCommands.configure({
        onStart,
        onUpdate,
        onIndexChange,
        onClientRect,
        onExit,
        onMathDialog,
        onImageUpload,
        onFileUpload,
        locale,
        // 本库内部统一走 getCommands 动态读取命令列表。
        commands: [],
        getCommands,
      }),
    ],
    [
      getCommands,
      onBlockMathClick,
      onClientRect,
      onExit,
      onFileUpload,
      onImageUpload,
      onIndexChange,
      onInlineMathClick,
      onMathDialog,
      onStart,
      onUpdate,
      locale,
      defaultCodeBlockLanguage,
      placeholder,
    ]
  );

  // 最终扩展集合：内置 + 外部传入（后置）。
  const finalExtensions = useMemo<AnyExtension[]>(
    () => [...builtInExtensions, ...extensions],
    [builtInExtensions, extensions]
  );

  const editor = useEditor(
    {
      editable: !disabled,
      extensions: finalExtensions,
      content: value || "<p></p>",
      onUpdate: ({ editor: ed }) => {
        if (isFirstUpdateRef.current) {
          isFirstUpdateRef.current = false;
          return;
        }
        if (!isExternalUpdateRef.current) {
          const html = ed.getHTML();
          lastEmittedHtmlRef.current = html;
          debouncedOnChange(html);
        }
      },
    },
    // 当关键依赖变更时重建 editor，避免扩展内部继续持有旧回调
    recreateDeps
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef]);

  useEffect(() => {
    if (!editor) return;
    setEditorCallbacks(editor, {
      onFileAttachmentClick,
      onImageDelete: handleImageDeleteAfterChange,
      onFileDelete: handleFileDeleteAfterChange,
    });
    return () => {
      clearEditorCallbacks(editor);
    };
  }, [
    editor,
    onFileAttachmentClick,
    handleImageDeleteAfterChange,
    handleFileDeleteAfterChange,
  ]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // 组件卸载时清理防抖，防止内存泄漏
  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  useEffect(() => {
    if (!editor || value === undefined) return;

    const currentContent = editor.getHTML();
    // 若 value 与当前内容一致，无需 setContent
    if (currentContent === value) return;
    // 若 value 等于我们通过 onChange 抛出的内容（父组件回传），不 setContent，避免光标跳到文末
    if (value === lastEmittedHtmlRef.current) return;
    // 若当前文档内容等于我们已抛出的内容，而 value 不同，说明 value 是父组件尚未同步到的旧值（防抖未触发），不应用旧 value 覆盖新内容
    if (currentContent === lastEmittedHtmlRef.current) return;
    lastEmittedHtmlRef.current = null;
    isExternalUpdateRef.current = true;
    editor.commands.setContent(value);
    setTimeout(() => {
      isExternalUpdateRef.current = false;
    }, 0);
  }, [editor, value]);

  return { editor, runAfterOnChange };
}
