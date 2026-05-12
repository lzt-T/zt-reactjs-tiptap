import { useCallback, useState } from "react";

/** 表格操作按钮在 Portal 容器中的定位信息。 */
export interface TableActionPortalPosition {
  top: number;
  left: number;
}

/** 表格行/列操作通用 Portal 与菜单状态。 */
export function useTableActionsPositioning<TPortalPos extends TableActionPortalPosition>() {
  // 行/列菜单是否打开。
  const [menuOpen, setMenuOpen] = useState(false);
  // Portal 目标容器（scroll wrapper 或 table wrapper）。
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  // Portal 下按钮坐标。
  const [portalButtonPosition, setPortalButtonPosition] = useState<TPortalPos | null>(null);

  /** 关闭菜单并清空目标引用。 */
  const closeMenu = useCallback((onClose?: () => void) => {
    setMenuOpen(false);
    onClose?.();
  }, []);

  /** Popover 开关统一处理，关闭时清空目标引用。 */
  const handleMenuOpenChange = useCallback((open: boolean, onClose?: () => void) => {
    setMenuOpen(open);
    if (!open) {
      onClose?.();
    }
  }, []);

  /** 清理 Portal 相关状态。 */
  const clearPortalState = useCallback(() => {
    setPortalTarget(null);
    setPortalButtonPosition(null);
  }, []);

  return {
    menuOpen,
    setMenuOpen,
    portalTarget,
    setPortalTarget,
    portalButtonPosition,
    setPortalButtonPosition,
    closeMenu,
    handleMenuOpenChange,
    clearPortalState,
  };
}

/** 确保表格滚动容器存在 actions wrapper 并返回可挂载目标。 */
export function ensureTableActionsWrapper(
  table: HTMLTableElement | undefined,
): HTMLDivElement | null {
  if (!table) return null;
  const tableWrapper = table.closest?.(".tableWrapper") as HTMLDivElement | null;
  if (!tableWrapper) return null;

  let scrollWrapper = table.parentElement as HTMLDivElement | null;
  if (scrollWrapper?.getAttribute("data-table-actions-wrapper") !== "true") {
    scrollWrapper = document.createElement("div");
    scrollWrapper.setAttribute("data-table-actions-wrapper", "true");
    tableWrapper.insertBefore(scrollWrapper, table);
    scrollWrapper.appendChild(table);
  }
  return scrollWrapper;
}

/** 返回行/列按钮的 Portal 挂载目标。 */
export function resolveTableActionsPortalTarget(
  table: HTMLTableElement | undefined,
): HTMLDivElement | null {
  if (!table) return null;
  if (table.parentElement?.getAttribute("data-table-actions-wrapper") === "true") {
    return table.parentElement as HTMLDivElement;
  }
  return (table.closest?.(".tableWrapper") as HTMLDivElement | null) ?? null;
}
