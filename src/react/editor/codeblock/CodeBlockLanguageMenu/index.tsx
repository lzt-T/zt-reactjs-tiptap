import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import type { CodeBlockLanguageOption } from "@/shared/config";
import type { EditorLocale } from "@/shared/locales";
import {
  resolveCodeBlockLanguage,
  isRegisteredCodeBlockLanguage,
} from "@/core/extensions/codeBlockLowlight";
import { setCodeBlockLanguage } from "@/core/commands/editorCommands";

interface CodeBlockLanguageMenuProps {
  editor: Editor;
  locale: EditorLocale;
  portalContainer: HTMLDivElement | null;
  editorWrapperRef: React.RefObject<HTMLDivElement | null>;
  languages: CodeBlockLanguageOption[];
  defaultLanguage: string;
}

interface MenuState {
  top: number;
  left: number;
  currentLanguage: string;
}

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
      language: typeof node.attrs.language === "string" ? node.attrs.language : undefined,
      dom,
    };
  }
  return null;
}

export default function CodeBlockLanguageMenu({
  editor,
  locale,
  portalContainer,
  editorWrapperRef,
  languages,
  defaultLanguage,
}: CodeBlockLanguageMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<MenuState | null>(null);

  const resolvedLanguages = useMemo(() => {
    const map = new Map<string, CodeBlockLanguageOption>();
    for (const item of languages) {
      const value = resolveCodeBlockLanguage(item.value, defaultLanguage);
      if (!isRegisteredCodeBlockLanguage(value) || map.has(value)) continue;
      map.set(value, { value, label: item.label.trim() || value });
    }
    if (!map.has("plaintext")) {
      map.set("plaintext", { value: "plaintext", label: locale.codeBlock.plainText });
    }
    return Array.from(map.values());
  }, [languages, defaultLanguage, locale.codeBlock.plainText]);

  const updateMenuState = useCallback(() => {
    if (!editor.isActive("codeBlock")) {
      setState(null);
      setOpen(false);
      return;
    }
    const active = findActiveCodeBlock(editor);
    if (!active) {
      setState(null);
      setOpen(false);
      return;
    }
    const wrapper = editorWrapperRef.current;
    if (!wrapper) {
      setState(null);
      setOpen(false);
      return;
    }
    const rect = active.dom.getBoundingClientRect();
    setState({
      top: rect.top + 6,
      left: rect.right - 6,
      currentLanguage: resolveCodeBlockLanguage(active.language, defaultLanguage),
    });
  }, [defaultLanguage, editor, editorWrapperRef]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      updateMenuState();
    });
    const onSelectionUpdate = () => updateMenuState();
    const onTransaction = () => updateMenuState();
    const onResize = () => updateMenuState();
    const wrapper = editorWrapperRef.current;
    editor.on("selectionUpdate", onSelectionUpdate);
    editor.on("transaction", onTransaction);
    window.addEventListener("resize", onResize);
    wrapper?.addEventListener("scroll", onResize, { passive: true });
    return () => {
      window.cancelAnimationFrame(rafId);
      editor.off("selectionUpdate", onSelectionUpdate);
      editor.off("transaction", onTransaction);
      window.removeEventListener("resize", onResize);
      wrapper?.removeEventListener("scroll", onResize);
    };
  }, [editor, editorWrapperRef, updateMenuState]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  if (!portalContainer || !state) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="code-block-language-menu"
      style={{ top: `${state.top}px`, left: `${state.left}px` }}
    >
      <button
        type="button"
        className="code-block-language-trigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        {locale.codeBlock.languageButton}
      </button>
      {open && (
        <div className="code-block-language-dropdown">
          {resolvedLanguages.map((item) => (
            <button
              key={item.value}
              type="button"
              className={
                item.value === state.currentLanguage
                  ? "code-block-language-option is-active"
                  : "code-block-language-option"
              }
              onClick={() => {
                setCodeBlockLanguage(editor, item.value);
                setOpen(false);
                updateMenuState();
              }}
            >
              {item.value === "plaintext" ? locale.codeBlock.plainText : item.label}
            </button>
          ))}
        </div>
      )}
    </div>,
    portalContainer
  );
}
