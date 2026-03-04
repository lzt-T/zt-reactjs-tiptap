import { generateJSON, generateText } from "@tiptap/core";
import type { Extensions, TextSerializer } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { ImageWithDelete } from "@/extensions/ImageWithDelete";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mathematics from "@tiptap/extension-mathematics";

/**
 * 与编辑器一致的扩展列表（仅用于解析/序列化，无运行时回调）
 */
const schemaExtensions: Extensions = [
  StarterKit,
  ImageWithDelete,
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
  Subscript,
  Superscript,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Placeholder.configure({ placeholder: "" }),
  Mathematics.configure({
    katexOptions: { throwOnError: false },
  }),
];

export interface HtmlToPlainTextOptions {
  /**
   * 块级节点之间的分隔符，默认 '\n'；当 singleLine 为 true 时会被视为 ' '
   */
  blockSeparator?: string;
  /**
   * 是否单行显示：为 true 时块之间用空格连接，且结果中的换行会替换为空格
   * @default false
   */
  singleLine?: boolean;
}

/**
 * 公式、图片、表格等节点的自定义文本序列化，否则转纯文本时多为空。
 */
const defaultTextSerializers: Record<string, TextSerializer> = {
  image: ({ node }) => {
    const alt = node.attrs?.alt;
    return typeof alt === "string" && alt ? alt : "[image]";
  },
  inlineMath: ({ node }) => {
    const latex = node.attrs?.latex;
    return typeof latex === "string" && latex ? `[${latex}]` : "[inline math]";
  },
  blockMath: ({ node }) => {
    const latex = node.attrs?.latex;
    return typeof latex === "string" && latex ? `[${latex}]` : "[block math]";
  },
  table: () => {
    // 表格整体用占位符；默认序列化会递归子节点，这里覆盖后表格会变成一行 "[表格]"
    return "[table]";
  },
};

/**
 * 将 HTML 字符串转为与 TipTap 编辑器 getText() 一致的纯文本。
 * 使用与编辑器相同的 schema 解析 HTML，再序列化为纯文本。
 *
 * @param html - HTML 字符串（或来自某 DOM 的 innerHTML）
 * @param options - 可选，如 blockSeparator
 * @returns 纯文本
 *
 * @example
 * const text = htmlToPlainText('<p>Hello</p><p>World</p>');
 * // 'Hello\nWorld'
 *
 * const text2 = htmlToPlainText(document.querySelector('.editor')?.innerHTML ?? '');
 */
export function htmlToPlainText(
  html: string,
  options?: HtmlToPlainTextOptions
): string {
  const s = html == null ? "" : String(html);
  if (!s.trim()) return "";
  const doc = generateJSON(s, schemaExtensions);
  const singleLine = options?.singleLine ?? false;
  const blockSeparator =
    options?.blockSeparator ?? (singleLine ? " " : "\n");
  let text = generateText(doc, schemaExtensions, {
    blockSeparator,
    textSerializers: defaultTextSerializers,
  });
  if (singleLine) {
    text = text.replace(/\s*[\r\n]+\s*/g, " ").trim();
  }
  return text;
}

/**
 * 从 DOM 元素读取内容并转为纯文本。
 * 会使用元素的 innerHTML；若传入的是编辑器根节点，请传入内容区（即 ProseMirror 挂载的节点）的父元素或对应 HTML。
 *
 * @param element - 包含富文本的 DOM 元素
 * @param options - 可选，如 blockSeparator
 * @returns 纯文本
 */
export function domToPlainText(
  element: HTMLElement | null | undefined,
  options?: HtmlToPlainTextOptions
): string {
  const html = element?.innerHTML ?? "";
  return htmlToPlainText(html, options);
}
