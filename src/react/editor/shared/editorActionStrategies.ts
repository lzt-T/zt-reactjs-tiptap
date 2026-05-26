import type { Editor } from "@tiptap/react";
import { isInlineCodeMarkControlDisabled } from "@/react/editor/toolbar/shared/markDisableRules";
import { sanitizeUrlByKind } from "@/core/security/urlSecurity";

/** 可复用的 inline 控件禁用键。 */
export type InlineControlKey =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "link"
  | "highlight"
  | "textColor"
  | "superscript"
  | "subscript";

/** inline code 场景下的控件禁用状态映射。 */
export type InlineControlDisabledState = Record<InlineControlKey, boolean>;

/** 根据当前 inline code 状态生成控件禁用态映射。 */
export function createInlineControlDisabledState(
  isInsideCode: boolean,
): InlineControlDisabledState {
  return {
    bold: isInlineCodeMarkControlDisabled(isInsideCode, "bold"),
    italic: isInlineCodeMarkControlDisabled(isInsideCode, "italic"),
    underline: isInlineCodeMarkControlDisabled(isInsideCode, "underline"),
    strikethrough: isInlineCodeMarkControlDisabled(isInsideCode, "strikethrough"),
    link: isInlineCodeMarkControlDisabled(isInsideCode, "link"),
    highlight: isInlineCodeMarkControlDisabled(isInsideCode, "highlight"),
    textColor: isInlineCodeMarkControlDisabled(isInsideCode, "textColor"),
    superscript: isInlineCodeMarkControlDisabled(isInsideCode, "superscript"),
    subscript: isInlineCodeMarkControlDisabled(isInsideCode, "subscript"),
  };
}

/** 切换文字颜色：重复选中同色时取消。 */
export function toggleTextColor(
  editor: Editor,
  color: string,
  actions: { setColor: (next: string) => void; unsetColor: () => void },
): void {
  const current = (editor.getAttributes("textStyle").color ?? "")
    .trim()
    .toLowerCase();
  if (current && color.trim().toLowerCase() === current) {
    actions.unsetColor();
    return;
  }
  actions.setColor(color);
}

/** 切换高亮色：空字符串清空高亮，重复选中同色时取消。 */
export function toggleHighlightColor(
  editor: Editor,
  color: string,
  actions: { setHighlight: (next: string) => void; unsetHighlight: () => void },
): void {
  if (color === "") {
    actions.unsetHighlight();
    return;
  }
  const current = (editor.getAttributes("highlight").color ?? "")
    .trim()
    .toLowerCase();
  if (current === color.trim().toLowerCase()) {
    actions.unsetHighlight();
    return;
  }
  actions.setHighlight(color);
}

/** 获取当前链接并进入编辑状态。 */
export function openLinkDraft(editor: Editor): string {
  return String(editor.getAttributes("link").href ?? "").trim();
}

/** 解析链接草稿：空字符串返回 null。 */
export function resolveLinkDraftHref(linkDraft: string): string | null {
  return sanitizeUrlByKind(linkDraft, "link");
}

/** 提交链接草稿：空链接直接忽略。 */
export function submitLinkDraft(
  linkDraft: string,
  actions: { setLink: (href: string) => void },
): boolean {
  const href = resolveLinkDraftHref(linkDraft);
  if (!href) return false;
  actions.setLink(href);
  return true;
}

/** 删除当前链接。 */
export function removeLink(actions: { unsetLink: () => void }): void {
  actions.unsetLink();
}
