import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "./ImageNodeView";
import type { ImageAttrs } from "./imageAttributes";
import {
  getImageAlignStyle,
  normalizeImageAlign,
  parseImageAlign,
  parseImageWidthPercent,
} from "./imageAttributes";

export const ResizableImage = Image.extend({
  /** 扩展图片宽度属性，按百分比解析和输出。 */
  addAttributes() {
    // 保留 TipTap Image 原有属性，仅覆盖 width 的百分比语义。
    const parentAttributes = this.parent?.() ?? {};

    return {
      ...parentAttributes,
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
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
  /** 使用自定义 React NodeView 渲染图片操作控件。 */
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
