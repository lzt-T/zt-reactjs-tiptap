import type { Editor } from "@tiptap/react";
import type { CSSProperties, ReactElement } from "react";
import type { EditorLocale } from "@/shared/locales";
import type {
  EditorActionContext,
  ToolbarItemConfig,
} from "@/react/editor/customization";

export interface ToolbarProps {
  editor: Editor;
  locale: EditorLocale;
  items: ToolbarItemConfig[];
  /** 是否处于编辑器聚焦态；失焦时不展示激活高亮。 */
  isEditorFocused?: boolean;
  /** 是否处于编辑器聚焦稳定态；未稳定时不展示激活高亮。 */
  isEditorFocusStable?: boolean;
  /** 打开数学公式弹窗（headless 时由 TiptapEditor 传入） */
  onOpenMathDialog?: (
    type: "inline" | "block",
    initialValue: string,
    callback: (latex: string) => void,
  ) => void;
  /** 打开图片上传弹窗（headless 时由 TiptapEditor 传入） */
  onOpenImageDialog?: (callback: (src: string, alt?: string) => void) => void;
  /** 打开附件上传弹窗（headless 时由 TiptapEditor 传入） */
  onOpenFileUploadDialog?: (
    callback: (url: string, name: string) => void,
  ) => void;
}

/** 工具栏项渲染后的中间结构。 */
export interface RenderedToolbarItem {
  key: string;
  group: string;
  element: ReactElement;
}

export interface ToolbarRenderContext {
  actionContext: EditorActionContext;
  locale: EditorLocale;
  editor: Editor;
  showActiveState: boolean;
  isToolbarLocked: boolean;
  isCodeBlockToggleLocked: boolean;
  isInsideCode: boolean;
  isInsideTable: boolean;
  isFocusNodeOnly: boolean;
  isInsideCodeBlock: boolean;
  currentHeadingLevel: 1 | 2 | 3 | null;
  showHeadingMenu: boolean;
  showColorPicker: "text" | "highlight" | null;
  canUseMathDialog: boolean;
  canUseImageDialog: boolean;
  canUseFileUploadDialog: boolean;
  runToolbarAction: (
    action: () => void,
    options?: { gapPolicy?: "insert-anchor" | "keep-gap" },
  ) => void;
  onToggleHeadingMenu: () => void;
  onToggleColorPicker: (type: "text" | "highlight") => void;
  onOpenTableSizePicker: () => void;
  setHeadingReference: (el: HTMLButtonElement | null) => void;
  setColorReference: (
    el: HTMLButtonElement | null,
    type: "text" | "highlight",
  ) => void;
  setTableSizeReference: (el: HTMLButtonElement | null) => void;
}

export interface ColorPickerDropdownProps {
  showColorPicker: "text" | "highlight" | null;
  onClose: () => void;
  setFloating: (el: HTMLDivElement | null) => void;
  floatingStyles: CSSProperties;
  isReady: boolean;
  editor: Editor;
  locale: EditorLocale;
  onTextColorSelect: (color: string) => void;
  onHighlightColorSelect: (color: string) => void;
}

export interface HeadingMenuDropdownProps {
  showHeadingMenu: boolean;
  onClose: () => void;
  setFloating: (el: HTMLDivElement | null) => void;
  floatingStyles: CSSProperties;
  isReady: boolean;
  showActiveState: boolean;
  currentHeadingLevel: 1 | 2 | 3 | null;
  locale: EditorLocale;
  onHeadingSelect: (level: 1 | 2 | 3) => void;
}

export interface TableSizePickerDropdownProps {
  showTableSizePicker: boolean;
  onClose: () => void;
  setFloating: (el: HTMLDivElement | null) => void;
  floatingStyles: CSSProperties;
  isReady: boolean;
  locale: EditorLocale;
  onSelect: (rows: number, cols: number) => void;
}
