import TableSizePicker from "@/react/editor/table/TableSizePicker";
import type { TableSizePickerDropdownProps } from "../types";

export function TableSizePickerDropdown({
  showTableSizePicker,
  onClose,
  setFloating,
  floatingStyles,
  isReady,
  locale,
  onSelect,
}: TableSizePickerDropdownProps) {
  if (!showTableSizePicker) return null;

  return (
    <>
      <div className="editor-toolbar-overlay" onClick={onClose} aria-hidden />
      <div
        ref={setFloating}
        className="editor-toolbar-table-size-dropdown"
        style={{
          ...floatingStyles,
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.1s ease",
        }}
      >
        <TableSizePicker onSelect={onSelect} locale={locale} />
      </div>
    </>
  );
}
