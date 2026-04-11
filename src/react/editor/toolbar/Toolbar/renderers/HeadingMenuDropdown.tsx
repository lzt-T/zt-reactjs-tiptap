import type { HeadingMenuDropdownProps } from "../types";

export function HeadingMenuDropdown({
  showHeadingMenu,
  onClose,
  setFloating,
  floatingStyles,
  isReady,
  showActiveState,
  currentHeadingLevel,
  locale,
  onHeadingSelect,
}: HeadingMenuDropdownProps) {
  if (!showHeadingMenu) return null;

  return (
    <>
      <div className="editor-toolbar-overlay" onClick={onClose} aria-hidden />
      <div
        ref={setFloating}
        className="editor-toolbar-heading-menu"
        style={{
          ...floatingStyles,
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.1s ease",
        }}
      >
        {([1, 2, 3] as const).map((level) => (
          <button
            key={level}
            type="button"
            className={`editor-toolbar-heading-item ${
              showActiveState && currentHeadingLevel === level ? "is-active" : ""
            }`}
            onClick={() => onHeadingSelect(level)}
            title={locale.toolbar.headingLevel(level)}
          >
            <span className="editor-toolbar-heading-num">H{["₁", "₂", "₃"][level - 1]}</span>
            <span>{locale.toolbar.headingLevel(level)}</span>
          </button>
        ))}
      </div>
    </>
  );
}
