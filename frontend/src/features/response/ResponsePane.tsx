import { useState } from 'react'
import { CodeEditor } from '@jtl-software/platform-ui-react/components/code-editor'
import { useAppStore } from '@/store/useAppStore'
import { useContainerHeight } from '@/hooks/useContainerHeight'
import { PaneHeader } from '@/components/PaneHeader'
import { MAX_RESPONSE_BYTES } from '@/storage/history'

function countItems(data: unknown): string {
  if (Array.isArray(data)) return `${data.length} items`
  if (data && typeof data === 'object') {
    const r = (data as Record<string, unknown>).result
    if (Array.isArray(r)) return `${r.length} items`
  }
  return ''
}

export function ResponsePane() {
  const result = useAppStore((s) => s.result)
  const [filter, setFilter] = useState('')
  const { ref: editorWrapRef, height: editorHeight } = useContainerHeight<HTMLDivElement>()

  const text = result ? JSON.stringify(result.data, null, 2) : ''
  const shown = filter
    ? text.split('\n').filter((l) => l.toLowerCase().includes(filter.toLowerCase())).join('\n')
    : text

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
            <span>{countItems(result.data)}</span>
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
        <CodeEditor value={shown} defaultLanguage="json" height={editorHeight} readOnly />
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
