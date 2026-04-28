import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import { Trash2, ImageOff } from "lucide-react";
import { useState } from "react";

/** 渲染带删除按钮的图片节点视图，并处理加载态与失败态。 */
function ImageView({ node, deleteNode, editor, selected }: NodeViewProps) {
  const { src, alt, title } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
  };
  /** 记录加载失败的 src，仅当当前 src 与之一致时显示错误占位。 */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  /** 记录最后一次加载成功的 src，用于避免 effect 中同步 setState。 */
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loadError = failedSrc === src;
  const loaded = loadedSrc === src;

  /** 图片成功加载后更新当前 src 的完成状态。 */
  const handleLoad = () => {
    setLoadedSrc(src);
    setFailedSrc(null);
  };

  /** 图片加载失败后记录失败 src，显示错误占位。 */
  const handleError = () => {
    setFailedSrc(src);
    setLoadedSrc(null);
  };

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
      data-drag-handle
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
          {!loaded && <div className="image-loading-placeholder" aria-hidden />}
          <img
            src={src}
            alt={alt ?? ""}
            title={title ?? ""}
            className={selected ? "image-selected" : ""}
            // 禁用原生 img 拖拽，避免浏览器按“复制资源”语义处理。
            draggable={false}
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
