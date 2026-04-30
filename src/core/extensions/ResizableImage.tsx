import { mergeAttributes } from "@tiptap/core";
import Image, { type ImageOptions } from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import enUS from "@/shared/locales/en-US";
import type { EditorLocale } from "@/shared/locales";
import { ImageNodeView } from "./ImageNodeView";
import type { ImageAttrs } from "./imageAttributes";
import {
  getImageAlignStyle,
  normalizeImageAlign,
  parseImageAlign,
  parseImageWidthPercent,
} from "./imageAttributes";

interface ResizableImageOptions extends ImageOptions {
  locale: EditorLocale;
}

export const ResizableImage = Image.extend<ResizableImageOptions>({
  /** 扩展图片配置，补充节点视图所需文案。 */
  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      resize: false,
      ...this.parent?.(),
      locale: enUS,
    };
  },
  /** 兼容旧图片和带描述的 figure 图片。 */
  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;

          // figure 必须包含合法图片，否则不作为图片节点解析。
          const image = element.querySelector("img[src]");
          if (!image) return false;
          if (!this.options.allowBase64 && image.getAttribute("src")?.startsWith("data:")) {
            return false;
          }

          return {};
        },
      },
      {
        tag: this.options.allowBase64 ? "img[src]" : 'img[src]:not([src^="data:"])',
      },
    ];
  },
  /** 扩展图片宽度属性，按百分比解析和输出。 */
  addAttributes() {
    // 保留 TipTap Image 原有属性，仅覆盖 width 的百分比语义。
    const parentAttributes = this.parent?.() ?? {};

    return {
      ...parentAttributes,
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          // figure 节点从内部 img 读取真实图片地址。
          const image = element.matches("figure") ? element.querySelector("img") : element;

          return image?.getAttribute("src");
        },
      },
      alt: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          // figure 节点从内部 img 读取图片替代文本。
          const image = element.matches("figure") ? element.querySelector("img") : element;

          return image?.getAttribute("alt");
        },
      },
      title: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          // figure 节点从内部 img 读取图片标题。
          const image = element.matches("figure") ? element.querySelector("img") : element;

          return image?.getAttribute("title");
        },
      },
      caption: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          // 仅 figure 结构携带可见图片描述。
          const caption = element.matches("figure")
            ? element.querySelector("figcaption")?.textContent
            : null;

          return caption?.trim() || null;
        },
        renderHTML: () => ({}),
      },
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          // HTML style 中声明的百分比宽度优先级最高。
          const styleWidth = element.style.width;
          // 兼容直接写在 width 属性上的历史值。
          const widthAttr = element.getAttribute("width");
          // 统一交给百分比解析函数处理。
          const rawWidth = styleWidth.endsWith("%") ? styleWidth : widthAttr;

          return parseImageWidthPercent(rawWidth);
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          // 当前图片节点保存的百分比宽度。
          const widthPercent = parseImageWidthPercent(attributes.width as ImageAttrs["width"]);
          if (widthPercent == null) return {};

          return {
            style: `width: ${widthPercent}%; height: auto;`,
          };
        },
      },
      align: {
        default: "left",
        parseHTML: parseImageAlign,
        renderHTML: (attributes: Record<string, unknown>) => {
          // 图片节点的水平对齐方式。
          const align = normalizeImageAlign(attributes.align);

          return {
            "data-align": align,
            style: getImageAlignStyle(align),
          };
        },
      },
    };
  },
  /** 输出图片 HTML，保留扩展属性合并能力。 */
  renderHTML({ HTMLAttributes }) {
    // 图片描述仅用于决定 figure 输出，不写入 img 属性。
    const { caption, ...attributesWithoutCaption } = HTMLAttributes;
    if (typeof caption !== "string" || caption.trim() === "") {
      return ["img", mergeAttributes(this.options.HTMLAttributes, attributesWithoutCaption)];
    }

    // 拆出 figure 专属样式属性，避免写到内部 img 上。
    const { style, "data-align": dataAlign, ...imageAttributes } = attributesWithoutCaption;
    // figure 承载宽度和对齐样式，让描述宽度跟随图片。
    const figureAttributes = mergeAttributes(
      dataAlign == null ? {} : { "data-align": dataAlign },
      style == null ? {} : { style }
    );

    return [
      "figure",
      figureAttributes,
      ["img", mergeAttributes(this.options.HTMLAttributes, imageAttributes)],
      ["figcaption", {}, caption],
    ];
  },
  /** 使用自定义 React NodeView 渲染图片操作控件。 */
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
