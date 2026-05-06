import { useState, useCallback } from "react";
import type { RefObject } from "react";
import type { Editor } from "@tiptap/react";

interface UseVideoUploadDialogOptions {
  editorRef: RefObject<Editor | null>;
}

export function useVideoUploadDialog({
  editorRef,
}: UseVideoUploadDialogOptions) {
  // 视频弹窗可见状态。
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  // 视频确认后的回调引用。
  const [videoDialogCallback, setVideoDialogCallback] = useState<
    ((src: string, title?: string) => void) | null
  >(null);

  const openVideoDialog = useCallback(
    (callback: (src: string, title?: string) => void) => {
      setVideoDialogCallback(() => callback);
      setShowVideoDialog(true);
    },
    []
  );

  const handleVideoConfirm = useCallback(
    (src: string, title?: string) => {
      if (videoDialogCallback) {
        videoDialogCallback(src, title);
      }
      setShowVideoDialog(false);
      setVideoDialogCallback(null);
    },
    [videoDialogCallback]
  );

  const handleVideoCancel = useCallback(() => {
    setShowVideoDialog(false);
    setVideoDialogCallback(null);
    // 关闭视频弹窗后恢复编辑器焦点，便于继续输入。
    editorRef.current?.commands.focus();
  }, [editorRef]);

  return {
    showVideoDialog,
    openVideoDialog,
    handleVideoConfirm,
    handleVideoCancel,
  };
}

