import type { RawCommands } from "@tiptap/core";
import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { FileText, ExternalLink, Trash2 } from "lucide-react";
import { getEditorCallbacks } from "./editorCallbackRegistry";

export interface FileAttachmentAttributes {
  url: string;
  name: string;
  fileType?: string | null;
}

interface FileAttachmentViewProps extends NodeViewProps {
  onClick?: (params: { url: string; name: string }) => void;
}

function FileAttachmentView({
  node,
  deleteNode,
  editor,
  selected,
}: FileAttachmentViewProps) {
  const { url, name } = node.attrs as FileAttachmentAttributes;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const onFileClick = getEditorCallbacks(editor).onFileAttachmentClick;
    if (onFileClick) {
      onFileClick({ url: url ?? "", name: name || "Untitled" });
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const linkContent = (
    <>
      <FileText size={18} className="file-attachment-icon" />
      <span className="file-attachment-name">{name || "Untitled"}</span>
      <ExternalLink size={14} className="file-attachment-external" />
    </>
  );

  return (
    <NodeViewWrapper
      className={
        selected
          ? "file-attachment-wrapper file-attachment-selected"
          : "file-attachment-wrapper"
      }
      contentEditable={false}
    >
      {getEditorCallbacks(editor).onFileAttachmentClick ? (
        <span
          role="button"
          tabIndex={0}
          className="file-attachment-link cursor-pointer"
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick(e as unknown as React.MouseEvent);
            }
          }}
        >
          {linkContent}
        </span>
      ) : (
        <a
          href={url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="file-attachment-link"
          onClick={handleClick}
        >
          {linkContent}
        </a>
      )}
      {editor.isEditable && (
        <button
          type="button"
          className="file-attachment-delete"
          aria-label="Delete attachment"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteNode();
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </NodeViewWrapper>
  );
}

export const FileAttachment = Node.create({
  name: "fileAttachment",

  group: "block",
  atom: true,

  addOptions() {
    return {};
  },

  addAttributes() {
    return {
      url: { default: null },
      name: { default: "" },
      fileType: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-node-type="fileAttachment"]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            url: el.getAttribute("data-url") || null,
            name: el.getAttribute("data-name") || "",
            fileType: el.getAttribute("data-file-type") || null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      {
        "data-node-type": "fileAttachment",
        "data-url": node.attrs.url,
        "data-name": node.attrs.name,
        "data-file-type": node.attrs.fileType ?? undefined,
      },
      node.attrs.name || "Untitled",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => <FileAttachmentView {...props} />);
  },

  addCommands(): Partial<RawCommands> {
    return {
      insertFileAttachment:
        (attrs: FileAttachmentAttributes) =>
        ({
          chain,
        }: {
          chain: () => { insertContent: (content: unknown) => unknown };
        }) =>
          chain().insertContent({
            type: this.name,
            attrs: {
              url: attrs.url ?? null,
              name: attrs.name ?? "",
              fileType: attrs.fileType ?? null,
            },
          }),
    } as Partial<RawCommands>;
  },
});
