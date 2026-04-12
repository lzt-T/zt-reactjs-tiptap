import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Editor } from "@tiptap/react";

interface SlashMenuController {
  handleExit: () => void;
  handleStart: () => void;
  handleUpdate: (query: string) => void;
  handleClientRect: (rect: DOMRect | null) => void;
}

interface UseSlashMenuFocusSyncOptions {
  editor: Editor | null;
  isEditorFocused: boolean;
  isNotionLike: boolean;
  enabled: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  commandMenu: SlashMenuController;
}

/** 同步 slash 命令菜单与编辑器焦点状态，处理失焦收口与聚焦恢复。 */
export function useSlashMenuFocusSync({
  editor,
  isEditorFocused,
  isNotionLike,
  enabled,
  containerRef,
  commandMenu,
}: UseSlashMenuFocusSyncOptions) {
  // 记录上一次聚焦状态，用于识别焦点切换边沿。
  const prevEditorFocusedRef = useRef(isEditorFocused);
  // 延迟恢复 slash 菜单任务 id（timer + RAF），用于焦点切换时取消过期任务。
  const pendingSlashRestoreRef = useRef<{
    timer: number | null;
    raf: number | null;
  }>({ timer: null, raf: null });

  /** 取消尚未执行的 slash 恢复任务。 */
  const cancelPendingSlashRestore = useCallback(() => {
    const pending = pendingSlashRestoreRef.current;
    if (pending.timer != null) {
      clearTimeout(pending.timer);
      pending.timer = null;
    }
    if (pending.raf != null) {
      cancelAnimationFrame(pending.raf);
      pending.raf = null;
    }
  }, []);

  useEffect(() => {
    const wasFocused = prevEditorFocusedRef.current;
    const isFocused = isEditorFocused;

    cancelPendingSlashRestore();

    // 失焦下降沿：统一收口命令菜单，清理可见状态与定位缓存。
    if (wasFocused && !isFocused) {
      commandMenu.handleExit();
      prevEditorFocusedRef.current = isFocused;
      return;
    }

    // 聚焦上升沿：仅在 NotionLike 且光标紧跟裸 "/" 时恢复命令菜单。
    if (!wasFocused && isFocused && editor && isNotionLike && enabled) {
      const pending = pendingSlashRestoreRef.current;
      pending.timer = window.setTimeout(() => {
        pending.timer = null;
        pending.raf = requestAnimationFrame(() => {
          pending.raf = null;

          if (!editor.isFocused) return;
          if (!containerRef.current?.contains(document.activeElement)) return;

          const { from, to, empty } = editor.state.selection;
          if (!empty || from !== to || from <= 0) return;

          const currentChar = editor.state.doc.textBetween(
            from - 1,
            from,
            "\n",
            "\0",
          );
          if (currentChar !== "/") return;

          const charBeforeSlash =
            from > 1
              ? editor.state.doc.textBetween(from - 2, from - 1, "\n", "\0")
              : "";
          const isLineStartOrWhitespace =
            charBeforeSlash.length === 0 || /\s/.test(charBeforeSlash);
          if (!isLineStartOrWhitespace) return;

          try {
            const caretRect = editor.view.coordsAtPos(from);
            const rect = new DOMRect(
              caretRect.left,
              caretRect.top,
              Math.max(1, caretRect.right - caretRect.left),
              Math.max(1, caretRect.bottom - caretRect.top),
            );
            commandMenu.handleStart();
            commandMenu.handleUpdate("");
            commandMenu.handleClientRect(rect);
          } catch {
            // 光标定位失败时保持静默，避免影响正常输入。
          }
        });
      });
    }

    prevEditorFocusedRef.current = isFocused;
    return () => {
      cancelPendingSlashRestore();
    };
  }, [
    cancelPendingSlashRestore,
    commandMenu,
    containerRef,
    editor,
    enabled,
    isEditorFocused,
    isNotionLike,
  ]);
}
