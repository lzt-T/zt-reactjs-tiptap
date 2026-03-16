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
  insertTable,
} from '@/lib/editorCommands'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Code,
  Table,
  Sigma,
  SquareFunction,
  Image,
  FileUp,
  type LucideIcon,
} from 'lucide-react'

export interface CommandItem {
  title: string
  description?: string
  icon?: LucideIcon
  command: ({ editor }: { editor: Editor }) => void
  mathType?: 'inline' | 'block'
  imageUpload?: boolean
  /** Upload attachment and insert file block link */
  fileAttachment?: boolean
  /** 为 true 时在斜杠菜单中灰显，且方向键会跳过该项 */
  disabled?: boolean
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
}

function findFirstEnabledIndex(items: CommandItem[]): number {
  const i = items.findIndex((item) => !item.disabled)
  return i >= 0 ? i : 0
}

export const defaultCommands: CommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large heading',
    icon: Heading1,
    command: ({ editor }) => setHeading(editor, 1),
  },
  {
    title: 'Heading 2',
    description: 'Medium heading',
    icon: Heading2,
    command: ({ editor }) => setHeading(editor, 2),
  },
  {
    title: 'Heading 3',
    description: 'Small heading',
    icon: Heading3,
    command: ({ editor }) => setHeading(editor, 3),
  },
  {
    title: 'Bullet List',
    description: 'Bullet list',
    icon: List,
    command: ({ editor }) => toggleBulletList(editor),
  },
  {
    title: 'Numbered List',
    description: 'Numbered list',
    icon: ListOrdered,
    command: ({ editor }) => toggleOrderedList(editor),
  },
  {
    title: 'Task List',
    description: 'Todo list with checkboxes',
    icon: ListTodo,
    command: ({ editor }) => toggleTaskList(editor),
  },
  {
    title: 'Inline Code',
    description: 'Code span',
    icon: Code,
    command: ({ editor }) => toggleCode(editor),
  },
  {
    title: 'Table',
    description: 'Add table',
    icon: Table,
    command: ({ editor }) => insertTable(editor),
  },
  {
    title: 'Inline Math',
    description: 'Insert inline math',
    icon: Sigma,
    mathType: 'inline',
    command: ({ editor }) => {
      // This will be handled by the custom dialog
      editor.chain().focus().run()
    },
  },
  {
    title: 'Block Math',
    description: 'Insert math block',
    icon: SquareFunction,
    mathType: 'block',
    command: ({ editor }) => {
      // This will be handled by the custom dialog
      editor.chain().focus().run()
    },
  },
  {
    title: 'Image',
    description: 'Upload or insert image',
    icon: Image,
    imageUpload: true,
    command: ({ editor }) => {
      // This will be handled by the image upload dialog
      editor.chain().focus().run()
    },
  },
  {
    title: 'Upload attachment',
    description: 'Upload attachment as file link',
    icon: FileUp,
    fileAttachment: true,
    command: ({ editor }) => {
      // This will be handled by the file upload dialog
      editor.chain().focus().run()
    },
  },
]

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
    }
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        items: ({ query }: { query: string }) => {
          const insideTable = this.editor.isActive('table')
          return defaultCommands
            .filter((item) => {
              if (!item.title.toLowerCase().includes(query.toLowerCase())) return false
              if (item.fileAttachment && !this.options.onFileUpload) return false
              return true
            })
            .map((item) => ({
              ...item,
              disabled:
                item.title === 'Table' && insideTable,
            }))
        },
        command: ({ editor, range, props }: { editor: Editor; range: { from: number; to: number }; props: CommandItem }) => {
          editor.chain().focus().deleteRange(range).run()
          props.command({ editor })
        },
        render: () => {
          let currentIndex = 0
          let items: CommandItem[] = defaultCommands
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
                    const isTableDisabled = item.title === 'Table' && currentEditor.isActive('table')
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
