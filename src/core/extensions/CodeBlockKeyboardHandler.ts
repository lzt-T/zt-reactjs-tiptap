import { Extension } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { GapCursor } from "@tiptap/pm/gapcursor";
import type { Node as ProseMirrorNode, ResolvedPos } from "@tiptap/pm/model";

interface CodeBlockRange {
  start: number;
  end: number;
  before: number;
  after: number;
  text: string;
  parentOffset: number;
}

function findCodeBlockRange(selection: TextSelection | NodeSelection): CodeBlockRange | null {
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== "codeBlock") continue;
    return {
      start: $from.start(depth),
      end: $from.end(depth),
      before: $from.before(depth),
      after: $from.after(depth),
      text: node.textContent ?? "",
      parentOffset: $from.parentOffset,
    };
  }
  if (selection instanceof NodeSelection && selection.node.type.name === "codeBlock") {
    return {
      start: selection.from + 1,
      end: selection.to - 1,
      before: selection.from,
      after: selection.to,
      text: selection.node.textContent ?? "",
      parentOffset: 0,
    };
  }
  return null;
}

function isBlockMathematicsNode(node: ProseMirrorNode): boolean {
  if (node.type.name !== "mathematics") return false;
  const attrs = node.attrs as Record<string, unknown> | null | undefined;
  if (!attrs) return false;
  if (attrs.block === true) return true;
  if (attrs.displayMode === true) return true;
  if (attrs.type === "block" || attrs.type === "block-math") return true;
  return false;
}

function isStructuredBlockNode(node: ProseMirrorNode | null | undefined): boolean {
  if (!node) return false;
  if (node.type.name === "table") return true;
  if (node.type.name === "fileAttachment") return true;
  if (node.type.name === "image") return true;
  if (isBlockMathematicsNode(node)) return true;
  return node.isAtom && node.isBlock;
}

/** 修复代码块内全选和方向键行为。 */
export const CodeBlockKeyboardHandler = Extension.create({
  name: "codeBlockKeyboardHandler",
  addKeyboardShortcuts() {
    const GapCursorImpl = GapCursor as unknown as {
      new ($pos: ResolvedPos): GapCursor;
      findGapCursorFrom?: (
        $pos: ResolvedPos,
        dir: number,
        mustMove?: boolean
      ) => ResolvedPos | null;
    };

    return {
      "Mod-a": ({ editor }) => {
        const { selection, doc } = editor.state;
        const range = findCodeBlockRange(
          selection as TextSelection | NodeSelection
        );
        if (!range) return false;
        const from = Math.max(0, range.start);
        const to = Math.min(doc.content.size, range.end);
        editor.commands.setTextSelection({ from, to });
        return true;
      },
      ArrowDown: ({ editor }) => {
        const { selection, doc, tr } = editor.state;
        if (!selection.empty) return false;
        const range = findCodeBlockRange(
          selection as TextSelection | NodeSelection
        );
        if (!range) return false;
        const isLastLine = !range.text.slice(range.parentOffset).includes("\n");
        if (!isLastLine) return false;
        if (range.after > doc.content.size) return false;
        const $from = doc.resolve(range.after);
        if (!isStructuredBlockNode($from.nodeAfter)) return false;
        const $target =
          GapCursorImpl.findGapCursorFrom?.($from, 1, false) ?? $from;
        try {
          editor.view.dispatch(
            tr.setSelection(new GapCursorImpl($target)).scrollIntoView()
          );
          return true;
        } catch {
          return false;
        }
      },
      ArrowUp: ({ editor }) => {
        const { selection, doc, tr } = editor.state;
        if (!selection.empty) return false;
        const range = findCodeBlockRange(
          selection as TextSelection | NodeSelection
        );
        if (!range) return false;
        const isFirstLine = !range.text.slice(0, range.parentOffset).includes("\n");
        if (!isFirstLine) return false;
        if (range.before < 0) return false;
        const $from = doc.resolve(range.before);
        if (!isStructuredBlockNode($from.nodeBefore)) return false;
        const $target =
          GapCursorImpl.findGapCursorFrom?.($from, -1, false) ?? $from;
        try {
          editor.view.dispatch(
            tr.setSelection(new GapCursorImpl($target)).scrollIntoView()
          );
          return true;
        } catch {
          return false;
        }
      },
    };
  },
});
