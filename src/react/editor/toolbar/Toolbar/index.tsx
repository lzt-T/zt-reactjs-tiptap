import type { Editor } from "@tiptap/react";
import { useState, useEffect, useMemo, Fragment } from "react";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Palette,
  Superscript,
  Subscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  List,
  ListOrdered,
  ListTodo,
  Table,
  SquareCode,
  Sigma,
  SquareFunction,
  Image,
  FileUp,
} from "lucide-react";
import { cn } from "@/shared/utils/utils";
import { useEditorCommands } from "@/react/hooks";
import ColorPicker from "@/react/editor/toolbar/ColorPicker";
import TableSizePicker from "@/react/editor/table/TableSizePicker";
import type { EditorLocale } from "@/shared/locales";
import {
  BuiltinToolbarItemKey,
  type EditorActionContext,
  type ToolbarItemConfig,
} from "@/react/editor/customization";
import "./Toolbar.css";

interface ToolbarProps {
  editor: Editor;
  locale: EditorLocale;
  items: ToolbarItemConfig[];
  /** 是否处于编辑器聚焦态；失焦时不展示激活高亮。 */
  isEditorFocused?: boolean;
  /** 打开数学公式弹窗（headless 时由 TiptapEditor 传入） */
  onOpenMathDialog?: (
    type: "inline" | "block",
    initialValue: string,
    callback: (latex: string) => void
  ) => void;
  /** 打开图片上传弹窗（headless 时由 TiptapEditor 传入） */
  onOpenImageDialog?: (callback: (src: string, alt?: string) => void) => void;
  /** 打开附件上传弹窗（headless 时由 TiptapEditor 传入） */
  onOpenFileUploadDialog?: (
    callback: (url: string, name: string) => void
  ) => void;
}

/** 工具栏项渲染后的中间结构。 */
interface RenderedToolbarItem {
  key: string;
  group: string;
  element: React.ReactElement;
}

/** 内置项默认分组：当外部未显式传 group 时回退到此映射。 */
const BUILTIN_GROUP_MAP: Record<string, string> = {
  [BuiltinToolbarItemKey.Heading]: "block",
  [BuiltinToolbarItemKey.BulletList]: "block",
  [BuiltinToolbarItemKey.OrderedList]: "block",
  [BuiltinToolbarItemKey.TaskList]: "block",
  [BuiltinToolbarItemKey.InsertTable]: "block",
  [BuiltinToolbarItemKey.CodeBlock]: "block",
  [BuiltinToolbarItemKey.InlineMath]: "insert",
  [BuiltinToolbarItemKey.BlockMath]: "insert",
  [BuiltinToolbarItemKey.Image]: "insert",
  [BuiltinToolbarItemKey.UploadAttachment]: "insert",
  [BuiltinToolbarItemKey.Bold]: "format",
  [BuiltinToolbarItemKey.Italic]: "format",
  [BuiltinToolbarItemKey.Underline]: "format",
  [BuiltinToolbarItemKey.Strikethrough]: "format",
  [BuiltinToolbarItemKey.InlineCode]: "format",
  [BuiltinToolbarItemKey.Highlight]: "color",
  [BuiltinToolbarItemKey.TextColor]: "color",
  [BuiltinToolbarItemKey.Superscript]: "script",
  [BuiltinToolbarItemKey.Subscript]: "script",
  [BuiltinToolbarItemKey.AlignLeft]: "align",
  [BuiltinToolbarItemKey.AlignCenter]: "align",
  [BuiltinToolbarItemKey.AlignRight]: "align",
  [BuiltinToolbarItemKey.AlignJustify]: "align",
};

const Toolbar = ({
  editor,
  locale,
  items,
  isEditorFocused = true,
  onOpenMathDialog,
  onOpenImageDialog,
  onOpenFileUploadDialog,
}: ToolbarProps) => {
  const [showColorPicker, setShowColorPicker] = useState<
    "text" | "highlight" | null
  >(null);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showTableSizePicker, setShowTableSizePicker] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isHeadingMenuReady, setIsHeadingMenuReady] = useState(false);
  const [isTableSizePickerReady, setIsTableSizePickerReady] = useState(false);
  /** 选区/内容变化时自增，用于让工具栏根据当前选区重新计算 isActive 并重渲染 */
  const [selectionKey, setSelectionKey] = useState(0);

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
  const isInsideCodeBlock = isEditorFocused && editor.isActive("codeBlock");
  /** 光标是否位于表格。失焦时回到初始可用态。 */
  const isInsideTable = isEditorFocused && editor.isActive("table");
  /** 统一的工具栏禁用条件：特殊节点或代码块中均禁用。 */
  const isToolbarLocked = isFocusNodeOnly || isInsideCodeBlock;
  /** 代码块切换按钮例外：在代码块内仍可用，仅在特殊节点内禁用。 */
  const isCodeBlockToggleLocked = isFocusNodeOnly;
  /** 失焦时不显示按钮激活态。 */
  const showActiveState = isEditorFocused;

  /**
   * 是否处于行内代码（code mark）内。
   * Code mark 会排斥其他所有 inline mark，此时禁用 bold/italic/underline/strike/
   * highlight/color/superscript/subscript 等格式按钮（code 按钮本身保持启用）。
   */
  const isInsideCode = isEditorFocused && editor.isActive("code");

  useEffect(() => {
    if (!editor) return;
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
  }, [editor]);

  useEffect(() => {
    if (isEditorFocused) return;
    setShowColorPicker(null);
    setShowHeadingMenu(false);
    setShowTableSizePicker(false);
  }, [isEditorFocused]);

  const { refs, floatingStyles } = useFloating({
    open: showColorPicker !== null,
    placement: "bottom-start",
    middleware: [offset(8), flip({ padding: 16 }), shift({ padding: 16 })],
  });

  const { refs: headingRefs, floatingStyles: headingFloatingStyles } =
    useFloating({
      open: showHeadingMenu,
      placement: "bottom-start",
      middleware: [offset(8), flip({ padding: 16 }), shift({ padding: 16 })],
    });

  const {
    refs: tableSizePickerRefs,
    floatingStyles: tableSizePickerFloatingStyles,
  } = useFloating({
    open: showTableSizePicker,
    placement: "bottom-start",
    middleware: [offset(8), flip({ padding: 16 }), shift({ padding: 16 })],
  });

  useEffect(() => {
    if (showColorPicker) {
      const t0 = setTimeout(() => setIsReady(false), 0);
      const t = setTimeout(() => setIsReady(true), 50);
      return () => {
        clearTimeout(t0);
        clearTimeout(t);
      };
    }
    const t = setTimeout(() => setIsReady(false), 0);
    return () => clearTimeout(t);
  }, [showColorPicker]);

  useEffect(() => {
    if (showHeadingMenu) {
      const t0 = setTimeout(() => setIsHeadingMenuReady(false), 0);
      const t = setTimeout(() => setIsHeadingMenuReady(true), 50);
      return () => {
        clearTimeout(t0);
        clearTimeout(t);
      };
    }
    const t = setTimeout(() => setIsHeadingMenuReady(false), 0);
    return () => clearTimeout(t);
  }, [showHeadingMenu]);

  useEffect(() => {
    if (showTableSizePicker) {
      const t0 = setTimeout(() => setIsTableSizePickerReady(false), 0);
      const t = setTimeout(() => setIsTableSizePickerReady(true), 50);
      return () => {
        clearTimeout(t0);
        clearTimeout(t);
      };
    }
    const t = setTimeout(() => setIsTableSizePickerReady(false), 0);
    return () => clearTimeout(t);
  }, [showTableSizePicker]);

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
    [editor, locale, format, block, dialogs]
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

  /** 工具栏命令统一入口：先修正失焦锚点，再执行实际动作。 */
  const runToolbarAction = (action: () => void) => {
    prepareEndAnchorWhenBlurred();
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

  if (!editor) {
    return null;
  }

  /** 解析每个工具栏项的分组，缺省时按内置映射或 fallback。 */
  const resolveItemGroup = (item: ToolbarItemConfig): string => {
    if (item.group) return item.group;
    if (item.type === "builtin") {
      return BUILTIN_GROUP_MAP[item.key] ?? "builtin";
    }
    return "custom";
  };

  /** 渲染单个工具栏项（内置 + 自定义）。 */
  const renderToolbarItem = (
    item: ToolbarItemConfig
  ): RenderedToolbarItem | null => {
    const group = resolveItemGroup(item);

    if (item.type === "custom") {
      const disabled = item.isDisabled?.(actionContext) ?? false;
      const active = item.isActive?.(actionContext) ?? false;
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              showActiveState && active && "is-active",
              disabled && "is-disabled"
            )}
            onClick={() => {
              if (disabled) return;
              item.onClick(actionContext);
            }}
            title={item.title}
          >
            {item.icon ?? <span>{item.title}</span>}
          </button>
        ),
      };
    }

    switch (item.key) {
      case BuiltinToolbarItemKey.Heading:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              ref={(el) => {
                if (showHeadingMenu) headingRefs.setReference(el);
              }}
              onClick={() => {
                if (isFocusNodeOnly) return;
                if (isInsideCodeBlock) return;
                setShowHeadingMenu(!showHeadingMenu);
              }}
              className={cn(
                "editor-toolbar-btn",
                showActiveState &&
                  (showHeadingMenu || currentHeadingLevel !== null) &&
                  "is-active",
                isToolbarLocked && "is-disabled"
              )}
              title={locale.toolbar.heading}
            >
              <span className="editor-toolbar-heading-btn">H</span>
              <ChevronDown size={14} className="editor-toolbar-chevron" />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.BulletList:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("bulletList") && "is-active",
                isToolbarLocked && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked) return;
                runToolbarAction(() => block.toggleBulletList());
              }}
              title={locale.toolbar.bulletList}
            >
              <List size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.OrderedList:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("orderedList") && "is-active",
                isToolbarLocked && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked) return;
                runToolbarAction(() => block.toggleOrderedList());
              }}
              title={locale.toolbar.orderedList}
            >
              <ListOrdered size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.TaskList:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("taskList") && "is-active",
                isToolbarLocked && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked) return;
                runToolbarAction(() => block.toggleTaskList());
              }}
              title={locale.toolbar.taskList}
            >
              <ListTodo size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.InsertTable:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              ref={(el) => {
                if (showTableSizePicker) {
                  tableSizePickerRefs.setReference(el);
                }
              }}
              className={cn(
                "editor-toolbar-btn",
                (isInsideTable || isToolbarLocked) && "is-disabled"
              )}
              onClick={() => {
                if (isInsideTable || isToolbarLocked) return;
                setShowTableSizePicker(true);
              }}
              title={locale.toolbar.insertTable}
            >
              <Table size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.CodeBlock:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("codeBlock") && "is-active",
                isCodeBlockToggleLocked && "is-disabled"
              )}
              onClick={() => {
                if (isCodeBlockToggleLocked) return;
                runToolbarAction(() => block.toggleCodeBlock());
              }}
              title={locale.toolbar.codeBlock}
            >
              <SquareCode size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.InlineMath:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                (!onOpenMathDialog || isToolbarLocked) && "is-disabled"
              )}
              onClick={() => {
                if (!onOpenMathDialog || isToolbarLocked) return;
                runToolbarAction(() => dialogs.openInlineMath());
              }}
              title={locale.toolbar.inlineMath}
            >
              <Sigma size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.BlockMath:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                (!onOpenMathDialog || isToolbarLocked) && "is-disabled"
              )}
              onClick={() => {
                if (!onOpenMathDialog || isToolbarLocked) return;
                runToolbarAction(() => dialogs.openBlockMath());
              }}
              title={locale.toolbar.blockMath}
            >
              <SquareFunction size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.Image:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                (!onOpenImageDialog || isToolbarLocked) && "is-disabled"
              )}
              onClick={() => {
                if (!onOpenImageDialog || isToolbarLocked) return;
                runToolbarAction(() => dialogs.openImage());
              }}
              title={locale.toolbar.image}
            >
              <Image size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.UploadAttachment:
        if (!onOpenFileUploadDialog) return null;
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                isToolbarLocked && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked) return;
                runToolbarAction(() => dialogs.openFileUpload());
              }}
              title={locale.toolbar.uploadAttachment}
            >
              <FileUp size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.Bold:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("bold") && "is-active",
                (isToolbarLocked || isInsideCode) && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked || isInsideCode) return;
                runToolbarAction(() => format.toggleBold());
              }}
              title={locale.toolbar.bold}
            >
              <Bold size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.Italic:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("italic") && "is-active",
                (isToolbarLocked || isInsideCode) && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked || isInsideCode) return;
                runToolbarAction(() => format.toggleItalic());
              }}
              title={locale.toolbar.italic}
            >
              <Italic size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.Underline:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("underline") && "is-active",
                (isToolbarLocked || isInsideCode) && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked || isInsideCode) return;
                runToolbarAction(() => format.toggleUnderline());
              }}
              title={locale.toolbar.underline}
            >
              <Underline size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.Strikethrough:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("strike") && "is-active",
                (isToolbarLocked || isInsideCode) && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked || isInsideCode) return;
                runToolbarAction(() => format.toggleStrike());
              }}
              title={locale.toolbar.strikethrough}
            >
              <Strikethrough size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.InlineCode:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("code") && "is-active",
                isToolbarLocked && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked) return;
                runToolbarAction(() => format.toggleCode());
              }}
              title={locale.toolbar.inlineCode}
            >
              <Code size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.Highlight:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              ref={(el) => {
                if (showColorPicker === "highlight") {
                  refs.setReference(el);
                }
              }}
              onClick={() => {
                if (isToolbarLocked || isInsideCode) return;
                setShowColorPicker(
                  showColorPicker === "highlight" ? null : "highlight"
                );
              }}
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("highlight") && "is-active",
                (isToolbarLocked || isInsideCode) && "is-disabled"
              )}
              title={locale.toolbar.highlight}
            >
              <Highlighter size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.TextColor:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              ref={(el) => {
                if (showColorPicker === "text") {
                  refs.setReference(el);
                }
              }}
              onClick={() => {
                if (isToolbarLocked || isInsideCode) return;
                setShowColorPicker(showColorPicker === "text" ? null : "text");
              }}
              className={cn(
                "editor-toolbar-btn",
                showActiveState &&
                  !!editor.getAttributes("textStyle").color &&
                  "is-active",
                (isToolbarLocked || isInsideCode) && "is-disabled"
              )}
              title={locale.toolbar.textColor}
            >
              <Palette size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.Superscript:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("superscript") && "is-active",
                (isToolbarLocked || isInsideCode) && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked || isInsideCode) return;
                runToolbarAction(() => format.toggleSuperscript());
              }}
              title={locale.toolbar.superscript}
            >
              <Superscript size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.Subscript:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState && editor.isActive("subscript") && "is-active",
                (isToolbarLocked || isInsideCode) && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked || isInsideCode) return;
                runToolbarAction(() => format.toggleSubscript());
              }}
              title={locale.toolbar.subscript}
            >
              <Subscript size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.AlignLeft:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState &&
                  editor.isActive({ textAlign: "left" }) &&
                  "is-active",
                isToolbarLocked && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked) return;
                runToolbarAction(() => format.setTextAlign("left"));
              }}
              title={locale.toolbar.alignLeft}
            >
              <AlignLeft size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.AlignCenter:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState &&
                  editor.isActive({ textAlign: "center" }) &&
                  "is-active",
                isToolbarLocked && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked) return;
                runToolbarAction(() => format.setTextAlign("center"));
              }}
              title={locale.toolbar.alignCenter}
            >
              <AlignCenter size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.AlignRight:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState &&
                  editor.isActive({ textAlign: "right" }) &&
                  "is-active",
                isToolbarLocked && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked) return;
                runToolbarAction(() => format.setTextAlign("right"));
              }}
              title={locale.toolbar.alignRight}
            >
              <AlignRight size={16} />
            </button>
          ),
        };
      case BuiltinToolbarItemKey.AlignJustify:
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn(
                "editor-toolbar-btn",
                showActiveState &&
                  editor.isActive({ textAlign: "justify" }) &&
                  "is-active",
                isToolbarLocked && "is-disabled"
              )}
              onClick={() => {
                if (isToolbarLocked) return;
                runToolbarAction(() => format.setTextAlign("justify"));
              }}
              title={locale.toolbar.justify}
            >
              <AlignJustify size={16} />
            </button>
          ),
        };
      default:
        return null;
    }
  };

  // 按配置渲染工具栏项，并按 group 自动插入分隔符。
  const renderedItems = items
    .map(renderToolbarItem)
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

      {showColorPicker && (
        <>
          <div
            className="editor-toolbar-overlay"
            onClick={() => setShowColorPicker(null)}
            aria-hidden
          />
          <div
            ref={(el) => refs.setFloating(el)}
            className="editor-toolbar-dropdown"
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

      {showHeadingMenu && (
        <>
          <div
            className="editor-toolbar-overlay"
            onClick={() => setShowHeadingMenu(false)}
            aria-hidden
          />
          <div
            ref={(el) => headingRefs.setFloating(el)}
            className="editor-toolbar-heading-menu"
            style={{
              ...headingFloatingStyles,
              opacity: isHeadingMenuReady ? 1 : 0,
              transition: "opacity 0.1s ease",
            }}
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
          </div>
        </>
      )}

      {showTableSizePicker && (
        <>
          <div
            className="editor-toolbar-overlay"
            onClick={() => setShowTableSizePicker(false)}
            aria-hidden
          />
          <div
            ref={(el) => tableSizePickerRefs.setFloating(el)}
            className="editor-toolbar-table-size-dropdown"
            style={{
              ...tableSizePickerFloatingStyles,
              opacity: isTableSizePickerReady ? 1 : 0,
              transition: "opacity 0.1s ease",
            }}
          >
            <TableSizePicker
              onSelect={(rows, cols) => {
                runToolbarAction(() => block.insertTable({ rows, cols }));
                setShowTableSizePicker(false);
              }}
              locale={locale}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Toolbar;
