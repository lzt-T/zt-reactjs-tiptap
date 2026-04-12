import type { Editor } from "@tiptap/react";
import {
  SlashCommandKey,
  type CommandItem as SlashCommandItem,
} from "@/core/extensions/SlashCommands";
import {
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { Command, CommandList, CommandItem } from "@/react/components/ui/command";
import { usePortalOverlayPosition } from "@/react/hooks/usePortalOverlayPosition";
import { cn } from "@/shared/utils/utils";
import { MenuPlacement } from "@/react/editor/types";
import "./CommandMenu.css";

interface CommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  selectedIndex: number;
  position: { top: number; left: number; placement: MenuPlacement };
  maxHeight: number;
  minHeight: number;
  /** 菜单根节点 ref，用于回填真实尺寸后重算位置。 */
  overlayRef?: Ref<HTMLDivElement>;
  /** 用于判断是否禁用「表格」等依赖上下文的选项（如在表格内禁用插入表格） */
  editor?: Editor | null;
  /** 编辑器内 Portal 挂载容器：存在时优先使用 Portal 渲染。 */
  portalContainer?: HTMLDivElement | null;
  /** 编辑器滚动容器引用：用于内容坐标到视口坐标换算。 */
  editorWrapperRef: RefObject<HTMLDivElement | null>;
}

/** Slash 命令菜单：负责渲染与滚动到当前选中项。 */
const CommandMenu = ({
  items,
  command,
  selectedIndex,
  position,
  maxHeight,
  minHeight,
  overlayRef,
  editor,
  portalContainer,
  editorWrapperRef,
}: CommandMenuProps) => {
  // 当前高亮项的 DOM 引用，用于自动滚动到可视区域。
  const selectedRef = useRef<HTMLDivElement>(null);
  // 通用 Portal 浮层视口定位。
  const { viewportPosition, scheduleSync } = usePortalOverlayPosition({
    editorWrapperRef,
    position,
    enabled: items.length > 0,
  });

  /** 同步本地 ref 与外部 overlayRef。 */
  const setMenuRefs = useCallback(
    (node: HTMLDivElement | null) => {
      if (!overlayRef) return;
      if (typeof overlayRef === "function") {
        overlayRef(node);
        return;
      }
      (overlayRef as MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [overlayRef],
  );

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
      // 列表滚动后同步一次菜单锚点，避免视觉漂移。
      scheduleSync();
    }
  }, [scheduleSync, selectedIndex]);

  if (items.length === 0) {
    return null;
  }

  const viewport = viewportPosition;
  const transform =
    position.placement === MenuPlacement.Top
      ? "translateY(-100%)"
      : undefined;

  const menuContent = (
    <div
      className="command-menu-overlay"
      style={{
        position: portalContainer && viewport ? "fixed" : "absolute",
        top: portalContainer && viewport ? viewport.top : position.top,
        left: portalContainer && viewport ? viewport.left : position.left,
        transform,
      }}
      ref={setMenuRefs}
    >
      <Command shouldFilter={false} className="rounded-lg border shadow-md">
        <CommandList
          style={{
            maxHeight: `${maxHeight}px`,
            minHeight: minHeight > 0 ? `${minHeight}px` : undefined,
            minWidth: "160px",
          }}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const isTableDisabled =
              item.key === SlashCommandKey.Table && editor?.isActive?.("table");
            const customDisabled =
              typeof item.disabled === "function"
                ? editor
                  ? item.disabled({ editor })
                  : false
                : !!item.disabled;
            const disabled = isTableDisabled || customDisabled;
            return (
              <CommandItem
                key={item.title}
                ref={index === selectedIndex ? selectedRef : null}
                value={item.title}
                disabled={disabled}
                onSelect={() => {
                  if (disabled) return;
                  command(item);
                }}
                className={cn(
                  index === selectedIndex && "bg-accent text-accent-foreground"
                )}
              >
                {Icon && <Icon className="mr-1 h-4 w-4" />}
                {item.title}
              </CommandItem>
            );
          })}
        </CommandList>
      </Command>
    </div>
  );

  if (portalContainer && viewport) {
    return createPortal(menuContent, portalContainer);
  }

  // Portal 挂载点未就绪时回退原地渲染，避免首帧菜单丢失。
  return menuContent;
};

export default CommandMenu;
