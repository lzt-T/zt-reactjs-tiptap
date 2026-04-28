import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

type PasteErrorEvent = {
  source: "paste";
  stage: "transform";
  message: string;
  error?: unknown;
};

interface HtmlPasteSanitizerOptions {
  onError?: (event: PasteErrorEvent) => void;
}

// 需要直接移除的高风险或无效标签。
const BLOCKED_TAGS = new Set([
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
]);

// 过滤 Office 污染 class（如 Mso*），保留其他 class。
function sanitizeClassName(value: string): string {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/^mso/i.test(item))
    .join(" ");
}

// 解包无意义包裹节点，保留其子节点语义结构。
function unwrapNode(element: Element) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

// 清洗 DOM 节点属性与无效包裹元素。
function sanitizeElement(root: Element) {
  const elements = Array.from(root.querySelectorAll("*"));

  elements.forEach((element) => {
    const tagName = element.tagName.toLowerCase();

    if (BLOCKED_TAGS.has(tagName)) {
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const attrName = attribute.name.toLowerCase();
      if (attrName.startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    });

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
  });

  const wrappers = Array.from(root.querySelectorAll("span,font"));
  wrappers.forEach((element) => {
    if (element.attributes.length === 0) {
      unwrapNode(element);
    }
  });
}

// 将 HTML 字符串转换为安全且更干净的 HTML。
function sanitizeHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  sanitizeElement(doc.body);
  return doc.body.innerHTML.replace(/\u00a0/g, " ").trim();
}

// 仅拦截 HTML 粘贴并执行清洗，失败时回退到原生粘贴。
export const HtmlPasteSanitizer = Extension.create<HtmlPasteSanitizerOptions>({
  name: "htmlPasteSanitizer",

  addOptions() {
    return {
      onError: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;
            // 代码块内仅按纯文本粘贴，避免 HTML 结构插入失败导致粘贴被吞。
            if (this.editor.isActive("codeBlock")) {
              const text = clipboardData.getData("text/plain");
              if (!text) return false;
              return this.editor.commands.insertContent(text);
            }
            const html = clipboardData.getData("text/html");
            if (!html) return false;

            try {
              const sanitizedHtml = sanitizeHtml(html);
              if (!sanitizedHtml) return false;
              return this.editor.commands.insertContent(sanitizedHtml);
            } catch (error) {
              this.options.onError?.({
                source: "paste",
                stage: "transform",
                message: "Failed to sanitize pasted HTML",
                error,
              });
              return false;
            }
          },
        },
      }),
    ];
  },
});
