import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { HeadlessToolbarMode } from "@/react/editor/types";

interface UseHeadlessFocusControllerOptions {
  editor: Editor | null;
  isNotionLike: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  headlessToolbarMode: HeadlessToolbarMode;
  isInsideCodeBlockLanguageSelect: (target: EventTarget | null) => boolean;
  onInlineMathClick: (node: ProseMirrorNode, pos: number) => void;
  onBlockMathClick: (node: ProseMirrorNode, pos: number) => void;
}

/**
 * Headless 模式聚焦控制：统一处理 focus/blur、菜单门控与公式点击补触发。
 */
export function useHeadlessFocusController({
  editor,
  isNotionLike,
  containerRef,
  headlessToolbarMode,
  isInsideCodeBlockLanguageSelect,
  onInlineMathClick,
  onBlockMathClick,
}: UseHeadlessFocusControllerOptions) {
  // 编辑器聚焦状态。
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  // 编辑器聚焦稳定状态（focus 后下一帧才置为 true，避免首帧抖动）。
  const [isEditorFocusStable, setIsEditorFocusStable] = useState(false);
  // mousedown 是否发生在容器内部。
  const mouseDownInsideRef = useRef(false);
  // focus 稳定化 requestAnimationFrame id。
  const focusStableRafIdRef = useRef<number | null>(null);
  // 编辑器聚焦状态引用，供事件回调读取最新值。
  const isEditorFocusedRef = useRef(false);
  // 当前焦点周期内是否已完成 blur 收口，避免重复触发。
  const hasBlurFinalizedRef = useRef(false);
  // 未聚焦点击公式时缓存待处理元素。
  const pendingMathClickRef = useRef<{
    el: Element;
    isBlock: boolean;
  } | null>(null);
  // 代码语言菜单根节点引用。
  const codeBlockLanguageMenuRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isEditorFocusedRef.current = isEditorFocused;
    console.log("Editor focus state changed:", isEditorFocused);
  }, [isEditorFocused]);

  /** 保存代码语言菜单根节点，用于 blur 命中判断。 */
  const setCodeBlockLanguageMenuRoot = useCallback(
    (node: HTMLDivElement | null) => {
      codeBlockLanguageMenuRootRef.current = node;
    },
    [],
  );

  /** 判断事件目标是否命中代码语言菜单区域。 */
  const isInsideLanguageMenu = useCallback(
    (target: EventTarget | null) => {
      if (isInsideCodeBlockLanguageSelect(target)) return true;
      if (!(target instanceof Element)) return false;
      return Boolean(codeBlockLanguageMenuRootRef.current?.contains(target));
    },
    [isInsideCodeBlockLanguageSelect],
  );

  /** 统一 blur 收口：同步焦点状态、清理可见选区并触发 TipTap blur。 */
  const finalizeBlurIfNeeded = useCallback(
    (editorFocused: boolean) => {
      if (!editor || editorFocused || hasBlurFinalizedRef.current) return;
      if (isInsideLanguageMenu(document.activeElement)) return;
      hasBlurFinalizedRef.current = true;
      // 失焦时清空范围选区：将非空选区折叠到原选区起点。
      const selection = editor.state.selection;
      if (!selection.empty) {
        // 以 from 为锚点折叠，保证失焦后再次聚焦不恢复原范围选中。
        const collapsedSelection = Selection.near(
          editor.state.doc.resolve(selection.from),
          1,
        );
        // 派发一次事务同步新的折叠选区。
        const tr = editor.state.tr.setSelection(collapsedSelection);
        editor.view.dispatch(tr);
      }
      // 清除浏览器可见选区高亮，避免原生蓝色选中残留。
      window.getSelection()?.removeAllRanges();
      setIsEditorFocused(false);
      setIsEditorFocusStable(false);
      editor.commands.blur();
    },
    [editor, isInsideLanguageMenu],
  );

  /** 代码语言菜单关闭后延迟校验聚焦状态，必要时同步清空聚焦态。 */
  const syncFocusStateAfterMenuClose = useCallback(
    (editorFocused: boolean) => {
      finalizeBlurIfNeeded(editorFocused);
    },
    [finalizeBlurIfNeeded],
  );

  /** 判定事件目标是否位于编辑器容器内。 */
  const isInsideEditorContainer = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      return Boolean(containerRef.current?.contains(target));
    },
    [containerRef],
  );

  /** 弹层关闭且焦点在容器外时，执行统一 blur 收口。 */
  const finalizeBlurFromOverlayClose = useCallback(() => {
    finalizeBlurIfNeeded(editor?.isFocused ?? false);
  }, [editor, finalizeBlurIfNeeded]);

  useEffect(() => {
    if (!editor) return;

    /** 处理容器内点击，保护 blur 链路并记录公式节点。 */
    const handleMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current?.contains(event.target as Node) ||
        isInsideLanguageMenu(event.target)
      ) {
        mouseDownInsideRef.current = true;
        setTimeout(() => {
          mouseDownInsideRef.current = false;
        }, 300);

        if (!isEditorFocusedRef.current) {
          const mathEl = (event.target as Element).closest(
            ".tiptap-mathematics-render",
          );
          if (mathEl) {
            pendingMathClickRef.current = {
              el: mathEl,
              isBlock: mathEl.getAttribute("data-type") === "block-math",
            };
          }
        }
      }
    };

    /** 聚焦后补触发未聚焦点击公式事件。 */
    const onFocus = () => {
      hasBlurFinalizedRef.current = false;
      setIsEditorFocused(true);
      if (focusStableRafIdRef.current != null) {
        cancelAnimationFrame(focusStableRafIdRef.current);
      }
      focusStableRafIdRef.current = setTimeout(() => {
        setIsEditorFocusStable(true);
        focusStableRafIdRef.current = null;
      }, 80);
      const pending = pendingMathClickRef.current;
      if (!pending) return;
      pendingMathClickRef.current = null;
      requestAnimationFrame(() => {
        try {
          const pos = editor.view.posAtDOM(pending.el, 0);
          const node = editor.state.doc.nodeAt(pos);
          if (!node) return;
          if (pending.isBlock) {
            onBlockMathClick(node, pos);
          } else {
            onInlineMathClick(node, pos);
          }
        } catch {
          // 元素可能已被移除，忽略即可。
        }
      });
    };

    /** 失焦后按点击位置决定是否保留聚焦态。 */
    const onBlur = () => {
      if (focusStableRafIdRef.current != null) {
        cancelAnimationFrame(focusStableRafIdRef.current);
        focusStableRafIdRef.current = null;
      }
      if (mouseDownInsideRef.current) return;
      requestAnimationFrame(() => {
        if (
          (!containerRef.current?.contains(document.activeElement) ||
            !editor.isFocused) &&
          !isInsideLanguageMenu(document.activeElement)
        ) {
          finalizeBlurIfNeeded(editor.isFocused);
        }
      });
    };

    document.addEventListener("mousedown", handleMouseDown);
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      if (focusStableRafIdRef.current != null) {
        cancelAnimationFrame(focusStableRafIdRef.current);
        focusStableRafIdRef.current = null;
      }
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
    };
  }, [
    containerRef,
    editor,
    isInsideLanguageMenu,
    isNotionLike,
    onBlockMathClick,
    onInlineMathClick,
    finalizeBlurIfNeeded,
  ]);

  // Headless 模式工具栏显示开关。
  const showHeadlessToolbar =
    !isNotionLike &&
    (headlessToolbarMode === HeadlessToolbarMode.Always ||
      (headlessToolbarMode === HeadlessToolbarMode.OnFocus && isEditorFocused));

  // 代码语言菜单显示开关。
  const showCodeBlockLanguageMenu = isEditorFocused && isEditorFocusStable;

  return {
    isEditorFocused,
    isEditorFocusStable,
    showHeadlessToolbar,
    showCodeBlockLanguageMenu,
    setCodeBlockLanguageMenuRoot,
    syncFocusStateAfterMenuClose,
    isInsideEditorContainer,
    finalizeBlurFromOverlayClose,
  };
}
