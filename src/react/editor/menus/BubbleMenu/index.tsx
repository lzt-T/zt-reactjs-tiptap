import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import {
  NodeSelection,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { config, type ColorOption } from "@/shared/config";
import {
  Bold,
  ChevronDown,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Highlighter,
  Palette,
  MoreHorizontal,
  Superscript,
  Subscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ListIndentDecrease,
  ListIndentIncrease,
  List,
  ListOrdered,
  ListTodo,
  Link as LinkIcon,
  MessageSquareQuote,
  SquareCode,
  Type as TextIcon,
} from "lucide-react";
import type { HeadingLevel } from "@/core/commands/editorCommands";
import { useEditorCommands, useScopedActiveDispatcher } from "@/react/hooks";
import ColorPopoverPicker from "@/react/editor/color/ColorPopoverPicker";
import LinkEditorPanel from "@/react/editor/link";
import {
  createInlineControlDisabledState,
  openLinkDraft,
  removeLink as removeLinkAction,
  resolveLinkDraftHref,
  toggleHighlightColor,
  toggleTextColor,
} from "@/react/editor/shared/editorActionStrategies";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/react/components/ui/popover";
import type { EditorLocale } from "@/shared/locales";
import "./index.css";

interface BubbleMenuProps {
  editor: Editor;
  locale: EditorLocale;
  textColorOptions: ColorOption[];
  highlightColorOptions: ColorOption[];
  portalContainer?: HTMLElement | null;
  isInsideOverlayContainer?: (target: EventTarget | null) => boolean;
  onOverlayCloseOutside?: () => void;
}

// 气泡菜单支持切换的标题级别。
const HEADING_LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6];
// 标题级别对应的图标。
const HEADING_ICONS: Record<HeadingLevel, ReactNode> = {
  1: <Heading1 size={16} />,
  2: <Heading2 size={16} />,
  3: <Heading3 size={16} />,
  4: <Heading4 size={16} />,
  5: <Heading5 size={16} />,
  6: <Heading6 size={16} />,
};

interface BlockMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  run: () => void;
}

/** 判断 mousedown 事件是否来自 BubbleMenu 的颜色面板内容。 */
function isFromColorPopoverContent(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(".color-picker") || target.closest(".editor-link-panel"),
  );
}

/** 解析当前选区所在块的展示文案。 */
function resolveCurrentBlockLabel(
  editor: Editor,
  locale: EditorLocale,
): string {
  // 当前命中的标题级别。
  const headingLevel = HEADING_LEVELS.find((level) =>
    editor.isActive("heading", { level }),
  );
  if (headingLevel) return locale.bubbleMenu.headingLevel(headingLevel);

  // 块类型文案分发表，按优先级返回第一个命中的状态。
  const blockLabelResolvers = [
    {
      active: editor.isActive("bulletList"),
      label: locale.bubbleMenu.bulletList,
    },
    {
      active: editor.isActive("orderedList"),
      label: locale.bubbleMenu.orderedList,
    },
    { active: editor.isActive("taskList"), label: locale.bubbleMenu.taskList },
    { active: editor.isActive("blockquote"), label: locale.bubbleMenu.blockquote },
    { active: editor.isActive("codeBlock"), label: locale.bubbleMenu.codeBlock },
    { active: editor.isActive("paragraph"), label: locale.bubbleMenu.paragraph },
  ];

  return (
    blockLabelResolvers.find((resolver) => resolver.active)?.label ??
    locale.bubbleMenu.paragraph
  );
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
  /** 选区/内容变化时自增，驱动 BubbleMenu 按当前选区重算 isActive 状态。 */
  const [selectionKey, setSelectionKey] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState<
    "text" | "highlight" | null
  >(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  /** 块类型下拉菜单开关。 */
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  /** 链接编辑面板开关。 */
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  /** 链接输入框草稿值。 */
  const [linkDraft, setLinkDraft] = useState("");

  /** 刷新选区版本，驱动按钮激活态按最新 editor state 重算。 */
  const refreshSelectionKey = useCallback(() => {
    setSelectionKey((key) => key + 1);
  }, []);

  useEffect(() => {
    /** 选区或事务变化后触发一次重渲染，避免按钮激活态偶发滞后。 */
    const onSelectionUpdate = () => {
      // 选区坍塌为光标态时，统一关闭所有子弹层，避免 BubbleMenu 残留吸附。
      if (editor.state.selection.empty) {
        setShowBlockMenu(false);
        setShowLinkEditor(false);
        setShowColorPicker(null);
        setShowMoreMenu(false);
      }
      refreshSelectionKey();
    };
    /** 仅在文档或选区真实变化时刷新，避免 BubbleMenu updateOptions 自激循环。 */
    const onTransaction = ({ transaction }: { transaction: Transaction }) => {
      // BubbleMenu 插件自身的配置更新事务。
      const bubbleMenuMeta = transaction.getMeta("bubbleMenu");
      if (bubbleMenuMeta?.type === "updateOptions") return;
      if (!transaction.docChanged && !transaction.selectionSet) return;
      refreshSelectionKey();
    };

    editor.on("selectionUpdate", onSelectionUpdate);
    editor.on("transaction", onTransaction);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
      editor.off("transaction", onTransaction);
    };
  }, [editor, refreshSelectionKey]);

  const { format, block } = useEditorCommands(editor, {});
  /** 当前选区是否在 inline code（code mark）内。 */
  const isInsideCode = editor.isFocused && editor.isActive("code");
  const inlineDisabledMap = createInlineControlDisabledState(isInsideCode);
  /** inline code 下禁用的气泡菜单按钮状态。 */
  const isBoldDisabled = inlineDisabledMap.bold;
  const isItalicDisabled = inlineDisabledMap.italic;
  const isUnderlineDisabled = inlineDisabledMap.underline;
  const isStrikethroughDisabled = inlineDisabledMap.strikethrough;
  const isLinkDisabled = inlineDisabledMap.link;
  const isHighlightDisabled = inlineDisabledMap.highlight;
  const isTextColorDisabled = inlineDisabledMap.textColor;
  const isSuperscriptDisabled = inlineDisabledMap.superscript;
  const isSubscriptDisabled = inlineDisabledMap.subscript;
  // 减少缩进按钮是否不可用。
  const isDecreaseIndentDisabled = !block.canDecreaseIndent();
  // 增加缩进按钮是否不可用。
  const isIncreaseIndentDisabled = !block.canIncreaseIndent();

  /** 颜色弹层关闭后回焦编辑器，避免关闭后焦点丢失。 */
  const focusEditorAfterColorPopoverClose = () => {
    if (editor.isDestroyed) return;
    editor.commands.focus();
  };

  /** 管理“高亮颜色弹层”关闭后的焦点分流。 */
  const { handleActiveChange: handleHighlightColorPickerOpenChange } =
    useScopedActiveDispatcher({
      isActive: showColorPicker === "highlight",
      setActive: (active) => {
        if (active) {
          setShowBlockMenu(false);
          setShowMoreMenu(false);
          setShowColorPicker("highlight");
          return;
        }
        if (showColorPicker === "highlight") {
          setShowColorPicker(null);
        }
      },
      onExitInside: focusEditorAfterColorPopoverClose,
      onExitOutside: onOverlayCloseOutside,
      isInsideContainer: isInsideOverlayContainer,
      exitDelay: "raf",
    });

  /** 管理“文字颜色弹层”关闭后的焦点分流。 */
  const { handleActiveChange: handleTextColorPickerOpenChange } =
    useScopedActiveDispatcher({
      isActive: showColorPicker === "text",
      setActive: (active) => {
        if (active) {
          setShowBlockMenu(false);
          setShowMoreMenu(false);
          setShowColorPicker("text");
          return;
        }
        if (showColorPicker === "text") {
          setShowColorPicker(null);
        }
      },
      onExitInside: focusEditorAfterColorPopoverClose,
      onExitOutside: onOverlayCloseOutside,
      isInsideContainer: isInsideOverlayContainer,
      exitDelay: "raf",
    });
  /** 管理“链接面板”关闭后的焦点分流。 */
  const { handleActiveChange: handleLinkEditorOpenChange } =
    useScopedActiveDispatcher({
      isActive: showLinkEditor,
      setActive: (active) => {
        if (active) {
          setShowBlockMenu(false);
          setShowMoreMenu(false);
          setShowColorPicker(null);
          setShowLinkEditor(true);
          return;
        }
        setShowLinkEditor(false);
      },
      onExitInside: focusEditorAfterColorPopoverClose,
      onExitOutside: onOverlayCloseOutside,
      isInsideContainer: isInsideOverlayContainer,
      exitDelay: "raf",
    });

  const onTextColorSelect = (color: string) => {
    toggleTextColor(editor, color, {
      setColor: format.setColor,
      unsetColor: format.unsetColor,
    });
  };

  const onHighlightColorSelect = (color: string) => {
    toggleHighlightColor(editor, color, {
      setHighlight: format.setHighlight,
      unsetHighlight: format.unsetHighlight,
    });
  };
  /** 打开链接编辑面板，并预填当前链接地址。 */
  const openLinkEditor = () => {
    setLinkDraft(openLinkDraft(editor));
    handleLinkEditorOpenChange(true);
  };
  /** 提交链接修改：非空 URL 时更新选区链接。 */
  const submitLinkDraft = () => {
    const href = resolveLinkDraftHref(linkDraft);
    if (!href) return;
    format.setLink(href);
    handleLinkEditorOpenChange(false);
  };
  /** 删除当前链接并关闭面板。 */
  const removeLink = () => {
    removeLinkAction({ unsetLink: format.unsetLink });
    handleLinkEditorOpenChange(false);
  };

  // 当前块类型按钮展示文案。
  const currentBlockLabel = resolveCurrentBlockLabel(editor, locale);
  // 链接草稿解析失败时，禁用提交并给出可访问性提示。
  const resolvedLinkDraftHref = resolveLinkDraftHref(linkDraft);
  const linkDraftError =
    linkDraft.trim() !== "" && !resolvedLinkDraftHref
      ? locale.toolbar.invalidLinkUrl
      : "";
  // BubbleMenu 块类型菜单配置。
  const blockMenuItems: BlockMenuItem[] = [
    {
      key: "paragraph",
      label: locale.bubbleMenu.paragraph,
      icon: <TextIcon size={16} />,
      active: editor.isActive("paragraph"),
      run: block.setParagraph,
    },
    ...HEADING_LEVELS.map((level) => ({
      key: `heading-${level}`,
      label: locale.bubbleMenu.headingLevel(level),
      icon: HEADING_ICONS[level],
      active: editor.isActive("heading", { level }),
      run: () => block.toggleHeading(level),
    })),
    {
      key: "bullet-list",
      label: locale.bubbleMenu.bulletList,
      icon: <List size={16} />,
      active: editor.isActive("bulletList"),
      run: block.toggleBulletList,
    },
    {
      key: "ordered-list",
      label: locale.bubbleMenu.orderedList,
      icon: <ListOrdered size={16} />,
      active: editor.isActive("orderedList"),
      run: block.toggleOrderedList,
    },
    {
      key: "task-list",
      label: locale.bubbleMenu.taskList,
      icon: <ListTodo size={16} />,
      active: editor.isActive("taskList"),
      run: block.toggleTaskList,
    },
    {
      key: "blockquote",
      label: locale.bubbleMenu.blockquote,
      icon: <MessageSquareQuote size={16} />,
      active: editor.isActive("blockquote"),
      run: block.toggleBlockquote,
    },
    {
      key: "code-block",
      label: locale.bubbleMenu.codeBlock,
      icon: <SquareCode size={16} />,
      active: editor.isActive("codeBlock"),
      run: block.toggleCodeBlock,
    },
  ];

  /** 判断 BubbleMenu 是否展示，保持函数引用稳定以避免 TipTap 重复派发 updateOptions。 */
  const shouldShowBubbleMenu = useCallback(
    ({ state }: { state: EditorState }) => {
      const { selection } = state;
      // NodeSelection（图片、公式、整个表格节点等）不显示
      if (selection instanceof NodeSelection) return false;
      // CellSelection（表格多单元格选中）不显示，$anchorCell 是 CellSelection 的专有属性
      if ("$anchorCell" in selection) return false;
      // 代码块内不显示气泡菜单（NotionLike 模式下避免与代码语言菜单重叠）
      if (editor.isActive("codeBlock")) return false;
      // 光标态（空选区）不显示，方向键移动后立即隐藏。
      if (selection.empty) return false;
      return true;
    },
    [editor],
  );

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
        data-selection-key={selectionKey}
        editor={editor}
        className="bubble-menu"
        onMouseDown={handleBubbleMenuMouseDown}
        shouldShow={shouldShowBubbleMenu}
      >
        <Popover
          open={showBlockMenu}
          onOpenChange={(open) => {
            if (open) {
              setShowColorPicker(null);
              setShowMoreMenu(false);
              setShowLinkEditor(false);
            }
            setShowBlockMenu(open);
          }}
        >
          <PopoverTrigger asChild onMouseDown={(e) => e.preventDefault()}>
            <button
              type="button"
              className={
                showBlockMenu
                  ? "bubble-block-trigger is-active"
                  : "bubble-block-trigger"
              }
              title={locale.bubbleMenu.turnInto}
            >
              <span className="bubble-block-trigger-label">
                {currentBlockLabel}
              </span>
              <ChevronDown size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            container={portalContainer ?? undefined}
            side="bottom"
            align="start"
            sideOffset={8}
            className="bubble-menu-popover-panel bubble-menu-color-popover-no-animation"
            onMouseDown={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => e.preventDefault()}
            // 阻止菜单关闭时焦点回到触发器，避免编辑器被判定为失焦。
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className="bubble-block-menu">
              <div className="bubble-block-menu-title">
                {locale.bubbleMenu.turnInto}
              </div>
              {blockMenuItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={
                    item.active
                      ? "bubble-block-menu-item is-active"
                      : "bubble-block-menu-item"
                  }
                  onClick={() => {
                    item.run();
                    setShowBlockMenu(false);
                  }}
                  title={item.label}
                >
                  <span className="bubble-block-menu-icon">{item.icon}</span>
                  <span className="bubble-block-menu-label">{item.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <span className="separator" />
        <button
          onClick={() => {
            if (isBoldDisabled) return;
            format.toggleBold();
          }}
          className={
            editor.isActive("bold") && !isBoldDisabled
              ? "bubble-menu-btn is-active"
              : isBoldDisabled
                ? "bubble-menu-btn is-disabled"
                : "bubble-menu-btn"
          }
          title={locale.bubbleMenu.bold}
          disabled={isBoldDisabled}
          aria-disabled={isBoldDisabled}
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => {
            if (isItalicDisabled) return;
            format.toggleItalic();
          }}
          className={
            editor.isActive("italic") && !isItalicDisabled
              ? "bubble-menu-btn is-active"
              : isItalicDisabled
                ? "bubble-menu-btn is-disabled"
                : "bubble-menu-btn"
          }
          title={locale.bubbleMenu.italic}
          disabled={isItalicDisabled}
          aria-disabled={isItalicDisabled}
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => {
            if (isUnderlineDisabled) return;
            format.toggleUnderline();
          }}
          className={
            editor.isActive("underline") && !isUnderlineDisabled
              ? "bubble-menu-btn is-active"
              : isUnderlineDisabled
                ? "bubble-menu-btn is-disabled"
                : "bubble-menu-btn"
          }
          title={locale.bubbleMenu.underline}
          disabled={isUnderlineDisabled}
          aria-disabled={isUnderlineDisabled}
        >
          <Underline size={16} />
        </button>
        <button
          onClick={() => {
            if (isStrikethroughDisabled) return;
            format.toggleStrike();
          }}
          className={
            editor.isActive("strike") && !isStrikethroughDisabled
              ? "bubble-menu-btn is-active"
              : isStrikethroughDisabled
                ? "bubble-menu-btn is-disabled"
                : "bubble-menu-btn"
          }
          title={locale.bubbleMenu.strikethrough}
          disabled={isStrikethroughDisabled}
          aria-disabled={isStrikethroughDisabled}
        >
          <Strikethrough size={16} />
        </button>
        <button
          onClick={() => format.toggleCode()}
          className={isInsideCode ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
          title={locale.bubbleMenu.inlineCode}
        >
          <Code size={16} />
        </button>
        <Popover
          open={showLinkEditor}
          onOpenChange={(open) => {
            if (open) {
              if (isLinkDisabled) return;
              openLinkEditor();
              return;
            }
            handleLinkEditorOpenChange(false);
          }}
        >
          <PopoverTrigger asChild onMouseDown={(e) => e.preventDefault()}>
            <button
              className={
                editor.isActive("link") && !isLinkDisabled
                  ? "bubble-menu-btn is-active"
                  : isLinkDisabled
                    ? "bubble-menu-btn is-disabled"
                    : "bubble-menu-btn"
              }
              title={locale.bubbleMenu.link}
              disabled={isLinkDisabled}
              aria-disabled={isLinkDisabled}
            >
              <LinkIcon size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            container={portalContainer ?? undefined}
            side="bottom"
            align="start"
            sideOffset={8}
            className="bubble-menu-popover-panel"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <LinkEditorPanel
              value={linkDraft}
              locale={locale}
              errorMessage={linkDraftError}
              submitDisabled={!resolvedLinkDraftHref}
              onChange={setLinkDraft}
              onSubmit={submitLinkDraft}
              onRemove={removeLink}
              onClose={() => handleLinkEditorOpenChange(false)}
            />
          </PopoverContent>
        </Popover>
        <span className="separator" />
        {/* 官方是免费的 */}
        <ColorPopoverPicker
          icon={<Highlighter size={16} />}
          title={locale.bubbleMenu.highlight}
          type="highlight"
          options={highlightColorOptions}
          selectedColor={editor.getAttributes("highlight").color}
          active={editor.isActive("highlight")}
          disabled={isHighlightDisabled}
          open={showColorPicker === "highlight"}
          onOpenChange={handleHighlightColorPickerOpenChange}
          onColorSelect={onHighlightColorSelect}
          locale={locale}
          portalContainer={portalContainer}
          popoverClassName="bubble-menu-popover-panel bubble-menu-color-popover-no-animation"
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
          disabled={isTextColorDisabled}
          open={showColorPicker === "text"}
          onOpenChange={handleTextColorPickerOpenChange}
          onColorSelect={onTextColorSelect}
          locale={locale}
          portalContainer={portalContainer}
          popoverClassName="bubble-menu-popover-panel bubble-menu-color-popover-no-animation"
          triggerClassName="bubble-menu-btn"
        />
        <span className="separator" />
        <Popover
          open={showMoreMenu}
          onOpenChange={(open) => {
            if (open) {
              setShowBlockMenu(false);
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
                  if (isSuperscriptDisabled) return;
                  format.toggleSuperscript();
                  setShowMoreMenu(false);
                }}
                className={
                  editor.isActive("superscript") && !isSuperscriptDisabled
                    ? "bubble-menu-btn is-active"
                    : isSuperscriptDisabled
                      ? "bubble-menu-btn is-disabled"
                      : "bubble-menu-btn"
                }
                title={locale.bubbleMenu.superscript}
                disabled={isSuperscriptDisabled}
                aria-disabled={isSuperscriptDisabled}
              >
                <Superscript size={16} />
              </button>
              <button
                onClick={() => {
                  if (isSubscriptDisabled) return;
                  format.toggleSubscript();
                  setShowMoreMenu(false);
                }}
                className={
                  editor.isActive("subscript") && !isSubscriptDisabled
                    ? "bubble-menu-btn is-active"
                    : isSubscriptDisabled
                      ? "bubble-menu-btn is-disabled"
                      : "bubble-menu-btn"
                }
                title={locale.bubbleMenu.subscript}
                disabled={isSubscriptDisabled}
                aria-disabled={isSubscriptDisabled}
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
              <div className="more-menu-separator" />
              <button
                onClick={() => {
                  if (isDecreaseIndentDisabled) return;
                  block.decreaseIndent();
                  setShowMoreMenu(false);
                }}
                className={
                  isDecreaseIndentDisabled
                    ? "bubble-menu-btn is-disabled"
                    : "bubble-menu-btn"
                }
                title={locale.bubbleMenu.decreaseIndent}
                disabled={isDecreaseIndentDisabled}
                aria-disabled={isDecreaseIndentDisabled}
              >
                <ListIndentDecrease size={16} />
              </button>
              <button
                onClick={() => {
                  if (isIncreaseIndentDisabled) return;
                  block.increaseIndent();
                  setShowMoreMenu(false);
                }}
                className={
                  isIncreaseIndentDisabled
                    ? "bubble-menu-btn is-disabled"
                    : "bubble-menu-btn"
                }
                title={locale.bubbleMenu.increaseIndent}
                disabled={isIncreaseIndentDisabled}
                aria-disabled={isIncreaseIndentDisabled}
              >
                <ListIndentIncrease size={16} />
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </TiptapBubbleMenu>
    </>
  );
};

export default BubbleMenu;
