import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/shared/utils/utils"
import { Button } from "@/react/components/ui/button"

/** Dialog Portal 组件属性别名。 */
type DialogPortalProps = React.ComponentProps<typeof DialogPrimitive.Portal>

// Dialog 当前开关状态上下文。
const DialogOpenContext = React.createContext(false)

/**
 * 同步主题变量到 body 弹窗宿主。
 */
function syncDialogHostThemeVariables(host: HTMLElement, themeRoot: Element) {
  // 编辑器主题根节点的最终样式。
  const themeRootStyle = window.getComputedStyle(themeRoot)
  for (let index = 0; index < themeRootStyle.length; index += 1) {
    // 当前 CSS 属性名。
    const propertyName = themeRootStyle.item(index)
    if (!propertyName.startsWith("--")) {
      continue
    }

    // 当前 CSS 变量值。
    const propertyValue = themeRootStyle.getPropertyValue(propertyName)
    if (propertyValue) {
      host.style.setProperty(propertyName, propertyValue.trim())
    }
  }
}

/**
 * 创建挂在 body 下的全屏 Dialog 隔离宿主。
 */
function createBodyDialogHost(portalContainer: HTMLElement) {
  // 当前编辑器主题根节点。
  const themeRoot = portalContainer.closest(".zt-tiptap-theme")
  // body 下的 Dialog 宿主节点。
  const host = document.createElement("div")
  host.className = "zt-tiptap-theme zt-tiptap-dialog-host"

  if (themeRoot?.classList.contains("dark")) {
    host.classList.add("dark")
  }

  if (themeRoot) {
    syncDialogHostThemeVariables(host, themeRoot)
  }

  document.body.appendChild(host)
  return host
}

/** 渲染对话框根节点。 */
function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  // 非受控 Dialog 的当前开关状态。
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  // 当前 Dialog 是否由外部受控。
  const isControlled = open !== undefined
  // 当前 Dialog 实际开关状态。
  const currentOpen = open ?? uncontrolledOpen

  /** 同步 Dialog 开关状态。 */
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange]
  )

  return (
    <DialogOpenContext.Provider value={currentOpen}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </DialogOpenContext.Provider>
  )
}

/** 渲染对话框触发器。 */
function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

/** 渲染对话框 Portal 容器。 */
function DialogPortal({
  ...props
}: DialogPortalProps) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

/** 渲染对话框关闭按钮容器。 */
function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/** 渲染对话框遮罩层，提升深色主题下的背景分离度。 */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[100] bg-black/56 dark:bg-black/62",
        className
      )}
      {...props}
    />
  )
}

/** 渲染对话框主体内容，统一使用浮层背景与增强阴影。 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  portalContainer,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  portalContainer?: HTMLElement | null
}) {
  // 当前 Dialog 是否打开。
  const isDialogOpen = React.useContext(DialogOpenContext)
  // body 下的全屏 Dialog 宿主。
  const [bodyDialogHost, setBodyDialogHost] =
    React.useState<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!portalContainer || !isDialogOpen) {
      setBodyDialogHost(null)
      return
    }

    // 当前 Dialog 对应的 body 宿主。
    const host = createBodyDialogHost(portalContainer)
    setBodyDialogHost(host)

    return () => {
      host.remove()
    }
  }, [isDialogOpen, portalContainer])

  if (portalContainer && isDialogOpen && !bodyDialogHost) {
    return null
  }

  // Radix Dialog 实际挂载容器。
  const resolvedPortalContainer =
    portalContainer && isDialogOpen ? bodyDialogHost ?? undefined : undefined

  return (
    <DialogPortal data-slot="dialog-portal" container={resolvedPortalContainer}>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-popover text-popover-foreground border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[100] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-[var(--ui-shadow-popover)] duration-200 outline-none sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/** 渲染对话框头部容器。 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

/** 渲染对话框底部容器。 */
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

/** 渲染对话框标题。 */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

/** 渲染对话框描述文本。 */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
