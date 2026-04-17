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
- 🌐 国际化（i18n）：支持 `zh-CN` / `en-US`，工具栏、斜杠命令、弹窗与默认占位文案可本地化
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
import { ReactTiptapEditor } from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'  // 必须导入样式

function App() {
  const [content, setContent] = useState('<p>Hello World!</p>')

  return (
    <ReactTiptapEditor
      value={content}
      onChange={setContent}
    />
  )
}
```

### 带图片与附件预上传（Confirm 后回调）

```tsx
import { ReactTiptapEditor } from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'

function App() {
  const [content, setContent] = useState('<p>Hello World!</p>')

  // 选择/拖拽图片时触发（预上传）
  const handleImagePreUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()
    return data.url
  }

  // 仅在点击 Confirm 时触发
  const handleImageUpload = async (payload: { file: File; url: string; alt?: string }) => {
    console.log('Image confirmed:', payload)
  }

  // 选择/拖拽附件时触发（预上传）
  const handleFilePreUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/file-upload', {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()
    return { url: data.url, name: data.name ?? file.name }
  }

  // 仅在点击 Confirm/Insert Link 时触发
  const handleFileUpload = async (payload: { file: File; url: string; name: string }) => {
    console.log('File confirmed:', payload)
  }

  return (
    <ReactTiptapEditor
      value={content}
      onChange={setContent}
      onImagePreUpload={handleImagePreUpload}
      onImageUpload={handleImageUpload}
      onFilePreUpload={handleFilePreUpload}
      onFileUpload={handleFileUpload}
      fileUploadTypes={['pdf', 'docx']}
    />
  )
}
```

### 国际化使用示例

```tsx
import { ReactTiptapEditor } from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'

function App() {
  return (
    <>
      {/* 强制中文 */}
      <ReactTiptapEditor language="zh-CN" />

      {/* 强制英文 */}
      <ReactTiptapEditor language="en-US" />

      {/* 不传 language：自动跟随浏览器语言（zh* -> zh-CN，其余 -> en-US） */}
      <ReactTiptapEditor />
    </>
  )
}
```

### 受控组件完整示例

```tsx
import { useState } from 'react'
import { ReactTiptapEditor } from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'

function EditorExample() {
  const [content, setContent] = useState('<p>开始编辑...</p>')

  const handleImagePreUpload = async (file: File): Promise<string> => {
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

  const handleImageUpload = (payload: { file: File; url: string; alt?: string }) => {
    // 仅在点击 Confirm 后触发
    console.log('图片确认插入:', payload)
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>我的编辑器</h1>
      <ReactTiptapEditor
        value={content}
        onChange={(html) => {
          setContent(html)
          console.log('内容已更新:', html)
        }}
        onImagePreUpload={handleImagePreUpload}
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

### 主题切换（light / dark）

```tsx
import { useState } from 'react'
import { ReactTiptapEditor, EditorTheme } from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'

function App() {
  const [theme, setTheme] = useState(EditorTheme.Light)

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setTheme((prev) =>
            prev === EditorTheme.Dark ? EditorTheme.Light : EditorTheme.Dark
          )
        }
      >
        切换主题（{theme}）
      </button>

      <ReactTiptapEditor theme={theme} />
    </>
  )
}
```

未传 `theme` 时，编辑器会自动读取宿主 `html.dark`：存在 `dark` 则为暗色，不存在则固定为 `light`。

## Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `value` | `string` | 否 | - | 编辑器的 HTML 内容 |
| `onChange` | `(html: string) => void` | 否 | - | 内容变化时的回调函数，参数为 HTML 字符串 |
| `onImagePreUpload` | `(file: File) => Promise<string>` | 否 | - | 图片预上传函数（选择/拖拽文件时触发），返回图片 URL。不提供时图片将以 Base64 插入 |
| `onImageUpload` | `(payload: { file: File; url: string; alt?: string }) => void \| Promise<void>` | 否 | - | 图片 Confirm 回调（仅在点击 Confirm 后触发） |
| `onFilePreUpload` | `(file: File) => Promise<{ url: string; name: string }>` | 否 | - | 附件预上传函数（选择/拖拽文件时触发），返回文件 URL 与展示名 |
| `onFileUpload` | `(payload: { file: File; url: string; name: string }) => void \| Promise<void>` | 否 | - | 附件 Confirm 回调（仅在点击 Confirm/Insert Link 后触发） |
| `editorMode` | `'notion-like' \| 'headless'` | 否 | `'notion-like'` | 编辑器模式：Notion 风格（斜杠命令、块状编辑等）或无头模式 |
| `theme` | `'light' \| 'dark'` | 否 | 自动跟随 `html.dark`（无 `dark` 时为 `light`） | 编辑器主题。传入时强制使用传入值；不传时仅根据 `html.dark` 自动解析 |
| `headlessToolbarMode` | `'always' \| 'on-focus'` | 否 | `'always'` | **仅在 `editorMode='headless'` 时生效**。`always`：工具栏始终显示；`on-focus`：编辑器聚焦或点击工具栏时显示，失焦到编辑器区域外时隐藏 |
| `commandMenuMaxHeight` | `number` | 否 | `240` | 斜杠命令菜单最大高度（px） |
| `commandMenuMinHeight` | `number` | 否 | `160` | 斜杠命令菜单最小高度（px） |
| `language` | `'zh-CN' \| 'en-US'` | 否 | 自动解析浏览器语言（`zh* -> zh-CN`，其余 `-> en-US`） | 控制工具栏、斜杠命令、弹窗与默认 placeholder 文案 |
| `placeholder` | `string` | 否 | NotionLike: "Type '/' for commands..."；Headless: "Start typing..." | 编辑器为空时的占位文本。不传时按模式使用上述默认值；传入后两种模式均使用该值 |
| `disabled` | `boolean` | 否 | `false` | 是否禁用编辑器（只读） |
| `onChangeDebounceMs` | `number` | 否 | `300` | `onChange` 防抖延迟（毫秒） |
| `border` | `boolean` | 否 | `true` | 是否显示编辑器容器边框 |
| `imageMaxSizeBytes` | `number` | 否 | `5242880`（5MB） | 图片上传最大体积（字节），超过则拒绝并提示 |
| `fileMaxSizeBytes` | `number` | 否 | `10485760`（10MB） | 附件上传最大体积（字节），超过则拒绝并提示 |
| `fileUploadTypes` | `string[]` | 否 | `['pdf']` | 附件可上传扩展名列表（不区分大小写），如 `['pdf', 'docx']`。会自动去空格、去重、去掉前导 `.`；为空时回落到默认 `['pdf']` |
| `codeBlockLanguages` | `Array<{ value: string; label: string }>` | 否 | 内置 20 种常用语言 | 代码块语言列表。传入后覆盖内置列表（会自动去重并回落无效语言） |
| `textColorOptions` | `Array<{ name: string; value: string }>` | 否 | 内置默认文字颜色列表 | 顶部工具栏与气泡菜单共用的文字颜色预设列表。传入后覆盖默认文字颜色面板选项 |
| `highlightColorOptions` | `Array<{ name: string; value: string }>` | 否 | 内置默认高亮颜色列表 | 顶部工具栏与气泡菜单共用的高亮颜色预设列表。传入后覆盖默认高亮颜色面板选项 |
| `defaultCodeBlockLanguage` | `string` | 否 | `'plaintext'` | 新增代码块默认语言。传入无效值时自动回落 `plaintext` |
| `onCodeBlockFormat` | `(payload: { code: string; language: string }) => string \| Promise<string>` | 否 | - | 代码块格式化回调。点击代码块右上角“格式化代码”按钮时触发；返回值会覆盖当前代码块文本内容（保留语言） |
| `formulaCategories` | `FormulaPickerCategory[]` | 否 | 内置默认分类 | 公式选择器的分类列表。不传则使用内置分类；传入时可完全自定义或在默认基础上扩展（见下方「扩展公式分类」） |
| `maxHeight` | `number \| string` | 否 | - | 编辑器容器的最大高度。不配置时容器为 `height: 100%`；配置后高度限制为该值，内容超出时在编辑区内滚动。数字为像素（如 `400`），字符串为任意合法 CSS 长度（如 `"50vh"`、`"20rem"`） |
| `toolbarItems` | `ToolbarItemConfig[]` | 否 | 内置默认工具栏 | 工具栏配置：支持重排/裁剪内置按钮与追加自定义按钮 |
| `slashCommands` | `SlashCommandConfig[]` | 否 | 内置默认斜杠命令 | 斜杠配置：支持重排/裁剪内置命令与追加自定义命令 |
| `hideDefaultToolbarItems` | `boolean` | 否 | `false` | 为 `true` 时不注入默认工具栏项，仅渲染 `toolbarItems` |
| `hideDefaultSlashCommands` | `boolean` | 否 | `false` | 为 `true` 时不注入默认斜杠命令，仅使用 `slashCommands` |
| `extensions` | `AnyExtension[]` | 否 | `[]` | 外部 TipTap 扩展，按顺序追加在内置扩展后 |
| `editorConfigVersion` | `string \| number` | 否 | - | 高级开关：值变化时强制重建 editor（用于创建期配置刷新） |

### Headless 模式下的工具栏显示

在 `editorMode="headless"` 时，可以通过 `headlessToolbarMode` 控制顶部工具栏的显示策略：

- `headlessToolbarMode="always"`：工具栏始终显示。
- `headlessToolbarMode="on-focus"`：当编辑器获得焦点或用户点击工具栏区域时显示；当焦点离开整个编辑器容器（包括工具栏）后隐藏。点击工具栏按钮本身不会导致工具栏立即消失。

示例：

```tsx
<ReactTiptapEditor editorMode="headless" headlessToolbarMode="on-focus" />
```

## 功能说明

### 国际化（i18n）

- 当前支持语言：`zh-CN`、`en-US`
- 可通过 `language` 属性显式指定语言，例如：`language="zh-CN"` 或 `language="en-US"`
- 不传 `language` 时，默认跟随浏览器语言：`zh* -> zh-CN`，其余 `-> en-US`
- `placeholder` 优先级高于语言默认文案：传入 `placeholder` 后，会覆盖不同语言下的默认占位文本
- 如需新增语言，可扩展 `src/locales` 下的语言文件，并在 `src/locales/index.ts` 的 `localeMap` 中注册映射

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

### 代码块语言选择

- 光标位于代码块中时，右上角会显示“代码语言（Code language）”按钮。
- 点击后可选择语言，选中项会高亮，代码块会即时按语言高亮渲染。
- 默认内置常用 20 种语言（含 `plaintext` 兜底）。
- 光标位于代码块中时，会显示一体化的代码块控件（语言选择 + 格式化 + 删除）。
- 未传入 `onCodeBlockFormat` 时，“格式化代码”按钮为禁用态。

```tsx
import {
  ReactTiptapEditor,
  DEFAULT_CODE_BLOCK_LANGUAGES,
  DEFAULT_CODE_BLOCK_LANGUAGE,
  type CodeBlockLanguageOption,
} from 'zt-reactjs-tiptap'

const customLanguages: CodeBlockLanguageOption[] = [
  { value: 'plaintext', label: '纯文本' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
]

<ReactTiptapEditor
  defaultCodeBlockLanguage={DEFAULT_CODE_BLOCK_LANGUAGE}
  codeBlockLanguages={customLanguages}
/>
```

如果你希望接入业务侧格式化（例如调用后端、Monaco、Prettier Worker 等），可传入 `onCodeBlockFormat`：

```tsx
<ReactTiptapEditor
  onCodeBlockFormat={async ({ code, language }) => {
    const response = await fetch('/api/format-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    })
    const data = await response.json()
    return data.formattedCode ?? code
  }}
/>
```

**操作方式**：
- 输入 `/` 打开命令菜单
- 使用 ↑ ↓ 方向键选择
- 按 Enter 确认插入
- 按 Escape 关闭菜单

### 工具栏自定义（重排内置项 + 新增自定义按钮）

```tsx
import { Clock3 } from 'lucide-react'
import {
  ReactTiptapEditor,
  BuiltinToolbarItemKey,
  type ToolbarItemConfig,
} from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'

const toolbarItems: ToolbarItemConfig[] = [
  { type: 'builtin', key: BuiltinToolbarItemKey.Heading, group: 'block' },
  { type: 'builtin', key: BuiltinToolbarItemKey.Bold, group: 'format' },
  { type: 'builtin', key: BuiltinToolbarItemKey.Italic, group: 'format' },
  {
    type: 'custom',
    key: 'insert-timestamp',
    title: '插入时间',
    group: 'custom',
    icon: <Clock3 size={16} />,
    onClick: ({ editor }) => {
      editor.chain().focus().insertContent(`[${new Date().toLocaleString()}]`).run()
    },
  },
]

<ReactTiptapEditor toolbarItems={toolbarItems} hideDefaultToolbarItems />
```

### Slash 命令自定义（保留默认 + 追加自定义命令）

```tsx
import { MessageSquareQuote } from 'lucide-react'
import {
  ReactTiptapEditor,
  type SlashCommandConfig,
} from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'

const slashCommands: SlashCommandConfig[] = [
  {
    type: 'custom',
    key: 'callout',
    title: 'Callout',
    description: '插入提示块',
    icon: MessageSquareQuote,
    command: ({ editor }) => {
      editor
        .chain()
        .focus()
        .insertContent('<blockquote><p>💡 提示内容</p></blockquote>')
        .run()
    },
    disabled: ({ editor }) => editor.isActive('table'),
  },
]

<ReactTiptapEditor slashCommands={slashCommands} />
```

### 注入外部扩展（追加到内置扩展后）

```tsx
import Typography from '@tiptap/extension-typography'
import { ReactTiptapEditor } from 'zt-reactjs-tiptap'
import 'zt-reactjs-tiptap/style.css'

<ReactTiptapEditor extensions={[Typography]} />
```

> 扩展顺序为：`内置扩展 -> 你传入的 extensions`。若存在同名行为冲突，请在业务侧自行确认兼容性。
> 库内部已做浅稳定处理，`toolbarItems` / `slashCommands` / `extensions` 即使每次传新数组引用，也不会因此无意义重建 editor。

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
  ReactTiptapEditor,
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

<ReactTiptapEditor
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
- 如果提供 `onImagePreUpload` 函数，将执行预上传并使用返回 URL 预览/插入
- 如果没有提供 `onImagePreUpload`，图片将以 Base64 格式直接嵌入（适合小图片）
- `onImageUpload` 仅在点击 Confirm 后触发，不负责执行上传
- 支持 JPG、PNG、GIF 等常见格式
- 建议图片大小不超过 5MB

### 附件上传

- 附件上传通过 `onFilePreUpload` + `onFileUpload` 配置
- 默认仅允许 `pdf`
- 可通过 `fileUploadTypes` 自定义可上传扩展名（如 `['pdf', 'docx']`）
- 拖拽上传与文件选择共用同一套类型校验和大小校验

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
- ✅ 作用域化的 shadcn/ui 主题变量（仅作用于编辑器容器）
- ✅ 编辑器组件样式
- ✅ KaTeX 数学公式样式

**文件大小**：CSS 约 1.5MB（gzip 后约 950KB）

### 在其它项目中使用时样式不对？

1. **务必导入样式**：在使用编辑器的组件或入口文件顶部导入 `import 'zt-reactjs-tiptap/style.css'`

2. **导入顺序**：若希望用你项目的样式覆盖编辑器默认样式，建议先导入 `zt-reactjs-tiptap/style.css`，再导入你的全局样式

3. **作用域主题变量**：本库的 shadcn 变量只在 `.zt-tiptap-theme` 作用域内生效，不会覆盖宿主项目的全局 `:root` 变量

4. **局部主题定制**：可在宿主项目中按编辑器容器局部覆盖变量，例如：

```css
.zt-tiptap-theme {
  --primary: oklch(0.58 0.19 260);
  --background: oklch(0.99 0 0);
}
```

5. **UI 主题 Token 化**：编辑器 UI（工具栏、菜单、表格操作、弹窗、输入框、滚动条等）已统一使用主题 token。默认 `light` 视觉与旧版保持一致，切换 `theme="dark"` 时同一套 token 会自动映射为暗色值。

6. **弹层/对话框**：图片、公式、附件弹层通过 Portal 挂载到编辑器容器内，继承同一套作用域变量；若样式仍异常，优先检查宿主全局 reset 或高优先级选择器

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
