import { useState, useCallback } from "react";
import { defaultCommands } from "../components/TiptapEditor/extensions/SlashCommands";
import { MenuPlacement } from "../components/TiptapEditor/types";

interface UseCommandMenuOptions {
  editorWrapperRef: React.RefObject<HTMLDivElement | null>;
  commandMenuMaxHeight: number;
}

export function useCommandMenu({
  editorWrapperRef,
  commandMenuMaxHeight,
}: UseCommandMenuOptions) {
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    placement: MenuPlacement;
  } | null>(null);

  const handleStart = useCallback(() => {
    setShowCommandMenu(true);
    setCommandQuery("");
  }, []);

  const handleUpdate = useCallback((query: string) => {
    setCommandQuery(query);
  }, []);

  const handleIndexChange = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleClientRect = useCallback(
    (rect: DOMRect | null) => {
      if (rect && editorWrapperRef.current) {
        const wrapper = editorWrapperRef.current;
        const wrapperRect = wrapper.getBoundingClientRect();
        const spaceBelow = wrapperRect.bottom - rect.bottom;
        const placement: MenuPlacement =
          spaceBelow < commandMenuMaxHeight
            ? MenuPlacement.Top
            : MenuPlacement.Bottom;
        const cursorTopInWrapper =
          rect.top - wrapperRect.top + wrapper.scrollTop;
        const cursorBottomInWrapper =
          rect.bottom - wrapperRect.top + wrapper.scrollTop;
        setMenuPosition({
          top:
            placement === "bottom"
              ? cursorBottomInWrapper + 4
              : cursorTopInWrapper - 4,
          left: rect.left - wrapperRect.left,
          placement,
        });
      }
    },
    [commandMenuMaxHeight, editorWrapperRef]
  );

  const handleExit = useCallback(() => {
    setShowCommandMenu(false);
    setMenuPosition(null);
  }, []);

  const filteredCommands = defaultCommands.filter((item) =>
    item.title.toLowerCase().includes(commandQuery.toLowerCase())
  );

  return {
    showCommandMenu,
    setShowCommandMenu,
    menuPosition,
    selectedIndex,
    filteredCommands,
    handleStart,
    handleUpdate,
    handleIndexChange,
    handleClientRect,
    handleExit,
  };
}
