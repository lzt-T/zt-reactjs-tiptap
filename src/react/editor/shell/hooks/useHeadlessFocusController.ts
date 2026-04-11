import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
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
  // 未聚焦点击公式时缓存待处理元素。
  const pendingMathClickRef = useRef<{
    el: Element;
    isBlock: boolean;
  } | null>(null);
  // 代码语言菜单根节点引用。
  const codeBlockLanguageMenuRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isEditorFocusedRef.current = isEditorFocused;
    console.log(isEditorFocused);
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
          !containerRef.current?.contains(document.activeElement) &&
          !isInsideLanguageMenu(document.activeElement)
        ) {
          setIsEditorFocused(false);
          setIsEditorFocusStable(false);
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
  };
}
