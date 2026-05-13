import {
  useCallback,
  useLayoutEffect,
  useRef,
  type RefCallback,
} from "react";
import { MenuPlacement } from "@/react/editor/types";
import {
  subscribeGlobalResize,
  subscribeGlobalScroll,
} from "@/shared/utils/subscribeGlobalViewport";

/** 编辑器浮层可使用的锚点。 */
export type EditorFloatingOverlayAnchor = DOMRect | HTMLElement;

/** 编辑器浮层横向对齐方式。 */
export type EditorFloatingOverlayHorizontalAlign = "start" | "end";

/** 编辑器浮层纵向定位模式。 */
export type EditorFloatingOverlayVerticalMode =
  | "outside"
  | "inside-top"
  | "inside-bottom";

/** 编辑器内容坐标系中的稳定锚点。 */
interface EditorFloatingOverlayContentAnchor {
  /** 锚点顶部内容坐标。 */
  anchorTop: number;
  /** 锚点底部内容坐标。 */
  anchorBottom: number;
  /** 锚点左侧内容坐标。 */
  anchorLeft: number;
  /** 锚点右侧内容坐标。 */
  anchorRight: number;
}

/** 编辑器浮层定位上下文。 */
export interface EditorFloatingOverlayPositionContext {
  /** 编辑器滚动容器。 */
  editorWrapper: HTMLDivElement;
  /** 锚点：DOM 节点保持动态测量，DOMRect 会转为内容坐标。 */
  anchor: HTMLElement | EditorFloatingOverlayContentAnchor;
  /** 菜单展开方向。 */
  placement: MenuPlacement;
  /** 默认展开方向。 */
  defaultPlacement: MenuPlacement;
  /** 是否锁定展开方向。 */
  lockPlacement: boolean;
  /** 横向对齐方式。 */
  horizontalAlign: EditorFloatingOverlayHorizontalAlign;
  /** 纵向定位模式。 */
  verticalMode: EditorFloatingOverlayVerticalMode;
  /** 横向偏移量。 */
  horizontalOffset: number;
  /** 纵向偏移量。 */
  verticalOffset: number;
  /** 浮层与编辑器边界的最小间距。 */
  boundaryInset: number;
  /** 是否把横向滚动量纳入内容坐标。 */
  trackScrollLeft: boolean;
  /** 首帧宽度兜底。 */
  fallbackWidth: number;
  /** 首帧高度兜底。 */
  fallbackHeight: number;
}

/** 创建编辑器浮层定位上下文的配置。 */
export interface CreateEditorFloatingOverlayPositionContextOptions {
  /** 编辑器滚动容器。 */
  editorWrapper: HTMLDivElement | null;
  /** 浮层锚点。 */
  anchor: EditorFloatingOverlayAnchor | null;
  /** 默认展开方向。 */
  defaultPlacement?: MenuPlacement;
  /** 触发翻转的高度阈值。 */
  placementThreshold?: number;
  /** 是否锁定展开方向。 */
  lockPlacement?: boolean;
  /** 横向对齐方式。 */
  horizontalAlign?: EditorFloatingOverlayHorizontalAlign;
  /** 纵向定位模式。 */
  verticalMode?: EditorFloatingOverlayVerticalMode;
  /** 横向偏移量。 */
  horizontalOffset?: number;
  /** 纵向偏移量。 */
  verticalOffset?: number;
  /** 浮层与编辑器边界的最小间距。 */
  boundaryInset?: number;
  /** 是否把横向滚动量纳入内容坐标。 */
  trackScrollLeft?: boolean;
  /** 首帧宽度兜底。 */
  fallbackWidth?: number;
  /** 首帧高度兜底。 */
  fallbackHeight?: number;
}

/** 编辑器浮层定位 Hook 配置。 */
interface UseEditorFloatingOverlayPositionOptions {
  /** 当前定位上下文。 */
  context: EditorFloatingOverlayPositionContext | null;
  /** 编辑器内 Portal 容器。 */
  portalContainer?: HTMLDivElement | null;
  /** 是否启用定位监听。 */
  enabled: boolean;
}

// 默认展开方向：优先向下展开。
const DEFAULT_PLACEMENT = MenuPlacement.Bottom;

// 默认触发阈值：空间不足 240px 时切换向上展开。
const DEFAULT_PLACEMENT_THRESHOLD = 240;

/** 判断锚点是否为 DOM 节点。 */
function isHTMLElement(anchor: HTMLElement | EditorFloatingOverlayContentAnchor): anchor is HTMLElement {
  return anchor instanceof HTMLElement;
}

/** 将视口矩形转换为编辑器内容坐标锚点。 */
function toContentAnchor(
  rect: DOMRect,
  wrapperRect: DOMRect,
  scrollTop: number,
  scrollLeft: number,
): EditorFloatingOverlayContentAnchor {
  return {
    anchorTop: rect.top - wrapperRect.top + scrollTop,
    anchorBottom: rect.bottom - wrapperRect.top + scrollTop,
    anchorLeft: rect.left - wrapperRect.left + scrollLeft,
    anchorRight: rect.right - wrapperRect.left + scrollLeft,
  };
}

/** 计算浮层展开方向。 */
function resolvePlacement(
  defaultPlacement: MenuPlacement,
  rect: DOMRect,
  placementThreshold: number,
): MenuPlacement {
  // 当前视口高度。
  const viewportHeight =
    typeof window === "undefined" ? rect.bottom : window.innerHeight;
  // 锚点上方可用空间。
  const spaceAbove = rect.top;
  // 锚点下方可用空间。
  const spaceBelow = viewportHeight - rect.bottom;

  if (defaultPlacement === MenuPlacement.Top) {
    return spaceAbove < placementThreshold && spaceBelow > spaceAbove
      ? MenuPlacement.Bottom
      : MenuPlacement.Top;
  }

  return spaceBelow < placementThreshold && spaceAbove > spaceBelow
    ? MenuPlacement.Top
    : MenuPlacement.Bottom;
}

/** 创建稳定的编辑器浮层定位上下文。 */
export function createEditorFloatingOverlayPositionContext({
  editorWrapper,
  anchor,
  defaultPlacement = DEFAULT_PLACEMENT,
  placementThreshold = DEFAULT_PLACEMENT_THRESHOLD,
  lockPlacement = false,
  horizontalAlign = "start",
  verticalMode = "outside",
  horizontalOffset = 0,
  verticalOffset = 0,
  boundaryInset = 0,
  trackScrollLeft = false,
  fallbackWidth = 0,
  fallbackHeight = 0,
}: CreateEditorFloatingOverlayPositionContextOptions): EditorFloatingOverlayPositionContext | null {
  if (!editorWrapper || !anchor) return null;

  // 编辑器滚动容器视口矩形。
  const wrapperRect = editorWrapper.getBoundingClientRect();
  // 水平滚动量默认不参与换算，仅在显式开启时纳入。
  const scrollLeft = trackScrollLeft ? editorWrapper.scrollLeft : 0;
  // 锚点视口矩形。
  const rect =
    anchor instanceof HTMLElement ? anchor.getBoundingClientRect() : anchor;

  return {
    editorWrapper,
    anchor:
      anchor instanceof HTMLElement
        ? anchor
        : toContentAnchor(rect, wrapperRect, editorWrapper.scrollTop, scrollLeft),
    placement: resolvePlacement(defaultPlacement, rect, placementThreshold),
    defaultPlacement,
    lockPlacement,
    horizontalAlign,
    verticalMode,
    horizontalOffset,
    verticalOffset,
    boundaryInset,
    trackScrollLeft,
    fallbackWidth,
    fallbackHeight,
  };
}

/** 获取当前锚点内容坐标。 */
function resolveContentAnchor(
  context: EditorFloatingOverlayPositionContext,
): EditorFloatingOverlayContentAnchor {
  if (!isHTMLElement(context.anchor)) return context.anchor;

  // 编辑器滚动容器。
  const wrapper = context.editorWrapper;
  // 编辑器滚动容器视口矩形。
  const wrapperRect = wrapper.getBoundingClientRect();
  // 水平滚动量默认不参与换算，仅在显式开启时纳入。
  const scrollLeft = context.trackScrollLeft ? wrapper.scrollLeft : 0;

  return toContentAnchor(
    context.anchor.getBoundingClientRect(),
    wrapperRect,
    wrapper.scrollTop,
    scrollLeft,
  );
}

/** 解析浮层在内容坐标与视口坐标中的位置。 */
function resolveOverlayCoordinates(
  context: EditorFloatingOverlayPositionContext,
  overlay: HTMLDivElement,
) {
  // 编辑器滚动容器。
  const wrapper = context.editorWrapper;
  // 编辑器滚动容器视口矩形。
  const wrapperRect = wrapper.getBoundingClientRect();
  // 当前锚点内容坐标。
  const anchor = resolveContentAnchor(context);
  // 浮层宽度。
  const overlayWidth = overlay.offsetWidth || context.fallbackWidth;
  // 浮层高度。
  const overlayHeight = overlay.offsetHeight || context.fallbackHeight;
  // 水平滚动量默认不参与换算，仅在显式开启时纳入。
  const scrollLeft = context.trackScrollLeft ? wrapper.scrollLeft : 0;
  // 横向最小内容坐标。
  const minLeft = scrollLeft + context.boundaryInset;
  // 横向最大内容坐标。
  const maxLeft =
    scrollLeft + wrapper.clientWidth - overlayWidth - context.boundaryInset;
  // 未裁切的横向内容坐标。
  const nextLeft =
    context.horizontalAlign === "end"
      ? anchor.anchorRight - overlayWidth - context.horizontalOffset
      : anchor.anchorLeft + context.horizontalOffset;
  // 裁切后的横向内容坐标。
  const clampedLeft = Math.min(
    Math.max(nextLeft, minLeft),
    Math.max(minLeft, maxLeft),
  );
  // 锚点顶部在当前视口中的位置。
  const anchorViewportTop =
    wrapperRect.top + anchor.anchorTop - wrapper.scrollTop;
  // 锚点底部在当前视口中的位置。
  const anchorViewportBottom =
    wrapperRect.top + anchor.anchorBottom - wrapper.scrollTop;
  // 当前展开方向。
  const placement = context.lockPlacement
    ? context.placement
    : resolvePlacement(
        context.defaultPlacement,
        new DOMRect(
          0,
          anchorViewportTop,
          1,
          anchorViewportBottom - anchorViewportTop,
        ),
        overlayHeight || DEFAULT_PLACEMENT_THRESHOLD,
      );
  // 未裁切的纵向内容坐标。
  const nextTop =
    context.verticalMode === "inside-top"
      ? anchor.anchorTop + context.verticalOffset
      : context.verticalMode === "inside-bottom"
        ? anchor.anchorBottom - overlayHeight - context.verticalOffset
        : placement === MenuPlacement.Top
          ? anchor.anchorTop - context.verticalOffset
          : anchor.anchorBottom + context.verticalOffset;
  // 裁切后的纵向内容坐标。
  const clampedTop = Math.max(nextTop, context.boundaryInset);

  return {
    contentTop: clampedTop,
    contentLeft: clampedLeft,
    viewportTop: wrapperRect.top + clampedTop - wrapper.scrollTop,
    viewportLeft: wrapperRect.left + clampedLeft - wrapper.scrollLeft,
    placement,
  };
}

/** 将视口坐标转换为 Portal 容器内坐标。 */
function resolvePortalCoordinates(
  coordinates: ReturnType<typeof resolveOverlayCoordinates>,
  portalContainer: HTMLDivElement | null | undefined,
) {
  if (!portalContainer) {
    return {
      left: coordinates.contentLeft,
      top: coordinates.contentTop,
    };
  }

  // Portal 容器视口矩形。
  const portalRect = portalContainer.getBoundingClientRect();

  return {
    left: coordinates.viewportLeft - portalRect.left,
    top: coordinates.viewportTop - portalRect.top,
  };
}

/** 创建 RAF 节流调度器。 */
function createRafScheduler(update: () => void) {
  // 当前等待执行的 RAF id。
  let rafId = 0;

  /** 请求下一帧刷新。 */
  const schedule = () => {
    if (typeof window === "undefined") return;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      update();
    });
  };

  /** 取消尚未执行的刷新。 */
  const cancel = () => {
    if (typeof window === "undefined" || !rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  };

  return {
    schedule,
    cancel,
  };
}

/** 编辑器浮层命令式定位：直接写入浮层 DOM 坐标。 */
export function useEditorFloatingOverlayPosition({
  context,
  portalContainer,
  enabled,
}: UseEditorFloatingOverlayPositionOptions) {
  // 浮层 DOM 节点。
  const overlayRefValue = useRef<HTMLDivElement | null>(null);
  // 最新定位上下文。
  const contextRef = useRef<EditorFloatingOverlayPositionContext | null>(
    context,
  );
  // 最新 Portal 容器。
  const portalContainerRef = useRef<HTMLDivElement | null | undefined>(
    portalContainer,
  );

  /** 按最新上下文立即刷新浮层位置。 */
  const updatePosition = useCallback(() => {
    // 浮层节点。
    const overlay = overlayRefValue.current;
    // 当前定位上下文。
    const currentContext = contextRef.current;
    if (!enabled || !overlay || !currentContext) return;

    // 浮层坐标。
    const coordinates = resolveOverlayCoordinates(currentContext, overlay);
    // Portal 内坐标或原地内容坐标。
    const overlayPosition = resolvePortalCoordinates(
      coordinates,
      portalContainerRef.current,
    );

    overlay.style.position = "absolute";
    overlay.style.left = `${overlayPosition.left}px`;
    overlay.style.top = `${overlayPosition.top}px`;
    overlay.style.transform =
      coordinates.placement === MenuPlacement.Top ? "translateY(-100%)" : "";
    overlay.style.visibility = "visible";
  }, [enabled]);

  /** 同步浮层节点引用。 */
  const overlayRef: RefCallback<HTMLDivElement> = useCallback(
    (node) => {
      overlayRefValue.current = node;
      if (!node) return;
      node.style.visibility = "hidden";
      updatePosition();
    },
    [updatePosition],
  );

  /** 清空定位上下文并隐藏浮层。 */
  const clearPosition = useCallback(() => {
    contextRef.current = null;
    if (overlayRefValue.current) {
      overlayRefValue.current.style.visibility = "hidden";
    }
  }, []);

  useLayoutEffect(() => {
    contextRef.current = context;
    portalContainerRef.current = portalContainer;
    updatePosition();
  }, [context, portalContainer, updatePosition]);

  useLayoutEffect(() => {
    if (!enabled || !context) return;
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // RAF 调度器。
    const scheduler = createRafScheduler(updatePosition);
    // 编辑器滚动容器。
    const wrapper = context.editorWrapper;
    /** 请求浮层重定位。 */
    const handleReposition = () => scheduler.schedule();

    // 分别订阅全局 scroll 与 resize。
    const unsubscribeGlobalScroll = subscribeGlobalScroll(handleReposition);
    const unsubscribeGlobalResize = subscribeGlobalResize(handleReposition);
    wrapper.addEventListener("scroll", handleReposition, { passive: true });
    scheduler.schedule();

    return () => {
      scheduler.cancel();
      unsubscribeGlobalScroll();
      unsubscribeGlobalResize();
      wrapper.removeEventListener("scroll", handleReposition);
    };
  }, [context, enabled, updatePosition]);

  return {
    overlayRef,
    updatePosition,
    clearPosition,
  };
}
