import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import { Trash2, ImageOff } from "lucide-react";
import { useState, useEffect } from "react";

function ImageView({ node, deleteNode, editor, selected }: NodeViewProps) {
  const { src, alt, title } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
  };
  /** 记录加载失败的 src，仅当当前 src 与之一致时显示错误占位（src 变更后自动不再显示错误） */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  /** 图片未加载完成前显示占位，避免先空白/错图再出图的闪烁 */
  const [loaded, setLoaded] = useState(false);
  const loadError = failedSrc === src;

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const handleLoad = () => setLoaded(true);
  const handleError = () => setFailedSrc(src);

  return (
    <NodeViewWrapper
      className={
        loadError
          ? "image-node-wrapper is-error"
          : loaded
            ? "image-node-wrapper"
            : "image-node-wrapper is-loading"
      }
      contentEditable={false}
    >
      {loadError ? (
        <div
          className={
            selected ? "image-error-placeholder image-selected" : "image-error-placeholder"
          }
        >
          <ImageOff size={32} />
          <span>图片加载失败</span>
        </div>
      ) : (
        <>
          {!loaded && (
            <div
              className="image-loading-placeholder"
              aria-hidden
            />
          )}
          <img
            src={src}
            alt={alt ?? ""}
            title={title ?? ""}
            className={selected ? "image-selected" : ""}
            onLoad={handleLoad}
            onError={handleError}
            style={{ opacity: loaded ? 1 : 0 }}
          />
        </>
      )}
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
