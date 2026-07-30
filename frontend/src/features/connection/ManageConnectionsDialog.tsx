import { useState } from 'react'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import type { Connection } from '@/types/domain'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EMPTY: Connection = { name: '', url: '', token: '' }

export function ManageConnectionsDialog({ open, onOpenChange }: Props) {
  const { connections, setConnections } = useAppStore()
  const [draft, setDraft] = useState<Connection>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)

  function save() {
    if (!draft.name.trim()) return
    const next = connections.filter((c) => c.name !== editing && c.name !== draft.name.trim())
    next.push({ ...draft, name: draft.name.trim() })
    setConnections(next)
    setDraft(EMPTY)
    setEditing(null)
  }

  function remove(name: string) {
    setConnections(connections.filter((c) => c.name !== name))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connections</DialogTitle>
        </DialogHeader>

        <ul role="list" style={{ marginBottom: 16 }}>
          {connections.map((c) => (
            <li key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <span style={{ flex: 1 }}>{c.name}</span>
              <Button label="Edit" size="sm" variant="ghost" onClick={() => { setDraft(c); setEditing(c.name) }} />
              <Button label="Delete" size="sm" variant="destructive" onClick={() => remove(c.name)} />
            </li>
          ))}
          {connections.length === 0 && <li style={{ opacity: 0.6 }}>No connections yet.</li>}
        </ul>

        <div style={{ display: 'grid', gap: 8 }}>
          <Input
            aria-label="Connector name"
            placeholder="Name"
            value={draft.name}
            onChange={(v: string) => setDraft({ ...draft, name: v })}
          />
          <Input
            aria-label="Url"
            placeholder="http://localhost/connector.php"
            value={draft.url}
            onChange={(v: string) => setDraft({ ...draft, url: v })}
          />
          <Input
            aria-label="Token"
            placeholder="Token"
            value={draft.token}
            onChange={(v: string) => setDraft({ ...draft, token: v })}
          />
        </div>

        <DialogFooter>
          <Button label="Close" variant="ghost" onClick={() => onOpenChange(false)} />
          <Button label={editing ? 'Update' : 'Add'} onClick={save} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
