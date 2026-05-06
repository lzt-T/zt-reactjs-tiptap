import enUS from "./en-US";
import zhCN from "./zh-CN";

// 编辑器语言。
export const EditorLanguage = {
  // 简体中文。
  ZhCN: "zh-CN",
  // 英文。
  EnUS: "en-US",
} as const;

export type EditorLanguage = (typeof EditorLanguage)[keyof typeof EditorLanguage];

export interface EditorLocale {
  placeholders: {
    notionLike: string;
    headless: string;
  };
  slashCommands: {
    heading1: { title: string; description: string };
    heading2: { title: string; description: string };
    heading3: { title: string; description: string };
    bulletList: { title: string; description: string };
    numberedList: { title: string; description: string };
    taskList: { title: string; description: string };
    blockquote: { title: string; description: string };
    inlineCode: { title: string; description: string };
    codeBlock: { title: string; description: string };
    table: { title: string; description: string };
    inlineMath: { title: string; description: string };
    blockMath: { title: string; description: string };
    image: { title: string; description: string };
    video: { title: string; description: string };
    uploadAttachment: { title: string; description: string };
  };
  slashCommandGroups: {
    heading: string;
    list: string;
    insert: string;
    math: string;
    media: string;
  };
  toolbar: {
    heading: string;
    bulletList: string;
    orderedList: string;
    taskList: string;
    blockquote: string;
    insertTable: string;
    codeBlock: string;
    inlineMath: string;
    blockMath: string;
    image: string;
    video: string;
    uploadAttachment: string;
    bold: string;
    italic: string;
    underline: string;
    strikethrough: string;
    inlineCode: string;
    link: string;
    editLink: string;
    updateLink: string;
    removeLink: string;
    linkPlaceholder: string;
    highlight: string;
    textColor: string;
    superscript: string;
    subscript: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    justify: string;
    decreaseIndent: string;
    increaseIndent: string;
    headingLevel: (level: 1 | 2 | 3) => string;
  };
  bubbleMenu: {
    bold: string;
    italic: string;
    underline: string;
    strikethrough: string;
    inlineCode: string;
    link: string;
    highlight: string;
    textColor: string;
    more: string;
    superscript: string;
    subscript: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    justify: string;
    decreaseIndent: string;
    increaseIndent: string;
  };
  colorPicker: {
    customColor: string;
    confirm: string;
  };
  codeBlock: {
    languageButton: string;
    plainText: string;
    searchPlaceholder: string;
    noMatch: string;
    copyCode: string;
    copiedCode: string;
    delete: string;
    formatCode: string;
  };
  mathDialog: {
    insertInlineMath: string;
    insertBlockMath: string;
    formulaLabel: string;
    previewLabel: string;
    previewPlaceholder: string;
    previewErrorPrefix: string;
    cancel: string;
    confirm: string;
  };
  imageDialog: {
    title: string;
    uploadFileTab: string;
    imageUrlTab: string;
    uploadingImage: string;
    imageLoadFailed: string;
    clickOrDrag: string;
    supportsAndMax: (maxSizeText: string) => string;
    reselectHint: string;
    imageUrlLabel: string;
    imageUrlPlaceholder: string;
    invalidImageFile: string;
    imageSizeExceeded: (maxSizeText: string) => string;
    uploadFailed: string;
    fileReadFailed: string;
    invalidImageUrl: string;
    selectOrEnterImage: string;
    uploadingWait: string;
    cancel: string;
    confirm: string;
    uploading: string;
  };
  videoDialog: {
    title: string;
    uploadFileTab: string;
    videoUrlTab: string;
    uploadingVideo: string;
    clickOrDrag: string;
    supportsAndMax: (maxSizeText: string) => string;
    videoUrlLabel: string;
    videoUrlPlaceholder: string;
    invalidVideoFile: string;
    videoSizeExceeded: (maxSizeText: string) => string;
    uploadFailed: string;
    fileReadFailed: string;
    invalidVideoUrl: string;
    selectOrEnterVideo: string;
    uploadingWait: string;
    cancel: string;
    confirm: string;
    uploading: string;
  };
  imageNode: {
    imageLoadFailed: string;
    resizeLeft: string;
    resizeRight: string;
    alignMenu: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    enableCaption: string;
    disableCaption: string;
    deleteImage: string;
    captionPlaceholder: string;
    captionAriaLabel: string;
  };
  videoNode: {
    resizeLeft: string;
    resizeRight: string;
    alignMenu: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    deleteVideo: string;
  };
  fileDialog: {
    title: string;
    uploading: string;
    fileSelected: string;
    chooseAnotherFile: string;
    clickOrDrag: string;
    supports: string;
    maxSize: (maxSizeText: string) => string;
    invalidFileType: (acceptedTypes: string) => string;
    fileSizeExceeded: (maxSizeText: string) => string;
    uploadFailed: string;
    selectAndUploadFirst: string;
    uploadingWait: string;
    cancel: string;
    insertLink: string;
  };
  table: {
    rowActionsAriaLabel: string;
    columnActionsAriaLabel: string;
    insertRowAbove: string;
    insertRowBelow: string;
    insertColumnLeft: string;
    insertColumnRight: string;
    deleteCurrentRow: string;
    deleteSelectedRows: (count: number) => string;
    deleteCurrentColumn: string;
    deleteSelectedColumns: (count: number) => string;
    deleteWholeTable: string;
    mergeCells: string;
    splitCell: string;
    toggleHeaderRow: string;
    alignment: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    alignTop: string;
    alignMiddle: string;
    alignBottom: string;
  };
  tableSizePicker: {
    dialogAriaLabel: string;
    cellAriaLabel: (row: number, col: number) => string;
  };
}

// 语言表。
const localeMap: Record<EditorLanguage, EditorLocale> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

/** 根据浏览器语言解析编辑器语言，中文系回落到 zh-CN，其余回落 en-US。 */
function resolveBrowserLanguage(): EditorLanguage {
  if (typeof navigator !== "undefined") {
    const lang = navigator.language?.toLowerCase() ?? "";

    console.log(lang);
    if (lang.startsWith("zh")) {
      return "zh-CN";
    }
  }
  return "en-US";
}

/** 解析最终文案：优先使用 props.language，否则跟随浏览器语言。 */
export function resolveEditorLocale(language?: EditorLanguage): EditorLocale {
  const resolvedLanguage = language ?? resolveBrowserLanguage();

  return localeMap[resolvedLanguage] ?? localeMap["en-US"];
}
