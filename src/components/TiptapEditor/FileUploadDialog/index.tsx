import { useState, useRef, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileUp, AlertCircle } from "lucide-react";
import { config } from "@/config";
import { formatFileSize } from "@/lib/utils";
import "./FileUploadDialog.css";

const EXTENSION_MIME_MAP: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  doc: ["application/msword"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ppt: ["application/vnd.ms-powerpoint"],
  txt: ["text/plain"],
};

function normalizeFileUploadTypes(fileUploadTypes?: string[]): string[] {
  const normalized = Array.from(
    new Set(
      (fileUploadTypes ?? [])
        .map((item) => item.trim().toLowerCase().replace(/^\.+/, ""))
        .filter(Boolean)
    )
  );

  return normalized.length > 0 ? normalized : config.DEFAULT_FILE_UPLOAD_TYPES;
}

function buildAllowedMimeTypeSet(fileUploadTypes: string[]): Set<string> {
  return new Set(
    fileUploadTypes.flatMap((ext) => EXTENSION_MIME_MAP[ext] ?? [])
  );
}

function isAllowedFile(
  file: File,
  fileUploadTypes: string[],
  allowedMimeTypes: Set<string>
): boolean {
  const name = file.name.toLowerCase();
  if (fileUploadTypes.some((ext) => name.endsWith(`.${ext}`))) {
    return true;
  }
  const mime = file.type.toLowerCase();
  if (mime && allowedMimeTypes.has(mime)) {
    return true;
  }
  return false;
}

function formatAcceptedTypes(fileUploadTypes: string[]): string {
  return fileUploadTypes.map((ext) => `.${ext.toUpperCase()}`).join(", ");
}

function formatAcceptedTypeTag(ext: string): string {
  return ext.toUpperCase();
}

export interface FileUploadDialogProps {
  isOpen: boolean;
  onConfirm: (url: string, name: string) => void;
  onCancel: () => void;
  onPreUpload: (file: File) => Promise<{ url: string; name: string }>;
  onUpload?: (payload: { file: File; url: string; name: string }) => void | Promise<void>;
  fileMaxSizeBytes?: number;
  fileUploadTypes?: string[];
}

const FileUploadDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  onPreUpload,
  onUpload,
  fileMaxSizeBytes = config.FILE_UPLOAD_MAX_SIZE_BYTES,
  fileUploadTypes,
}: FileUploadDialogProps) => {
  const resolvedFileUploadTypes = useMemo(
    () => normalizeFileUploadTypes(fileUploadTypes),
    [fileUploadTypes]
  );
  const allowedMimeTypes = useMemo(
    () => buildAllowedMimeTypeSet(resolvedFileUploadTypes),
    [resolvedFileUploadTypes]
  );
  const accept = useMemo(
    () => resolvedFileUploadTypes.map((ext) => `.${ext}`).join(","),
    [resolvedFileUploadTypes]
  );
  const acceptedTypesLabel = useMemo(
    () => formatAcceptedTypes(resolvedFileUploadTypes),
    [resolvedFileUploadTypes]
  );
  const acceptedTypeTags = useMemo(
    () => resolvedFileUploadTypes.map((ext) => formatAcceptedTypeTag(ext)),
    [resolvedFileUploadTypes]
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ url: string; name: string } | null>(
    null
  );
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 上传进行中时锁定可能再次触发上传的交互入口（保留 Cancel 可用）
  const isInteractionLocked = isUploading;

  const resetStates = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setError("");
    setIsUploading(false);
    setIsDragOver(false);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!isAllowedFile(file, resolvedFileUploadTypes, allowedMimeTypes)) {
        setSelectedFile(null);
        setResult(null);
        setError(`Please select a supported file type: ${acceptedTypesLabel}`);
        return;
      }
      if (file.size > fileMaxSizeBytes) {
        setSelectedFile(null);
        setResult(null);
        setError(`File size must not exceed ${formatFileSize(fileMaxSizeBytes)}`);
        return;
      }

      setSelectedFile(file);
      setError("");
      try {
        setIsUploading(true);
        const res = await onPreUpload(file);
        setResult(res);
      } catch (err) {
        setResult(null);
        setError(
          err instanceof Error ? err.message : "Upload failed, please try again"
        );
      } finally {
        setIsUploading(false);
      }
    },
    [acceptedTypesLabel, allowedMimeTypes, onPreUpload, fileMaxSizeBytes, resolvedFileUploadTypes]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 上传中不进入拖拽高亮态，避免误导用户当前可重新上传
    if (isInteractionLocked) return;
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, [isInteractionLocked]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      // 上传中直接忽略 drop，避免并发上传造成状态错乱
      if (isInteractionLocked) return;
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [isInteractionLocked, processFile]
  );

  const handleConfirm = useCallback(() => {
    if (!selectedFile || !result) {
      setError("Please select and upload a file first");
      return;
    }
    if (isUploading) {
      setError("Uploading, please wait");

      return;
    }
    onConfirm(result.url, result.name);
    if (onUpload) {
      void Promise.resolve(
        onUpload({ file: selectedFile, url: result.url, name: result.name })
      );
    }
    resetStates();
  }, [selectedFile, result, isUploading, onConfirm, onUpload, resetStates]);

  const handleCancel = useCallback(() => {
    onCancel();
    resetStates();
  }, [onCancel, resetStates]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleConfirm, handleCancel]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent
        className="file-upload-dialog-content max-w-lg overflow-hidden flex flex-col"
        showCloseButton={false}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>Upload Attachment</DialogTitle>
        </DialogHeader>

        <div className="file-upload-content">
          <div className="file-upload-file">
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="file-upload-input-hidden"
              id="fileUploadInput"
              disabled={isInteractionLocked}
            />
            <label
              htmlFor="fileUploadInput"
              className={`file-upload-file-label ${isDragOver ? "is-drag-over" : ""} ${result ? "has-result" : ""} ${isInteractionLocked ? "is-disabled" : ""}`}
              aria-disabled={isInteractionLocked}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <>
                  <div className="file-upload-file-icon">
                    <Loader2
                      size={40}
                      className="file-upload-file-icon-spin"
                    />
                  </div>
                  <div className="file-upload-file-text">Uploading…</div>
                </>
              ) : result ? (
                <>
                  <div className="file-upload-file-icon">
                    <FileUp size={40} />
                  </div>
                  <div className="file-upload-file-text">File selected</div>
                  <div className="file-upload-file-name">{result.name}</div>
                  <div className="file-upload-file-hint">
                    Click or drag to choose another file
                  </div>
                </>
              ) : (
                <>
                  <div className="file-upload-file-icon">
                    <FileUp size={40} />
                  </div>
                  <div className="file-upload-file-text">
                    Click to select or drag files here
                  </div>
                  <div className="file-upload-file-hint">
                    <span>Supports</span>
                    <span className="file-upload-file-types">
                      {acceptedTypeTags.map((tag) => (
                        <span key={tag} className="file-upload-file-type-tag">
                          .{tag}
                        </span>
                      ))}
                    </span>
                    <span>, max {formatFileSize(fileMaxSizeBytes)}</span>
                  </div>
                </>
              )}
            </label>
          </div>

          {error && (
            <div className="file-upload-error" role="alert" aria-live="polite">
              <AlertCircle size={16} className="file-upload-error-icon" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!result || !!error || isUploading}
          >
            {isUploading ? "Uploading…" : "Insert Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;
