import type { FormulaPickerCategory } from "@/shared/config/formulaCategories";
import type { EditorLocale } from "@/shared/locales";
import MathDialog from "@/react/editor/dialogs/MathDialog";
import ImageUploadDialog from "@/react/editor/dialogs/ImageUploadDialog";
import FileUploadDialog from "@/react/editor/dialogs/FileUploadDialog";

interface EditorDialogsProps {
  portalContainer: HTMLDivElement | null;
  formulaCategories: FormulaPickerCategory[] | undefined;
  locale: EditorLocale;
  imageMaxSizeBytes: number;
  fileMaxSizeBytes: number;
  fileUploadTypes: string[];
  onImagePreUpload: ((file: File) => Promise<string>) | undefined;
  onFilePreUpload: ((file: File) => Promise<{ url: string; name: string }>) | undefined;
  onImageUploadAfterChange: (payload: { file: File; url: string; alt?: string }) => void;
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
  onPortalContainerRef: (node: HTMLDivElement | null) => void;
}

/** 编辑器相关弹窗渲染：数学公式、图片上传与附件上传。 */
export default function EditorDialogs({
  portalContainer,
  formulaCategories,
  locale,
  imageMaxSizeBytes,
  fileMaxSizeBytes,
  fileUploadTypes,
  onImagePreUpload,
  onFilePreUpload,
  onImageUploadAfterChange,
  onFileUploadAfterChange,
  mathDialog,
  imageDialog,
  fileUploadDialog,
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
        imageMaxSizeBytes={imageMaxSizeBytes}
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
