import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

interface UseToolbarUIStateOptions {
  isEditorFocused: boolean;
}

type ToolbarColorPickerType = "text" | "highlight" | null;

interface UseToolbarUIStateReturn {
  showColorPicker: ToolbarColorPickerType;
  setShowColorPicker: Dispatch<SetStateAction<ToolbarColorPickerType>>;
  showHeadingMenu: boolean;
  setShowHeadingMenu: Dispatch<SetStateAction<boolean>>;
  showTableSizePicker: boolean;
  setShowTableSizePicker: Dispatch<SetStateAction<boolean>>;
}

/** 管理 Toolbar 内部浮层状态与定位信息。 */
export function useToolbarUIState({
  isEditorFocused,
}: UseToolbarUIStateOptions): UseToolbarUIStateReturn {
  const [showColorPicker, setShowColorPicker] =
    useState<ToolbarColorPickerType>(null);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showTableSizePicker, setShowTableSizePicker] = useState(false);

  useEffect(() => {
    if (isEditorFocused) return;
    setShowColorPicker(null);
    setShowHeadingMenu(false);
    setShowTableSizePicker(false);
  }, [isEditorFocused]);

  return {
    showColorPicker,
    setShowColorPicker,
    showHeadingMenu,
    setShowHeadingMenu,
    showTableSizePicker,
    setShowTableSizePicker,
  };
}
