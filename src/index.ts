// 导出 React 适配层主组件与运行时常量。
export {
  ReactTiptapEditor,
  EditorMode,
  HeadlessToolbarMode,
  EditorLanguage,
  BuiltinToolbarItemKey,
  BuiltinSlashCommandKey,
  createDefaultToolbarItems,
  createDefaultSlashCommands,
} from "./react";

// 导出 React 层类型。
export type {
  TiptapEditorProps,
  ToolbarItemConfig,
  SlashCommandConfig,
  EditorActionContext,
  EditorExternalExtension,
  FormulaSnippetItem,
} from "./react";

// 导出 shared 与 core 能力。
export * from "./core";
export { FORMULA_CATEGORIES } from "./shared/config/formulaCategories";
export type { FormulaPickerCategory } from "./shared/config/formulaCategories";
export { htmlToPlainText, domToPlainText } from "./shared/utils/htmlToPlainText";
export type { HtmlToPlainTextOptions } from "./shared/utils/htmlToPlainText";

// 导入库默认样式，确保打包产物包含 style.css。
import "./shared/styles/style.css";
