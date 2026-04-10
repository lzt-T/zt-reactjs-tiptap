import { Extension } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { getEditorCallbacks } from './editorCallbackRegistry'

type ImageDeleteParams = { src: string; alt?: string; title?: string }
type FileDeleteParams = { url: string; name: string }

export interface DeletionCallbacksOptions {
  onImageDelete?: (params: ImageDeleteParams) => void
  onFileDelete?: (params: FileDeleteParams) => void
}

function collectMatchingNodes(
  doc: PMNode,
  from: number,
  to: number,
  predicate: (node: PMNode) => boolean
): PMNode[] {
  const nodes: PMNode[] = []
  const safeFrom = Math.max(0, Math.min(from, doc.content.size))
  const safeTo = Math.max(0, Math.min(to, doc.content.size))
  if (safeTo <= safeFrom) return nodes

  doc.nodesBetween(safeFrom, safeTo, (node) => {
    if (predicate(node)) nodes.push(node)
  })
  return nodes
}

function hasSameNodeInRange(
  doc: PMNode,
  from: number,
  to: number,
  typeName: string,
  attrs: Record<string, unknown>
): boolean {
  let found = false
  const safeFrom = Math.max(0, Math.min(from, doc.content.size))
  const safeTo = Math.max(0, Math.min(to, doc.content.size))
  if (safeTo <= safeFrom) return false

  doc.nodesBetween(safeFrom, safeTo, (node) => {
    if (found) return false
    if (node.type.name !== typeName) return
    // Atom nodes: attrs equality is a good-enough identity
    const keys = Object.keys(attrs)
    const same =
      keys.length === Object.keys(node.attrs ?? {}).length &&
      keys.every((k) => (node.attrs as Record<string, unknown>)[k] === attrs[k])
    if (same) found = true
  })
  return found
}

export const DeletionCallbacks = Extension.create({
  name: 'deletionCallbacks',

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          const { onImageDelete, onFileDelete } = getEditorCallbacks(editor)
          if (!onImageDelete && !onFileDelete) return null
          if (!transactions.some((tr) => tr.docChanged)) return null

          for (const tr of transactions) {
            if (!tr.docChanged) continue

            for (const step of tr.steps) {
              const map = step.getMap()
              map.forEach((oldFrom, oldTo, newFrom, newTo) => {
                const removed = oldTo > oldFrom
                if (!removed) return

                // 1) Find candidates removed from old doc in replaced range
                const oldCandidates = collectMatchingNodes(
                  oldState.doc,
                  oldFrom,
                  oldTo,
                  (node) =>
                    (Boolean(onImageDelete) && node.type.name === 'image') ||
                    (Boolean(onFileDelete) && node.type.name === 'fileAttachment')
                )

                if (oldCandidates.length === 0) return

                // 2) If new range still contains the same atom node, skip (e.g. attrs update)
                for (const node of oldCandidates) {
                  const typeName = node.type.name
                  const attrs = (node.attrs ?? {}) as Record<string, unknown>
                  const stillExists =
                    newTo > newFrom &&
                    hasSameNodeInRange(newState.doc, newFrom, newTo, typeName, attrs)

                  if (stillExists) continue

                  if (typeName === 'image' && onImageDelete) {
                    const src = typeof attrs.src === 'string' ? attrs.src : ''
                    if (!src) continue
                    onImageDelete({
                      src,
                      alt: typeof attrs.alt === 'string' ? attrs.alt : undefined,
                      title: typeof attrs.title === 'string' ? attrs.title : undefined,
                    })
                  }

                  if (typeName === 'fileAttachment' && onFileDelete) {
                    const url = typeof attrs.url === 'string' ? attrs.url : ''
                    const name = typeof attrs.name === 'string' ? attrs.name : ''
                    if (!url && !name) continue
                    onFileDelete({ url, name })
                  }
                }
              })
            }
          }

          return null
        },
      }),
    ]
  },
})

