import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

import '@jtl-software/platform-ui-react/index.css'
import './styles/reset.css'
import App from './App'

// The library's CodeEditor imports @monaco-editor/react without configuring the
// loader, whose default is to fetch Monaco from the jsDelivr CDN at runtime.
// Pointing it at the bundled package makes Vite include Monaco in the build so
// the desktop app works with no network. Removing this breaks offline use
// silently — the editor renders as an empty box.
loader.config({ monaco })

// Monaco also expects a MonacoEnvironment.getWorker to spin up its background
// workers (tokenization, JSON validation). Without it, the editor still renders
// but throws on every keystroke and loses JSON schema validation. Only the
// languages this app actually uses (plain text + JSON) are wired up.
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') return new JsonWorker()
    return new EditorWorker()
  }
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
