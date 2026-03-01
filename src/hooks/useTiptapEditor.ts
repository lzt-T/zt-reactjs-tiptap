import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ImageWithDelete } from "@/extensions/ImageWithDelete";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Underline from "@tiptap/extension-underline";
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
import { SlashCommands } from "@/extensions/SlashCommands";
import { TableBackspaceHandler } from "@/extensions/TableBackspaceHandler";
import { useRef, useEffect, useMemo } from "react";
import type { Node } from "@tiptap/pm/model";
import debounce from "lodash/debounce";

type MathClickHandler = (node: Node, pos: number) => void;

interface UseTiptapEditorOptions {
  value: string | undefined;
  onChangeDebounceMs: number;
  placeholder: string;
  disabled: boolean;
  editorRef: React.MutableRefObject<ReturnType<typeof useEditor> | null>;
  onChange: ((html: string) => void) | undefined;
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
  onInlineMathClick: MathClickHandler;
  onBlockMathClick: MathClickHandler;
}

export function useTiptapEditor({
  value,
  onChangeDebounceMs,
  placeholder,
  disabled,
  editorRef,
  onChange,
  onStart,
  onUpdate,
  onIndexChange,
  onClientRect,
  onExit,
  onMathDialog,
  onImageUpload,
  onInlineMathClick,
  onBlockMathClick,
}: UseTiptapEditorOptions) {
  /* 是否是外部更新 */
  const isExternalUpdateRef = useRef(false);
  /* 是否是第一次更新 */
  const isFirstUpdateRef = useRef(true);

  // 创建防抖后的 onChange
  const debouncedOnChange = useMemo(
    () =>
      debounce((html) => {
        onChange?.(html);
      }, onChangeDebounceMs),
    [onChange, onChangeDebounceMs]
  );

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit,
      ImageWithDelete,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Underline,
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
      TableBackspaceHandler,
      SlashCommands.configure({
        onStart,
        onUpdate,
        onIndexChange,
        onClientRect,
        onExit,
        onMathDialog,
        onImageUpload,
      }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor: ed }) => {
      if (isFirstUpdateRef.current) {
        isFirstUpdateRef.current = false;
        return;
      }
      if (!isExternalUpdateRef.current) {
        debouncedOnChange(ed.getHTML());
      }
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef]);

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
    if (editor && value !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== value) {
        isExternalUpdateRef.current = true;
        editor.commands.setContent(value);
        setTimeout(() => {
          isExternalUpdateRef.current = false;
        }, 0);
      }
    }
  }, [editor, value]);

  return { editor };
}
