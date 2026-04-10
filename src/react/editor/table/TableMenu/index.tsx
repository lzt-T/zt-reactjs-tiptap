// 已废弃，使用 TableRowActions 代替
import { Editor } from '@tiptap/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  Merge,
  SplitSquareVertical,
  LayoutList,
} from 'lucide-react'
import './TableMenu.css'

interface TableMenuProps {
  editor: Editor
  editorWrapperRef: React.RefObject<HTMLDivElement | null>
}

const TableMenu = ({ editor, editorWrapperRef }: TableMenuProps) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updatePosition = () => {
      const wrapper = editorWrapperRef.current
      if (!editor.isActive('table') || !wrapper) {
        setPosition(null)
        return
      }

      const { view } = editor
      const { from } = view.state.selection
      const domAtPos = view.domAtPos(from)
      const tableElement = (domAtPos.node as Element).closest('table')
      const cellElement = (domAtPos.node as Element).closest('td, th')

      if (tableElement) {
        const wrapperRect = wrapper.getBoundingClientRect()
        const MENU_HEIGHT = 40

        const rect = cellElement
          ? cellElement.getBoundingClientRect()
          : tableElement.getBoundingClientRect()
        const rectTopInWrapper = rect.top - wrapperRect.top + wrapper.scrollTop
        const rectLeftInWrapper = rect.left - wrapperRect.left + wrapper.scrollLeft

        /* 始终显示在单元格/表格上方，不翻到底部 */
        const top = rectTopInWrapper - MENU_HEIGHT

        setPosition({ top, left: rectLeftInWrapper })
      }
    }

    updatePosition()

    editor.on('selectionUpdate', updatePosition)
    editor.on('update', updatePosition)

    const wrapper = editorWrapperRef.current
    wrapper?.addEventListener('scroll', updatePosition)

    return () => {
      editor.off('selectionUpdate', updatePosition)
      editor.off('update', updatePosition)
      wrapper?.removeEventListener('scroll', updatePosition)
    }
  }, [editor, editorWrapperRef])

  // 渲染后修正水平溢出，确保不超出 wrapper 右边界（仅当需要修正时才 setState，避免无限循环）
  useLayoutEffect(() => {
    const wrapper = editorWrapperRef.current
    if (!menuRef.current || !position || !wrapper) return

    const menuWidth = menuRef.current.offsetWidth
    const wrapperWidth = wrapper.clientWidth
    const maxLeft = wrapperWidth - menuWidth - 8
    const clampedLeft = Math.max(0, maxLeft)

    if (position.left !== clampedLeft && position.left > maxLeft) {
      setPosition(prev => prev ? { ...prev, left: clampedLeft } : prev)
    }
  }, [position, editorWrapperRef])

  if (!editor.isActive('table') || !position) {
    return null
  }

  return (
    <div
      ref={menuRef}
      className="table-menu"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <button
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        title="在左侧插入列"
      >
        <ArrowLeft size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="在右侧插入列"
      >
        <ArrowRight size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="删除当前列"
        disabled={!editor.can().deleteColumn()}
      >
        <Trash2 size={16} />
      </button>
      <span className="separator">|</span>
      <button
        onClick={() => editor.chain().focus().addRowBefore().run()}
        title="在上方插入行"
      >
        <ArrowUp size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="在下方插入行"
      >
        <ArrowDown size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="删除当前行"
        disabled={!editor.can().deleteRow()}
      >
        <Trash2 size={16} />
      </button>
      <span className="separator">|</span>
      <button
        onClick={() => editor.chain().focus().mergeCells().run()}
        title="合并单元格（需先选中多个单元格）"
        disabled={!('mergeCells' in editor.commands) || !editor.can().mergeCells?.()}
      >
        <Merge size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().splitCell().run()}
        title="拆分单元格"
        disabled={!('splitCell' in editor.commands) || !editor.can().splitCell?.()}
      >
        <SplitSquareVertical size={16} />
      </button>
      <span className="separator">|</span>
      <button
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        title="切换表头行"
      >
        <LayoutList size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="删除整个表格"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export default TableMenu
