import { Node } from "@tiptap/core";
import type { RawCommands } from "@tiptap/core";
import { mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import type { EditorLocale } from "@/shared/locales";
import enUS from "@/shared/locales/en-US";
import { clampImageWidthPercent, normalizeImageAlign, parseImageWidthPercent } from "./imageAttributes";

type VideoResizeSide = "left" | "right";
type VideoAlign = "left" | "center" | "right";

interface VideoResizeState {
  startX: number;
  startWidthPercent: number;
  containerWidth: number;
  side: VideoResizeSide;
}

interface VideoOptions {
  locale: EditorLocale;
}

/** 视频节点属性。 */
export interface VideoAttributes {
  src: string;
  title?: string | null;
  width?: number | null;
  align?: VideoAlign | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (attrs: VideoAttributes) => ReturnType;
    };
  }
}

/** 渲染视频节点并提供右上角删除按钮。 */
function VideoNodeView({
  node,
  deleteNode,
  editor,
  selected,
  extension,
  updateAttributes,
}: NodeViewProps) {
  /** 当前视频节点属性。 */
  const { src, title, width, align = "left" } = node.attrs as VideoAttributes;
  /** 视频节点文案。 */
  const videoNodeLocale = (extension.options as { locale: EditorLocale }).locale.videoNode;
  /** 视频节点外层容器。 */
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  /** 拖拽过程中的瞬时数据。 */
  const resizeStateRef = useRef<VideoResizeState | null>(null);
  /** 拖拽过程中的最新宽度。 */
  const resizeWidthRef = useRef<number | null>(null);
  /** 拖拽中的临时宽度百分比。 */
  const [dragWidthPercent, setDragWidthPercent] = useState<number | null>(null);
  /** 当前节点保存的宽度百分比。 */
  const nodeWidthPercent = parseImageWidthPercent(width);
  /** 实际渲染用的宽度百分比。 */
  const videoWidthPercent = dragWidthPercent ?? nodeWidthPercent;
  /** 当前视频节点实际使用的对齐方式。 */
  const videoAlign = normalizeImageAlign(align);
  /** 可编辑时才显示缩放控件。 */
  const canResize = editor.isEditable;
  /** wrapper 样式：宽度与对齐。 */
  const wrapperStyle: CSSProperties = {
    marginLeft: videoAlign === "center" || videoAlign === "right" ? "auto" : 0,
    marginRight: videoAlign === "center" || videoAlign === "left" ? "auto" : 0,
    ...(videoWidthPercent == null ? {} : { width: `${videoWidthPercent}%` }),
  };
  /** video 样式：有百分比宽度时铺满 wrapper。 */
  const videoStyle: CSSProperties = {
    ...(videoWidthPercent == null ? {} : { width: "100%" }),
  };

  /** 根据鼠标位置更新拖拽中的视频宽度。 */
  const handleResizeMove = (event: MouseEvent) => {
    // 当前拖拽状态。
    const resizeState = resizeStateRef.current;
    if (!resizeState) return;

    // 左右手柄对应相反的宽度变化方向。
    const direction = resizeState.side === "right" ? 1 : -1;
    // 鼠标偏移换算出的宽度百分比变化量。
    const deltaPercent = ((event.clientX - resizeState.startX) / resizeState.containerWidth) * 100;
    // 下一帧显示的视频宽度百分比。
    const nextWidthPercent = clampImageWidthPercent(
      resizeState.startWidthPercent + deltaPercent * direction
    );

    resizeWidthRef.current = nextWidthPercent;
    setDragWidthPercent(nextWidthPercent);
  };

  /** 结束拖拽并把百分比宽度写回视频节点。 */
  const handleResizeEnd = () => {
    // 拖拽结束时需要提交的最终宽度。
    const nextWidthPercent = resizeWidthRef.current;

    window.removeEventListener("mousemove", handleResizeMove);
    window.removeEventListener("mouseup", handleResizeEnd);
    resizeStateRef.current = null;
    resizeWidthRef.current = null;

    if (nextWidthPercent == null) return;

    // 写入文档的整数百分比，避免 HTML 属性带过长小数。
    const committedWidthPercent = Math.round(nextWidthPercent);
    setDragWidthPercent(null);
    updateAttributes({ width: committedWidthPercent });
  };

  /** 开始按百分比拖拽调整视频宽度。 */
  const handleResizeStart = (side: VideoResizeSide, event: ReactMouseEvent<HTMLButtonElement>) => {
    // 视频外层节点。
    const wrapper = wrapperRef.current;
    // 视频宽度百分比的参照容器。
    const container = wrapper?.parentElement;
    if (!wrapper || !container) return;

    event.preventDefault();
    event.stopPropagation();

    // 当前参照容器宽度。
    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;

    // 当前视频宽度百分比，未保存过时按实际渲染宽度计算。
    const currentWidthPercent =
      videoWidthPercent ??
      clampImageWidthPercent((wrapper.getBoundingClientRect().width / containerWidth) * 100);

    resizeStateRef.current = {
      startX: event.clientX,
      startWidthPercent: currentWidthPercent,
      containerWidth,
      side,
    };
    resizeWidthRef.current = currentWidthPercent;
    setDragWidthPercent(currentWidthPercent);

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);
  };

  /** 更新视频水平对齐方式。 */
  const handleAlignChange = (
    nextAlign: VideoAlign,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    updateAttributes({ align: nextAlign });
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={dragWidthPercent == null ? "video-node-wrapper" : "video-node-wrapper is-resizing"}
      style={wrapperStyle}
      contentEditable={false}
      data-drag-handle
    >
      <video
        src={src}
        title={title ?? ""}
        controls
        className={selected ? "video-selected" : ""}
        style={videoStyle}
      />
      {canResize && (
        <>
          <button
            type="button"
            className="video-resize-handle video-resize-handle-left"
            aria-label={videoNodeLocale.resizeLeft}
            onMouseDown={(event) => handleResizeStart("left", event)}
          />
          <button
            type="button"
            className="video-resize-handle video-resize-handle-right"
            aria-label={videoNodeLocale.resizeRight}
            onMouseDown={(event) => handleResizeStart("right", event)}
          />
        </>
      )}
      {editor.isEditable && selected && (
        <div className="video-align-menu" aria-label={videoNodeLocale.alignMenu}>
          <button
            type="button"
            className={videoAlign === "left" ? "video-align-menu-btn is-active" : "video-align-menu-btn"}
            aria-label={videoNodeLocale.alignLeft}
            title={videoNodeLocale.alignLeft}
            onMouseDown={(event) => handleAlignChange("left", event)}
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className={videoAlign === "center" ? "video-align-menu-btn is-active" : "video-align-menu-btn"}
            aria-label={videoNodeLocale.alignCenter}
            title={videoNodeLocale.alignCenter}
            onMouseDown={(event) => handleAlignChange("center", event)}
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            className={videoAlign === "right" ? "video-align-menu-btn is-active" : "video-align-menu-btn"}
            aria-label={videoNodeLocale.alignRight}
            title={videoNodeLocale.alignRight}
            onMouseDown={(event) => handleAlignChange("right", event)}
          >
            <AlignRight size={16} />
          </button>
        </div>
      )}
      {editor.isEditable && (
        <button
          type="button"
          className="video-delete-btn"
          aria-label={videoNodeLocale.deleteVideo}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            deleteNode();
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </NodeViewWrapper>
  );
}

/** 最小视频节点扩展：插入并渲染原生 video 标签。 */
export const Video = Node.create<VideoOptions>({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  /** 扩展视频配置，补充节点视图所需文案。 */
  addOptions() {
    return {
      locale: enUS,
    };
  },

  addAttributes() {
    return {
      src: {
        default: "",
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element) => parseImageWidthPercent(element.getAttribute("width")),
        renderHTML: (attributes) => {
          if (typeof attributes.width !== "number") {
            return {};
          }

          return { width: Math.round(clampImageWidthPercent(attributes.width)) };
        },
      },
      align: {
        default: "left",
        parseHTML: (element) => normalizeImageAlign(element.getAttribute("align")),
        renderHTML: (attributes) => ({ align: normalizeImageAlign(attributes.align) }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, { controls: "true" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },

  addCommands(): Partial<RawCommands> {
    return {
      setVideo:
        (attrs: VideoAttributes) =>
        ({
          commands,
        }: {
          commands: { insertContent: (content: unknown) => boolean };
        }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              src: attrs.src,
              title: attrs.title ?? null,
            },
          }),
    } as Partial<RawCommands>;
  },
});
