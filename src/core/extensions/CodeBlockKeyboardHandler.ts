import { Extension } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { GapCursor } from "@tiptap/pm/gapcursor";
import type { ResolvedPos } from "@tiptap/pm/model";

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
