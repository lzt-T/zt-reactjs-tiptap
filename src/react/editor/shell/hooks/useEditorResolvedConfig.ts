import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  createDefaultCommands,
  type CommandItem,
} from "@/core/extensions/SlashCommands";
import {
  DEFAULT_CODE_BLOCK_LANGUAGE,
  DEFAULT_CODE_BLOCK_LANGUAGES,
  type CodeBlockLanguageOption,
  config,
} from "@/shared/config";
import type { EditorLocale } from "@/shared/locales";
import {
  createDefaultSlashCommands,
  createDefaultToolbarItems,
  isBuiltinSlashCommandKey,
  isBuiltinToolbarItemKey,
  mergeConfigItems,
  type SlashCommandConfig,
  type ToolbarItemConfig,
} from "@/react/editor/customization";
import {
  EditorMode,
  type TiptapEditorProps,
} from "@/react/editor/types";
import { useStableArray } from "@/react/hooks";
import {
  isRegisteredCodeBlockLanguage,
  resolveCodeBlockLanguage,
} from "@/core/extensions/codeBlockLowlight";

// 空扩展数组，避免每次渲染创建新引用。
const EMPTY_EXTENSIONS: NonNullable<TiptapEditorProps["extensions"]> = [];

/**
 * 标准化附件扩展名列表：去重、去空格、去掉前导点并转小写。
 */
function normalizeFileUploadTypes(fileUploadTypes?: string[]): string[] {
  // 去重后的附件类型。
  const normalized = Array.from(
    new Set(
      (fileUploadTypes ?? [])
        .map((item) => item.trim().toLowerCase().replace(/^\.+/, ""))
        .filter(Boolean),
    ),
  );

  return normalized.length > 0 ? normalized : config.DEFAULT_FILE_UPLOAD_TYPES;
}

/**
 * 标准化代码块语言列表：过滤未注册语言、去重，并确保 plaintext 始终存在。
 */
function normalizeCodeBlockLanguages(
  languages: CodeBlockLanguageOption[] | undefined,
  localePlainTextLabel: string,
): CodeBlockLanguageOption[] {
  // 候选语言列表：优先使用外部传入，否则使用默认语言表。
  const source =
    languages && languages.length > 0
      ? languages
      : DEFAULT_CODE_BLOCK_LANGUAGES.map((item) =>
          item.value === "plaintext"
            ? { ...item, label: localePlainTextLabel }
            : item,
        );

  // 去重后的语言映射。
  const deduped = new Map<string, CodeBlockLanguageOption>();
  for (const item of source) {
    // 原始语言值。
    const raw = item.value?.trim();
    if (!raw) continue;

    // 解析后的语言值。
    const resolved = resolveCodeBlockLanguage(raw, DEFAULT_CODE_BLOCK_LANGUAGE);
    if (!isRegisteredCodeBlockLanguage(resolved) || deduped.has(resolved)) {
      continue;
    }

    deduped.set(resolved, {
      value: resolved,
      label: (item.label ?? "").trim() || resolved,
    });
  }

  if (!deduped.has(DEFAULT_CODE_BLOCK_LANGUAGE)) {
    deduped.set(DEFAULT_CODE_BLOCK_LANGUAGE, {
      value: DEFAULT_CODE_BLOCK_LANGUAGE,
      label: localePlainTextLabel,
    });
  }

  return Array.from(deduped.values());
}

interface UseEditorResolvedConfigOptions {
  editorMode: TiptapEditorProps["editorMode"];
  placeholder: TiptapEditorProps["placeholder"];
  fileUploadTypes: TiptapEditorProps["fileUploadTypes"];
  codeBlockLanguages: TiptapEditorProps["codeBlockLanguages"];
  defaultCodeBlockLanguage: TiptapEditorProps["defaultCodeBlockLanguage"];
  toolbarItems: TiptapEditorProps["toolbarItems"];
  slashCommands: TiptapEditorProps["slashCommands"];
  hideDefaultToolbarItems: TiptapEditorProps["hideDefaultToolbarItems"];
  hideDefaultSlashCommands: TiptapEditorProps["hideDefaultSlashCommands"];
  extensions: TiptapEditorProps["extensions"];
  onFilePreUpload: TiptapEditorProps["onFilePreUpload"];
  editorConfigVersion: TiptapEditorProps["editorConfigVersion"];
  locale: EditorLocale;
}

/**
 * 聚合编辑器配置解析逻辑，输出可直接渲染与实例化的稳定配置。
 */
export function useEditorResolvedConfig({
  editorMode,
  placeholder,
  fileUploadTypes,
  codeBlockLanguages,
  defaultCodeBlockLanguage,
  toolbarItems,
  slashCommands,
  hideDefaultToolbarItems,
  hideDefaultSlashCommands,
  extensions,
  onFilePreUpload,
  editorConfigVersion,
  locale,
}: UseEditorResolvedConfigOptions) {
  // 模式标记：是否为 NotionLike。
  const isNotionLike = editorMode === EditorMode.NotionLike;
  // 稳定化后的外部扩展数组。
  const stableExtensions = useStableArray(extensions) ?? EMPTY_EXTENSIONS;
  // 稳定化后的工具栏配置数组。
  const stableToolbarItems = useStableArray(toolbarItems);
  // 稳定化后的斜杠命令配置数组。
  const stableSlashConfigs = useStableArray(slashCommands);

  // 解析后的默认代码语言。
  const resolvedDefaultCodeBlockLanguage = resolveCodeBlockLanguage(
    defaultCodeBlockLanguage,
    DEFAULT_CODE_BLOCK_LANGUAGE,
  );

  // 解析后的代码块语言列表。
  const resolvedCodeBlockLanguages = useMemo(
    () =>
      normalizeCodeBlockLanguages(codeBlockLanguages, locale.codeBlock.plainText),
    [codeBlockLanguages, locale.codeBlock.plainText],
  );

  // 默认工具栏项集合。
  const defaultToolbarItems = useMemo(
    () => createDefaultToolbarItems(locale),
    [locale],
  );

  // 默认斜杠项集合。
  const defaultSlashConfigs = useMemo(
    () => createDefaultSlashCommands(locale),
    [locale],
  );

  // 合并后的工具栏配置。
  const resolvedToolbarItems = useMemo<ToolbarItemConfig[]>(
    () =>
      mergeConfigItems(
        defaultToolbarItems,
        stableToolbarItems as ToolbarItemConfig[] | undefined,
        Boolean(hideDefaultToolbarItems),
        isBuiltinToolbarItemKey,
        "[ReactTiptapEditor.toolbarItems]",
      ),
    [defaultToolbarItems, hideDefaultToolbarItems, stableToolbarItems],
  );

  // 合并后的斜杠配置。
  const resolvedSlashConfigs = useMemo<SlashCommandConfig[]>(
    () =>
      mergeConfigItems(
        defaultSlashConfigs,
        stableSlashConfigs as SlashCommandConfig[] | undefined,
        Boolean(hideDefaultSlashCommands),
        isBuiltinSlashCommandKey,
        "[ReactTiptapEditor.slashCommands]",
      ),
    [defaultSlashConfigs, hideDefaultSlashCommands, stableSlashConfigs],
  );

  // 内置斜杠命令映射源。
  const builtinSlashCommands = useMemo(
    () => createDefaultCommands(locale, resolvedDefaultCodeBlockLanguage),
    [locale, resolvedDefaultCodeBlockLanguage],
  );

  // 最终斜杠命令列表。
  const resolvedSlashCommands = useMemo<CommandItem[]>(() => {
    // 内置命令的 key 索引。
    const builtinMap = new Map(
      builtinSlashCommands.map((item) => [item.key, item]),
    );

    // 合并后的命令结果。
    const result: CommandItem[] = [];

    for (const item of resolvedSlashConfigs) {
      if (item.type === "builtin") {
        // 匹配到的内置命令。
        const matched = builtinMap.get(item.key);
        if (!matched) {
          console.warn(
            `[ReactTiptapEditor.slashCommands] Unknown builtin key "${item.key}", skipped.`,
          );
          continue;
        }
        result.push({
          ...matched,
          group: item.group,
        });
        continue;
      }

      result.push({
        key: item.key,
        title: item.title,
        description: item.description,
        group: item.group,
        icon: item.icon,
        command: item.command,
        disabled: item.disabled,
      });
    }

    return result;
  }, [builtinSlashCommands, resolvedSlashConfigs]);

  // 最新命令列表引用，供扩展动态读取。
  const resolvedSlashCommandsRef = useRef<CommandItem[]>(resolvedSlashCommands);
  useEffect(() => {
    resolvedSlashCommandsRef.current = resolvedSlashCommands;
  }, [resolvedSlashCommands]);

  // 获取最新命令列表的稳定回调。
  const getResolvedSlashCommands = useCallback(
    () => resolvedSlashCommandsRef.current,
    [],
  );

  // 解析后的 placeholder。
  const resolvedPlaceholder =
    placeholder !== undefined
      ? placeholder
      : isNotionLike
        ? locale.placeholders.notionLike
        : locale.placeholders.headless;

  // 解析后的附件扩展名白名单。
  const resolvedFileUploadTypes = useMemo(
    () => normalizeFileUploadTypes(fileUploadTypes),
    [fileUploadTypes],
  );

  // 编辑器重建依赖集合。
  const editorRecreateDeps = useMemo(
    () => [
      editorMode,
      Boolean(onFilePreUpload),
      stableExtensions,
      editorConfigVersion,
    ],
    [editorMode, onFilePreUpload, stableExtensions, editorConfigVersion],
  );

  return {
    isNotionLike,
    stableExtensions,
    resolvedToolbarItems,
    resolvedSlashCommands,
    resolvedCodeBlockLanguages,
    resolvedDefaultCodeBlockLanguage,
    resolvedPlaceholder,
    resolvedFileUploadTypes,
    editorRecreateDeps,
    getResolvedSlashCommands,
  };
}
