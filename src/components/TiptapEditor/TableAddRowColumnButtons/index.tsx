import { Editor } from '@tiptap/react'
import { useCallback } from 'react'
import { Plus } from 'lucide-react'
import { config } from '@/config'
import { useTableInsertRowRunAndClose } from '@/hooks/useTableInsertRowRunAndClose'
import { useTableInsertColumnRunAndClose } from '@/hooks/useTableInsertColumnRunAndClose'
import './TableAddRowColumnButtons.css'

/** 下方/右侧加号条尺寸，与 config.TABLE_ACTION_BUTTON_SIZE 一致，供 TableRowActions 计算 scroll wrapper 用 */
export const TABLE_ADD_BAR_SIZE = config.TABLE_ACTION_BUTTON_SIZE

export interface TableAddRowColumnButtonsProps {
  tableSize: { width: number; height: number } | null
  focusedTableIndex: number | null
  editor: Editor
  editorWrapperRef: React.RefObject<HTMLDivElement | null>
}

const TableAddRowColumnButtons = ({
  tableSize,
  focusedTableIndex,
  editor,
  editorWrapperRef,
}: TableAddRowColumnButtonsProps) => {
  const getRowTarget = useCallback(() => {
    if (focusedTableIndex == null) return null
    const proseMirror = editorWrapperRef.current?.querySelector('.ProseMirror')
    const tables = proseMirror?.querySelectorAll('table')
    const table = tables?.[focusedTableIndex] as HTMLTableElement | undefined
    if (!table) return null
    const lastRow = table.rows[table.rows.length - 1]
    const firstCell = lastRow?.cells[0]
    if (!firstCell) return null
    try {
      const pos = editor.view.posAtDOM(firstCell, 0)
      return {
        rowFirstCellPos: pos,
        tableIndex: focusedTableIndex,
        rowIndex: table.rows.length - 1,
      }
    } catch {
      return null
    }
  }, [editor, editorWrapperRef, focusedTableIndex])

  const getColumnTarget = useCallback(() => {
    if (focusedTableIndex == null) return null
    const proseMirror = editorWrapperRef.current?.querySelector('.ProseMirror')
    const tables = proseMirror?.querySelectorAll('table')
    const table = tables?.[focusedTableIndex] as HTMLTableElement | undefined
    if (!table) return null
    const firstRow = table.rows[0]
    const lastCell = firstRow?.cells[firstRow.cells.length - 1]
    if (!lastCell) return null
    try {
      const pos = editor.view.posAtDOM(lastCell, 0)
      return {
        columnFirstCellPos: pos,
        tableIndex: focusedTableIndex,
        columnIndex: firstRow.cells.length - 1,
      }
    } catch {
      return null
    }
  }, [editor, editorWrapperRef, focusedTableIndex])

  const runRow = useTableInsertRowRunAndClose(
    editor,
    editorWrapperRef,
    getRowTarget,
    () => {}
  )
  const runColumn = useTableInsertColumnRunAndClose(
    editor,
    editorWrapperRef,
    getColumnTarget,
    () => {}
  )

  const handleAddRowBelow = useCallback(() => {
    if (focusedTableIndex == null) return
    runRow(() => editor.chain().focus().addRowAfter().run(), 'saved')
  }, [editor, focusedTableIndex, runRow])

  const handleAddColumnRight = useCallback(() => {
    if (focusedTableIndex == null) return
    runColumn(() => editor.chain().focus().addColumnAfter().run(), 'after')
  }, [editor, focusedTableIndex, runColumn])

  if (tableSize == null || focusedTableIndex == null) {
    return null
  }

  const barSize = config.TABLE_ACTION_BUTTON_SIZE
  const gap = config.TABLE_ADD_BAR_GAP
  return (
    <>
      <button
        type="button"
        className="table-add-row-below-trigger"
        aria-label="在下方插入行"
        style={{
          top: `${tableSize.height + gap}px`,
          left: 0,
          width: `${tableSize.width}px`,
          height: barSize,
        }}
        onMouseDown={e => e.preventDefault()}
        onClick={handleAddRowBelow}
      >
        <Plus className="table-add-trigger-icon" size={10} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="table-add-column-right-trigger"
        aria-label="在右侧插入列"
        style={{
          left: `${tableSize.width + gap}px`,
          top: 0,
          width: barSize,
          height: `${tableSize.height}px`,
        }}
        onMouseDown={e => e.preventDefault()}
        onClick={handleAddColumnRight}
      >
        <Plus className="table-add-trigger-icon" size={10} aria-hidden="true" />
      </button>
    </>
  )
}

export default TableAddRowColumnButtons
