import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Trash2 } from "lucide-react";
import type { Editor } from "@tiptap/react";

const BLOCK_MATH_SELECTOR =
  '.tiptap-mathematics-render[data-type="block-math"]';
const DELETE_BTN_WRAPPER_CLASS = "block-math-delete-btn-wrapper";

export interface UseBlockMathDeleteButtonOptions {
  editor: Editor | null;
  editorWrapperRef: React.RefObject<HTMLDivElement | null>;
  disabled: boolean;
}

interface DeleteButtonProps {
  onDelete: () => void;
}

function DeleteButton({ onDelete }: DeleteButtonProps) {
  return (
    <button
      type="button"
      className="block-math-delete-btn"
      aria-label="删除公式"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete();
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}

/**
 * 在块级公式上注入 hover 时显示的删除按钮，点击可删除该公式节点。
 */
export function useBlockMathDeleteButton({
  editor,
  editorWrapperRef,
  disabled,
}: UseBlockMathDeleteButtonOptions) {
  useEffect(() => {
    if (!editor || disabled || !editorWrapperRef.current) return;

    const roots = new Map<HTMLElement, ReturnType<typeof createRoot>>();

    const injectDeleteButtons = () => {
      const wrapper = editorWrapperRef.current;
      if (!wrapper) return;
      const blockMathNodes = wrapper.querySelectorAll<HTMLElement>(
        BLOCK_MATH_SELECTOR
      );
      const activeNodes = new Set<HTMLElement>(Array.from(blockMathNodes));

      roots.forEach((root, node) => {
        if (activeNodes.has(node)) return;
        root.unmount();
        roots.delete(node);
      });

      blockMathNodes.forEach((el) => {
        let container = el.querySelector<HTMLElement>(`.${DELETE_BTN_WRAPPER_CLASS}`);
        if (!container) {
          container = document.createElement("div");
          container.className = DELETE_BTN_WRAPPER_CLASS;
          el.appendChild(container);
        }
        let root = roots.get(el);
        if (!root) {
          root = createRoot(container);
          roots.set(el, root);
        }

        root.render(
          <DeleteButton
            onDelete={() => {
              let pos = -1;
              try {
                pos = editor.view.posAtDOM(el, 0);
              } catch {
                return;
              }
              if (pos < 0) return;
              editor.chain().setNodeSelection(pos).deleteSelection().run();
            }}
          />
        );
      });
    };

    const onUpdate = () => {
      requestAnimationFrame(injectDeleteButtons);
    };
    const observer = new MutationObserver(onUpdate);
    observer.observe(editorWrapperRef.current, { childList: true, subtree: true });

    editor.on("update", onUpdate);
    editor.on("transaction", onUpdate);
    onUpdate();

    return () => {
      observer.disconnect();
      editor.off("update", onUpdate);
      editor.off("transaction", onUpdate);
      const rootsToUnmount = Array.from(roots.values());
      roots.clear();
      queueMicrotask(() => {
        rootsToUnmount.forEach((root) => root.unmount());
      });
    };
  }, [editor, disabled, editorWrapperRef]);
}
