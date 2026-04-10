import { useCallback, useEffect, useRef, useState } from "react";
import { MenuPlacement } from "@/react/editor/types";

/** 编辑器内浮层的最终定位结果。 */
export interface EditorOverlayPosition {
  top: number;
  left: number;
  placement: MenuPlacement;
}

/** 可用于定位的锚点：既支持 DOMRect，也支持 HTMLElement。 */
export type EditorOverlayAnchor = DOMRect | HTMLElement;

/** 浮层的水平对齐方式。 */
export type EditorOverlayHorizontalAlign = "start" | "end";

/** 浮层的垂直定位模式。 */
export type EditorOverlayVerticalMode = "outside" | "inside-bottom";

/** 创建编辑器内浮层定位 Hook 时的默认配置。 */
export interface UseEditorOverlayPositionOptions {
  editorWrapperRef: React.RefObject<HTMLDivElement | null>;
  defaultPlacement?: MenuPlacement;
  placementThreshold?: number;
  horizontalAlign?: EditorOverlayHorizontalAlign;
  verticalMode?: EditorOverlayVerticalMode;
  horizontalOffset?: number;
  verticalOffset?: number;
  boundaryInset?: number;
  trackScrollLeft?: boolean;
}

/** 单次重算时可覆盖默认配置的参数。 */
export interface UpdateEditorOverlayPositionOptions {
  defaultPlacement?: MenuPlacement;
  placementThreshold?: number;
  horizontalAlign?: EditorOverlayHorizontalAlign;
  verticalMode?: EditorOverlayVerticalMode;
  horizontalOffset?: number;
  verticalOffset?: number;
  boundaryInset?: number;
  trackScrollLeft?: boolean;
  fallbackWidth?: number;
  fallbackHeight?: number;
}

// 默认展开方向：优先向下展开。
const DEFAULT_PLACEMENT = MenuPlacement.Bottom;

// 默认触发阈值：空间不足 240px 时切换向上展开。
const DEFAULT_PLACEMENT_THRESHOLD = 240;

// 默认边界间距：不额外预留边距。
const DEFAULT_BOUNDARY_INSET = 0;

// 默认水平偏移：与锚点边缘直接对齐。
const DEFAULT_HORIZONTAL_OFFSET = 0;

// 默认垂直偏移：与锚点边缘直接相接。
const DEFAULT_VERTICAL_OFFSET = 0;

/** 判断锚点是否为可直接读取矩形信息的 HTMLElement。 */
function isHTMLElement(anchor: EditorOverlayAnchor): anchor is HTMLElement {
  return anchor instanceof HTMLElement;
}

/** 计算给定阈值下的浮层展开方向。 */
function resolvePlacement(
  defaultPlacement: MenuPlacement,
  spaceAbove: number,
  spaceBelow: number,
  placementThreshold: number,
): MenuPlacement {
  if (defaultPlacement === MenuPlacement.Top) {
    return spaceAbove < placementThreshold && spaceBelow > spaceAbove
      ? MenuPlacement.Bottom
      : MenuPlacement.Top;
  }

  return spaceBelow < placementThreshold && spaceAbove > spaceBelow
    ? MenuPlacement.Top
    : MenuPlacement.Bottom;
}

/** 编辑器内浮层定位 Hook：统一处理坐标换算、方向判断与边界裁切。 */
export function useEditorOverlayPosition({
  editorWrapperRef,
  defaultPlacement = DEFAULT_PLACEMENT,
  placementThreshold = DEFAULT_PLACEMENT_THRESHOLD,
  horizontalAlign = "start",
  verticalMode = "outside",
  horizontalOffset = DEFAULT_HORIZONTAL_OFFSET,
  verticalOffset = DEFAULT_VERTICAL_OFFSET,
  boundaryInset = DEFAULT_BOUNDARY_INSET,
  trackScrollLeft = false,
}: UseEditorOverlayPositionOptions) {
  // 当前浮层在编辑器内容坐标系中的定位结果。
  const [position, setPosition] = useState<EditorOverlayPosition | null>(null);
  // 保存浮层根节点，用于首帧后读取真实尺寸并回填位置。
  const overlayElementRef = useRef<HTMLDivElement | null>(null);
  // 缓存最近一次用于定位的锚点，便于 resize 或挂载后重算。
  const lastAnchorRef = useRef<EditorOverlayAnchor | null>(null);
  // 缓存最近一次单次重算参数，便于保持行为一致。
  const lastOptionsRef = useRef<UpdateEditorOverlayPositionOptions | undefined>(
    undefined,
  );

  /** 清空当前浮层位置，并忘记上一次的锚点。 */
  const clearPosition = useCallback(() => {
    lastAnchorRef.current = null;
    lastOptionsRef.current = undefined;
    setPosition(null);
  }, []);

  /** 根据锚点重算浮层位置，并在必要时覆盖默认定位参数。 */
  const updatePosition = useCallback(
    (
      anchor: EditorOverlayAnchor | null,
      overrideOptions?: UpdateEditorOverlayPositionOptions,
    ) => {
      const wrapper = editorWrapperRef.current;
      if (!anchor || !wrapper) {
        clearPosition();
        return;
      }

      lastAnchorRef.current = anchor;
      lastOptionsRef.current = overrideOptions;

      // 合并默认定位参数与单次调用覆盖参数。
      const resolvedPlacement =
        overrideOptions?.defaultPlacement ?? defaultPlacement;
      // 决定何时从默认方向切换到反方向展开。
      const resolvedThreshold =
        overrideOptions?.placementThreshold ?? placementThreshold;
      // 决定浮层与锚点在水平方向上的对齐方式。
      const resolvedHorizontalAlign =
        overrideOptions?.horizontalAlign ?? horizontalAlign;
      // 决定浮层是在锚点外侧悬浮，还是贴在锚点内部底边。
      const resolvedVerticalMode =
        overrideOptions?.verticalMode ?? verticalMode;
      // 控制浮层与锚点在水平方向上的间距。
      const resolvedHorizontalOffset =
        overrideOptions?.horizontalOffset ?? horizontalOffset;
      // 控制浮层与锚点在垂直方向上的间距。
      const resolvedVerticalOffset =
        overrideOptions?.verticalOffset ?? verticalOffset;
      // 控制浮层距离编辑器边界的最小保留距离。
      const resolvedBoundaryInset =
        overrideOptions?.boundaryInset ?? boundaryInset;
      // 控制是否把横向滚动量纳入内容坐标换算。
      const resolvedTrackScrollLeft =
        overrideOptions?.trackScrollLeft ?? trackScrollLeft;
      // 首帧尚未拿到真实尺寸时的宽度兜底值。
      const fallbackWidth = overrideOptions?.fallbackWidth ?? 0;
      // 首帧尚未拿到真实尺寸时的高度兜底值。
      const fallbackHeight = overrideOptions?.fallbackHeight ?? 0;

      // 将 HTMLElement 锚点统一换算为 DOMRect。
      const rect = isHTMLElement(anchor)
        ? anchor.getBoundingClientRect()
        : anchor;
      // 编辑器滚动容器在视口中的矩形。
      const wrapperRect = wrapper.getBoundingClientRect();
      // 当前浮层的真实宽度，用于右对齐与边界裁切。
      const overlayWidth = overlayElementRef.current?.offsetWidth ?? fallbackWidth;
      // 当前浮层的真实高度，用于贴底定位与边界裁切。
      const overlayHeight =
        overlayElementRef.current?.offsetHeight ?? fallbackHeight;
      // 水平滚动量默认不参与换算，仅在显式开启时纳入。
      const scrollLeft = resolvedTrackScrollLeft ? wrapper.scrollLeft : 0;
      // 锚点顶部在编辑器内容坐标系中的位置。
      const anchorTop = rect.top - wrapperRect.top + wrapper.scrollTop;
      // 锚点底部在编辑器内容坐标系中的位置。
      const anchorBottom = rect.bottom - wrapperRect.top + wrapper.scrollTop;
      // 锚点左侧在编辑器内容坐标系中的位置。
      const anchorLeft = rect.left - wrapperRect.left + scrollLeft;
      // 锚点右侧在编辑器内容坐标系中的位置。
      const anchorRight = rect.right - wrapperRect.left + scrollLeft;
      // 锚点上方在可视区域中的可用空间。
      const spaceAbove = rect.top - wrapperRect.top;
      // 锚点下方在可视区域中的可用空间。
      const spaceBelow = wrapperRect.bottom - rect.bottom;
      // 根据上下可用空间决定最终展开方向。
      const placement = resolvePlacement(
        resolvedPlacement,
        spaceAbove,
        spaceBelow,
        resolvedThreshold,
      );

      // 计算未裁切前的纵向位置。
      const nextTop =
        resolvedVerticalMode === "inside-bottom"
          ? anchorBottom - overlayHeight - resolvedVerticalOffset
          : placement === MenuPlacement.Top
            ? anchorTop - resolvedVerticalOffset
            : anchorBottom + resolvedVerticalOffset;
      // 计算未裁切前的横向位置。
      const nextLeft =
        resolvedHorizontalAlign === "end"
          ? anchorRight - overlayWidth - resolvedHorizontalOffset
          : anchorLeft + resolvedHorizontalOffset;
      // 裁切后的最小横向坐标。
      const minLeft = scrollLeft + resolvedBoundaryInset;
      // 裁切后的最大横向坐标。
      const maxLeft =
        scrollLeft + wrapper.clientWidth - overlayWidth - resolvedBoundaryInset;
      // 裁切后的最终横向坐标。
      const clampedLeft = Math.min(
        Math.max(nextLeft, minLeft),
        Math.max(minLeft, maxLeft),
      );
      // 裁切后的最终纵向坐标。
      const clampedTop = Math.max(nextTop, resolvedBoundaryInset);

      setPosition({
        top: clampedTop,
        left: clampedLeft,
        placement,
      });
    },
    [
      boundaryInset,
      clearPosition,
      defaultPlacement,
      editorWrapperRef,
      horizontalAlign,
      horizontalOffset,
      placementThreshold,
      trackScrollLeft,
      verticalMode,
      verticalOffset,
    ],
  );

  useEffect(() => {
    /** 窗口尺寸变化后，基于最近一次锚点重新计算浮层位置。 */
    const handleResize = () => {
      if (!lastAnchorRef.current) return;
      updatePosition(lastAnchorRef.current, lastOptionsRef.current);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updatePosition]);

  /** 同步浮层根节点，并在首帧挂载后用真实尺寸触发一次重算。 */
  const overlayRef = useCallback(
    (node: HTMLDivElement | null) => {
      overlayElementRef.current = node;
      if (!node || !lastAnchorRef.current) return;
      window.requestAnimationFrame(() => {
        updatePosition(lastAnchorRef.current, lastOptionsRef.current);
      });
    },
    [updatePosition],
  );

  return {
    position,
    overlayRef,
    updatePosition,
    clearPosition,
  };
}
