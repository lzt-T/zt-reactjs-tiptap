import { useMemo, useState, useEffect, useRef } from "react";
import katex from "katex";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/react/components/ui/dialog";
import { Button } from "@/react/components/ui/button";
import { FormulaPicker } from "./FormulaPicker";
import type { FormulaPickerCategory } from "@/shared/config/formulaCategories";
import type { EditorLocale } from "@/shared/locales";
import "./MathDialog.css";

interface MathDialogProps {
  isOpen: boolean;
  initialValue?: string;
  type: "inline" | "block";
  onConfirm: (latex: string) => void;
  onCancel: () => void;
  formulaCategories?: FormulaPickerCategory[];
  locale: EditorLocale;
  /** 弹窗挂载容器，用于继承编辑器作用域主题变量 */
  portalContainer?: HTMLElement | null;
}

const MathDialog = ({
  isOpen,
  initialValue = "",
  type,
  onConfirm,
  onCancel,
  formulaCategories,
  locale,
  portalContainer,
}: MathDialogProps) => {
  const [latex, setLatex] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset latex when dialog opens with new initial value
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setLatex(initialValue);
      });
    }
  }, [isOpen, initialValue]);

  // 弹窗打开时把焦点放到公式输入框，避免 Radix 把焦点给第一个可聚焦元素（Operators 标签）
  const handleOpenAutoFocus = (e: Event) => {
    e.preventDefault();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const previewResult = useMemo(() => {
    if (!latex) return { html: "", error: null as string | null };
    try {
      const html = katex.renderToString(latex, {
        displayMode: type === "block",
        throwOnError: false,
        errorColor: "#dc2626",
      });
      return { html, error: null as string | null };
    } catch (error) {
      return { html: "", error: (error as Error).message };
    }
  }, [latex, type]);

  const handleConfirm = () => {
    onConfirm(latex);
    setLatex("");
  };

  const handleCancel = () => {
    onCancel();
    setLatex("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleConfirm();
    }
  };

  const handleInsertSnippet = (snippetLatex: string) => {
    const textarea = inputRef.current;
    if (!textarea) {
      setLatex(snippetLatex);
      return;
    }

    const start = textarea.selectionStart ?? latex.length;
    const end = textarea.selectionEnd ?? latex.length;
    const next = latex.slice(0, start) + snippetLatex + latex.slice(end);
    setLatex(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + snippetLatex.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleCancel()}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        showCloseButton={false}
        onOpenAutoFocus={handleOpenAutoFocus}
        portalContainer={portalContainer}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {type === "inline"
              ? locale.mathDialog.insertInlineMath
              : locale.mathDialog.insertBlockMath}
          </DialogTitle>
        </DialogHeader>

        <div className="math-dialog-body space-y-4 min-h-0 flex-1 overflow-y-auto">
          <div className="math-dialog-snippets space-y-2">
            <FormulaPicker
              handlePickSnippet={handleInsertSnippet}
              categories={formulaCategories}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="latex-input" className="text-sm font-medium">
              {locale.mathDialog.formulaLabel}
            </label>
            <textarea
              ref={inputRef}
              id="latex-input"
              className="math-dialog-input"
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                type === "inline"
                  ? "E = mc^2"
                  : "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}"
              }
              rows={type === "inline" ? 3 : 5}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{locale.mathDialog.previewLabel}</label>
            <div className="math-dialog-preview">
              <div
                className="math-dialog-preview-content"
                dangerouslySetInnerHTML={{ __html: previewResult.html }}
              />
              {!latex && (
                <div className="math-dialog-preview-placeholder">
                  {locale.mathDialog.previewPlaceholder}
                </div>
              )}
              {previewResult.error && (
                <div className="math-dialog-preview-error">
                  {locale.mathDialog.previewErrorPrefix} {previewResult.error}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={handleCancel}>
            {locale.mathDialog.cancel}
          </Button>
          <Button onClick={handleConfirm}>{locale.mathDialog.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MathDialog;
