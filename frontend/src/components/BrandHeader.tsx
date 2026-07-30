import { JtlLogo } from './JtlLogo'

/**
 * Top-of-rail brand header. Sits above `ConnectionPanel`, separated from it
 * by the same divider style used throughout the rail
 * (`1px solid rgba(128,128,128,.3)`, see App.tsx / ConnectionPanel.tsx).
 *
 * The logo mark already spells out "JTL", so the accompanying text
 * completes the product name ("Connector Tester") rather than repeating it.
 */
export function BrandHeader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderBottom: '1px solid rgba(128,128,128,.3)'
      }}
    >
      <JtlLogo style={{ height: 28, width: 'auto', flex: '0 0 auto' }} />
      <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
        Connector Tester
      </span>
    </div>
  )
}
