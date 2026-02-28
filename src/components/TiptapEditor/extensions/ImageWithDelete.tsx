import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import { Trash2 } from "lucide-react";

function ImageView({ node, deleteNode, editor, selected }: NodeViewProps) {
  const { src, alt, title } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
  };

  return (
    <NodeViewWrapper className="image-node-wrapper" contentEditable={false}>
      <img
        src={src}
        alt={alt ?? ""}
        title={title ?? ""}
        className={selected ? "image-selected" : ""}
      />
      {editor.isEditable && (
        <button
          type="button"
          className="image-delete-btn"
          aria-label="删除图片"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteNode();
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </NodeViewWrapper>
  );
}

export const ImageWithDelete = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});
