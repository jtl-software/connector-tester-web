import { Button } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { clearHistory, type HistoryEntry } from '@/storage/history'
import { ACTIONS, type Action, type ControllerName } from '@/types/domain'

export function HistoryList() {
  const { history, historyError, setController, setAction, setLimit, setPayload, setResult, refreshHistory } =
    useAppStore()

  function restore(e: HistoryEntry) {
    const controller = e.controller as ControllerName
    if (ACTIONS[controller]) {
      setController(controller)
      if (ACTIONS[controller].includes(e.action as Action)) setAction(e.action as Action)
    }
    setLimit(e.limit)
    setPayload(e.payload)
    setResult({
      ok: e.status === 'ok',
      httpStatus: e.httpStatus,
      durationMs: e.durationMs,
      data: e.response
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', padding: '5px 10px',
          fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.65,
          borderBottom: '1px solid rgba(128,128,128,.22)'
        }}
      >
        History
        <div style={{ marginLeft: 'auto' }}>
          <Button
            label="Clear"
            size="sm"
            variant="ghost"
            onClick={async () => { await clearHistory(); await refreshHistory() }}
          />
        </div>
      </header>

      {historyError && (
        <div
          role="alert"
          title={historyError}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
            fontSize: 10, background: 'rgba(220,38,38,.12)', color: '#dc2626',
            borderBottom: '1px solid rgba(220,38,38,.3)'
          }}
        >
          <span aria-hidden="true">⚠</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Last request could not be saved to history
          </span>
        </div>
      )}

      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        {history.length === 0 && (
          <p style={{ padding: '8px 10px', fontSize: 11, opacity: 0.6 }}>No requests yet.</p>
        )}

        {history.map((e) => (
          <button
            key={e.id}
            onClick={() => restore(e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              padding: '5px 10px', background: 'none', border: 0,
              borderBottom: '1px solid rgba(128,128,128,.16)',
              cursor: 'pointer', textAlign: 'left', fontSize: 11, color: 'inherit'
            }}
          >
            <span
              style={{
                background: e.status === 'ok' ? '#16a34a' : '#dc2626',
                color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 700
              }}
            >
              {e.httpStatus || 'ERR'}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.controller} · {e.action}
            </span>
            <span style={{ marginLeft: 'auto', opacity: 0.55, fontSize: 9 }}>
              {e.durationMs >= 1000 ? `${(e.durationMs / 1000).toFixed(1)}s` : `${e.durationMs.toFixed(0)}ms`}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
