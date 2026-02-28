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

    const roots = new Set<ReturnType<typeof createRoot>>();

    const injectDeleteButtons = () => {
      const wrapper = editorWrapperRef.current;
      if (!wrapper) return;
      const blockMathNodes = wrapper.querySelectorAll<HTMLElement>(
        BLOCK_MATH_SELECTOR
      );
      blockMathNodes.forEach((el) => {
        if (el.querySelector(`.${DELETE_BTN_WRAPPER_CLASS}`)) return;
        const container = document.createElement("div");
        container.className = DELETE_BTN_WRAPPER_CLASS;
        el.appendChild(container);

        const root = createRoot(container);
        roots.add(root);

        root.render(
          <DeleteButton
            onDelete={() => {
              const pos = editor.view.posAtDOM(el, 0);
              editor.chain().setNodeSelection(pos).deleteSelection().run();
              roots.delete(root);
              root.unmount();
            }}
          />
        );
      });
    };

    const onUpdate = () => {
      requestAnimationFrame(injectDeleteButtons);
    };
    editor.on("update", onUpdate);
    onUpdate();

    return () => {
      editor.off("update", onUpdate);
      roots.forEach((r) => {
        r.unmount();
      });
      roots.clear();
    };
  }, [editor, disabled, editorWrapperRef]);
}
