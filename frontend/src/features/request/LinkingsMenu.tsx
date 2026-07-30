import { useState } from 'react'
import { Button, JTLDropdown, DropdownItem } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { useTriggerAction } from './useTriggerAction'
import { ConfirmDialog } from './ConfirmDialog'

interface Entry {
  label: string
  endpoint: string
  table?: 'productVariation' | 'productVariationValue'
  destructive?: boolean
  message: string
}

const ENTRIES: Entry[] = [
  {
    label: 'Clear all', endpoint: 'clearLinkings', destructive: true,
    message: 'This clears every linking table for this connector. It cannot be undone.'
  },
  {
    label: 'Clear from JSON', endpoint: 'clearLinkingsFromJson',
    message: 'This clears the linkings listed in the payload. It cannot be undone.'
  },
  {
    label: 'Clear Method', endpoint: 'clearControllerLinkings',
    message: 'This clears all linkings for the selected controller. It cannot be undone.'
  },
  {
    label: 'Clear Variation Linkings', endpoint: 'clearControllerLinkings', table: 'productVariation',
    message: 'This clears all productVariation linkings. It cannot be undone.'
  },
  {
    label: 'Clear Variation Value Linkings', endpoint: 'clearControllerLinkings', table: 'productVariationValue',
    message: 'This clears all productVariationValue linkings. It cannot be undone.'
  }
]

export function LinkingsMenu() {
  const connected = useAppStore((s) => s.connected)
  const { trigger, busy } = useTriggerAction()
  const [pending, setPending] = useState<Entry | null>(null)

  return (
    <>
      <JTLDropdown
        menuItems={ENTRIES.map((e) => ({
          type: e.destructive ? DropdownItem.Danger : DropdownItem.Default,
          label: e.label,
          isDanger: e.destructive,
          onClick: () => setPending(e)
        }))}
      >
        <Button label="⚠ Linkings" variant="outline" size="sm" disabled={!connected || busy} />
      </JTLDropdown>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.label ?? ''}
        message={pending?.message ?? ''}
        destructive={pending?.destructive}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const e = pending
          setPending(null)
          if (e) void trigger(e.endpoint, e.table ? { controller: e.table } : {})
        }}
      />
    </>
  )
}
