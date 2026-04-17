import type { CSSProperties, Ref, RefObject } from "react";
import type { Editor } from "@tiptap/react";
import type { CommandItem } from "@/core/extensions/SlashCommands";
import type { EditorLocale } from "@/shared/locales";
import type { CodeBlockLanguageOption, ColorOption } from "@/shared/config";
import { config } from "@/shared/config";
import type { MenuPlacement } from "@/react/editor/types";
import type { ToolbarItemConfig } from "@/react/editor/customization";
import Toolbar from "@/react/editor/toolbar/Toolbar";
import TableRowActions from "@/react/editor/table/TableRowActions";
import TableColumnActions from "@/react/editor/table/TableColumnActions";
import CodeBlockLanguageMenu from "@/react/editor/codeblock/CodeBlockLanguageMenu";
import BubbleMenu from "@/react/editor/menus/BubbleMenu";
import CommandMenu from "@/react/editor/menus/CommandMenu";
import { EditorContent } from "@tiptap/react";
import { cn } from "@/shared/utils/utils";

interface CommandMenuState {
  showCommandMenu: boolean;
  filteredCommands: CommandItem[];
  selectedIndex: number;
  menuPosition: { top: number; left: number; placement: MenuPlacement } | null;
  menuOverlayRef: Ref<HTMLDivElement>;
  setShowCommandMenu: (value: boolean) => void;
}

interface EditorSurfaceProps {
  editor: Editor | null;
  disabled: boolean;
  isNotionLike: boolean;
  isEditorFocused: boolean;
  isEditorFocusStable: boolean;
  showHeadlessToolbar: boolean;
  showCodeBlockLanguageMenu: boolean;
  locale: EditorLocale;
  editorWrapperRef: RefObject<HTMLDivElement | null>;
  portalContainer: HTMLDivElement | null;
  resolvedToolbarItems: ToolbarItemConfig[];
  resolvedCodeBlockLanguages: CodeBlockLanguageOption[];
  textColorOptions: ColorOption[];
  highlightColorOptions: ColorOption[];
  resolvedDefaultCodeBlockLanguage: string;
  resolvedPlaceholder: string;
  onCodeBlockFormat?: (payload: {
    code: string;
    language: string;
  }) => string | Promise<string>;
  commandMenu: CommandMenuState;
  commandMenuMaxHeight: number;
  commandMenuMinHeight: number;
  onHandleCommand: (item: CommandItem) => void;
  onOpenMathDialog: (
    type: "inline" | "block",
    initial: string,
    callback: (latex: string) => void,
  ) => void;
  onOpenImageDialog: (callback: (src: string, alt?: string) => void) => void;
  onOpenFileUploadDialog?: (
    callback: (url: string, name: string) => void,
  ) => void;
  onMenuRootChange: (node: HTMLDivElement | null) => void;
  onCodeBlockLanguageMenuOpenChecked: (editorFocused: boolean) => void;
}

/** 将 placeholder 转为可用于 CSS content 的字符串。 */
function toCssContentString(value: string): string {
  if (value.length === 0) return '""';
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n|\r|\n/g, "\\A ");
  return `"${escaped}"`;
}

/** 编辑器主体渲染：工具栏、内容区、菜单与表格操作。 */
export default function EditorSurface({
  editor,
  disabled,
  isNotionLike,
  isEditorFocused,
  isEditorFocusStable,
  showHeadlessToolbar,
  showCodeBlockLanguageMenu,
  locale,
  editorWrapperRef,
  portalContainer,
  resolvedToolbarItems,
  resolvedCodeBlockLanguages,
  textColorOptions,
  highlightColorOptions,
  resolvedDefaultCodeBlockLanguage,
  resolvedPlaceholder,
  onCodeBlockFormat,
  commandMenu,
  commandMenuMaxHeight,
  commandMenuMinHeight,
  onHandleCommand,
  onOpenMathDialog,
  onOpenImageDialog,
  onOpenFileUploadDialog,
  onMenuRootChange,
  onCodeBlockLanguageMenuOpenChecked,
}: EditorSurfaceProps) {
  // 编辑器容器 CSS 变量样式。
  const wrapperStyle = {
    "--table-action-padding": `${config.TABLE_ACTION_BUTTON_PADDING}px`,
    "--zt-gap-placeholder-content": toCssContentString(resolvedPlaceholder),
  } as CSSProperties;

  return (
    <>
      {editor && !disabled && showHeadlessToolbar && (
        <Toolbar
          editor={editor}
          items={resolvedToolbarItems}
          isEditorFocused={isEditorFocused}
          isEditorFocusStable={isEditorFocusStable}
          onOpenMathDialog={onOpenMathDialog}
          onOpenImageDialog={onOpenImageDialog}
          locale={locale}
          onOpenFileUploadDialog={onOpenFileUploadDialog}
          textColorOptions={textColorOptions}
          highlightColorOptions={highlightColorOptions}
          portalContainer={portalContainer}
          onPopoverOpenStateChecked={onCodeBlockLanguageMenuOpenChecked}
        />
      )}
      <div
        className={cn(
          "editor-wrapper",
          isNotionLike ? "notion-editor" : "headless-editor",
        )}
        ref={editorWrapperRef}
        style={wrapperStyle}
      >
        {editor && !disabled && isEditorFocused && (
          <>
            <TableRowActions
              editor={editor}
              editorWrapperRef={editorWrapperRef}
              locale={locale}
            />
            <TableColumnActions
              editor={editor}
              editorWrapperRef={editorWrapperRef}
              locale={locale}
            />
          </>
        )}
        <EditorContent editor={editor} />
        {editor && !disabled && (
          <CodeBlockLanguageMenu
            editor={editor}
            locale={locale}
            portalContainer={portalContainer}
            editorWrapperRef={editorWrapperRef}
            languages={resolvedCodeBlockLanguages}
            defaultLanguage={resolvedDefaultCodeBlockLanguage}
            onCodeBlockFormat={onCodeBlockFormat}
            enabled={showCodeBlockLanguageMenu}
            onMenuRootChange={onMenuRootChange}
            onMenuOpenStateChecked={onCodeBlockLanguageMenuOpenChecked}
          />
        )}
        {editor && !disabled && isNotionLike && isEditorFocused&& (
          <BubbleMenu
            editor={editor}
            locale={locale}
            textColorOptions={textColorOptions}
            highlightColorOptions={highlightColorOptions}
            portalContainer={portalContainer}
            onPopoverOpenStateChecked={onCodeBlockLanguageMenuOpenChecked}
          />
        )}
        {isNotionLike &&
          isEditorFocused &&
          commandMenu.showCommandMenu &&
          editor &&
          !disabled &&
          commandMenu.menuPosition && (
            <CommandMenu
              items={commandMenu.filteredCommands}
              command={onHandleCommand}
              selectedIndex={commandMenu.selectedIndex}
              position={commandMenu.menuPosition}
              maxHeight={commandMenuMaxHeight}
              minHeight={commandMenuMinHeight}
              overlayRef={commandMenu.menuOverlayRef}
              editor={editor}
              portalContainer={portalContainer}
              editorWrapperRef={editorWrapperRef}
            />
          )}
      </div>
    </>
  );
}
