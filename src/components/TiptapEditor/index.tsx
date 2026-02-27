import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
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
import type { Node } from "@tiptap/pm/model";
import { SlashCommands, defaultCommands } from "./extensions/SlashCommands";
import CommandMenu from "./CommandMenu";
import TableMenu from "./TableMenu";
import BubbleMenu from "./BubbleMenu/index";
import MathDialog from "./MathDialog";
import ImageUploadDialog from "./ImageUploadDialog";
import "./TiptapEditor.css";
import { useState, useCallback, useRef, useEffect } from "react";
import { MenuPlacement } from "./types";
import type { TiptapEditorProps } from "./types";

const COMMAND_MENU_DEFAULT_MAX_HEIGHT = 240;
const COMMAND_MENU_DEFAULT_MIN_HEIGHT = 160;
const DEFAULT_PLACEHOLDER = "输入 '/' 查看命令...";

const TiptapEditor = ({
  value,
  onChange,
  onImageUpload,
  commandMenuMaxHeight = COMMAND_MENU_DEFAULT_MAX_HEIGHT,
  commandMenuMinHeight = COMMAND_MENU_DEFAULT_MIN_HEIGHT,
  placeholder = DEFAULT_PLACEHOLDER,
  disabled = false,
}: TiptapEditorProps) => {
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    placement: MenuPlacement;
  } | null>(null);

  // Math dialog states
  const [showMathDialog, setShowMathDialog] = useState(false);
  const [mathDialogType, setMathDialogType] = useState<"inline" | "block">(
    "inline"
  );
  const [mathDialogInitialValue, setMathDialogInitialValue] = useState("");
  const [mathDialogCallback, setMathDialogCallback] = useState<
    ((latex: string) => void) | null
  >(null);

  // Image upload dialog states
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageDialogCallback, setImageDialogCallback] = useState<
    ((src: string, alt?: string) => void) | null
  >(null);

  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const isExternalUpdateRef = useRef(false); // 标记是否为外部更新
  const disabledRef = useRef(disabled);

  const handleStart = useCallback(() => {
    setShowCommandMenu(true);
    setCommandQuery("");
  }, []);

  const handleUpdate = useCallback((query: string) => {
    setCommandQuery(query);
  }, []);

  const handleIndexChange = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleClientRect = useCallback(
    (rect: DOMRect | null) => {
      if (rect && editorWrapperRef.current) {
        const wrapper = editorWrapperRef.current;
        const wrapperRect = wrapper.getBoundingClientRect();
        // 判断下方可视空间是否足够，以编辑器容器底部为边界
        const spaceBelow = wrapperRect.bottom - rect.bottom;
        const placement =
          spaceBelow < commandMenuMaxHeight
            ? MenuPlacement.Top
            : MenuPlacement.Bottom;
        const cursorTopInWrapper =
          rect.top - wrapperRect.top + wrapper.scrollTop;
        const cursorBottomInWrapper =
          rect.bottom - wrapperRect.top + wrapper.scrollTop;
        setMenuPosition({
          // bottom 时：菜单顶部在光标下方 4px；top 时：通过 translateY(-100%) 将菜单底部对齐光标上方 4px
          top:
            placement === "bottom"
              ? cursorBottomInWrapper + 4
              : cursorTopInWrapper - 4,
          left: rect.left - wrapperRect.left,
          placement,
        });
      }
    },
    [commandMenuMaxHeight]
  );

  const handleExit = useCallback(() => {
    setShowCommandMenu(false);
    setMenuPosition(null);
  }, []);

  // Math dialog handlers
  const openMathDialog = useCallback(
    (
      type: "inline" | "block",
      initialValue: string,
      callback: (latex: string) => void
    ) => {
      setMathDialogType(type);
      setMathDialogInitialValue(initialValue);
      setMathDialogCallback(() => callback);
      setShowMathDialog(true);
    },
    []
  );

  // Store callbacks in refs to avoid recreating editor
  const openMathDialogCallbackRef = useRef(openMathDialog);
  useEffect(() => {
    openMathDialogCallbackRef.current = openMathDialog;
  }, [openMathDialog]);

  // Create stable callback wrappers that will be used in editor config
  // These callbacks access refs but only execute during user interactions, not during render
  const handleInlineMathClick = useCallback((node: Node, pos: number) => {
    if (disabledRef.current || !editorRef.current) return;
    const latex = (node.attrs.latex as string) || "";
    openMathDialogCallbackRef.current("inline", latex, (newLatex) => {
      editorRef.current
        ?.chain()
        .setNodeSelection(pos)
        .updateInlineMath({ latex: newLatex })
        .focus()
        .run();
    });
  }, []);

  const handleBlockMathClick = useCallback((node: Node, pos: number) => {
    if (disabledRef.current || !editorRef.current) return;
    const latex = (node.attrs.latex as string) || "";
    openMathDialogCallbackRef.current("block", latex, (newLatex) => {
      editorRef.current
        ?.chain()
        .setNodeSelection(pos)
        .updateBlockMath({ latex: newLatex })
        .focus()
        .run();
    });
  }, []);

  const handleMathDialogFromSlash = useCallback(
    (
      type: "inline" | "block",
      initialValue: string,
      callback: (latex: string) => void
    ) => {
      openMathDialogCallbackRef.current(type, initialValue, callback);
    },
    []
  );

  // Image upload dialog handlers
  const openImageDialog = useCallback(
    (callback: (src: string, alt?: string) => void) => {
      setImageDialogCallback(() => callback);
      setShowImageDialog(true);
    },
    []
  );

  const handleImageConfirm = useCallback(
    (src: string, alt?: string) => {
      if (imageDialogCallback) {
        imageDialogCallback(src, alt);
      }
      setShowImageDialog(false);
      setImageDialogCallback(null);
    },
    [imageDialogCallback]
  );

  const handleImageCancel = useCallback(() => {
    setShowImageDialog(false);
    setImageDialogCallback(null);
  }, []);

  const handleMathConfirm = useCallback(
    (latex: string) => {
      if (mathDialogCallback) {
        mathDialogCallback(latex);
      }
      setShowMathDialog(false);
      setMathDialogCallback(null);
    },
    [mathDialogCallback]
  );

  const handleMathCancel = useCallback(() => {
    setShowMathDialog(false);
    setMathDialogCallback(null);
  }, []);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit,
      Image,
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
          onClick: handleInlineMathClick,
        },
        blockOptions: {
          onClick: handleBlockMathClick,
        },
        katexOptions: {
          throwOnError: false,
        },
      }),
      SlashCommands.configure({
        onStart: handleStart,
        onUpdate: handleUpdate,
        onIndexChange: handleIndexChange,
        onClientRect: handleClientRect,
        onExit: handleExit,
        onMathDialog: handleMathDialogFromSlash,
        onImageUpload: openImageDialog,
      }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => {
      // 只有在非外部更新时才触发 onChange
      if (!isExternalUpdateRef.current) {
        onChange?.(editor.getHTML());
      }
    },
  });

  // Update editor ref after editor is created
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync disabled state to editor editable
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  
  // Sync external value changes to editor
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== value) {
        // 标记为外部更新
        isExternalUpdateRef.current = true;
        editor.commands.setContent(value);
        // 使用 setTimeout 确保更新完成后再重置标志
        setTimeout(() => {
          isExternalUpdateRef.current = false;
        }, 0);
      }
    }
  }, [editor, value]);

  const filteredCommands = defaultCommands.filter((item) =>
    item.title.toLowerCase().includes(commandQuery.toLowerCase())
  );

  const handleCommand = useCallback(
    (item: (typeof defaultCommands)[0]) => {
      if (editor) {
        // 删除 / 和查询文本
        const { from } = editor.state.selection;
        const textBefore = editor.state.doc.textBetween(
          Math.max(0, from - 50),
          from,
          "\n"
        );
        const slashIndex = textBefore.lastIndexOf("/");

        if (slashIndex !== -1) {
          const deleteFrom = from - (textBefore.length - slashIndex);
          editor
            .chain()
            .focus()
            .deleteRange({ from: deleteFrom, to: from })
            .run();
        }

        // Check if it's a math command
        if (item.mathType) {
          const defaultValue =
            item.mathType === "inline"
              ? "E = mc^2"
              : "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}";
          openMathDialog(item.mathType, defaultValue, (latex) => {
            if (item.mathType === "inline") {
              editor.chain().focus().insertInlineMath({ latex }).run();
            } else {
              editor.chain().focus().insertBlockMath({ latex }).run();
            }
          });
        } else if (item.imageUpload) {
          // Handle image upload
          openImageDialog((src, alt) => {
            editor.chain().focus().setImage({ src, alt }).run();
          });
        } else {
          item.command({ editor });
        }

        setShowCommandMenu(false);
      }
    },
    [editor, openMathDialog, openImageDialog]
  );

  return (
    <div className={`editor-container${disabled ? " is-disabled" : ""}`}>
      <div className="editor-wrapper notion-editor" ref={editorWrapperRef}>
        {editor && !disabled && (
          <TableMenu editor={editor} editorWrapperRef={editorWrapperRef} />
        )}
        <EditorContent editor={editor} />
        {editor && !disabled && <BubbleMenu editor={editor} />}
        {showCommandMenu && editor && !disabled && menuPosition && (
          <CommandMenu
            items={filteredCommands}
            command={handleCommand}
            selectedIndex={selectedIndex}
            position={menuPosition}
            maxHeight={commandMenuMaxHeight}
            minHeight={commandMenuMinHeight}
          />
        )}
      </div>
      <MathDialog
        isOpen={showMathDialog}
        type={mathDialogType}
        initialValue={mathDialogInitialValue}
        onConfirm={handleMathConfirm}
        onCancel={handleMathCancel}
      />
      <ImageUploadDialog
        isOpen={showImageDialog}
        onConfirm={handleImageConfirm}
        onCancel={handleImageCancel}
        onUpload={onImageUpload}
      />
    </div>
  );
};

export default TiptapEditor;
