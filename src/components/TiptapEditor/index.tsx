/**
 * TiptapEditor - 基于 TipTap 的富文本编辑器组件
 *
 * 支持两种模式：
 * - NotionLike：块编辑 + 斜杠命令 + Bubble 菜单
 * - Headless：无斜杠命令，可选顶部工具栏
 *
 * 功能：数学公式（行内/块级）、图片上传、表格、任务列表等。
 */
import { useEditor, EditorContent } from "@tiptap/react";
import { defaultCommands } from "@/extensions/SlashCommands";
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
  useBlockMathDeleteButton,
  useCommandMenu,
  useMathDialog,
  useImageUploadDialog,
  useTiptapEditor,
  useEditorCommands,
} from "@/hooks";
import { config } from "@/config";
import { cn } from "@/lib/utils";
import { EditorMode, HeadlessToolbarMode } from "./types";

/** Headless 模式下斜杠相关回调用空函数，避免传入 SlashCommands */
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
  imageMaxSizeBytes = config.IMAGE_MAX_SIZE_BYTES,
  formulaCategories,
}: TiptapEditorProps) => {
  // --- Refs & 状态 ---
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const disabledRef = useRef(disabled);
  const isNotionLike = editorMode === EditorMode.NotionLike;
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  /** 标记 mousedown 是否发生在容器内，用于 blur 时决定是否保留焦点状态 */
  const mouseDownInsideRef = useRef(false);
  /** 编辑器未聚焦时点击公式，记录该元素，在 onFocus 里补触发公式弹窗 */
  const pendingMathClickRef = useRef<{
    el: Element;
    isBlock: boolean;
  } | null>(null);
  const isEditorFocusedRef = useRef(false);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    isEditorFocusedRef.current = isEditorFocused;
  }, [isEditorFocused]);

  // --- Hooks：斜杠命令、公式弹窗、图片上传、编辑器实例、块级公式删除 ---
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

  useBlockMathDeleteButton({
    editor,
    editorWrapperRef,
    disabled,
  });

  /** Headless 模式：监听 focus/blur 与容器内 mousedown，用于工具栏显示与未聚焦时点击公式的补触发 */
  useEffect(() => {
    if (!editor || isNotionLike) return;

    const handleMouseDown = (e: MouseEvent) => {
      // 只要点击发生在容器内，就标记为内部点击，阻止 onBlur 清除焦点状态
      if (containerRef.current?.contains(e.target as Node)) {
        mouseDownInsideRef.current = true;
        // 延迟重置，确保 blur 处理链路全部完成后再允许下次触发
        setTimeout(() => {
          mouseDownInsideRef.current = false;
        }, 300);

        // 编辑器未聚焦时点击公式：ProseMirror 会把 mousedown 当作"聚焦点击"
        // 导致 Mathematics 扩展的 onClick 不触发，需在 onFocus 里补触发
        if (!isEditorFocusedRef.current) {
          const mathEl = (e.target as Element).closest(
            ".tiptap-mathematics-render"
          );
          if (mathEl) {
            pendingMathClickRef.current = {
              el: mathEl,
              isBlock: mathEl.getAttribute("data-type") === "block-math",
            };
          }
        }
      }
    };

    const onFocus = () => {
      setIsEditorFocused(true);
      const pending = pendingMathClickRef.current;
      if (!pending) return;
      pendingMathClickRef.current = null;
      // 等 ProseMirror 完成焦点处理后再触发弹窗
      requestAnimationFrame(() => {
        try {
          const pos = editor.view.posAtDOM(pending.el, 0);
          const node = editor.state.doc.nodeAt(pos);
          if (!node) return;
          if (pending.isBlock) {
            mathDialog.handleBlockMathClick(node, pos);
          } else {
            mathDialog.handleInlineMathClick(node, pos);
          }
        } catch {
          // 元素可能已不在文档中，忽略
        }
      });
    };
    const onBlur = () => {
      // mousedown 总先于 blur 触发，若点击在容器内（如公式），直接跳过
      if (mouseDownInsideRef.current) return;
      // 否则延迟一帧：焦点若移到容器内的可聚焦元素（如工具栏按钮），不隐藏工具栏
      requestAnimationFrame(() => {
        if (!containerRef.current?.contains(document.activeElement)) {
          setIsEditorFocused(false);
        }
      });
    };

    document.addEventListener("mousedown", handleMouseDown);
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
    };
  }, [editor, isNotionLike, mathDialog]);

  /** Headless 模式下是否显示顶部工具栏 */
  const showHeadlessToolbar =
    !isNotionLike &&
    (headlessToolbarMode === HeadlessToolbarMode.Always ||
      (headlessToolbarMode === HeadlessToolbarMode.OnFocus && isEditorFocused));

  /** 斜杠命令选中后执行：先删除 "/" 及后续输入，再执行对应命令 */
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

  // --- 渲染 ---
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
      {/* 编辑区：表格行操作、ProseMirror 内容、Bubble 菜单、斜杠命令菜单 */}
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
      {/* 公式编辑弹窗、图片上传弹窗 */}
      <MathDialog
        isOpen={mathDialog.showMathDialog}
        type={mathDialog.mathDialogType}
        initialValue={mathDialog.mathDialogInitialValue}
        onConfirm={mathDialog.handleMathConfirm}
        onCancel={mathDialog.handleMathCancel}
        formulaCategories={formulaCategories}
      />
      <ImageUploadDialog
        isOpen={imageDialog.showImageDialog}
        onConfirm={imageDialog.handleImageConfirm}
        onCancel={imageDialog.handleImageCancel}
        onUpload={onImageUpload}
        imageMaxSizeBytes={imageMaxSizeBytes}
      />
    </div>
  );
};

export default TiptapEditor;
