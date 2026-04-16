import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useEffect, useRef, useState } from "react";
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
  portalContainer?: HTMLElement | null;
  /** BubbleMenu 内 Popover 开关状态校验回调（关闭后用于补齐 blur 链路）。 */
  onPopoverOpenStateChecked?: (editorFocused: boolean) => void;
}

const BubbleMenu = ({
  editor,
  locale,
  portalContainer,
  onPopoverOpenStateChecked,
}: BubbleMenuProps) => {
  // 颜色面板关闭保活时长（ms）：覆盖 Popover 关闭动画时间，避免锚点提前卸载。
  const COLOR_PICKER_CLOSE_ANIMATION_MS = 220;
  const [showColorPicker, setShowColorPicker] = useState<
    "text" | "highlight" | null
  >(null);
  // 颜色面板关闭过渡态：在关闭动画期间强制保活 BubbleMenu 锚点。
  const [isColorPickerClosing, setIsColorPickerClosing] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // 颜色面板关闭过渡态定时器 id（仅保留一个，避免旧 timer 干扰）。
  const closeColorPickerTimerRef = useRef<number | null>(null);

  const { format } = useEditorCommands(editor, {});

  /** 清理颜色面板延迟关闭定时器。 */
  const clearCloseColorPickerTimer = () => {
    if (closeColorPickerTimerRef.current === null) return;
    window.clearTimeout(closeColorPickerTimerRef.current);
    closeColorPickerTimerRef.current = null;
  };

  /** 触发颜色面板关闭：先关闭 Popover，再保活锚点直到关闭动画结束。 */
  const closeColorPickerWithAnimation = () => {
    clearCloseColorPickerTimer();
    setShowColorPicker(null);
    setIsColorPickerClosing(true);
    closeColorPickerTimerRef.current = window.setTimeout(() => {
      setIsColorPickerClosing(false);
      closeColorPickerTimerRef.current = null;
    }, COLOR_PICKER_CLOSE_ANIMATION_MS);
  };

  /** 组件卸载时清理定时器，避免卸载后触发状态更新。 */
  useEffect(() => {
    return () => {
      clearCloseColorPickerTimer();
    };
  }, []);

  const onTextColorSelect = (color: string) => {
    const current = (editor.getAttributes("textStyle").color ?? "").trim().toLowerCase();
    if (current && color.trim().toLowerCase() === current) {
      format.unsetColor();
    } else {
      format.setColor(color);
    }
    closeColorPickerWithAnimation();
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
    closeColorPickerWithAnimation();
  };

  /** Popover 关闭后延迟校验编辑器聚焦状态，必要时补触发 blur 链路。 */
  const notifyPopoverClosed = () => {
    requestAnimationFrame(() => {
      onPopoverOpenStateChecked?.(editor.isFocused);
    });
  };

  if (!editor) {
    return null;
  }

  return (
    <>
      <TiptapBubbleMenu
        editor={editor}
        className="bubble-menu"
        onMouseDown={(event) => event.preventDefault()}
        shouldShow={({ state }) => {
          // 颜色 Popover 关闭动画阶段保活锚点，避免浮层回落到左上角。
          if (showColorPicker !== null || isColorPickerClosing) return true;
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
        <Popover
          open={showColorPicker === "highlight"}
          onOpenChange={(open) => {
            if (open) {
              clearCloseColorPickerTimer();
              setIsColorPickerClosing(false);
              setShowMoreMenu(false);
              setShowColorPicker("highlight");
              return;
            }
            clearCloseColorPickerTimer();
            setIsColorPickerClosing(false);
            if (showColorPicker === "highlight") {
              setShowColorPicker(null);
            }
            notifyPopoverClosed();
          }}
        >
          <PopoverTrigger asChild>
            <button
              className={editor.isActive("highlight") ? "is-active" : ""}
              title={locale.bubbleMenu.highlight}
            >
              <Highlighter size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            container={portalContainer ?? undefined}
            side="bottom"
            align="start"
            sideOffset={8}
            className="bubble-menu-popover-panel"
          >
            <ColorPicker
              type="highlight"
              selectedColor={editor.getAttributes("highlight").color}
              onColorSelect={onHighlightColorSelect}
              locale={locale}
            />
          </PopoverContent>
        </Popover>
        {/* 官方的需要钱 */}
        <Popover
          open={showColorPicker === "text"}
          onOpenChange={(open) => {
            if (open) {
              clearCloseColorPickerTimer();
              setIsColorPickerClosing(false);
              setShowMoreMenu(false);
              setShowColorPicker("text");
              return;
            }
            clearCloseColorPickerTimer();
            setIsColorPickerClosing(false);
            if (showColorPicker === "text") {
              setShowColorPicker(null);
            }
            notifyPopoverClosed();
          }}
        >
          <PopoverTrigger asChild>
            <button
              className={editor.getAttributes("textStyle").color ? "is-active" : ""}
              title={locale.bubbleMenu.textColor}
            >
              <Palette size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            container={portalContainer ?? undefined}
            side="bottom"
            align="start"
            sideOffset={8}
            className="bubble-menu-popover-panel"
          >
            <ColorPicker
              type="text"
              selectedColor={editor.getAttributes("textStyle").color}
              onColorSelect={onTextColorSelect}
              locale={locale}
            />
          </PopoverContent>
        </Popover>
        <span className="separator" />
        <Popover
          open={showMoreMenu}
          onOpenChange={(open) => {
            if (open) {
              setShowColorPicker(null);
            }
            setShowMoreMenu(open);
            if (!open) {
              notifyPopoverClosed();
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              className={showMoreMenu ? "is-active" : ""}
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
          >
            <div className="more-menu">
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
          </PopoverContent>
        </Popover>
      </TiptapBubbleMenu>
    </>
  );
};

export default BubbleMenu;
