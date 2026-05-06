import { Check, Trash2 } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { EditorLocale } from "@/shared/locales";
import { cn } from "@/shared/utils/utils";
import "./LinkEditorPanel.css";

interface LinkEditorPanelProps {
  value: string;
  locale: EditorLocale;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onRemove: () => void;
  onClose: () => void;
}

/** 统一渲染链接编辑面板，供 Toolbar 与 BubbleMenu 复用。 */
const LinkEditorPanel = ({
  value,
  locale,
  onChange,
  onSubmit,
  onRemove,
  onClose,
}: LinkEditorPanelProps) => {
  /** 处理输入框键盘提交与关闭逻辑。 */
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className="editor-link-panel">
      <input
        className="editor-link-panel-input"
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder={locale.toolbar.linkPlaceholder}
        aria-label={locale.toolbar.editLink}
      />
      <div className="editor-link-panel-actions">
        <button
          type="button"
          className={cn("editor-link-panel-action-btn", !value.trim() && "is-disabled")}
          onClick={onSubmit}
          title={locale.toolbar.updateLink}
          disabled={!value.trim()}
          aria-disabled={!value.trim()}
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          className="editor-link-panel-action-btn"
          onClick={onRemove}
          title={locale.toolbar.removeLink}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default LinkEditorPanel;
