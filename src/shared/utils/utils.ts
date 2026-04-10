import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const

/**
 * 将字节数格式化为带合适单位的字符串（如 300KB、5MB、1.5MB）
 * 避免小体积用 MB 显示成 0MB
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'

  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    FILE_SIZE_UNITS.length - 1
  )
  const value = bytes / 1024 ** i
  const valueStr = value % 1 === 0 ? String(value) : value.toFixed(1)
  return `${valueStr} ${FILE_SIZE_UNITS[i]}`
}
