import { CodeEditor } from '@jtl-software/platform-ui-react/components/code-editor'
import { Button } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { useTriggerAction } from '@/features/request/useTriggerAction'

export function PayloadPane() {
  const { payload, setPayload, connected, result } = useAppStore()
  const { trigger, busy } = useTriggerAction()

  async function loadSkeleton() {
    await trigger('getSkeleton')
    const data = useAppStore.getState().result?.data
    if (data != null) setPayload(JSON.stringify(data, null, 2))
  }

  let valid = true
  if (payload.trim()) {
    try { JSON.parse(payload) } catch { valid = false }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderBottom: '1px solid rgba(128,128,128,.22)'
        }}
      >
        <span style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.65 }}>
          Payload
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Button label="Skeleton" size="sm" variant="ghost" disabled={!connected || busy} onClick={() => void loadSkeleton()} />
          <Button
            label="Save"
            size="sm"
            variant="ghost"
            disabled={!payload.trim()}
            onClick={() => {
              const name = window.prompt('Name this payload')
              if (!name?.trim()) return
              const s = useAppStore.getState()
              s.setPayloads([
                ...s.payloads.filter((p) => p.name !== name.trim()),
                {
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  controller: s.controller,
                  body: s.payload,
                  updatedAt: Date.now()
                }
              ])
            }}
          />
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0 }}>
        <CodeEditor value={payload} onChange={setPayload} defaultLanguage="json" height="100%" />
      </div>

      <footer style={{ padding: '4px 10px', fontSize: 10, opacity: 0.6, borderTop: '1px solid rgba(128,128,128,.22)' }}>
        {payload.trim() ? (valid ? 'JSON valid' : 'Invalid JSON') : 'Empty'}
        {result ? '' : ''}
      </footer>
    </section>
  )
}
