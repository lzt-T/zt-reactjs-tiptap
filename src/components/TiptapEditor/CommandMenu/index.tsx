import type { CommandItem } from '../extensions/SlashCommands'
import './CommandMenu.css'
import { useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useFloating, flip, shift, offset, size } from '@floating-ui/react'

interface CommandMenuProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
  selectedIndex: number
  position: { top: number; left: number }
}

const CommandMenu = ({ items, command, selectedIndex, position }: CommandMenuProps) => {
  const selectedRef = useRef<HTMLButtonElement>(null)

  // 自动滚动选中项
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  // 创建虚拟参考元素（基于传入的 position）
  const virtualElement = useMemo(() => ({
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      x: position.left,
      y: position.top,
      top: position.top,
      left: position.left,
      right: position.left,
      bottom: position.top,
    }),
  }), [position.left, position.top]) as unknown as Element

  // 使用 Floating UI 处理定位
  const { refs, floatingStyles } = useFloating({
    elements: {
      reference: virtualElement,
    },
    placement: 'bottom-start',
    middleware: [
      offset(({ placement }) => {
        // 根据菜单位置返回不同的偏移值
        return placement.startsWith('top') ? 32 : 8 // 上方 32px，下方 8px
      }),
      flip({
        padding: 16, // 翻转时保持视口边距
        fallbackPlacements: ['top-start', 'bottom-start'], // 优先翻转到上方
      }),
      shift({ padding: 16 }), // 水平方向保持在视口内
      size({
        padding: 16,
        apply({ availableHeight, elements }) {
          // 限制菜单最大高度，取可用高度和 320px 中的较小值
          const maxHeight = Math.min(availableHeight, 320)
          Object.assign(elements.floating.style, {
            maxHeight: `${maxHeight}px`,
          })
        },
      }),
    ],
  })

  if (items.length === 0) {
    return null
  }

  // 使用 Portal 将菜单渲染到 body 下，避免被父容器裁剪
  return createPortal(
    <div 
      // eslint-disable-next-line
      ref={refs.setFloating}
      className="command-menu"
      style={floatingStyles}
    >
      {items.map((item, index) => (
        <button
          key={item.title}
          ref={index === selectedIndex ? selectedRef : null}
          className={`command-menu-item ${index === selectedIndex ? 'is-selected' : ''}`}
          onClick={() => command(item)}
        >
          <div className="command-menu-icon">{item.icon}</div>
          <div className="command-menu-title">{item.title}</div>
        </button>
      ))}
    </div>,
    document.body
  )
}

export default CommandMenu
