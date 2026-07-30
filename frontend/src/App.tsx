import { useEffect } from 'react'
import { ThemeSwitcher, ThemeProvider } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { BrandHeader } from '@/components/BrandHeader'
import { ConnectionPanel } from '@/features/connection/ConnectionPanel'
import { HistoryList } from '@/features/history/HistoryList'
import { SavedPayloadList } from '@/features/payload/SavedPayloadList'
import { RequestToolbar } from '@/features/request/RequestToolbar'
import { PayloadPane } from '@/features/payload/PayloadPane'
import { ResponsePane } from '@/features/response/ResponsePane'

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
          <BrandHeader />
          <ConnectionPanel />
          <HistoryList />
          <SavedPayloadList />
          <div style={{ flex: 1 }} />
          <div style={{ padding: 12, borderTop: '1px solid rgba(128,128,128,.3)' }}>
            <ThemeSwitcher variant="dropdown" />
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <RequestToolbar />
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <ResponsePane />
            <PayloadPane />
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}
