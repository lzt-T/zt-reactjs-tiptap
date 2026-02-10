# md-tiptap

一个基于 TipTap 的强大 Markdown 编辑器组件，具有类似 Notion 的功能。

[![npm version](https://img.shields.io/npm/v/md-tiptap.svg)](https://www.npmjs.com/package/md-tiptap)
[![license](https://img.shields.io/npm/l/md-tiptap.svg)](https://github.com/yourusername/md-tiptap/blob/master/LICENSE)

📖 [快速开始](./QUICK_START.md) | 💡 [使用示例](./EXAMPLE.md) | 📦 [发布指南](./PUBLISH.md) | 🎨 [shadcn 依赖说明](./SHADCN_DEPENDENCIES_SUMMARY.md)

## 特性

- ✨ 丰富的文本格式化选项（粗体、斜体、下划线、删除线等）
- 📝 支持标题、列表、引用、代码块
- 🖼️ 图片插入和管理
- 📊 表格支持（插入/删除行列、表头切换）
- ✅ 任务列表（待办事项）
- 🎨 文本颜色和高亮
- 🔢 数学公式支持（行内和块级公式）
- ⚡ 斜杠命令（输入 `/` 快速插入内容）
- 🎯 气泡菜单（选中文本时显示）
- 🔄 撤销/重做

## 安装

```bash
npm install md-tiptap
# 或
pnpm add md-tiptap
# 或
yarn add md-tiptap
```

## 使用

### 基础使用（推荐）

```tsx
import { TiptapEditor } from 'md-tiptap'
import 'md-tiptap/style.css'  // 包含所有必需样式

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

### 如果你的项目已使用 Tailwind CSS

如果你的项目已经配置了 Tailwind CSS，可以使用最小样式版本避免冲突：

```tsx
import { TiptapEditor } from 'md-tiptap'
import 'md-tiptap/style-minimal.css'  // 仅组件样式，不包含 Tailwind 基础样式

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

> **注意**：使用 `style-minimal.css` 时，你的项目需要已配置 Tailwind CSS v4+。

### 带图片上传

```tsx
import { TiptapEditor } from 'md-tiptap'
import 'md-tiptap/style.css'

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

## Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `value` | `string` | 否 | 编辑器的 HTML 内容 |
| `onChange` | `(html: string) => void` | 否 | 内容变化时的回调函数 |
| `onImageUpload` | `(file: File) => Promise<string>` | 否 | 图片上传处理函数，需返回图片 URL |

## 功能说明

### 斜杠命令

在编辑器中输入 `/` 可以打开命令菜单，快速插入：
- 标题（H1、H2、H3）
- 列表（有序、无序）
- 任务列表
- 引用
- 代码块
- 表格
- 图片
- 数学公式
- 分割线

### 格式化工具栏

选中文本时会显示气泡菜单，包含：
- 文本样式：粗体、斜体、下划线、删除线、代码
- 颜色：文本颜色、背景高亮
- 对齐：左对齐、居中、右对齐、两端对齐
- 标题级别选择
- 清除格式

### 表格操作

插入表格后，点击表格可以：
- 添加/删除行
- 添加/删除列
- 切换表头
- 合并单元格
- 删除整个表格

### 数学公式

支持 LaTeX 格式的数学公式：
- 行内公式：使用斜杠命令选择"行内公式"
- 块级公式：使用斜杠命令选择"块级公式"

## 依赖要求

- React >= 18.0.0
- React DOM >= 18.0.0
- （可选）Tailwind CSS >= 4.0.0（如果使用 `style-minimal.css`）

## 样式选项

本包提供两种样式导入方式：

### 1. 完整样式（推荐用于新项目）

```tsx
import 'md-tiptap/style.css'
```

包含：
- ✅ Tailwind CSS 基础样式
- ✅ shadcn 主题变量
- ✅ 所有组件样式
- ✅ KaTeX 数学公式样式

**优点**：开箱即用，无需额外配置  
**缺点**：CSS 文件较大（~1.5MB，gzip 后 ~950KB）

### 2. 最小样式（计划中）

```tsx
import 'md-tiptap/style-minimal.css'
```

> **注意**：v0.1.0 版本中，`style-minimal.css` 与 `style.css` 相同。  
> 如果你的项目已有 Tailwind CSS 并遇到样式冲突，请参考 [SHADCN_GUIDE.md](./SHADCN_GUIDE.md) 中的解决方案。

未来版本将提供真正的最小样式版本。

📖 详细说明请查看 [SHADCN_GUIDE.md](./SHADCN_GUIDE.md)

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建库
pnpm build:lib

# 代码检查
pnpm lint
```

## 开发和发布

查看 [PUBLISH.md](./PUBLISH.md) 了解如何发布此包到 npm。

查看 [EXAMPLE.md](./EXAMPLE.md) 查看更多使用示例。

## License

MIT
