# Changelog

## Unreleased

### Added
- Added code block language support with `CodeBlockLowlight` + `lowlight` syntax highlighting.
- Added in-block language selector menu (`Code language`) shown when cursor is inside a code block.
- Added default code block insertion entry to toolbar and slash commands.
- Added default blockquote entry to toolbar and slash commands.
- Added new props:
  - `codeBlockLanguages?: Array<{ value: string; label: string }>`
  - `defaultCodeBlockLanguage?: string`
- Added new exports:
  - `DEFAULT_CODE_BLOCK_LANGUAGE`
  - `DEFAULT_CODE_BLOCK_LANGUAGES`
  - `CodeBlockLanguageOption`
  - `EditorTheme`
- Added new prop:
  - `theme?: 'light' | 'dark'` (default: `light`)
- Added new props:
  - `textColorOptions?: Array<{ name: string; value: string }>`
  - `highlightColorOptions?: Array<{ name: string; value: string }>`
- Added `ColorPopoverPicker` to unify icon + popover color picking in toolbar and bubble menu.
- Added table row/column alignment menus for horizontal and vertical cell alignment.
- Added a hover action bar for code blocks with copy, format, and delete actions.
- Added hover resize handles for images, storing width as a responsive percentage.

### Changed
- Unified editor runtime schema and `htmlToPlainText` schema for code block handling via `StarterKit.configure({ codeBlock: false }) + CodeBlockLowlight`.
- Added i18n keys for code block labels:
  - `toolbar.codeBlock`
  - `slashCommands.codeBlock`
  - `codeBlock.languageButton`
  - `codeBlock.plainText`
- Updated editor theme behavior: no longer follows `html.dark`; theme is controlled by `ReactTiptapEditor` `theme` prop.
- Refactored editor UI styles to theme tokens in `src/react/editor/**` (toolbar, menus, table actions, dialogs, base styles). Light mode keeps previous visuals while dark mode now maps through the same token set.
- Refactored `ColorPicker` as a pure panel component; preset color options are now fully passed from outside.
- Kept the code block language selector in its original position and moved format/delete into the hover action bar.
