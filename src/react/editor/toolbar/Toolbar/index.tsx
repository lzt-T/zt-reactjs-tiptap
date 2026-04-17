import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { GapCursor } from "@tiptap/pm/gapcursor";
import { TextSelection } from "@tiptap/pm/state";
import { useEditorCommands } from "@/react/hooks";
import { BuiltinToolbarItemKey } from "@/react/editor/customization";
import type { EditorActionContext } from "@/react/editor/customization";
import ColorPicker from "@/react/editor/toolbar/ColorPicker";
import TableSizePicker from "@/react/editor/table/TableSizePicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/react/components/ui/popover";
import { renderToolbarItem } from "./renderers/renderToolbarItem";
import type {
  RenderedToolbarItem,
  ToolbarProps,
  ToolbarRenderContext,
} from "./types";
import { useToolbarUIState } from "./hooks/useToolbarUIState";
import "./Toolbar.css";

const Toolbar = ({
  editor,
  locale,
  items,
  isEditorFocused = true,
  isEditorFocusStable = true,
  onOpenMathDialog,
  onOpenImageDialog,
  onOpenFileUploadDialog,
  portalContainer,
  onPopoverOpenStateChecked,
}: ToolbarProps) => {
  /** 选区/内容变化时自增，用于让工具栏根据当前选区重新计算 isActive 并重渲染 */
  const [selectionKey, setSelectionKey] = useState(0);
  // 当前 Popover 关闭是否需要触发焦点校验回调。
  const shouldNotifyOnCloseRef = useRef(true);

  const {
    showColorPicker,
    setShowColorPicker,
    showHeadingMenu,
    setShowHeadingMenu,
    showTableSizePicker,
    setShowTableSizePicker,
  } = useToolbarUIState({ isEditorFocused });

  /**
   * 是否聚焦在公式/图片节点内（此时禁用格式/块级操作按钮）。
   * 仅光标在普通文本时不禁用：Headless 模式下样式从光标位置生效，无需先选中文字。
   */
  const isFocusNodeOnly =
    isEditorFocused &&
    (editor.isActive("inlineMath") ||
      editor.isActive("blockMath") ||
      editor.isActive("image") ||
      editor.isActive("fileAttachment"));
  /** 光标是否位于代码块。Headless 模式下代码块内统一禁用顶部工具栏按钮。 */
  const isInsideCodeBlock =
    isEditorFocused && editor.isActive("codeBlock") && isEditorFocusStable;
  /** 光标是否位于表格。失焦时回到初始可用态。 */
  const isInsideTable = isEditorFocused && editor.isActive("table");
  /** 统一的工具栏禁用条件：特殊节点或代码块中均禁用。 */
  const isToolbarLocked = isFocusNodeOnly || isInsideCodeBlock;
  /** 代码块切换按钮例外：在代码块内仍可用，仅在特殊节点内禁用。 */
  const isCodeBlockToggleLocked = isFocusNodeOnly;
  /** 仅在聚焦且稳定时显示按钮激活态。 */
  const showActiveState = isEditorFocused && isEditorFocusStable;

  /**
   * 是否处于行内代码（code mark）内。
   * Code mark 会排斥其他所有 inline mark，此时禁用 bold/italic/underline/strike/
   * highlight/color/superscript/subscript 等格式按钮（code 按钮本身保持启用）。
   */
  const isInsideCode = isEditorFocused && editor.isActive("code");

  useEffect(() => {
    const onSelectionUpdate = () => {
      setSelectionKey((k) => k + 1);
      if (
        editor.isActive("inlineMath") ||
        editor.isActive("blockMath") ||
        editor.isActive("image") ||
        editor.isActive("code") ||
        editor.isActive("codeBlock")
      ) {
        setShowHeadingMenu(false);
        setShowColorPicker(null);
        setShowTableSizePicker(false);
      }
    };
    editor.on("selectionUpdate", onSelectionUpdate);
    editor.on("transaction", onSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
      editor.off("transaction", onSelectionUpdate);
    };
  }, [editor, setShowColorPicker, setShowHeadingMenu, setShowTableSizePicker]);

  const { format, block, dialogs } = useEditorCommands(editor, {
    onOpenMathDialog,
    onOpenImageDialog,
    onOpenFileUploadDialog,
  });

  /** 自定义动作上下文：供 toolbar 自定义按钮复用现有能力。 */
  const actionContext = useMemo<EditorActionContext>(
    () => ({
      editor,
      locale,
      format,
      block,
      dialogs,
    }),
    [editor, locale, format, block, dialogs],
  );

  const currentHeadingLevel = !isEditorFocused
    ? null
    : editor.isActive("heading", { level: 1 })
      ? 1
      : editor.isActive("heading", { level: 2 })
        ? 2
        : editor.isActive("heading", { level: 3 })
          ? 3
          : null;

  /** 失焦点击工具栏时，将命令锚点移动到文末，避免污染旧选区。 */
  const prepareEndAnchorWhenBlurred = () => {
    if (isEditorFocused) return;
    const endPos = editor.state.doc.content.size;
    editor.chain().focus().setTextSelection(endPos).run();
  };

  /**
   * GapCursor 下的执行策略：
   * - insert-anchor：先在 gap 位置插入段落锚点，后续命令以“插入”语义执行；
   * - keep-gap：保留 gap 选区（用于本就执行插入节点的命令）。
   */
  const handleGapCursorBeforeAction = (
    gapPolicy: "insert-anchor" | "keep-gap",
  ) => {
    const { state, view } = editor;
    const { selection } = state;
    if (!(selection instanceof GapCursor)) return;
    if (gapPolicy === "keep-gap") return;

    const paragraph = state.schema.nodes.paragraph;
    if (!paragraph) return;

    const anchorPos = selection.from;
    let tr = state.tr.insert(anchorPos, paragraph.create());
    const nextPos = Math.min(anchorPos + 1, tr.doc.content.size);
    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(nextPos), 1));
    view.dispatch(tr);
  };

  /** 工具栏命令统一入口：先修正失焦锚点，再执行实际动作。 */
  const runToolbarAction = (
    action: () => void,
    options?: { gapPolicy?: "insert-anchor" | "keep-gap" },
  ) => {
    const gapPolicy = options?.gapPolicy ?? "insert-anchor";
    prepareEndAnchorWhenBlurred();
    handleGapCursorBeforeAction(gapPolicy);
    action();
  };

  const onTextColorSelect = (color: string) => {
    const current = (editor.getAttributes("textStyle").color ?? "")
      .trim()
      .toLowerCase();
    if (current && color.trim().toLowerCase() === current) {
      runToolbarAction(() => format.unsetColor());
    } else {
      runToolbarAction(() => format.setColor(color));
    }
    setShowColorPicker(null);
  };

  const onHighlightColorSelect = (color: string) => {
    if (color === "") {
      runToolbarAction(() => format.unsetHighlight());
    } else {
      const current = (editor.getAttributes("highlight").color ?? "")
        .trim()
        .toLowerCase();
      if (current === color.trim().toLowerCase()) {
        runToolbarAction(() => format.unsetHighlight());
      } else {
        runToolbarAction(() => format.setHighlight(color));
      }
    }
    setShowColorPicker(null);
  };

  const onHeadingSelect = (level: 1 | 2 | 3) => {
    runToolbarAction(() => block.toggleHeading(level));
    setShowHeadingMenu(false);
  };

  // 统一关闭工具栏所有浮层，避免多个 Popover 同时打开。
  const closeAllPopovers = () => {
    setShowColorPicker(null);
    setShowHeadingMenu(false);
    setShowTableSizePicker(false);
  };

  /** 判断关闭来源目标是否来自工具栏内部。 */
  const isInternalMenuTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest(".editor-toolbar-btn"));
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

  const isHeadingDisabled = isFocusNodeOnly || isInsideCodeBlock;
  const isColorDisabled = isToolbarLocked || isInsideCode;
  const isInsertTableDisabled = isInsideTable || isToolbarLocked;

  const renderContext: ToolbarRenderContext = {
    actionContext,
    locale,
    editor,
    showActiveState,
    isToolbarLocked,
    isCodeBlockToggleLocked,
    isInsideCode,
    isInsideTable,
    isFocusNodeOnly,
    isInsideCodeBlock,
    currentHeadingLevel,
    showHeadingMenu,
    showColorPicker,
    canUseMathDialog: !!onOpenMathDialog,
    canUseImageDialog: !!onOpenImageDialog,
    canUseFileUploadDialog: !!onOpenFileUploadDialog,
    runToolbarAction,
  };

  // 按配置渲染工具栏项，并按 group 自动插入分隔符。
  const renderedItems = items
    .map((item) => renderToolbarItem(item, renderContext))
    .filter((item): item is RenderedToolbarItem => item !== null);

  const renderItemElement = (item: RenderedToolbarItem) => {
    if (item.key === BuiltinToolbarItemKey.Highlight) {
      return (
        <Popover
          open={showColorPicker === "highlight"}
          onOpenChange={(open) => {
            if (open && isColorDisabled) return;
            if (open) {
              shouldNotifyOnCloseRef.current = true;
              setShowHeadingMenu(false);
              setShowTableSizePicker(false);
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
          <PopoverTrigger asChild>{item.element}</PopoverTrigger>
          <PopoverContent
            container={portalContainer ?? undefined}
            side="bottom"
            align="start"
            sideOffset={8}
            className="editor-toolbar-popover-panel"
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
      );
    }

    if (item.key === BuiltinToolbarItemKey.TextColor) {
      return (
        <Popover
          open={showColorPicker === "text"}
          onOpenChange={(open) => {
            if (open && isColorDisabled) return;
            if (open) {
              shouldNotifyOnCloseRef.current = true;
              setShowHeadingMenu(false);
              setShowTableSizePicker(false);
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
          <PopoverTrigger asChild>{item.element}</PopoverTrigger>
          <PopoverContent
            container={portalContainer ?? undefined}
            side="bottom"
            align="start"
            sideOffset={8}
            className="editor-toolbar-popover-panel"
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
      );
    }

    if (item.key === BuiltinToolbarItemKey.Heading) {
      return (
        <Popover
          open={showHeadingMenu}
          onOpenChange={(open) => {
            if (open && isHeadingDisabled) return;
            if (open) {
              shouldNotifyOnCloseRef.current = true;
              setShowColorPicker(null);
              setShowTableSizePicker(false);
            }
            setShowHeadingMenu(open);
            if (!open) {
              if (shouldNotifyOnCloseRef.current) {
                notifyPopoverClosed();
              }
              shouldNotifyOnCloseRef.current = true;
            }
          }}
        >
          <PopoverTrigger asChild>{item.element}</PopoverTrigger>
          <PopoverContent
            container={portalContainer ?? undefined}
            side="bottom"
            align="start"
            sideOffset={8}
            className="editor-toolbar-heading-menu"
            onInteractOutside={handlePopoverInteractOutside}
            onEscapeKeyDown={handlePopoverEscapeKeyDown}
          >
            {([1, 2, 3] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={`editor-toolbar-heading-item ${
                  showActiveState && currentHeadingLevel === level
                    ? "is-active"
                    : ""
                }`}
                onClick={() => onHeadingSelect(level)}
                title={locale.toolbar.headingLevel(level)}
              >
                <span className="editor-toolbar-heading-num">
                  H{["₁", "₂", "₃"][level - 1]}
                </span>
                <span>{locale.toolbar.headingLevel(level)}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      );
    }

    if (item.key === BuiltinToolbarItemKey.InsertTable) {
      return (
        <Popover
          open={showTableSizePicker}
          onOpenChange={(open) => {
            if (open && isInsertTableDisabled) return;
            if (open) {
              shouldNotifyOnCloseRef.current = true;
              setShowColorPicker(null);
              setShowHeadingMenu(false);
            }
            setShowTableSizePicker(open);
            if (!open) {
              if (shouldNotifyOnCloseRef.current) {
                notifyPopoverClosed();
              }
              shouldNotifyOnCloseRef.current = true;
            }
          }}
        >
          <PopoverTrigger asChild>{item.element}</PopoverTrigger>
          <PopoverContent
            container={portalContainer ?? undefined}
            side="bottom"
            align="start"
            sideOffset={8}
            className="editor-toolbar-table-size-popover"
            onInteractOutside={handlePopoverInteractOutside}
            onEscapeKeyDown={handlePopoverEscapeKeyDown}
          >
            <TableSizePicker
              onSelect={(rows, cols) => {
                runToolbarAction(() => block.insertTable({ rows, cols }), {
                  gapPolicy: "keep-gap",
                });
                closeAllPopovers();
              }}
              locale={locale}
            />
          </PopoverContent>
        </Popover>
      );
    }

    return item.element;
  };

  return (
    <div
      className="editor-toolbar"
      data-selection-key={selectionKey}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="editor-toolbar-inner">
        {renderedItems.map((item, index) => {
          const showSeparator =
            index > 0 && renderedItems[index - 1].group !== item.group;
          return (
            <Fragment key={item.key}>
              {showSeparator && <span className="editor-toolbar-separator" />}
              {renderItemElement(item)}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Toolbar;
