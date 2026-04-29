import { TableCell, TableHeader } from '@tiptap/extension-table'

/** 表格水平对齐值。 */
export type TableCellTextAlign = 'left' | 'center' | 'right'

/** 表格垂直对齐值。 */
export type TableCellVerticalAlign = 'top' | 'middle' | 'bottom'

/**
 * 解析表格单元格水平对齐值。
 */
function parseTextAlign(element: HTMLElement): TableCellTextAlign | null {
  // HTML 中读取到的水平对齐值。
  const textAlign = element.style.textAlign

  return textAlign === 'left' || textAlign === 'center' || textAlign === 'right'
    ? textAlign
    : null
}

/**
 * 解析表格单元格垂直对齐值。
 */
function parseVerticalAlign(element: HTMLElement): TableCellVerticalAlign | null {
  // HTML 中读取到的垂直对齐值。
  const verticalAlign = element.style.verticalAlign

  return verticalAlign === 'top' || verticalAlign === 'middle' || verticalAlign === 'bottom'
    ? verticalAlign
    : null
}

/**
 * 渲染表格单元格水平对齐样式。
 */
function renderTextAlign(attributes: Record<string, unknown>) {
  if (!attributes.textAlign) return {}

  return { style: `text-align: ${attributes.textAlign}` }
}

/**
 * 渲染表格单元格垂直对齐样式。
 */
function renderVerticalAlign(attributes: Record<string, unknown>) {
  if (!attributes.verticalAlign) return {}

  return { style: `vertical-align: ${attributes.verticalAlign}` }
}

/** 带对齐属性的普通表格单元格。 */
export const TableCellWithAlignment = TableCell.extend({
  /**
   * 补充单元格对齐属性。
   */
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: parseTextAlign,
        renderHTML: renderTextAlign,
      },
      verticalAlign: {
        default: null,
        parseHTML: parseVerticalAlign,
        renderHTML: renderVerticalAlign,
      },
    }
  },
})

/** 带对齐属性的表头单元格。 */
export const TableHeaderWithAlignment = TableHeader.extend({
  /**
   * 补充表头单元格对齐属性。
   */
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: parseTextAlign,
        renderHTML: renderTextAlign,
      },
      verticalAlign: {
        default: null,
        parseHTML: parseVerticalAlign,
        renderHTML: renderVerticalAlign,
      },
    }
  },
})
