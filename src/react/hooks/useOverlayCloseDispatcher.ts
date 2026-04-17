import { useCallback } from "react";

export type OverlayCloseDelay = "raf" | "sync";

interface UseOverlayCloseDispatcherOptions {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onCloseInside?: () => void;
  onCloseOutside?: () => void;
  isInsideContainer?: (target: EventTarget | null) => boolean;
  closeDelay?: OverlayCloseDelay;
}

/**
 * 通用弹层开关分发：关闭时按 activeElement 是否命中容器分流后续行为。
 */
export function useOverlayCloseDispatcher({
  isOpen,
  setOpen,
  onCloseInside,
  onCloseOutside,
  isInsideContainer,
  closeDelay = "raf",
}: UseOverlayCloseDispatcherOptions) {
  /** 执行一次关闭后的焦点分流。 */
  const runCloseDispatch = useCallback(() => {
    // 当前激活元素：用于判定是否仍在业务容器内。
    const activeElement =
      typeof document !== "undefined" ? document.activeElement : null;
    // 是否命中调用方定义的容器。
    const isInside = isInsideContainer?.(activeElement) ?? false;
    if (isInside) {
      onCloseInside?.();
      return;
    }
    onCloseOutside?.();
  }, [isInsideContainer, onCloseInside, onCloseOutside]);

  /** 对外统一 open 变化入口。 */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setOpen(true);
        return;
      }
      if (!isOpen) return;
      setOpen(false);
      if (closeDelay === "sync") {
        runCloseDispatch();
        return;
      }
      requestAnimationFrame(() => {
        runCloseDispatch();
      });
    },
    [closeDelay, isOpen, runCloseDispatch, setOpen],
  );

  return { handleOpenChange };
}
