import type { Editor } from "@tiptap/core";

export type ImageDeleteParams = { src: string; alt?: string; title?: string };
export type FileDeleteParams = { url: string; name: string };
export type FileAttachmentClickParams = { url: string; name: string };

export type EditorCallbacks = {
  onImageDelete?: (params: ImageDeleteParams) => void;
  onFileDelete?: (params: FileDeleteParams) => void;
  onFileAttachmentClick?: (params: FileAttachmentClickParams) => void;
};

const editorCallbacks = new WeakMap<Editor, EditorCallbacks>();

export function setEditorCallbacks(editor: Editor, partialCallbacks: Partial<EditorCallbacks>) {
  const current = editorCallbacks.get(editor) ?? {};
  editorCallbacks.set(editor, { ...current, ...partialCallbacks });
}

export function getEditorCallbacks(editor: Editor): EditorCallbacks {
  return editorCallbacks.get(editor) ?? {};
}

export function clearEditorCallbacks(editor: Editor) {
  editorCallbacks.delete(editor);
}

