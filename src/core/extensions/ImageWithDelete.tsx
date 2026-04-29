import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ImageOff,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

// 图片最小宽度百分比，避免拖到难以再次操作。
const MIN_IMAGE_WIDTH_PERCENT = 10;

// 图片最大宽度百分比，避免超出编辑区域。
const MAX_IMAGE_WIDTH_PERCENT = 100;

type ImageResizeSide = "left" | "right";

interface ImageResizeState {
  startX: number;
  startWidthPercent: number;
  containerWidth: number;
  side: ImageResizeSide;
}

interface ImageAttrs {
  src: string;
  alt?: string;
  title?: string;
  width?: number | string | null;
  align?: ImageAlign | null;
}

type ImageAlign = "left" | "center" | "right";

/** 将图片宽度限制在可编辑的百分比范围内。 */
function clampImageWidthPercent(width: number) {
  return Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.max(MIN_IMAGE_WIDTH_PERCENT, width));
}

/** 从节点属性中解析百分比宽度。 */
function parseImageWidthPercent(width: ImageAttrs["width"]) {
  if (width == null || width === "") return null;

  const parsedWidth = typeof width === "number" ? width : Number.parseFloat(width);
  if (!Number.isFinite(parsedWidth)) return null;

  return clampImageWidthPercent(parsedWidth);
}

/** 从 HTML 属性和样式中解析图片对齐方式。 */
function parseImageAlign(element: HTMLElement): ImageAlign {
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

/** 生成图片对齐需要写入 HTML 的样式。 */
function getImageAlignStyle(align: ImageAlign) {
  if (align === "center") {
    return "display: block; margin-left: auto; margin-right: auto;";
  }
  if (align === "right") {
    return "display: block; margin-left: auto; margin-right: 0;";
  }
  return "display: block; margin-left: 0; margin-right: auto;";
}

/** 渲染带删除按钮的图片节点视图，并处理加载态与失败态。 */
function ImageView({ node, deleteNode, editor, selected, updateAttributes }: NodeViewProps) {
  const { src, alt, title, width, align = "left" } = node.attrs as ImageAttrs;
  // 当前图片节点实际使用的对齐方式。
  const imageAlign = align === "center" || align === "right" ? align : "left";
  // 图片节点外层容器引用，用于按编辑区域宽度计算百分比。
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // 拖拽过程中的瞬时数据，不需要每次变化触发渲染。
  const resizeStateRef = useRef<ImageResizeState | null>(null);
  // 拖拽过程中的最新宽度，用于 mouseup 提交最终值。
  const resizeWidthRef = useRef<number | null>(null);
  /** 记录加载失败的 src，仅当当前 src 与之一致时显示错误占位。 */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  /** 记录最后一次加载成功的 src，用于避免 effect 中同步 setState。 */
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  /** 拖拽中的临时宽度百分比，用于即时反馈。 */
  const [dragWidthPercent, setDragWidthPercent] = useState<number | null>(null);
  // 当前节点保存的百分比宽度。
  const nodeWidthPercent = parseImageWidthPercent(width);
  // 实际渲染用的百分比宽度。
  const imageWidthPercent = dragWidthPercent ?? nodeWidthPercent;
  // 当前图片是否加载失败。
  const loadError = failedSrc === src;
  // 当前图片是否已经加载完成。
  const loaded = loadedSrc === src;
  // 图片加载成功且编辑器可编辑时才允许拖拽缩放。
  const canResize = editor.isEditable && loaded && !loadError;
  // 百分比宽度只挂在 wrapper 上，保证手柄贴合图片边界。
  const wrapperStyle: CSSProperties = {
    marginLeft: imageAlign === "center" || imageAlign === "right" ? "auto" : 0,
    marginRight: imageAlign === "center" || imageAlign === "left" ? "auto" : 0,
    ...(loaded && imageWidthPercent != null ? { width: `${imageWidthPercent}%` } : {}),
  };
  // 有百分比宽度时图片铺满 wrapper，无宽度时保持原有自适应行为。
  const imageStyle: CSSProperties = {
    opacity: loaded ? 1 : 0,
    ...(imageWidthPercent == null ? {} : { width: "100%" }),
  };

  /** 图片成功加载后更新当前 src 的完成状态。 */
  const handleLoad = () => {
    setLoadedSrc(src);
    setFailedSrc(null);
  };

  /** 图片加载失败后记录失败 src，显示错误占位。 */
  const handleError = () => {
    setFailedSrc(src);
    setLoadedSrc(null);
  };

  /** 根据鼠标位置更新拖拽中的图片宽度。 */
  const handleResizeMove = (event: MouseEvent) => {
    // 当前拖拽状态。
    const resizeState = resizeStateRef.current;
    if (!resizeState) return;

    // 左右手柄对应相反的宽度变化方向。
    const direction = resizeState.side === "right" ? 1 : -1;
    // 鼠标偏移换算出的宽度百分比变化量。
    const deltaPercent = ((event.clientX - resizeState.startX) / resizeState.containerWidth) * 100;
    // 下一帧显示的图片宽度百分比。
    const nextWidthPercent = clampImageWidthPercent(
      resizeState.startWidthPercent + deltaPercent * direction
    );

    resizeWidthRef.current = nextWidthPercent;
    setDragWidthPercent(nextWidthPercent);
  };

  /** 结束拖拽并把百分比宽度写回图片节点。 */
  const handleResizeEnd = () => {
    // 拖拽结束时需要提交的最终宽度。
    const nextWidthPercent = resizeWidthRef.current;

    window.removeEventListener("mousemove", handleResizeMove);
    window.removeEventListener("mouseup", handleResizeEnd);
    resizeStateRef.current = null;
    resizeWidthRef.current = null;

    if (nextWidthPercent == null) return;

    // 写入文档的整数百分比，避免 HTML 属性带过长小数。
    const committedWidthPercent = Math.round(nextWidthPercent);
    setDragWidthPercent(null);
    updateAttributes({ width: committedWidthPercent });
  };

  /** 开始按百分比拖拽调整图片宽度。 */
  const handleResizeStart = (side: ImageResizeSide, event: ReactMouseEvent<HTMLButtonElement>) => {
    // 图片外层节点。
    const wrapper = wrapperRef.current;
    // 图片宽度百分比的参照容器。
    const container = wrapper?.parentElement;
    if (!wrapper || !container) return;

    event.preventDefault();
    event.stopPropagation();

    // 当前参照容器宽度。
    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;

    // 当前图片宽度百分比，未保存过时按实际渲染宽度计算。
    const currentWidthPercent =
      imageWidthPercent ??
      clampImageWidthPercent((wrapper.getBoundingClientRect().width / containerWidth) * 100);

    resizeStateRef.current = {
      startX: event.clientX,
      startWidthPercent: currentWidthPercent,
      containerWidth,
      side,
    };
    resizeWidthRef.current = currentWidthPercent;
    setDragWidthPercent(currentWidthPercent);

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);
  };

  /** 更新图片水平对齐方式，并保持当前图片选中态。 */
  const handleAlignChange = (
    nextAlign: ImageAlign,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    updateAttributes({ align: nextAlign });
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={
        loadError
          ? "image-node-wrapper is-error"
          : loaded
            ? dragWidthPercent == null
              ? "image-node-wrapper"
              : "image-node-wrapper is-resizing"
            : "image-node-wrapper is-loading"
      }
      style={wrapperStyle}
      contentEditable={false}
      data-align={imageAlign}
      data-drag-handle
    >
      {loadError ? (
        <div
          className={
            selected ? "image-error-placeholder image-selected" : "image-error-placeholder"
          }
        >
          <ImageOff size={32} />
          <span>图片加载失败</span>
        </div>
      ) : (
        <>
          {!loaded && <div className="image-loading-placeholder" aria-hidden />}
          <img
            src={src}
            alt={alt ?? ""}
            title={title ?? ""}
            className={selected ? "image-selected" : ""}
            // 禁用原生 img 拖拽，避免浏览器按“复制资源”语义处理。
            draggable={false}
            onLoad={handleLoad}
            onError={handleError}
            style={imageStyle}
          />
        </>
      )}
      {canResize && (
        <>
          <button
            type="button"
            className="image-resize-handle image-resize-handle-left"
            aria-label="向左拖拽调整图片宽度"
            onMouseDown={(event) => handleResizeStart("left", event)}
          />
          <button
            type="button"
            className="image-resize-handle image-resize-handle-right"
            aria-label="向右拖拽调整图片宽度"
            onMouseDown={(event) => handleResizeStart("right", event)}
          />
        </>
      )}
      {editor.isEditable && selected && (
        <div className="image-align-menu" aria-label="图片对齐操作栏">
          <button
            type="button"
            className={
              imageAlign === "left"
                ? "image-align-menu-btn is-active"
                : "image-align-menu-btn"
            }
            aria-label="图片左对齐"
            title="图片左对齐"
            onMouseDown={(event) => handleAlignChange("left", event)}
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className={
              imageAlign === "center"
                ? "image-align-menu-btn is-active"
                : "image-align-menu-btn"
            }
            aria-label="图片居中对齐"
            title="图片居中对齐"
            onMouseDown={(event) => handleAlignChange("center", event)}
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            className={
              imageAlign === "right"
                ? "image-align-menu-btn is-active"
                : "image-align-menu-btn"
            }
            aria-label="图片右对齐"
            title="图片右对齐"
            onMouseDown={(event) => handleAlignChange("right", event)}
          >
            <AlignRight size={16} />
          </button>
        </div>
      )}
      {editor.isEditable && (
        <button
          type="button"
          className="image-delete-btn"
          aria-label="删除图片"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteNode();
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </NodeViewWrapper>
  );
}

export const ImageWithDelete = Image.extend({
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
          const align =
            attributes.align === "center" || attributes.align === "right"
              ? attributes.align
              : "left";

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
    return ReactNodeViewRenderer(ImageView);
  },
});
