import type { Editor } from "@tiptap/react";
import type { ReactElement } from "react";
import type { ColorOption } from "@/shared/config";
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
  /** 打开视频上传弹窗（headless 时由 TiptapEditor 传入） */
  onOpenVideoDialog?: (callback: (src: string, title?: string) => void) => void;
  /** 打开附件上传弹窗（headless 时由 TiptapEditor 传入） */
  onOpenFileUploadDialog?: (
    callback: (url: string, name: string) => void,
  ) => void;
  /** 文字颜色预设项。 */
  textColorOptions: ColorOption[];
  /** 高亮颜色预设项。 */
  highlightColorOptions: ColorOption[];
  /** Popover Portal 挂载容器（用于主题作用域隔离）。 */
  portalContainer?: HTMLElement | null;
  /** 判定弹层关闭时 activeElement 是否命中业务容器。 */
  isInsideOverlayContainer?: (target: EventTarget | null) => boolean;
  /** 弹层关闭且 activeElement 在容器外时执行的收口逻辑。 */
  onOverlayCloseOutside?: () => void;
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
  canUseVideoDialog: boolean;
  canUseFileUploadDialog: boolean;
  runToolbarAction: (
    action: () => void,
    options?: { gapPolicy?: "insert-anchor" | "keep-gap" },
  ) => void;
}
