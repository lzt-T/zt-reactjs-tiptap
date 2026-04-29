import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionProps } from '@tiptap/suggestion'
import type { Editor } from '@tiptap/react'
import {
  setHeading,
  toggleBulletList,
  toggleOrderedList,
  toggleTaskList,
  toggleCode,
  toggleBlockquote,
  setCodeBlockLanguage,
  insertTable,
} from '@/core/commands/editorCommands'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Code,
  MessageSquareQuote,
  SquareCode,
  Table,
  Sigma,
  SquareFunction,
  Image,
  FileUp,
  type LucideIcon,
} from 'lucide-react'
import type { EditorLocale } from '@/shared/locales'
import { DEFAULT_CODE_BLOCK_LANGUAGE } from "@/shared/config";
import { resolveCodeBlockLanguage } from "./codeBlockLowlight";

// 斜杠命令内置项 Key。
export const BuiltinSlashCommandKey = {
  // 一级标题。
  Heading1: "heading1",
  // 二级标题。
  Heading2: "heading2",
  // 三级标题。
  Heading3: "heading3",
  // 无序列表。
  BulletList: "bulletList",
  // 有序列表。
  NumberedList: "numberedList",
  // 任务列表。
  TaskList: "taskList",
  // 引用块。
  Blockquote: "blockquote",
  // 行内代码。
  InlineCode: "inlineCode",
  // 代码块。
  CodeBlock: "codeBlock",
  // 表格。
  Table: "table",
  // 行内数学公式。
  InlineMath: "inlineMath",
  // 块级数学公式。
  BlockMath: "blockMath",
  // 图片。
  Image: "image",
  // 附件上传。
  UploadAttachment: "uploadAttachment",
} as const

export type BuiltinSlashCommandKey =
  (typeof BuiltinSlashCommandKey)[keyof typeof BuiltinSlashCommandKey]

// 兼容旧的斜杠命令 Key 导出。
export const SlashCommandKey = BuiltinSlashCommandKey
export type SlashCommandKey = (typeof SlashCommandKey)[keyof typeof SlashCommandKey]

export interface CommandItem {
  key: string
  title: string
  description?: string
  icon?: LucideIcon
  command: ({ editor }: { editor: Editor }) => void
  mathType?: 'inline' | 'block'
  imageUpload?: boolean
  /** Upload attachment and insert file block link */
  fileAttachment?: boolean
  /** 为 true 时在斜杠菜单中灰显，且方向键会跳过该项 */
  disabled?: boolean | ((ctx: { editor: Editor }) => boolean)
}

export interface SlashCommandsOptions {
  onStart: () => void
  onUpdate: (query: string) => void
  onIndexChange: (index: number) => void
  onExit: () => void
  onClientRect: (rect: DOMRect | null) => void
  onMathDialog?: (type: 'inline' | 'block', initialValue: string, callback: (latex: string) => void) => void
  onImageUpload?: (callback: (src: string, alt?: string) => void) => void
  onFileUpload?: (callback: (url: string, name: string) => void) => void
  locale: EditorLocale
  getCommands?: () => CommandItem[]
  commands: CommandItem[]
}

function findFirstEnabledIndex(items: CommandItem[]): number {
  const i = items.findIndex((item) => !item.disabled)
  return i >= 0 ? i : 0
}

/** 根据当前语言文案创建默认斜杠菜单项。 */
export function createDefaultCommands(
  locale: EditorLocale,
  defaultCodeBlockLanguage: string = DEFAULT_CODE_BLOCK_LANGUAGE
): CommandItem[] {
  return [
    {
      key: SlashCommandKey.Heading1,
      title: locale.slashCommands.heading1.title,
      description: locale.slashCommands.heading1.description,
      icon: Heading1,
      command: ({ editor }) => setHeading(editor, 1),
    },
    {
      key: SlashCommandKey.Heading2,
      title: locale.slashCommands.heading2.title,
      description: locale.slashCommands.heading2.description,
      icon: Heading2,
      command: ({ editor }) => setHeading(editor, 2),
    },
    {
      key: SlashCommandKey.Heading3,
      title: locale.slashCommands.heading3.title,
      description: locale.slashCommands.heading3.description,
      icon: Heading3,
      command: ({ editor }) => setHeading(editor, 3),
    },
    {
      key: SlashCommandKey.BulletList,
      title: locale.slashCommands.bulletList.title,
      description: locale.slashCommands.bulletList.description,
      icon: List,
      command: ({ editor }) => toggleBulletList(editor),
    },
    {
      key: SlashCommandKey.NumberedList,
      title: locale.slashCommands.numberedList.title,
      description: locale.slashCommands.numberedList.description,
      icon: ListOrdered,
      command: ({ editor }) => toggleOrderedList(editor),
    },
    {
      key: SlashCommandKey.TaskList,
      title: locale.slashCommands.taskList.title,
      description: locale.slashCommands.taskList.description,
      icon: ListTodo,
      command: ({ editor }) => toggleTaskList(editor),
    },
    {
      key: SlashCommandKey.Blockquote,
      title: locale.slashCommands.blockquote.title,
      description: locale.slashCommands.blockquote.description,
      icon: MessageSquareQuote,
      command: ({ editor }) => toggleBlockquote(editor),
    },
    {
      key: SlashCommandKey.InlineCode,
      title: locale.slashCommands.inlineCode.title,
      description: locale.slashCommands.inlineCode.description,
      icon: Code,
      command: ({ editor }) => toggleCode(editor),
    },
    {
      key: SlashCommandKey.CodeBlock,
      title: locale.slashCommands.codeBlock.title,
      description: locale.slashCommands.codeBlock.description,
      icon: SquareCode,
      command: ({ editor }) => {
        const current = editor.getAttributes("codeBlock")
          .language as string | undefined;
        const language = resolveCodeBlockLanguage(
          current,
          defaultCodeBlockLanguage
        );
        setCodeBlockLanguage(editor, language);
      },
    },
    {
      key: SlashCommandKey.Table,
      title: locale.slashCommands.table.title,
      description: locale.slashCommands.table.description,
      icon: Table,
      command: ({ editor }) => insertTable(editor),
    },
    {
      key: SlashCommandKey.InlineMath,
      title: locale.slashCommands.inlineMath.title,
      description: locale.slashCommands.inlineMath.description,
      icon: Sigma,
      mathType: 'inline',
      command: ({ editor }) => {
        // This will be handled by the custom dialog
        editor.chain().focus().run()
      },
    },
    {
      key: SlashCommandKey.BlockMath,
      title: locale.slashCommands.blockMath.title,
      description: locale.slashCommands.blockMath.description,
      icon: SquareFunction,
      mathType: 'block',
      command: ({ editor }) => {
        // This will be handled by the custom dialog
        editor.chain().focus().run()
      },
    },
    {
      key: SlashCommandKey.Image,
      title: locale.slashCommands.image.title,
      description: locale.slashCommands.image.description,
      icon: Image,
      imageUpload: true,
      command: ({ editor }) => {
        // This will be handled by the image upload dialog
        editor.chain().focus().run()
      },
    },
    {
      key: SlashCommandKey.UploadAttachment,
      title: locale.slashCommands.uploadAttachment.title,
      description: locale.slashCommands.uploadAttachment.description,
      icon: FileUp,
      fileAttachment: true,
      command: ({ editor }) => {
        // This will be handled by the file upload dialog
        editor.chain().focus().run()
      },
    },
  ]
}

export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: 'slashCommands',
  addOptions() {
    return {
      onStart: () => {},
      onUpdate: () => {},
      onIndexChange: () => {},
      onExit: () => {},
      onClientRect: () => {},
      onMathDialog: undefined,
      onImageUpload: undefined,
      onFileUpload: undefined,
      locale: {} as EditorLocale,
      getCommands: undefined,
      // 占位空数组：真正的命令列表必须由调用方显式传入
      commands: [],
    }
  },
  addProseMirrorPlugins() {
    const resolveCommands = () => this.options.getCommands?.() ?? this.options.commands
    const initialCommands = resolveCommands()
    if (!initialCommands || initialCommands.length === 0) {
      throw new Error('[SlashCommands] commands is required and cannot be empty')
    }

    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        items: ({ query }: { query: string }) => {
          const insideTable = this.editor.isActive('table')
          const commands = resolveCommands()
          return commands
            .filter((item) => {
              if (!item.title.toLowerCase().includes(query.toLowerCase())) return false
              if (item.fileAttachment && !this.options.onFileUpload) return false
              return true
            })
            .map((item) => ({
              ...item,
              // 先应用业务自定义禁用，再叠加内置上下文禁用。
              disabled:
                (typeof item.disabled === "function"
                  ? item.disabled({ editor: this.editor })
                  : item.disabled ?? false) ||
                (item.key === SlashCommandKey.Table && insideTable),
            }))
        },
        command: ({ editor, range, props }: { editor: Editor; range: { from: number; to: number }; props: CommandItem }) => {
          editor.chain().focus().deleteRange(range).run()
          props.command({ editor })
        },
        render: () => {
          let currentIndex = 0
          let items: CommandItem[] = initialCommands
          let currentEditor: Editor = this.editor
          let currentRange: { from: number; to: number } = { from: 0, to: 0 }

          return {
            onStart: (props: SuggestionProps<CommandItem>) => {
              items = props.items
              currentEditor = props.editor
              currentRange = props.range
              currentIndex = findFirstEnabledIndex(items)
              this.options.onStart()
              this.options.onUpdate(props.query)
              this.options.onIndexChange(currentIndex)
              if (props.clientRect) {
                const rect = props.clientRect()
                this.options.onClientRect(rect)
              }
            },
            onUpdate: (props: SuggestionProps<CommandItem>) => {
              items = props.items
              currentEditor = props.editor
              currentRange = props.range
              currentIndex = findFirstEnabledIndex(items)
              this.options.onUpdate(props.query)
              this.options.onIndexChange(currentIndex)
              if (props.clientRect) {
                const rect = props.clientRect()
                this.options.onClientRect(rect)
              }
            },
            onKeyDown: (props: { event: KeyboardEvent }) => {
              const navigationKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape']
              if (!navigationKeys.includes(props.event.key)) {
                return false
              }

              props.event.preventDefault()
              props.event.stopPropagation()

              switch (props.event.key) {
                case 'ArrowUp': {
                  let next = (currentIndex + items.length - 1) % items.length
                  let steps = 0
                  while (items[next].disabled && steps < items.length) {
                    next = (next + items.length - 1) % items.length
                    steps += 1
                  }
                  currentIndex = items[next].disabled ? currentIndex : next
                  this.options.onIndexChange(currentIndex)
                  return true
                }
                case 'ArrowDown': {
                  let next = (currentIndex + 1) % items.length
                  let steps = 0
                  while (items[next].disabled && steps < items.length) {
                    next = (next + 1) % items.length
                    steps += 1
                  }
                  currentIndex = items[next].disabled ? currentIndex : next
                  this.options.onIndexChange(currentIndex)
                  return true
                }
                case 'Enter':
                  if (items[currentIndex]) {
                    const item = items[currentIndex]
                    const isTableDisabled = item.key === SlashCommandKey.Table && currentEditor.isActive('table')
                    if (isTableDisabled) {
                      this.options.onExit()
                      return true
                    }
                    currentEditor.chain().focus().deleteRange(currentRange).run()
                    
                    // Check if it's a math command
                    if (item.mathType && this.options.onMathDialog) {
                      this.options.onMathDialog(item.mathType, '', (latex) => {
                        if (item.mathType === 'inline') {
                          currentEditor.chain().focus().insertInlineMath({ latex }).run()
                        } else {
                          currentEditor.chain().focus().insertBlockMath({ latex }).run()
                        }
                      })
                    } else if (item.imageUpload && this.options.onImageUpload) {
                      // Handle image upload
                      this.options.onImageUpload((src, alt) => {
                        currentEditor.chain().focus().setImage({ src, alt }).run()
                      })
                    } else if (item.fileAttachment && this.options.onFileUpload) {
                      // Handle file attachment upload
                      this.options.onFileUpload((url, name) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom command insertFileAttachment
                        (currentEditor as any).chain().focus().insertFileAttachment({ url, name }).run()
                      })
                    } else {
                      item.command({ editor: currentEditor })
                    }
                    // Close the command menu after executing command
                    this.options.onExit()
                  }
                  return true
                case 'Escape':
                  this.options.onExit()
                  return true
              }

              return false
            },
            onExit: () => {
              this.options.onExit()
            },
          }
        },
      }),
    ]
  },
})

export default SlashCommands
