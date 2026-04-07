import { useState, useCallback } from "react";
import type { RefObject } from "react";
import type { Editor } from "@tiptap/react";

interface UseFileUploadDialogOptions {
  editorRef: RefObject<Editor | null>;
}

export function useFileUploadDialog({
  editorRef,
}: UseFileUploadDialogOptions) {
  const [showFileUploadDialog, setShowFileUploadDialog] = useState(false);
  const [fileUploadCallback, setFileUploadCallback] = useState<
    ((url: string, name: string) => void) | null
  >(null);

  const openFileUploadDialog = useCallback(
    (callback: (url: string, name: string) => void) => {
      setFileUploadCallback(() => callback);
      setShowFileUploadDialog(true);
    },
    []
  );

  const handleFileUploadConfirm = useCallback(
    (url: string, name: string) => {
      if (fileUploadCallback) {
        fileUploadCallback(url, name);
      }
      setShowFileUploadDialog(false);
      setFileUploadCallback(null);
    },
    [fileUploadCallback]
  );

  const handleFileUploadCancel = useCallback(() => {
    setShowFileUploadDialog(false);
    setFileUploadCallback(null);
    // 关闭附件弹窗后恢复编辑器焦点，保证可以直接继续输入。
    editorRef.current?.commands.focus();
  }, [editorRef]);

  return {
    showFileUploadDialog,
    openFileUploadDialog,
    handleFileUploadConfirm,
    handleFileUploadCancel,
  };
}
