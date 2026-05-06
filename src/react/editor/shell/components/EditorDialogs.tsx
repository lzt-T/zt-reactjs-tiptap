import type { FormulaPickerCategory } from "@/shared/config/formulaCategories";
import type { EditorLocale } from "@/shared/locales";
import type { EditorErrorEvent } from "@/react/editor/types";
import MathDialog from "@/react/editor/dialogs/MathDialog";
import ImageUploadDialog from "@/react/editor/dialogs/ImageUploadDialog";
import FileUploadDialog from "@/react/editor/dialogs/FileUploadDialog";
import VideoUploadDialog from "@/react/editor/dialogs/VideoUploadDialog";

interface EditorDialogsProps {
  portalContainer: HTMLDivElement | null;
  formulaCategories: FormulaPickerCategory[] | undefined;
  locale: EditorLocale;
  imageMaxSizeBytes: number;
  videoMaxSizeBytes: number;
  fileMaxSizeBytes: number;
  fileUploadTypes: string[];
  onImagePreUpload: ((file: File) => Promise<string>) | undefined;
  onVideoPreUpload: ((file: File) => Promise<string>) | undefined;
  onFilePreUpload: ((file: File) => Promise<{ url: string; name: string }>) | undefined;
  onError: ((event: EditorErrorEvent) => void) | undefined;
  onImageUploadAfterChange: (payload: { file: File; url: string; alt?: string }) => void;
  onVideoUploadAfterChange: (payload: { file: File; url: string; title?: string }) => void;
  onFileUploadAfterChange: (payload: { file: File; url: string; name: string }) => void;
  mathDialog: {
    showMathDialog: boolean;
    mathDialogType: "inline" | "block";
    mathDialogInitialValue: string;
    handleMathConfirm: (latex: string) => void;
    handleMathCancel: () => void;
  };
  imageDialog: {
    showImageDialog: boolean;
    handleImageConfirm: (src: string, alt?: string) => void;
    handleImageCancel: () => void;
  };
  fileUploadDialog: {
    showFileUploadDialog: boolean;
    handleFileUploadConfirm: (url: string, name: string) => void;
    handleFileUploadCancel: () => void;
  };
  videoDialog: {
    showVideoDialog: boolean;
    handleVideoConfirm: (src: string, title?: string) => void;
    handleVideoCancel: () => void;
  };
  onPortalContainerRef: (node: HTMLDivElement | null) => void;
}

/** 编辑器相关弹窗渲染：数学公式、图片/视频上传与附件上传。 */
export default function EditorDialogs({
  portalContainer,
  formulaCategories,
  locale,
  imageMaxSizeBytes,
  videoMaxSizeBytes,
  fileMaxSizeBytes,
  fileUploadTypes,
  onImagePreUpload,
  onVideoPreUpload,
  onFilePreUpload,
  onError,
  onImageUploadAfterChange,
  onVideoUploadAfterChange,
  onFileUploadAfterChange,
  mathDialog,
  imageDialog,
  fileUploadDialog,
  videoDialog,
  onPortalContainerRef,
}: EditorDialogsProps) {
  return (
    <>
      <MathDialog
        isOpen={mathDialog.showMathDialog}
        type={mathDialog.mathDialogType}
        initialValue={mathDialog.mathDialogInitialValue}
        onConfirm={mathDialog.handleMathConfirm}
        onCancel={mathDialog.handleMathCancel}
        formulaCategories={formulaCategories}
        locale={locale}
        portalContainer={portalContainer}
      />
      <ImageUploadDialog
        isOpen={imageDialog.showImageDialog}
        onConfirm={imageDialog.handleImageConfirm}
        onCancel={imageDialog.handleImageCancel}
        onPreUpload={onImagePreUpload}
        onUpload={onImageUploadAfterChange}
        onError={onError}
        imageMaxSizeBytes={imageMaxSizeBytes}
        locale={locale}
        portalContainer={portalContainer}
      />
      <VideoUploadDialog
        isOpen={videoDialog.showVideoDialog}
        onConfirm={videoDialog.handleVideoConfirm}
        onCancel={videoDialog.handleVideoCancel}
        onPreUpload={onVideoPreUpload}
        onUpload={onVideoUploadAfterChange}
        onError={onError}
        videoMaxSizeBytes={videoMaxSizeBytes}
        locale={locale}
        portalContainer={portalContainer}
      />
      {onFilePreUpload && (
        <FileUploadDialog
          isOpen={fileUploadDialog.showFileUploadDialog}
          onConfirm={fileUploadDialog.handleFileUploadConfirm}
          onCancel={fileUploadDialog.handleFileUploadCancel}
          onPreUpload={onFilePreUpload}
          onUpload={onFileUploadAfterChange}
          onError={onError}
          fileMaxSizeBytes={fileMaxSizeBytes}
          fileUploadTypes={fileUploadTypes}
          locale={locale}
          portalContainer={portalContainer}
        />
      )}
      <div ref={onPortalContainerRef} className="zt-tiptap-portal" />
    </>
  );
}
