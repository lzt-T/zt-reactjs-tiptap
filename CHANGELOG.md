# Changelog

## Unreleased

### Added
- Added code block language support with `CodeBlockLowlight` + `lowlight` syntax highlighting.
- Added in-block language selector menu (`Code language`) shown when cursor is inside a code block.
- Added default code block insertion entry to toolbar and slash commands.
- Added new props:
  - `codeBlockLanguages?: Array<{ value: string; label: string }>`
  - `defaultCodeBlockLanguage?: string`
- Added new exports:
  - `DEFAULT_CODE_BLOCK_LANGUAGE`
  - `DEFAULT_CODE_BLOCK_LANGUAGES`
  - `CodeBlockLanguageOption`

### Changed
- Unified editor runtime schema and `htmlToPlainText` schema for code block handling via `StarterKit.configure({ codeBlock: false }) + CodeBlockLowlight`.
- Added i18n keys for code block labels:
  - `toolbar.codeBlock`
  - `slashCommands.codeBlock`
  - `codeBlock.languageButton`
  - `codeBlock.plainText`
