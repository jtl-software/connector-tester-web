import { useCallback, useEffect, useRef } from 'react'
import { Editor, type OnMount } from '@monaco-editor/react'
import type { editor as MonacoEditorNS } from 'monaco-editor'
import { useMonacoTheme } from '@/hooks/useMonacoTheme'
import './response-editor.css'

interface ResponseEditorProps {
  value: string
  language: string
  height: number
  /** 1-based Monaco line numbers to give a match-highlight background. */
  highlightLines?: number[]
}

/**
 * Renders the Response pane's content — used for BOTH the unfiltered and
 * filtered states so there is exactly one renderer and switching a filter on
 * or off never changes font, size, padding or colour.
 *
 * Why not @jtl-software/platform-ui-react's <CodeEditor>: it wraps
 * @monaco-editor/react's <Editor> but exposes no onMount (see
 * ICodeEditorProps.d.ts), so the underlying editor instance — and therefore
 * `createDecorationsCollection`, needed for per-line match highlighting — is
 * unreachable. @monaco-editor/react and monaco-editor are both already
 * declared direct dependencies (frontend/package.json) specifically so
 * consumers can drop to the raw Editor when the wrapper's surface is too
 * narrow, and main.tsx already configures the loader/workers for it.
 *
 * The options/className below intentionally mirror CodeEditor.js
 * (node_modules/@jtl-software/platform-ui-react/dist/components/code-editor/CodeEditor.js)
 * exactly, so this looks pixel-identical to the library's editor used by the
 * Payload pane.
 */
export function ResponseEditor({ value, language, height, highlightLines }: ResponseEditorProps) {
  const theme = useMonacoTheme()
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<MonacoEditorNS.IEditorDecorationsCollection | null>(null)

  const applyDecorations = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    const model = ed.getModel()
    const lineCount = model ? model.getLineCount() : 0
    const decorations = (highlightLines ?? [])
      .filter((line) => line >= 1 && line <= lineCount)
      .map((line) => ({
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
        options: { isWholeLine: true, className: 'response-match-highlight' }
      }))

    if (decorationsRef.current) decorationsRef.current.set(decorations)
    else decorationsRef.current = ed.createDecorationsCollection(decorations)
  }, [highlightLines])

  const handleMount: OnMount = useCallback(
    (ed) => {
      editorRef.current = ed
      applyDecorations()
    },
    [applyDecorations]
  )

  // Re-applies whenever the highlighted lines change AND whenever the value
  // changes — the latter matters because @monaco-editor/react updates the
  // model in its own effect (which, as a child component, commits before this
  // one), so decorations computed against a *previous* value would otherwise
  // survive one render on stale line numbers.
  useEffect(() => {
    applyDecorations()
  }, [applyDecorations, value])

  useEffect(
    () => () => {
      editorRef.current = null
      decorationsRef.current = null
    },
    []
  )

  return (
    <Editor
      height={height}
      value={value}
      language={language}
      theme={theme}
      onMount={handleMount}
      className="rounded-[var(--border-radius-md)] py-[var(--spacing-2)] border border-[var(--base-input)]"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'monospace',
        lineNumbers: 'on',
        scrollbar: { vertical: 'auto', horizontal: 'auto' },
        automaticLayout: true,
        lineNumbersMinChars: 3,
        lineDecorationsWidth: 0
      }}
    />
  )
}
