import type { SVGProps } from 'react'
import TableDeleteColumnSvg from './svg/table-delete-column.svg?react'

export interface IconTableDeleteColumnProps extends SVGProps<SVGSVGElement> {
  size?: number
}

export function IconTableDeleteColumn({
  size = 16,
  ...props
}: IconTableDeleteColumnProps) {
  return (
    <TableDeleteColumnSvg
      width={size}
      height={size}
      aria-hidden
      {...props}
    />
  )
}
