import { useState } from 'react'
import { config } from '@/shared/config'
import type { EditorLocale } from '@/shared/locales'
import './ColorPicker.css'

interface ColorPickerProps {
  onColorSelect: (color: string) => void
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

const ColorPicker = ({
  onColorSelect,
  type,
  selectedColor,
  style,
  locale,
}: ColorPickerProps) => {
  const colors = type === 'text' ? config.TEXT_COLORS : config.HIGHLIGHT_COLORS
  const [showCustomInput, setShowCustomInput] = useState(false)
  const normalizedSelected = normalizeColor(selectedColor ?? '')

  return (
    <div className="color-picker" style={style}>
      <div className="color-picker-grid">
        {colors.map((color) => {
          const isSelected = normalizedSelected
            ? normalizeColor(color.value) === normalizedSelected
            : false
          return (
            <button
              key={color.value || 'transparent'}
              className={`color-picker-swatch${color.value === '' ? ' color-picker-swatch--transparent' : ''}${isSelected ? ' color-picker-swatch--selected' : ''}`}
              style={color.value ? { backgroundColor: color.value } : undefined}
              onClick={() => onColorSelect(color.value)}
              title={color.name}
            />
          )
        })}
      </div>
      {!showCustomInput && (
        <button 
          className="color-picker-custom-btn"
          onClick={() => setShowCustomInput(true)}
        >
          {locale.colorPicker.customColor}
        </button>
      )}
      {showCustomInput && (
        <div className="color-picker-custom">
          <input
            type="color"
            onChange={(e) => onColorSelect(e.target.value)}
            className="color-picker-input"
          />
          <button
            className="color-picker-close-btn"
            onClick={() => setShowCustomInput(false)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default ColorPicker
