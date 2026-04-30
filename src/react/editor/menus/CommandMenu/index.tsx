import type { Editor } from "@tiptap/react";
import {
  SlashCommandKey,
  type CommandItem as SlashCommandItem,
} from "@/core/extensions/SlashCommands";
import {
  useCallback,
  useEffect,
  Fragment,
  useRef,
  type MutableRefObject,
  type RefObject,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import {
  Command,
  CommandGroup,
  CommandList,
  CommandItem,
} from "@/react/components/ui/command";
import { usePortalOverlayPosition } from "@/react/hooks/usePortalOverlayPosition";
import { cn } from "@/shared/utils/utils";
import { MenuPlacement } from "@/react/editor/types";
import type { EditorLocale } from "@/shared/locales";
import "./CommandMenu.css";

interface CommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  locale: EditorLocale;
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
  // 菜单连续分组，仅用于渲染分类标题。
  const groupedItems = createCommandMenuGroups(items, locale);

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
              // 表格内禁用重复插入表格。
              const isTableDisabled =
                item.key === SlashCommandKey.Table &&
                editor?.isActive?.("table");
              // 外部自定义禁用状态。
              const customDisabled =
                typeof item.disabled === "function"
                  ? editor
                    ? item.disabled({ editor })
                    : false
                  : !!item.disabled;
              // 最终禁用状态。
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
                    index === selectedIndex && "command-menu-item-selected",
                  )}
                >
                  {Icon && <Icon className="mr-1 h-4 w-4" />}
                  {item.title}
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

  if (portalContainer && viewport) {
    return createPortal(menuContent, portalContainer);
  }

  // Portal 挂载点未就绪时回退原地渲染，避免首帧菜单丢失。
  return menuContent;
};

export default CommandMenu;
