/**
 * ReactTiptapEditor - 基于 TipTap 的富文本编辑器组件
 *
 * 支持两种模式：
 * - NotionLike：块编辑 + 斜杠命令 + Bubble 菜单
 * - Headless：无斜杠命令，可选顶部工具栏
 *
 * 功能：数学公式（行内/块级）、图片上传、表格、任务列表等。
 */
import type { Editor } from "@tiptap/react";
import type { CommandItem } from "@/core/extensions/SlashCommands";
import "@/react/editor/styles/TiptapEditor.css";
import { useRef, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import type { TiptapEditorProps } from "@/react/editor/types";
import {
  useBlockMathDeleteButton,
  useCommandMenu,
  useMathDialog,
  useImageUploadDialog,
  useFileUploadDialog,
  useTiptapEditor,
  useEditorCommands,
} from "@/react/hooks";
import { DEFAULT_CODE_BLOCK_LANGUAGE, config } from "@/shared/config";
import { cn } from "@/shared/utils/utils";
import { EditorMode, HeadlessToolbarMode } from "@/react/editor/types";
import { resolveEditorLocale } from "@/shared/locales";
import { useEditorResolvedConfig } from "@/react/editor/shell/hooks/useEditorResolvedConfig";
import { useEditorThemePortalState } from "@/react/editor/shell/hooks/useEditorThemePortalState";
import { useHeadlessFocusController } from "@/react/editor/shell/hooks/useHeadlessFocusController";
import EditorSurface from "@/react/editor/shell/components/EditorSurface";
import EditorDialogs from "@/react/editor/shell/components/EditorDialogs";

/** Headless 模式下斜杠相关回调用空函数，避免传入 SlashCommands */
const noop = () => {};
// 空矩形回调。
const noopRect = noop as (rect: DOMRect | null) => void;
// 空索引回调。
const noopIndex = noop as (index: number) => void;
// 空查询回调。
const noopUpdate = noop as (query: string) => void;
// 空数学弹窗回调。
const noopMathDialog = noop as (
  type: "inline" | "block",
  initial: string,
  cb: (latex: string) => void,
) => void;
// 空图片上传回调。
const noopImageUpload = noop as (
  cb: (src: string, alt?: string) => void,
) => void;

const ReactTiptapEditor = ({
  editorMode = EditorMode.NotionLike,
  headlessToolbarMode = HeadlessToolbarMode.Always,
  value,
  onChange,
  onImageUpload,
  onImagePreUpload,
  onImageDelete,
  onFileUpload,
  onFilePreUpload,
  onFileDelete,
  onFileAttachmentClick,
  commandMenuMaxHeight = config.COMMAND_MENU_DEFAULT_MAX_HEIGHT,
  commandMenuMinHeight = config.COMMAND_MENU_DEFAULT_MIN_HEIGHT,
  language,
  placeholder,
  disabled = false,
  onChangeDebounceMs = config.DEFAULT_ON_CHANGE_DEBOUNCE_MS,
  border = true,
  imageMaxSizeBytes = config.IMAGE_MAX_SIZE_BYTES,
  fileMaxSizeBytes = config.FILE_UPLOAD_MAX_SIZE_BYTES,
  fileUploadTypes,
  codeBlockLanguages,
  defaultCodeBlockLanguage = DEFAULT_CODE_BLOCK_LANGUAGE,
  onCodeBlockFormat,
  formulaCategories,
  maxHeight,
  toolbarItems,
  slashCommands,
  hideDefaultToolbarItems = false,
  hideDefaultSlashCommands = false,
  extensions,
  editorConfigVersion,
}: TiptapEditorProps) => {
  // 当前语言解析后的文案集合。
  const locale = resolveEditorLocale(language);
  // 配置解析结果：工具栏、斜杠命令、placeholder、上传类型、扩展重建依赖等。
  const resolvedConfig = useEditorResolvedConfig({
    editorMode,
    placeholder,
    fileUploadTypes,
    codeBlockLanguages,
    defaultCodeBlockLanguage,
    toolbarItems,
    slashCommands,
    hideDefaultToolbarItems,
    hideDefaultSlashCommands,
    extensions,
    onFilePreUpload,
    editorConfigVersion,
    locale,
  });

  // 编辑器实例引用。
  const editorRef = useRef<Editor | null>(null);
  // 编辑器内容包裹层引用。
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  // 编辑器根容器引用。
  const containerRef = useRef<HTMLDivElement>(null);
  // disabled 状态引用，供事件回调读取最新值。
  const disabledRef = useRef(disabled);

  // 主题与 portal 状态。
  const themePortalState = useEditorThemePortalState();

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  /** 判断事件目标是否位于代码块语言菜单浮层。 */
  const isInsideCodeBlockLanguageSelect = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return !!target.closest(".code-block-language-select-content");
    },
    [],
  );

  // 斜杠命令菜单状态。
  const commandMenu = useCommandMenu({
    editorWrapperRef,
    commandMenuMaxHeight,
    commands: resolvedConfig.resolvedSlashCommands,
  });

  // 数学公式弹窗状态。
  const mathDialog = useMathDialog({
    editorRef,
    disabledRef,
  });

  // 图片弹窗状态。
  const imageDialog = useImageUploadDialog({ editorRef });
  // 附件弹窗状态。
  const fileUploadDialog = useFileUploadDialog({ editorRef });

  // TipTap 编辑器实例。
  const { editor, runAfterOnChange } = useTiptapEditor({
    value,
    placeholder: resolvedConfig.resolvedPlaceholder,
    disabled,
    editorRef,
    onChangeDebounceMs,
    onChange,
    onImageDelete,
    onFileDelete,
    onStart: resolvedConfig.isNotionLike ? commandMenu.handleStart : noop,
    onUpdate: resolvedConfig.isNotionLike
      ? commandMenu.handleUpdate
      : noopUpdate,
    onIndexChange: resolvedConfig.isNotionLike
      ? commandMenu.handleIndexChange
      : noopIndex,
    onClientRect: resolvedConfig.isNotionLike
      ? commandMenu.handleClientRect
      : noopRect,
    onExit: resolvedConfig.isNotionLike ? commandMenu.handleExit : noop,
    onMathDialog: resolvedConfig.isNotionLike
      ? mathDialog.handleMathDialogFromSlash
      : noopMathDialog,
    onImageUpload: resolvedConfig.isNotionLike
      ? imageDialog.openImageDialog
      : noopImageUpload,
    onFileUpload:
      resolvedConfig.isNotionLike && onFilePreUpload
        ? fileUploadDialog.openFileUploadDialog
        : undefined,
    getCommands: resolvedConfig.getResolvedSlashCommands,
    locale,
    defaultCodeBlockLanguage: resolvedConfig.resolvedDefaultCodeBlockLanguage,
    onFileAttachmentClick,
    onInlineMathClick: mathDialog.handleInlineMathClick,
    onBlockMathClick: mathDialog.handleBlockMathClick,
    recreateDeps: resolvedConfig.editorRecreateDeps,
    extensions: resolvedConfig.stableExtensions as typeof extensions,
  });

  // Headless 模式焦点控制。
  const focusController = useHeadlessFocusController({
    editor,
    isNotionLike: resolvedConfig.isNotionLike,
    containerRef,
    headlessToolbarMode,
    isInsideCodeBlockLanguageSelect,
    onInlineMathClick: mathDialog.handleInlineMathClick,
    onBlockMathClick: mathDialog.handleBlockMathClick,
  });

  // 编辑器命令执行器。
  const { runCommandItem } = useEditorCommands(editor, {
    onOpenMathDialog: mathDialog.handleMathDialogFromSlash,
    onOpenImageDialog: imageDialog.openImageDialog,
    onOpenFileUploadDialog: onFilePreUpload
      ? fileUploadDialog.openFileUploadDialog
      : undefined,
  });

  useBlockMathDeleteButton({
    editor,
    editorWrapperRef,
    disabled,
  });

  /** 在 onChange 之后再回调外部图片上传事件，避免时序竞争。 */
  const handleImageUploadAfterChange = useCallback(
    (payload: { file: File; url: string; alt?: string }) => {
      runAfterOnChange(() => {
        if (onImageUpload) {
          void Promise.resolve(onImageUpload(payload));
        }
      });
    },
    [onImageUpload, runAfterOnChange],
  );

  /** 在 onChange 之后再回调外部附件上传事件，避免时序竞争。 */
  const handleFileUploadAfterChange = useCallback(
    (payload: { file: File; url: string; name: string }) => {
      runAfterOnChange(() => {
        if (onFileUpload) {
          void Promise.resolve(onFileUpload(payload));
        }
      });
    },
    [onFileUpload, runAfterOnChange],
  );

  /** 斜杠命令选中后执行：先删除 "/" 及后续输入，再执行对应命令。 */
  const handleCommand = useCallback(
    (item: CommandItem) => {
      if (!editor) return;
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 50),
        from,
        "\n",
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
    [commandMenu, editor, runCommandItem],
  );

  // 编辑器根容器样式。
  const containerClassName = cn(
    "editor-container",
    "zt-tiptap-theme",
    "text-foreground",
    themePortalState.isDocumentDark && "dark",
    disabled && "is-disabled",
    !focusController.isEditorFocused && "is-editor-blurred",
    !focusController.isEditorFocusStable && "is-editor-focus-unstable",
    !border && "no-border",
    !resolvedConfig.isNotionLike && "editor-container-headless",
    maxHeight != null && "editor-container-has-max-height",
  );

  // 编辑器最大高度变量样式。
  const containerStyle =
    maxHeight != null
      ? ({
          "--editor-max-height":
            typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
        } as CSSProperties)
      : undefined;

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      style={containerStyle}
    >
      <EditorSurface
        editor={editor}
        disabled={disabled}
        isNotionLike={resolvedConfig.isNotionLike}
        isEditorFocused={focusController.isEditorFocused}
        isEditorFocusStable={focusController.isEditorFocusStable}
        showHeadlessToolbar={focusController.showHeadlessToolbar}
        showCodeBlockLanguageMenu={focusController.showCodeBlockLanguageMenu}
        locale={locale}
        editorWrapperRef={editorWrapperRef}
        portalContainer={themePortalState.portalContainer}
        resolvedToolbarItems={resolvedConfig.resolvedToolbarItems}
        resolvedCodeBlockLanguages={resolvedConfig.resolvedCodeBlockLanguages}
        resolvedDefaultCodeBlockLanguage={
          resolvedConfig.resolvedDefaultCodeBlockLanguage
        }
        onCodeBlockFormat={onCodeBlockFormat}
        commandMenu={commandMenu}
        commandMenuMaxHeight={commandMenuMaxHeight}
        commandMenuMinHeight={commandMenuMinHeight}
        onHandleCommand={handleCommand}
        onOpenMathDialog={mathDialog.handleMathDialogFromSlash}
        onOpenImageDialog={imageDialog.openImageDialog}
        onOpenFileUploadDialog={
          onFilePreUpload ? fileUploadDialog.openFileUploadDialog : undefined
        }
        onMenuRootChange={focusController.setCodeBlockLanguageMenuRoot}
        onCodeBlockLanguageMenuOpenChecked={
          focusController.syncFocusStateAfterMenuClose
        }
      />
      <EditorDialogs
        portalContainer={themePortalState.portalContainer}
        formulaCategories={formulaCategories}
        locale={locale}
        imageMaxSizeBytes={imageMaxSizeBytes}
        fileMaxSizeBytes={fileMaxSizeBytes}
        fileUploadTypes={resolvedConfig.resolvedFileUploadTypes}
        onImagePreUpload={onImagePreUpload}
        onFilePreUpload={onFilePreUpload}
        onImageUploadAfterChange={handleImageUploadAfterChange}
        onFileUploadAfterChange={handleFileUploadAfterChange}
        mathDialog={mathDialog}
        imageDialog={imageDialog}
        fileUploadDialog={fileUploadDialog}
        onPortalContainerRef={themePortalState.handlePortalContainerRef}
      />
    </div>
  );
};

export default ReactTiptapEditor;
