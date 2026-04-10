import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { CodeBlockLanguageOption } from "@/shared/config";
import type { EditorLocale } from "@/shared/locales";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react/components/ui/select";
import {
  resolveCodeBlockLanguage,
  isRegisteredCodeBlockLanguage,
} from "@/core/extensions/codeBlockLowlight";
import { setCodeBlockLanguage } from "@/core/commands/editorCommands";
import { useEditorOverlayPosition } from "@/react/hooks/useEditorOverlayPosition";

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
}

/** 从当前选区向上查找激活的代码块节点与对应 DOM。 */
function findActiveCodeBlock(editor: Editor): {
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
}: CodeBlockLanguageMenuProps) {
  // 当前激活代码块对应的语言值。
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  // 统一复用编辑器内浮层定位逻辑。
  const { position, overlayRef, updatePosition, clearPosition } =
    useEditorOverlayPosition({
      editorWrapperRef,
      placementThreshold: 260,
      horizontalAlign: "end",
      verticalMode: "inside-bottom",
      horizontalOffset: CODE_BLOCK_LANGUAGE_MENU_INSET,
      verticalOffset: CODE_BLOCK_LANGUAGE_MENU_INSET,
      boundaryInset: CODE_BLOCK_LANGUAGE_MENU_INSET,
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

  /** 重新计算语言选择器在编辑器内容坐标系内的位置。 */
  const updateMenuState = useCallback(() => {
    if (!enabled) {
      setCurrentLanguage(null);
      clearPosition();
      return;
    }
    if (!editor.isActive("codeBlock")) {
      setCurrentLanguage(null);
      clearPosition();
      return;
    }
    const active = findActiveCodeBlock(editor);
    if (!active) {
      setCurrentLanguage(null);
      clearPosition();
      return;
    }
    setCurrentLanguage(resolveCodeBlockLanguage(active.language, defaultLanguage));
    updatePosition(active.dom, {
      fallbackWidth: CODE_BLOCK_LANGUAGE_TRIGGER_MIN_WIDTH,
      fallbackHeight: CODE_BLOCK_LANGUAGE_TRIGGER_HEIGHT,
    });
  }, [clearPosition, defaultLanguage, editor, enabled, updatePosition]);

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
    if (!position) {
      onMenuRootChange?.(null);
    }
  }, [onMenuRootChange, position]);

  /** 同步菜单根节点引用，并在首次挂载后用真实尺寸重算坐标。 */
  const handleMenuRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      overlayRef(node);
      onMenuRootChange?.(node);
    },
    [onMenuRootChange, overlayRef],
  );

  if (!portalContainer || !position || !currentLanguage) return null;

  return (
    <div
      className="code-block-language-menu"
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 45,
      }}
      ref={handleMenuRootRef}
    >
      <Select
        value={currentLanguage}
        onValueChange={(value) => {
          setCodeBlockLanguage(editor, value);
          requestAnimationFrame(() => {
            editor.commands.focus();
          });
          updateMenuState();
        }}
      >
        <SelectTrigger
          size="sm"
          className="code-block-language-trigger"
          aria-label={locale.codeBlock.languageButton}
        >
          <SelectValue placeholder={locale.codeBlock.languageButton} />
        </SelectTrigger>
        <SelectContent
          container={portalContainer}
          position="popper"
          side={position.placement}
          align="end"
          sideOffset={6}
          className="code-block-language-select-content"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
          }}
        >
          {resolvedLanguages.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              className="code-block-language-option"
            >
              {item.value === "plaintext"
                ? locale.codeBlock.plainText
                : item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
