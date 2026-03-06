# zt-reactjs-tiptap

基于 TipTap 的 React 富文本编辑器组件，支持 **Notion 风格**（斜杠命令、块状编辑）与 **Headless**（顶部工具栏、可嵌入自定义 UI）两种模式。

[![npm version](https://img.shields.io/npm/v/zt-reactjs-tiptap.svg)](https://www.npmjs.com/package/zt-reactjs-tiptap)
[![license](https://img.shields.io/npm/l/zt-reactjs-tiptap.svg)](https://www.npmjs.com/package/zt-reactjs-tiptap)

**GitHub:** [https://github.com/lzt-T/md-tiptap](https://github.com/lzt-T/md-tiptap)

## 特性

- ✨ 丰富的文本格式化选项（粗体、斜体、下划线、删除线、行内代码）
- 📝 支持标题（H1、H2、H3）、列表（有序/无序）、引用、代码块
- 🖼️ 图片插入和管理（支持文件上传和 URL 插入）
- 📊 完整表格支持（插入/删除行列、切换表头、删除表格）
- ✅ 任务列表（带复选框的可交互待办事项）
- 🎨 文本颜色和背景高亮
- 🔢 数学公式支持（行内和块级 LaTeX 公式，基于 KaTeX）
- ⚡ 斜杠命令（输入 `/` 快速插入各种内容块）
- 🎯 气泡菜单（选中文本时显示格式化工具栏）
- 🔄 撤销/重做支持
- 📐 文本对齐（左对齐、居中、右对齐、两端对齐）
- ⬆️⬇️ 上标/下标支持
- 📄 HTML/DOM 转纯文本工具（与编辑器 `getText()` 一致）

## 安装

```bash
npm install zt-reactjs-tiptap
# 或
pnpm add zt-reactjs-tiptap
# 或
yarn add zt-reactjs-tiptap
```

## 使用

### 基础使用

```tsx
import { TiptapEditor } from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'  // 必须导入样式

function App() {
  const [content, setContent] = useState('<p>Hello World!</p>')

  return (
    <TiptapEditor
      value={content}
      onChange={setContent}
    />
  )
}
```

### 带图片上传

```tsx
import { TiptapEditor } from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'

function App() {
  const [content, setContent] = useState('<p>Hello World!</p>')

  const handleImageUpload = async (file: File) => {
    // 实现你的图片上传逻辑
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()
    return data.url
  }

  return (
    <TiptapEditor
      value={content}
      onChange={setContent}
      onImageUpload={handleImageUpload}
    />
  )
}
```

### 受控组件完整示例

```tsx
import { useState } from 'react'
import { TiptapEditor } from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'

function EditorExample() {
  const [content, setContent] = useState('<p>开始编辑...</p>')

  const handleImageUpload = async (file: File): Promise<string> => {
    // 示例：上传到服务器
    const formData = new FormData()
    formData.append('image', file)
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    
    const data = await response.json()
    return data.url
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>我的编辑器</h1>
      <TiptapEditor
        value={content}
        onChange={(html) => {
          setContent(html)
          console.log('内容已更新:', html)
        }}
        onImageUpload={handleImageUpload}
      />
      <div style={{ marginTop: '20px' }}>
        <h3>当前 HTML 内容：</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
          {content}
        </pre>
      </div>
    </div>
  )
}
```

## Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `value` | `string` | 否 | - | 编辑器的 HTML 内容 |
| `onChange` | `(html: string) => void` | 否 | - | 内容变化时的回调函数，参数为 HTML 字符串 |
| `onImageUpload` | `(file: File) => Promise<string>` | 否 | - | 图片上传处理函数，需返回图片 URL。若不提供，图片将以 Base64 格式插入 |
| `editorMode` | `'notion-like' \| 'headless'` | 否 | `'notion-like'` | 编辑器模式：Notion 风格（斜杠命令、块状编辑等）或无头模式 |
| `headlessToolbarMode` | `'always' \| 'on-focus'` | 否 | `'always'` | **仅在 `editorMode='headless'` 时生效**。`always`：工具栏始终显示；`on-focus`：编辑器聚焦或点击工具栏时显示，失焦到编辑器区域外时隐藏 |
| `commandMenuMaxHeight` | `number` | 否 | `240` | 斜杠命令菜单最大高度（px） |
| `commandMenuMinHeight` | `number` | 否 | `160` | 斜杠命令菜单最小高度（px） |
| `placeholder` | `string` | 否 | `"输入 '/' 查看命令..."` | 编辑器为空时的占位文本 |
| `disabled` | `boolean` | 否 | `false` | 是否禁用编辑器（只读） |
| `onChangeDebounceMs` | `number` | 否 | `300` | `onChange` 防抖延迟（毫秒） |
| `border` | `boolean` | 否 | `true` | 是否显示编辑器容器边框 |
| `imageMaxSizeBytes` | `number` | 否 | `5242880`（5MB） | 图片上传最大体积（字节），超过则拒绝并提示 |
| `formulaCategories` | `FormulaPickerCategory[]` | 否 | 内置默认分类 | 公式选择器的分类列表。不传则使用内置分类；传入时可完全自定义或在默认基础上扩展（见下方「扩展公式分类」） |
| `maxHeight` | `number \| string` | 否 | - | 编辑器容器的最大高度。不配置时容器为 `height: 100%`；配置后高度随内容从较小开始增长，达到该值后不再增高，超出部分在编辑区内滚动。数字表示像素（如 `400`），字符串为任意合法 CSS 长度（如 `"50vh"`、`"20rem"`） |

### 限制编辑器最大高度（maxHeight）

不配置时编辑器容器占满父级高度（`height: 100%`）。传入 `maxHeight` 后，高度会随内容从较小开始增长，达到设定值后不再增高，超出部分在编辑区内滚动。

```tsx
// 最大高度 400px，内容少时较矮，内容多到 400px 后内部滚动
<TiptapEditor value={content} onChange={setContent} maxHeight={400} />

// 使用 CSS 长度，如视口高度的一半
<TiptapEditor value={content} onChange={setContent} maxHeight="50vh" />
```

### Headless 模式下的工具栏显示

在 `editorMode="headless"` 时，可以通过 `headlessToolbarMode` 控制顶部工具栏的显示策略：

- `headlessToolbarMode="always"`：工具栏始终显示。
- `headlessToolbarMode="on-focus"`：当编辑器获得焦点或用户点击工具栏区域时显示；当焦点离开整个编辑器容器（包括工具栏）后隐藏。点击工具栏按钮本身不会导致工具栏立即消失。

示例：

```tsx
<TiptapEditor editorMode="headless" headlessToolbarMode="on-focus" />
```

## 功能说明

### 斜杠命令

在编辑器中输入 `/` 可以打开命令菜单，快速插入以下内容：

- **标题**：H1、H2、H3
- **列表**：有序列表、无序列表、任务列表
- **引用块**：带左边框的引用样式
- **代码块**：语法高亮的代码块
- **表格**：插入 3x3 表格
- **图片**：打开图片上传对话框
- **数学公式**：行内公式、块级公式
- **分割线**：水平分隔线

**操作方式**：
- 输入 `/` 打开命令菜单
- 使用 ↑ ↓ 方向键选择
- 按 Enter 确认插入
- 按 Escape 关闭菜单

### 气泡菜单

选中文本时会显示浮动工具栏，包含以下功能：

- **文本样式**：粗体、斜体、下划线、删除线、行内代码
- **颜色**：文本颜色（10种预设 + 自定义）、背景高亮
- **对齐**：左对齐、居中、右对齐、两端对齐
- **标题**：快速切换 H1/H2/H3/正文
- **上标/下标**：数学公式常用
- **清除格式**：一键移除所有格式

### 表格操作

插入表格后，点击表格任意位置会显示表格工具栏，支持：

- 在上方/下方插入行
- 在左侧/右侧插入列
- 删除当前行/列
- 切换表头行
- 删除整个表格

**提示**：鼠标悬停在表格上会显示操作按钮。

### 数学公式

基于 KaTeX 支持 LaTeX 格式的数学公式：

- **行内公式**：使用斜杠命令选择"行内公式"，例如：`E = mc^2`
- **块级公式**：使用斜杠命令选择"块级公式"，例如：
  ```
  \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
  ```
- **编辑公式**：点击已插入的公式可以打开编辑对话框修改
- **实时预览**：编辑时实时渲染公式效果

**扩展公式分类**：可通过 `formulaCategories` 自定义或扩展公式选择器中的分类与片段。库会导出 `FORMULA_CATEGORIES`、`FormulaPickerCategory`、`FormulaSnippetItem`，便于在默认基础上追加分类：

```tsx
import {
  TiptapEditor,
  FORMULA_CATEGORIES,
  type FormulaPickerCategory,
  type FormulaSnippetItem,
} from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'

const customCategory: FormulaPickerCategory = {
  id: 'custom',
  title: '自定义',
  items: [
    { id: 'my-1', label: '我的公式', latex: '\\mycommand{x}' },
  ] as FormulaSnippetItem[],
}

<TiptapEditor
  formulaCategories={[...FORMULA_CATEGORIES, customCategory]}
/>
```

### HTML 转纯文本

库导出 `htmlToPlainText` 与 `domToPlainText`，使用与编辑器相同的 schema 将 HTML 或 DOM 转为纯文本，结果与编辑器实例的 `getText()` 一致（如图片→`[image]`、公式→`[latex]`、表格→`[table]` 等）。

```tsx
import { htmlToPlainText, domToPlainText } from 'zt-reactjs-tiptap'

// 从 HTML 字符串
const text = htmlToPlainText('<p>Hello</p><p>World</p>')
// => 'Hello\nWorld'

// 从 DOM 元素（如编辑器内容区）
const el = document.querySelector('.editor-content')
const text2 = domToPlainText(el)

// 单行模式（块之间用空格、换行替换为空格）
const oneLine = htmlToPlainText(html, { singleLine: true })

// 自定义块分隔符
const custom = htmlToPlainText(html, { blockSeparator: '\n\n' })
```

**选项 `HtmlToPlainTextOptions`**：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `blockSeparator` | `string` | `'\n'` | 块级节点之间的分隔符；`singleLine: true` 时视为 `' '` |
| `singleLine` | `boolean` | `false` | 为 `true` 时块之间用空格连接，结果中的换行会替换为空格 |

### 图片上传

支持两种方式插入图片：

1. **文件上传**：拖拽或选择本地图片文件
2. **URL 插入**：通过图片链接地址插入

**图片处理**：
- 如果提供 `onImageUpload` 函数，图片将上传到服务器并返回 URL
- 如果没有提供，图片将以 Base64 格式直接嵌入（适合小图片）
- 支持 JPG、PNG、GIF 等常见格式
- 建议图片大小不超过 5MB

### 任务列表

支持创建可交互的待办事项列表：
- 使用斜杠命令插入"任务列表"
- 点击复选框可切换完成状态
- 支持嵌套任务（任务列表内再插入任务列表）

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + B` | 粗体 |
| `Ctrl/Cmd + I` | 斜体 |
| `Ctrl/Cmd + U` | 下划线 |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` | 重做 |
| `/` | 打开斜杠命令菜单 |
| `Tab` | 增加列表缩进 |
| `Shift + Tab` | 减少列表缩进 |

## 依赖要求

- React >= 18.0.0
- React DOM >= 18.0.0

## 样式系统

### 样式导入

```tsx
import 'zt-reactjs-tiptap/style.css'
```

样式文件包含：
- ✅ Tailwind CSS v4 基础样式
- ✅ shadcn/ui 主题变量
- ✅ 编辑器组件样式
- ✅ KaTeX 数学公式样式

**文件大小**：CSS 约 1.5MB（gzip 后约 950KB）

### 在其它项目中使用时样式不对？

1. **务必导入样式**：在使用编辑器的组件或入口文件顶部导入 `import 'zt-reactjs-tiptap/style.css'`

2. **导入顺序**：若希望用自己项目的主题覆盖编辑器主题，请先导入 `zt-reactjs-tiptap/style.css`，再导入你的全局样式

3. **CSS 变量覆盖**：在你的全局样式中定义或覆盖 CSS 变量（如 `--primary`、`--background`、`--border` 等）

4. **弹层/对话框**：插入图片、公式等弹层通过 Portal 渲染到 `document.body`，库的样式为全局样式。若仍被覆盖，检查是否有全局 reset 或更高优先级的选择器影响弹层

## 开发

本项目使用 pnpm、React 19、Vite 7、TypeScript 5.9、Tailwind CSS v4、TipTap 3.x。

```bash
# 安装依赖
pnpm install

# 开发模式（启动示例应用）
pnpm dev

# 构建示例应用
pnpm build

# 构建库（用于发布到 npm）
pnpm build:lib

# 代码检查
pnpm lint

# 预览构建结果
pnpm preview
```

## License

MIT
