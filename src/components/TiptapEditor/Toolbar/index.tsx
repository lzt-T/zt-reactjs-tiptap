import type { Editor } from "@tiptap/react";
import { useState, useEffect } from "react";
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
  Sigma,
  SquareFunction,
  Image,
  FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorCommands } from "@/hooks";
import ColorPicker from "../ColorPicker";
import TableSizePicker from "../TableSizePicker";
import "./Toolbar.css";

interface ToolbarProps {
  editor: Editor;
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

const Toolbar = ({
  editor,
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
    !!editor &&
    (editor.isActive("inlineMath") ||
      editor.isActive("blockMath") ||
      editor.isActive("image") ||
      editor.isActive("fileAttachment"));

  /**
   * 是否处于行内代码（code mark）内。
   * Code mark 会排斥其他所有 inline mark，此时禁用 bold/italic/underline/strike/
   * highlight/color/superscript/subscript 等格式按钮（code 按钮本身保持启用）。
   */
  const isInsideCode = !!editor && editor.isActive("code");

  useEffect(() => {
    if (!editor) return;
    const onSelectionUpdate = () => {
      setSelectionKey((k) => k + 1);
      if (
        editor.isActive("inlineMath") ||
        editor.isActive("blockMath") ||
        editor.isActive("image") ||
        editor.isActive("code")
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

  const { refs: tableSizePickerRefs, floatingStyles: tableSizePickerFloatingStyles } =
    useFloating({
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

  const currentHeadingLevel = editor.isActive("heading", { level: 1 })
    ? 1
    : editor.isActive("heading", { level: 2 })
    ? 2
    : editor.isActive("heading", { level: 3 })
    ? 3
    : null;

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

  const onHeadingSelect = (level: 1 | 2 | 3) => {
    block.toggleHeading(level);
    setShowHeadingMenu(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <div
      className="editor-toolbar"
      data-selection-key={selectionKey}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="editor-toolbar-inner">
        <button
          type="button"
          ref={(el) => {
            if (showHeadingMenu) headingRefs.setReference(el);
          }}
          onClick={() => {
            if (isFocusNodeOnly) return;
            setShowHeadingMenu(!showHeadingMenu);
          }}
          className={cn(
            "editor-toolbar-btn",
            (showHeadingMenu || currentHeadingLevel !== null) && "is-active",
            isFocusNodeOnly && "is-disabled"
          )}
          title="Heading"
        >
          <span className="editor-toolbar-heading-btn">H</span>
          <ChevronDown size={14} className="editor-toolbar-chevron" />
        </button>
        <span className="editor-toolbar-separator" />
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("bulletList") && "is-active",
            isFocusNodeOnly && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly) return;
            block.toggleBulletList();
          }}
          title="Bullet list"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("orderedList") && "is-active",
            isFocusNodeOnly && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly) return;
            block.toggleOrderedList();
          }}
          title="Ordered list"
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("taskList") && "is-active",
            isFocusNodeOnly && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly) return;
            block.toggleTaskList();
          }}
          title="Task list"
        >
          <ListTodo size={16} />
        </button>
        <button
          type="button"
          ref={(el) => {
            if (showTableSizePicker) {
              tableSizePickerRefs.setReference(el);
            }
          }}
          className={cn(
            "editor-toolbar-btn",
            (editor.isActive("table") || isFocusNodeOnly) && "is-disabled"
          )}
          onClick={() => {
            if (editor.isActive("table") || isFocusNodeOnly) return;
            setShowTableSizePicker(true);
          }}
          title="Insert table"
        >
          <Table size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            (!onOpenMathDialog || isFocusNodeOnly) && "is-disabled"
          )}
          onClick={() => {
            if (!onOpenMathDialog || isFocusNodeOnly) return;
            dialogs.openInlineMath();
          }}
          title="Inline math"
        >
          <Sigma size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            (!onOpenMathDialog || isFocusNodeOnly) && "is-disabled"
          )}
          onClick={() => {
            if (!onOpenMathDialog || isFocusNodeOnly) return;
            dialogs.openBlockMath();
          }}
          title="Block math"
        >
          <SquareFunction size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            (!onOpenImageDialog || isFocusNodeOnly) && "is-disabled"
          )}
          onClick={() => {
            if (!onOpenImageDialog || isFocusNodeOnly) return;
            dialogs.openImage();
          }}
          title="Image"
        >
          <Image size={16} />
        </button>
        {onOpenFileUploadDialog && (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              isFocusNodeOnly && "is-disabled"
            )}
            onClick={() => {
              if (isFocusNodeOnly) return;
              dialogs.openFileUpload();
            }}
            title="Upload attachment"
          >
            <FileUp size={16} />
          </button>
        )}
        <span className="editor-toolbar-separator" />
                <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("bold") && "is-active",
            (isFocusNodeOnly || isInsideCode) && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly || isInsideCode) return;
            format.toggleBold();
          }}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("italic") && "is-active",
            (isFocusNodeOnly || isInsideCode) && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly || isInsideCode) return;
            format.toggleItalic();
          }}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("underline") && "is-active",
            (isFocusNodeOnly || isInsideCode) && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly || isInsideCode) return;
            format.toggleUnderline();
          }}
          title="Underline (Ctrl+U)"
        >
          <Underline size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("strike") && "is-active",
            (isFocusNodeOnly || isInsideCode) && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly || isInsideCode) return;
            format.toggleStrike();
          }}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("code") && "is-active",
            isFocusNodeOnly && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly) return;
            format.toggleCode();
          }}
          title="Inline code"
        >
          <Code size={16} />
        </button>
        <span className="editor-toolbar-separator" />
        <button
          type="button"
          ref={(el) => {
            if (showColorPicker === "highlight") {
              refs.setReference(el);
            }
          }}
          onClick={() => {
            if (isFocusNodeOnly || isInsideCode) return;
            setShowColorPicker(
              showColorPicker === "highlight" ? null : "highlight"
            );
          }}
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("highlight") && "is-active",
            (isFocusNodeOnly || isInsideCode) && "is-disabled"
          )}
          title="Highlight"
        >
          <Highlighter size={16} />
        </button>
        <button
          type="button"
          ref={(el) => {
            if (showColorPicker === "text") {
              refs.setReference(el);
            }
          }}
          onClick={() => {
            if (isFocusNodeOnly || isInsideCode) return;
            setShowColorPicker(showColorPicker === "text" ? null : "text");
          }}
          className={cn(
            "editor-toolbar-btn",
            !!editor.getAttributes("textStyle").color && "is-active",
            (isFocusNodeOnly || isInsideCode) && "is-disabled"
          )}
          title="Text color"
        >
          <Palette size={16} />
        </button>
        <span className="editor-toolbar-separator" />
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("superscript") && "is-active",
            (isFocusNodeOnly || isInsideCode) && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly || isInsideCode) return;
            format.toggleSuperscript();
          }}
          title="Superscript"
        >
          <Superscript size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive("subscript") && "is-active",
            (isFocusNodeOnly || isInsideCode) && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly || isInsideCode) return;
            format.toggleSubscript();
          }}
          title="Subscript"
        >
          <Subscript size={16} />
        </button>
        <span className="editor-toolbar-separator" />
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive({ textAlign: "left" }) && "is-active",
            isFocusNodeOnly && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly) return;
            format.setTextAlign("left");
          }}
          title="Align left"
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive({ textAlign: "center" }) && "is-active",
            isFocusNodeOnly && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly) return;
            format.setTextAlign("center");
          }}
          title="Align center"
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive({ textAlign: "right" }) && "is-active",
            isFocusNodeOnly && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly) return;
            format.setTextAlign("right");
          }}
          title="Align right"
        >
          <AlignRight size={16} />
        </button>
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            editor.isActive({ textAlign: "justify" }) && "is-active",
            isFocusNodeOnly && "is-disabled"
          )}
          onClick={() => {
            if (isFocusNodeOnly) return;
            format.setTextAlign("justify");
          }}
          title="Justify"
        >
          <AlignJustify size={16} />
        </button>
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
                  currentHeadingLevel === level ? "is-active" : ""
                }`}
                onClick={() => onHeadingSelect(level)}
                title={`Heading ${level}`}
              >
                <span className="editor-toolbar-heading-num">
                  H{["₁", "₂", "₃"][level - 1]}
                </span>
                <span>Heading {level}</span>
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
                block.insertTable({ rows, cols });
                setShowTableSizePicker(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Toolbar;
