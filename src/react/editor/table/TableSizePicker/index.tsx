import { useState, useCallback } from "react";
import { cn } from "@/shared/utils/utils";
import type { EditorLocale } from "@/shared/locales";
import "./TableSizePicker.css";

export interface TableSizePickerProps {
  /** 用户点击确认时回调，行、列均从 1 起 */
  onSelect: (rows: number, cols: number) => void;
  /** 网格行数上限，默认 10 */
  maxRows?: number;
  /** 网格列数上限，默认 10 */
  maxCols?: number;
  locale: EditorLocale;
}

const DEFAULT_MAX = 10;

export function TableSizePicker({
  onSelect,
  maxRows = DEFAULT_MAX,
  maxCols = DEFAULT_MAX,
  locale,
}: TableSizePickerProps): React.ReactElement {
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  const rows = Math.max(1, Math.min(maxRows, 15));
  const cols = Math.max(1, Math.min(maxCols, 15));

  const handleCellEnter = useCallback(
    (row: number, col: number) => {
      setHoverCell({ row, col });
    },
    []
  );

  const handleCellLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      onSelect(row, col);
    },
    [onSelect]
  );

  const selectedRows = hoverCell ? hoverCell.row : 0;
  const selectedCols = hoverCell ? hoverCell.col : 0;
  const labelText =
    selectedRows > 0 && selectedCols > 0
      ? `${selectedRows}×${selectedCols}`
      : "";

  return (
    <div
      className="table-size-picker"
      role="dialog"
      aria-label={locale.tableSizePicker.dialogAriaLabel}
    >
      <div
        className="table-size-picker-grid"
        style={{ "--rows": rows, "--cols": cols } as React.CSSProperties}
        onMouseLeave={handleCellLeave}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const row = r + 1;
          const col = c + 1;
          const isSelected =
            hoverCell != null && row <= hoverCell.row && col <= hoverCell.col;
          return (
            <button
              key={i}
              type="button"
              className={cn(
                "table-size-picker-cell",
                isSelected && "table-size-picker-cell-selected"
              )}
              onMouseEnter={() => handleCellEnter(row, col)}
              onClick={() => handleCellClick(row, col)}
              aria-label={locale.tableSizePicker.cellAriaLabel(row, col)}
            />
          );
        })}
      </div>
      {labelText && (
        <div className="table-size-picker-label" aria-live="polite">
          {labelText}
        </div>
      )}
    </div>
  );
}

export default TableSizePicker;
