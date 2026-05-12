import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Highlighter,
  Palette,
  Superscript,
  Subscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ListIndentDecrease,
  ListIndentIncrease,
  ChevronDown,
  List,
  ListOrdered,
  ListTodo,
  MessageSquareQuote,
  Table,
  SquareCode,
  Sigma,
  SquareFunction,
  Image,
  Video,
  FileUp,
} from "lucide-react";
import { cn } from "@/shared/utils/utils";
import {
  BuiltinToolbarItemKey,
  type ToolbarItemConfig,
} from "@/react/editor/customization";
import { isInlineCodeMarkControlDisabled } from "@/react/editor/toolbar/shared/markDisableRules";
import type { RenderedToolbarItem, ToolbarRenderContext } from "../types";
import { BUILTIN_GROUP_MAP } from "../constants";

/** 解析每个工具栏项的分组，缺省时按内置映射或 fallback。 */
function resolveItemGroup(item: ToolbarItemConfig): string {
  if (item.group) return item.group;
  if (item.type === "builtin") {
    return BUILTIN_GROUP_MAP[item.key] ?? "builtin";
  }
  return "custom";
}

/** 渲染单个工具栏项（内置 + 自定义）。 */
export function renderToolbarItem(
  item: ToolbarItemConfig,
  ctx: ToolbarRenderContext,
): RenderedToolbarItem | null {
  const group = resolveItemGroup(item);

  if (item.type === "custom") {
    const disabled = item.isDisabled?.(ctx.actionContext) ?? false;
    const active =
      ctx.showActiveState && (item.isActive?.(ctx.actionContext) ?? false);
    return {
      key: item.key,
      group,
      element: (
        <button
          type="button"
          className={cn(
            "editor-toolbar-btn",
            ctx.showActiveState && active && "is-active",
            disabled && "is-disabled",
          )}
          onClick={() => {
            if (disabled) return;
            item.onClick(ctx.actionContext);
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
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState &&
                (ctx.showHeadingMenu || ctx.currentHeadingLevel !== null) &&
                "is-active",
              ctx.isToolbarLocked && "is-disabled",
            )}
            title={ctx.locale.toolbar.heading}
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
              ctx.showActiveState &&
                ctx.editor.isActive("bulletList") &&
                "is-active",
              ctx.isToolbarLocked && "is-disabled",
            )}
            onClick={() => {
              if (ctx.isToolbarLocked) return;
              ctx.runToolbarAction(() => ctx.actionContext.block.toggleBulletList());
            }}
            title={ctx.locale.toolbar.bulletList}
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
              ctx.showActiveState &&
                ctx.editor.isActive("orderedList") &&
                "is-active",
              ctx.isToolbarLocked && "is-disabled",
            )}
            onClick={() => {
              if (ctx.isToolbarLocked) return;
              ctx.runToolbarAction(() => ctx.actionContext.block.toggleOrderedList());
            }}
            title={ctx.locale.toolbar.orderedList}
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
              ctx.showActiveState &&
                ctx.editor.isActive("taskList") &&
                "is-active",
              ctx.isToolbarLocked && "is-disabled",
            )}
            onClick={() => {
              if (ctx.isToolbarLocked) return;
              ctx.runToolbarAction(() => ctx.actionContext.block.toggleTaskList());
            }}
            title={ctx.locale.toolbar.taskList}
          >
            <ListTodo size={16} />
          </button>
        ),
      };
    case BuiltinToolbarItemKey.Blockquote:
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState &&
                ctx.editor.isActive("blockquote") &&
                "is-active",
              ctx.isToolbarLocked && "is-disabled",
            )}
            onClick={() => {
              if (ctx.isToolbarLocked) return;
              ctx.runToolbarAction(() =>
                ctx.actionContext.block.toggleBlockquote(),
              );
            }}
            title={ctx.locale.toolbar.blockquote}
          >
            <MessageSquareQuote size={16} />
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
            className={cn(
              "editor-toolbar-btn",
              (ctx.isInsideTable || ctx.isToolbarLocked) && "is-disabled",
            )}
            title={ctx.locale.toolbar.insertTable}
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
              ctx.showActiveState &&
                ctx.editor.isActive("codeBlock") &&
                "is-active",
              ctx.isCodeBlockToggleLocked && "is-disabled",
            )}
            onClick={() => {
              if (ctx.isCodeBlockToggleLocked) return;
              ctx.runToolbarAction(() => ctx.actionContext.block.toggleCodeBlock());
            }}
            title={ctx.locale.toolbar.codeBlock}
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
              (!ctx.canUseMathDialog || ctx.isToolbarLocked) && "is-disabled",
            )}
            onClick={() => {
              if (!ctx.canUseMathDialog || ctx.isToolbarLocked) return;
              ctx.runToolbarAction(
                () => ctx.actionContext.dialogs.openInlineMath(),
                { gapPolicy: "keep-gap" },
              );
            }}
            title={ctx.locale.toolbar.inlineMath}
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
              (!ctx.canUseMathDialog || ctx.isToolbarLocked) && "is-disabled",
            )}
            onClick={() => {
              if (!ctx.canUseMathDialog || ctx.isToolbarLocked) return;
              ctx.runToolbarAction(
                () => ctx.actionContext.dialogs.openBlockMath(),
                { gapPolicy: "keep-gap" },
              );
            }}
            title={ctx.locale.toolbar.blockMath}
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
              (!ctx.canUseImageDialog || ctx.isToolbarLocked) && "is-disabled",
            )}
            onClick={() => {
              if (!ctx.canUseImageDialog || ctx.isToolbarLocked) return;
              ctx.runToolbarAction(
                () => ctx.actionContext.dialogs.openImage(),
                { gapPolicy: "keep-gap" },
              );
            }}
            title={ctx.locale.toolbar.image}
          >
            <Image size={16} />
          </button>
        ),
      };
    case BuiltinToolbarItemKey.UploadAttachment:
      if (!ctx.canUseFileUploadDialog) return null;
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn("editor-toolbar-btn", ctx.isToolbarLocked && "is-disabled")}
            onClick={() => {
              if (ctx.isToolbarLocked) return;
              ctx.runToolbarAction(
                () => ctx.actionContext.dialogs.openFileUpload(),
                { gapPolicy: "keep-gap" },
              );
            }}
            title={ctx.locale.toolbar.uploadAttachment}
          >
            <FileUp size={16} />
          </button>
        ),
      };
    case BuiltinToolbarItemKey.Bold: {
      // inline code 内禁用加粗等互斥 mark。
      const isBoldDisabled =
        ctx.isToolbarLocked ||
        isInlineCodeMarkControlDisabled(ctx.isInsideCode, "bold");
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState && ctx.editor.isActive("bold") && "is-active",
              isBoldDisabled && "is-disabled",
            )}
            onClick={() => {
              if (isBoldDisabled) return;
              ctx.runToolbarAction(() => ctx.actionContext.format.toggleBold());
            }}
            title={ctx.locale.toolbar.bold}
          >
            <Bold size={16} />
          </button>
        ),
      };
    }
    case BuiltinToolbarItemKey.Italic: {
      const isItalicDisabled =
        ctx.isToolbarLocked ||
        isInlineCodeMarkControlDisabled(ctx.isInsideCode, "italic");
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState && ctx.editor.isActive("italic") && "is-active",
              isItalicDisabled && "is-disabled",
            )}
            onClick={() => {
              if (isItalicDisabled) return;
              ctx.runToolbarAction(() => ctx.actionContext.format.toggleItalic());
            }}
            title={ctx.locale.toolbar.italic}
          >
            <Italic size={16} />
          </button>
        ),
      };
    }
    case BuiltinToolbarItemKey.Underline: {
      const isUnderlineDisabled =
        ctx.isToolbarLocked ||
        isInlineCodeMarkControlDisabled(ctx.isInsideCode, "underline");
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState &&
                ctx.editor.isActive("underline") &&
                "is-active",
              isUnderlineDisabled && "is-disabled",
            )}
            onClick={() => {
              if (isUnderlineDisabled) return;
              ctx.runToolbarAction(() => ctx.actionContext.format.toggleUnderline());
            }}
            title={ctx.locale.toolbar.underline}
          >
            <Underline size={16} />
          </button>
        ),
      };
    }
    case BuiltinToolbarItemKey.Strikethrough: {
      const isStrikethroughDisabled =
        ctx.isToolbarLocked ||
        isInlineCodeMarkControlDisabled(ctx.isInsideCode, "strikethrough");
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState && ctx.editor.isActive("strike") && "is-active",
              isStrikethroughDisabled && "is-disabled",
            )}
            onClick={() => {
              if (isStrikethroughDisabled) return;
              ctx.runToolbarAction(() => ctx.actionContext.format.toggleStrike());
            }}
            title={ctx.locale.toolbar.strikethrough}
          >
            <Strikethrough size={16} />
          </button>
        ),
      };
    }
    case BuiltinToolbarItemKey.InlineCode: {
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState && ctx.editor.isActive("code") && "is-active",
              ctx.isToolbarLocked && "is-disabled",
            )}
            onClick={() => {
              if (ctx.isToolbarLocked) return;
              ctx.runToolbarAction(() => ctx.actionContext.format.toggleCode());
            }}
            title={ctx.locale.toolbar.inlineCode}
          >
            <Code size={16} />
          </button>
        ),
      };
    }
    case BuiltinToolbarItemKey.Link: {
      const isLinkDisabled =
        ctx.isToolbarLocked ||
        isInlineCodeMarkControlDisabled(ctx.isInsideCode, "link");
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState && ctx.editor.isActive("link") && "is-active",
              isLinkDisabled && "is-disabled",
            )}
            title={ctx.locale.toolbar.link}
          >
            <LinkIcon size={16} />
          </button>
        ),
      };
    }
    case BuiltinToolbarItemKey.Video:
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              (!ctx.canUseVideoDialog || ctx.isToolbarLocked) && "is-disabled",
            )}
            onClick={() => {
              if (!ctx.canUseVideoDialog || ctx.isToolbarLocked) return;
              ctx.runToolbarAction(
                () => ctx.actionContext.dialogs.openVideo(),
                { gapPolicy: "keep-gap" },
              );
            }}
            title={ctx.locale.toolbar.video}
          >
            <Video size={16} />
          </button>
        ),
      };
    case BuiltinToolbarItemKey.Highlight: {
      const isHighlightDisabled =
        ctx.isToolbarLocked ||
        isInlineCodeMarkControlDisabled(ctx.isInsideCode, "highlight");
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState && ctx.editor.isActive("highlight") && "is-active",
              isHighlightDisabled && "is-disabled",
            )}
            title={ctx.locale.toolbar.highlight}
          >
            <Highlighter size={16} />
          </button>
        ),
      };
    }
    case BuiltinToolbarItemKey.TextColor: {
      const isTextColorDisabled =
        ctx.isToolbarLocked ||
        isInlineCodeMarkControlDisabled(ctx.isInsideCode, "textColor");
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState &&
                !!ctx.editor.getAttributes("textStyle").color &&
                "is-active",
              isTextColorDisabled && "is-disabled",
            )}
            title={ctx.locale.toolbar.textColor}
          >
            <Palette size={16} />
          </button>
        ),
      };
    }
    case BuiltinToolbarItemKey.Superscript: {
      const isSuperscriptDisabled =
        ctx.isToolbarLocked ||
        isInlineCodeMarkControlDisabled(ctx.isInsideCode, "superscript");
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState &&
                ctx.editor.isActive("superscript") &&
                "is-active",
              isSuperscriptDisabled && "is-disabled",
            )}
            onClick={() => {
              if (isSuperscriptDisabled) return;
              ctx.runToolbarAction(() => ctx.actionContext.format.toggleSuperscript());
            }}
            title={ctx.locale.toolbar.superscript}
          >
            <Superscript size={16} />
          </button>
        ),
      };
    }
    case BuiltinToolbarItemKey.Subscript: {
      const isSubscriptDisabled =
        ctx.isToolbarLocked ||
        isInlineCodeMarkControlDisabled(ctx.isInsideCode, "subscript");
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState && ctx.editor.isActive("subscript") && "is-active",
              isSubscriptDisabled && "is-disabled",
            )}
            onClick={() => {
              if (isSubscriptDisabled) return;
              ctx.runToolbarAction(() => ctx.actionContext.format.toggleSubscript());
            }}
            title={ctx.locale.toolbar.subscript}
          >
            <Subscript size={16} />
          </button>
        ),
      };
    }
    case BuiltinToolbarItemKey.AlignLeft:
      return {
        key: item.key,
        group,
        element: (
          <button
            type="button"
            className={cn(
              "editor-toolbar-btn",
              ctx.showActiveState &&
                ctx.editor.isActive({ textAlign: "left" }) &&
                "is-active",
              ctx.isToolbarLocked && "is-disabled",
            )}
            onClick={() => {
              if (ctx.isToolbarLocked) return;
              ctx.runToolbarAction(() => ctx.actionContext.format.setTextAlign("left"));
            }}
            title={ctx.locale.toolbar.alignLeft}
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
              ctx.showActiveState &&
                ctx.editor.isActive({ textAlign: "center" }) &&
                "is-active",
              ctx.isToolbarLocked && "is-disabled",
            )}
            onClick={() => {
              if (ctx.isToolbarLocked) return;
              ctx.runToolbarAction(() =>
                ctx.actionContext.format.setTextAlign("center"),
              );
            }}
            title={ctx.locale.toolbar.alignCenter}
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
              ctx.showActiveState &&
                ctx.editor.isActive({ textAlign: "right" }) &&
                "is-active",
              ctx.isToolbarLocked && "is-disabled",
            )}
            onClick={() => {
              if (ctx.isToolbarLocked) return;
              ctx.runToolbarAction(() => ctx.actionContext.format.setTextAlign("right"));
            }}
            title={ctx.locale.toolbar.alignRight}
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
              ctx.showActiveState &&
                ctx.editor.isActive({ textAlign: "justify" }) &&
                "is-active",
              ctx.isToolbarLocked && "is-disabled",
            )}
            onClick={() => {
              if (ctx.isToolbarLocked) return;
              ctx.runToolbarAction(() =>
                ctx.actionContext.format.setTextAlign("justify"),
              );
            }}
            title={ctx.locale.toolbar.justify}
          >
            <AlignJustify size={16} />
          </button>
        ),
      };
    case BuiltinToolbarItemKey.DecreaseIndent:
      {
        // 减少缩进按钮是否不可用。
        const disabled =
          ctx.isToolbarLocked || !ctx.actionContext.block.canDecreaseIndent();
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn("editor-toolbar-btn", disabled && "is-disabled")}
              onClick={() => {
                if (disabled) return;
                ctx.runToolbarAction(() => ctx.actionContext.block.decreaseIndent());
              }}
              title={ctx.locale.toolbar.decreaseIndent}
              disabled={disabled}
              aria-disabled={disabled}
            >
              <ListIndentDecrease size={16} />
            </button>
          ),
        };
      }
    case BuiltinToolbarItemKey.IncreaseIndent:
      {
        // 增加缩进按钮是否不可用。
        const disabled =
          ctx.isToolbarLocked || !ctx.actionContext.block.canIncreaseIndent();
        return {
          key: item.key,
          group,
          element: (
            <button
              type="button"
              className={cn("editor-toolbar-btn", disabled && "is-disabled")}
              onClick={() => {
                if (disabled) return;
                ctx.runToolbarAction(() => ctx.actionContext.block.increaseIndent());
              }}
              title={ctx.locale.toolbar.increaseIndent}
              disabled={disabled}
              aria-disabled={disabled}
            >
              <ListIndentIncrease size={16} />
            </button>
          ),
        };
      }
    default:
      return null;
  }
}
