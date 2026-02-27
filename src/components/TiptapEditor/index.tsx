import { useEditor, EditorContent } from "@tiptap/react";
import { defaultCommands } from "./extensions/SlashCommands";
import CommandMenu from "./CommandMenu";
import Toolbar from "./Toolbar";
import TableRowActions from "./TableRowActions";
import BubbleMenu from "./BubbleMenu/index";
import MathDialog from "./MathDialog";
import ImageUploadDialog from "./ImageUploadDialog";
import "./TiptapEditor.css";
import { useRef, useEffect, useCallback, useState } from "react";
import type { TiptapEditorProps } from "./types";
import {
  useCommandMenu,
  useMathDialog,
  useImageUploadDialog,
  useTiptapEditor,
  useEditorCommands,
} from "@/hooks";
import { config } from "@/config";
import { cn } from "@/lib/utils";
import { EditorMode, HeadlessToolbarMode } from "./types";

const noop = () => {};
const noopRect = noop as (rect: DOMRect | null) => void;
const noopIndex = noop as (index: number) => void;
const noopUpdate = noop as (query: string) => void;
const noopMathDialog = noop as (
  type: "inline" | "block",
  initial: string,
  cb: (latex: string) => void
) => void;
const noopImageUpload = noop as (
  cb: (src: string, alt?: string) => void
) => void;

const TiptapEditor = ({
  editorMode = EditorMode.NotionLike,
  headlessToolbarMode = HeadlessToolbarMode.Always,
  value,
  onChange,
  onImageUpload,
  commandMenuMaxHeight = config.COMMAND_MENU_DEFAULT_MAX_HEIGHT,
  commandMenuMinHeight = config.COMMAND_MENU_DEFAULT_MIN_HEIGHT,
  placeholder,
  disabled = false,
  onChangeDebounceMs = config.DEFAULT_ON_CHANGE_DEBOUNCE_MS,
  border = true,
}: TiptapEditorProps) => {
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const disabledRef = useRef(disabled);
  const isNotionLike = editorMode === EditorMode.NotionLike;
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const commandMenu = useCommandMenu({
    editorWrapperRef,
    commandMenuMaxHeight,
  });

  const mathDialog = useMathDialog({
    editorRef,
    disabledRef,
  });

  const imageDialog = useImageUploadDialog();

  const resolvedPlaceholder =
    placeholder !== undefined
      ? placeholder
      : editorMode === EditorMode.NotionLike
        ? config.DEFAULT_PLACEHOLDER
        : config.PLACEHOLDER_HEADLESS;

  const { editor } = useTiptapEditor({
    value,
    placeholder: resolvedPlaceholder,
    disabled,
    editorRef,
    onChangeDebounceMs,
    onChange,
    onStart: isNotionLike ? commandMenu.handleStart : noop,
    onUpdate: isNotionLike ? commandMenu.handleUpdate : noopUpdate,
    onIndexChange: isNotionLike ? commandMenu.handleIndexChange : noopIndex,
    onClientRect: isNotionLike ? commandMenu.handleClientRect : noopRect,
    onExit: isNotionLike ? commandMenu.handleExit : noop,
    onMathDialog: isNotionLike
      ? mathDialog.handleMathDialogFromSlash
      : noopMathDialog,
    onImageUpload: isNotionLike ? imageDialog.openImageDialog : noopImageUpload,
    onInlineMathClick: mathDialog.handleInlineMathClick,
    onBlockMathClick: mathDialog.handleBlockMathClick,
  });

  const { runCommandItem } = useEditorCommands(editor, {
    onOpenMathDialog: mathDialog.handleMathDialogFromSlash,
    onOpenImageDialog: imageDialog.openImageDialog,
  });

  useEffect(() => {
    if (!editor || isNotionLike) return;
    const onFocus = () => setIsEditorFocused(true);
    const onBlur = () => {
      // 焦点若移到容器内（如点击工具栏），不隐藏工具栏；否则延迟一帧再判断
      requestAnimationFrame(() => {
        if (!containerRef.current?.contains(document.activeElement)) {
          setIsEditorFocused(false);
        }
      });
    };
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);
    return () => {
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
    };
  }, [editor, isNotionLike]);

  const showHeadlessToolbar =
    !isNotionLike &&
    (headlessToolbarMode === HeadlessToolbarMode.Always ||
      (headlessToolbarMode === HeadlessToolbarMode.OnFocus && isEditorFocused));

  const handleCommand = useCallback(
    (item: (typeof defaultCommands)[0]) => {
      if (!editor) return;
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
      runCommandItem(item);
      commandMenu.setShowCommandMenu(false);
    },
    [editor, runCommandItem, commandMenu]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "editor-container",
        disabled && "is-disabled",
        !border && "no-border",
        !isNotionLike && "editor-container-headless"
      )}
    >
      {editor && !disabled && showHeadlessToolbar && (
        <Toolbar
          editor={editor}
          onOpenMathDialog={mathDialog.handleMathDialogFromSlash}
          onOpenImageDialog={imageDialog.openImageDialog}
        />
      )}
      <div
        className={cn(
          "editor-wrapper",
          isNotionLike ? "notion-editor" : "headless-editor"
        )}
        ref={editorWrapperRef}
      >
        {editor && !disabled && (
          <>
            <TableRowActions editor={editor} editorWrapperRef={editorWrapperRef} />
          </>
        )}
        <EditorContent editor={editor} />
        {editor && !disabled && isNotionLike && <BubbleMenu editor={editor} />}
        {isNotionLike &&
          commandMenu.showCommandMenu &&
          editor &&
          !disabled &&
          commandMenu.menuPosition && (
            <CommandMenu
              items={commandMenu.filteredCommands}
              command={handleCommand}
              selectedIndex={commandMenu.selectedIndex}
              position={commandMenu.menuPosition}
              maxHeight={commandMenuMaxHeight}
              minHeight={commandMenuMinHeight}
            />
          )}
      </div>
      <MathDialog
        isOpen={mathDialog.showMathDialog}
        type={mathDialog.mathDialogType}
        initialValue={mathDialog.mathDialogInitialValue}
        onConfirm={mathDialog.handleMathConfirm}
        onCancel={mathDialog.handleMathCancel}
      />
      <ImageUploadDialog
        isOpen={imageDialog.showImageDialog}
        onConfirm={imageDialog.handleImageConfirm}
        onCancel={imageDialog.handleImageCancel}
        onUpload={onImageUpload}
      />
    </div>
  );
};

export default TiptapEditor;
