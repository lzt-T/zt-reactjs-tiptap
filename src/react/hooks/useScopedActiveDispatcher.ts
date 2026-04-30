import { useCallback } from "react";

export type ScopedActiveExitDelay = "raf" | "sync";

interface UseScopedActiveDispatcherOptions {
  isActive: boolean;
  setActive: (active: boolean) => void;
  onExitInside?: () => void;
  onExitOutside?: () => void;
  isInsideContainer?: (target: EventTarget | null) => boolean;
  exitDelay?: ScopedActiveExitDelay;
}

/**
 * 通用激活态退出分发：退出时按 activeElement 是否命中容器分流后续行为。
 */
export function useScopedActiveDispatcher({
  isActive,
  setActive,
  onExitInside,
  onExitOutside,
  isInsideContainer,
  exitDelay = "raf",
}: UseScopedActiveDispatcherOptions) {
  /** 执行一次退出激活态后的焦点分流。 */
  const runExitDispatch = useCallback(() => {
    // 当前激活元素：用于判定是否仍在业务容器内。
    const activeElement =
      typeof document !== "undefined" ? document.activeElement : null;
    // 是否命中调用方定义的容器。
    const isInside = isInsideContainer?.(activeElement) ?? false;
    if (isInside) {
      onExitInside?.();
      return;
    }
    onExitOutside?.();
  }, [isInsideContainer, onExitInside, onExitOutside]);

  /** 对外统一 active 变化入口。 */
  const handleActiveChange = useCallback(
    (nextActive: boolean) => {
      if (nextActive) {
        setActive(true);
        return;
      }
      if (!isActive) return;
      setActive(false);
      if (exitDelay === "sync") {
        runExitDispatch();
        return;
      }
      requestAnimationFrame(() => {
        runExitDispatch();
      });
    },
    [exitDelay, isActive, runExitDispatch, setActive],
  );

  return { handleActiveChange };
}
