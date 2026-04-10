import type { Editor } from "@tiptap/react";

export type TextAlignValue = "left" | "center" | "right" | "justify";

export function toggleBold(editor: Editor): void {
  editor.chain().focus().toggleBold().run();
}

export function toggleItalic(editor: Editor): void {
  editor.chain().focus().toggleItalic().run();
}

export function toggleUnderline(editor: Editor): void {
  editor.chain().focus().toggleUnderline().run();
}

export function toggleStrike(editor: Editor): void {
  editor.chain().focus().toggleStrike().run();
}

export function toggleCode(editor: Editor): void {
  editor.chain().focus().toggleCode().run();
}

export function toggleSuperscript(editor: Editor): void {
  editor.chain().focus().toggleSuperscript().run();
}

export function toggleSubscript(editor: Editor): void {
  editor.chain().focus().toggleSubscript().run();
}

export function setTextAlign(
  editor: Editor,
  align: TextAlignValue
): void {
  editor.chain().focus().setTextAlign(align).run();
}

export function setColor(editor: Editor, color: string): void {
  editor.chain().focus().setColor(color).run();
}

export function unsetColor(editor: Editor): void {
  editor.chain().focus().unsetColor().run();
}

export function setHighlight(editor: Editor, color: string): void {
  editor.chain().focus().setHighlight({ color }).run();
}

export function unsetHighlight(editor: Editor): void {
  editor.chain().focus().unsetHighlight().run();
}

export function setHeading(
  editor: Editor,
  level: 1 | 2 | 3
): void {
  editor.chain().focus().setNode("heading", { level }).run();
}

/**
 * 切换标题：若当前已是该级别标题则改为段落，否则设为该级别标题。
 * 用于工具栏「再次点击同一项可取消」的交互。
 */
export function toggleHeading(
  editor: Editor,
  level: 1 | 2 | 3
): void {
  if (editor.isActive("heading", { level })) {
    editor.chain().focus().setNode("paragraph").run();
  } else {
    editor.chain().focus().setNode("heading", { level }).run();
  }
}

export function toggleBulletList(editor: Editor): void {
  editor.chain().focus().toggleBulletList().run();
}

export function toggleOrderedList(editor: Editor): void {
  editor.chain().focus().toggleOrderedList().run();
}

export function toggleTaskList(editor: Editor): void {
  editor.chain().focus().toggleTaskList().run();
}

export interface InsertTableOptions {
  rows?: number;
  cols?: number;
  withHeaderRow?: boolean;
}

/**
 * 从 startPos 起解析并向上查找表格节点，返回该表格的起始位置；未找到返回 -1。
 * 表格结构：table > row > cell > paragraph，第一个单元格内容起始于 tablePos + 3。
 */
function findTableStartPos(editor: Editor, startPos: number): number {
  const doc = editor.state.doc;
  if (startPos > doc.content.size) return -1;
  const $pos = doc.resolve(Math.min(startPos, doc.content.size));
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === 'table') return $pos.before(d);
  }
  return -1;
}

/** 不允许在表格内部再插入表格（与 EditorMode 无关）。插入后将光标置于第一个单元格内。 */
export function insertTable(
  editor: Editor,
  options?: InsertTableOptions
): void {
  if (editor.isActive('table')) return;
  const rows = Math.max(1, Math.min(options?.rows ?? 3, 15));
  const cols = Math.max(1, Math.min(options?.cols ?? 3, 15));
  const withHeaderRow = options?.withHeaderRow ?? true;
  const insertPos = editor.state.selection.from;
  editor
    .chain()
    .focus()
    .insertTable({ rows, cols, withHeaderRow })
    .run();

  const doc = editor.state.doc;
  let tableStart = findTableStartPos(editor, insertPos);
  if (tableStart < 0 && insertPos > 0) {
    tableStart = findTableStartPos(editor, insertPos - 1);
  }
  if (tableStart >= 0) {
    const firstCellContentPos = tableStart + 3;
    if (firstCellContentPos <= doc.content.size) {
      editor.commands.setTextSelection(firstCellContentPos);
    }
  }

  // 延迟到下一事件循环再 focus 并设光标，避免 Toolbar 关闭 picker 时重渲染导致选区被冲掉
  setTimeout(() => {
    let start = findTableStartPos(editor, insertPos);
    if (start < 0 && insertPos > 0) start = findTableStartPos(editor, insertPos - 1);
    if (start >= 0) {
      const pos = start + 3;
      if (pos <= editor.state.doc.content.size) {
        editor.chain().focus().setTextSelection(pos).run();
      }
    }
  }, 0);
}
