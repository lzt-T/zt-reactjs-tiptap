import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ScanText,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
} from 'lucide-react'
import {
  FloatingPortalPanel,
  useFloatingPortalPanel,
} from '@/react/hooks'
import { useCallback, useState } from 'react'
import type { EditorLocale } from '@/shared/locales'
import { MenuPlacement } from '@/react/editor/types'
import type {
  TableCellTextAlign,
  TableCellVerticalAlign,
} from '@/core/extensions/TableCellAlignment'
import './index.css'

/** 表格对齐菜单属性。 */
interface TableAlignmentMenuProps {
  locale: EditorLocale
  container: HTMLDivElement | null
  /** 二级菜单碰撞边界，保持与行/列操作菜单一致 */
  collisionBoundary: HTMLDivElement | null
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
  /** 对齐菜单是否展开。 */
  const [menuOpen, setMenuOpen] = useState(false)

  /** 关闭对齐菜单并清理定位。 */
  const closeMenu = useCallback(() => {
    setMenuOpen(false)
  }, [])

  /** 对齐菜单浮层定位。 */
  const alignmentPanel = useFloatingPortalPanel({
    open: menuOpen,
    portalContainer: container,
    editorWrapper: collisionBoundary,
    defaultPlacement: MenuPlacement.Top,
    placementBoundary: 'editor-wrapper',
    fallbackWidth: 220,
    fallbackHeight: 40,
    onOutside: closeMenu,
  })

  /** 切换对齐菜单展开状态。 */
  const handleTriggerClick = useCallback(() => {
    if (menuOpen) {
      closeMenu()
      return
    }
    alignmentPanel.updatePosition()
    setMenuOpen(true)
  }, [alignmentPanel, closeMenu, menuOpen])

  /** 执行水平对齐并关闭二级菜单。 */
  const handleTextAlign = useCallback(
    (align: TableCellTextAlign) => {
      onTextAlign(align)
      closeMenu()
    },
    [closeMenu, onTextAlign]
  )

  /** 执行垂直对齐并关闭二级菜单。 */
  const handleVerticalAlign = useCallback(
    (align: TableCellVerticalAlign) => {
      onVerticalAlign(align)
      closeMenu()
    },
    [closeMenu, onVerticalAlign]
  )

  /** 对齐菜单 Portal 内容。 */
  const menuContent =
    menuOpen && container
      ? (
        <FloatingPortalPanel
          panel={alignmentPanel}
          portalContainer={container}
          role="menu"
          className="table-alignment-submenu w-auto p-1"
          zIndex={46}
          onMouseDown={event => event.preventDefault()}
        >
          <button
            type="button"
            role="menuitemradio"
            title={locale.table.alignLeft}
            aria-label={locale.table.alignLeft}
            aria-checked={activeTextAlign === 'left'}
            className={activeTextAlign === 'left' ? 'is-active' : undefined}
            onClick={() => handleTextAlign('left')}
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
            onClick={() => handleTextAlign('center')}
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
            onClick={() => handleTextAlign('right')}
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
            onClick={() => handleVerticalAlign('top')}
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
            onClick={() => handleVerticalAlign('middle')}
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
            onClick={() => handleVerticalAlign('bottom')}
          >
            <AlignVerticalJustifyEnd size={16} />
          </button>
        </FloatingPortalPanel>
      )
      : null

  return (
    <>
      <button
        ref={alignmentPanel.triggerRef}
        type="button"
        role="menuitem"
        className="table-alignment-trigger"
        title={locale.table.alignment}
        aria-label={locale.table.alignment}
        aria-expanded={menuOpen}
        onClick={handleTriggerClick}
      >
        <ScanText size={16} />
      </button>
      {menuContent}
    </>
  )
}
