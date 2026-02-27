import { useState, useCallback, useRef, useEffect } from "react";
import type { Node } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";

interface UseMathDialogOptions {
  editorRef: React.RefObject<Editor | null>;
  disabledRef: React.MutableRefObject<boolean>;
}

export function useMathDialog({
  editorRef,
  disabledRef,
}: UseMathDialogOptions) {
  const [showMathDialog, setShowMathDialog] = useState(false);
  const [mathDialogType, setMathDialogType] = useState<"inline" | "block">(
    "inline"
  );
  const [mathDialogInitialValue, setMathDialogInitialValue] = useState("");
  const [mathDialogCallback, setMathDialogCallback] = useState<
    ((latex: string) => void) | null
  >(null);

  const openMathDialog = useCallback(
    (
      type: "inline" | "block",
      initialValue: string,
      callback: (latex: string) => void
    ) => {
      setMathDialogType(type);
      setMathDialogInitialValue(initialValue);
      setMathDialogCallback(() => callback);
      setShowMathDialog(true);
    },
    []
  );

  const openMathDialogCallbackRef = useRef(openMathDialog);
  useEffect(() => {
    openMathDialogCallbackRef.current = openMathDialog;
  }, [openMathDialog]);

  const handleInlineMathClick = useCallback((node: Node, pos: number) => {
    if (disabledRef.current || !editorRef.current) return;
    const latex = (node.attrs.latex as string) || "";
    openMathDialogCallbackRef.current("inline", latex, (newLatex) => {
      editorRef.current
        ?.chain()
        .setNodeSelection(pos)
        .updateInlineMath({ latex: newLatex })
        .focus()
        .run();
    });
  }, [disabledRef, editorRef]);

  const handleBlockMathClick = useCallback((node: Node, pos: number) => {
    if (disabledRef.current || !editorRef.current) return;
    const latex = (node.attrs.latex as string) || "";
    openMathDialogCallbackRef.current("block", latex, (newLatex) => {
      editorRef.current
        ?.chain()
        .setNodeSelection(pos)
        .updateBlockMath({ latex: newLatex })
        .focus()
        .run();
    });
  }, [disabledRef, editorRef]);

  const handleMathDialogFromSlash = useCallback(
    (
      type: "inline" | "block",
      initialValue: string,
      callback: (latex: string) => void
    ) => {
      openMathDialogCallbackRef.current(type, initialValue, callback);
    },
    []
  );

  const handleMathConfirm = useCallback(
    (latex: string) => {
      if (mathDialogCallback) {
        mathDialogCallback(latex);
      }
      setShowMathDialog(false);
      setMathDialogCallback(null);
    },
    [mathDialogCallback]
  );

  const handleMathCancel = useCallback(() => {
    setShowMathDialog(false);
    setMathDialogCallback(null);
  }, []);

  return {
    showMathDialog,
    mathDialogType,
    mathDialogInitialValue,
    handleMathConfirm,
    handleMathCancel,
    openMathDialog,
    handleInlineMathClick,
    handleBlockMathClick,
    handleMathDialogFromSlash,
  };
}
