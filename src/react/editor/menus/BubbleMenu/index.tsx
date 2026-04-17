import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useState, type MouseEvent } from "react";
import { config, type ColorOption } from "@/shared/config";
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
import { useEditorCommands, useOverlayCloseDispatcher } from "@/react/hooks";
import ColorPopoverPicker from "@/react/editor/toolbar/ColorPopoverPicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/react/components/ui/popover";
import type { EditorLocale } from "@/shared/locales";
import "./BubbleMenu.css";

interface BubbleMenuProps {
  editor: Editor;
  locale: EditorLocale;
  textColorOptions: ColorOption[];
  highlightColorOptions: ColorOption[];
  portalContainer?: HTMLElement | null;
  isInsideOverlayContainer?: (target: EventTarget | null) => boolean;
  onOverlayCloseOutside?: () => void;
}

/** 判断 mousedown 事件是否来自 BubbleMenu 的颜色面板内容。 */
function isFromColorPopoverContent(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(".color-picker"));
}

const BubbleMenu = ({
  editor,
  locale,
  textColorOptions = config.TEXT_COLORS,
  highlightColorOptions = config.HIGHLIGHT_COLORS,
  portalContainer,
  isInsideOverlayContainer,
  onOverlayCloseOutside,
}: BubbleMenuProps) => {
  const [showColorPicker, setShowColorPicker] = useState<
    "text" | "highlight" | null
  >(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const { format } = useEditorCommands(editor, {});

  /** 颜色弹层关闭后回焦编辑器，避免关闭后焦点丢失。 */
  const focusEditorAfterColorPopoverClose = () => {
    if (editor.isDestroyed) return;
    editor.commands.focus();
  };

  /** 管理“高亮颜色弹层”关闭后的焦点分流。 */
  const { handleOpenChange: handleHighlightColorPickerOpenChange } =
    useOverlayCloseDispatcher({
      isOpen: showColorPicker === "highlight",
      setOpen: (open) => {
        if (open) {
          setShowMoreMenu(false);
          setShowColorPicker("highlight");
          return;
        }
        if (showColorPicker === "highlight") {
          setShowColorPicker(null);
        }
      },
      onCloseInside: focusEditorAfterColorPopoverClose,
      onCloseOutside: onOverlayCloseOutside,
      isInsideContainer: isInsideOverlayContainer,
      closeDelay: "raf",
    });

  /** 管理“文字颜色弹层”关闭后的焦点分流。 */
  const { handleOpenChange: handleTextColorPickerOpenChange } =
    useOverlayCloseDispatcher({
      isOpen: showColorPicker === "text",
      setOpen: (open) => {
        if (open) {
          setShowMoreMenu(false);
          setShowColorPicker("text");
          return;
        }
        if (showColorPicker === "text") {
          setShowColorPicker(null);
        }
      },
      onCloseInside: focusEditorAfterColorPopoverClose,
      onCloseOutside: onOverlayCloseOutside,
      isInsideContainer: isInsideOverlayContainer,
      closeDelay: "raf",
    });

  const onTextColorSelect = (color: string) => {
    const current = (editor.getAttributes("textStyle").color ?? "")
      .trim()
      .toLowerCase();
    if (current && color.trim().toLowerCase() === current) {
      format.unsetColor();
    } else {
      format.setColor(color);
    }
  };

  const onHighlightColorSelect = (color: string) => {
    if (color === "") {
      format.unsetHighlight();
    } else {
      const current = (editor.getAttributes("highlight").color ?? "")
        .trim()
        .toLowerCase();
      if (current === color.trim().toLowerCase()) {
        format.unsetHighlight();
      } else {
        format.setHighlight(color);
      }
    }
  };

  if (!editor) {
    return null;
  }

  /** BubbleMenu 根层仅拦截非颜色弹层区域，避免输入控件被取消聚焦。 */
  const handleBubbleMenuMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (isFromColorPopoverContent(event.target)) return;
    event.preventDefault();
  };

  return (
    <>
      <TiptapBubbleMenu
        editor={editor}
        className="bubble-menu"
        onMouseDown={handleBubbleMenuMouseDown}
        shouldShow={({ state }) => {
          // 颜色 Popover 打开时保活锚点，关闭后立即回到选区驱动显示逻辑。
          if (showColorPicker !== null) return true;
          const { selection } = state;
          // NodeSelection（图片、公式、整个表格节点等）不显示
          if (selection instanceof NodeSelection) return false;
          // CellSelection（表格多单元格选中）不显示，$anchorCell 是 CellSelection 的专有属性
          if ("$anchorCell" in selection) return false;
          // 代码块内不显示气泡菜单（NotionLike 模式下避免与代码语言菜单重叠）
          if (editor.isActive("codeBlock")) return false;
          return !selection.empty;
        }}
      >
        <button
          onClick={() => format.toggleBold()}
          className={
            editor.isActive("bold")
              ? "bubble-menu-btn is-active"
              : "bubble-menu-btn"
          }
          title={locale.bubbleMenu.bold}
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => format.toggleItalic()}
          className={
            editor.isActive("italic")
              ? "bubble-menu-btn is-active"
              : "bubble-menu-btn"
          }
          title={locale.bubbleMenu.italic}
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => format.toggleUnderline()}
          className={
            editor.isActive("underline")
              ? "bubble-menu-btn is-active"
              : "bubble-menu-btn"
          }
          title={locale.bubbleMenu.underline}
        >
          <Underline size={16} />
        </button>
        <button
          onClick={() => format.toggleStrike()}
          className={
            editor.isActive("strike")
              ? "bubble-menu-btn is-active"
              : "bubble-menu-btn"
          }
          title={locale.bubbleMenu.strikethrough}
        >
          <Strikethrough size={16} />
        </button>
        <button
          onClick={() => format.toggleCode()}
          className={
            editor.isActive("code")
              ? "bubble-menu-btn is-active"
              : "bubble-menu-btn"
          }
          title={locale.bubbleMenu.inlineCode}
        >
          <Code size={16} />
        </button>
        <span className="separator" />
        {/* 官方是免费的 */}
        <ColorPopoverPicker
          icon={<Highlighter size={16} />}
          title={locale.bubbleMenu.highlight}
          type="highlight"
          options={highlightColorOptions}
          selectedColor={editor.getAttributes("highlight").color}
          active={editor.isActive("highlight")}
          open={showColorPicker === "highlight"}
          onOpenChange={handleHighlightColorPickerOpenChange}
          onColorSelect={onHighlightColorSelect}
          locale={locale}
          portalContainer={portalContainer}
          popoverClassName="bubble-menu-popover-panel"
          triggerClassName="bubble-menu-btn"
        />
        {/* 官方的需要钱 */}
        <ColorPopoverPicker
          icon={<Palette size={16} />}
          title={locale.bubbleMenu.textColor}
          type="text"
          options={textColorOptions}
          selectedColor={editor.getAttributes("textStyle").color}
          active={!!editor.getAttributes("textStyle").color}
          open={showColorPicker === "text"}
          onOpenChange={handleTextColorPickerOpenChange}
          onColorSelect={onTextColorSelect}
          locale={locale}
          portalContainer={portalContainer}
          popoverClassName="bubble-menu-popover-panel"
          triggerClassName="bubble-menu-btn"
        />
        <span className="separator" />
        <Popover
          open={showMoreMenu}
          onOpenChange={(open) => {
            if (open) {
              setShowColorPicker(null);
            }
            setShowMoreMenu(open);
          }}
        >
          <PopoverTrigger asChild onMouseDown={(e) => e.preventDefault()}>
            <button
              className={
                showMoreMenu ? "bubble-menu-btn is-active" : "bubble-menu-btn"
              }
              title={locale.bubbleMenu.more}
            >
              <MoreHorizontal size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            container={portalContainer ?? undefined}
            side="bottom"
            align="start"
            sideOffset={8}
            className="bubble-menu-popover-panel"
            onMouseDown={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => e.preventDefault()}
            // 阻止菜单关闭时焦点回到触发器，避免编辑器被判定为失焦。
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className="more-menu">
              <button
                onClick={() => {
                  format.toggleSuperscript();
                  setShowMoreMenu(false);
                }}
                className={
                  editor.isActive("superscript")
                    ? "bubble-menu-btn is-active"
                    : "bubble-menu-btn"
                }
                title={locale.bubbleMenu.superscript}
              >
                <Superscript size={16} />
              </button>
              <button
                onClick={() => {
                  format.toggleSubscript();
                  setShowMoreMenu(false);
                }}
                className={
                  editor.isActive("subscript")
                    ? "bubble-menu-btn is-active"
                    : "bubble-menu-btn"
                }
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
                  editor.isActive({ textAlign: "left" })
                    ? "bubble-menu-btn is-active"
                    : "bubble-menu-btn"
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
                  editor.isActive({ textAlign: "center" })
                    ? "bubble-menu-btn is-active"
                    : "bubble-menu-btn"
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
                  editor.isActive({ textAlign: "right" })
                    ? "bubble-menu-btn is-active"
                    : "bubble-menu-btn"
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
                  editor.isActive({ textAlign: "justify" })
                    ? "bubble-menu-btn is-active"
                    : "bubble-menu-btn"
                }
                title={locale.bubbleMenu.justify}
              >
                <AlignJustify size={16} />
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </TiptapBubbleMenu>
    </>
  );
};

export default BubbleMenu;
