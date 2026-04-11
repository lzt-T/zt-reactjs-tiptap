import { useEffect, useState } from "react";
import { useFloating, offset, flip, shift } from "@floating-ui/react";

interface UseToolbarUIStateOptions {
  isEditorFocused: boolean;
}

/** 管理 Toolbar 内部浮层状态与定位信息。 */
export function useToolbarUIState({ isEditorFocused }: UseToolbarUIStateOptions) {
  const [showColorPicker, setShowColorPicker] = useState<
    "text" | "highlight" | null
  >(null);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showTableSizePicker, setShowTableSizePicker] = useState(false);
  const [isColorPickerReady, setIsColorPickerReady] = useState(false);
  const [isHeadingMenuReady, setIsHeadingMenuReady] = useState(false);
  const [isTableSizePickerReady, setIsTableSizePickerReady] = useState(false);

  const { refs: colorPickerRefs, floatingStyles: colorPickerFloatingStyles } =
    useFloating({
      open: showColorPicker !== null,
      placement: "bottom-start",
      middleware: [offset(8), flip({ padding: 16 }), shift({ padding: 16 })],
    });

  const { refs: headingMenuRefs, floatingStyles: headingMenuFloatingStyles } =
    useFloating({
      open: showHeadingMenu,
      placement: "bottom-start",
      middleware: [offset(8), flip({ padding: 16 }), shift({ padding: 16 })],
    });

  const {
    refs: tableSizePickerRefs,
    floatingStyles: tableSizePickerFloatingStyles,
  } = useFloating({
    open: showTableSizePicker,
    placement: "bottom-start",
    middleware: [offset(8), flip({ padding: 16 }), shift({ padding: 16 })],
  });

  useEffect(() => {
    if (showColorPicker) {
      const t0 = setTimeout(() => setIsColorPickerReady(false), 0);
      const t = setTimeout(() => setIsColorPickerReady(true), 50);
      return () => {
        clearTimeout(t0);
        clearTimeout(t);
      };
    }
    const t = setTimeout(() => setIsColorPickerReady(false), 0);
    return () => clearTimeout(t);
  }, [showColorPicker]);

  useEffect(() => {
    if (showHeadingMenu) {
      const t0 = setTimeout(() => setIsHeadingMenuReady(false), 0);
      const t = setTimeout(() => setIsHeadingMenuReady(true), 50);
      return () => {
        clearTimeout(t0);
        clearTimeout(t);
      };
    }
    const t = setTimeout(() => setIsHeadingMenuReady(false), 0);
    return () => clearTimeout(t);
  }, [showHeadingMenu]);

  useEffect(() => {
    if (showTableSizePicker) {
      const t0 = setTimeout(() => setIsTableSizePickerReady(false), 0);
      const t = setTimeout(() => setIsTableSizePickerReady(true), 50);
      return () => {
        clearTimeout(t0);
        clearTimeout(t);
      };
    }
    const t = setTimeout(() => setIsTableSizePickerReady(false), 0);
    return () => clearTimeout(t);
  }, [showTableSizePicker]);

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
    isColorPickerReady,
    isHeadingMenuReady,
    isTableSizePickerReady,
    colorPickerRefs,
    colorPickerFloatingStyles,
    headingMenuRefs,
    headingMenuFloatingStyles,
    tableSizePickerRefs,
    tableSizePickerFloatingStyles,
  };
}
