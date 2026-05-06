import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/react/components/ui/dialog";
import { Button } from "@/react/components/ui/button";
import { Label } from "@/react/components/ui/label";
import { SegmentedSwitch } from "@/react/components/SegmentedSwitch";
import { Loader2, Video, AlertCircle } from "lucide-react";
import { config } from "@/shared/config";
import { formatFileSize } from "@/shared/utils/utils";
import type { EditorLocale } from "@/shared/locales";
import type { EditorErrorEvent } from "@/react/editor/types";
import "./VideoUploadDialog.css";

interface VideoUploadDialogProps {
  isOpen: boolean;
  onConfirm: (src: string, title?: string) => void;
  onCancel: () => void;
  onPreUpload?: (file: File) => Promise<string>;
  onUpload?: (payload: { file: File; url: string; title?: string }) => void | Promise<void>;
  onError?: (event: EditorErrorEvent) => void;
  /** 视频最大体积（字节），超过则拒绝。 */
  videoMaxSizeBytes?: number;
  locale: EditorLocale;
  /** 为 true 时标记为编辑器焦点保活区域，避免 NotionLike 下误触发 blur 收口。 */
  preserveEditorFocus?: boolean;
  /** 弹窗挂载容器，用于继承编辑器作用域主题变量。 */
  portalContainer?: HTMLElement | null;
}

const VideoUploadDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  onPreUpload,
  onUpload,
  onError,
  videoMaxSizeBytes = config.VIDEO_MAX_SIZE_BYTES,
  locale,
  preserveEditorFocus = false,
  portalContainer,
}: VideoUploadDialogProps) => {
  // 当前上传方式：文件上传或 URL 输入。
  const [uploadType, setUploadType] = useState<"file" | "url">("file");
  // 当前选择的视频文件。
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // 上传/输入后的视频地址。
  const [videoUrl, setVideoUrl] = useState("");
  // 校验/上传错误提示。
  const [error, setError] = useState("");
  // 文件上传中状态。
  const [isUploading, setIsUploading] = useState(false);
  // 拖拽高亮状态。
  const [isDragOver, setIsDragOver] = useState(false);
  // 文件输入引用。
  const fileInputRef = useRef<HTMLInputElement>(null);
  // URL 输入引用。
  const urlInputRef = useRef<HTMLInputElement>(null);
  // 上传期间锁定可能触发重复上传的交互。
  const isInteractionLocked = isUploading;
  // 上传类型切换选项。
  const uploadTypeOptions = [
    { label: locale.videoDialog.uploadFileTab, value: "file" },
    { label: locale.videoDialog.videoUrlTab, value: "url" },
  ];

  const resetStates = useCallback(() => {
    setUploadType("file");
    setSelectedFile(null);
    setVideoUrl("");
    setError("");
    setIsUploading(false);
    setIsDragOver(false);
  }, []);

  /** 校验并处理视频文件，生成可插入地址或上报上传错误。 */
  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        setSelectedFile(null);
        setVideoUrl("");
        setError(locale.videoDialog.invalidVideoFile);
        return;
      }

      if (file.size > videoMaxSizeBytes) {
        setSelectedFile(null);
        setVideoUrl("");
        setError(
          locale.videoDialog.videoSizeExceeded(formatFileSize(videoMaxSizeBytes))
        );
        return;
      }

      setError("");
      setSelectedFile(file);

      if (onPreUpload) {
        try {
          setIsUploading(true);
          const url = await onPreUpload(file);
          setVideoUrl(url);
        } catch (err) {
          setVideoUrl("");
          onError?.({
            source: "video-upload",
            stage: "pre-upload",
            message: err instanceof Error ? err.message : locale.videoDialog.uploadFailed,
            error: err,
          });
          setError(
            err instanceof Error ? err.message : locale.videoDialog.uploadFailed
          );
        } finally {
          setIsUploading(false);
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setVideoUrl(base64);
      };
      reader.onerror = () => {
        setError(locale.videoDialog.fileReadFailed);
      };
      reader.readAsDataURL(file);
    },
    [locale, onError, onPreUpload, videoMaxSizeBytes]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isInteractionLocked) return;
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    },
    [isInteractionLocked]
  );

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
      if (isInteractionLocked) return;
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [isInteractionLocked, processFile]
  );

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setSelectedFile(null);
      setVideoUrl(url);
      if (!url) {
        setError("");
        return;
      }
      try {
        new URL(url);
        setError("");
      } catch {
        setError(locale.videoDialog.invalidVideoUrl);
      }
    },
    [locale]
  );

  const handleConfirm = useCallback(() => {
    if (!videoUrl) {
      setError(locale.videoDialog.selectOrEnterVideo);
      return;
    }
    if (isUploading) {
      setError(locale.videoDialog.uploadingWait);
      return;
    }

    const title = selectedFile?.name;
    onConfirm(videoUrl, title);
    if (uploadType === "file" && selectedFile && onUpload) {
      void Promise.resolve(
        onUpload({ file: selectedFile, url: videoUrl, title })
      ).catch((err: unknown) => {
        onError?.({
          source: "video-upload",
          stage: "confirm",
          message: err instanceof Error ? err.message : locale.videoDialog.uploadFailed,
          error: err,
        });
      });
    }
    resetStates();
  }, [
    isUploading,
    locale,
    onConfirm,
    onError,
    onUpload,
    resetStates,
    selectedFile,
    uploadType,
    videoUrl,
  ]);

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
    [handleCancel, handleConfirm]
  );

  useEffect(() => {
    if (isOpen && uploadType === "url") {
      urlInputRef.current?.focus();
    }
  }, [isOpen, uploadType]);

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleCancel()}>
      <DialogContent
        className="video-upload-dialog-content max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        showCloseButton={false}
        onKeyDown={handleKeyDown}
        data-editor-focus-retained={preserveEditorFocus ? "true" : undefined}
        portalContainer={portalContainer}
      >
        <DialogHeader>
          <DialogTitle>{locale.videoDialog.title}</DialogTitle>
        </DialogHeader>

        <SegmentedSwitch
          className="video-upload-segmented-switch"
          value={uploadType}
          options={uploadTypeOptions}
          disabled={isInteractionLocked}
          onChange={(next) => setUploadType(next as "file" | "url")}
        />

        <div className="video-upload-content">
          {uploadType === "file" ? (
            <div className="video-upload-file">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="video-upload-input-hidden"
                id="videoFileInput"
                disabled={isInteractionLocked}
              />
              <label
                htmlFor="videoFileInput"
                className={`video-upload-file-label ${isDragOver ? "is-drag-over" : ""} ${videoUrl ? "has-preview" : ""} ${isInteractionLocked ? "is-disabled" : ""}`}
                aria-disabled={isInteractionLocked}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isUploading ? (
                  <>
                    <div className="video-upload-file-icon">
                      <Loader2 size={40} className="video-upload-file-icon-spin" />
                    </div>
                    <div className="video-upload-file-text">
                      {locale.videoDialog.uploadingVideo}
                    </div>
                  </>
                ) : videoUrl ? (
                  <video className="video-upload-file-preview" src={videoUrl} controls />
                ) : (
                  <>
                    <div className="video-upload-file-icon">
                      <Video size={40} />
                    </div>
                    <div className="video-upload-file-text">
                      {locale.videoDialog.clickOrDrag}
                    </div>
                    <div className="video-upload-file-hint">
                      {locale.videoDialog.supportsAndMax(
                        formatFileSize(videoMaxSizeBytes)
                      )}
                    </div>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div className="video-upload-url space-y-2">
              <Label htmlFor="videoUrlInput">{locale.videoDialog.videoUrlLabel}</Label>
              <input
                ref={urlInputRef}
                id="videoUrlInput"
                type="url"
                placeholder={locale.videoDialog.videoUrlPlaceholder}
                value={videoUrl}
                onChange={handleUrlChange}
                className="video-upload-input"
                disabled={isInteractionLocked}
              />
            </div>
          )}

          {error && (
            <div className="video-upload-error" role="alert" aria-live="polite">
              <AlertCircle size={16} className="video-upload-error-icon" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {locale.videoDialog.cancel}
          </Button>
          <Button onClick={handleConfirm} disabled={!videoUrl || !!error || isUploading}>
            {isUploading ? locale.videoDialog.uploading : locale.videoDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VideoUploadDialog;
