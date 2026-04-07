import { useState, useCallback } from "react";
import type { RefObject } from "react";
import type { Editor } from "@tiptap/react";

interface UseImageUploadDialogOptions {
  editorRef: RefObject<Editor | null>;
}

export function useImageUploadDialog({
  editorRef,
}: UseImageUploadDialogOptions) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageDialogCallback, setImageDialogCallback] = useState<
    ((src: string, alt?: string) => void) | null
  >(null);

  const openImageDialog = useCallback(
    (callback: (src: string, alt?: string) => void) => {
      setImageDialogCallback(() => callback);
      setShowImageDialog(true);
    },
    []
  );

  const handleImageConfirm = useCallback(
    (src: string, alt?: string) => {
      if (imageDialogCallback) {
        imageDialogCallback(src, alt);
      }
      setShowImageDialog(false);
      setImageDialogCallback(null);
    },
    [imageDialogCallback]
  );

  const handleImageCancel = useCallback(() => {
    setShowImageDialog(false);
    setImageDialogCallback(null);
    // 关闭图片弹窗后将焦点还给编辑器，避免用户再次点击编辑区。
    editorRef.current?.commands.focus();
  }, [editorRef]);

  return {
    showImageDialog,
    openImageDialog,
    handleImageConfirm,
    handleImageCancel,
  };
}
