/* 颜色项：用于 ColorPicker 预设 */
export interface ColorOption {
  name: string
  value: string
}

export type { CodeBlockLanguageOption } from "./codeBlockLanguages";
export {
  DEFAULT_CODE_BLOCK_LANGUAGE,
  DEFAULT_CODE_BLOCK_LANGUAGES,
} from "./codeBlockLanguages";

/* 配置项 */
export const config = {
  /* 斜杠命令菜单的最大高度（px），默认 320 */
  COMMAND_MENU_DEFAULT_MAX_HEIGHT: 320,
  /* 斜杠命令菜单的最小高度（px），默认 160 */
  COMMAND_MENU_DEFAULT_MIN_HEIGHT: 160,
  /* onChange 防抖延迟（毫秒），默认 300ms */
  DEFAULT_ON_CHANGE_DEBOUNCE_MS: 300,
  /* 编辑器为空时显示的占位文本（NotionLike 模式），默认 "Type '/' for commands..." */
  DEFAULT_PLACEHOLDER: "Type '/' for commands...",
  /* Headless 模式下的默认占位文本 */
  PLACEHOLDER_HEADLESS: "Start typing...",
  /* 图片上传最大体积（字节），默认 5MB */
  IMAGE_MAX_SIZE_BYTES: 5 * 1024 * 1024,
  /* 附件上传最大体积（字节），默认 10MB */
  FILE_UPLOAD_MAX_SIZE_BYTES: 10 * 1024 * 1024,
  /* 视频上传最大体积（字节），默认 50MB */
  VIDEO_MAX_SIZE_BYTES: 50 * 1024 * 1024,
  /* 附件上传默认扩展名（不含 "."），默认仅 PDF */
  DEFAULT_FILE_UPLOAD_TYPES: ["pdf"] as string[],
  /* 表格行/列操作按钮及下方、右侧加号条尺寸（px），默认 10 */
  TABLE_ACTION_BUTTON_SIZE: 10,
  /* 表格左侧/上方操作按钮与表格内容的间距（px），即 tableWrapper 预留区，默认 14 */
  TABLE_ACTION_BUTTON_PADDING: 14,
  /* 表格下方/右侧加号条与表格边缘的间距（px），默认 4 */
  TABLE_ADD_BAR_GAP: 4,
  /* 表格单元格默认宽度（px），默认 160 */
  DEFAULT_TABLE_CELL_WIDTH: 160,
  /* 表格单元格最小拖拽宽度（px），默认 60 */
  MIN_TABLE_CELL_WIDTH: 60,
  /* 文字颜色预设（ColorPicker type="text"） */
  TEXT_COLORS: [
    { name: "Default", value: "#000000" },
    { name: "Gray", value: "#6B7280" },
    { name: "Brown", value: "#92400E" },
    { name: "Orange", value: "#EA580C" },
    { name: "Yellow", value: "#CA8A04" },
    { name: "Green", value: "#16A34A" },
    { name: "Blue", value: "#2563EB" },
    { name: "Purple", value: "#9333EA" },
    { name: "Pink", value: "#DB2777" },
    { name: "Red", value: "#DC2626" },
  ] as ColorOption[],
  /* 高亮颜色预设（ColorPicker type="highlight"） */
  HIGHLIGHT_COLORS: [
    { name: "None", value: "" },
    { name: "Yellow", value: "#FEF08A" },
    { name: "Gray", value: "#E5E7EB" },
    { name: "Brown", value: "#FED7AA" },
    { name: "Green", value: "#BBF7D0" },
    { name: "Blue", value: "#BFDBFE" },
    { name: "Purple", value: "#E9D5FF" },
    { name: "Pink", value: "#FBCFE8" },
    { name: "Red", value: "#FECACA" },
  ] as ColorOption[],
}
