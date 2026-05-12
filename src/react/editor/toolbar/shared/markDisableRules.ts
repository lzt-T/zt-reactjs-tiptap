/**
 * 行内格式能力 key（用于统一 Toolbar 与 BubbleMenu 的禁用规则）。
 */
export type InlineMarkControlKey =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "link"
  | "highlight"
  | "textColor"
  | "superscript"
  | "subscript"
  | "inlineCode";

/**
 * inline code 场景下需要禁用的按钮集合。
 * 注意：inlineCode 按钮本身保持可用，用于退出 code mark。
 */
const DISABLED_IN_INLINE_CODE: ReadonlySet<InlineMarkControlKey> = new Set([
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "link",
  "highlight",
  "textColor",
  "superscript",
  "subscript",
]);

/**
 * 统一判定：在 inline code 中，某个行内格式按钮是否应禁用。
 */
export function isInlineCodeMarkControlDisabled(
  isInsideCode: boolean,
  key: InlineMarkControlKey,
): boolean {
  if (!isInsideCode) return false;
  return DISABLED_IN_INLINE_CODE.has(key);
}
