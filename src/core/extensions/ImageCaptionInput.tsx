import { useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";
import { useScopedActiveDispatcher } from "@/react/hooks";

// 描述输入框离开编辑器容器时通知外层聚焦控制器。
const FOCUS_RETAINED_EXIT_OUTSIDE_EVENT = "zt-editor-focus-retained-exit-outside";

// 描述输入框进入焦点时通知外层聚焦控制器。
const FOCUS_RETAINED_ENTER_INSIDE_EVENT = "zt-editor-focus-retained-enter-inside";

interface ImageCaptionInputProps {
  /** 图片描述输入框的无内容提示。 */
  placeholder: string;
  /** 图片描述输入框的无障碍标签。 */
  ariaLabel: string;
  /** 是否在输入框挂载后自动聚焦一次。 */
  autoFocus?: boolean;
  /** 当前图片描述文本。 */
  caption?: string;
  /** 当前图片描述是否允许编辑。 */
  editable: boolean;
  /** 自动聚焦完成后的回调，用于清除外层一次性状态。 */
  onAutoFocusComplete?: () => void;
  /** 图片描述变更回调。 */
  onCaptionChange: (caption: string) => void;
  /** 回车确认描述时的回调。 */
  onEnter?: () => void;
}

/** 渲染图片描述输入框，并隔离输入事件避免影响编辑器选择。 */
export function ImageCaptionInput({
  placeholder,
  ariaLabel,
  autoFocus = false,
  caption = "",
  editable,
  onAutoFocusComplete,
  onCaptionChange,
  onEnter,
}: ImageCaptionInputProps) {
  // 当前是否有可展示的描述文本。
  const hasCaption = caption?.trim().length > 0;
  // 描述输入框节点，用于按内容自动撑高。
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // 描述输入框是否处于激活态。
  const [isCaptionActive, setIsCaptionActive] = useState(false);

  /** 判定当前焦点是否仍在编辑器容器内部。 */
  const isInsideEditorContainer = (target: EventTarget | null) => {
    if (!(target instanceof Node)) return false;

    // 描述输入框所在的编辑器根容器。
    const editorContainer = textareaRef.current?.closest(".editor-container");
    return Boolean(editorContainer?.contains(target));
  };

  /** 通知编辑器容器执行统一 blur 收口。 */
  const dispatchFocusRetainedExitOutside = () => {
    // 描述输入框所在的编辑器根容器。
    const editorContainer = textareaRef.current?.closest(".editor-container");
    editorContainer?.dispatchEvent(new CustomEvent(FOCUS_RETAINED_EXIT_OUTSIDE_EVENT));
  };

  /** 通知编辑器容器恢复聚焦态。 */
  const dispatchFocusRetainedEnterInside = () => {
    // 描述输入框所在的编辑器根容器。
    const editorContainer = textareaRef.current?.closest(".editor-container");
    editorContainer?.dispatchEvent(new CustomEvent(FOCUS_RETAINED_ENTER_INSIDE_EVENT));
  };

  // 描述输入框激活态分发器。
  const { handleActiveChange } = useScopedActiveDispatcher({
    isActive: isCaptionActive,
    setActive: setIsCaptionActive,
    isInsideContainer: isInsideEditorContainer,
    onExitOutside: dispatchFocusRetainedExitOutside,
    exitDelay: "raf",
  });

  useLayoutEffect(() => {
    // 当前描述输入框节点。
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [caption]);

  useLayoutEffect(() => {
    // 当前描述输入框节点。
    const textarea = textareaRef.current;
    if (!autoFocus || !editable || !textarea) return;

    // 聚焦后把光标放在已有描述末尾。
    const cursorPosition = textarea.value.length;
    textarea.focus();
    textarea.setSelectionRange(cursorPosition, cursorPosition);
    onAutoFocusComplete?.();
  }, [autoFocus, editable, onAutoFocusComplete]);

  /** 阻止输入区域触发图片节点的选择、拖拽等外层交互。 */
  const stopEditorEvent = (event: MouseEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
  };

  /** 阻止输入时的按键继续冒泡到编辑器快捷键。 */
  const stopEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    event.preventDefault();
    onEnter?.();
  };

  /** 将图片描述写回当前图片节点属性。 */
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onCaptionChange(event.target.value);
  };

  /** 进入描述输入框激活态。 */
  const handleFocus = () => {
    handleActiveChange(true);
    dispatchFocusRetainedEnterInside();
  };

  /** 退出描述输入框激活态，并按焦点位置分流。 */
  const handleBlur = () => {
    handleActiveChange(false);
  };

  if (!editable && !hasCaption) return null;

  if (!editable) {
    return <div className="image-caption-text">{caption}</div>;
  }

  return (
    <textarea
      ref={textareaRef}
      className="image-caption-input"
      data-editor-focus-retained="true"
      value={caption}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={1}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseDown={stopEditorEvent}
      onClick={stopEditorEvent}
      onKeyDown={stopEditorKeyDown}
    />
  );
}
