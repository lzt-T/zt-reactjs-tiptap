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
}
