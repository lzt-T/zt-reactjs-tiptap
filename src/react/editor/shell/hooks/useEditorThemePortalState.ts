import { useCallback, useEffect, useState } from "react";

/**
 * 管理编辑器容器内 Portal 挂载点与全局 dark 状态同步。
 */
export function useEditorThemePortalState() {
  // Dialog/Select 等浮层在编辑器内的挂载容器。
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

  // 文档根节点是否处于 dark 模式。
  const [isDocumentDark, setIsDocumentDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  /** 回调 ref：在挂载/卸载时同步 Portal 容器节点。 */
  const handlePortalContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      setPortalContainer(node);
    },
    [],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    // 文档根节点。
    const root = document.documentElement;

    // 同步 html.dark 状态。
    const syncDarkState = () => {
      setIsDocumentDark(root.classList.contains("dark"));
    };

    syncDarkState();

    // 监听 class 变化以支持运行时主题切换。
    const observer = new MutationObserver(syncDarkState);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return {
    portalContainer,
    isDocumentDark,
    handlePortalContainerRef,
  };
}
