import { Editor } from '@tiptap/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { TextSelection } from '@tiptap/pm/state'
import {
  EllipsisVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Merge,
  SplitSquareVertical,
  LayoutList,
} from 'lucide-react'
import './TableRowActions.css'

export interface RowActionItem {
  top: number
  left: number
  height: number
  firstCellPos: number
  tableIndex: number
  rowIndex: number
}

interface TableRowActionsProps {
  editor: Editor
  editorWrapperRef: React.RefObject<HTMLDivElement | null>
}

/** 行操作按钮宽度，与 CSS 保持一致 */
const ROW_BUTTON_WIDTH = 10
/** 按钮与表格左边缘的间距 */
const ROW_BUTTON_GAP = 2
/** 行操作弹出菜单高度，用于在按钮上方定位 */
const ROW_ACTION_MENU_HEIGHT = 36
const ROW_ACTION_MENU_GAP = 4

const TableRowActions = ({ editor, editorWrapperRef }: TableRowActionsProps) => {
  const [rows, setRows] = useState<RowActionItem[]>([])
  /** 当前选区所在行的 key，仅该行显示操作按钮 */
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null)
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  /** 打开菜单时记录目标行信息，执行菜单项时用 */
  const menuTargetRef = useRef<{
    firstCellPos: number
    tableIndex: number
    rowIndex: number
  } | null>(null)

  const updatePositions = useCallback(() => {
    const wrapper = editorWrapperRef.current
    if (!editor.isActive('table') || !wrapper) {
      setRows([])
      return
    }

    const { view } = editor
    const proseMirror = wrapper.querySelector('.ProseMirror')
    if (!proseMirror) return

    const tables = proseMirror.querySelectorAll('table')
    const wrapperRect = wrapper.getBoundingClientRect()
    const result: RowActionItem[] = []
    let tableIndex = 0
    for (const table of tables) {
      /* 根据表格实际左边位置动态计算按钮 left，兼容任务列表等缩进场景 */
      const tableRect = table.getBoundingClientRect()
      const tableLeft = tableRect.left - wrapperRect.left + wrapper.scrollLeft
      const left = Math.max(0, tableLeft - ROW_BUTTON_WIDTH - ROW_BUTTON_GAP)
      const trs = table.querySelectorAll('tr')
      trs.forEach((tr, rowIndex) => {
        const firstCell = (tr as HTMLTableRowElement).cells[0]
        if (!firstCell) return
        try {
          const pos = view.posAtDOM(firstCell, 0)
          const trRect = tr.getBoundingClientRect()
          const top = trRect.top - wrapperRect.top + wrapper.scrollTop
          result.push({
            top,
            left,
            height: trRect.height,
            firstCellPos: pos + 1,
            tableIndex,
            rowIndex,
          })
        } catch {
          // posAtDOM may throw if node not in view
        }
      })
      tableIndex++
    }
    setRows(result)

    /* 根据选区确定聚焦行，仅该行显示操作按钮 */
    let nextFocusedKey: string | null = null
    try {
      const { from } = view.state.selection
      const domAtPos = view.domAtPos(from)
      const el =
        domAtPos.node instanceof Element
          ? domAtPos.node
          : (domAtPos.node as Node).parentElement
      const tr = el?.closest?.('tr')
      const table = tr?.closest?.('table')
      if (table && tr && tables.length) {
        const ti = Array.from(tables).indexOf(table)
        const ri = Array.from((table as HTMLTableElement).rows).indexOf(
          tr as HTMLTableRowElement
        )
        if (ti >= 0 && ri >= 0) nextFocusedKey = `${ti}-${ri}`
      }
    } catch {
      // ignore
    }
    setFocusedRowKey(nextFocusedKey)
  }, [editor, editorWrapperRef])

  useEffect(() => {
    updatePositions()
    editor.on('selectionUpdate', updatePositions)
    editor.on('update', updatePositions)
    const wrapper = editorWrapperRef.current
    wrapper?.addEventListener('scroll', updatePositions)
    return () => {
      editor.off('selectionUpdate', updatePositions)
      editor.off('update', updatePositions)
      wrapper?.removeEventListener('scroll', updatePositions)
    }
  }, [editor, editorWrapperRef, updatePositions])

  const handleRowButtonClick = useCallback(
    (e: React.MouseEvent, item: RowActionItem) => {
      e.preventDefault()
      e.stopPropagation()
      const key = `${item.tableIndex}-${item.rowIndex}`
      menuTargetRef.current = {
        firstCellPos: item.firstCellPos,
        tableIndex: item.tableIndex,
        rowIndex: item.rowIndex,
      }
      const btn = buttonRefs.current.get(key)
      if (btn) {
        const wrapper = editorWrapperRef.current
        if (wrapper) {
          const br = btn.getBoundingClientRect()
          const wr = wrapper.getBoundingClientRect()
          /* 菜单显示在按钮上方，不显示在底部 */
          setMenuPosition({
            top: br.top - wr.top + wrapper.scrollTop - ROW_ACTION_MENU_HEIGHT - ROW_ACTION_MENU_GAP,
            left: br.left - wr.left + wrapper.scrollLeft,
          })
        }
      }
      setOpenMenuKey(key)
    },
    [editorWrapperRef]
  )

  const closeMenu = useCallback(() => {
    setOpenMenuKey(null)
    setMenuPosition(null)
    menuTargetRef.current = null
  }, [])

  /**
   * @param setSelectionToRow 行操作需先将选区移到目标行；列操作传 false 跳过此步骤
   * @param rowFocusOffset 插行后光标行偏移：0=留在本行（下方插行），1=下一行（上方插行），不传则不恢复列
   */
  const runAndClose = useCallback(
    (fn: () => void, setSelectionToRow = true, rowFocusOffset?: number) => {
      let columnIndex: number | null = null
      if (setSelectionToRow) {
        const target = menuTargetRef.current
        if (target) {
          const { state, view } = editor
          /* 先读出当前列，插行后用于恢复光标到原列 */
          try {
            const domAtPos = view.domAtPos(view.state.selection.from)
            const el =
              domAtPos.node instanceof Element
                ? domAtPos.node
                : (domAtPos.node as Node).parentElement
            const cell = el?.closest?.('td, th')
            if (cell) columnIndex = (cell as HTMLTableCellElement).cellIndex
          } catch {
            // ignore
          }
          const doc = state.doc
          if (target.firstCellPos >= 0 && target.firstCellPos <= doc.content.size) {
            view.dispatch(
              state.tr.setSelection(TextSelection.create(doc, target.firstCellPos))
            )
          }
        }
      }
      fn()
      /* 插行后把光标移回原列 */
      if (setSelectionToRow && rowFocusOffset !== undefined && columnIndex !== null) {
        const target = menuTargetRef.current
        if (target) {
          try {
            const proseMirror = editorWrapperRef.current?.querySelector('.ProseMirror')
            const tables = proseMirror?.querySelectorAll('table')
            const table = tables?.[target.tableIndex] as HTMLTableElement | undefined
            const cell = table?.rows[target.rowIndex + rowFocusOffset]?.cells[columnIndex]
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
      }
      closeMenu()
    },
    [editor, editorWrapperRef, closeMenu]
  )

  useEffect(() => {
    if (!openMenuKey) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    const onClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !rows.some(
          r =>
            buttonRefs.current.get(`${r.tableIndex}-${r.rowIndex}`)?.contains(e.target as Node)
        )
      ) {
        closeMenu()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    setTimeout(() => document.addEventListener('click', onClickOutside, true), 0)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClickOutside, true)
    }
  }, [openMenuKey, closeMenu, rows])

  if (!editor.isActive('table') || rows.length === 0) {
    return null
  }

  const visibleRows = rows.filter(item => {
    const key = `${item.tableIndex}-${item.rowIndex}`
    return key === focusedRowKey || key === openMenuKey
  })

  return (
    <>
      {visibleRows.map(item => {
        const key = `${item.tableIndex}-${item.rowIndex}`
        return (
          <button
            key={key}
            ref={el => {
              if (el) buttonRefs.current.set(key, el)
            }}
            type="button"
            className="table-row-action-trigger"
            aria-label="行操作"
            style={{
              top: `${item.top}px`,
              left: `${item.left}px`,
              height: `${item.height}px`,
            }}
            onMouseDown={e => e.preventDefault()}
            onClick={e => handleRowButtonClick(e, item)}
          >
            <EllipsisVertical className="table-row-action-icon" size={14} aria-hidden="true" />
          </button>
        )
      })}
      {openMenuKey && menuPosition && (
        <div
          ref={menuRef}
          className="table-row-action-menu"
          role="menu"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          onMouseDown={e => e.preventDefault()}
        >
          <button
            type="button"
            role="menuitem"
            title="在上方插入行"
            onClick={() =>
              runAndClose(() => editor.chain().focus().addRowBefore().run(), true, 1)
            }
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title="在下方插入行"
            onClick={() =>
              runAndClose(() => editor.chain().focus().addRowAfter().run(), true, 0)
            }
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title="删除当前行"
            disabled={!editor.can().deleteRow()}
            onClick={() =>
              runAndClose(() => editor.chain().focus().deleteRow().run())
            }
          >
            <Trash2 size={16} />
          </button>
          <span className="separator" />
          <button
            type="button"
            role="menuitem"
            title="在左侧插入列"
            onClick={() =>
              runAndClose(() => editor.chain().focus().addColumnBefore().run(), false)
            }
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title="在右侧插入列"
            onClick={() =>
              runAndClose(() => editor.chain().focus().addColumnAfter().run(), false)
            }
          >
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title="删除当前列"
            disabled={!editor.can().deleteColumn()}
            onClick={() =>
              runAndClose(() => editor.chain().focus().deleteColumn().run(), false)
            }
          >
            <Trash2 size={16} />
          </button>
          <span className="separator" />
          <button
            type="button"
            role="menuitem"
            title="合并单元格（需先选中多个单元格）"
            disabled={
              !('mergeCells' in editor.commands) || !editor.can().mergeCells?.()
            }
            onClick={() =>
              runAndClose(() => editor.chain().focus().mergeCells().run(), false)
            }
          >
            <Merge size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title="拆分单元格"
            disabled={
              !('splitCell' in editor.commands) || !editor.can().splitCell?.()
            }
            onClick={() =>
              runAndClose(() => editor.chain().focus().splitCell().run(), false)
            }
          >
            <SplitSquareVertical size={16} />
          </button>
          <span className="separator" />
          <button
            type="button"
            role="menuitem"
            title="切换表头行"
            onClick={() =>
              runAndClose(() => editor.chain().focus().toggleHeaderRow().run())
            }
          >
            <LayoutList size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title="删除整个表格"
            onClick={() =>
              runAndClose(() => editor.chain().focus().deleteTable().run())
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </>
  )
}

export default TableRowActions
