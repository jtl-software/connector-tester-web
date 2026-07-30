import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@jtl-software/platform-ui-react'

interface Props {
  open: boolean
  title: string
  message: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, destructive, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p style={{ opacity: 0.8 }}>{message}</p>
        <DialogFooter>
          <Button label="Cancel" variant="ghost" onClick={onCancel} />
          <Button label="Confirm" variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
