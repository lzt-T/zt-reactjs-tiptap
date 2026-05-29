import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ListIndentDecrease,
  ListIndentIncrease,
  Subscript,
  Superscript,
} from "lucide-react";
import type { EditorLocale } from "@/shared/locales";

/** BubbleMenu 更多菜单属性。 */
interface BubbleMoreMenuProps {
  /** 当前本地化文案。 */
  locale: EditorLocale;
  /** 上标是否激活。 */
  isSuperscriptActive: boolean;
  /** 下标是否激活。 */
  isSubscriptActive: boolean;
  /** 左对齐是否激活。 */
  isAlignLeftActive: boolean;
  /** 居中对齐是否激活。 */
  isAlignCenterActive: boolean;
  /** 右对齐是否激活。 */
  isAlignRightActive: boolean;
  /** 两端对齐是否激活。 */
  isJustifyActive: boolean;
  /** 上标是否禁用。 */
  isSuperscriptDisabled: boolean;
  /** 下标是否禁用。 */
  isSubscriptDisabled: boolean;
  /** 减少缩进是否禁用。 */
  isDecreaseIndentDisabled: boolean;
  /** 增加缩进是否禁用。 */
  isIncreaseIndentDisabled: boolean;
  /** 切换上标。 */
  onToggleSuperscript: () => void;
  /** 切换下标。 */
  onToggleSubscript: () => void;
  /** 设置文本对齐。 */
  onSetTextAlign: (align: "left" | "center" | "right" | "justify") => void;
  /** 减少缩进。 */
  onDecreaseIndent: () => void;
  /** 增加缩进。 */
  onIncreaseIndent: () => void;
  /** 关闭更多菜单。 */
  onClose: () => void;
}

/** BubbleMenu 更多菜单内容。 */
export default function BubbleMoreMenu({
  locale,
  isSuperscriptActive,
  isSubscriptActive,
  isAlignLeftActive,
  isAlignCenterActive,
  isAlignRightActive,
  isJustifyActive,
  isSuperscriptDisabled,
  isSubscriptDisabled,
  isDecreaseIndentDisabled,
  isIncreaseIndentDisabled,
  onToggleSuperscript,
  onToggleSubscript,
  onSetTextAlign,
  onDecreaseIndent,
  onIncreaseIndent,
  onClose,
}: BubbleMoreMenuProps) {
  return (
    <div className="more-menu">
      <button
        onClick={() => {
          if (isSuperscriptDisabled) return;
          onToggleSuperscript();
          onClose();
        }}
        className={
          isSuperscriptActive && !isSuperscriptDisabled
            ? "bubble-menu-btn is-active"
            : isSuperscriptDisabled
              ? "bubble-menu-btn is-disabled"
              : "bubble-menu-btn"
        }
        title={locale.bubbleMenu.superscript}
        disabled={isSuperscriptDisabled}
        aria-disabled={isSuperscriptDisabled}
      >
        <Superscript size={16} />
      </button>
      <button
        onClick={() => {
          if (isSubscriptDisabled) return;
          onToggleSubscript();
          onClose();
        }}
        className={
          isSubscriptActive && !isSubscriptDisabled
            ? "bubble-menu-btn is-active"
            : isSubscriptDisabled
              ? "bubble-menu-btn is-disabled"
              : "bubble-menu-btn"
        }
        title={locale.bubbleMenu.subscript}
        disabled={isSubscriptDisabled}
        aria-disabled={isSubscriptDisabled}
      >
        <Subscript size={16} />
      </button>
      <div className="more-menu-separator" />
      <button
        onClick={() => {
          onSetTextAlign("left");
          onClose();
        }}
        className={isAlignLeftActive ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
        title={locale.bubbleMenu.alignLeft}
      >
        <AlignLeft size={16} />
      </button>
      <button
        onClick={() => {
          onSetTextAlign("center");
          onClose();
        }}
        className={isAlignCenterActive ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
        title={locale.bubbleMenu.alignCenter}
      >
        <AlignCenter size={16} />
      </button>
      <button
        onClick={() => {
          onSetTextAlign("right");
          onClose();
        }}
        className={isAlignRightActive ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
        title={locale.bubbleMenu.alignRight}
      >
        <AlignRight size={16} />
      </button>
      <button
        onClick={() => {
          onSetTextAlign("justify");
          onClose();
        }}
        className={isJustifyActive ? "bubble-menu-btn is-active" : "bubble-menu-btn"}
        title={locale.bubbleMenu.justify}
      >
        <AlignJustify size={16} />
      </button>
      <div className="more-menu-separator" />
      <button
        onClick={() => {
          if (isDecreaseIndentDisabled) return;
          onDecreaseIndent();
          onClose();
        }}
        className={
          isDecreaseIndentDisabled
            ? "bubble-menu-btn is-disabled"
            : "bubble-menu-btn"
        }
        title={locale.bubbleMenu.decreaseIndent}
        disabled={isDecreaseIndentDisabled}
        aria-disabled={isDecreaseIndentDisabled}
      >
        <ListIndentDecrease size={16} />
      </button>
      <button
        onClick={() => {
          if (isIncreaseIndentDisabled) return;
          onIncreaseIndent();
          onClose();
        }}
        className={
          isIncreaseIndentDisabled
            ? "bubble-menu-btn is-disabled"
            : "bubble-menu-btn"
        }
        title={locale.bubbleMenu.increaseIndent}
        disabled={isIncreaseIndentDisabled}
        aria-disabled={isIncreaseIndentDisabled}
      >
        <ListIndentIncrease size={16} />
      </button>
    </div>
  );
}
