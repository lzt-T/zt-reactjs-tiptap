import { useMemo } from 'react'
import katex from 'katex'

export interface FormulaSnippetItem {
  id: string
  label: string
  latex: string
  previewLatex?: string
}

function renderSnippetPreview(latex: string): string {
  try {
    return katex.renderToString(latex, {
      displayMode: false,
      throwOnError: false,
      errorColor: '#dc2626',
    })
  } catch {
    return ''
  }
}

interface FormulaSnippetButtonProps {
  item: FormulaSnippetItem
  onInsert: (latex: string) => void
}

export function FormulaSnippetButton({ item, onInsert }: FormulaSnippetButtonProps) {
  const previewLatex = item.previewLatex ?? item.latex
  const previewHtml = useMemo(() => renderSnippetPreview(previewLatex), [previewLatex])

  return (
    <button
      type="button"
      className="math-dialog-snippet"
      title={item.latex}
      aria-label={item.label}
      onClick={() => onInsert(item.latex)}
    >
      {previewHtml ? (
        <span className="math-dialog-snippet-katex" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      ) : (
        item.label
      )}
    </button>
  )
}
