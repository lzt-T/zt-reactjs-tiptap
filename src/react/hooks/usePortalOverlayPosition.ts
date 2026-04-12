import { useCallback, useEffect, useRef, useState } from "react";

/** 视口坐标：用于 fixed + portal 浮层定位。 */
export interface PortalOverlayViewportPosition {
  top: number;
  left: number;
}

/** 通用 portal 浮层定位 Hook 配置。 */
export interface UsePortalOverlayPositionOptions {
  editorWrapperRef: React.RefObject<HTMLDivElement | null>;
  position: { top: number; left: number };
  enabled?: boolean;
}

/** 将编辑器内容坐标换算为视口坐标。 */
function resolveViewportPosition(
  wrapper: HTMLDivElement | null,
  position: { top: number; left: number },
): PortalOverlayViewportPosition | null {
  if (!wrapper) return null;

  const wrapperRect = wrapper.getBoundingClientRect();
  return {
    top: wrapperRect.top + position.top - wrapper.scrollTop,
    left: wrapperRect.left + position.left - wrapper.scrollLeft,
  };
}

/** fixed + portal 浮层定位：支持内外滚动统一跟随。 */
export function usePortalOverlayPosition({
  editorWrapperRef,
  position,
  enabled = true,
}: UsePortalOverlayPositionOptions) {
  // 当前编辑器滚动容器节点（用于依赖追踪，处理 ref 节点切换）。
  const wrapperElement = editorWrapperRef.current;
  // 动画帧 ID：合并高频滚动/缩放重算请求。
  const rafIdRef = useRef<number | null>(null);
  // 计算出的视口坐标。
  const [viewportPosition, setViewportPosition] =
    useState<PortalOverlayViewportPosition | null>(null);

  /** 立即同步一次定位。 */
  const syncNow = useCallback(() => {
    if (!enabled) {
      setViewportPosition(null);
      return;
    }
    const next = resolveViewportPosition(wrapperElement, position);
    setViewportPosition((prev) => {
      if (!next) return null;
      if (prev && prev.top === next.top && prev.left === next.left) return prev;
      return next;
    });
  }, [enabled, position.left, position.top, wrapperElement]);

  /** 通过 RAF 节流触发定位同步。 */
  const scheduleSync = useCallback(() => {
    if (typeof window === "undefined") return;

    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      syncNow();
    });
  }, [syncNow]);

  useEffect(() => {
    scheduleSync();
  }, [scheduleSync]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const handleRecalc = () => scheduleSync();
    window.addEventListener("resize", handleRecalc);
    document.addEventListener("scroll", handleRecalc, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("resize", handleRecalc);
      document.removeEventListener("scroll", handleRecalc, true);
    };
  }, [enabled, scheduleSync]);

  useEffect(
    () => () => {
      if (typeof window === "undefined" || rafIdRef.current === null) return;
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    },
    [],
  );

  return {
    viewportPosition,
    scheduleSync,
    syncNow,
  };
}

