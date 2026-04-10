import type { Editor } from "@tiptap/react";
import {
  SlashCommandKey,
  type CommandItem as SlashCommandItem,
} from "@/core/extensions/SlashCommands";
import { useEffect, useRef } from "react";
import { Command, CommandList, CommandItem } from "@/react/components/ui/command";
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
  /** 用于判断是否禁用「表格」等依赖上下文的选项（如在表格内禁用插入表格） */
  editor?: Editor | null;
}

const CommandMenu = ({
  items,
  command,
  selectedIndex,
  position,
  maxHeight,
  minHeight,
  editor,
}: CommandMenuProps) => {
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 40,
        // 空间不足时向上弹出：translateY(-100%) 使菜单底部对齐 top 坐标
        transform:
          position.placement === MenuPlacement.Top
            ? "translateY(-100%)"
            : undefined,
      }}
    >
      <Command shouldFilter={false} className="rounded-lg border shadow-md">
        <CommandList style={{ maxHeight: `${maxHeight}px`, minHeight: minHeight > 0 ? `${minHeight}px` : undefined, minWidth: "160px" }}>
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
};

export default CommandMenu;
