import { useState, useCallback } from "react";
import type { CommandItem } from "@/core/extensions/SlashCommands";
import { useEditorOverlayPosition } from "@/react/hooks/useEditorOverlayPosition";

interface UseCommandMenuOptions {
  editorWrapperRef: React.RefObject<HTMLDivElement | null>;
  commandMenuMaxHeight: number;
  commands: CommandItem[];
}

/** 斜杠命令菜单状态管理：过滤、选中项与编辑器内定位。 */
export function useCommandMenu({
  editorWrapperRef,
  commandMenuMaxHeight,
  commands,
}: UseCommandMenuOptions) {
  // 是否展示斜杠命令菜单。
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  // 当前 slash 查询字符串。
  const [commandQuery, setCommandQuery] = useState("");
  // 当前键盘高亮的命令索引。
  const [selectedIndex, setSelectedIndex] = useState(0);
  // 统一复用编辑器内浮层定位逻辑。
  const {
    position: menuPosition,
    overlayRef,
    updatePosition,
    clearPosition,
  } = useEditorOverlayPosition({
    editorWrapperRef,
    placementThreshold: commandMenuMaxHeight,
    verticalOffset: 4,
  });

  /** 打开命令菜单并重置查询词。 */
  const handleStart = useCallback(() => {
    setShowCommandMenu(true);
    setCommandQuery("");
  }, []);

  /** 同步 slash 查询词。 */
  const handleUpdate = useCallback((query: string) => {
    setCommandQuery(query);
  }, []);

  /** 同步当前高亮命令的索引。 */
  const handleIndexChange = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  /** 根据 suggestion 提供的锚点矩形重算菜单位置。 */
  const handleClientRect = useCallback(
    (rect: DOMRect | null) => {
      updatePosition(rect);
    },
    [updatePosition],
  );

  /** 关闭命令菜单并清空其定位信息。 */
  const handleExit = useCallback(() => {
    setShowCommandMenu(false);
    clearPosition();
  }, [clearPosition]);

  // 根据查询词过滤可展示的命令项。
  const filteredCommands = commands.filter((item) =>
    item.title.toLowerCase().includes(commandQuery.toLowerCase())
  );

  return {
    showCommandMenu,
    setShowCommandMenu,
    menuPosition,
    menuOverlayRef: overlayRef,
    selectedIndex,
    filteredCommands,
    handleStart,
    handleUpdate,
    handleIndexChange,
    handleClientRect,
    handleExit,
  };
}
