import "./index.css"

/** 单个分段选项。 */
export interface SegmentedSwitchOption {
  label: string
  value: string
}

/** 分段切换组件属性。 */
interface SegmentedSwitchProps {
  value: string
  onChange: (next: string) => void
  options: SegmentedSwitchOption[]
  disabled?: boolean
  className?: string
}

/** 上传/链接场景通用的分段切换控件（受控组件）。 */
export function SegmentedSwitch({
  value,
  onChange,
  options,
  disabled = false,
  className,
}: SegmentedSwitchProps) {
  return (
    <div className={className ? `segmented-switch ${className}` : 'segmented-switch'}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={
            option.value === value
              ? 'segmented-switch-option is-active'
              : 'segmented-switch-option'
          }
          disabled={disabled}
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
