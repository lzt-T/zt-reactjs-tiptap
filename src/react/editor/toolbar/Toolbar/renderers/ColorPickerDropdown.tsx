import ColorPicker from "@/react/editor/toolbar/ColorPicker";
import type { ColorPickerDropdownProps } from "../types";

export function ColorPickerDropdown({
  showColorPicker,
  onClose,
  setFloating,
  floatingStyles,
  isReady,
  editor,
  locale,
  onTextColorSelect,
  onHighlightColorSelect,
}: ColorPickerDropdownProps) {
  if (!showColorPicker) return null;

  return (
    <>
      <div className="editor-toolbar-overlay" onClick={onClose} aria-hidden />
      <div
        ref={setFloating}
        className="editor-toolbar-dropdown"
        style={{
          ...floatingStyles,
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.1s ease",
        }}
      >
        <ColorPicker
          type={showColorPicker}
          selectedColor={
            showColorPicker === "text"
              ? editor.getAttributes("textStyle").color
              : editor.getAttributes("highlight").color
          }
          onColorSelect={
            showColorPicker === "text"
              ? onTextColorSelect
              : onHighlightColorSelect
          }
          locale={locale}
        />
      </div>
    </>
  );
}
