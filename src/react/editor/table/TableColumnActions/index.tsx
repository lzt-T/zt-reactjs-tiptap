import { createPortal } from 'react-dom'
import { Editor } from '@tiptap/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Ellipsis,
  Trash2,
  TableCellsMerge,
  TableCellsSplit,
  TableProperties,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
} from 'lucide-react'
import { IconTableDeleteColumn } from '@/react/components/Icon'
import { Popover, PopoverContent, PopoverTrigger } from '@/react/components/ui/popover'
import { useTableInsertColumnRunAndClose } from '@/react/hooks'
import { config } from '@/shared/config'
import type { EditorLocale } from '@/shared/locales'
import TableAlignmentMenu from '../TableAlignmentMenu'
import { applyTableCellAlignment, getTableCellAlignmentState } from '../tableAlignment'
import type {
  TableCellTextAlign,
  TableCellVerticalAlign,
} from '@/core/extensions/TableCellAlignment'
import './TableColumnActions.css'

export interface ColumnActionItem {
  top: number
  left: number
  width: number
  /** 最左侧选中列的首格 pos（单列时与 lastColumnFirstCellPos 相同） */
  firstCellPos: number
  tableIndex: number
  /** 最左侧选中列的 index（单列时与 lastColumnIndex 相同） */
  columnIndex: number
  /** 最右侧选中列的首格 pos */
  lastColumnFirstCellPos: number
  /** 最右侧选中列的 index */
  lastColumnIndex: number
}

interface TableColumnActionsProps {
  editor: Editor
  editorWrapperRef: React.RefObject<HTMLDivElement | null>
  locale: EditorLocale
}

/** 列操作按钮高度（横条），与 config.TABLE_ACTION_BUTTON_SIZE 一致 */
const COL_BUTTON_HEIGHT = config.TABLE_ACTION_BUTTON_SIZE
const COL_BUTTON_GAP = 2

const TableColumnActions = ({
  editor,
  editorWrapperRef,
  locale,
}: TableColumnActionsProps) => {
  /** 当前焦点所在列（只渲染一个按钮，定位到该列） */
  const [currentColumn, setCurrentColumn] = useState<ColumnActionItem | null>(null)
  /** 当前焦点所在表格的列数，用于菜单中「删除列」/「删除表格」 */
  const [focusedTableColCount, setFocusedTableColCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  /**
   * 打开菜单时记录目标列信息，供 useTableInsertColumnRunAndClose 用。
   * first* 指最左侧选中列（用于「插左侧」），last* 指最右侧选中列（用于「插右侧」）。
   * 单列选中时 last* 与 first* 相同。
   */
  const menuTargetRef = useRef<{
    firstCellPos: number
    tableIndex: number
    columnIndex: number
    lastColumnFirstCellPos: number
    lastColumnIndex: number
  } | null>(null)
  /** Portal 目标（用 state 以便在 render 中使用，与行操作共用 data-table-actions-wrapper） */
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null)
  /** 单个按钮在 scrollWrapper 坐标系下的位置（仅在有 portal 时使用） */
  const [portalButtonPosition, setPortalButtonPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const clearTableColumnStates = useCallback(() => {
    setCurrentColumn(null)
    setFocusedTableColCount(0)
    setPortalTarget(null)
    setPortalButtonPosition(null)
  }, [])

  const updatePositions = useCallback(() => {
    const wrapper = editorWrapperRef.current
    if (!editor.isActive('table') || !wrapper) {
      clearTableColumnStates()
      return
    }

    const { view } = editor
    const proseMirror = wrapper.querySelector('.ProseMirror')
    if (!proseMirror) return

    const tables = proseMirror.querySelectorAll('table')
    const wrapperRect = wrapper.getBoundingClientRect()
    const result: ColumnActionItem[] = []
    let tableIndex = 0
    for (const table of tables) {
      const tableRect = table.getBoundingClientRect()
      const tableTop = tableRect.top - wrapperRect.top + wrapper.scrollTop
      const firstRow = (table as HTMLTableElement).rows[0]
      if (firstRow?.cells?.length) {
        for (let colIndex = 0; colIndex < firstRow.cells.length; colIndex++) {
          const cell = firstRow.cells[colIndex]
          if (!cell) continue
          try {
            const pos = view.posAtDOM(cell, 0)
            const cellRect = cell.getBoundingClientRect()
            const cellLeft = cellRect.left - wrapperRect.left + wrapper.scrollLeft
            const cellWidth = cellRect.width
            const left = cellLeft
            const top = tableTop - COL_BUTTON_HEIGHT - COL_BUTTON_GAP
            result.push({
              top,
              left,
              width: cellWidth,
              firstCellPos: pos + 1,
              tableIndex,
              columnIndex: colIndex,
              lastColumnFirstCellPos: pos + 1,
              lastColumnIndex: colIndex,
            })
          } catch {
            // posAtDOM may throw
          }
        }
      }
      tableIndex++
    }

    let nextTableIndex: number | null = null
    let nextColumnIndex: number | null = null
    try {
      const { from } = view.state.selection
      const domAtPos = view.domAtPos(from)
      const el =
        domAtPos.node instanceof Element
          ? domAtPos.node
          : (domAtPos.node as Node).parentElement
      const cell = el?.closest?.('td, th')
      const table = cell?.closest?.('table') ?? el?.closest?.('table')
      if (table && tables.length) {
        const ti = Array.from(tables).indexOf(table as HTMLTableElement)
        if (ti >= 0) {
          nextTableIndex = ti
          if (cell) {
            const tr = cell.closest('tr')
            const colIdx = tr ? Array.from((tr as HTMLTableRowElement).cells).indexOf(cell as HTMLTableCellElement) : -1
            if (colIdx >= 0) nextColumnIndex = colIdx
          }
        }
      }
    } catch {
      // ignore
    }

    const colCount = nextTableIndex != null ? result.filter(c => c.tableIndex === nextTableIndex).length : 0
    setFocusedTableColCount(colCount)

    const anchorItem =
      nextTableIndex != null
        ? result.find(c => c.tableIndex === nextTableIndex && c.columnIndex === (nextColumnIndex ?? 0)) ?? null
        : null

    /* 找出选区的最左列单元格和最右列单元格（统一处理单列和多列）
     * 扫描所有行而非仅第一行，避免选区不含第一行时漏检。
     * minCol / maxCol 独立于光标列（nextColumnIndex），避免右→左拖选时 span 算错。*/
    let firstCell: HTMLTableCellElement | null = null
    let lastCell: HTMLTableCellElement | null = null
    let minCol: number = nextColumnIndex ?? 0
    let maxCol: number = nextColumnIndex ?? 0

    if (nextTableIndex != null && anchorItem) {
      const focusedTable = tables[nextTableIndex] as HTMLTableElement | undefined
      const firstRow = focusedTable?.rows[0]
      if (firstRow && focusedTable) {
        /* 遍历所有行，收集有 selectedCell 的列 index */
        const selectedColIndices = new Set<number>()
        for (const row of Array.from(focusedTable.rows)) {
          for (let i = 0; i < row.cells.length; i++) {
            if (row.cells[i].classList.contains('selectedCell')) {
              selectedColIndices.add(i)
            }
          }
        }
        if (selectedColIndices.size > 0) {
          /* CellSelection：取最小/最大列 index 对应的第一行单元格 */
          minCol = Math.min(...selectedColIndices)
          maxCol = Math.max(...selectedColIndices)
          firstCell = firstRow.cells[minCol] ?? null
          lastCell = firstRow.cells[maxCol] ?? null
        } else {
          /* 普通光标：以当前列为首尾 */
          const anchorCell = firstRow.cells[nextColumnIndex ?? 0] ?? null
          firstCell = anchorCell
          lastCell = anchorCell
        }
      }
    }

    /* 统一计算 firstCellPos / lastColumnFirstCellPos */
    let spanFirstCellPos = anchorItem?.firstCellPos ?? 0
    let lastColFirstCellPos = anchorItem?.firstCellPos ?? 0
    if (firstCell && lastCell) {
      try { spanFirstCellPos = view.posAtDOM(firstCell, 0) + 1 } catch { /* ignore */ }
      try { lastColFirstCellPos = view.posAtDOM(lastCell, 0) + 1 } catch { /* ignore */ }
    }

    /* 统一计算按钮的 left / width（wrapper 坐标系） */
    let spanLeft = anchorItem?.left ?? 0
    let spanWidth = anchorItem?.width ?? 0
    if (firstCell && lastCell) {
      const firstRect = firstCell.getBoundingClientRect()
      const lastRect = lastCell.getBoundingClientRect()
      spanLeft = firstRect.left - wrapperRect.left + wrapper.scrollLeft
      spanWidth = lastRect.right - firstRect.left
    }

    const focusedItem = anchorItem
      ? {
          ...anchorItem,
          left: spanLeft,
          width: spanWidth,
          firstCellPos: spanFirstCellPos,
          columnIndex: minCol,
          lastColumnFirstCellPos: lastColFirstCellPos,
          lastColumnIndex: maxCol,
        }
      : null
    setCurrentColumn(focusedItem)

    /* 与行操作共用 scroll wrapper，列按钮 relative 其定位，随表格滚动，无需监听 scroll */
    if (nextTableIndex != null && focusedItem != null && tables.length) {
      const table = tables[nextTableIndex] as HTMLTableElement | undefined
      const target =
        (table?.parentElement?.getAttribute('data-table-actions-wrapper') === 'true'
          ? table.parentElement
          : table?.closest?.('.tableWrapper')) as HTMLDivElement | undefined
      setPortalTarget(target ?? null)
      if (target && firstCell && lastCell) {
        const targetRect = target.getBoundingClientRect()
        const tableTopPadding = config.TABLE_ACTION_BUTTON_PADDING
        const firstRect = firstCell.getBoundingClientRect()
        const lastRect = lastCell.getBoundingClientRect()
        setPortalButtonPosition({
          top: -tableTopPadding,
          left: firstRect.left - targetRect.left,
          width: lastRect.right - firstRect.left,
        })
      } else {
        setPortalButtonPosition(null)
      }
    } else {
      setPortalTarget(null)
      setPortalButtonPosition(null)
    }
  }, [clearTableColumnStates, editor, editorWrapperRef])

  useEffect(() => {
    const id = setTimeout(updatePositions, 0)
    editor.on('selectionUpdate', updatePositions)
    editor.on('update', updatePositions)
    return () => {
      clearTimeout(id)
      editor.off('selectionUpdate', updatePositions)
      editor.off('update', updatePositions)
    }
    /* 列按钮已 Portal 到 scroll wrapper 内，随表格滚动，无需监听 scroll */
  }, [editor, editorWrapperRef, updatePositions])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    menuTargetRef.current = null
  }, [])
  // Popover 开关状态统一收敛到这里，关闭时同步清理目标引用。
  const handleMenuOpenChange = useCallback((open: boolean) => {
    setMenuOpen(open)
    if (!open) {
      menuTargetRef.current = null
    }
  }, [])

  const handleColumnButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!currentColumn) return
      if (menuOpen) {
        closeMenu()
        return
      }
      menuTargetRef.current = {
        firstCellPos: currentColumn.firstCellPos,
        tableIndex: currentColumn.tableIndex,
        columnIndex: currentColumn.columnIndex,
        lastColumnFirstCellPos: currentColumn.lastColumnFirstCellPos,
        lastColumnIndex: currentColumn.lastColumnIndex,
      }
      setMenuOpen(true)
    },
    [closeMenu, currentColumn, menuOpen]
  )

  /** 「在左侧插入列」：以最左侧选中列为基准 */
  const runColumnAndClose = useTableInsertColumnRunAndClose(
    editor,
    editorWrapperRef,
    () =>
      menuTargetRef.current
        ? {
            columnFirstCellPos: menuTargetRef.current.firstCellPos,
            tableIndex: menuTargetRef.current.tableIndex,
            columnIndex: menuTargetRef.current.columnIndex,
          }
        : null,
    closeMenu
  )

  /** 「在右侧插入列」：以最右侧选中列为基准，确保新列插在选区最右侧 */
  const runColumnAndCloseAfter = useTableInsertColumnRunAndClose(
    editor,
    editorWrapperRef,
    () =>
      menuTargetRef.current
        ? {
            columnFirstCellPos: menuTargetRef.current.lastColumnFirstCellPos,
            tableIndex: menuTargetRef.current.tableIndex,
            columnIndex: menuTargetRef.current.lastColumnIndex,
          }
        : null,
    closeMenu
  )

  /**
   * 设置当前列/选中列的水平对齐。
   */
  const handleTextAlign = useCallback(
    (align: TableCellTextAlign) => {
      // 当前菜单记录的列目标。
      const target = menuTargetRef.current ?? currentColumn
      applyTableCellAlignment(
        editor,
        editorWrapperRef.current,
        target
          ? {
              type: 'column',
              tableIndex: target.tableIndex,
              columnIndex: target.columnIndex,
              lastColumnIndex: target.lastColumnIndex,
            }
          : null,
        'textAlign',
        align
      )
      closeMenu()
    },
    [closeMenu, currentColumn, editor, editorWrapperRef]
  )

  /**
   * 设置当前列/选中列的垂直对齐。
   */
  const handleVerticalAlign = useCallback(
    (align: TableCellVerticalAlign) => {
      // 当前菜单记录的列目标。
      const target = menuTargetRef.current ?? currentColumn
      applyTableCellAlignment(
        editor,
        editorWrapperRef.current,
        target
          ? {
              type: 'column',
              tableIndex: target.tableIndex,
              columnIndex: target.columnIndex,
              lastColumnIndex: target.lastColumnIndex,
            }
          : null,
        'verticalAlign',
        align
      )
      closeMenu()
    },
    [closeMenu, currentColumn, editor, editorWrapperRef]
  )

  if (!editor.isActive('table') || currentColumn == null) {
    return null
  }

  // Popover 挂到编辑器容器内，避免挂到 document.body 破坏主题隔离。
  const popoverContainer = editorWrapperRef.current
  const usePortal = Boolean(portalTarget && portalButtonPosition)
  // 当前对齐回显目标。
  const alignmentTarget = menuTargetRef.current ?? currentColumn
  // 当前列/选中列的对齐状态。
  const alignmentState = getTableCellAlignmentState(
    editor,
    editorWrapperRef.current,
    alignmentTarget
      ? {
          type: 'column',
          tableIndex: alignmentTarget.tableIndex,
          columnIndex: alignmentTarget.columnIndex,
          lastColumnIndex: alignmentTarget.lastColumnIndex,
        }
      : null
  )

  // 操作按钮视觉与定位保持不变，仅将菜单实现替换为 Popover。
  const singleButton = (
    <Popover open={menuOpen} onOpenChange={handleMenuOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={buttonRef}
          type="button"
          className="table-column-action-trigger"
          aria-label={locale.table.columnActionsAriaLabel}
          style={
            usePortal && portalButtonPosition
              ? {
                  top: `${portalButtonPosition.top}px`,
                  left: `${portalButtonPosition.left}px`,
                  width: `${portalButtonPosition.width}px`,
                  height: `${COL_BUTTON_HEIGHT}px`,
                }
              : {
                  top: `${currentColumn.top}px`,
                  left: `${currentColumn.left}px`,
                  width: `${currentColumn.width}px`,
                  height: `${COL_BUTTON_HEIGHT}px`,
                }
          }
          onMouseDown={e => e.preventDefault()}
          onClick={handleColumnButtonClick}
        >
          <Ellipsis className="table-column-action-icon" size={16} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        container={popoverContainer}
        side="top"
        align="start"
        sideOffset={8}
        role="menu"
        className="table-column-action-menu w-auto p-1"
        onMouseDown={e => e.preventDefault()}
        onOpenAutoFocus={e => e.preventDefault()}
        // 阻止菜单关闭时焦点回到触发器，避免编辑器被判定为失焦。
        onCloseAutoFocus={e => e.preventDefault()}
      >
        <button
          type="button"
          role="menuitem"
          title={locale.table.insertColumnLeft}
          onClick={() =>
            runColumnAndClose(() => editor.chain().focus().addColumnBefore().run(), 'before')
          }
        >
          <BetweenHorizontalStart size={16} />
        </button>
        <button
          type="button"
          role="menuitem"
          title={locale.table.insertColumnRight}
          onClick={() =>
            runColumnAndCloseAfter(() => editor.chain().focus().addColumnAfter().run(), 'after')
          }
        >
          <BetweenHorizontalEnd size={16} />
        </button>
        <button
          type="button"
          role="menuitem"
          title={(() => {
            const numCols = currentColumn
              ? currentColumn.lastColumnIndex - currentColumn.columnIndex + 1
              : 1
            if (focusedTableColCount <= numCols) return locale.table.deleteWholeTable
            return numCols > 1
              ? locale.table.deleteSelectedColumns(numCols)
              : locale.table.deleteCurrentColumn
          })()}
          disabled={
            focusedTableColCount <= 1
              ? false
              : !editor.can().deleteColumn()
          }
          onClick={() => {
            const target = menuTargetRef.current
            const numCols = target ? target.lastColumnIndex - target.columnIndex + 1 : 1
            runColumnAndClose(() => {
              if (focusedTableColCount <= numCols) {
                editor.chain().focus().deleteTable().run()
              } else {
                /* 链式删除 numCols 次：每次删除后光标留在同一列位置，下一列顶上来继续删 */
                let chain = editor.chain().focus()
                for (let i = 0; i < numCols; i++) {
                  chain = chain.deleteColumn()
                }
                chain.run()
              }
            })
          }}
        >
          <IconTableDeleteColumn size={16} />
        </button>
        <span className="separator" />
        <TableAlignmentMenu
          locale={locale}
          container={popoverContainer}
          activeTextAlign={alignmentState.textAlign}
          activeVerticalAlign={alignmentState.verticalAlign}
          onTextAlign={handleTextAlign}
          onVerticalAlign={handleVerticalAlign}
        />
        <span className="separator" />
        <button
          type="button"
          role="menuitem"
          title={locale.table.mergeCells}
          disabled={
            !('mergeCells' in editor.commands) || !editor.can().mergeCells?.()
          }
          onClick={() => {
            editor.chain().focus().mergeCells().run()
            closeMenu()
          }}
        >
          <TableCellsMerge size={16} />
        </button>
        <button
          type="button"
          role="menuitem"
          title={locale.table.splitCell}
          disabled={
            !('splitCell' in editor.commands) || !editor.can().splitCell?.()
          }
          onClick={() => {
            editor.chain().focus().splitCell().run()
            closeMenu()
          }}
        >
          <TableCellsSplit size={16} />
        </button>
        <span className="separator" />
        <button
          type="button"
          role="menuitem"
          title={locale.table.toggleHeaderRow}
          onClick={() => {
            editor.chain().focus().toggleHeaderRow().run()
            closeMenu()
          }}
        >
          <TableProperties size={16} />
        </button>
        <button
          type="button"
          role="menuitem"
          title={locale.table.deleteWholeTable}
          onClick={() => {
            editor.chain().focus().deleteTable().run()
            closeMenu()
          }}
        >
          <Trash2 size={16} />
        </button>
      </PopoverContent>
    </Popover>
  )

  return (
    <>
      {usePortal && portalTarget ? createPortal(singleButton, portalTarget) : singleButton}
    </>
  )
}

export default TableColumnActions
