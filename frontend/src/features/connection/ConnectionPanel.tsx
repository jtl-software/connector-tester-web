import { useState } from 'react'
import { Button, Select } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { callAction } from '@/api/client'
import { ManageConnectionsDialog } from './ManageConnectionsDialog'

export function ConnectionPanel() {
  const { connections, activeConnection, connected, setActiveConnection, setConnected } = useAppStore()
  const [manageOpen, setManageOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const active = connections.find((c) => c.name === activeConnection) ?? null

  async function toggleConnection() {
    if (!active) return
    setBusy(true)
    try {
      const endpoint = connected ? 'disconnect' : 'authenticate'
      const res = await callAction(endpoint, {
        connectorUrl: active.url,
        connectorToken: active.token,
        controller: '',
        action: '',
        payload: '',
        limit: 0
      })
      setConnected(connected ? false : res.ok)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 12, borderBottom: '1px solid rgba(128,128,128,.3)' }}>
      <Select
        options={connections.map((c) => ({ value: c.name, label: c.name }))}
        value={activeConnection ?? undefined}
        placeholder="Select a connection"
        size="sm"
        onChange={(v) => setActiveConnection(v)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <span
          aria-hidden
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#16a34a' : '#9ca3af'
          }}
        />
        <span style={{ fontSize: 12 }}>{connected ? 'Connected' : 'Not connected'}</span>
        <div style={{ marginLeft: 'auto' }}>
          <Button label="Manage" size="sm" variant="ghost" onClick={() => setManageOpen(true)} />
        </div>
      </div>

      {active && (
        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6, wordBreak: 'break-all' }}>
          {active.url}
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <Button
          label={connected ? 'Disconnect' : 'Authenticate'}
          variant={connected ? 'outline' : 'default'}
          size="sm"
          fullWidth
          disabled={!active || busy}
          isLoading={busy}
          onClick={() => void toggleConnection()}
        />
      </div>

      <ManageConnectionsDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  )
}
