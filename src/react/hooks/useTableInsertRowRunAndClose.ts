import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'

/** 插行/删行时用的目标：当前行首格位置与行索引 */
export interface TableRowMenuTarget {
  rowFirstCellPos: number
  tableIndex: number
  rowIndex: number
}

/** 插行后恢复方式：数字为相对 target 行的偏移，'saved' 为恢复到操作前的行（原单元格） */
export type RowFocusOffset = number | 'saved'

/**
 * 表格插行（及删行等行操作）：执行前把选区移到目标行首格，执行命令，插行后可按 rowFocusOffset 恢复光标。
 * rowFocusOffset 为数字时恢复到 target.rowIndex + offset 行；为 'saved' 时恢复到操作前的 (行, 列)。
 */
export function useTableInsertRowRunAndClose(
  editor: Editor,
  editorWrapperRef: React.RefObject<HTMLDivElement | null>,
  getRowTarget: () => TableRowMenuTarget | null,
  onClose: () => void
): (fn: () => void, rowFocusOffset?: RowFocusOffset) => void {
  return useCallback(
    (fn: () => void, rowFocusOffset?: RowFocusOffset) => {
      const target = getRowTarget()
      let columnIndex: number | null = null
      let savedRowIndex: number | null = null

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
              savedRowIndex = Array.from((table as HTMLTableElement).rows).indexOf(
                tr as HTMLTableRowElement
              )
            }
          }
        } catch {
          // ignore
        }
        const doc = state.doc
        if (
          target.rowFirstCellPos >= 0 &&
          target.rowFirstCellPos <= doc.content.size
        ) {
          view.dispatch(
            state.tr.setSelection(
              TextSelection.create(doc, target.rowFirstCellPos)
            )
          )
        }
      }

      fn()

      if (
        rowFocusOffset !== undefined &&
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
          const restoreRowIndex =
            rowFocusOffset === 'saved' && savedRowIndex !== null
              ? savedRowIndex
              : typeof rowFocusOffset === 'number'
                ? target.rowIndex + rowFocusOffset
                : -1
          const cell =
            restoreRowIndex >= 0
              ? table?.rows[restoreRowIndex]?.cells[columnIndex]
              : undefined
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
    [editor, editorWrapperRef, getRowTarget, onClose]
  )
}
