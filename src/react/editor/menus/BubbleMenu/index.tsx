import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
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
import { useEditorCommands } from "@/react/hooks";
import ColorPicker from "@/react/editor/toolbar/ColorPicker";
import type { EditorLocale } from "@/shared/locales";
import "./BubbleMenu.css";

interface BubbleMenuProps {
  editor: Editor;
  locale: EditorLocale;
}

const BubbleMenu = ({ editor, locale }: BubbleMenuProps) => {
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
    const current = (editor.getAttributes("textStyle").color ?? "").trim().toLowerCase();
    if (current && color.trim().toLowerCase() === current) {
      format.unsetColor();
    } else {
      format.setColor(color);
    }
    setShowColorPicker(null);
  };

  const onHighlightColorSelect = (color: string) => {
    if (color === "") {
      format.unsetHighlight();
    } else {
      const current = (editor.getAttributes("highlight").color ?? "").trim().toLowerCase();
      if (current === color.trim().toLowerCase()) {
        format.unsetHighlight();
      } else {
        format.setHighlight(color);
      }
    }
    setShowColorPicker(null);
  };

  if (!editor) {
    return null;
  }

  return (
    <>
      <TiptapBubbleMenu
        editor={editor}
        className="bubble-menu"
        shouldShow={({ state }) => {
          const { selection } = state;
          // NodeSelection（图片、公式、整个表格节点等）不显示
          if (selection instanceof NodeSelection) return false;
          // CellSelection（表格多单元格选中）不显示，$anchorCell 是 CellSelection 的专有属性
          if ('$anchorCell' in selection) return false;
          // 代码块内不显示气泡菜单（NotionLike 模式下避免与代码语言菜单重叠）
          if (editor.isActive("codeBlock")) return false;
          return !selection.empty;
        }}
      >
        <button
          onClick={() => format.toggleBold()}
          className={editor.isActive("bold") ? "is-active" : ""}
          title={locale.bubbleMenu.bold}
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => format.toggleItalic()}
          className={editor.isActive("italic") ? "is-active" : ""}
          title={locale.bubbleMenu.italic}
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => format.toggleUnderline()}
          className={editor.isActive("underline") ? "is-active" : ""}
          title={locale.bubbleMenu.underline}
        >
          <Underline size={16} />
        </button>
        <button
          onClick={() => format.toggleStrike()}
          className={editor.isActive("strike") ? "is-active" : ""}
          title={locale.bubbleMenu.strikethrough}
        >
          <Strikethrough size={16} />
        </button>
        <button
          onClick={() => format.toggleCode()}
          className={editor.isActive("code") ? "is-active" : ""}
          title={locale.bubbleMenu.inlineCode}
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
          title={locale.bubbleMenu.highlight}
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
          className={editor.getAttributes("textStyle").color ? "is-active" : ""}
          title={locale.bubbleMenu.textColor}
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
          title={locale.bubbleMenu.more}
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
              selectedColor={
                showColorPicker === "text"
                  ? editor.getAttributes("textStyle").color
                  : editor.getAttributes("highlight").color
              }
              onColorSelect={
                showColorPicker === "text"
                  ? onTextColorSelect
                  : onHighlightColorSelect
              }
              locale={locale}
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
              title={locale.bubbleMenu.superscript}
            >
              <Superscript size={16} />
            </button>
            <button
              onClick={() => {
                format.toggleSubscript();
                setShowMoreMenu(false);
              }}
              className={editor.isActive("subscript") ? "is-active" : ""}
              title={locale.bubbleMenu.subscript}
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
              title={locale.bubbleMenu.alignLeft}
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
              title={locale.bubbleMenu.alignCenter}
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
              title={locale.bubbleMenu.alignRight}
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
              title={locale.bubbleMenu.justify}
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
