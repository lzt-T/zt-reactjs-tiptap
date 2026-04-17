import { useCallback, useState } from "react";

/**
 * 管理编辑器容器内 Portal 挂载点。
 */
export function useEditorThemePortalState() {
  // Dialog/Select 等浮层在编辑器内的挂载容器。
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

  /** 回调 ref：在挂载/卸载时同步 Portal 容器节点。 */
  const handlePortalContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      setPortalContainer(node);
    },
    [],
  );

  return {
    portalContainer,
    handlePortalContainerRef,
  };
}
