import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  type AriaRole,
} from "react";
import { createPortal } from "react-dom";
import { MenuPlacement } from "@/react/editor/types";
import {
  createEditorFloatingOverlayPositionContext,
  useEditorFloatingOverlayPosition,
  type EditorFloatingOverlayHorizontalAlign,
  type EditorFloatingOverlayPlacementBoundary,
  type EditorFloatingOverlayPositionContext,
} from "./useEditorFloatingOverlayPosition";

/** 浮层 Portal 面板 Hook 参数。 */
export interface UseFloatingPortalPanelOptions {
  /** 面板是否打开。 */
  open: boolean;
  /** 面板 Portal 容器。 */
  portalContainer?: HTMLDivElement | null;
  /** 编辑器滚动容器。 */
  editorWrapper?: HTMLDivElement | null;
  /** 默认展开方向。 */
  defaultPlacement?: MenuPlacement;
  /** 展开方向可用空间边界。 */
  placementBoundary?: EditorFloatingOverlayPlacementBoundary;
  /** 是否锁定展开方向。 */
  lockPlacement?: boolean;
  /** 横向对齐方式。 */
  horizontalAlign?: EditorFloatingOverlayHorizontalAlign;
  /** 纵向偏移量。 */
  verticalOffset?: number;
  /** 首帧宽度兜底。 */
  fallbackWidth: number;
  /** 首帧高度兜底。 */
  fallbackHeight: number;
  /** 点击外部时触发。 */
  onOutside: () => void;
  /** 外部点击关闭时忽略的选择器。 */
  ignoreOutsideSelector?: string;
}

/** 浮层 Portal 面板状态。 */
export interface FloatingPortalPanelState {
  /** 触发按钮引用。 */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** 面板 DOM 引用。 */
  panelRef: RefObject<HTMLDivElement | null>;
  /** 当前定位上下文。 */
  positionContext: EditorFloatingOverlayPositionContext | null;
  /** 同步面板 DOM 并接入定位 Hook。 */
  handlePanelRef: (node: HTMLDivElement | null) => void;
  /** 按当前触发按钮刷新定位上下文。 */
  updatePosition: () => void;
}

/** 浮层 Portal 面板组件属性。 */
export interface FloatingPortalPanelProps {
  /** 面板状态。 */
  panel: FloatingPortalPanelState;
  /** 面板 Portal 容器。 */
  portalContainer?: HTMLDivElement | null;
  /** 面板 className。 */
  className?: string;
  /** 面板层级。 */
  zIndex?: number;
  /** 面板可访问性角色。 */
  role?: AriaRole;
  /** 鼠标按下处理器。 */
  onMouseDown?: (event: MouseEvent<HTMLDivElement>) => void;
  /** 面板内容。 */
  children: ReactNode;
}

/** 创建编辑器内容 Portal 浮层面板能力。 */
export function useFloatingPortalPanel({
  open,
  portalContainer,
  editorWrapper,
  defaultPlacement = MenuPlacement.Bottom,
  placementBoundary = "viewport",
  lockPlacement = false,
  horizontalAlign = "start",
  verticalOffset = 8,
  fallbackWidth,
  fallbackHeight,
  onOutside,
  ignoreOutsideSelector,
}: UseFloatingPortalPanelOptions): FloatingPortalPanelState {
  /** 浮层触发按钮。 */
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  /** 浮层面板 DOM。 */
  const panelRef = useRef<HTMLDivElement | null>(null);
  /** 浮层定位上下文。 */
  const [positionContext, setPositionContext] =
    useState<EditorFloatingOverlayPositionContext | null>(null);
  /** 浮层命令式定位能力。 */
  const { overlayRef, clearPosition } = useEditorFloatingOverlayPosition({
    context: positionContext,
    portalContainer,
    enabled: open && Boolean(positionContext),
  });

  /** 按当前触发按钮刷新浮层定位上下文。 */
  const updatePosition = useCallback(() => {
    // 编辑器滚动容器。
    const wrapper = editorWrapper;
    // 当前触发按钮。
    const anchor = triggerRef.current;
    if (!wrapper || !anchor) {
      setPositionContext(null);
      clearPosition();
      return;
    }

    setPositionContext(
      createEditorFloatingOverlayPositionContext({
        editorWrapper: wrapper,
        anchor,
        defaultPlacement,
        placementBoundary,
        lockPlacement,
        horizontalAlign,
        verticalMode: "outside",
        verticalOffset,
        fallbackWidth,
        fallbackHeight,
      }),
    );
  }, [
    clearPosition,
    defaultPlacement,
    editorWrapper,
    fallbackHeight,
    fallbackWidth,
    horizontalAlign,
    lockPlacement,
    placementBoundary,
    verticalOffset,
  ]);

  /** 同步浮层面板 DOM 引用到定位 Hook。 */
  const handlePanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      overlayRef(node);
    },
    [overlayRef],
  );

  useEffect(() => {
    if (!open) {
      setPositionContext(null);
      clearPosition();
      return;
    }
    updatePosition();
  }, [clearPosition, open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    /** 点击触发器与面板外部时关闭浮层。 */
    const handleDocumentMouseDown = (event: globalThis.MouseEvent) => {
      // 当前点击目标。
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      if (
        ignoreOutsideSelector &&
        target instanceof Element &&
        target.closest(ignoreOutsideSelector)
      ) {
        return;
      }
      onOutside();
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [ignoreOutsideSelector, onOutside, open]);

  return {
    triggerRef,
    panelRef,
    positionContext,
    handlePanelRef,
    updatePosition,
  };
}

/** 渲染编辑器内容 Portal 浮层面板。 */
export function FloatingPortalPanel({
  panel,
  portalContainer,
  className,
  zIndex = 45,
  role,
  onMouseDown,
  children,
}: FloatingPortalPanelProps) {
  if (!portalContainer || !panel.positionContext) return null;

  return createPortal(
    <div
      ref={panel.handlePanelRef}
      role={role}
      className={className}
      style={{
        position: "absolute",
        visibility: "hidden",
        zIndex,
      }}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>,
    portalContainer,
  );
}
