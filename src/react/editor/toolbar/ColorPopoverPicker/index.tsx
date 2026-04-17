import type { ReactNode } from "react";
import type { ColorOption } from "@/shared/config";
import type { EditorLocale } from "@/shared/locales";
import { cn } from "@/shared/utils/utils";
import ColorPicker from "@/react/editor/toolbar/ColorPicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/react/components/ui/popover";

interface ColorPopoverPickerProps {
  icon: ReactNode;
  title: string;
  type: "text" | "highlight";
  options: ColorOption[];
  selectedColor?: string;
  active?: boolean;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColorSelect: (color: string) => void;
  locale: EditorLocale;
  portalContainer?: HTMLElement | null;
  popoverClassName?: string;
  triggerClassName?: string;
}

/** 图标触发器 + 颜色面板的一体化组件。 */
export default function ColorPopoverPicker({
  icon,
  title,
  type,
  options,
  selectedColor,
  active = false,
  disabled = false,
  open,
  onOpenChange,
  onColorSelect,
  locale,
  portalContainer,
  popoverClassName,
  triggerClassName,
}: ColorPopoverPickerProps) {
  /** 统一处理 open 变化，禁用态下阻止打开。 */
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && disabled) return;
    onOpenChange(nextOpen);
  };

  /** 统一处理颜色选择后关闭 Popover。 */
  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild onMouseDown={(event) => event.preventDefault()}>
        <button
          type="button"
          className={cn(
            triggerClassName,
            active && "is-active",
            disabled && "is-disabled",
          )}
          title={title}
          disabled={disabled}
        >
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer ?? undefined}
        side="bottom"
        align="start"
        sideOffset={8}
        className={popoverClassName}
        onMouseDown={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        // 阻止菜单关闭时焦点回到触发器，避免编辑器被判定为失焦。
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <ColorPicker
          type={type}
          options={options}
          selectedColor={selectedColor}
          onColorSelect={handleColorSelect}
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  );
}
