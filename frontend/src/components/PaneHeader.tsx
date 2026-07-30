import type { CSSProperties, ReactNode } from 'react'

/**
 * Fixed header height shared by every pane header (Payload, Response, …).
 *
 * Measured: `Button size="sm"` from @jtl-software/platform-ui-react renders
 * at 36px tall (`--height-h-9: 36px`). With 6px of padding above and below
 * (matching the original per-pane `padding: '6px 10px'`) that fits exactly
 * in 48px with no clipping, confirmed by measuring the rendered button and
 * header in a live browser (getBoundingClientRect()).
 */
export const PANE_HEADER_HEIGHT = 48

interface PaneHeaderProps {
  children: ReactNode
  style?: CSSProperties
}

/**
 * Shared header for the main workspace panes. Both PayloadPane and
 * ResponsePane render their own content inside this, so the two headers are
 * identical in height by construction instead of relying on their (very
 * different) content to happen to produce the same intrinsic height.
 */
export function PaneHeader({ children, style }: PaneHeaderProps) {
  return (
    <header
      style={{
        height: PANE_HEADER_HEIGHT,
        flex: '0 0 auto',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderBottom: '1px solid rgba(128,128,128,.22)',
        ...style
      }}
    >
      {children}
    </header>
  )
}
