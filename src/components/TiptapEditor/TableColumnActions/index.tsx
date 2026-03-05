import { createPortal } from 'react-dom'
import { Editor } from '@tiptap/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useFloating, flip, shift, offset, FloatingPortal, autoUpdate } from '@floating-ui/react'
import {
  Ellipsis,
  Trash2,
  TableCellsMerge,
  TableCellsSplit,
  TableProperties,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
} from 'lucide-react'
import { IconTableDeleteColumn } from '@/components/Icon'
import { useTableInsertColumnRunAndClose } from '@/hooks'
import { config } from '@/config'
import './TableColumnActions.css'

export interface ColumnActionItem {
  top: number
  left: number
  width: number
  firstCellPos: number
  tableIndex: number
  columnIndex: number
}

interface TableColumnActionsProps {
  editor: Editor
  editorWrapperRef: React.RefObject<HTMLDivElement | null>
}

/** 列操作按钮高度（横条），与 config.TABLE_ACTION_BUTTON_SIZE 一致 */
const COL_BUTTON_HEIGHT = config.TABLE_ACTION_BUTTON_SIZE
const COL_BUTTON_GAP = 2

const TableColumnActions = ({ editor, editorWrapperRef }: TableColumnActionsProps) => {
  const [columns, setColumns] = useState<ColumnActionItem[]>([])
  /** 选区所在表格的 index，仅该表显示列操作按钮 */
  const [focusedTableIndex, setFocusedTableIndex] = useState<number | null>(null)
  /** 选区所在列 index，仅该列显示列操作按钮 */
  const [focusedColumnIndex, setFocusedColumnIndex] = useState<number | null>(null)
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  /** 打开菜单时记录目标列信息，供 useTableInsertColumnRunAndClose 用 */
  const menuTargetRef = useRef<{
    firstCellPos: number
    tableIndex: number
    columnIndex: number
  } | null>(null)
  /** Portal 目标（用 state 以便在 render 中使用，与行操作共用 data-table-actions-wrapper） */
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null)
  /** 在 scrollWrapper 坐标系下的列按钮位置（仅在有 portal 时使用） */
  const [portalColumnPositions, setPortalColumnPositions] = useState<
    { item: ColumnActionItem; top: number; left: number; width: number }[]
  >([])
  /** 编辑器边界元素，在 effect 中同步，避免 render 中读 ref */
  const [boundaryElement, setBoundaryElement] = useState<Element | null>(null)

  const { refs: floatingRefs, floatingStyles } = useFloating({
    open: openMenuKey != null,
    placement: 'top',
    strategy: 'absolute',
    middleware: [
      offset(8),
      flip({ padding: 16, boundary: boundaryElement ?? undefined }),
      shift({ padding: 16, boundary: boundaryElement ?? undefined }),
    ],
    whileElementsMounted: autoUpdate,
  })

  useEffect(() => {
    if (openMenuKey != null) {
      floatingRefs.setReference(buttonRefs.current.get(openMenuKey) ?? null)
    } else {
      floatingRefs.setReference(null)
    }
  }, [openMenuKey, floatingRefs])

  const updatePositions = useCallback(() => {
    const wrapper = editorWrapperRef.current
    if (!editor.isActive('table') || !wrapper) {
      setColumns([])
      setFocusedTableIndex(null)
      setFocusedColumnIndex(null)
      setPortalTarget(null)
      setPortalColumnPositions([])
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
            })
          } catch {
            // posAtDOM may throw
          }
        }
      }
      tableIndex++
    }
    setColumns(result)

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
    setFocusedTableIndex(nextTableIndex)
    setFocusedColumnIndex(nextColumnIndex)

    /* 与行操作共用 scroll wrapper，列按钮 relative 其定位，随表格滚动，无需监听 scroll */
    if (nextTableIndex != null && tables.length) {
      const table = tables[nextTableIndex] as HTMLTableElement | undefined
      const target =
        (table?.parentElement?.getAttribute('data-table-actions-wrapper') === 'true'
          ? table.parentElement
          : table?.closest?.('.tableWrapper')) as HTMLDivElement | undefined
      setPortalTarget(target ?? null)
      if (target) {
        const targetRect = target.getBoundingClientRect()
        const visibleCols = result.filter(
          c => c.tableIndex === nextTableIndex && (nextColumnIndex == null || c.columnIndex === nextColumnIndex)
        )
        const firstRow = table?.rows[0]
        /* 与 config.TABLE_ACTION_BUTTON_PADDING 一致，使列按钮落在预留区而非表格内 */
        const tableTopPadding = config.TABLE_ACTION_BUTTON_PADDING
        const portalPositions = visibleCols.map(item => {
          const cell = firstRow?.cells[item.columnIndex]
          const cellRect = cell?.getBoundingClientRect()
          return {
            item,
            top: -tableTopPadding,
            left: cellRect ? cellRect.left - targetRect.left : item.left,
            width: item.width,
          }
        })
        setPortalColumnPositions(portalPositions)
      } else {
        setPortalColumnPositions([])
      }
    } else {
      setPortalTarget(null)
      setPortalColumnPositions([])
    }
  }, [editor, editorWrapperRef])

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

  const handleColumnButtonClick = useCallback(
    (e: React.MouseEvent, item: ColumnActionItem) => {
      e.preventDefault()
      e.stopPropagation()
      const key = `${item.tableIndex}-${item.columnIndex}`
      menuTargetRef.current = {
        firstCellPos: item.firstCellPos,
        tableIndex: item.tableIndex,
        columnIndex: item.columnIndex,
      }
      setBoundaryElement(editorWrapperRef.current ?? null)
      floatingRefs.setReference(buttonRefs.current.get(key) ?? null)
      setOpenMenuKey(key)
    },
    [editorWrapperRef, floatingRefs]
  )

  const closeMenu = useCallback(() => {
    setOpenMenuKey(null)
    menuTargetRef.current = null
  }, [])

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

  useEffect(() => {
    if (!openMenuKey) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    const onClickOutside = (e: MouseEvent) => {
      const hitBtn = columns.some(
        c => buttonRefs.current.get(`${c.tableIndex}-${c.columnIndex}`)?.contains(e.target as Node)
      )
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !hitBtn
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
  }, [openMenuKey, closeMenu, columns])

  if (!editor.isActive('table') || columns.length === 0) {
    return null
  }

  const visibleColumns =
    focusedTableIndex === null
      ? []
      : columns.filter(
          c =>
            c.tableIndex === focusedTableIndex &&
            (focusedColumnIndex == null || c.columnIndex === focusedColumnIndex)
        )

  const tIdx = openMenuKey ? parseInt(openMenuKey.split('-')[0], 10) : -1
  const currentTableColCount =
    tIdx >= 0 ? columns.filter(c => c.tableIndex === tIdx).length : 0

  const usePortal = Boolean(portalTarget && portalColumnPositions.length > 0)

  const columnButtons = usePortal
    ? portalColumnPositions.map(({ item, top, left, width }) => {
        const key = `${item.tableIndex}-${item.columnIndex}`
        return (
          <button
            key={key}
            ref={el => {
              if (el) buttonRefs.current.set(key, el)
            }}
            type="button"
            className="table-column-action-trigger"
            aria-label="列操作"
            style={{
              top: `${top}px`,
              left: `${left}px`,
              width: `${width}px`,
              height: `${COL_BUTTON_HEIGHT}px`,
            }}
            onMouseDown={e => e.preventDefault()}
            onClick={e => handleColumnButtonClick(e, item)}
          >
            <Ellipsis className="table-column-action-icon" size={16} aria-hidden="true" />
          </button>
        )
      })
    : visibleColumns.map(item => {
        const key = `${item.tableIndex}-${item.columnIndex}`
        return (
          <button
            key={key}
            ref={el => {
              if (el) buttonRefs.current.set(key, el)
            }}
            type="button"
            className="table-column-action-trigger"
            aria-label="列操作"
            style={{
              top: `${item.top}px`,
              left: `${item.left}px`,
              width: `${item.width}px`,
              height: `${COL_BUTTON_HEIGHT}px`,
            }}
            onMouseDown={e => e.preventDefault()}
            onClick={e => handleColumnButtonClick(e, item)}
          >
            <Ellipsis className="table-column-action-icon" size={16} aria-hidden="true" />
          </button>
        )
      })

  return (
    <>
      {usePortal && portalTarget ? createPortal(columnButtons, portalTarget) : columnButtons}
      {openMenuKey && boundaryElement && (
        <FloatingPortal root={boundaryElement as HTMLElement}>
          <div
            ref={el => {
              ;(menuRef as React.MutableRefObject<HTMLDivElement | null>).current = el
              floatingRefs.setFloating(el)
            }}
            className="table-column-action-menu"
            role="menu"
            style={floatingStyles}
            onMouseDown={e => e.preventDefault()}
          >
          <button
            type="button"
            role="menuitem"
            title="在左侧插入列"
            onClick={() =>
              runColumnAndClose(() => editor.chain().focus().addColumnBefore().run(), 'before')
            }
          >
            <BetweenHorizontalStart size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title="在右侧插入列"
            onClick={() =>
              runColumnAndClose(() => editor.chain().focus().addColumnAfter().run(), 'after')
            }
          >
            <BetweenHorizontalEnd size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title={currentTableColCount <= 1 ? '删除整个表格' : '删除当前列'}
            disabled={
              currentTableColCount <= 1
                ? false
                : !editor.can().deleteColumn()
            }
            onClick={() =>
              runColumnAndClose(() =>
                currentTableColCount <= 1
                  ? editor.chain().focus().deleteTable().run()
                  : editor.chain().focus().deleteColumn().run()
              )
            }
          >
            <IconTableDeleteColumn size={16} />
          </button>
          <span className="separator" />
          <button
            type="button"
            role="menuitem"
            title="合并单元格（需先选中多个单元格）"
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
            title="拆分单元格"
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
            title="切换表头行"
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
            title="删除整个表格"
            onClick={() => {
              editor.chain().focus().deleteTable().run()
              closeMenu()
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
        </FloatingPortal>
      )}
    </>
  )
}

export default TableColumnActions
