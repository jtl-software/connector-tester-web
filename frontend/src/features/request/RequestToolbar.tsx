import { Button, Input, Select } from '@jtl-software/platform-ui-react'
import { ACTIONS, CONTROLLERS, CONTROLLER_LABELS, type Action, type ControllerName } from '@/types/domain'
import { useAppStore } from '@/store/useAppStore'
import { useTriggerAction } from './useTriggerAction'
import { DevMenu } from './DevMenu'
import { LinkingsMenu } from './LinkingsMenu'

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

      <div style={{ width: 120 }}>
        <Input
          id="request-limit"
          label="Limit"
          layout="horizontal"
          type="number"
          min={1}
          size="sm"
          value={String(limit)}
          disabled={!connected}
          onChange={(v) => setLimit(Number.parseInt(v, 10))}
        />
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, position: 'relative' }}>
        <DevMenu />
        <LinkingsMenu />
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
