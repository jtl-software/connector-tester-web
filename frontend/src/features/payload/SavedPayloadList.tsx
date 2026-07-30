import { Button } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'

export function SavedPayloadList() {
  const { payloads, setPayload, setController, setPayloads } = useAppStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <header
        style={{
          padding: '5px 10px', fontSize: 9, letterSpacing: '.1em',
          textTransform: 'uppercase', opacity: 0.65,
          borderTop: '1px solid rgba(128,128,128,.22)',
          borderBottom: '1px solid rgba(128,128,128,.22)'
        }}
      >
        Saved payloads
      </header>

      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        {payloads.length === 0 && (
          <p style={{ padding: '8px 10px', fontSize: 11, opacity: 0.6 }}>No saved payloads.</p>
        )}

        {payloads.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(128,128,128,.16)' }}>
            <button
              onClick={() => { setController(p.controller); setPayload(p.body) }}
              style={{
                flex: 1, textAlign: 'left', padding: '5px 10px', fontSize: 11,
                background: 'none', border: 0, cursor: 'pointer', color: 'inherit',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}
            >
              {p.name}
            </button>
            <Button
              label="✕"
              size="sm"
              variant="ghost"
              onClick={() => setPayloads(payloads.filter((x) => x.id !== p.id))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
