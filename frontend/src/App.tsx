import { useState } from 'react'
import { Button, ThemeSwitcher, ThemeProvider } from '@jtl-software/platform-ui-react'
import { CodeEditor } from '@jtl-software/platform-ui-react/components/code-editor'

export default function App() {
  const [code, setCode] = useState('{\n  "hello": "world"\n}')

  return (
    <ThemeProvider defaultTheme="dark">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            borderBottom: '1px solid rgba(128,128,128,.3)'
          }}
        >
          <strong>JTL Connector Tester</strong>
          <div style={{ marginLeft: 'auto' }}>
            <ThemeSwitcher variant="dropdown" />
          </div>
        </header>

        <main style={{ flex: 1, padding: 16 }}>
          <Button label="Scaffold works" variant="default" onClick={() => setCode('{}')} />
          <div style={{ marginTop: 16 }}>
            <CodeEditor value={code} onChange={setCode} defaultLanguage="json" height="300px" />
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}
