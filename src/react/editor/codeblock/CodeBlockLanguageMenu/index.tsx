import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  CheckIcon,
  ChevronDownIcon,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { CodeBlockLanguageOption } from "@/shared/config";
import type { EditorLocale } from "@/shared/locales";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/react/components/ui/command";
import {
  resolveCodeBlockLanguage,
  isRegisteredCodeBlockLanguage,
} from "@/core/extensions/codeBlockLowlight";
import { setCodeBlockLanguage } from "@/core/commands/editorCommands";
import {
  createEditorFloatingOverlayPositionContext,
  useEditorFloatingOverlayPosition,
  type EditorFloatingOverlayPositionContext,
} from "@/react/hooks/useEditorFloatingOverlayPosition";

// 语言选择器与代码块边缘的默认内边距。
const CODE_BLOCK_LANGUAGE_MENU_INSET = 8;

// 语言选择器触发器的默认最小宽度，用于首帧定位。
const CODE_BLOCK_LANGUAGE_TRIGGER_MIN_WIDTH = 132;

// 语言选择器触发器的默认高度，用于首帧定位。
const CODE_BLOCK_LANGUAGE_TRIGGER_HEIGHT = 32;

interface CodeBlockLanguageMenuProps {
  editor: Editor;
  locale: EditorLocale;
  portalContainer: HTMLDivElement | null;
  editorWrapperRef: React.RefObject<HTMLDivElement | null>;
  languages: CodeBlockLanguageOption[];
  defaultLanguage: string;
  enabled?: boolean;
  onMenuRootChange?: (node: HTMLDivElement | null) => void;
  onMenuOpenStateChecked?: (editorFocused: boolean) => void;
}

/** 从当前选区向上查找激活的代码块节点与对应 DOM。 */
function findActiveCodeBlock(editor: Editor): {
  pos: number;
  language: string | undefined;
  dom: HTMLElement;
} | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== "codeBlock") continue;
    const pos = $from.before(depth);
    const dom = editor.view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) return null;
    return {
      pos,
      language:
        typeof node.attrs.language === "string"
          ? node.attrs.language
          : undefined,
      dom,
    };
  }
  return null;
}

/** 代码块语言选择器：在编辑器内部按内容坐标绝对定位。 */
export default function CodeBlockLanguageMenu({
  editor,
  locale,
  portalContainer,
  editorWrapperRef,
  languages,
  defaultLanguage,
  enabled = true,
  onMenuRootChange,
  onMenuOpenStateChecked,
}: CodeBlockLanguageMenuProps) {
  // 当前激活代码块对应的语言值。
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  // 菜单打开状态。
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // 语言菜单检索关键词。
  const [searchQuery, setSearchQuery] = useState("");
  // 代码块语言选择器定位上下文。
  const [positionContext, setPositionContext] =
    useState<EditorFloatingOverlayPositionContext | null>(null);
  // 统一复用编辑器浮层命令式定位逻辑。
  const { overlayRef, clearPosition } = useEditorFloatingOverlayPosition({
    context: positionContext,
    portalContainer,
    enabled: Boolean(positionContext && currentLanguage),
  });

  // 归一化可选语言，过滤未注册项并确保 plaintext 始终可选。
  const resolvedLanguages = useMemo(() => {
    const map = new Map<string, CodeBlockLanguageOption>();
    for (const item of languages) {
      const value = resolveCodeBlockLanguage(item.value, defaultLanguage);
      if (!isRegisteredCodeBlockLanguage(value) || map.has(value)) continue;
      map.set(value, { value, label: item.label.trim() || value });
    }
    if (!map.has("plaintext")) {
      map.set("plaintext", {
        value: "plaintext",
        label: locale.codeBlock.plainText,
      });
    }
    return Array.from(map.values());
  }, [languages, defaultLanguage, locale.codeBlock.plainText]);

  /** 统一语言展示文案：plaintext 使用本地化文本，其余使用配置标签。 */
  const getLanguageLabel = useCallback(
    (item: CodeBlockLanguageOption) =>
      item.value === "plaintext" ? locale.codeBlock.plainText : item.label,
    [locale.codeBlock.plainText],
  );

  // 根据输入内容实时过滤可选语言（大小写不敏感，匹配 label 与 value）。
  const filteredLanguages = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return resolvedLanguages;
    return resolvedLanguages.filter((item) => {
      const label = getLanguageLabel(item).toLowerCase();
      return (
        label.includes(keyword) || item.value.toLowerCase().includes(keyword)
      );
    });
  }, [getLanguageLabel, resolvedLanguages, searchQuery]);

  /** 聚焦语言搜索输入框。 */
  const focusSearchInput = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      '.code-block-language-select-content [data-slot="command-input"]',
    );
    input?.focus();
  }, []);

  /** 重新计算语言选择器在编辑器内容坐标系内的位置。 */
  const updateMenuState = useCallback(() => {
    if (!enabled) {
      setCurrentLanguage(null);
      setIsMenuOpen(false);
      setPositionContext(null);
      clearPosition();
      return;
    }
    if (!editor.isActive("codeBlock")) {
      setCurrentLanguage(null);
      setIsMenuOpen(false);
      setPositionContext(null);
      clearPosition();
      return;
    }
    const active = findActiveCodeBlock(editor);
    if (!active) {
      setCurrentLanguage(null);
      setIsMenuOpen(false);
      setPositionContext(null);
      clearPosition();
      return;
    }
    setCurrentLanguage(
      resolveCodeBlockLanguage(active.language, defaultLanguage),
    );
    setPositionContext(
      createEditorFloatingOverlayPositionContext({
        editorWrapper: editorWrapperRef.current,
        anchor: active.dom,
        // 触发器位置固定在代码块下方，不因下拉面板可用空间而翻转。
        lockPlacement: true,
        horizontalAlign: "end",
        // 语言选择器放在代码块底边外侧，而不是内容区内部。
        verticalMode: "outside",
        // 右边缘与代码块右边缘贴齐，不再额外向左缩进。
        horizontalOffset: 0,
        verticalOffset: CODE_BLOCK_LANGUAGE_MENU_INSET,
        boundaryInset: CODE_BLOCK_LANGUAGE_MENU_INSET,
        fallbackWidth: CODE_BLOCK_LANGUAGE_TRIGGER_MIN_WIDTH,
        fallbackHeight: CODE_BLOCK_LANGUAGE_TRIGGER_HEIGHT,
      }),
    );
  }, [clearPosition, defaultLanguage, editor, editorWrapperRef, enabled]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      updateMenuState();
    });
    const onSelectionUpdate = () => updateMenuState();
    const onTransaction = () => updateMenuState();
    editor.on("selectionUpdate", onSelectionUpdate);
    editor.on("transaction", onTransaction);
    return () => {
      window.cancelAnimationFrame(rafId);
      editor.off("selectionUpdate", onSelectionUpdate);
      editor.off("transaction", onTransaction);
    };
  }, [editor, updateMenuState]);

  useEffect(() => {
    if (!positionContext) {
      setIsMenuOpen(false);
      onMenuRootChange?.(null);
    }
  }, [onMenuRootChange, positionContext]);

  useEffect(() => {
    if (!isMenuOpen) {
      setSearchQuery("");
      return;
    }
    requestAnimationFrame(() => {
      focusSearchInput();
    });
  }, [focusSearchInput, isMenuOpen]);

  /** 同步菜单根节点引用，并在首次挂载后用真实尺寸重算坐标。 */
  const handleMenuRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      overlayRef(node);
      onMenuRootChange?.(node);
    },
    [onMenuRootChange, overlayRef],
  );

  if (!portalContainer || !positionContext || !currentLanguage) return null;

  /** 关闭语言下拉并同步编辑器焦点状态。 */
  const closeLanguageMenu = () => {
    setIsMenuOpen(false);
    requestAnimationFrame(() => {
      onMenuOpenStateChecked?.(editor.isFocused);
    });
  };

  // 当前语言展示文案。
  const currentLanguageLabel =
    resolvedLanguages.find((item) => item.value === currentLanguage)?.label ??
    locale.codeBlock.plainText;
  // 语言选择器 Portal 内容。
  const menuContent = (
    <div
      className="code-block-language-menu"
      style={{
        position: "absolute",
        visibility: "hidden",
        zIndex: 45,
      }}
      ref={handleMenuRootRef}
    >
      <div className="code-block-control-bar">
        <button
          type="button"
          className="code-block-control-language-trigger"
          aria-label={locale.codeBlock.languageButton}
          aria-expanded={isMenuOpen}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            if (isMenuOpen) {
              requestAnimationFrame(() => {
                onMenuOpenStateChecked?.(editor.isFocused);
              });
            }
            setIsMenuOpen(!isMenuOpen);
          }}
        >
          <span className="code-block-control-language-text">
            {currentLanguageLabel}
          </span>
          <ChevronDownIcon className="size-3.5 opacity-50" />
        </button>
      </div>
      {isMenuOpen && (
        <div className="code-block-language-select-content">
          <Command
            shouldFilter={false}
            className="code-block-language-command"
          >
            <CommandInput
              value={searchQuery}
              className="code-block-language-search"
              placeholder={locale.codeBlock.searchPlaceholder}
              onValueChange={(value) => {
                setSearchQuery(value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  closeLanguageMenu();
                  requestAnimationFrame(() => {
                    editor.commands.focus();
                  });
                }
              }}
            />
            <CommandList className="code-block-language-list">
              <CommandEmpty className="code-block-language-empty">
                {locale.codeBlock.noMatch}
              </CommandEmpty>
              {filteredLanguages.map((item) => (
                <CommandItem
                  key={item.value}
                  value={`${item.value} ${getLanguageLabel(item)}`}
                  className="code-block-language-option"
                  onSelect={() => {
                    setCodeBlockLanguage(editor, item.value);
                    closeLanguageMenu();
                    requestAnimationFrame(() => {
                      editor.commands.focus();
                    });
                    updateMenuState();
                  }}
                >
                  <span>{getLanguageLabel(item)}</span>
                  {item.value === currentLanguage ? (
                    <CheckIcon className="ml-auto size-4" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );

  return createPortal(menuContent, portalContainer);
}
