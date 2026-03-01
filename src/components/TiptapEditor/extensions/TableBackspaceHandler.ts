import { Extension } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'

/**
 * 当光标在表格后的段落开头按 Backspace 时，
 * 默认行为是进入表格最后一个单元格。
 * 此扩展将其修改为：选中整个表格节点。
 */
export const TableBackspaceHandler = Extension.create({
  name: 'tableBackspaceHandler',

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor
        const { selection, doc } = state
        const { $from, empty } = selection

        // 仅处理光标在块开头、且无选区的情况
        if (!empty || $from.parentOffset !== 0) return false

        // 获取当前块节点的起始位置，再往前一步找到前一个节点
        const blockDepth = $from.depth
        const blockStart = $from.start(blockDepth) - 1
        if (blockStart <= 0) return false

        const $blockStart = doc.resolve(blockStart)
        const nodeBefore = $blockStart.nodeBefore

        if (nodeBefore?.type.name === 'table') {
          // 选中整个表格，而非进入最后一个单元格
          const tablePos = blockStart - nodeBefore.nodeSize
          const tr = state.tr.setSelection(NodeSelection.create(doc, tablePos))
          editor.view.dispatch(tr)
          return true
        }

        return false
      },
    }
  },
})
