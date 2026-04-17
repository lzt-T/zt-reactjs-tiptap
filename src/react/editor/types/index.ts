import type { FormulaPickerCategory } from '@/shared/config/formulaCategories'
import type { CodeBlockLanguageOption, ColorOption } from "@/shared/config";
import type {
  EditorExternalExtension,
  SlashCommandConfig,
  ToolbarItemConfig,
} from '@/react/editor/customization'

export const MenuPlacement = {
  Top: 'top',
  Bottom: 'bottom',
} as const

export type MenuPlacement = (typeof MenuPlacement)[keyof typeof MenuPlacement]

/** 编辑器模式：Notion 风格（斜杠命令、块状编辑等）或简易模式 */
export const EditorMode = {
  NotionLike: 'notion-like',
  Headless: 'headless',
} as const

export type EditorMode = (typeof EditorMode)[keyof typeof EditorMode]

/** 编辑器语言 */
export const EditorLanguage = {
  ZhCN: 'zh-CN',
  EnUS: 'en-US',
} as const

export type EditorLanguage = (typeof EditorLanguage)[keyof typeof EditorLanguage]

/** 编辑器主题 */
export const EditorTheme = {
  // 浅色主题。
  Light: 'light',
  // 深色主题。
  Dark: 'dark',
} as const

export type EditorTheme = (typeof EditorTheme)[keyof typeof EditorTheme]

/** Headless 模式下 Toolbar 的显示模式 */
export const HeadlessToolbarMode = {
  /** 一直显示 */
  Always: 'always',
  /** 聚焦时显示 */
  OnFocus: 'on-focus',
} as const

export type HeadlessToolbarMode = (typeof HeadlessToolbarMode)[keyof typeof HeadlessToolbarMode]

export interface TiptapEditorProps {
  /**
   * 编辑器的 HTML 内容
   */
  value?: string
  
  /**
   * 内容变化时的回调函数
   * @param html - 编辑器的 HTML 内容
   */
  onChange?: (html: string) => void
  
  /**
   * 图片确认插入后触发（仅在点击 Confirm 后触发）
   * @param payload - { file, url, alt? }
   */
  onImageUpload?: (payload: { file: File; url: string; alt?: string }) => void | Promise<void>

  /**
   * 图片预上传处理函数（选择/拖拽文件时触发）
   * @param file - 要上传的图片文件
   * @returns Promise<string> - 返回图片 URL
   */
  onImagePreUpload?: (file: File) => Promise<string>

  /**
   * 图片删除时触发（点击图片右上角删除按钮）
   * @param params - { src, alt?, title? }
   */
  onImageDelete?: (params: { src: string; alt?: string; title?: string }) => void

  /**
   * 附件确认插入后触发（仅在点击 Confirm/Insert Link 后触发）
   * @param payload - { file, url, name }
   */
  onFileUpload?: (payload: { file: File; url: string; name: string }) => void | Promise<void>

  /**
   * 附件预上传处理函数（选择/拖拽文件时触发）
   * @param file - 要上传的文件
   * @returns Promise<{ url: string; name: string }> - 返回文件 URL 与显示名称
   */
  onFilePreUpload?: (file: File) => Promise<{ url: string; name: string }>

  /**
   * 附件删除时触发（点击附件右侧删除按钮）
   * @param params - { url: 文件地址, name: 显示名称 }
   */
  onFileDelete?: (params: { url: string; name: string }) => void

  /**
   * 点击文件块（附件链接）时触发。传入后不再默认打开链接，由你自行处理（如预览、下载、弹窗等）
   * @param params - { url: 文件地址, name: 显示名称 }
   */
  onFileAttachmentClick?: (params: { url: string; name: string }) => void

  /**
   * 斜杠命令菜单的最大高度（px），默认 240
   */
  commandMenuMaxHeight?: number

  /**
   * 斜杠命令菜单的最小高度（px），默认 160
   */
  commandMenuMinHeight?: number

  /**
   * 编辑器语言，控制工具栏、菜单、弹窗、默认 placeholder 等文案
   * 不传时默认跟随浏览器语言：zh* -> zh-CN，其余 -> en-US
   */
  language?: EditorLanguage

  /**
   * 编辑器为空时显示的占位文本。
   * 传入时将覆盖不同模式和不同语言下的默认 placeholder。
   */
  placeholder?: string

  /**
   * 是否禁用编辑器（只读）
   */
  disabled?: boolean

  /**
   * onChange 防抖延迟（毫秒），默认 300ms
   */
  onChangeDebounceMs?: number

  /**
   * 是否显示编辑器容器边框，默认 true
   */
  border?: boolean

  /**
   * 编辑器模式：'notion-like' 为 Notion 风格（斜杠命令、块状编辑等），'headless' 为无头模式
   * @default 'notion-like'
   */
  editorMode?: EditorMode

  /**
   * 编辑器主题，仅支持浅色与深色。
   * 不传时自动跟随 html.dark；若未命中则回落为 light。
   * @default 自动跟随 html.dark（无 dark 时为 light）
   */
  theme?: EditorTheme

  /**
   * Headless 模式下 Toolbar 的显示模式：'always' 一直显示，'on-focus' 仅在编辑器聚焦时显示
   * 仅当 editorMode 为 'headless' 时生效
   * @default 'always'
   */
  headlessToolbarMode?: HeadlessToolbarMode

  /**
   * 图片上传最大体积（字节），超过则拒绝并提示
   * @default config.IMAGE_MAX_SIZE_BYTES（5MB）
   */
  imageMaxSizeBytes?: number

  /**
   * 附件上传最大体积（字节），超过则拒绝并提示
   * @default config.FILE_UPLOAD_MAX_SIZE_BYTES（10MB）
   */
  fileMaxSizeBytes?: number

  /**
   * 附件可上传的扩展名列表（不区分大小写），例如 ['pdf', 'docx']。
   * 内部会自动去空格、去重、去掉前导 "."；当不传或为空时默认仅允许 ['pdf']。
   */
  fileUploadTypes?: string[]

  /**
   * 代码块可选语言列表。传入后会覆盖内置语言集合。
   * 每项结构：{ value: 语言标识, label: 显示名称 }。
   */
  codeBlockLanguages?: CodeBlockLanguageOption[]

  /**
   * 文字颜色预设列表。传入后将覆盖默认文字颜色面板选项。
   */
  textColorOptions?: ColorOption[]

  /**
   * 高亮颜色预设列表。传入后将覆盖默认高亮颜色面板选项。
   */
  highlightColorOptions?: ColorOption[]

  /**
   * 新插入代码块的默认语言（默认 'plaintext'）。
   * 若传入语言未注册，会自动回落为 plaintext。
   */
  defaultCodeBlockLanguage?: string

  /**
   * 代码块格式化回调。点击代码块右上角“格式化代码”按钮时触发。
   * 返回字符串（或 Promise<string>）后会覆盖当前代码块内容，语言属性保持不变。
   */
  onCodeBlockFormat?: (payload: { code: string; language: string }) => string | Promise<string>

  /**
   * 公式选择器的分类列表。不传则使用默认 FORMULA_CATEGORIES；
   * 传入时可完全自定义或通过 [...FORMULA_CATEGORIES, ...extra] 扩展默认列表。
   */
  formulaCategories?: FormulaPickerCategory[]

  /**
   * 编辑器容器的最大高度。不配置时容器为 height: 100%；
   * 配置后高度限制为该值，内容超出时在编辑区内滚动。
   * 数字表示像素（如 400），字符串为任意合法 CSS 长度（如 "50vh"、"20rem"）。
   */
  maxHeight?: number | string

  /**
   * 工具栏项配置：支持重排/裁剪内置按钮与追加自定义按钮。
   * 不传时使用默认工具栏配置。
   */
  toolbarItems?: ToolbarItemConfig[]

  /**
   * 斜杠命令配置：支持重排/裁剪内置命令与追加自定义命令。
   * 不传时使用默认斜杠配置。
   */
  slashCommands?: SlashCommandConfig[]

  /**
   * 是否隐藏默认工具栏项（默认 false）。
   * - false: 默认项 + toolbarItems 合并（同 key 后者覆盖并按后者顺序移动）
   * - true: 仅使用 toolbarItems
   */
  hideDefaultToolbarItems?: boolean

  /**
   * 是否隐藏默认斜杠命令（默认 false）。
   * - false: 默认项 + slashCommands 合并（同 key 后者覆盖并按后者顺序移动）
   * - true: 仅使用 slashCommands
   */
  hideDefaultSlashCommands?: boolean

  /**
   * 额外 TipTap 扩展，按顺序追加在内置扩展之后。
   * 可用于新增节点/标记或覆盖同名行为（冲突需业务侧自行保证兼容）。
   */
  extensions?: EditorExternalExtension[]

  /**
   * 强制编辑器配置版本号。值变化时会强制重建 editor 实例。
   * 用于高级场景下手动触发“创建期配置”刷新。
   */
  editorConfigVersion?: string | number
}
