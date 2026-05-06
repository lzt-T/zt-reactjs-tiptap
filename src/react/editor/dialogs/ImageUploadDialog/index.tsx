import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/react/components/ui/dialog'
import { Button } from '@/react/components/ui/button'
import { Label } from '@/react/components/ui/label'
import { SegmentedSwitch } from '@/react/components/SegmentedSwitch'
import { Loader2, ImagePlus, AlertCircle, ImageOff } from 'lucide-react'
import { config } from '@/shared/config'
import { formatFileSize } from '@/shared/utils/utils'
import type { EditorLocale } from '@/shared/locales'
import type { EditorErrorEvent } from '@/react/editor/types'
import './ImageUploadDialog.css'

interface ImageUploadDialogProps {
  isOpen: boolean
  onConfirm: (src: string, alt?: string) => void
  onCancel: () => void
  onPreUpload?: (file: File) => Promise<string>
  onUpload?: (payload: { file: File; url: string; alt?: string }) => void | Promise<void>
  onError?: (event: EditorErrorEvent) => void
  /** 图片最大体积（字节），超过则拒绝 */
  imageMaxSizeBytes?: number
  locale: EditorLocale
  /** 为 true 时标记为编辑器焦点保活区域，避免 NotionLike 下误触发 blur 收口 */
  preserveEditorFocus?: boolean
  /** 弹窗挂载容器，用于继承编辑器作用域主题变量 */
  portalContainer?: HTMLElement | null
}

const ImageUploadDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  onPreUpload,
  onUpload,
  onError,
  imageMaxSizeBytes = config.IMAGE_MAX_SIZE_BYTES,
  locale,
  preserveEditorFocus = false,
  portalContainer,
}: ImageUploadDialogProps) => {
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [previewLoadError, setPreviewLoadError] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  // 上传进行中时锁定可能触发二次上传的交互入口（保留 Cancel 可用）
  const isInteractionLocked = isUploading
  // 仅在上传中或已有图片结果时保留重选提示区域，避免初始空态出现多余留白
  const shouldReserveReselectHint = uploadType === 'file' && (isUploading || Boolean(imageUrl))
  // 仅在可重选阶段展示提示文案；容器常驻用于稳定布局高度
  const shouldShowReselectHint = uploadType === 'file' && Boolean(imageUrl) && !isUploading
  /** 上传类型切换选项。 */
  const uploadTypeOptions = [
    { label: locale.imageDialog.uploadFileTab, value: 'file' },
    { label: locale.imageDialog.imageUrlTab, value: 'url' },
  ]

  const resetStates = useCallback(() => {
    setUploadType('file')
    setSelectedFile(null)
    setImageUrl('')
    setPreviewLoadError(false)
    setError('')
    setIsUploading(false)
    setIsDragOver(false)
  }, [])

  /** 校验并处理图片文件，生成可预览地址或上报上传错误。 */
  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSelectedFile(null)
      setImageUrl('')
      setError(locale.imageDialog.invalidImageFile)
      return
    }

    const maxBytes = imageMaxSizeBytes
    if (file.size > maxBytes) {
      setSelectedFile(null)
      setImageUrl('')
      setError(locale.imageDialog.imageSizeExceeded(formatFileSize(maxBytes)))
      return
    }

    setError('')

    setSelectedFile(file)

    if (onPreUpload) {
      try {
        setIsUploading(true)
        const url = await onPreUpload(file)
        setPreviewLoadError(false)
        setImageUrl(url)
        setIsUploading(false)
      } catch (err) {
        setIsUploading(false)
        setImageUrl('')
        onError?.({
          source: 'image-upload',
          stage: 'pre-upload',
          message: err instanceof Error ? err.message : locale.imageDialog.uploadFailed,
          error: err,
        })
        setError(
          err instanceof Error ? err.message : locale.imageDialog.uploadFailed
        )
      }
    } else {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setPreviewLoadError(false)
        setImageUrl(base64)
      }
      reader.onerror = () => {
        setError(locale.imageDialog.fileReadFailed)
      }
      reader.readAsDataURL(file)
    }
  }, [onPreUpload, onError, imageMaxSizeBytes, locale])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 上传中禁止进入拖拽高亮态，避免误导用户仍可重新上传
    if (isInteractionLocked) return
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [isInteractionLocked])

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
    // 上传中直接忽略 drop，防止并发触发新的上传流程
    if (isInteractionLocked) return
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [isInteractionLocked, processFile])

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setSelectedFile(null)
    setPreviewLoadError(false)
    setImageUrl(url)

    if (url) {
      try {
        new URL(url)
        setError('')
      } catch {
        setError(locale.imageDialog.invalidImageUrl)
      }
    } else {
      setError('')
    }
  }, [locale])

  const handleConfirm = useCallback(() => {
    if (!imageUrl) {
      setError(locale.imageDialog.selectOrEnterImage)
      return
    }

    if (isUploading) {
      setError(locale.imageDialog.uploadingWait)
      return
    }

    onConfirm(imageUrl)
    if (uploadType === 'file' && selectedFile && onUpload) {
      void Promise.resolve(onUpload({ file: selectedFile, url: imageUrl })).catch((err: unknown) => {
        onError?.({
          source: 'image-upload',
          stage: 'confirm',
          message: err instanceof Error ? err.message : locale.imageDialog.uploadFailed,
          error: err,
        })
      })
    }
    resetStates()
  }, [
    imageUrl,
    isUploading,
    locale,
    onConfirm,
    onUpload,
    onError,
    resetStates,
    selectedFile,
    uploadType,
  ])

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
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleCancel()}>
      <DialogContent
        className="image-upload-dialog-content max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        showCloseButton={false}
        onKeyDown={handleKeyDown}
        data-editor-focus-retained={preserveEditorFocus ? 'true' : undefined}
        portalContainer={portalContainer}
      >
        <DialogHeader>
          <DialogTitle>{locale.imageDialog.title}</DialogTitle>
        </DialogHeader>

        <SegmentedSwitch
          className="image-upload-segmented-switch"
          value={uploadType}
          options={uploadTypeOptions}
          disabled={isInteractionLocked}
          onChange={(next) => setUploadType(next as 'file' | 'url')}
        />

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
                disabled={isInteractionLocked}
              />
              <label
                htmlFor="imageFileInput"
                className={`image-upload-file-label ${isDragOver ? 'is-drag-over' : ''} ${imageUrl ? 'has-preview' : ''} ${isInteractionLocked ? 'is-disabled' : ''}`}
                aria-disabled={isInteractionLocked}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isUploading ? (
                  <>
                    <div className="image-upload-file-icon">
                      <Loader2 size={40} className="image-upload-file-icon-spin" />
                    </div>
                    <div className="image-upload-file-text">
                      {locale.imageDialog.uploadingImage}
                    </div>
                  </>
                ) : imageUrl ? (
                  <div className="image-upload-file-preview">
                    {previewLoadError ? (
                      <div className="image-upload-file-preview-error">
                        <ImageOff size={40} />
                        <span>{locale.imageDialog.imageLoadFailed}</span>
                      </div>
                    ) : (
                      <img
                        src={imageUrl}
                        alt=""
                        onLoad={() => setPreviewLoadError(false)}
                        onError={() => setPreviewLoadError(true)}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="image-upload-file-icon">
                      <ImagePlus size={40} />
                    </div>
                    <div className="image-upload-file-text">
                      {locale.imageDialog.clickOrDrag}
                    </div>
                    <div className="image-upload-file-hint">
                      {locale.imageDialog.supportsAndMax(
                        formatFileSize(imageMaxSizeBytes)
                      )}
                    </div>
                  </>
                )}
              </label>
              {shouldReserveReselectHint && (
                <div
                  className={`image-upload-file-hint image-upload-file-reselect-hint ${shouldShowReselectHint ? '' : 'is-placeholder'}`}
                >
                  {locale.imageDialog.reselectHint}
                </div>
              )}
            </div>
          ) : (
            <div className="image-upload-url space-y-2">
              <Label htmlFor="imageUrlInput">
                {locale.imageDialog.imageUrlLabel}
              </Label>
              <input
                ref={urlInputRef}
                id="imageUrlInput"
                type="url"
                placeholder={locale.imageDialog.imageUrlPlaceholder}
                value={imageUrl}
                onChange={handleUrlChange}
                className="image-upload-input"
                disabled={isInteractionLocked}
              />
            </div>
          )}

          {error && (
            <div className="image-upload-error" role="alert" aria-live="polite">
              <AlertCircle size={16} className="image-upload-error-icon" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {locale.imageDialog.cancel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!imageUrl || !!error || isUploading}
          >
            {isUploading
              ? locale.imageDialog.uploading
              : locale.imageDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImageUploadDialog
