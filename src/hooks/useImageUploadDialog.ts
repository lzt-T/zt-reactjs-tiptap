import { useState, useCallback } from "react";

export function useImageUploadDialog() {
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
  }, []);

  return {
    showImageDialog,
    openImageDialog,
    handleImageConfirm,
    handleImageCancel,
  };
}
