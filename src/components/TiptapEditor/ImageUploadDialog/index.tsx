import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  const resetStates = useCallback(() => {
    setUploadType('file')
    setImageUrl('')
    setPreviewUrl('')
    setError('')
    setIsUploading(false)
    setIsDragOver(false)
  }, [])

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB')
      return
    }

    setError('')

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    if (!isUploading) setIsDragOver(true)
  }, [isUploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (isUploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [isUploading, processFile])

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setImageUrl(url)

    if (url) {
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

  const handleConfirm = useCallback(() => {
    if (!imageUrl) {
      setError('请选择图片或输入图片 URL')
      return
    }

    if (isUploading) {
      setError('图片正在上传中，请稍候')
      return
    }

    onConfirm(imageUrl)
    resetStates()
  }, [imageUrl, isUploading, onConfirm, resetStates])

  const handleCancel = useCallback(() => {
    onCancel()
    resetStates()
  }, [onCancel, resetStates])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }, [handleConfirm, handleCancel])

  useEffect(() => {
    if (isOpen && uploadType === 'url') {
      urlInputRef.current?.focus()
    }
  }, [uploadType, isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent
        className="image-upload-dialog-content max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        showCloseButton={false}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>插入图片</DialogTitle>
        </DialogHeader>

        <div className="image-upload-tabs">
          <button
            type="button"
            className={`image-upload-tab ${uploadType === 'file' ? 'active' : ''}`}
            onClick={() => setUploadType('file')}
          >
            上传文件
          </button>
          <button
            type="button"
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
              <label
                htmlFor="imageFileInput"
                className={`image-upload-file-label ${isDragOver ? 'is-drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isUploading ? (
                  <>
                    <div className="image-upload-file-icon">⏳</div>
                    <div className="image-upload-file-text">正在上传图片...</div>
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
            <div className="image-upload-url space-y-2">
              <Label htmlFor="imageUrlInput">图片 URL</Label>
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

          {error && (
            <div className="image-upload-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          {previewUrl && (
            <div className="image-upload-preview space-y-2">
              <Label>预览</Label>
              <div className="image-upload-preview-wrapper">
                <img src={previewUrl} alt="图片预览" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!imageUrl || !!error || isUploading}
          >
            {isUploading ? '上传中...' : '插入图片'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImageUploadDialog
