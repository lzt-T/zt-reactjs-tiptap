import type { Editor } from "@tiptap/react";
import type { AnyExtension } from "@tiptap/core";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { EditorLocale } from "@/locales";

/** 工具栏内置项 Key。 */
export const BuiltinToolbarItemKey = {
  Heading: "heading",
  BulletList: "bulletList",
  OrderedList: "orderedList",
  TaskList: "taskList",
  InsertTable: "insertTable",
  InlineMath: "inlineMath",
  BlockMath: "blockMath",
  Image: "image",
  UploadAttachment: "uploadAttachment",
  Bold: "bold",
  Italic: "italic",
  Underline: "underline",
  Strikethrough: "strikethrough",
  InlineCode: "inlineCode",
  Highlight: "highlight",
  TextColor: "textColor",
  Superscript: "superscript",
  Subscript: "subscript",
  AlignLeft: "alignLeft",
  AlignCenter: "alignCenter",
  AlignRight: "alignRight",
  AlignJustify: "alignJustify",
} as const;

/** 斜杠命令内置项 Key。 */
export const BuiltinSlashCommandKey = {
  Heading1: "heading1",
  Heading2: "heading2",
  Heading3: "heading3",
  BulletList: "bulletList",
  NumberedList: "numberedList",
  TaskList: "taskList",
  InlineCode: "inlineCode",
  Table: "table",
  InlineMath: "inlineMath",
  BlockMath: "blockMath",
  Image: "image",
  UploadAttachment: "uploadAttachment",
} as const;

export type BuiltinToolbarItemKey =
  (typeof BuiltinToolbarItemKey)[keyof typeof BuiltinToolbarItemKey];
export type BuiltinSlashCommandKey =
  (typeof BuiltinSlashCommandKey)[keyof typeof BuiltinSlashCommandKey];

/** 工具栏/斜杠项分组，渲染时用于自动插入分隔符。 */
export type EditorItemGroup = string;

/** 编辑行为上下文：统一注入给自定义动作，避免业务方自行拼装。 */
export interface EditorActionContext {
  editor: Editor;
  locale: EditorLocale;
  format: {
    toggleBold: () => void;
    toggleItalic: () => void;
    toggleUnderline: () => void;
    toggleStrike: () => void;
    toggleCode: () => void;
    toggleSuperscript: () => void;
    toggleSubscript: () => void;
    setTextAlign: (align: "left" | "center" | "right" | "justify") => void;
    setColor: (color: string) => void;
    unsetColor: () => void;
    setHighlight: (color: string) => void;
    unsetHighlight: () => void;
  };
  block: {
    setHeading: (level: 1 | 2 | 3) => void;
    toggleHeading: (level: 1 | 2 | 3) => void;
    toggleBulletList: () => void;
    toggleOrderedList: () => void;
    toggleTaskList: () => void;
    insertTable: (options?: { rows?: number; cols?: number; withHeaderRow?: boolean }) => void;
  };
  dialogs: {
    openInlineMath: () => void;
    openBlockMath: () => void;
    openImage: () => void;
    openFileUpload: () => void;
  };
}

/** 工具栏内置项配置。 */
export interface ToolbarBuiltinItemConfig {
  type: "builtin";
  key: BuiltinToolbarItemKey;
  group?: EditorItemGroup;
}

/** 工具栏自定义项配置。 */
export interface ToolbarCustomItemConfig {
  type: "custom";
  key: string;
  title: string;
  icon?: ReactNode;
  group?: EditorItemGroup;
  onClick: (ctx: EditorActionContext) => void;
  isActive?: (ctx: EditorActionContext) => boolean;
  isDisabled?: (ctx: EditorActionContext) => boolean;
}

/** 工具栏项配置（内置 + 自定义）。 */
export type ToolbarItemConfig = ToolbarBuiltinItemConfig | ToolbarCustomItemConfig;

/** 斜杠内置项配置。 */
export interface SlashBuiltinCommandConfig {
  type: "builtin";
  key: BuiltinSlashCommandKey;
  group?: EditorItemGroup;
}

/** 斜杠自定义项配置。 */
export interface SlashCustomCommandConfig {
  type: "custom";
  key: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  group?: EditorItemGroup;
  command: ({ editor }: { editor: Editor }) => void;
  disabled?: (ctx: { editor: Editor }) => boolean;
}

/** 斜杠项配置（内置 + 自定义）。 */
export type SlashCommandConfig = SlashBuiltinCommandConfig | SlashCustomCommandConfig;

/** 对外暴露扩展类型别名，避免业务侧重复引入 TipTap 类型。 */
export type EditorExternalExtension = AnyExtension;

/** 默认工具栏配置（按当前内置顺序与分组）。 */
export function createDefaultToolbarItems(locale: EditorLocale): ToolbarItemConfig[] {
  void locale;
  return [
    { type: "builtin", key: BuiltinToolbarItemKey.Heading, group: "block" },
    { type: "builtin", key: BuiltinToolbarItemKey.BulletList, group: "block" },
    { type: "builtin", key: BuiltinToolbarItemKey.OrderedList, group: "block" },
    { type: "builtin", key: BuiltinToolbarItemKey.TaskList, group: "block" },
    { type: "builtin", key: BuiltinToolbarItemKey.InsertTable, group: "block" },
    { type: "builtin", key: BuiltinToolbarItemKey.InlineMath, group: "insert" },
    { type: "builtin", key: BuiltinToolbarItemKey.BlockMath, group: "insert" },
    { type: "builtin", key: BuiltinToolbarItemKey.Image, group: "insert" },
    { type: "builtin", key: BuiltinToolbarItemKey.UploadAttachment, group: "insert" },
    { type: "builtin", key: BuiltinToolbarItemKey.Bold, group: "format" },
    { type: "builtin", key: BuiltinToolbarItemKey.Italic, group: "format" },
    { type: "builtin", key: BuiltinToolbarItemKey.Underline, group: "format" },
    { type: "builtin", key: BuiltinToolbarItemKey.Strikethrough, group: "format" },
    { type: "builtin", key: BuiltinToolbarItemKey.InlineCode, group: "format" },
    { type: "builtin", key: BuiltinToolbarItemKey.Highlight, group: "color" },
    { type: "builtin", key: BuiltinToolbarItemKey.TextColor, group: "color" },
    { type: "builtin", key: BuiltinToolbarItemKey.Superscript, group: "script" },
    { type: "builtin", key: BuiltinToolbarItemKey.Subscript, group: "script" },
    { type: "builtin", key: BuiltinToolbarItemKey.AlignLeft, group: "align" },
    { type: "builtin", key: BuiltinToolbarItemKey.AlignCenter, group: "align" },
    { type: "builtin", key: BuiltinToolbarItemKey.AlignRight, group: "align" },
    { type: "builtin", key: BuiltinToolbarItemKey.AlignJustify, group: "align" },
  ];
}

/** 默认斜杠配置（按当前内置顺序与分组）。 */
export function createDefaultSlashCommands(locale: EditorLocale): SlashCommandConfig[] {
  void locale;
  return [
    { type: "builtin", key: BuiltinSlashCommandKey.Heading1, group: "heading" },
    { type: "builtin", key: BuiltinSlashCommandKey.Heading2, group: "heading" },
    { type: "builtin", key: BuiltinSlashCommandKey.Heading3, group: "heading" },
    { type: "builtin", key: BuiltinSlashCommandKey.BulletList, group: "list" },
    { type: "builtin", key: BuiltinSlashCommandKey.NumberedList, group: "list" },
    { type: "builtin", key: BuiltinSlashCommandKey.TaskList, group: "list" },
    { type: "builtin", key: BuiltinSlashCommandKey.InlineCode, group: "insert" },
    { type: "builtin", key: BuiltinSlashCommandKey.Table, group: "insert" },
    { type: "builtin", key: BuiltinSlashCommandKey.InlineMath, group: "math" },
    { type: "builtin", key: BuiltinSlashCommandKey.BlockMath, group: "math" },
    { type: "builtin", key: BuiltinSlashCommandKey.Image, group: "media" },
    { type: "builtin", key: BuiltinSlashCommandKey.UploadAttachment, group: "media" },
  ];
}

/** 工具栏 key 校验。 */
export function isBuiltinToolbarItemKey(key: string): key is BuiltinToolbarItemKey {
  return Object.values(BuiltinToolbarItemKey).includes(key as BuiltinToolbarItemKey);
}

/** 斜杠 key 校验。 */
export function isBuiltinSlashCommandKey(key: string): key is BuiltinSlashCommandKey {
  return Object.values(BuiltinSlashCommandKey).includes(key as BuiltinSlashCommandKey);
}

/**
 * 按「默认项 + 用户项」构建最终配置。
 * - 同 key 用户项覆盖默认项；
 * - 覆盖后按用户声明顺序移动到末尾，便于重排；
 * - 非法内置 key 仅 warning，不中断渲染。
 */
export function mergeConfigItems<T extends { key: string; type: "builtin" | "custom" }>(
  defaults: T[],
  overrides: T[] | undefined,
  hideDefaults: boolean,
  isBuiltinKey: (key: string) => boolean,
  warnPrefix: string
): T[] {
  // 初始列表：可选择隐藏默认项。
  const merged = hideDefaults ? [] : [...defaults];
  if (!overrides || overrides.length === 0) return merged;

  for (const item of overrides) {
    if (item.type === "builtin" && !isBuiltinKey(item.key)) {
      console.warn(`${warnPrefix} Unknown builtin key "${item.key}", skipped.`);
      continue;
    }
    const index = merged.findIndex((existing) => existing.key === item.key);
    if (index >= 0) {
      merged.splice(index, 1);
    }
    merged.push(item);
  }
  return merged;
}
