import { useEffect, useState } from 'react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input } from '@jtl-software/platform-ui-react'

interface Props {
  open: boolean
  title: string
  /** Accessible label for the text input (and the visible field caption). */
  label: string
  initialValue?: string
  confirmLabel?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

/**
 * Reusable in-app naming dialog. `window.prompt()` is not supported in the
 * packaged Electron app — `window.prompt('x')` throws "prompt() is not
 * supported.", and since it was previously called from a plain onClick
 * handler (not a promise), React never surfaced the throw. The click just
 * did nothing, so saving a payload silently never worked in the desktop app.
 * This component (and the Dialog primitives it composes, which are built on
 * Radix and already provide `role="dialog"`, focus trapping, and
 * Escape-to-close) replaces every use of `window.prompt` in this codebase.
 */
export function NameDialog({ open, title, label, initialValue = '', confirmLabel = 'Save', onConfirm, onCancel }: Props) {
  const [value, setValue] = useState(initialValue)

  // Re-seed the draft whenever the dialog is (re-)opened, e.g. renaming a
  // second, different entry right after renaming a first one.
  useEffect(() => {
    if (open) setValue(initialValue)
  }, [open, initialValue])

  function confirm() {
    const trimmed = value.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          aria-label={label}
          value={value}
          onChange={setValue}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              confirm()
            }
          }}
        />
        <DialogFooter>
          <Button label="Cancel" variant="ghost" onClick={onCancel} />
          <Button label={confirmLabel} onClick={confirm} disabled={!value.trim()} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
