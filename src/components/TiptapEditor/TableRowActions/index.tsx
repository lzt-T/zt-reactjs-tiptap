import { createPortal } from 'react-dom'
import { Editor } from '@tiptap/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useFloating, flip, shift, offset, FloatingPortal, autoUpdate } from '@floating-ui/react'
import {
  EllipsisVertical,
  Trash2,
  TableCellsMerge,
  TableCellsSplit,
  TableProperties,
  BetweenVerticalEnd,
  BetweenVerticalStart,
} from 'lucide-react'
import { IconTableDeleteRow } from '@/components/Icon'
import { useTableInsertRowRunAndClose } from '@/hooks'
import { config } from '@/config'
import type { EditorLocale } from '@/locales'
import TableAddRowColumnButtons, { TABLE_ADD_BAR_SIZE } from '../TableAddRowColumnButtons'
import './TableRowActions.css'

export interface RowActionItem {
  top: number
  left: number
  height: number
  /** 最上方选中行的首格 pos（单行时与 lastRowFirstCellPos 相同） */
  firstCellPos: number
  tableIndex: number
  /** 最上方选中行的 index（单行时与 lastRowIndex 相同） */
  rowIndex: number
  /** 最下方选中行的首格 pos */
  lastRowFirstCellPos: number
  /** 最下方选中行的 index */
  lastRowIndex: number
}

interface TableRowActionsProps {
  editor: Editor
  editorWrapperRef: React.RefObject<HTMLDivElement | null>
  locale: EditorLocale
}

/** 行操作按钮宽度，与 config.TABLE_ACTION_BUTTON_SIZE 一致 */
const ROW_BUTTON_WIDTH = config.TABLE_ACTION_BUTTON_SIZE
/** 按钮与表格左边缘的间距 */
const ROW_BUTTON_GAP = 2

const TableRowActions = ({
  editor,
  editorWrapperRef,
  locale,
}: TableRowActionsProps) => {
  /** 当前焦点所在行（只渲染一个按钮，定位到该行） */
  const [currentRow, setCurrentRow] = useState<RowActionItem | null>(null)
  /** 当前焦点所在表格的行数，用于菜单中「删除行」/「删除表格」 */
  const [focusedTableRowCount, setFocusedTableRowCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  /**
   * 打开菜单时记录目标行信息，供 useTableInsertRowRunAndClose 用。
   * first* 指最上方选中行（用于「插上方」），last* 指最下方选中行（用于「插下方」）。
   * 单行选中时 last* 与 first* 相同。
   */
  const menuTargetRef = useRef<{
    firstCellPos: number
    tableIndex: number
    rowIndex: number
    lastRowFirstCellPos: number
    lastRowIndex: number
  } | null>(null)
  /** Portal 目标（用 state 以便在 render 中使用） */
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null)
  /** 单个按钮在 tableWrapper 坐标系下的位置（仅在有 portal 时使用） */
  const [portalButtonPosition, setPortalButtonPosition] = useState<{
    top: number
    left: number
    height: number
  } | null>(null)
  /** 聚焦表格尺寸，用于下方/右侧加号按钮定位；有 portal 时设置 */
  const [tableSize, setTableSize] = useState<{ width: number; height: number } | null>(null)
  /** 聚焦表格 index，加号按钮点击时用于定位表格 */
  const [focusedTableIndexForPlus, setFocusedTableIndexForPlus] = useState<number | null>(null)
  /** 编辑器边界元素，在 effect 中同步，避免 render 中读 ref */
  const [boundaryElement, setBoundaryElement] = useState<Element | null>(null)

  const { refs: floatingRefs, floatingStyles } = useFloating({
    open: menuOpen,
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
    if (menuOpen) {
      floatingRefs.setReference(buttonRef.current)
    } else {
      floatingRefs.setReference(null)
    }
  }, [menuOpen, floatingRefs])

  const clearTableRowStates = useCallback(() => {
    setCurrentRow(null)
    setFocusedTableRowCount(0)
    setPortalTarget(null)
    setPortalButtonPosition(null)
    setTableSize(null)
    setFocusedTableIndexForPlus(null)
  }, [])

  const updatePositions = useCallback(() => {
    const wrapper = editorWrapperRef.current
    if (!editor.isActive('table') || !wrapper) {
      clearTableRowStates()
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
            lastRowFirstCellPos: pos + 1,
            lastRowIndex: rowIndex,
          })
        } catch {
          // posAtDOM may throw if node not in view
        }
      })
      tableIndex++
    }

    /* 根据选区确定聚焦行 */
    let nextTableIndex: number | null = null
    let nextRowIndex: number | null = null
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
        const ti = Array.from(tables).indexOf(table as HTMLTableElement)
        const ri = Array.from((table as HTMLTableElement).rows).indexOf(
          tr as HTMLTableRowElement
        )
        if (ti >= 0 && ri >= 0) {
          nextTableIndex = ti
          nextRowIndex = ri
        }
      }
    } catch {
      // ignore
    }

    const rowCount = nextTableIndex != null ? result.filter(r => r.tableIndex === nextTableIndex).length : 0
    setFocusedTableRowCount(rowCount)

    const anchorItem =
      nextTableIndex != null
        ? result.find(r => r.tableIndex === nextTableIndex && r.rowIndex === (nextRowIndex ?? 0)) ?? null
        : null

    /* 找出选区的最上行和最下行（统一处理单行和多行）
     * minRow / maxRow 独立于光标行（nextRowIndex），避免下→上拖选时 span 算错。*/
    let firstRowEl: HTMLTableRowElement | null = null
    let lastRowEl: HTMLTableRowElement | null = null
    let minRow: number = nextRowIndex ?? 0
    let maxRow: number = nextRowIndex ?? 0

    if (nextTableIndex != null && anchorItem) {
      const focusedTable = tables[nextTableIndex] as HTMLTableElement | undefined
      if (focusedTable) {
        const allRows = Array.from(focusedTable.rows)
        const selectedRows: HTMLTableRowElement[] = []
        for (const row of allRows) {
          /* 行内任一单元格有 selectedCell class 即视为该行被选中 */
          const hasSelected = Array.from(row.cells).some(c => c.classList.contains('selectedCell'))
          if (hasSelected) selectedRows.push(row)
        }
        if (selectedRows.length > 0) {
          firstRowEl = selectedRows[0]
          lastRowEl = selectedRows[selectedRows.length - 1]
          minRow = allRows.indexOf(firstRowEl)
          maxRow = allRows.indexOf(lastRowEl)
        } else {
          /* 普通光标：以当前行为首尾 */
          const anchorRow = focusedTable.rows[nextRowIndex ?? 0] ?? null
          firstRowEl = anchorRow
          lastRowEl = anchorRow
        }
      }
    }

    /* 统一计算 firstCellPos / lastRowFirstCellPos */
    let spanFirstCellPos = anchorItem?.firstCellPos ?? 0
    let lastRowFirstCellPos = anchorItem?.firstCellPos ?? 0
    if (firstRowEl && lastRowEl) {
      const firstRowFirstCell = firstRowEl.cells[0]
      const lastRowFirstCell = lastRowEl.cells[0]
      if (firstRowFirstCell) {
        try { spanFirstCellPos = view.posAtDOM(firstRowFirstCell, 0) + 1 } catch { /* ignore */ }
      }
      if (lastRowFirstCell) {
        try { lastRowFirstCellPos = view.posAtDOM(lastRowFirstCell, 0) + 1 } catch { /* ignore */ }
      }
    }

    /* 统一计算按钮的 top / height（wrapper 坐标系） */
    let spanTop = anchorItem?.top ?? 0
    let spanHeight = anchorItem?.height ?? 0
    if (firstRowEl && lastRowEl) {
      const firstRect = firstRowEl.getBoundingClientRect()
      const lastRect = lastRowEl.getBoundingClientRect()
      spanTop = firstRect.top - wrapperRect.top + wrapper.scrollTop
      spanHeight = lastRect.bottom - firstRect.top
    }

    const focusedItem = anchorItem
      ? {
          ...anchorItem,
          top: spanTop,
          height: spanHeight,
          firstCellPos: spanFirstCellPos,
          rowIndex: minRow,
          lastRowFirstCellPos,
          lastRowIndex: maxRow,
        }
      : null
    setCurrentRow(focusedItem)

    /* 计算 tableWrapper 内 absolute 定位用的坐标，用于 Portal 渲染 */
    if (nextTableIndex != null && focusedItem != null && tables.length) {
      const table = tables[nextTableIndex] as HTMLTableElement | undefined
      const tableWrapper = table?.closest?.('.tableWrapper') as HTMLDivElement | undefined
      let target: HTMLDivElement | null = tableWrapper ?? null
      if (table && tableWrapper) {
        /* 注入可随表格横向滚动的 wrapper，行/列按钮都挂在其内，随表格一起滚动 */
        let scrollWrapper = table.parentElement as HTMLDivElement | null
        if (scrollWrapper?.getAttribute('data-table-actions-wrapper') !== 'true') {
          scrollWrapper = document.createElement('div')
          scrollWrapper.setAttribute('data-table-actions-wrapper', 'true')
          scrollWrapper.style.position = 'relative'
          tableWrapper.insertBefore(scrollWrapper, table)
          scrollWrapper.appendChild(table)
        }
        scrollWrapper.style.width = `${table.offsetWidth + TABLE_ADD_BAR_SIZE + config.TABLE_ADD_BAR_GAP}px`
        scrollWrapper.style.minHeight = `${table.offsetHeight + TABLE_ADD_BAR_SIZE + config.TABLE_ADD_BAR_GAP}px`
        target = scrollWrapper
      }
      setPortalTarget(target)
      if (target && table) {
        setTableSize({ width: table.offsetWidth, height: table.offsetHeight })
        setFocusedTableIndexForPlus(nextTableIndex)
      } else {
        setTableSize(null)
        setFocusedTableIndexForPlus(null)
      }
      /* portal 坐标系：相对于 scroll wrapper（target），直接用 getBoundingClientRect 差值 */
      if (target && firstRowEl && lastRowEl) {
        const twRect = target.getBoundingClientRect()
        const firstRect = firstRowEl.getBoundingClientRect()
        const lastRect = lastRowEl.getBoundingClientRect()
        const tableLeftPadding = config.TABLE_ACTION_BUTTON_PADDING
        setPortalButtonPosition({
          top: firstRect.top - twRect.top,
          left: -tableLeftPadding,
          height: lastRect.bottom - firstRect.top,
        })
      } else {
        setPortalButtonPosition(null)
      }
    } else {
      setPortalTarget(null)
      setPortalButtonPosition(null)
      setTableSize(null)
      setFocusedTableIndexForPlus(null)
    }
  }, [clearTableRowStates, editor, editorWrapperRef])

  useEffect(() => {
    const id = setTimeout(updatePositions, 0)
    editor.on('selectionUpdate', updatePositions)
    editor.on('update', updatePositions)
    return () => {
      clearTimeout(id)
      editor.off('selectionUpdate', updatePositions)
      editor.off('update', updatePositions)
    }
    /* 按钮已 Portal 到 tableWrapper 内，随表格滚动，无需监听 scroll */
  }, [editor, editorWrapperRef, updatePositions])

  const handleRowButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!currentRow) return
      menuTargetRef.current = {
        firstCellPos: currentRow.firstCellPos,
        tableIndex: currentRow.tableIndex,
        rowIndex: currentRow.rowIndex,
        lastRowFirstCellPos: currentRow.lastRowFirstCellPos,
        lastRowIndex: currentRow.lastRowIndex,
      }
      setBoundaryElement(editorWrapperRef.current ?? null)
      floatingRefs.setReference(buttonRef.current)
      setMenuOpen(true)
    },
    [currentRow, editorWrapperRef, floatingRefs]
  )

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    menuTargetRef.current = null
  }, [])

  /** 「在上方插入行」：以最上方选中行为基准 */
  const runRowAndClose = useTableInsertRowRunAndClose(
    editor,
    editorWrapperRef,
    () =>
      menuTargetRef.current
        ? {
            rowFirstCellPos: menuTargetRef.current.firstCellPos,
            tableIndex: menuTargetRef.current.tableIndex,
            rowIndex: menuTargetRef.current.rowIndex,
          }
        : null,
    closeMenu
  )

  /** 「在下方插入行」：以最下方选中行为基准，确保新行插在选区最下方 */
  const runRowAndCloseAfter = useTableInsertRowRunAndClose(
    editor,
    editorWrapperRef,
    () =>
      menuTargetRef.current
        ? {
            rowFirstCellPos: menuTargetRef.current.lastRowFirstCellPos,
            tableIndex: menuTargetRef.current.tableIndex,
            rowIndex: menuTargetRef.current.lastRowIndex,
          }
        : null,
    closeMenu
  )

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    const onClickOutside = (e: MouseEvent) => {
      const hitBtn = buttonRef.current?.contains(e.target as Node)
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !hitBtn) {
        closeMenu()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    setTimeout(() => document.addEventListener('click', onClickOutside, true), 0)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClickOutside, true)
    }
  }, [menuOpen, closeMenu])

  if (!editor.isActive('table') || currentRow == null) {
    return null
  }

  const usePortal = Boolean(portalTarget && portalButtonPosition)
  const showPlusButtons = Boolean(portalTarget && tableSize)

  const singleButton = (
    <button
      ref={buttonRef}
      type="button"
      className="table-row-action-trigger"
      aria-label={locale.table.rowActionsAriaLabel}
      style={
        usePortal && portalButtonPosition
          ? {
              top: `${portalButtonPosition.top}px`,
              left: `${portalButtonPosition.left}px`,
              width: `${ROW_BUTTON_WIDTH}px`,
              height: `${portalButtonPosition.height}px`,
            }
          : {
              top: `${currentRow.top}px`,
              left: `${currentRow.left}px`,
              width: `${ROW_BUTTON_WIDTH}px`,
              height: `${currentRow.height}px`,
            }
      }
      onMouseDown={e => e.preventDefault()}
      onClick={handleRowButtonClick}
    >
      <EllipsisVertical className="table-row-action-icon" size={14} aria-hidden="true" />
    </button>
  )

  return (
    <>
      {usePortal && portalTarget
        ? createPortal(
            [
              singleButton,
              ...(showPlusButtons && tableSize
                ? [
                    <TableAddRowColumnButtons
                      key="add-buttons"
                      tableSize={tableSize}
                      focusedTableIndex={focusedTableIndexForPlus}
                      editor={editor}
                      editorWrapperRef={editorWrapperRef}
                    />,
                  ]
                : []),
            ],
            portalTarget
          )
        : singleButton}
      {menuOpen && boundaryElement && (
        <FloatingPortal root={boundaryElement as HTMLElement}>
          <div
            ref={el => {
              ;(menuRef as React.MutableRefObject<HTMLDivElement | null>).current = el
              floatingRefs.setFloating(el)
            }}
            className="table-row-action-menu"
            role="menu"
            style={floatingStyles}
            onMouseDown={e => e.preventDefault()}
          >
          <button
            type="button"
            role="menuitem"
            title={locale.table.insertRowAbove}
            onClick={() =>
              runRowAndClose(() => editor.chain().focus().addRowBefore().run(), 1)
            }
          >
            <BetweenVerticalStart size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title={locale.table.insertRowBelow}
            onClick={() =>
              runRowAndCloseAfter(() => editor.chain().focus().addRowAfter().run(), 0)
            }
          >
            <BetweenVerticalEnd size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title={(() => {
              const numRows = currentRow
                ? currentRow.lastRowIndex - currentRow.rowIndex + 1
                : 1
              if (focusedTableRowCount <= numRows) return locale.table.deleteWholeTable
              return numRows > 1
                ? locale.table.deleteSelectedRows(numRows)
                : locale.table.deleteCurrentRow
            })()}
            disabled={
              focusedTableRowCount <= 1
                ? false
                : !editor.can().deleteRow()
            }
            onClick={() => {
              const target = menuTargetRef.current
              const numRows = target ? target.lastRowIndex - target.rowIndex + 1 : 1
              runRowAndClose(() => {
                if (focusedTableRowCount <= numRows) {
                  editor.chain().focus().deleteTable().run()
                } else {
                  /* 链式删除 numRows 次：每次删除后光标留在同一行位置，下一行顶上来继续删 */
                  let chain = editor.chain().focus()
                  for (let i = 0; i < numRows; i++) {
                    chain = chain.deleteRow()
                  }
                  chain.run()
                }
              })
            }}
          >
            <IconTableDeleteRow size={16} />
          </button>
          <span className="separator" />
          <button
            type="button"
            role="menuitem"
            title={locale.table.mergeCells}
            disabled={
              !('mergeCells' in editor.commands) || !editor.can().mergeCells?.()
            }
            onClick={() =>
              runRowAndClose(() => editor.chain().focus().mergeCells().run())
            }
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
            onClick={() =>
              runRowAndClose(() => editor.chain().focus().splitCell().run())
            }
          >
            <TableCellsSplit size={16} />
          </button>
          <span className="separator" />
          <button
            type="button"
            role="menuitem"
            title={locale.table.toggleHeaderRow}
            onClick={() =>
              runRowAndClose(() => editor.chain().focus().toggleHeaderRow().run())
            }
          >
            <TableProperties size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title={locale.table.deleteWholeTable}
            onClick={() =>
              runRowAndClose(() => editor.chain().focus().deleteTable().run())
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
        </FloatingPortal>
      )}
    </>
  )
}

export default TableRowActions
