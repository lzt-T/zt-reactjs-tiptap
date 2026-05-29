import {
  useCallback,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { ColorOption } from "@/shared/config";
import type { EditorLocale } from "@/shared/locales";
import { cn } from "@/shared/utils/utils";
import ColorPicker from "@/react/editor/color/ColorPicker";
import {
  FloatingPortalPanel,
  useFloatingPortalPanel,
} from "@/react/hooks";
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
  /** 传入时使用编辑器浮层定位，未传时保持 Radix Popover。 */
  floatingBoundary?: HTMLDivElement | null;
  /** Popover 碰撞边界，未传时保持 Radix 默认边界。 */
  collisionBoundary?: HTMLElement | null;
  /** 触发器脱离边界时是否隐藏 Popover。 */
  hideWhenDetached?: boolean;
  popoverClassName?: string;
  triggerClassName?: string;
}

/** 判断当前按下目标是否为可交互元素。 */
function isInteractiveMouseTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, button, label, [contenteditable="true"]',
    ),
  );
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
  floatingBoundary,
  collisionBoundary,
  hideWhenDetached = false,
  popoverClassName,
  triggerClassName,
}: ColorPopoverPickerProps) {
  /** 是否启用自定义编辑器浮层定位。 */
  const useFloatingOverlay =
    typeof HTMLDivElement !== "undefined" &&
    Boolean(floatingBoundary) &&
    portalContainer instanceof HTMLDivElement;
  /** 自定义浮层的 Portal 容器。 */
  const floatingPortalContainer =
    typeof HTMLDivElement !== "undefined" &&
    useFloatingOverlay &&
    portalContainer instanceof HTMLDivElement
      ? portalContainer
      : null;

  /** 统一处理 open 变化，禁用态下阻止打开。 */
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen && disabled) return;
    onOpenChange(nextOpen);
  }, [disabled, onOpenChange]);

  /** 颜色面板自定义浮层定位。 */
  const colorFloatingPanel = useFloatingPortalPanel({
    open: useFloatingOverlay && open,
    portalContainer: floatingPortalContainer,
    editorWrapper: floatingBoundary,
    placementBoundary: "editor-wrapper",
    fallbackWidth: 214,
    fallbackHeight: 260,
    onOutside: () => handleOpenChange(false),
  });

  /** 统一处理颜色选择后关闭 Popover。 */
  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onOpenChange(false);
  };

  /** 仅在非交互区域阻止默认行为，避免输入控件无法聚焦。 */
  const handleContentMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveMouseTarget(event.target)) return;
    event.preventDefault();
  };

  /** 切换自定义浮层打开状态。 */
  const handleFloatingTriggerClick = () => {
    if (disabled) return;
    if (open) {
      handleOpenChange(false);
      return;
    }
    colorFloatingPanel.updatePosition();
    handleOpenChange(true);
  };

  if (useFloatingOverlay) {
    /** 自定义浮层模式下的颜色面板。 */
    const floatingPanel =
      open && floatingPortalContainer
        ? (
            <FloatingPortalPanel
              panel={colorFloatingPanel}
              portalContainer={floatingPortalContainer}
              className={popoverClassName}
              onMouseDown={handleContentMouseDown}
            >
              <ColorPicker
                type={type}
                options={options}
                selectedColor={selectedColor}
                onColorSelect={handleColorSelect}
                locale={locale}
              />
            </FloatingPortalPanel>
          )
        : null;

    return (
      <>
        <button
          ref={colorFloatingPanel.triggerRef}
          type="button"
          className={cn(
            triggerClassName,
            active && "is-active",
            disabled && "is-disabled",
          )}
          title={title}
          disabled={disabled}
          aria-expanded={open}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleFloatingTriggerClick}
        >
          {icon}
        </button>
        {floatingPanel}
      </>
    );
  }

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
        collisionBoundary={collisionBoundary}
        hideWhenDetached={hideWhenDetached}
        side="bottom"
        align="start"
        sideOffset={8}
        className={popoverClassName}
        onMouseDown={handleContentMouseDown}
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
