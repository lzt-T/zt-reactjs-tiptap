import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { useFloating, flip, shift, offset } from "@floating-ui/react";
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

  if (!editor) {
    return null;
  }

  const handleFormat = (formatAction: () => void) => {
    const { to } = editor.state.selection;
    formatAction();
    // 取消选中,将光标移到选中区域末尾
    editor.commands.setTextSelection(to);
  };

  const handleTextColorSelect = (color: string) => {
    handleFormat(() => editor.chain().focus().setColor(color).run());
    setShowColorPicker(null);
  };

  const handleHighlightColorSelect = (color: string) => {
    handleFormat(() => editor.chain().focus().setHighlight({ color }).run());
    setShowColorPicker(null);
  };

  return (
    <>
      <TiptapBubbleMenu editor={editor} className="bubble-menu">
        <button
          onClick={() =>
            handleFormat(() => editor.chain().focus().toggleBold().run())
          }
          className={editor.isActive("bold") ? "is-active" : ""}
          title="粗体 (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() =>
            handleFormat(() => editor.chain().focus().toggleItalic().run())
          }
          className={editor.isActive("italic") ? "is-active" : ""}
          title="斜体 (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          onClick={() =>
            handleFormat(() => editor.chain().focus().toggleUnderline().run())
          }
          className={editor.isActive("underline") ? "is-active" : ""}
          title="下划线 (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          onClick={() =>
            handleFormat(() => editor.chain().focus().toggleStrike().run())
          }
          className={editor.isActive("strike") ? "is-active" : ""}
          title="删除线"
        >
          <s>S</s>
        </button>
        <button
          onClick={() =>
            handleFormat(() => editor.chain().focus().toggleCode().run())
          }
          className={editor.isActive("code") ? "is-active" : ""}
          title="行内代码"
        >
          {"</>"}
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
          🖍️
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
          🎨
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="13" cy="8" r="1.5" />
          </svg>
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
                  ? handleTextColorSelect
                  : handleHighlightColorSelect
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
                handleFormat(() =>
                  editor.chain().focus().toggleSuperscript().run()
                );
                setShowMoreMenu(false);
              }}
              className={editor.isActive("superscript") ? "is-active" : ""}
            >
              <span className="more-menu-icon">x²</span>
              <span className="more-menu-label">上标</span>
            </button>
            <button
              onClick={() => {
                handleFormat(() =>
                  editor.chain().focus().toggleSubscript().run()
                );
                setShowMoreMenu(false);
              }}
              className={editor.isActive("subscript") ? "is-active" : ""}
            >
              <span className="more-menu-icon">x₂</span>
              <span className="more-menu-label">下标</span>
            </button>
            <div className="more-menu-separator" />
            <button
              onClick={() => {
                handleFormat(() =>
                  editor.chain().focus().setTextAlign("left").run()
                );
                setShowMoreMenu(false);
              }}
              className={
                editor.isActive({ textAlign: "left" }) ? "is-active" : ""
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 3h12v1H2V3zm0 3h8v1H2V6zm0 3h12v1H2V9zm0 3h8v1H2v-1z" />
              </svg>
              <span className="more-menu-label">左对齐</span>
            </button>
            <button
              onClick={() => {
                handleFormat(() =>
                  editor.chain().focus().setTextAlign("center").run()
                );
                setShowMoreMenu(false);
              }}
              className={
                editor.isActive({ textAlign: "center" }) ? "is-active" : ""
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 3h12v1H2V3zm2 3h8v1H4V6zm-2 3h12v1H2V9zm2 3h8v1H4v-1z" />
              </svg>
              <span className="more-menu-label">居中对齐</span>
            </button>
            <button
              onClick={() => {
                handleFormat(() =>
                  editor.chain().focus().setTextAlign("right").run()
                );
                setShowMoreMenu(false);
              }}
              className={
                editor.isActive({ textAlign: "right" }) ? "is-active" : ""
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 3h12v1H2V3zm4 3h8v1H6V6zm-4 3h12v1H2V9zm4 3h8v1H6v-1z" />
              </svg>
              <span className="more-menu-label">右对齐</span>
            </button>
            <button
              onClick={() => {
                handleFormat(() =>
                  editor.chain().focus().setTextAlign("justify").run()
                );
                setShowMoreMenu(false);
              }}
              className={
                editor.isActive({ textAlign: "justify" }) ? "is-active" : ""
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h12v1H2v-1z" />
              </svg>
              <span className="more-menu-label">两端对齐</span>
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default BubbleMenu;
