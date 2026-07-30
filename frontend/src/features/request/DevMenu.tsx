import { Button, JTLDropdown, DropdownItem } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { useTriggerAction } from './useTriggerAction'

const ENTRIES = [
  { label: 'Trigger Ack', endpoint: 'triggerAck' },
  { label: 'Manual Ack', endpoint: 'manualAck' },
  { label: 'Push Test', endpoint: 'pushTest' }
]

export function DevMenu() {
  const connected = useAppStore((s) => s.connected)
  const { trigger, busy } = useTriggerAction()

  return (
    <JTLDropdown
      menuItems={ENTRIES.map((e) => ({
        type: DropdownItem.Default,
        label: e.label,
        onClick: () => void trigger(e.endpoint)
      }))}
    >
      <Button label="Dev" variant="outline" size="sm" disabled={!connected || busy} />
    </JTLDropdown>
  )
}
