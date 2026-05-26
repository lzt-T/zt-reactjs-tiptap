import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { sanitizeEditorHtml } from "@/core/security/htmlSecurity";

type PasteErrorEvent = {
  source: "paste";
  stage: "transform";
  message: string;
  error?: unknown;
};

interface HtmlPasteSanitizerOptions {
  onError?: (event: PasteErrorEvent) => void;
}

// 仅拦截 HTML 粘贴并执行清洗，失败时回退到原生粘贴。
export const HtmlPasteSanitizer = Extension.create<HtmlPasteSanitizerOptions>({
  name: "htmlPasteSanitizer",

  addOptions() {
    return {
      onError: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;
            // 代码块内仅按纯文本粘贴，避免 HTML 结构插入失败导致粘贴被吞。
            if (this.editor.isActive("codeBlock")) {
              const text = clipboardData.getData("text/plain");
              if (!text) return false;
              return this.editor.commands.insertContent(text);
            }
            const html = clipboardData.getData("text/html");
            if (!html) return false;

            try {
              const sanitizedHtml = sanitizeEditorHtml(html);
              if (!sanitizedHtml) return false;
              return this.editor.commands.insertContent(sanitizedHtml);
            } catch (error) {
              this.options.onError?.({
                source: "paste",
                stage: "transform",
                message: "Failed to sanitize pasted HTML",
                error,
              });
              return false;
            }
          },
        },
      }),
    ];
  },
});
