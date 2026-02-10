/**
 * 构建最小版本的 CSS（不包含 Tailwind 和 shadcn 基础样式）
 * 
 * 这个脚本在主构建之后运行，生成 md-tiptap-minimal.css
 */

import { copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const distDir = resolve(__dirname, '../dist')
const fullCssPath = resolve(distDir, 'md-tiptap.css')
const minimalCssPath = resolve(distDir, 'md-tiptap-minimal.css')

try {
  console.log('📦 Building minimal CSS...')
  
  // 暂时复制完整版本
  // TODO: 未来实现真正的最小版本（需要单独的 Vite 构建配置）
  copyFileSync(fullCssPath, minimalCssPath)
  
  console.log('✅ Minimal CSS created:', minimalCssPath)
  console.log('ℹ️  Note: Currently same as full version. Use separate build for true minimal version.')
} catch (error) {
  console.error('❌ Error building minimal CSS:', error)
  process.exit(1)
}
