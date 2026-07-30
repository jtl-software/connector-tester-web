import { useState } from 'react'
import { CodeEditor } from '@jtl-software/platform-ui-react/components/code-editor'
import { Button } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { useTriggerAction } from '@/features/request/useTriggerAction'
import { useContainerHeight } from '@/hooks/useContainerHeight'
import { PaneHeader } from '@/components/PaneHeader'
import { NameDialog } from '@/components/NameDialog'
import { newId } from '@/lib/id'

export function PayloadPane() {
  const { payload, setPayload, connected, activeConnection } = useAppStore()
  const { trigger, busy } = useTriggerAction()
  const { ref: editorWrapRef, height: editorHeight } = useContainerHeight<HTMLDivElement>()
  const [saveOpen, setSaveOpen] = useState(false)

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
    <section
      style={{
        display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1,
        borderLeft: '1px solid rgba(128,128,128,.3)'
      }}
    >
      <PaneHeader>
        <span style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.65 }}>
          Payload
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Button label="Skeleton" size="sm" variant="ghost" disabled={!connected || busy} onClick={() => void loadSkeleton()} />
          <Button
            label="Save"
            size="sm"
            variant="ghost"
            disabled={!payload.trim() || !activeConnection}
            onClick={() => setSaveOpen(true)}
          />
        </div>
      </PaneHeader>

      <NameDialog
        open={saveOpen}
        title="Name this payload"
        label="Payload name"
        onConfirm={(name) => {
          const s = useAppStore.getState()
          const connectionName = s.activeConnection
          if (!connectionName) { setSaveOpen(false); return }
          s.setPayloads([
            ...s.payloads.filter((p) => !(p.name === name && p.connectionName === connectionName)),
            {
              id: newId(),
              name,
              controller: s.controller,
              body: s.payload,
              connectionName,
              updatedAt: Date.now()
            }
          ])
          setSaveOpen(false)
        }}
        onCancel={() => setSaveOpen(false)}
      />

      <div ref={editorWrapRef} style={{ flex: 1, minHeight: 0 }}>
        <CodeEditor value={payload} onChange={setPayload} defaultLanguage="json" height={editorHeight} />
      </div>

      <footer style={{ padding: '4px 10px', fontSize: 10, opacity: 0.6, borderTop: '1px solid rgba(128,128,128,.22)' }}>
        {payload.trim()
          ? valid
            ? `Payload: valid JSON · ${payload.split('\n').length} lines`
            : 'Payload: invalid JSON'
          : 'Payload: empty'}
      </footer>
    </section>
  )
}
