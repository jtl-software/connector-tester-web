import type { CSSProperties } from 'react'
import type { FilterResult } from '@/lib/responseFilter'

/**
 * Matches the Monaco defaults the library's <CodeEditor> hard-codes
 * (fontSize: 14, fontFamily: 'monospace' — see CodeEditor.js in
 * @jtl-software/platform-ui-react) so swapping between the two views doesn't
 * visibly jump.
 */
const monoStyle: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 14,
  lineHeight: '20px',
  margin: 0,
  whiteSpace: 'pre'
}

interface FilteredResponseViewProps {
  result: FilterResult
  height: number
}

/**
 * Renders whatever `filterResponse` (src/lib/responseFilter.ts) decided —
 * this component does no filtering/matching itself, it just lays the result
 * out.
 *
 * Why not Monaco: line highlighting needs decorations applied via the editor
 * instance, and the library's ICodeEditorProps exposes no way to reach it (no
 * onMount/onEditorDidMount — verified in
 * node_modules/@jtl-software/platform-ui-react/dist/components/code-editor/ICodeEditorProps.d.ts).
 * So ResponsePane renders this plain, theme-aware <pre>-based view instead of
 * <CodeEditor> whenever a filter is active, and switches back to <CodeEditor>
 * when it isn't.
 *
 * Colors come from the library's own theme-aware custom properties
 * (--base-*, defined in @jtl-software/platform-ui-react/index.css with both a
 * `:root` (light) and `[data-color-scheme=dark]` variant) rather than
 * hardcoded hex values, so the highlight stays legible in both themes
 * automatically as the app's ThemeProvider flips data-color-scheme.
 */
export function FilteredResponseView({ result, height }: FilteredResponseViewProps) {
  const containerStyle: CSSProperties = {
    height,
    overflow: 'auto',
    background: 'var(--base-background)',
    color: 'var(--base-foreground)',
    border: '1px solid var(--base-input)',
    borderRadius: 6,
    boxSizing: 'border-box'
  }

  if (result.kind === 'lines') {
    return (
      <div style={containerStyle}>
        <pre style={{ ...monoStyle, padding: '8px 12px' }}>{result.text}</pre>
      </div>
    )
  }

  if (result.matches.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ ...monoStyle, padding: '16px 12px', opacity: 0.6 }}>No entities matched.</div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {result.matches.map((match, entityIndex) => {
        const matchedSet = new Set(match.matchedLines)
        return (
          <pre
            key={entityIndex}
            style={{
              ...monoStyle,
              padding: '8px 12px',
              borderBottom:
                entityIndex < result.matches.length - 1 ? '1px solid var(--base-border)' : undefined
            }}
          >
            {match.text.split('\n').map((line, lineIndex) => (
              <div
                key={lineIndex}
                style={
                  matchedSet.has(lineIndex)
                    ? {
                        background: 'var(--base-warning-background)',
                        color: 'var(--base-warning-text)',
                        borderRadius: 3
                      }
                    : undefined
                }
              >
                {line || ' '}
              </div>
            ))}
          </pre>
        )
      })}
    </div>
  )
}
