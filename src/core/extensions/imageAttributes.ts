// 图片最小宽度百分比，避免拖到难以再次操作。
export const MIN_IMAGE_WIDTH_PERCENT = 10;

// 图片最大宽度百分比，避免超出编辑区域。
export const MAX_IMAGE_WIDTH_PERCENT = 100;

export type ImageAlign = "left" | "center" | "right";

export interface ImageAttrs {
  src: string;
  alt?: string;
  title?: string;
  width?: number | string | null;
  align?: ImageAlign | null;
}

/** 将图片宽度限制在可编辑的百分比范围内。 */
export function clampImageWidthPercent(width: number) {
  return Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.max(MIN_IMAGE_WIDTH_PERCENT, width));
}

/** 从节点属性中解析百分比宽度。 */
export function parseImageWidthPercent(width: ImageAttrs["width"]) {
  if (width == null || width === "") return null;

  // 解析后的图片宽度百分比。
  const parsedWidth = typeof width === "number" ? width : Number.parseFloat(width);
  if (!Number.isFinite(parsedWidth)) return null;

  return clampImageWidthPercent(parsedWidth);
}

/** 从 HTML 属性和样式中解析图片对齐方式。 */
export function parseImageAlign(element: HTMLElement): ImageAlign {
  // data-align 是编辑器导出的明确语义。
  const dataAlign = element.getAttribute("data-align");
  if (dataAlign === "center" || dataAlign === "right" || dataAlign === "left") {
    return dataAlign;
  }

  // margin 样式用于兼容外部 HTML 或旧内容。
  const marginLeft = element.style.marginLeft;
  const marginRight = element.style.marginRight;
  if (marginLeft === "auto" && marginRight === "auto") return "center";
  if (marginLeft === "auto") return "right";

  return "left";
}

/** 归一化图片对齐方式。 */
export function normalizeImageAlign(align: unknown): ImageAlign {
  return align === "center" || align === "right" ? align : "left";
}

/** 生成图片对齐需要写入 HTML 的样式。 */
export function getImageAlignStyle(align: ImageAlign) {
  if (align === "center") {
    return "display: block; margin-left: auto; margin-right: auto;";
  }
  if (align === "right") {
    return "display: block; margin-left: auto; margin-right: 0;";
  }
  return "display: block; margin-left: 0; margin-right: auto;";
}
