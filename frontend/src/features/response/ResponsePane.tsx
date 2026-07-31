import { useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useContainerHeight } from '@/hooks/useContainerHeight'
import { PaneHeader } from '@/components/PaneHeader'
import { MAX_RESPONSE_BYTES } from '@/storage/history'
import { filterResponse, type EntityMatch, type FilterResult } from '@/lib/responseFilter'
import { ResponseEditor } from './ResponseEditor'

function countItems(data: unknown): string {
  if (Array.isArray(data)) return `${data.length} items`
  if (data && typeof data === 'object') {
    const r = (data as Record<string, unknown>).result
    if (Array.isArray(r)) return `${r.length} items`
  }
  return ''
}

interface EditorView {
  value: string
  language: string
  highlightLines: number[]
}

/**
 * Renders matched entities as a single, syntax-highlightable JSON array
 * (`[ entity, entity, ... ]`) instead of the disconnected fragments a naive
 * "matching lines only" filter would show — this is what gives "the WHOLE
 * matching entity" per the entity-list contract in responseFilter.ts, while
 * still being one valid JSON document Monaco can colourise normally.
 *
 * Each entity's own `JSON.stringify(entity, null, 2)` text is re-indented by
 * two spaces to nest visually under the wrapping array; matchedLines
 * (0-based, local to that entity's text) are converted to absolute 1-based
 * Monaco line numbers for the returned `highlightLines`.
 */
function buildEntitiesView(matches: EntityMatch[]): EditorView {
  if (matches.length === 0) {
    return { value: 'No entities matched.', language: 'plaintext', highlightLines: [] }
  }

  const bodyLines: string[] = ['[']
  const highlightLines: number[] = []
  let offset = 1 // 0-based line index (within bodyLines) where the current entity's text starts

  matches.forEach((match, entityIndex) => {
    const lines = match.text.split('\n').map((line) => `  ${line}`)
    if (entityIndex < matches.length - 1) lines[lines.length - 1] += ','

    for (const localLine of match.matchedLines) {
      highlightLines.push(offset + localLine + 1) // +1: 0-based -> Monaco's 1-based line numbers
    }

    bodyLines.push(...lines)
    offset += lines.length
  })

  bodyLines.push(']')
  return { value: bodyLines.join('\n'), language: 'json', highlightLines }
}

export function ResponsePane() {
  const result = useAppStore((s) => s.result)
  const [filter, setFilter] = useState('')
  const { ref: editorWrapRef, height: editorHeight } = useContainerHeight<HTMLDivElement>()

  const text = result ? JSON.stringify(result.data, null, 2) : ''

  // Only computed while a filter is active — with no filter the pane behaves
  // exactly as before (full response, no highlights).
  const filterResult: FilterResult | null = useMemo(() => {
    if (!result || !filter) return null
    return filterResponse(result.data, filter)
  }, [result, filter])

  // Single source of truth for what the (single, shared) editor instance
  // renders, whether or not a filter is active — see ResponseEditor.tsx for
  // why this replaced the old CodeEditor/FilteredResponseView split.
  const view: EditorView = useMemo(() => {
    if (!filterResult) return { value: text, language: 'json', highlightLines: [] }

    if (filterResult.kind === 'lines') {
      return { value: filterResult.text, language: 'plaintext', highlightLines: [] }
    }

    return buildEntitiesView(filterResult.matches)
  }, [filterResult, text])

  return (
    <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
      <PaneHeader style={{ gap: 10, fontSize: 11 }}>
        {result ? (
          <>
            <span
              style={{
                background: result.ok ? '#16a34a' : '#dc2626',
                color: '#fff', padding: '1px 6px', borderRadius: 3,
                fontWeight: 700, fontSize: 9
              }}
            >
              {result.httpStatus || 'ERR'}
            </span>
            <span>{result.durationMs.toFixed(0)} ms</span>
            <span>
              {filterResult?.kind === 'entities'
                ? `${filterResult.matches.length} of ${filterResult.totalCount} entities`
                : countItems(result.data)}
            </span>
            {result.errorMessage && <span style={{ color: '#dc2626' }}>{result.errorMessage}</span>}
          </>
        ) : (
          <span style={{ opacity: 0.6 }}>No response yet</span>
        )}

        <input
          aria-label="Filter response"
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ marginLeft: 'auto', width: 140 }}
        />
      </PaneHeader>

      <div ref={editorWrapRef} style={{ flex: 1, minHeight: 0 }}>
        <ResponseEditor
          value={view.value}
          language={view.language}
          height={editorHeight}
          highlightLines={view.highlightLines}
        />
      </div>

      <footer style={{ padding: '4px 10px', fontSize: 10, opacity: 0.6, borderTop: '1px solid rgba(128,128,128,.22)' }}>
        {result
          ? `Response: ${(text.length / 1024).toFixed(1)} KB${
              text.length > MAX_RESPONSE_BYTES ? ' · would be truncated in history' : ''
            }`
          : 'Response: empty'}
      </footer>
    </section>
  )
}
