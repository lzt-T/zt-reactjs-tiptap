import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'

/** 插列/删列时用的目标：当前列首格位置与列索引 */
export interface TableColumnMenuTarget {
  columnFirstCellPos: number
  tableIndex: number
  columnIndex: number
}

/**
 * 表格插列（及删列等列操作）：执行前把选区移到目标列首格，执行命令，插列后可按 colRestore 恢复光标到原单元格。
 */
export function useTableInsertColumnRunAndClose(
  editor: Editor,
  editorWrapperRef: React.RefObject<HTMLDivElement | null>,
  getColumnTarget: () => TableColumnMenuTarget | null,
  onClose: () => void
): (fn: () => void, colRestore?: 'before' | 'after') => void {
  return useCallback(
    (fn: () => void, colRestore?: 'before' | 'after') => {
      const target = getColumnTarget()
      let columnIndex: number | null = null
      let rowIndex: number | null = null

      if (target) {
        const { state, view } = editor
        try {
          const domAtPos = view.domAtPos(view.state.selection.from)
          const el =
            domAtPos.node instanceof Element
              ? domAtPos.node
              : (domAtPos.node as Node).parentElement
          const cell = el?.closest?.('td, th')
          const tr = el?.closest?.('tr')
          const table = el?.closest?.('table')
          if (cell) {
            columnIndex = (cell as HTMLTableCellElement).cellIndex
            if (tr && table) {
              rowIndex = Array.from((table as HTMLTableElement).rows).indexOf(
                tr as HTMLTableRowElement
              )
            }
          }
        } catch {
          // ignore
        }
        const doc = state.doc
        if (
          target.columnFirstCellPos >= 0 &&
          target.columnFirstCellPos <= doc.content.size
        ) {
          view.dispatch(
            state.tr.setSelection(
              TextSelection.create(doc, target.columnFirstCellPos)
            )
          )
        }
      }

      fn()

      if (
        colRestore &&
        rowIndex !== null &&
        columnIndex !== null &&
        target
      ) {
        try {
          const proseMirror =
            editorWrapperRef.current?.querySelector('.ProseMirror')
          const tables = proseMirror?.querySelectorAll('table')
          const table = tables?.[target.tableIndex] as
            | HTMLTableElement
            | undefined
          const newColIndex =
            colRestore === 'before'
              ? columnIndex >= target.columnIndex
                ? columnIndex + 1
                : columnIndex
              : columnIndex
          const cell = table?.rows[rowIndex]?.cells[newColIndex]
          if (cell) {
            const { view, state } = editor
            const pos = view.posAtDOM(cell, cell.childNodes.length)
            if (pos >= 0 && pos <= state.doc.content.size) {
              view.dispatch(
                state.tr.setSelection(TextSelection.create(state.doc, pos))
              )
            }
          }
        } catch {
          // ignore
        }
      }

      onClose()
    },
    [editor, editorWrapperRef, getColumnTarget, onClose]
  )
}
