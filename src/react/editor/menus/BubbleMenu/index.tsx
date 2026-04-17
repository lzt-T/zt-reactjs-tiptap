import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useRef, useState } from "react";
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
  const [showColorPicker, setShowColorPicker] = useState<
    "text" | "highlight" | null
  >(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // 当前 Popover 关闭是否需要触发焦点校验回调。
  const shouldNotifyOnCloseRef = useRef(true);

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

  /** 判断关闭来源目标是否来自气泡菜单内部。 */
  const isInternalMenuTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest(".bubble-menu-btn"));
  };

  /** 提取 Popover 外部交互的真实事件目标。 */
  const getOutsideInteractionTarget = (event: Event) => {
    const customEvent = event as CustomEvent<{ originalEvent?: Event }>;
    const originalTarget = customEvent.detail?.originalEvent?.target;
    return originalTarget ?? event.target;
  };

  /** 根据外部交互来源更新关闭通知策略。 */
  const handlePopoverInteractOutside = (event: Event) => {
    shouldNotifyOnCloseRef.current = !isInternalMenuTarget(
      getOutsideInteractionTarget(event),
    );
  };

  /** Esc 关闭始终触发关闭通知。 */
  const handlePopoverEscapeKeyDown = () => {
    shouldNotifyOnCloseRef.current = true;
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
          // 颜色 Popover 打开时保活锚点，关闭后立即回到选区驱动显示逻辑。
          if (showColorPicker !== null) return true;
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
          className={editor.isActive("bold") ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
          title={locale.bubbleMenu.bold}
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => format.toggleItalic()}
          className={editor.isActive("italic") ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
          title={locale.bubbleMenu.italic}
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => format.toggleUnderline()}
          className={editor.isActive("underline") ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
          title={locale.bubbleMenu.underline}
        >
          <Underline size={16} />
        </button>
        <button
          onClick={() => format.toggleStrike()}
          className={editor.isActive("strike") ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
          title={locale.bubbleMenu.strikethrough}
        >
          <Strikethrough size={16} />
        </button>
        <button
          onClick={() => format.toggleCode()}
          className={editor.isActive("code") ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
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
              shouldNotifyOnCloseRef.current = true;
              setShowMoreMenu(false);
              setShowColorPicker("highlight");
              return;
            }
            if (showColorPicker === "highlight") {
              setShowColorPicker(null);
            }
            if (shouldNotifyOnCloseRef.current) {
              notifyPopoverClosed();
            }
            shouldNotifyOnCloseRef.current = true;
          }}
        >
          <PopoverTrigger asChild>
            <button
              className={editor.isActive("highlight") ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
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
            onInteractOutside={handlePopoverInteractOutside}
            onEscapeKeyDown={handlePopoverEscapeKeyDown}
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
              shouldNotifyOnCloseRef.current = true;
              setShowMoreMenu(false);
              setShowColorPicker("text");
              return;
            }
            if (showColorPicker === "text") {
              setShowColorPicker(null);
            }
            if (shouldNotifyOnCloseRef.current) {
              notifyPopoverClosed();
            }
            shouldNotifyOnCloseRef.current = true;
          }}
        >
          <PopoverTrigger asChild>
            <button
              className={editor.getAttributes("textStyle").color ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
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
            onInteractOutside={handlePopoverInteractOutside}
            onEscapeKeyDown={handlePopoverEscapeKeyDown}
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
              shouldNotifyOnCloseRef.current = true;
              setShowColorPicker(null);
            }
            setShowMoreMenu(open);
            if (!open) {
              if (shouldNotifyOnCloseRef.current) {
                notifyPopoverClosed();
              }
              shouldNotifyOnCloseRef.current = true;
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              className={showMoreMenu ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
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
            onInteractOutside={handlePopoverInteractOutside}
            onEscapeKeyDown={handlePopoverEscapeKeyDown}
          >
            <div className="more-menu">
              <button
                onClick={() => {
                  format.toggleSuperscript();
                  setShowMoreMenu(false);
                }}
                className={editor.isActive("superscript") ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
                title={locale.bubbleMenu.superscript}
              >
                <Superscript size={16} />
              </button>
              <button
                onClick={() => {
                  format.toggleSubscript();
                  setShowMoreMenu(false);
                }}
                className={editor.isActive("subscript") ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
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
