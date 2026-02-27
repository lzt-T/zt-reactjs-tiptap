import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { useFloating, flip, shift, offset } from "@floating-ui/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Palette,
  MoreHorizontal,
  Superscript,
  Subscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { useEditorCommands } from "@/hooks";
import ColorPicker from "../ColorPicker";
import "./BubbleMenu.css";

interface BubbleMenuProps {
  editor: Editor;
}

const BubbleMenu = ({ editor }: BubbleMenuProps) => {
  const [showColorPicker, setShowColorPicker] = useState<
    "text" | "highlight" | null
  >(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isMoreMenuReady, setIsMoreMenuReady] = useState(false);

  // 使用 Floating UI 处理颜色选择器定位
  const { refs, floatingStyles } = useFloating({
    open: showColorPicker !== null,
    placement: "bottom",
    middleware: [
      offset(8), // 距离按钮 8px
      flip({ padding: 16 }), // 自动翻转避免溢出
      shift({ padding: 16 }), // 保持在视口内
    ],
  });

  // 使用 Floating UI 处理"更多"菜单定位
  const { refs: moreRefs, floatingStyles: moreFloatingStyles } = useFloating({
    open: showMoreMenu,
    placement: "bottom",
    middleware: [offset(8), flip({ padding: 16 }), shift({ padding: 16 })],
  });

  // useEffect 必须在条件语句之前调用
  useEffect(() => {
    if (showColorPicker) {
      setIsReady(false);
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [showColorPicker]);

  useEffect(() => {
    if (showMoreMenu) {
      setIsMoreMenuReady(false);
      const timer = setTimeout(() => {
        setIsMoreMenuReady(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsMoreMenuReady(false);
    }
  }, [showMoreMenu]);

  const { format } = useEditorCommands(editor, {});

  const onTextColorSelect = (color: string) => {
    format.setColor(color);
    setShowColorPicker(null);
  };

  const onHighlightColorSelect = (color: string) => {
    if (color === "") format.unsetHighlight();
    else format.setHighlight(color);
    setShowColorPicker(null);
  };

  if (!editor) {
    return null;
  }

  return (
    <>
      <TiptapBubbleMenu editor={editor} className="bubble-menu">
        <button
          onClick={() => format.toggleBold()}
          className={editor.isActive("bold") ? "is-active" : ""}
          title="粗体 (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => format.toggleItalic()}
          className={editor.isActive("italic") ? "is-active" : ""}
          title="斜体 (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => format.toggleUnderline()}
          className={editor.isActive("underline") ? "is-active" : ""}
          title="下划线 (Ctrl+U)"
        >
          <Underline size={16} />
        </button>
        <button
          onClick={() => format.toggleStrike()}
          className={editor.isActive("strike") ? "is-active" : ""}
          title="删除线"
        >
          <Strikethrough size={16} />
        </button>
        <button
          onClick={() => format.toggleCode()}
          className={editor.isActive("code") ? "is-active" : ""}
          title="行内代码"
        >
          <Code size={16} />
        </button>
        <span className="separator" />
        {/* 官方是免费的 */}
        <button
          ref={(el) => {
            if (showColorPicker === "highlight") {
              refs.setReference(el);
            }
          }}
          onClick={() =>
            setShowColorPicker(
              showColorPicker === "highlight" ? null : "highlight"
            )
          }
          className={editor.isActive("highlight") ? "is-active" : ""}
          title="高亮颜色"
        >
          <Highlighter size={16} />
        </button>
        {/* 官方的需要钱 */}
        <button
          ref={(el) => {
            if (showColorPicker === "text") {
              refs.setReference(el);
            }
          }}
          onClick={() =>
            setShowColorPicker(showColorPicker === "text" ? null : "text")
          }
          title="文字颜色"
        >
          <Palette size={16} />
        </button>
        <span className="separator" />
        <button
          ref={(el) => {
            if (showMoreMenu) {
              moreRefs.setReference(el);
            }
          }}
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={showMoreMenu ? "is-active" : ""}
          title="更多"
        >
          <MoreHorizontal size={16} />
        </button>
      </TiptapBubbleMenu>

      {showColorPicker && (
        <>
          <div
            className="color-picker-overlay"
            onClick={() => setShowColorPicker(null)}
          />
          <div
            // eslint-disable-next-line
            ref={refs.setFloating}
            className="color-picker-container"
            style={{
              ...floatingStyles,
              opacity: isReady ? 1 : 0,
              transition: "opacity 0.1s ease",
            }}
          >
            <ColorPicker
              type={showColorPicker}
              onColorSelect={
                showColorPicker === "text"
                  ? onTextColorSelect
                  : onHighlightColorSelect
              }
            />
          </div>
        </>
      )}

      {showMoreMenu && (
        <>
          <div
            className="more-menu-overlay"
            onClick={() => setShowMoreMenu(false)}
          />
          <div
            // eslint-disable-next-line
            ref={moreRefs.setFloating}
            className="more-menu"
            style={{
              ...moreFloatingStyles,
              opacity: isMoreMenuReady ? 1 : 0,
              transition: "opacity 0.1s ease",
            }}
          >
            <button
              onClick={() => {
                format.toggleSuperscript();
                setShowMoreMenu(false);
              }}
              className={editor.isActive("superscript") ? "is-active" : ""}
              title="上标"
            >
              <Superscript size={16} />
            </button>
            <button
              onClick={() => {
                format.toggleSubscript();
                setShowMoreMenu(false);
              }}
              className={editor.isActive("subscript") ? "is-active" : ""}
              title="下标"
            >
              <Subscript size={16} />
            </button>
            <div className="more-menu-separator" />
            <button
              onClick={() => {
                format.setTextAlign("left");
                setShowMoreMenu(false);
              }}
              className={
                editor.isActive({ textAlign: "left" }) ? "is-active" : ""
              }
              title="左对齐"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => {
                format.setTextAlign("center");
                setShowMoreMenu(false);
              }}
              className={
                editor.isActive({ textAlign: "center" }) ? "is-active" : ""
              }
              title="居中对齐"
            >
              <AlignCenter size={16} />
            </button>
            <button
              onClick={() => {
                format.setTextAlign("right");
                setShowMoreMenu(false);
              }}
              className={
                editor.isActive({ textAlign: "right" }) ? "is-active" : ""
              }
              title="右对齐"
            >
              <AlignRight size={16} />
            </button>
            <button
              onClick={() => {
                format.setTextAlign("justify");
                setShowMoreMenu(false);
              }}
              className={
                editor.isActive({ textAlign: "justify" }) ? "is-active" : ""
              }
              title="两端对齐"
            >
              <AlignJustify size={16} />
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default BubbleMenu;
