import { Fragment, useEffect, useMemo, useState } from "react";
import { GapCursor } from "@tiptap/pm/gapcursor";
import { TextSelection } from "@tiptap/pm/state";
import { useEditorCommands } from "@/react/hooks";
import type { EditorActionContext } from "@/react/editor/customization";
import { renderToolbarItem } from "./renderers/renderToolbarItem";
import { ColorPickerDropdown } from "./renderers/ColorPickerDropdown";
import { HeadingMenuDropdown } from "./renderers/HeadingMenuDropdown";
import { TableSizePickerDropdown } from "./renderers/TableSizePickerDropdown";
import type { RenderedToolbarItem, ToolbarProps, ToolbarRenderContext } from "./types";
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
}: ToolbarProps) => {
  /** 选区/内容变化时自增，用于让工具栏根据当前选区重新计算 isActive 并重渲染 */
  const [selectionKey, setSelectionKey] = useState(0);

  const {
    showColorPicker,
    setShowColorPicker,
    showHeadingMenu,
    setShowHeadingMenu,
    showTableSizePicker,
    setShowTableSizePicker,
    isColorPickerReady,
    isHeadingMenuReady,
    isTableSizePickerReady,
    colorPickerRefs,
    colorPickerFloatingStyles,
    headingMenuRefs,
    headingMenuFloatingStyles,
    tableSizePickerRefs,
    tableSizePickerFloatingStyles,
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
    onToggleHeadingMenu: () => setShowHeadingMenu(!showHeadingMenu),
    onToggleColorPicker: (type) => {
      setShowColorPicker(showColorPicker === type ? null : type);
    },
    onOpenTableSizePicker: () => setShowTableSizePicker(true),
    setHeadingReference: (el) => {
      if (showHeadingMenu) {
        headingMenuRefs.setReference(el);
      }
    },
    setColorReference: (el, type) => {
      if (showColorPicker === type) {
        colorPickerRefs.setReference(el);
      }
    },
    setTableSizeReference: (el) => {
      if (showTableSizePicker) {
        tableSizePickerRefs.setReference(el);
      }
    },
  };

  // 按配置渲染工具栏项，并按 group 自动插入分隔符。
  const renderedItems = items
    .map((item) => renderToolbarItem(item, renderContext))
    .filter((item): item is RenderedToolbarItem => item !== null);

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
              {item.element}
            </Fragment>
          );
        })}
      </div>

      <ColorPickerDropdown
        showColorPicker={showColorPicker}
        onClose={() => setShowColorPicker(null)}
        setFloating={colorPickerRefs.setFloating}
        floatingStyles={colorPickerFloatingStyles}
        isReady={isColorPickerReady}
        editor={editor}
        locale={locale}
        onTextColorSelect={onTextColorSelect}
        onHighlightColorSelect={onHighlightColorSelect}
      />

      <HeadingMenuDropdown
        showHeadingMenu={showHeadingMenu}
        onClose={() => setShowHeadingMenu(false)}
        setFloating={headingMenuRefs.setFloating}
        floatingStyles={headingMenuFloatingStyles}
        isReady={isHeadingMenuReady}
        showActiveState={showActiveState}
        currentHeadingLevel={currentHeadingLevel}
        locale={locale}
        onHeadingSelect={onHeadingSelect}
      />

      <TableSizePickerDropdown
        showTableSizePicker={showTableSizePicker}
        onClose={() => setShowTableSizePicker(false)}
        setFloating={tableSizePickerRefs.setFloating}
        floatingStyles={tableSizePickerFloatingStyles}
        isReady={isTableSizePickerReady}
        locale={locale}
        onSelect={(rows, cols) => {
          runToolbarAction(
            () => block.insertTable({ rows, cols }),
            { gapPolicy: "keep-gap" },
          );
          setShowTableSizePicker(false);
        }}
      />
    </div>
  );
};

export default Toolbar;
