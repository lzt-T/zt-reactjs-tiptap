import { useState, useCallback } from "react";
import type { CommandItem } from "@/core/extensions/SlashCommands";
import {
  createEditorFloatingOverlayPositionContext,
  type EditorFloatingOverlayPositionContext,
} from "@/react/hooks/useEditorFloatingOverlayPosition";

interface UseCommandMenuOptions {
  editorWrapperRef: React.RefObject<HTMLDivElement | null>;
  commandMenuMaxHeight: number;
}

/** 斜杠命令菜单状态管理：命令项、选中项与编辑器内定位。 */
export function useCommandMenu({
  editorWrapperRef,
  commandMenuMaxHeight,
}: UseCommandMenuOptions) {
  // 是否展示斜杠命令菜单。
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  // 当前 Suggestion 返回的最终命令项。
  const [commandItems, setCommandItems] = useState<CommandItem[]>([]);
  // 当前键盘高亮的命令索引。
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Slash 菜单命令式定位上下文。
  const [menuPositionContext, setMenuPositionContext] =
    useState<EditorFloatingOverlayPositionContext | null>(null);

  /** 打开命令菜单。 */
  const handleStart = useCallback(() => {
    setShowCommandMenu(true);
  }, []);

  /** 同步 Suggestion 已过滤和禁用处理后的命令项。 */
  const handleUpdate = useCallback((_query: string, items?: CommandItem[]) => {
    if (items) {
      setCommandItems(items);
    }
  }, []);

  /** 同步当前高亮命令的索引。 */
  const handleIndexChange = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  /** 根据 suggestion 提供的锚点矩形重算菜单位置。 */
  const handleClientRect = useCallback(
    (rect: DOMRect | null) => {
      setMenuPositionContext(
        createEditorFloatingOverlayPositionContext({
          editorWrapper: editorWrapperRef.current,
          anchor: rect,
          placementThreshold: commandMenuMaxHeight,
          verticalOffset: 4,
          boundaryInset: 0,
        }),
      );
    },
    [commandMenuMaxHeight, editorWrapperRef],
  );

  /** 关闭命令菜单并清空其定位信息。 */
  const handleExit = useCallback(() => {
    setShowCommandMenu(false);
    setMenuPositionContext(null);
  }, []);

  return {
    showCommandMenu,
    setShowCommandMenu,
    menuPositionContext,
    selectedIndex,
    commandItems,
    handleStart,
    handleUpdate,
    handleIndexChange,
    handleClientRect,
    handleExit,
  };
}
