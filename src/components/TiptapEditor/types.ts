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
   * 图片上传处理函数
   * @param file - 要上传的图片文件
   * @returns Promise<string> - 返回图片的 URL
   */
  onImageUpload?: (file: File) => Promise<string>

  /**
   * 斜杠命令菜单的最大高度（px），默认 240
   */
  commandMenuMaxHeight?: number

  /**
   * 斜杠命令菜单的最小高度（px），默认 160
   */
  commandMenuMinHeight?: number

  /**
   * 编辑器为空时显示的占位文本。不传时 NotionLike 为「输入 '/' 查看命令...」，
   * Headless 为「开始输入...」；传入则两种模式均使用该值。
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
   * Headless 模式下 Toolbar 的显示模式：'always' 一直显示，'on-focus' 仅在编辑器聚焦时显示
   * 仅当 editorMode 为 'headless' 时生效
   * @default 'always'
   */
  headlessToolbarMode?: HeadlessToolbarMode
}

