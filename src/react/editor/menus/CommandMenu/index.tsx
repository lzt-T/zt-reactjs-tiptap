import type { CommandItem as SlashCommandItem } from "@/core/extensions/SlashCommands";
import { useEffect, Fragment, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Command,
  CommandGroup,
  CommandList,
  CommandItem,
} from "@/react/components/ui/command";
import {
  useEditorFloatingOverlayPosition,
  type EditorFloatingOverlayPositionContext,
} from "@/react/hooks/useEditorFloatingOverlayPosition";
import { cn } from "@/shared/utils/utils";
import { MenuPlacement } from "@/react/editor/types";
import type { EditorLocale } from "@/shared/locales";
import "./CommandMenu.css";

interface CommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  locale: EditorLocale;
  selectedIndex: number;
  positionContext: EditorFloatingOverlayPositionContext;
  maxHeight: number;
  minHeight: number;
  /** 编辑器内 Portal 挂载容器：存在时优先使用 Portal 渲染。 */
  portalContainer?: HTMLDivElement | null;
}

interface CommandMenuGroupModel {
  title?: string;
  items: Array<{
    item: SlashCommandItem;
    index: number;
  }>;
}

/** 获取 Slash 命令分组标题，未知分组直接显示原始分组名。 */
function getSlashCommandGroupTitle(
  group: string | undefined,
  locale: EditorLocale,
): string | undefined {
  if (!group) return undefined;
  return (
    locale.slashCommandGroups[
      group as keyof EditorLocale["slashCommandGroups"]
    ] ?? group
  );
}

/** 按连续 group 生成菜单渲染分组，不改变原始命令顺序。 */
function createCommandMenuGroups(
  items: SlashCommandItem[],
  locale: EditorLocale,
): CommandMenuGroupModel[] {
  // 连续分组结果。
  const groups: CommandMenuGroupModel[] = [];

  items.forEach((item, index) => {
    // 当前项分组标题。
    const title = getSlashCommandGroupTitle(item.group, locale);
    // 前一个连续分组。
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.title === title) {
      lastGroup.items.push({ item, index });
      return;
    }

    groups.push({
      title,
      items: [{ item, index }],
    });
  });

  return groups;
}

/** Slash 命令菜单：负责渲染与滚动到当前选中项。 */
const CommandMenu = ({
  items,
  command,
  locale,
  selectedIndex,
  positionContext,
  maxHeight,
  minHeight,
  portalContainer,
}: CommandMenuProps) => {
  // 当前高亮项的 DOM 引用，用于自动滚动到可视区域。
  const selectedRef = useRef<HTMLDivElement>(null);
  // Milkdown 式命令式定位，避免滚动/缩放时通过 React state 追帧。
  const { overlayRef, updatePosition } = useEditorFloatingOverlayPosition({
    context: positionContext,
    portalContainer,
    enabled: items.length > 0,
  });

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: "nearest",
      });
      // 列表滚动后同步一次菜单锚点，避免视觉漂移。
      updatePosition();
    }
  }, [selectedIndex, updatePosition]);

  if (items.length === 0) {
    return null;
  }

  // 初始展开方向样式，后续由命令式定位 Hook 保持同步。
  const transform =
    positionContext.placement === MenuPlacement.Top
      ? "translateY(-100%)"
      : undefined;
  // 菜单连续分组，仅用于渲染分类标题。
  const groupedItems = createCommandMenuGroups(items, locale);

  const menuContent = (
    <div
      className="command-menu-overlay"
      style={{
        position: "absolute",
        visibility: "hidden",
        transform,
      }}
      ref={overlayRef}
    >
      <Command shouldFilter={false} className="command-menu-shell">
        <CommandList
          style={{
            maxHeight: `${maxHeight}px`,
            minHeight: minHeight > 0 ? `${minHeight}px` : undefined,
            minWidth: "160px",
          }}
        >
          {groupedItems.map((group, groupIndex) => {
            // 当前分组的命令节点。
            const commandItems = group.items.map(({ item, index }) => {
              // 当前命令图标。
              const Icon = item.icon;
              // 当前命令文本图标。
              const iconLabel = item.iconLabel;
              // 文本图标对应的标题样式标记。
              const headingStyle = iconLabel
                ? iconLabel.toLowerCase() === "p"
                  ? "paragraph"
                  : iconLabel.toLowerCase()
                : undefined;
              // 最终禁用状态由 TipTap Suggestion 层统一计算。
              const disabled = !!item.disabled;
              return (
                <CommandItem
                  key={item.title}
                  ref={index === selectedIndex ? selectedRef : null}
                  value={item.title}
                  disabled={disabled}
                  data-heading-style={headingStyle}
                  onSelect={() => {
                    if (disabled) return;
                    command(item);
                  }}
                  className={cn(
                    index === selectedIndex && "command-menu-item-selected",
                  )}
                >
                  {Icon && <Icon className="mr-1 h-4 w-4" />}
                  {!Icon && iconLabel && (
                    <span className="command-menu-text-icon">{iconLabel}</span>
                  )}
                  <span className="command-menu-item-title">{item.title}</span>
                </CommandItem>
              );
            });

            if (!group.title) {
              return (
                <Fragment key={`ungrouped-${groupIndex}`}>
                  {commandItems}
                </Fragment>
              );
            }

            return (
              <CommandGroup
                key={`${group.title}-${groupIndex}`}
                heading={group.title}
                className="command-menu-group"
              >
                {commandItems}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </div>
  );

  if (portalContainer) {
    return createPortal(menuContent, portalContainer);
  }

  // 无 Portal 挂载点时回退原地渲染。
  return menuContent;
};

export default CommandMenu;
