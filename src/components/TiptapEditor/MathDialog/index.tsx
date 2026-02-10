import { useState, useEffect, useRef } from 'react'
import katex from 'katex'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import './MathDialog.css'

interface MathDialogProps {
  isOpen: boolean
  initialValue?: string
  type: 'inline' | 'block'
  onConfirm: (latex: string) => void
  onCancel: () => void
}

const MathDialog = ({ isOpen, initialValue = '', type, onConfirm, onCancel }: MathDialogProps) => {
  const [latex, setLatex] = useState('')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // Reset latex when dialog opens with new initial value
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setLatex(initialValue)
      })
    }
  }, [isOpen, initialValue])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen])

  // Update preview when latex changes
  useEffect(() => {
    if (previewRef.current && latex) {
      try {
        katex.render(latex, previewRef.current, {
          displayMode: type === 'block',
          throwOnError: false,
          errorColor: '#dc2626',
        })
        setPreviewError(null)
      } catch (error) {
        setPreviewError((error as Error).message)
      }
    } else if (previewRef.current) {
      previewRef.current.innerHTML = ''
      setPreviewError(null)
    }
  }, [latex, type])

  const handleConfirm = () => {
    onConfirm(latex)
    setLatex('')
  }

  const handleCancel = () => {
    onCancel()
    setLatex('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" showCloseButton={false}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{type === 'inline' ? '插入行内公式' : '插入块级公式'}</DialogTitle>
        </DialogHeader>

        <div className="math-dialog-body space-y-4 min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <label htmlFor="latex-input" className="text-sm font-medium">
              LaTeX 公式:
            </label>
            <textarea
              ref={inputRef}
              id="latex-input"
              className="math-dialog-input"
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={type === 'inline' ? 'E = mc^2' : '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}'}
              rows={type === 'inline' ? 3 : 5}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">预览:</label>
            <div className="math-dialog-preview">
              <div ref={previewRef} className="math-dialog-preview-content"></div>
              {!latex && <div className="math-dialog-preview-placeholder">输入公式后将显示预览...</div>}
              {previewError && <div className="math-dialog-preview-error">预览错误: {previewError}</div>}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MathDialog
