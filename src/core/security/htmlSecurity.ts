import DOMPurify from "dompurify";
import { sanitizeUrlByKind } from "@/core/security/urlSecurity";

// 需要直接移除的高风险或无效标签。
const BLOCKED_TAGS = [
  "script",
  "style",
  "meta",
  "link",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "svg",
  "canvas",
  "video",
  "audio",
];

// HTML 场景允许的 URI 规则：链接与图片使用 DOMPurify 主过滤，并保留相对路径能力。
const HTML_ALLOWED_URI_REGEXP =
  /^(?:(?:(?:https?|mailto|tel|blob):|data:image\/)|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

/** 过滤 Office 污染 class（如 Mso*），保留其他 class。 */
function sanitizeClassName(value: string): string {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/^mso/i.test(item))
    .join(" ");
}

/** 解包无意义包裹节点，保留其子节点语义结构。 */
function unwrapNode(element: Element) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

/** 对 DOMPurify 输出做最薄的编辑器兼容后处理。 */
export function sanitizeEditorHtmlPostProcess(root: Element) {
  const elements = Array.from(root.querySelectorAll("*"));

  elements.forEach((element) => {
    if (element.hasAttribute("style")) {
      element.removeAttribute("style");
    }

    if (element.hasAttribute("class")) {
      const nextClassName = sanitizeClassName(element.getAttribute("class") ?? "");
      if (nextClassName) {
        element.setAttribute("class", nextClassName);
      } else {
        element.removeAttribute("class");
      }
    }

    // 自定义附件节点的 data-url 不属于 DOMPurify 的标准 URI 属性，单独兜底校验。
    if (
      element.hasAttribute("data-url") &&
      !sanitizeUrlByKind(element.getAttribute("data-url") ?? "", "attachment")
    ) {
      element.removeAttribute("data-url");
    }
  });

  const wrappers = Array.from(root.querySelectorAll("span,font"));
  wrappers.forEach((element) => {
    if (element.attributes.length === 0) {
      unwrapNode(element);
    }
  });
}

/** 将 HTML 字符串转换为安全且更干净的 HTML。 */
export function sanitizeEditorHtml(html: string): string {
  const purifiedHtml = DOMPurify.sanitize(html, {
    FORBID_TAGS: BLOCKED_TAGS,
    FORBID_ATTR: ["style"],
    ALLOWED_URI_REGEXP: HTML_ALLOWED_URI_REGEXP,
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(purifiedHtml, "text/html");
  sanitizeEditorHtmlPostProcess(doc.body);
  return doc.body.innerHTML.replace(/\u00a0/g, " ").trim();
}
