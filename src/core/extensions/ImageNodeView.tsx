import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { AlignCenter, AlignLeft, AlignRight, Captions, ImageOff, Trash2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import type { EditorLocale } from "@/shared/locales";
import { ImageCaptionInput } from "./ImageCaptionInput";
import type { ImageAlign, ImageAttrs } from "./imageAttributes";
import {
  clampImageWidthPercent,
  normalizeImageAlign,
  parseImageWidthPercent,
} from "./imageAttributes";

type ImageResizeSide = "left" | "right";

type ImageAlignMenuPlacement = "above" | "inside" | null;

// 图片操作栏外置显示时需要的顶部空间。
const IMAGE_ALIGN_MENU_TOP_SPACE = 46;

interface ImageResizeState {
  startX: number;
  startWidthPercent: number;
  containerWidth: number;
  side: ImageResizeSide;
}

/** 渲染带操作控件的图片节点视图，并处理加载态与失败态。 */
export function ImageNodeView({
  node,
  deleteNode,
  editor,
  extension,
  getPos,
  selected,
  updateAttributes,
}: NodeViewProps) {
  // 当前图片节点属性。
  const { src, alt, title, caption, width, align = "left" } = node.attrs as ImageAttrs;
  // 图片节点文案。
  const imageNodeLocale = (extension.options as { locale: EditorLocale }).locale.imageNode;
  // 当前图片节点实际使用的对齐方式。
  const imageAlign = normalizeImageAlign(align);
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
  /** 图片操作栏的位置，null 表示等待测量后再显示。 */
  const [alignMenuPlacement, setAlignMenuPlacement] =
    useState<ImageAlignMenuPlacement>(null);
  /** caption 刚开启后需要自动聚焦一次。 */
  const [shouldFocusCaption, setShouldFocusCaption] = useState(false);
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
  // caption 属性存在时才显示图片描述输入框。
  const hasCaptionEnabled = typeof caption === "string";
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

  useLayoutEffect(() => {
    if (!selected) {
      setAlignMenuPlacement(null);
      return;
    }

    /** 根据图片到编辑器滚动容器顶部的距离更新操作栏位置。 */
    const updateAlignMenuPlacement = () => {
      // 图片外层节点。
      const wrapper = wrapperRef.current;
      // 编辑器滚动容器。
      const editorWrapper = wrapper?.closest(".editor-wrapper");
      if (!wrapper || !editorWrapper) {
        setAlignMenuPlacement("inside");
        return;
      }

      // 图片与编辑器滚动容器的视口位置。
      const wrapperRect = wrapper.getBoundingClientRect();
      const editorWrapperRect = editorWrapper.getBoundingClientRect();
      // 图片上方可用于外置操作栏的空间。
      const topSpace = wrapperRect.top - editorWrapperRect.top;
      // 下一次操作栏显示位置。
      const nextPlacement =
        topSpace < IMAGE_ALIGN_MENU_TOP_SPACE ? "inside" : "above";

      setAlignMenuPlacement(nextPlacement);
    };

    updateAlignMenuPlacement();

    // 编辑器滚动容器。
    const editorWrapper = wrapperRef.current?.closest(".editor-wrapper");
    editorWrapper?.addEventListener("scroll", updateAlignMenuPlacement);
    window.addEventListener("resize", updateAlignMenuPlacement);

    return () => {
      editorWrapper?.removeEventListener("scroll", updateAlignMenuPlacement);
      window.removeEventListener("resize", updateAlignMenuPlacement);
    };
  }, [selected]);

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

  /** 更新图片描述文本。 */
  const handleCaptionChange = (nextCaption: string) => {
    updateAttributes({ caption: nextCaption });
  };

  /** 切换图片描述输入框，关闭时同步清空描述内容。 */
  const handleCaptionToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (hasCaptionEnabled) {
      setShouldFocusCaption(false);
      updateAttributes({ caption: null });
      return;
    }

    setShouldFocusCaption(true);
    updateAttributes({ caption: "" });
  };

  /** 清除 caption 输入框的一次性聚焦标记。 */
  const handleCaptionFocused = () => {
    setShouldFocusCaption(false);
  };

  /** 回车确认描述后重新选中当前图片节点。 */
  const handleCaptionEnter = () => {
    // 当前图片节点位置。
    const pos = getPos();
    if (typeof pos !== "number") return;

    editor.chain().focus().setNodeSelection(pos).run();
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
      <div className="image-node-media">
        {loadError ? (
          <div
            className={
              selected ? "image-error-placeholder image-selected" : "image-error-placeholder"
            }
          >
            <ImageOff size={32} />
            <span>{imageNodeLocale.imageLoadFailed}</span>
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
              aria-label={imageNodeLocale.resizeLeft}
              onMouseDown={(event) => handleResizeStart("left", event)}
            />
            <button
              type="button"
              className="image-resize-handle image-resize-handle-right"
              aria-label={imageNodeLocale.resizeRight}
              onMouseDown={(event) => handleResizeStart("right", event)}
            />
          </>
        )}
        {editor.isEditable && selected && alignMenuPlacement != null && (
          <div
            className={`image-align-menu is-${alignMenuPlacement}`}
            aria-label={imageNodeLocale.alignMenu}
          >
            <button
              type="button"
              className={
                imageAlign === "left"
                  ? "image-align-menu-btn is-active"
                  : "image-align-menu-btn"
              }
              aria-label={imageNodeLocale.alignLeft}
              title={imageNodeLocale.alignLeft}
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
              aria-label={imageNodeLocale.alignCenter}
              title={imageNodeLocale.alignCenter}
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
              aria-label={imageNodeLocale.alignRight}
              title={imageNodeLocale.alignRight}
              onMouseDown={(event) => handleAlignChange("right", event)}
            >
              <AlignRight size={16} />
            </button>
            <button
              type="button"
              className={
                hasCaptionEnabled
                  ? "image-align-menu-btn is-active"
                  : "image-align-menu-btn"
              }
              aria-label={
                hasCaptionEnabled
                  ? imageNodeLocale.disableCaption
                  : imageNodeLocale.enableCaption
              }
              title={
                hasCaptionEnabled
                  ? imageNodeLocale.disableCaption
                  : imageNodeLocale.enableCaption
              }
              onMouseDown={handleCaptionToggle}
            >
              <Captions size={16} />
            </button>
          </div>
        )}
        {editor.isEditable && (
          <button
            type="button"
            className="image-delete-btn"
            aria-label={imageNodeLocale.deleteImage}
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
      </div>
      {!loadError && loaded && hasCaptionEnabled && (
        <ImageCaptionInput
          placeholder={imageNodeLocale.captionPlaceholder}
          ariaLabel={imageNodeLocale.captionAriaLabel}
          autoFocus={shouldFocusCaption}
          caption={caption}
          editable={editor.isEditable}
          onAutoFocusComplete={handleCaptionFocused}
          onCaptionChange={handleCaptionChange}
          onEnter={handleCaptionEnter}
        />
      )}
    </NodeViewWrapper>
  );
}
