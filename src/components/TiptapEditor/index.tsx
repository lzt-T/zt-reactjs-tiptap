import { useEditor, EditorContent } from "@tiptap/react";
import { defaultCommands } from "./extensions/SlashCommands";
import CommandMenu from "./CommandMenu";
import TableMenu from "./TableMenu";
import BubbleMenu from "./BubbleMenu/index";
import MathDialog from "./MathDialog";
import ImageUploadDialog from "./ImageUploadDialog";
import "./TiptapEditor.css";
import { useRef, useEffect, useCallback } from "react";
import type { TiptapEditorProps } from "./types";
import {
  useCommandMenu,
  useMathDialog,
  useImageUploadDialog,
  useTiptapEditor,
} from "@/hooks";
import { config } from "@/config";

const TiptapEditor = ({
  value,
  onChange,
  onImageUpload,
  commandMenuMaxHeight = config.COMMAND_MENU_DEFAULT_MAX_HEIGHT,
  commandMenuMinHeight = config.COMMAND_MENU_DEFAULT_MIN_HEIGHT,
  placeholder = config.DEFAULT_PLACEHOLDER,
  disabled = false,
  onChangeDebounceMs = config.DEFAULT_ON_CHANGE_DEBOUNCE_MS,
}: TiptapEditorProps) => {
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const disabledRef = useRef(disabled);

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

  const { editor } = useTiptapEditor({
    value,
    placeholder,
    disabled,
    editorRef,
    onChangeDebounceMs,
    onChange,
    onStart: commandMenu.handleStart,
    onUpdate: commandMenu.handleUpdate,
    onIndexChange: commandMenu.handleIndexChange,
    onClientRect: commandMenu.handleClientRect,
    onExit: commandMenu.handleExit,
    onMathDialog: mathDialog.handleMathDialogFromSlash,
    onImageUpload: imageDialog.openImageDialog,
    onInlineMathClick: mathDialog.handleInlineMathClick,
    onBlockMathClick: mathDialog.handleBlockMathClick,
  });

  const handleCommand = useCallback(
    (item: (typeof defaultCommands)[0]) => {
      if (editor) {
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

        if (item.mathType) {
          const defaultValue =
            item.mathType === "inline"
              ? "E = mc^2"
              : "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}";
          mathDialog.openMathDialog(item.mathType, defaultValue, (latex) => {
            if (item.mathType === "inline") {
              editor.chain().focus().insertInlineMath({ latex }).run();
            } else {
              editor.chain().focus().insertBlockMath({ latex }).run();
            }
          });
        } else if (item.imageUpload) {
          imageDialog.openImageDialog((src, alt) => {
            editor.chain().focus().setImage({ src, alt }).run();
          });
        } else {
          item.command({ editor });
        }

        commandMenu.setShowCommandMenu(false);
      }
    },
    [editor, mathDialog, imageDialog, commandMenu]
  );

  return (
    <div className={`editor-container${disabled ? " is-disabled" : ""}`}>
      <div className="editor-wrapper notion-editor" ref={editorWrapperRef}>
        {editor && !disabled && (
          <TableMenu editor={editor} editorWrapperRef={editorWrapperRef} />
        )}
        <EditorContent editor={editor} />
        {editor && !disabled && <BubbleMenu editor={editor} />}
        {commandMenu.showCommandMenu &&
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
