import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ScanText,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/react/components/ui/popover'
import type { EditorLocale } from '@/shared/locales'
import type {
  TableCellTextAlign,
  TableCellVerticalAlign,
} from '@/core/extensions/TableCellAlignment'
import './index.css'

/** 表格对齐菜单属性。 */
interface TableAlignmentMenuProps {
  locale: EditorLocale
  container: HTMLElement | null
  /** 二级菜单碰撞边界，保持与行/列操作菜单一致 */
  collisionBoundary: HTMLElement | null
  activeTextAlign?: TableCellTextAlign | null
  activeVerticalAlign?: TableCellVerticalAlign | null
  onTextAlign: (align: TableCellTextAlign) => void
  onVerticalAlign: (align: TableCellVerticalAlign) => void
}

/**
 * 表格行/列菜单中的二级对齐菜单。
 */
export default function TableAlignmentMenu({
  locale,
  container,
  collisionBoundary,
  activeTextAlign,
  activeVerticalAlign,
  onTextAlign,
  onVerticalAlign,
}: TableAlignmentMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="menuitem"
          className="table-alignment-trigger"
          title={locale.table.alignment}
          aria-label={locale.table.alignment}
        >
          <ScanText size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        container={container}
        collisionBoundary={collisionBoundary}
        hideWhenDetached
        side="top"
        align="center"
        sideOffset={8}
        role="menu"
        className="table-alignment-submenu w-auto p-1"
        onMouseDown={event => event.preventDefault()}
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}
      >
        <button
          type="button"
          role="menuitemradio"
          title={locale.table.alignLeft}
          aria-label={locale.table.alignLeft}
          aria-checked={activeTextAlign === 'left'}
          className={activeTextAlign === 'left' ? 'is-active' : undefined}
          onClick={() => onTextAlign('left')}
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          role="menuitemradio"
          title={locale.table.alignCenter}
          aria-label={locale.table.alignCenter}
          aria-checked={activeTextAlign === 'center'}
          className={activeTextAlign === 'center' ? 'is-active' : undefined}
          onClick={() => onTextAlign('center')}
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          role="menuitemradio"
          title={locale.table.alignRight}
          aria-label={locale.table.alignRight}
          aria-checked={activeTextAlign === 'right'}
          className={activeTextAlign === 'right' ? 'is-active' : undefined}
          onClick={() => onTextAlign('right')}
        >
          <AlignRight size={16} />
        </button>
        <span className="table-alignment-separator" aria-hidden="true" />
        <button
          type="button"
          role="menuitemradio"
          title={locale.table.alignTop}
          aria-label={locale.table.alignTop}
          aria-checked={activeVerticalAlign === 'top'}
          className={activeVerticalAlign === 'top' ? 'is-active' : undefined}
          onClick={() => onVerticalAlign('top')}
        >
          <AlignVerticalJustifyStart size={16} />
        </button>
        <button
          type="button"
          role="menuitemradio"
          title={locale.table.alignMiddle}
          aria-label={locale.table.alignMiddle}
          aria-checked={activeVerticalAlign === 'middle'}
          className={activeVerticalAlign === 'middle' ? 'is-active' : undefined}
          onClick={() => onVerticalAlign('middle')}
        >
          <AlignVerticalJustifyCenter size={16} />
        </button>
        <button
          type="button"
          role="menuitemradio"
          title={locale.table.alignBottom}
          aria-label={locale.table.alignBottom}
          aria-checked={activeVerticalAlign === 'bottom'}
          className={activeVerticalAlign === 'bottom' ? 'is-active' : undefined}
          onClick={() => onVerticalAlign('bottom')}
        >
          <AlignVerticalJustifyEnd size={16} />
        </button>
      </PopoverContent>
    </Popover>
  )
}
