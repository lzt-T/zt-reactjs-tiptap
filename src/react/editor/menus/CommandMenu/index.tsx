import type { Editor } from "@tiptap/react";
import {
  SlashCommandKey,
  type CommandItem as SlashCommandItem,
} from "@/core/extensions/SlashCommands";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { Command, CommandList, CommandItem } from "@/react/components/ui/command";
import { cn } from "@/shared/utils/utils";
import { MenuPlacement } from "@/react/editor/types";
import "./CommandMenu.css";

interface ViewportPosition {
  top: number;
  left: number;
}

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

/** 将编辑器内容坐标换算为视口坐标。 */
function resolveViewportPosition(
  wrapper: HTMLDivElement | null,
  position: { top: number; left: number },
): ViewportPosition | null {
  if (!wrapper) return null;

  const wrapperRect = wrapper.getBoundingClientRect();
  return {
    top: wrapperRect.top + position.top - wrapper.scrollTop,
    left: wrapperRect.left + position.left - wrapper.scrollLeft,
  };
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
  // 当前编辑器滚动容器节点（用于依赖追踪，处理 ref 节点切换）。
  const wrapperElement = editorWrapperRef.current;
  // 动画帧 ID：用于合并高频滚动/缩放重算请求。
  const rafIdRef = useRef<number | null>(null);
  // 视口坐标：Portal + fixed 渲染时使用。
  const [viewportPosition, setViewportPosition] = useState<ViewportPosition | null>(
    null,
  );

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

  /** 重新计算菜单视口坐标。 */
  const syncViewportPosition = useCallback(() => {
    const next = resolveViewportPosition(wrapperElement, position);
    setViewportPosition((prev) => {
      if (!next) return null;
      if (prev && prev.top === next.top && prev.left === next.left) return prev;
      return next;
    });
  }, [position.left, position.top, position.placement, wrapperElement]);

  /** 通过 RAF 节流重算，减少外部滚动场景的重排抖动。 */
  const scheduleSyncViewportPosition = useCallback(() => {
    if (typeof window === "undefined") return;

    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      syncViewportPosition();
    });
  }, [syncViewportPosition]);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    scheduleSyncViewportPosition();
  }, [scheduleSyncViewportPosition]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;

    const handleRecalc = () => scheduleSyncViewportPosition();

    window.addEventListener("resize", handleRecalc);
    document.addEventListener("scroll", handleRecalc, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("resize", handleRecalc);
      document.removeEventListener("scroll", handleRecalc, {
        capture: true,
      });
    };
  }, [
    position.left,
    position.top,
    position.placement,
    portalContainer,
    scheduleSyncViewportPosition,
    wrapperElement,
  ]);

  useEffect(
    () => () => {
      if (typeof window === "undefined" || rafIdRef.current === null) return;
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    },
    [],
  );

  if (items.length === 0) {
    return null;
  }

  const viewport = viewportPosition ?? resolveViewportPosition(wrapperElement, position);
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
