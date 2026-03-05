/* 颜色项：用于 ColorPicker 预设 */
export interface ColorOption {
  name: string
  value: string
}

/* 配置项 */
export const config = {
  /* 斜杠命令菜单的最大高度（px），默认 240 */
  COMMAND_MENU_DEFAULT_MAX_HEIGHT: 240,
  /* 斜杠命令菜单的最小高度（px），默认 160 */
  COMMAND_MENU_DEFAULT_MIN_HEIGHT: 160,
  /* onChange 防抖延迟（毫秒），默认 300ms */
  DEFAULT_ON_CHANGE_DEBOUNCE_MS: 300,
  /* 编辑器为空时显示的占位文本（NotionLike 模式），默认 "输入 '/' 查看命令..." */
  DEFAULT_PLACEHOLDER: "输入 '/' 查看命令...",
  /* Headless 模式下的默认占位文本 */
  PLACEHOLDER_HEADLESS: "开始输入...",
  /* 图片上传最大体积（字节），默认 5MB */
  IMAGE_MAX_SIZE_BYTES: 5 * 1024 * 1024,
  /* 表格行/列操作按钮及下方、右侧加号条尺寸（px），默认 10 */
  TABLE_ACTION_BUTTON_SIZE: 10,
  /* 表格左侧/上方操作按钮与表格内容的间距（px），即 tableWrapper 预留区，默认 14 */
  TABLE_ACTION_BUTTON_PADDING: 14,
  /* 表格下方/右侧加号条与表格边缘的间距（px），默认 4 */
  TABLE_ADD_BAR_GAP: 4,
  /* 文字颜色预设（ColorPicker type="text"） */
  TEXT_COLORS: [
    { name: "默认", value: "#000000" },
    { name: "灰色", value: "#6B7280" },
    { name: "棕色", value: "#92400E" },
    { name: "橙色", value: "#EA580C" },
    { name: "黄色", value: "#CA8A04" },
    { name: "绿色", value: "#16A34A" },
    { name: "蓝色", value: "#2563EB" },
    { name: "紫色", value: "#9333EA" },
    { name: "粉色", value: "#DB2777" },
    { name: "红色", value: "#DC2626" },
  ] as ColorOption[],
  /* 高亮颜色预设（ColorPicker type="highlight"） */
  HIGHLIGHT_COLORS: [
    { name: "无色", value: "" },
    { name: "黄色", value: "#FEF08A" },
    { name: "灰色", value: "#E5E7EB" },
    { name: "棕色", value: "#FED7AA" },
    { name: "绿色", value: "#BBF7D0" },
    { name: "蓝色", value: "#BFDBFE" },
    { name: "紫色", value: "#E9D5FF" },
    { name: "粉色", value: "#FBCFE8" },
    { name: "红色", value: "#FECACA" },
  ] as ColorOption[],
}