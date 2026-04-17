// React 编辑器域统一导出：主组件、类型、配置能力。
export { default as ReactTiptapEditor } from "./shell/ReactTiptapEditor";

// 组件运行时模式常量导出（供调用方在运行时使用）。
export {
  EditorMode,
  HeadlessToolbarMode,
  EditorLanguage,
  EditorTheme,
} from "./types";

// 组件类型导出。
export type { TiptapEditorProps, EditorTheme } from "./types";

// 工具栏/斜杠配置导出。
export {
  BuiltinToolbarItemKey,
  BuiltinSlashCommandKey,
  createDefaultToolbarItems,
  createDefaultSlashCommands,
} from "./customization";
export type {
  ToolbarItemConfig,
  SlashCommandConfig,
  EditorActionContext,
  EditorExternalExtension,
} from "./customization";

// 数学片段类型。
export type { FormulaSnippetItem } from "./dialogs/MathDialog/FormulaSnippetButton";
export type { CodeBlockLanguageOption } from "@/shared/config";
