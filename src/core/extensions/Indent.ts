import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      /** 增加当前段落或标题的缩进层级。 */
      increaseIndent: () => ReturnType;
      /** 减少当前段落或标题的缩进层级。 */
      decreaseIndent: () => ReturnType;
    };
  }
}

export interface IndentOptions {
  types: string[];
  step: number;
  maxLevel: number;
}

/** 读取节点上的缩进层级，兼容缺失或异常属性。 */
function getIndentLevel(value: unknown): number {
  if (typeof value !== "number") return 0;
  return Number.isFinite(value) ? value : 0;
}

/** 从 HTML 属性中解析缩进层级。 */
function parseIndentLevel(element: HTMLElement): number {
  // HTML 中持久化的缩进层级。
  const rawValue = element.getAttribute("data-indent");
  // 解析后的缩进层级。
  const level = Number.parseInt(rawValue ?? "0", 10);
  return Number.isFinite(level) && level > 0 ? level : 0;
}

/** 生成缩进属性对应的 HTML 输出。 */
function renderIndentAttributes(attributes: Record<string, unknown>, step: number) {
  // 当前节点的缩进层级。
  const level = getIndentLevel(attributes.indent);
  if (level <= 0) return {};
  return {
    "data-indent": String(level),
    style: `margin-left: ${level * step}em`,
  };
}

/** 更新单个块节点的缩进层级。 */
function updateNodeIndent(
  tr: Transaction,
  node: ProseMirrorNode,
  pos: number,
  delta: 1 | -1,
  maxLevel: number,
  shouldApply: boolean,
): boolean {
  // 当前块节点的缩进层级。
  const currentIndent = getIndentLevel(node.attrs.indent);
  // 更新后的缩进层级。
  const nextIndent = Math.max(0, Math.min(currentIndent + delta, maxLevel));
  if (nextIndent === currentIndent) return false;
  if (shouldApply) {
    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      indent: nextIndent,
    });
  }
  return true;
}

/** 更新当前选区内可缩进的块节点。 */
function updateSelectionIndent(
  state: EditorState,
  tr: Transaction,
  types: string[],
  delta: 1 | -1,
  maxLevel: number,
  shouldApply: boolean,
): boolean {
  if (state.selection.empty) {
    // 当前光标解析位置。
    const $from = state.selection.$from;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      // 当前深度对应的节点。
      const node = $from.node(depth);
      if (!types.includes(node.type.name)) continue;
      return updateNodeIndent(
        tr,
        node,
        $from.before(depth),
        delta,
        maxLevel,
        shouldApply,
      );
    }
    return false;
  }

  // 是否已经更新过至少一个节点。
  let changed = false;
  // 当前选区的起止位置。
  const { from, to } = state.selection;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!types.includes(node.type.name)) return;
    changed =
      updateNodeIndent(tr, node, pos, delta, maxLevel, shouldApply) || changed;
  });
  return changed;
}

/** 轻量块级缩进扩展，用于 paragraph / heading。 */
export const Indent = Extension.create<IndentOptions>({
  name: "indent",

  /** 返回缩进扩展的默认配置。 */
  addOptions() {
    return {
      types: ["paragraph", "heading"],
      step: 2,
      maxLevel: 7,
    };
  },

  /** 注册 paragraph / heading 的缩进属性。 */
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: parseIndentLevel,
            renderHTML: (attributes) =>
              renderIndentAttributes(attributes, this.options.step),
          },
        },
      },
    ];
  },

  /** 注册增加缩进与减少缩进命令。 */
  addCommands() {
    return {
      increaseIndent:
        () =>
        ({ state, tr, dispatch }) => {
          // 是否实际增加了缩进层级。
          const changed = updateSelectionIndent(
            state,
            tr,
            this.options.types,
            1,
            this.options.maxLevel,
            Boolean(dispatch),
          );
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
      decreaseIndent:
        () =>
        ({ state, tr, dispatch }) => {
          // 是否实际减少了缩进层级。
          const changed = updateSelectionIndent(
            state,
            tr,
            this.options.types,
            -1,
            this.options.maxLevel,
            Boolean(dispatch),
          );
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
    };
  },
});
