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
import TableAddRowColumnButtons, { TABLE_ADD_BAR_SIZE } from '../TableAddRowColumnButtons'
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

/** 行操作按钮宽度，与 config.TABLE_ACTION_BUTTON_SIZE 一致 */
const ROW_BUTTON_WIDTH = config.TABLE_ACTION_BUTTON_SIZE
/** 按钮与表格左边缘的间距 */
const ROW_BUTTON_GAP = 2

const TableRowActions = ({ editor, editorWrapperRef }: TableRowActionsProps) => {
  const [rows, setRows] = useState<RowActionItem[]>([])
  /** 当前选区所在行的 key，仅该行显示操作按钮 */
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null)
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  /** 打开菜单时记录目标行信息，供 useTableInsertRowRunAndClose 用 */
  const menuTargetRef = useRef<{
    firstCellPos: number
    tableIndex: number
    rowIndex: number
  } | null>(null)
  /** Portal 目标（用 state 以便在 render 中使用，不读 ref） */
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null)
  /** 在 tableWrapper 坐标系下的行按钮位置（仅在有 portal 时使用） */
  const [portalRowPositions, setPortalRowPositions] = useState<
    { item: RowActionItem; top: number; left: number; height: number }[]
  >([])
  /** 聚焦表格尺寸，用于下方/右侧加号按钮定位；有 portal 时设置 */
  const [tableSize, setTableSize] = useState<{ width: number; height: number } | null>(null)
  /** 聚焦表格 index，加号按钮点击时用于定位表格 */
  const [focusedTableIndexForPlus, setFocusedTableIndexForPlus] = useState<number | null>(null)
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
      setRows([])
      setFocusedRowKey(null)
      setPortalTarget(null)
      setPortalRowPositions([])
      setTableSize(null)
      setFocusedTableIndexForPlus(null)
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

    /* 计算 tableWrapper 内 absolute 定位用的坐标，用于 Portal 渲染（无需监听 scroll） */
    if (nextFocusedKey != null && tables.length) {
      const ti = parseInt(nextFocusedKey.split('-')[0], 10)
      const table = tables[ti] as HTMLTableElement | undefined
      const tableWrapper = table?.closest?.('.tableWrapper') as HTMLDivElement | undefined
      let portalTarget: HTMLDivElement | null = tableWrapper ?? null
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
        portalTarget = scrollWrapper
      }
      setPortalTarget(portalTarget)
      if (portalTarget && table) {
        setTableSize({ width: table.offsetWidth, height: table.offsetHeight })
        setFocusedTableIndexForPlus(ti)
      } else {
        setTableSize(null)
        setFocusedTableIndexForPlus(null)
      }
      if (portalTarget) {
        const twRect = portalTarget.getBoundingClientRect()
        const visibleRows = result.filter(
          r => r.tableIndex === ti && `${r.tableIndex}-${r.rowIndex}` === nextFocusedKey
        )
        /* 与 config.TABLE_ACTION_BUTTON_PADDING 一致，使按钮落在预留区而非表格内 */
        const tableLeftPadding = config.TABLE_ACTION_BUTTON_PADDING
        const portalPositions = visibleRows.map(item => {
          const tr = table?.rows[item.rowIndex]
          const trRect = tr?.getBoundingClientRect()
          return {
            item,
            top: trRect ? trRect.top - twRect.top : item.top,
            left: -tableLeftPadding,
            height: item.height,
          }
        })
        setPortalRowPositions(portalPositions)
      } else {
        setPortalRowPositions([])
      }
    } else {
      setPortalTarget(null)
      setPortalRowPositions([])
      setTableSize(null)
      setFocusedTableIndexForPlus(null)
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
    /* 按钮已 Portal 到 tableWrapper 内，随表格滚动，无需监听 scroll */
  }, [editor, editorWrapperRef, updatePositions])

  const handleRowButtonClick = useCallback(
    (e: React.MouseEvent, item: RowActionItem) => {
      e.preventDefault()
      e.stopPropagation()
      const key = `row-${item.tableIndex}-${item.rowIndex}`
      menuTargetRef.current = {
        firstCellPos: item.firstCellPos,
        tableIndex: item.tableIndex,
        rowIndex: item.rowIndex,
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
  useEffect(() => {
    if (!openMenuKey) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    const onClickOutside = (e: MouseEvent) => {
      const hitRowBtn = rows.some(r =>
        buttonRefs.current.get(`row-${r.tableIndex}-${r.rowIndex}`)?.contains(e.target as Node)
      )
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !hitRowBtn
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

  const rowKey = (item: RowActionItem) => `row-${item.tableIndex}-${item.rowIndex}`
  const visibleRows = rows.filter(item => {
    const key = rowKey(item)
    const focusedMatch = focusedRowKey === `${item.tableIndex}-${item.rowIndex}`
    return focusedMatch || key === openMenuKey
  })

  /** 当前打开菜单所在表格的行数（仅一行时“删除行”改为删除整个表格） */
  let currentTableRowCount = 0
  if (openMenuKey) {
    const parts = openMenuKey.split('-')
    const tIdx = parts.length >= 2 ? parseInt(parts[1], 10) : -1
    currentTableRowCount = rows.filter(r => r.tableIndex === tIdx).length
  }

  /* 有 portal 目标时把按钮挂到表格滚动容器内，absolute 定位随表格滚动 */
  const usePortal = Boolean(portalTarget && portalRowPositions.length > 0)
  const showPlusButtons = Boolean(portalTarget && tableSize)

  const rowButtons =
    usePortal
      ? portalRowPositions.map(({ item, top, left, height }) => {
          const key = rowKey(item)
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
                top: `${top}px`,
                left: `${left}px`,
                width: `${ROW_BUTTON_WIDTH}px`,
                height: `${height}px`,
              }}
              onMouseDown={e => e.preventDefault()}
              onClick={e => handleRowButtonClick(e, item)}
            >
              <EllipsisVertical className="table-row-action-icon" size={14} aria-hidden="true" />
            </button>
          )
        })
      : visibleRows.map(item => {
          const key = rowKey(item)
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
                width: `${ROW_BUTTON_WIDTH}px`,
                height: `${item.height}px`,
              }}
              onMouseDown={e => e.preventDefault()}
              onClick={e => handleRowButtonClick(e, item)}
            >
              <EllipsisVertical className="table-row-action-icon" size={14} aria-hidden="true" />
            </button>
          )
        })

  return (
    <>
      {usePortal && portalTarget
        ? createPortal(
            [
              ...rowButtons,
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
        : rowButtons}
      {openMenuKey && boundaryElement && (
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
            title="在上方插入行"
            onClick={() =>
              runRowAndClose(() => editor.chain().focus().addRowBefore().run(), 1)
            }
          >
            <BetweenVerticalStart size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title="在下方插入行"
            onClick={() =>
              runRowAndClose(() => editor.chain().focus().addRowAfter().run(), 0)
            }
          >
            <BetweenVerticalEnd size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title={currentTableRowCount <= 1 ? '删除整个表格' : '删除当前行'}
            disabled={
              currentTableRowCount <= 1
                ? false
                : !editor.can().deleteRow()
            }
            onClick={() =>
              runRowAndClose(() =>
                currentTableRowCount <= 1
                  ? editor.chain().focus().deleteTable().run()
                  : editor.chain().focus().deleteRow().run()
              )
            }
          >
            <IconTableDeleteRow size={16} />
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
              runRowAndClose(() => editor.chain().focus().mergeCells().run())
            }
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
            title="切换表头行"
            onClick={() =>
              runRowAndClose(() => editor.chain().focus().toggleHeaderRow().run())
            }
          >
            <TableProperties size={16} />
          </button>
          <button
            type="button"
            role="menuitem"
            title="删除整个表格"
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
