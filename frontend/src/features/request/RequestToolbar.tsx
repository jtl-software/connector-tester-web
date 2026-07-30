import { Button, Select } from '@jtl-software/platform-ui-react'
import { ACTIONS, CONTROLLERS, CONTROLLER_LABELS, type Action, type ControllerName } from '@/types/domain'
import { useAppStore } from '@/store/useAppStore'
import { useTriggerAction } from './useTriggerAction'

export function RequestToolbar() {
  const { controller, action, limit, connected, setController, setAction, setLimit } = useAppStore()
  const { trigger, busy } = useTriggerAction()

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 12px', borderBottom: '1px solid rgba(128,128,128,.3)'
      }}
    >
      <Select
        options={CONTROLLERS.map((c) => ({ value: c, label: CONTROLLER_LABELS[c] }))}
        value={controller}
        size="sm"
        disabled={!connected}
        onChange={(v) => setController(v as ControllerName)}
      />

      <Select
        options={ACTIONS[controller].map((a) => ({ value: a, label: a }))}
        value={action}
        size="sm"
        disabled={!connected}
        onChange={(v) => setAction(v as Action)}
      />

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        Limit
        <input
          type="number"
          min={1}
          value={limit}
          aria-label="Limit"
          style={{ width: 80 }}
          onChange={(e) => setLimit(Number.parseInt(e.target.value, 10))}
        />
      </label>

      <div style={{ marginLeft: 'auto' }}>
        <Button
          label="Trigger Action"
          variant="default"
          disabled={!connected || busy}
          isLoading={busy}
          onClick={() => void trigger()}
        />
      </div>
    </div>
  )
}
