import { useState, useRef, useCallback, useEffect } from 'react'
import './ImageUploadDialog.css'

interface ImageUploadDialogProps {
  isOpen: boolean
  onConfirm: (src: string, alt?: string) => void
  onCancel: () => void
  onUpload?: (file: File) => Promise<string>
}

const ImageUploadDialog = ({ isOpen, onConfirm, onCancel, onUpload }: ImageUploadDialogProps) => {
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // 重置所有状态的辅助函数
  const resetStates = useCallback(() => {
    setUploadType('file')
    setImageUrl('')
    setImageAlt('')
    setPreviewUrl('')
    setError('')
    setIsUploading(false)
  }, [])

  // 处理文件选择
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }

    // 验证文件大小（限制为 5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB')
      return
    }

    setError('')

    // 如果提供了自定义上传函数，使用它
    if (onUpload) {
      try {
        setIsUploading(true)
        const url = await onUpload(file)
        setImageUrl(url)
        setPreviewUrl(url)
        setIsUploading(false)
      } catch (err) {
        setIsUploading(false)
        setError(err instanceof Error ? err.message : '上传失败，请重试')
      }
    } else {
      // 否则使用默认的 Base64 转换
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setPreviewUrl(base64)
        setImageUrl(base64)
      }
      reader.onerror = () => {
        setError('读取文件失败')
      }
      reader.readAsDataURL(file)
    }
  }, [onUpload])

  // 处理 URL 输入
  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setImageUrl(url)
    
    if (url) {
      // 简单验证 URL 格式
      try {
        new URL(url)
        setPreviewUrl(url)
        setError('')
      } catch {
        setError('请输入有效的图片 URL')
      }
    } else {
      setPreviewUrl('')
      setError('')
    }
  }, [])

  // 处理确认
  const handleConfirm = useCallback(() => {
    if (!imageUrl) {
      setError('请选择图片或输入图片 URL')
      return
    }

    if (isUploading) {
      setError('图片正在上传中，请稍候')
      return
    }

    onConfirm(imageUrl, imageAlt || undefined)
    resetStates()
  }, [imageUrl, imageAlt, isUploading, onConfirm, resetStates])

  // 处理取消
  const handleCancel = useCallback(() => {
    onCancel()
    resetStates()
  }, [onCancel, resetStates])

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }, [handleConfirm, handleCancel])

  // 切换上传方式时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      if (uploadType === 'url') {
        urlInputRef.current?.focus()
      }
    }
  }, [uploadType, isOpen])

  if (!isOpen) return null

  return (
    <div className="image-upload-overlay" onClick={handleCancel}>
      <div className="image-upload-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="image-upload-header">
          <h3>插入图片</h3>
          <button className="image-upload-close" onClick={handleCancel} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="image-upload-tabs">
          <button
            className={`image-upload-tab ${uploadType === 'file' ? 'active' : ''}`}
            onClick={() => setUploadType('file')}
          >
            上传文件
          </button>
          <button
            className={`image-upload-tab ${uploadType === 'url' ? 'active' : ''}`}
            onClick={() => setUploadType('url')}
          >
            图片链接
          </button>
        </div>

        <div className="image-upload-content">
          {uploadType === 'file' ? (
            <div className="image-upload-file">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="image-upload-input-hidden"
                id="imageFileInput"
              />
              <label htmlFor="imageFileInput" className="image-upload-file-label">
                {isUploading ? (
                  <>
                    <div className="image-upload-file-icon">⏳</div>
                    <div className="image-upload-file-text">
                      正在上传图片...
                    </div>
                  </>
                ) : (
                  <>
                    <div className="image-upload-file-icon">📁</div>
                    <div className="image-upload-file-text">
                      点击选择图片或拖拽图片到此处
                    </div>
                    <div className="image-upload-file-hint">
                      支持 JPG、PNG、GIF 等格式，最大 5MB
                    </div>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div className="image-upload-url">
              <label htmlFor="imageUrlInput" className="image-upload-label">
                图片 URL
              </label>
              <input
                ref={urlInputRef}
                id="imageUrlInput"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={handleUrlChange}
                className="image-upload-input"
              />
            </div>
          )}

          <div className="image-upload-alt">
            <label htmlFor="imageAltInput" className="image-upload-label">
              图片描述（可选）
            </label>
            <input
              id="imageAltInput"
              type="text"
              placeholder="为图片添加描述文字"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              className="image-upload-input"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="image-upload-error">
              ⚠️ {error}
            </div>
          )}

          {/* 预览 */}
          {previewUrl && (
            <div className="image-upload-preview">
              <label className="image-upload-label">预览</label>
              <div className="image-upload-preview-wrapper">
                <img src={previewUrl} alt={imageAlt || '图片预览'} />
              </div>
            </div>
          )}
        </div>

        <div className="image-upload-footer">
          <button className="image-upload-button secondary" onClick={handleCancel}>
            取消
          </button>
          <button 
            className="image-upload-button primary" 
            onClick={handleConfirm}
            disabled={!imageUrl || !!error || isUploading}
          >
            {isUploading ? '上传中...' : '插入图片'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImageUploadDialog
