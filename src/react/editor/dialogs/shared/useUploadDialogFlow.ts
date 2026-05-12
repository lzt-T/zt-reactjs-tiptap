import { useCallback, useState } from "react";

/** 通用上传流程配置。 */
interface UseUploadDialogFlowOptions {
  // 上传中状态（用于锁交互）。
  isUploading: boolean;
}

/** 通用上传流程返回。 */
interface UseUploadDialogFlowResult {
  // 拖拽高亮状态。
  isDragOver: boolean;
  // 上传中是否锁定可触发二次上传的交互。
  isInteractionLocked: boolean;
  // 清理通用状态。
  resetFlowStates: () => void;
  // 处理拖入高亮。
  handleDragOver: (e: React.DragEvent) => void;
  // 处理拖离高亮。
  handleDragLeave: (e: React.DragEvent) => void;
  // 处理 drop 并透传文件。
  handleDrop: (
    e: React.DragEvent,
    onFileDrop: (file: File) => void,
  ) => void;
  // 处理 Enter/Escape 快捷键。
  handleConfirmKeyDown: (
    e: React.KeyboardEvent,
    handlers: { onConfirm: () => void; onCancel: () => void },
  ) => void;
}

/** 上传弹窗通用交互流程：拖拽、键盘、锁定态。 */
export function useUploadDialogFlow({
  isUploading,
}: UseUploadDialogFlowOptions): UseUploadDialogFlowResult {
  const [isDragOver, setIsDragOver] = useState(false);
  const isInteractionLocked = isUploading;

  /** 清理流程级状态。 */
  const resetFlowStates = useCallback(() => {
    setIsDragOver(false);
  }, []);

  /** 进入拖拽高亮。 */
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isInteractionLocked) return;
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    },
    [isInteractionLocked],
  );

  /** 离开当前拖拽区域时取消高亮。 */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  /** 处理 drop：锁定时忽略，未锁定时透传首个文件。 */
  const handleDrop = useCallback(
    (e: React.DragEvent, onFileDrop: (file: File) => void) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (isInteractionLocked) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFileDrop(file);
    },
    [isInteractionLocked],
  );

  /** 统一处理确认/取消快捷键。 */
  const handleConfirmKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      handlers: { onConfirm: () => void; onCancel: () => void },
    ) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handlers.onConfirm();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handlers.onCancel();
      }
    },
    [],
  );

  return {
    isDragOver,
    isInteractionLocked,
    resetFlowStates,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleConfirmKeyDown,
  };
}
