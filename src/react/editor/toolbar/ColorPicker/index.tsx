import { useState } from 'react'
import type { ColorOption } from '@/shared/config'
import type { EditorLocale } from '@/shared/locales'
import './ColorPicker.css'

interface ColorPickerProps {
  onColorSelect: (color: string) => void
  options: ColorOption[]
  type: 'text' | 'highlight'
  /** 当前选中的颜色（与预设或自定义色值一致时，对应色块显示蓝色边框） */
  selectedColor?: string
  style?: React.CSSProperties
  className?: string
  locale: EditorLocale
}

/** 规范化色值便于比较（小写，无空格） */
function normalizeColor(value: string): string {
  return value ? value.trim().toLowerCase() : ''
}

/** 判断是否为合法 HEX 色值（#RGB / #RRGGBB）。 */
function isValidHexColor(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
}

const ColorPicker = ({
  onColorSelect,
  options,
  type,
  selectedColor,
  style,
  className,
  locale,
}: ColorPickerProps) => {
  void type
  const [showCustomInput, setShowCustomInput] = useState(false)
  // 自定义 HEX 输入值；仅在合法时提交。
  const [customHex, setCustomHex] = useState('')
  // 标记输入框是否已触发校验，用于展示可见错误状态。
  const [hexTouched, setHexTouched] = useState(false)
  const normalizedSelected = normalizeColor(selectedColor ?? '')
  // 仅当输入值不合法且已触发校验时展示错误态。
  const hasHexError = hexTouched && customHex.trim() !== '' && !isValidHexColor(customHex)

  /** 打开自定义颜色输入区，并预填当前选中颜色（若为 HEX）。 */
  const handleOpenCustomInput = () => {
    const nextValue = isValidHexColor(normalizedSelected) ? normalizedSelected : ''
    setCustomHex(nextValue)
    setHexTouched(false)
    setShowCustomInput(true)
  }

  /** 尝试提交自定义颜色；仅合法 HEX 才调用 onColorSelect。 */
  const trySubmitCustomHex = () => {
    const nextColor = customHex.trim()
    setHexTouched(true)
    if (!isValidHexColor(nextColor)) return
    onColorSelect(normalizeColor(nextColor))
  }

  return (
    <div className={`color-picker${className ? ` ${className}` : ''}`} style={style}>
      <div className="color-picker-grid">
        {options.map((color) => {
          const isSelected = normalizedSelected
            ? normalizeColor(color.value) === normalizedSelected
            : false
          return (
            <button
              type="button"
              key={color.value || 'transparent'}
              className={`color-picker-swatch${color.value === '' ? ' color-picker-swatch--transparent' : ''}${isSelected ? ' color-picker-swatch--selected' : ''}`}
              style={color.value ? { backgroundColor: color.value } : undefined}
              onClick={() => onColorSelect(color.value)}
              title={color.name}
            />
          )
        })}
      </div>
      <div className="color-picker-custom-slot">
        {!showCustomInput ? (
          <button
            type="button"
            className="color-picker-custom-btn"
            onClick={handleOpenCustomInput}
          >
            {locale.colorPicker.customColor}
          </button>
        ) : (
          <div className="color-picker-custom">
            <span
              className="color-picker-custom-preview"
              style={isValidHexColor(customHex) ? { backgroundColor: normalizeColor(customHex) } : undefined}
              aria-hidden="true"
            />
            <input
              type="text"
              value={customHex}
              onChange={(event) => {
                setCustomHex(event.target.value)
                if (hexTouched) setHexTouched(false)
              }}
              onBlur={trySubmitCustomHex}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                trySubmitCustomHex()
              }}
              className={`color-picker-input${hasHexError ? ' is-invalid' : ''}`}
              placeholder="#RRGGBB"
              aria-invalid={hasHexError}
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ColorPicker
