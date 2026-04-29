import type { Editor } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type {
  TableCellTextAlign,
  TableCellVerticalAlign,
} from '@/core/extensions/TableCellAlignment'

/** 表格对齐属性名。 */
type TableAlignmentAttribute = 'textAlign' | 'verticalAlign'

/** 表格对齐属性值。 */
type TableAlignmentValue = TableCellTextAlign | TableCellVerticalAlign

/** 表格当前对齐状态。 */
export interface TableAlignmentState {
  textAlign: TableCellTextAlign | null
  verticalAlign: TableCellVerticalAlign | null
}

/** 表格对齐目标。 */
export type TableAlignmentTarget =
  | {
      type: 'row'
      tableIndex: number
      rowIndex: number
      lastRowIndex: number
    }
  | {
      type: 'column'
      tableIndex: number
      columnIndex: number
      lastColumnIndex: number
    }

/**
 * 根据行/列菜单目标收集需要更新的 DOM 单元格。
 */
function collectTargetCells(
  table: HTMLTableElement,
  target: TableAlignmentTarget
): HTMLTableCellElement[] {
  // 去重后的目标单元格。
  const cells = new Set<HTMLTableCellElement>()

  if (target.type === 'row') {
    for (let rowIndex = target.rowIndex; rowIndex <= target.lastRowIndex; rowIndex++) {
      // 当前目标行。
      const row = table.rows[rowIndex]
      if (!row) continue

      Array.from(row.cells).forEach(cell => cells.add(cell))
    }
  } else {
    Array.from(table.rows).forEach(row => {
      for (
        let columnIndex = target.columnIndex;
        columnIndex <= target.lastColumnIndex;
        columnIndex++
      ) {
        // 当前目标列单元格。
        const cell = row.cells[columnIndex]
        if (cell) cells.add(cell)
      }
    })
  }

  return Array.from(cells)
}

/**
 * 从 DOM 单元格解析真正的 ProseMirror 单元格节点位置。
 */
function resolveCellNode(
  editor: Editor,
  cell: HTMLTableCellElement
): { pos: number; node: ProseMirrorNode } | null {
  // 单元格内容起始位置。
  const contentPos = editor.view.posAtDOM(cell, 0)
  // 单元格节点自身位置。
  const cellPos = contentPos - 1
  // 单元格节点。
  const node = editor.state.doc.nodeAt(cellPos)

  if (!node || (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader')) {
    return null
  }

  return { pos: cellPos, node }
}

/**
 * 读取节点水平对齐值，未设置时按默认左对齐处理。
 */
function getNodeTextAlign(node: ProseMirrorNode): TableCellTextAlign {
  // 单元格水平对齐属性。
  const textAlign = node.attrs.textAlign

  return textAlign === 'center' || textAlign === 'right' ? textAlign : 'left'
}

/**
 * 读取节点垂直对齐值，未设置时按默认垂直居中处理。
 */
function getNodeVerticalAlign(node: ProseMirrorNode): TableCellVerticalAlign {
  // 单元格垂直对齐属性。
  const verticalAlign = node.attrs.verticalAlign

  return verticalAlign === 'top' || verticalAlign === 'bottom'
    ? verticalAlign
    : 'middle'
}

/**
 * 判断候选值是否在目标单元格中保持一致。
 */
function resolveMixedValue<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null

  // 第一个单元格的对齐值。
  const firstValue = values[0]

  return values.every(value => value === firstValue) ? firstValue : null
}

/**
 * 读取目标范围内的当前对齐状态。
 */
export function getTableCellAlignmentState(
  editor: Editor,
  editorWrapper: HTMLDivElement | null,
  target: TableAlignmentTarget | null
): TableAlignmentState {
  if (!target || !editorWrapper) {
    return { textAlign: null, verticalAlign: null }
  }

  // 编辑器内容根节点。
  const proseMirror = editorWrapper.querySelector('.ProseMirror')
  // 当前编辑器内的所有表格。
  const tables = proseMirror?.querySelectorAll('table')
  // 当前行/列菜单所在表格。
  const table = tables?.[target.tableIndex] as HTMLTableElement | undefined
  if (!table) return { textAlign: null, verticalAlign: null }

  // 需要读取的目标单元格。
  const cells = collectTargetCells(table, target)
  // 目标范围内的水平对齐值。
  const textAligns: TableCellTextAlign[] = []
  // 目标范围内的垂直对齐值。
  const verticalAligns: TableCellVerticalAlign[] = []

  cells.forEach(cell => {
    try {
      // 目标单元格节点信息。
      const cellNode = resolveCellNode(editor, cell)
      if (!cellNode) return

      textAligns.push(getNodeTextAlign(cellNode.node))
      verticalAligns.push(getNodeVerticalAlign(cellNode.node))
    } catch {
      // DOM 与文档位置短暂不同步时跳过该单元格。
    }
  })

  return {
    textAlign: resolveMixedValue(textAligns),
    verticalAlign: resolveMixedValue(verticalAligns),
  }
}

/**
 * 将对齐属性写入目标单元格节点。
 */
export function applyTableCellAlignment(
  editor: Editor,
  editorWrapper: HTMLDivElement | null,
  target: TableAlignmentTarget | null,
  attribute: TableAlignmentAttribute,
  value: TableAlignmentValue
): boolean {
  if (!target || !editorWrapper) return false

  // 编辑器内容根节点。
  const proseMirror = editorWrapper.querySelector('.ProseMirror')
  // 当前编辑器内的所有表格。
  const tables = proseMirror?.querySelectorAll('table')
  // 当前行/列菜单所在表格。
  const table = tables?.[target.tableIndex] as HTMLTableElement | undefined
  if (!table) return false

  // 需要更新的目标单元格。
  const cells = collectTargetCells(table, target)
  if (cells.length === 0) return false

  // 当前 ProseMirror 事务。
  const transaction = editor.state.tr
  // 是否存在实际属性变更。
  let changed = false

  cells.forEach(cell => {
    try {
      // 目标单元格节点信息。
      const cellNode = resolveCellNode(editor, cell)
      if (!cellNode) return

      const { node, pos } = cellNode
      if (node.attrs[attribute] === value) return

      transaction.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        [attribute]: value,
      })
      changed = true
    } catch {
      // DOM 与文档位置短暂不同步时跳过该单元格。
    }
  })

  if (!changed) return false

  editor.view.dispatch(transaction)
  editor.view.focus()

  return true
}
