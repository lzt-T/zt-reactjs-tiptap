export const MenuPlacement = {
  Top: 'top',
  Bottom: 'bottom',
} as const

export type MenuPlacement = (typeof MenuPlacement)[keyof typeof MenuPlacement]

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
   * 编辑器为空时显示的占位文本，默认 "输入 '/' 查看命令..."
   */
  placeholder?: string

  /**
   * 是否禁用编辑器（只读）
   */
  disabled?: boolean
}

