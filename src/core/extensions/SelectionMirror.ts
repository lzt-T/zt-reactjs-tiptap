import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Plugin } from "@tiptap/pm/state";

/** 选区镜像高亮样式类名。 */
const SELECTION_MIRROR_CLASS = "zt-selection-mirror";

/** 判断编辑器是否处于聚焦态（由容器 class 驱动）。 */
function isEditorFocused(editorDom: HTMLElement): boolean {
  const container = editorDom.closest(".editor-container");
  if (!(container instanceof HTMLElement)) return true;
  return !container.classList.contains("is-editor-blurred");
}

/** 在指定范围内按文本块切分并构建行内高亮装饰。 */
function createMirrorDecorations(
  doc: ProseMirrorNode,
  from: number,
  to: number,
): DecorationSet {
  const decorations: Decoration[] = [];
  const safeFrom = Math.max(0, Math.min(from, doc.content.size));
  const safeTo = Math.max(0, Math.min(to, doc.content.size));
  if (safeTo <= safeFrom) return DecorationSet.empty;

  doc.nodesBetween(safeFrom, safeTo, (node, pos) => {
    if (!node.isTextblock) return;
    const blockStart = pos + 1;
    const blockEnd = pos + node.nodeSize - 1;
    const markFrom = Math.max(safeFrom, blockStart);
    const markTo = Math.min(safeTo, blockEnd);
    if (markTo <= markFrom) return;
    decorations.push(
      Decoration.inline(markFrom, markTo, { class: SELECTION_MIRROR_CLASS }),
    );
  });

  return decorations.length > 0
    ? DecorationSet.create(doc, decorations)
    : DecorationSet.empty;
}

/** 仅基于当前文本选区，镜像显示编辑器高亮。 */
export const SelectionMirror = Extension.create({
  name: "selectionMirror",

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            if (!isEditorFocused(editor.view.dom)) return null;
            const { selection } = state;
            if (selection.empty) return null;
            return createMirrorDecorations(
              state.doc,
              selection.from,
              selection.to,
            );
          },
        },
      }),
    ];
  },
});
