import type { SVGProps } from 'react'
import TableDeleteRowSvg from './svg/table-delete-row.svg?react'

export interface IconTableDeleteRowProps extends SVGProps<SVGSVGElement> {
  size?: number
}

export function IconTableDeleteRow({
  size = 16,
  ...props
}: IconTableDeleteRowProps) {
  return (
    <TableDeleteRowSvg
      width={size}
      height={size}
      aria-hidden
      {...props}
    />
  )
}
