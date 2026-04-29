import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Editor } from "@tiptap/react";
import {
  CheckIcon,
  ClipboardIcon,
  Loader2Icon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react";
import type { EditorLocale } from "@/shared/locales";
import { useEditorOverlayPosition } from "@/react/hooks/useEditorOverlayPosition";

// 代码块操作栏与代码块边缘的默认内边距。
const CODE_BLOCK_ACTION_BAR_INSET = 8;

// 两按钮代码块操作栏首帧定位宽度。
const CODE_BLOCK_ACTION_BAR_WIDTH = 64;

// 三按钮代码块操作栏首帧定位宽度。
const CODE_BLOCK_ACTION_BAR_WITH_FORMAT_WIDTH = 96;

// 代码块操作栏首帧定位高度。
const CODE_BLOCK_ACTION_BAR_HEIGHT = 28;

interface HoveredCodeBlock {
  pos: number;
  dom: HTMLElement;
}

interface CodeBlockActionBarProps {
  editor: Editor;
  locale: EditorLocale;
  editorWrapperRef: RefObject<HTMLDivElement | null>;
  defaultLanguage: string;
  onCodeBlockFormat?: (payload: {
    code: string;
    language: string;
  }) => string | Promise<string>;
}

/** 通过代码块 DOM 查找对应的 ProseMirror 节点位置。 */
function findCodeBlockByElement(
  editor: Editor,
  element: HTMLElement,
): HoveredCodeBlock | null {
  let result: HoveredCodeBlock | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "codeBlock") return true;
    const dom = editor.view.nodeDOM(pos);
    if (dom !== element) return false;
    result = { pos, dom: element };
    return false;
  });
  return result;
}

/** 替换指定代码块的纯文本内容。 */
function updateCodeBlockText(editor: Editor, codeBlockPos: number, code: string) {
  const node = editor.state.doc.nodeAt(codeBlockPos);
  if (!node || node.type.name !== "codeBlock") return;
  const from = codeBlockPos + 1;
  const to = codeBlockPos + node.nodeSize - 1;
  const transaction = editor.state.tr.insertText(code, from, to);
  editor.view.dispatch(transaction.scrollIntoView());
}

/** 代码块右上角悬浮操作栏。 */
export default function CodeBlockActionBar({
  editor,
  locale,
  editorWrapperRef,
  defaultLanguage,
  onCodeBlockFormat,
}: CodeBlockActionBarProps) {
  // 当前鼠标悬浮的代码块。
  const [hoveredCodeBlock, setHoveredCodeBlock] =
    useState<HoveredCodeBlock | null>(null);
  // 代码格式化进行中状态。
  const [isFormattingCode, setIsFormattingCode] = useState(false);
  // 代码复制成功状态。
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  // 复制成功状态恢复定时器。
  const copyResetTimerRef = useRef<number | null>(null);
  // 统一复用编辑器内浮层定位逻辑。
  const { position, overlayRef, updatePosition, clearPosition } =
    useEditorOverlayPosition({
      editorWrapperRef,
      lockPlacement: true,
      horizontalAlign: "end",
      verticalMode: "inside-top",
      horizontalOffset: CODE_BLOCK_ACTION_BAR_INSET,
      verticalOffset: CODE_BLOCK_ACTION_BAR_INSET,
      boundaryInset: CODE_BLOCK_ACTION_BAR_INSET,
    });
  // 是否展示格式化操作。
  const showFormatAction = typeof onCodeBlockFormat === "function";
  // 当前操作栏首帧定位宽度。
  const actionBarWidth = showFormatAction
    ? CODE_BLOCK_ACTION_BAR_WITH_FORMAT_WIDTH
    : CODE_BLOCK_ACTION_BAR_WIDTH;

  /** 清理复制成功状态恢复定时器。 */
  const clearCopyResetTimer = useCallback(() => {
    if (copyResetTimerRef.current == null) return;
    window.clearTimeout(copyResetTimerRef.current);
    copyResetTimerRef.current = null;
  }, []);

  /** 清空复制成功状态。 */
  const resetCopiedState = useCallback(() => {
    clearCopyResetTimer();
    setHasCopiedCode(false);
  }, [clearCopyResetTimer]);

  /** 清空当前悬浮代码块与操作栏位置。 */
  const clearHoveredCodeBlock = useCallback(() => {
    setHoveredCodeBlock(null);
    setIsFormattingCode(false);
    resetCopiedState();
    clearPosition();
  }, [clearPosition, resetCopiedState]);

  /** 根据鼠标事件目标同步当前悬浮代码块。 */
  const updateHoveredCodeBlock = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        clearHoveredCodeBlock();
        return;
      }
      if (target.closest(".code-block-action-bar")) return;
      const pre = target.closest(".ProseMirror pre");
      if (!(pre instanceof HTMLElement)) {
        clearHoveredCodeBlock();
        return;
      }
      const next = findCodeBlockByElement(editor, pre);
      if (!next) {
        clearHoveredCodeBlock();
        return;
      }
      setHoveredCodeBlock((prev) => {
        if (prev?.pos === next.pos) return prev;
        resetCopiedState();
        return next;
      });
      updatePosition(next.dom, {
        fallbackWidth: actionBarWidth,
        fallbackHeight: CODE_BLOCK_ACTION_BAR_HEIGHT,
      });
    },
    [
      actionBarWidth,
      clearHoveredCodeBlock,
      editor,
      resetCopiedState,
      updatePosition,
    ],
  );

  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    /** 鼠标移动时检测是否悬浮在代码块或操作栏上。 */
    const handleMouseMove = (event: MouseEvent) => {
      updateHoveredCodeBlock(event.target);
    };

    wrapper.addEventListener("mousemove", handleMouseMove);
    wrapper.addEventListener("mouseleave", clearHoveredCodeBlock);
    return () => {
      wrapper.removeEventListener("mousemove", handleMouseMove);
      wrapper.removeEventListener("mouseleave", clearHoveredCodeBlock);
    };
  }, [clearHoveredCodeBlock, editorWrapperRef, updateHoveredCodeBlock]);

  useEffect(() => {
    /** 编辑器内容变化后确认悬浮代码块仍然有效。 */
    const handleTransaction = () => {
      if (!hoveredCodeBlock) return;
      const node = editor.state.doc.nodeAt(hoveredCodeBlock.pos);
      const dom = editor.view.nodeDOM(hoveredCodeBlock.pos);
      if (
        !node ||
        node.type.name !== "codeBlock" ||
        dom !== hoveredCodeBlock.dom
      ) {
        clearHoveredCodeBlock();
        return;
      }
      updatePosition(hoveredCodeBlock.dom, {
        fallbackWidth: actionBarWidth,
        fallbackHeight: CODE_BLOCK_ACTION_BAR_HEIGHT,
      });
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [
    actionBarWidth,
    clearHoveredCodeBlock,
    editor,
    hoveredCodeBlock,
    updatePosition,
  ]);

  useEffect(() => {
    return () => {
      clearCopyResetTimer();
    };
  }, [clearCopyResetTimer]);

  if (!hoveredCodeBlock || !position) return null;

  /** 复制当前悬浮代码块内容。 */
  const handleCopyCodeBlock = () => {
    const node = editor.state.doc.nodeAt(hoveredCodeBlock.pos);
    if (!node || node.type.name !== "codeBlock") return;
    void navigator.clipboard?.writeText(node.textContent).then(() => {
      clearCopyResetTimer();
      setHasCopiedCode(true);
      copyResetTimerRef.current = window.setTimeout(() => {
        setHasCopiedCode(false);
        copyResetTimerRef.current = null;
      }, 1500);
    });
  };

  /** 删除当前悬浮代码块。 */
  const handleDeleteCodeBlock = () => {
    editor
      .chain()
      .focus()
      .setNodeSelection(hoveredCodeBlock.pos)
      .deleteSelection()
      .run();
    resetCopiedState();
    clearHoveredCodeBlock();
  };

  /** 格式化当前悬浮代码块。 */
  const handleFormatCodeBlock = () => {
    if (!onCodeBlockFormat || isFormattingCode) return;
    const node = editor.state.doc.nodeAt(hoveredCodeBlock.pos);
    if (!node || node.type.name !== "codeBlock") return;
    const language =
      typeof node.attrs.language === "string" && node.attrs.language.trim()
        ? node.attrs.language
        : defaultLanguage;
    // 外部格式化回调返回值。
    let result: string | Promise<string>;
    try {
      result = onCodeBlockFormat({ code: node.textContent, language });
    } catch {
      return;
    }
    if (typeof result === "string") {
      editor.commands.focus();
      updateCodeBlockText(editor, hoveredCodeBlock.pos, result);
      return;
    }
    if (typeof result?.then !== "function") return;
    setIsFormattingCode(true);
    void Promise.resolve(result)
      .then((nextCode) => {
        if (typeof nextCode !== "string") return;
        editor.commands.focus();
        updateCodeBlockText(editor, hoveredCodeBlock.pos, nextCode);
      })
      .catch(() => {
        // 格式化失败时保持当前代码不变。
      })
      .finally(() => {
        setIsFormattingCode(false);
      });
  };

  return (
    <div
      className="code-block-action-bar"
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 45,
      }}
      ref={overlayRef}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
    >
      <button
        type="button"
        className="code-block-control-action-btn"
        aria-label={
          hasCopiedCode ? locale.codeBlock.copiedCode : locale.codeBlock.copyCode
        }
        title={
          hasCopiedCode ? locale.codeBlock.copiedCode : locale.codeBlock.copyCode
        }
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleCopyCodeBlock();
        }}
      >
        {hasCopiedCode ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <ClipboardIcon className="size-3.5" />
        )}
      </button>
      {showFormatAction ? (
        <button
          type="button"
          className="code-block-control-action-btn"
          aria-label={locale.codeBlock.formatCode}
          title={locale.codeBlock.formatCode}
          disabled={isFormattingCode}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleFormatCodeBlock();
          }}
        >
          {isFormattingCode ? (
            <Loader2Icon className="size-3.5 code-block-action-spin" />
          ) : (
            <WandSparklesIcon className="size-3.5" />
          )}
        </button>
      ) : null}
      <button
        type="button"
        className="code-block-control-action-btn"
        aria-label={locale.codeBlock.delete}
        title={locale.codeBlock.delete}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleDeleteCodeBlock();
        }}
      >
        <Trash2Icon className="size-3.5" />
      </button>
    </div>
  );
}
