import { useEffect } from 'react'
import { ThemeSwitcher, ThemeProvider } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { ConnectionPanel } from '@/features/connection/ConnectionPanel'

export default function App() {
  const init = useAppStore((s) => s.init)
  useEffect(() => { void init() }, [init])

  return (
    <ThemeProvider defaultTheme="dark">
      <div style={{ display: 'flex', height: '100%' }}>
        <aside
          style={{
            width: 220, flex: '0 0 220px',
            borderRight: '1px solid rgba(128,128,128,.3)',
            display: 'flex', flexDirection: 'column'
          }}
        >
          <ConnectionPanel />
          <div style={{ flex: 1 }} />
          <div style={{ padding: 12, borderTop: '1px solid rgba(128,128,128,.3)' }}>
            <ThemeSwitcher variant="dropdown" />
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: 16 }}>
          <p style={{ opacity: 0.6 }}>Request workspace — added in Task 6.</p>
        </main>
      </div>
    </ThemeProvider>
  )
}
