# React Frontend Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Vue 3 + Bootstrap frontend with React 19 on JTL's official component library, adding request history, saved payloads, persistent connection state, and a richer response viewer.

**Architecture:** A left rail carries connection state, request history, and saved payloads. The main area holds a toolbar (controller, action, limit, Dev menu, Linkings menu, Trigger) above side-by-side payload and response panes. All persistence is client-side — IndexedDB for history, localStorage for connections and saved payloads — so the PHP backend stays stateless and needs no multi-user scoping.

**Tech Stack:** React 19, TypeScript, Vite 8, `@jtl-software/platform-ui-react` 1.56.1, Zustand, axios, Vitest 4 + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-30-frontend-react-rewrite-design.md`

**Branch:** `feature/frontend-react` — stays unmerged until sign-off.

## Global Constraints

- **Do not change the PHP API contract.** Requests stay `Content-Type: application/x-www-form-urlencoded` with `withCredentials: true`; PHP's `addBodyParsingMiddleware` expects form-encoded. The only backend change in this plan is deleting the dead `generatePayload` endpoint in Task 10.
- Vite `outDir` stays `../public/frontend` so `RouteController::index` keeps serving `public/frontend/index.html`. `base` is `/frontend/`.
- **JTL library components omit `className`, `style`, and `children` by design.** `Button` takes `label`, not children. `Select` takes `options`, not children. Passing any of the three is a TypeScript error, not a style that silently fails. Layout goes on wrapper `<div>`s, or on the library's `Box` / `Stack` / `Grid`.
- **Before using any library component for the first time, read its props file:** `frontend/node_modules/@jtl-software/platform-ui-react/dist/components/<name>/I<Name>Props.d.ts`. The repo is private and Storybook is internal-only — these 1,331 `.d.ts` files are the documentation.
- Verified APIs, safe to rely on:
  - `import { Button, Select, ThemeSwitcher } from '@jtl-software/platform-ui-react'`
  - `Button`: `label?`, `variant?`, `size?`, `icon?`, `iconPosition?`, `onClick?`, `disabled?`, `isLoading?`, `fullWidth?`
  - `Select`: `options?: SelectItem[]`, `value?`, `defaultValue?`, `onChange?: (value: string) => void`, `placeholder?`, `disabled?`, `size?: 'default' | 'sm'`
  - `SelectItem = { value?: string | number | null; label?: string; disabled?: boolean }`
  - `CodeEditor` (default export from `@jtl-software/platform-ui-react/components/code-editor`): `value?`, `onChange?: (value: string) => void`, `defaultLanguage?`, `height?: string | number`, `readOnly?`
- Dark mode is `data-color-scheme="dark"` on `<html>`. Never reintroduce Bootstrap's `data-bs-theme`.
- The 16 controllers are the complete set. `productVariation` and `productVariationValue` are **linking tables, not controllers** — they appear only in the Linkings menu.
- Commit after every task.

---

### Task 1: Toolchain, scaffold, and offline Monaco

The riskiest thing in the whole rewrite is silent: the library's `CodeEditor` imports `@monaco-editor/react` without calling `loader.config()`, so by default Monaco is fetched from the jsDelivr CDN at runtime. In the desktop app that means an empty editor with no network. This task proves the fix works before anything is built on top of it.

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Modify: `frontend/vite.config.ts` (replacing `vite.config.js`)
- Modify: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles/reset.css`
- Delete: `frontend/src/App.vue`, `frontend/src/main.js`, `frontend/src/store.js`, `frontend/src/components/` (entire tree)
- Delete: `frontend/.eslintrc.cjs`, `frontend/vite.config.js`

**Interfaces:**
- Produces: a building, running React shell that later tasks mount features into.

- [ ] **Step 1: Replace `package.json`**

```json
{
  "name": "connector-tester",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@jtl-software/platform-ui-react": "^1.56.1",
    "axios": "^1.7.0",
    "monaco-editor": "^0.52.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^8.0.0",
    "vitest": "^4.0.0"
  }
}
```

- [ ] **Step 2: Remove the Vue sources**

```bash
cd frontend
rm -rf src/components src/App.vue src/main.js src/store.js .eslintrc.cjs vite.config.js
rm -rf node_modules package-lock.json
npm install
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/frontend/',
  build: {
    outDir: '../public/frontend',
    emptyOutDir: true
  },
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts']
  }
})
```

- [ ] **Step 5: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en" data-color-scheme="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JTL Connector Tester</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create the page reset**

The library ships only a targeted form-control reset. Create `frontend/src/styles/reset.css`:

```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #app { height: 100%; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, p, figure, blockquote, dl, dd { margin: 0; }
ul[role="list"], ol[role="list"] { list-style: none; margin: 0; padding: 0; }
```

- [ ] **Step 7: Create `main.tsx` with the offline Monaco fix**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

import '@jtl-software/platform-ui-react/index.css'
import './styles/reset.css'
import App from './App'

// The library's CodeEditor imports @monaco-editor/react without configuring the
// loader, whose default is to fetch Monaco from the jsDelivr CDN at runtime.
// Pointing it at the bundled package makes Vite include Monaco in the build so
// the desktop app works with no network. Removing this breaks offline use
// silently — the editor renders as an empty box.
loader.config({ monaco })

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 8: Create a shell `App.tsx` that exercises the editor**

```tsx
import { useState } from 'react'
import { Button, ThemeSwitcher } from '@jtl-software/platform-ui-react'
import CodeEditor from '@jtl-software/platform-ui-react/components/code-editor'

export default function App() {
  const [code, setCode] = useState('{\n  "hello": "world"\n}')

  return (
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
          <ThemeSwitcher />
        </div>
      </header>

      <main style={{ flex: 1, padding: 16 }}>
        <Button label="Scaffold works" variant="default" onClick={() => setCode('{}')} />
        <div style={{ marginTop: 16 }}>
          <CodeEditor value={code} onChange={setCode} defaultLanguage="json" height="300px" />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 9: Create the test setup file**

Create `frontend/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
```

- [ ] **Step 10: Verify it builds and runs**

Run: `cd frontend && npm run build`
Expected: succeeds; `public/frontend/index.html` and `public/frontend/assets/` are written.

Run: `npm run dev` and open the printed URL.
Expected: header with a working theme switcher, a button, and a syntax-highlighted JSON editor.

- [ ] **Step 11: Prove Monaco is bundled, not CDN-loaded**

This is the whole point of the task. In the browser devtools **Network** tab, reload and filter for `jsdelivr` or `cdn`.
Expected: **zero** requests to any external host. Monaco's chunks must load from the local dev server.

Then confirm it in the build output:

```bash
cd frontend && npm run build && grep -rl "monaco" ../public/frontend/assets/ | head -3
```

Expected: at least one local asset file contains Monaco. If instead the network tab shows a jsdelivr request, `loader.config({ monaco })` is not running before the editor mounts — check that it is called at module scope in `main.tsx`, above `createRoot`.

- [ ] **Step 12: Commit**

```bash
git add -A frontend/ public/frontend
git commit -m "feat(frontend): scaffold react 19 + jtl platform ui, bundle monaco offline"
```

---

### Task 2: Domain types, the ACTIONS table, and the API client

**Files:**
- Create: `frontend/src/types/domain.ts`
- Create: `frontend/src/api/client.ts`
- Test: `frontend/src/types/domain.test.ts`
- Test: `frontend/src/api/client.test.ts`

**Interfaces:**
- Produces:
  - `type ControllerName` (16 members), `type Action`, `type LinkingTarget`
  - `const ACTIONS: Record<ControllerName, readonly Action[]>`
  - `const CONTROLLER_LABELS: Record<ControllerName, string>`
  - `interface RequestParams`, `interface ApiResult`
  - `callAction(endpoint: string, params: RequestParams): Promise<ApiResult>`

- [ ] **Step 1: Write the failing test for the domain types**

Create `frontend/src/types/domain.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ACTIONS, CONTROLLER_LABELS, CONTROLLERS, LINKING_TARGETS } from './domain'

describe('controller/action tables', () => {
  it('has exactly 16 controllers', () => {
    expect(CONTROLLERS).toHaveLength(16)
  })

  it('gives every controller at least one action', () => {
    for (const c of CONTROLLERS) {
      expect(ACTIONS[c].length, `${c} has no actions`).toBeGreaterThan(0)
    }
  })

  it('gives every controller a human label', () => {
    for (const c of CONTROLLERS) {
      expect(CONTROLLER_LABELS[c], `${c} has no label`).toBeTruthy()
    }
  })

  it('excludes the variation linking tables from controllers', () => {
    expect(CONTROLLERS).not.toContain('productVariation')
    expect(CONTROLLERS).not.toContain('productVariationValue')
  })

  it('includes the variation tables as linking targets', () => {
    expect(LINKING_TARGETS).toContain('productVariation')
    expect(LINKING_TARGETS).toContain('productVariationValue')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/types/domain.test.ts`
Expected: FAIL — cannot resolve `./domain`

- [ ] **Step 3: Implement `domain.ts`**

The action lists are copied verbatim from the old `FormControlsComponent.vue`.

```ts
export const CONTROLLERS = [
  'category', 'connector', 'core', 'crossSelling', 'customer',
  'customerOrder', 'deliveryNote', 'globalData', 'image', 'manufacturer',
  'payment', 'product', 'productPrice', 'productStockLevel', 'specific',
  'statusChange'
] as const

export type ControllerName = (typeof CONTROLLERS)[number]

export type Action =
  | 'Pull' | 'Push' | 'Delete' | 'Stats'
  | 'Finish' | 'Identify' | 'Clear' | 'Features' | 'Init'

/**
 * Record<ControllerName, …> is deliberate: adding a controller without giving it
 * actions becomes a compile error. The old Vue code had 18 options in the select
 * but only 16 entries here, which crashed at runtime.
 */
export const ACTIONS: Record<ControllerName, readonly Action[]> = {
  category: ['Pull', 'Push', 'Delete', 'Stats'],
  connector: ['Finish', 'Identify'],
  core: ['Clear', 'Features', 'Init'],
  crossSelling: ['Pull', 'Push', 'Delete', 'Stats'],
  customer: ['Pull', 'Push', 'Stats'],
  customerOrder: ['Pull', 'Stats'],
  deliveryNote: ['Push'],
  globalData: ['Pull', 'Stats'],
  image: ['Pull', 'Delete', 'Stats'],
  manufacturer: ['Pull', 'Push', 'Delete', 'Stats'],
  payment: ['Pull', 'Stats'],
  product: ['Pull', 'Push', 'Delete', 'Stats'],
  productPrice: ['Pull', 'Push', 'Stats'],
  productStockLevel: ['Pull', 'Push', 'Stats'],
  specific: ['Pull', 'Push', 'Delete', 'Stats'],
  statusChange: ['Push']
}

export const CONTROLLER_LABELS: Record<ControllerName, string> = {
  category: 'Category',
  connector: 'Connector',
  core: 'Core',
  crossSelling: 'Cross Selling',
  customer: 'Customer',
  customerOrder: 'Customer Order',
  deliveryNote: 'Delivery Note',
  globalData: 'Global Data',
  image: 'Image',
  manufacturer: 'Manufacturer',
  payment: 'Payment',
  product: 'Product',
  productPrice: 'Product Price',
  productStockLevel: 'Product Stock Level',
  specific: 'Specific',
  statusChange: 'Status Change'
}

/** Linking tables that are not connector-core controllers. */
export const EXTRA_LINKING_TABLES = ['productVariation', 'productVariationValue'] as const

export const LINKING_TARGETS = [...CONTROLLERS, ...EXTRA_LINKING_TABLES] as const

export type LinkingTarget = (typeof LINKING_TARGETS)[number]

export interface Connection {
  name: string
  url: string
  token: string
}

export interface RequestParams {
  connectorUrl: string
  connectorToken: string
  controller: string
  action: string
  payload: string
  limit: number
  results?: string
}

export interface ApiResult {
  ok: boolean
  httpStatus: number
  durationMs: number
  data: unknown
  errorMessage?: string
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd frontend && npx vitest run src/types/domain.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Write the failing test for the API client**

Create `frontend/src/api/client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { callAction } from './client'

vi.mock('axios')

const params = {
  connectorUrl: 'http://localhost/connector.php',
  connectorToken: 'tok',
  controller: 'category',
  action: 'Pull',
  payload: '',
  limit: 100
}

beforeEach(() => vi.resetAllMocks())

describe('callAction', () => {
  it('reads the duration from the X-Request-Time header', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: { result: [] },
      headers: { 'x-request-time': '142.87' }
    } as never)

    const result = await callAction('Pull', params)

    expect(result.ok).toBe(true)
    expect(result.httpStatus).toBe(200)
    expect(result.durationMs).toBeCloseTo(142.87, 2)
  })

  it('defaults duration to 0 when the header is absent', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      status: 200, data: {}, headers: {}
    } as never)

    const result = await callAction('Pull', params)
    expect(result.durationMs).toBe(0)
  })

  it('normalises a network failure into a result rather than throwing', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('Network Error'))

    const result = await callAction('Pull', params)

    expect(result.ok).toBe(false)
    expect(result.errorMessage).toContain('Network Error')
    expect(result.httpStatus).toBe(0)
  })

  it('normalises an HTTP error response', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { status: 500, data: { error: 'boom' }, headers: {} },
      message: 'Request failed'
    })

    const result = await callAction('Push', params)

    expect(result.ok).toBe(false)
    expect(result.httpStatus).toBe(500)
    expect(result.data).toEqual({ error: 'boom' })
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/api/client.test.ts`
Expected: FAIL — cannot resolve `./client`

- [ ] **Step 7: Implement `client.ts`**

```ts
import axios from 'axios'
import type { ApiResult, RequestParams } from '@/types/domain'

axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'
axios.defaults.withCredentials = true

function parseDuration(headers: Record<string, unknown> | undefined): number {
  const raw = headers?.['x-request-time']
  const n = Number.parseFloat(String(raw ?? ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Every endpoint is a POST that returns JSON. Failures are normalised into an
 * ApiResult instead of thrown, so callers have one shape to handle and the
 * history log records failed runs the same way it records successful ones.
 */
export async function callAction(
  endpoint: string,
  params: RequestParams & Record<string, unknown>
): Promise<ApiResult> {
  try {
    const res = await axios.post(`/${endpoint.replace(/^\//, '')}`, params)
    return {
      ok: true,
      httpStatus: res.status,
      durationMs: parseDuration(res.headers as Record<string, unknown>),
      data: res.data
    }
  } catch (err: unknown) {
    const e = err as {
      response?: { status: number; data: unknown; headers?: Record<string, unknown> }
      message?: string
    }
    return {
      ok: false,
      httpStatus: e.response?.status ?? 0,
      durationMs: parseDuration(e.response?.headers),
      data: e.response?.data ?? null,
      errorMessage: e.message ?? 'Unknown error'
    }
  }
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `cd frontend && npx vitest run`
Expected: PASS — 9 tests

- [ ] **Step 9: Commit**

```bash
git add frontend/src/types frontend/src/api
git commit -m "feat(frontend): add domain types, exhaustive actions table, and api client"
```

---

### Task 3: Storage layer

Legacy connection migration is the one place in this rewrite where a mistake causes silent, permanent data loss — every existing user has connections stored as bare localStorage keys. It gets the most tests.

**Files:**
- Create: `frontend/src/storage/connections.ts`
- Create: `frontend/src/storage/payloads.ts`
- Create: `frontend/src/storage/history.ts`
- Test: `frontend/src/storage/connections.test.ts`
- Test: `frontend/src/storage/history.test.ts`

**Interfaces:**
- Consumes: `Connection`, `ControllerName` from Task 2.
- Produces:
  - `loadConnections(): Connection[]`, `saveConnections(list: Connection[]): void`, `migrateLegacyConnections(): number`
  - `loadPayloads(): SavedPayload[]`, `savePayloads(list: SavedPayload[]): void`
  - `interface SavedPayload`, `interface HistoryEntry`
  - `appendHistory(entry: HistoryEntry): Promise<void>`, `loadHistory(): Promise<HistoryEntry[]>`, `clearHistory(): Promise<void>`
  - `const HISTORY_LIMIT = 100`, `const MAX_RESPONSE_BYTES = 512 * 1024`

- [ ] **Step 1: Write the failing tests for connections**

Create `frontend/src/storage/connections.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { loadConnections, saveConnections, migrateLegacyConnections, CONNECTIONS_KEY } from './connections'

beforeEach(() => localStorage.clear())

describe('connection storage', () => {
  it('round-trips connections', () => {
    saveConnections([{ name: 'shop-dev', url: 'http://x', token: 't' }])
    expect(loadConnections()).toEqual([{ name: 'shop-dev', url: 'http://x', token: 't' }])
  })

  it('returns an empty list when nothing is stored', () => {
    expect(loadConnections()).toEqual([])
  })

  it('imports legacy flat keys written by the Vue app', () => {
    localStorage.setItem('shop-dev', JSON.stringify({ url: 'http://a', token: 'a1' }))
    localStorage.setItem('shop-prod', JSON.stringify({ url: 'http://b', token: 'b1' }))

    const imported = migrateLegacyConnections()

    expect(imported).toBe(2)
    const names = loadConnections().map((c) => c.name).sort()
    expect(names).toEqual(['shop-dev', 'shop-prod'])
  })

  it('leaves legacy keys in place so a rollback still works', () => {
    localStorage.setItem('shop-dev', JSON.stringify({ url: 'http://a', token: 'a1' }))
    migrateLegacyConnections()
    expect(localStorage.getItem('shop-dev')).not.toBeNull()
  })

  it('ignores keys that are not connection-shaped', () => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('some-flag', JSON.stringify({ enabled: true }))
    localStorage.setItem('shop-dev', JSON.stringify({ url: 'http://a', token: 'a1' }))

    expect(migrateLegacyConnections()).toBe(1)
    expect(loadConnections().map((c) => c.name)).toEqual(['shop-dev'])
  })

  it('does not run twice over the same data', () => {
    localStorage.setItem('shop-dev', JSON.stringify({ url: 'http://a', token: 'a1' }))
    migrateLegacyConnections()
    expect(migrateLegacyConnections()).toBe(0)
    expect(loadConnections()).toHaveLength(1)
  })

  it('never clobbers connections that already exist', () => {
    saveConnections([{ name: 'kept', url: 'http://kept', token: 'k' }])
    localStorage.setItem('legacy', JSON.stringify({ url: 'http://l', token: 'l' }))

    migrateLegacyConnections()

    expect(loadConnections().map((c) => c.name).sort()).toEqual(['kept'])
  })

  it('survives corrupt stored JSON without throwing', () => {
    localStorage.setItem(CONNECTIONS_KEY, '{not json')
    expect(loadConnections()).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run src/storage/connections.test.ts`
Expected: FAIL — cannot resolve `./connections`

- [ ] **Step 3: Implement `connections.ts`**

```ts
import type { Connection } from '@/types/domain'

export const CONNECTIONS_KEY = 'jtl.connections'

export function loadConnections(): Connection[] {
  try {
    const raw = localStorage.getItem(CONNECTIONS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Connection[]) : []
  } catch {
    return []
  }
}

export function saveConnections(list: Connection[]): void {
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(list))
}

function isLegacyConnection(value: unknown): value is { url: string; token: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.url === 'string' && typeof v.token === 'string'
}

/**
 * The Vue app stored each connection as a bare localStorage key whose value was
 * {url, token} — it treated every key in localStorage as a connection. Import
 * those once, and deliberately leave the originals alone so downgrading to the
 * Vue build does not lose them.
 *
 * Returns the number of connections imported.
 */
export function migrateLegacyConnections(): number {
  if (loadConnections().length > 0) return 0

  const imported: Connection[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || key.startsWith('jtl.')) continue

    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '')
      if (isLegacyConnection(parsed)) {
        imported.push({ name: key, url: parsed.url, token: parsed.token })
      }
    } catch {
      // not JSON — not a connection
    }
  }

  if (imported.length > 0) saveConnections(imported)
  return imported.length
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd frontend && npx vitest run src/storage/connections.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 5: Write the failing tests for history**

Create `frontend/src/storage/history.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  appendHistory, loadHistory, clearHistory,
  HISTORY_LIMIT, MAX_RESPONSE_BYTES, type HistoryEntry
} from './history'

function entry(over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    at: Date.now(),
    connectionName: 'shop-dev',
    controller: 'category',
    action: 'Pull',
    payload: '',
    limit: 100,
    status: 'ok',
    httpStatus: 200,
    durationMs: 42,
    response: { result: [] },
    responseBytes: 12,
    truncated: false,
    ...over
  }
}

beforeEach(async () => { await clearHistory() })

describe('history storage', () => {
  it('round-trips an entry', async () => {
    await appendHistory(entry({ controller: 'product' }))
    const all = await loadHistory()
    expect(all).toHaveLength(1)
    expect(all[0].controller).toBe('product')
  })

  it('returns newest first', async () => {
    await appendHistory(entry({ at: 1000, controller: 'category' }))
    await appendHistory(entry({ at: 2000, controller: 'product' }))
    const all = await loadHistory()
    expect(all[0].controller).toBe('product')
  })

  it(`keeps at most ${HISTORY_LIMIT} entries`, async () => {
    for (let i = 0; i < HISTORY_LIMIT + 15; i++) {
      await appendHistory(entry({ at: i }))
    }
    expect(await loadHistory()).toHaveLength(HISTORY_LIMIT)
  })

  it('drops the oldest entries when over the limit', async () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      await appendHistory(entry({ at: i, controller: 'category' }))
    }
    const all = await loadHistory()
    const oldest = all[all.length - 1]
    expect(oldest.at).toBeGreaterThanOrEqual(5)
  })

  it('truncates oversized responses and flags them', async () => {
    const huge = 'x'.repeat(MAX_RESPONSE_BYTES + 1000)
    await appendHistory(entry({ response: huge, responseBytes: huge.length }))
    const [stored] = await loadHistory()
    expect(stored.truncated).toBe(true)
    expect(JSON.stringify(stored.response).length).toBeLessThan(MAX_RESPONSE_BYTES + 200)
  })

  it('records failed requests too', async () => {
    await appendHistory(entry({ status: 'error', httpStatus: 500 }))
    const [stored] = await loadHistory()
    expect(stored.status).toBe('error')
    expect(stored.httpStatus).toBe(500)
  })

  it('clears everything', async () => {
    await appendHistory(entry())
    await clearHistory()
    expect(await loadHistory()).toEqual([])
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `cd frontend && npx vitest run src/storage/history.test.ts`
Expected: FAIL — cannot resolve `./history`

- [ ] **Step 7: Implement `history.ts`**

A thin hand-rolled IndexedDB wrapper; adding a dependency for three operations is not worth it.

```ts
import type { ControllerName } from '@/types/domain'

export const DB_NAME = 'jtl-tester'
export const STORE = 'history'
export const HISTORY_LIMIT = 100
export const MAX_RESPONSE_BYTES = 512 * 1024

export interface HistoryEntry {
  id: string
  at: number
  connectionName: string
  controller: ControllerName | string
  action: string
  payload: string
  limit: number
  status: 'ok' | 'error'
  httpStatus: number
  durationMs: number
  response: unknown
  responseBytes: number
  truncated: boolean
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('at', 'at')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      })
  )
}

/** Keep the DB bounded: huge responses are stored as a truncated string. */
function capResponse(entry: HistoryEntry): HistoryEntry {
  const serialised = JSON.stringify(entry.response ?? null)
  if (serialised.length <= MAX_RESPONSE_BYTES) return entry

  return {
    ...entry,
    response: `${serialised.slice(0, MAX_RESPONSE_BYTES)}… [truncated]`,
    truncated: true
  }
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  await tx('readwrite', (store) => store.put(capResponse(entry)))

  const all = await loadHistory()
  if (all.length <= HISTORY_LIMIT) return

  const doomed = all.slice(HISTORY_LIMIT)
  for (const old of doomed) {
    await tx('readwrite', (store) => store.delete(old.id))
  }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const all = await tx<HistoryEntry[]>('readonly', (store) => store.getAll())
  return all.sort((a, b) => b.at - a.at)
}

export async function clearHistory(): Promise<void> {
  await tx('readwrite', (store) => store.clear())
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `cd frontend && npx vitest run src/storage/history.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 9: Implement `payloads.ts`**

No separate test file — it is the same shape as `connections.ts` and is covered indirectly by Task 9's feature tests.

```ts
import type { ControllerName } from '@/types/domain'

export const PAYLOADS_KEY = 'jtl.payloads'

export interface SavedPayload {
  id: string
  name: string
  controller: ControllerName
  body: string
  updatedAt: number
}

export function loadPayloads(): SavedPayload[] {
  try {
    const raw = localStorage.getItem(PAYLOADS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SavedPayload[]) : []
  } catch {
    return []
  }
}

export function savePayloads(list: SavedPayload[]): void {
  localStorage.setItem(PAYLOADS_KEY, JSON.stringify(list))
}
```

- [ ] **Step 10: Run the whole suite and commit**

Run: `cd frontend && npm test`
Expected: PASS — 24 tests

```bash
git add frontend/src/storage
git commit -m "feat(frontend): add storage layer with legacy connection migration"
```

---

### Task 4: Zustand store

**Files:**
- Create: `frontend/src/store/useAppStore.ts`
- Test: `frontend/src/store/useAppStore.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2 and 3.
- Produces: `useAppStore` with state `{ connections, activeConnection, connected, controller, action, limit, payload, result, history, payloads, busy }` and actions `{ init, setActiveConnection, setConnected, setController, setAction, setLimit, setPayload, setResult, refreshHistory, addHistory, setConnections, setPayloads }`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/store/useAppStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'
import { clearHistory } from '@/storage/history'

beforeEach(async () => {
  localStorage.clear()
  await clearHistory()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

describe('app store', () => {
  it('defaults to category/Pull', () => {
    const s = useAppStore.getState()
    expect(s.controller).toBe('category')
    expect(s.action).toBe('Pull')
  })

  it('resets the action to the first valid one when the controller changes', () => {
    useAppStore.getState().setController('connector')
    expect(useAppStore.getState().action).toBe('Finish')
  })

  it('keeps the action if it is still valid for the new controller', () => {
    useAppStore.getState().setAction('Stats')
    useAppStore.getState().setController('product')
    expect(useAppStore.getState().action).toBe('Stats')
  })

  it('imports legacy connections on init', async () => {
    localStorage.setItem('shop-dev', JSON.stringify({ url: 'http://a', token: 'a1' }))
    await useAppStore.getState().init()
    expect(useAppStore.getState().connections.map((c) => c.name)).toEqual(['shop-dev'])
  })

  it('drops the connected flag when the active connection changes', () => {
    useAppStore.setState({ connected: true })
    useAppStore.getState().setActiveConnection('other')
    expect(useAppStore.getState().connected).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run src/store/useAppStore.test.ts`
Expected: FAIL — cannot resolve `./useAppStore`

- [ ] **Step 3: Implement `useAppStore.ts`**

```ts
import { create } from 'zustand'
import { ACTIONS, type Action, type ControllerName, type Connection, type ApiResult } from '@/types/domain'
import { loadConnections, saveConnections, migrateLegacyConnections } from '@/storage/connections'
import { loadPayloads, savePayloads, type SavedPayload } from '@/storage/payloads'
import { appendHistory, loadHistory, type HistoryEntry } from '@/storage/history'

interface AppState {
  connections: Connection[]
  activeConnection: string | null
  connected: boolean
  controller: ControllerName
  action: Action
  limit: number
  payload: string
  result: ApiResult | null
  history: HistoryEntry[]
  payloads: SavedPayload[]
  busy: boolean

  init: () => Promise<void>
  setConnections: (list: Connection[]) => void
  setActiveConnection: (name: string | null) => void
  setConnected: (v: boolean) => void
  setController: (c: ControllerName) => void
  setAction: (a: Action) => void
  setLimit: (n: number) => void
  setPayload: (p: string) => void
  setResult: (r: ApiResult | null) => void
  setBusy: (v: boolean) => void
  addHistory: (e: HistoryEntry) => Promise<void>
  refreshHistory: () => Promise<void>
  setPayloads: (list: SavedPayload[]) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  connections: [],
  activeConnection: null,
  connected: false,
  controller: 'category',
  action: 'Pull',
  limit: 100,
  payload: '',
  result: null,
  history: [],
  payloads: [],
  busy: false,

  init: async () => {
    migrateLegacyConnections()
    set({
      connections: loadConnections(),
      payloads: loadPayloads(),
      history: await loadHistory()
    })
  },

  setConnections: (list) => {
    saveConnections(list)
    set({ connections: list })
  },

  // Switching connectors invalidates the authenticated session.
  setActiveConnection: (name) => set({ activeConnection: name, connected: false }),

  setConnected: (v) => set({ connected: v }),

  setController: (c) => {
    const valid = ACTIONS[c]
    const current = get().action
    set({ controller: c, action: valid.includes(current) ? current : valid[0] })
  },

  setAction: (a) => set({ action: a }),
  setLimit: (n) => set({ limit: Number.isFinite(n) && n > 0 ? n : 100 }),
  setPayload: (p) => set({ payload: p }),
  setResult: (r) => set({ result: r }),
  setBusy: (v) => set({ busy: v }),

  addHistory: async (e) => {
    await appendHistory(e)
    set({ history: await loadHistory() })
  },

  refreshHistory: async () => set({ history: await loadHistory() }),

  setPayloads: (list) => {
    savePayloads(list)
    set({ payloads: list })
  }
}))
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd frontend && npx vitest run src/store/useAppStore.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store
git commit -m "feat(frontend): add zustand store with controller/action coupling"
```

---

### Task 5: Connection rail — switch, manage, authenticate

**Files:**
- Create: `frontend/src/features/connection/ConnectionPanel.tsx`
- Create: `frontend/src/features/connection/ManageConnectionsDialog.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/features/connection/ConnectionPanel.test.tsx`

**Interfaces:**
- Consumes: `useAppStore`, `callAction`.
- Produces: `<ConnectionPanel />` for the rail header, `<ManageConnectionsDialog open onOpenChange />`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/connection/ConnectionPanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionPanel } from './ConnectionPanel'
import { useAppStore } from '@/store/useAppStore'
import * as api from '@/api/client'

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState(useAppStore.getInitialState(), true)
  vi.restoreAllMocks()
})

describe('ConnectionPanel', () => {
  it('shows a disconnected state with no active connection', () => {
    render(<ConnectionPanel />)
    expect(screen.getByText(/not connected/i)).toBeInTheDocument()
  })

  it('shows the endpoint url of the active connection', () => {
    useAppStore.setState({
      connections: [{ name: 'shop-dev', url: 'http://localhost/connector.php', token: 't' }],
      activeConnection: 'shop-dev'
    })
    render(<ConnectionPanel />)
    expect(screen.getByText('http://localhost/connector.php')).toBeInTheDocument()
  })

  it('sets connected on a successful authenticate', async () => {
    vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 10, data: { sessionId: 'abc' }
    })
    useAppStore.setState({
      connections: [{ name: 'shop-dev', url: 'http://x', token: 't' }],
      activeConnection: 'shop-dev'
    })

    render(<ConnectionPanel />)
    await userEvent.click(screen.getByRole('button', { name: /authenticate/i }))

    expect(useAppStore.getState().connected).toBe(true)
  })

  it('stays disconnected when authenticate fails', async () => {
    vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: false, httpStatus: 500, durationMs: 5, data: null, errorMessage: 'nope'
    })
    useAppStore.setState({
      connections: [{ name: 'shop-dev', url: 'http://x', token: 't' }],
      activeConnection: 'shop-dev'
    })

    render(<ConnectionPanel />)
    await userEvent.click(screen.getByRole('button', { name: /authenticate/i }))

    expect(useAppStore.getState().connected).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run src/features/connection`
Expected: FAIL — cannot resolve `./ConnectionPanel`

- [ ] **Step 3: Implement `ConnectionPanel.tsx`**

```tsx
import { useState } from 'react'
import { Button, Select } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { callAction } from '@/api/client'
import { ManageConnectionsDialog } from './ManageConnectionsDialog'

export function ConnectionPanel() {
  const { connections, activeConnection, connected, setActiveConnection, setConnected } = useAppStore()
  const [manageOpen, setManageOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const active = connections.find((c) => c.name === activeConnection) ?? null

  async function toggleConnection() {
    if (!active) return
    setBusy(true)
    try {
      const endpoint = connected ? 'disconnect' : 'authenticate'
      const res = await callAction(endpoint, {
        connectorUrl: active.url,
        connectorToken: active.token,
        controller: '',
        action: '',
        payload: '',
        limit: 0
      })
      setConnected(connected ? false : res.ok)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 12, borderBottom: '1px solid rgba(128,128,128,.3)' }}>
      <Select
        options={connections.map((c) => ({ value: c.name, label: c.name }))}
        value={activeConnection ?? undefined}
        placeholder="Select a connection"
        size="sm"
        onChange={(v) => setActiveConnection(v)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <span
          aria-hidden
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#16a34a' : '#9ca3af'
          }}
        />
        <span style={{ fontSize: 12 }}>{connected ? 'Connected' : 'Not connected'}</span>
        <div style={{ marginLeft: 'auto' }}>
          <Button label="Manage" size="sm" variant="ghost" onClick={() => setManageOpen(true)} />
        </div>
      </div>

      {active && (
        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6, wordBreak: 'break-all' }}>
          {active.url}
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <Button
          label={connected ? 'Disconnect' : 'Authenticate'}
          variant={connected ? 'outline' : 'default'}
          size="sm"
          fullWidth
          disabled={!active || busy}
          isLoading={busy}
          onClick={toggleConnection}
        />
      </div>

      <ManageConnectionsDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  )
}
```

- [ ] **Step 4: Implement `ManageConnectionsDialog.tsx`**

Read `dist/components/dialog/components/` and `dist/components/input/IInputProps.d.ts` before writing this — the `Dialog` export is a primitive set, not a single component, so the exact composition must come from the type definitions.

```tsx
import { useState } from 'react'
import { Button } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import type { Connection } from '@/types/domain'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EMPTY: Connection = { name: '', url: '', token: '' }

export function ManageConnectionsDialog({ open, onOpenChange }: Props) {
  const { connections, setConnections } = useAppStore()
  const [draft, setDraft] = useState<Connection>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)

  if (!open) return null

  function save() {
    if (!draft.name.trim()) return
    const next = connections.filter((c) => c.name !== editing && c.name !== draft.name.trim())
    next.push({ ...draft, name: draft.name.trim() })
    setConnections(next)
    setDraft(EMPTY)
    setEditing(null)
  }

  function remove(name: string) {
    setConnections(connections.filter((c) => c.name !== name))
  }

  return (
    <div
      role="dialog"
      aria-label="Manage connections"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
        display: 'grid', placeItems: 'center', zIndex: 50
      }}
    >
      <div style={{ background: 'var(--base-background, #1e1e1e)', padding: 20, borderRadius: 8, minWidth: 460 }}>
        <h2 style={{ marginBottom: 12 }}>Connections</h2>

        <ul role="list" style={{ marginBottom: 16 }}>
          {connections.map((c) => (
            <li key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <span style={{ flex: 1 }}>{c.name}</span>
              <Button label="Edit" size="sm" variant="ghost" onClick={() => { setDraft(c); setEditing(c.name) }} />
              <Button label="Delete" size="sm" variant="destructive" onClick={() => remove(c.name)} />
            </li>
          ))}
          {connections.length === 0 && <li style={{ opacity: 0.6 }}>No connections yet.</li>}
        </ul>

        <div style={{ display: 'grid', gap: 8 }}>
          <input
            aria-label="Connector name"
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <input
            aria-label="Url"
            placeholder="http://localhost/connector.php"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
          <input
            aria-label="Token"
            placeholder="Token"
            value={draft.token}
            onChange={(e) => setDraft({ ...draft, token: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button label="Close" variant="ghost" onClick={() => onOpenChange(false)} />
          <Button label={editing ? 'Update' : 'Add'} onClick={save} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire the rail into `App.tsx`**

```tsx
import { useEffect } from 'react'
import { ThemeSwitcher } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { ConnectionPanel } from '@/features/connection/ConnectionPanel'

export default function App() {
  const init = useAppStore((s) => s.init)
  useEffect(() => { void init() }, [init])

  return (
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
          <ThemeSwitcher />
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: 16 }}>
        <p style={{ opacity: 0.6 }}>Request workspace — added in Task 6.</p>
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Run the tests and the app**

Run: `cd frontend && npx vitest run src/features/connection`
Expected: PASS — 4 tests

Run: `npm run dev` — add a connection, confirm it survives a reload.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/connection frontend/src/App.tsx
git commit -m "feat(frontend): add connection rail with management dialog"
```

---

### Task 6: Request workspace — toolbar, payload editor, response viewer

**Files:**
- Create: `frontend/src/features/request/RequestToolbar.tsx`
- Create: `frontend/src/features/request/useTriggerAction.ts`
- Create: `frontend/src/features/payload/PayloadPane.tsx`
- Create: `frontend/src/features/response/ResponsePane.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/features/request/RequestToolbar.test.tsx`

**Interfaces:**
- Consumes: `useAppStore`, `callAction`, `ACTIONS`, `CONTROLLER_LABELS`.
- Produces: `useTriggerAction(): { trigger: (endpoint?: string, extra?: Record<string, unknown>) => Promise<void>, busy: boolean }` — reused by Task 7's menus.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/request/RequestToolbar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RequestToolbar } from './RequestToolbar'
import { useAppStore } from '@/store/useAppStore'

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

describe('RequestToolbar', () => {
  it('disables Trigger while disconnected', () => {
    render(<RequestToolbar />)
    expect(screen.getByRole('button', { name: /trigger/i })).toBeDisabled()
  })

  it('enables Trigger once connected', () => {
    useAppStore.setState({ connected: true })
    render(<RequestToolbar />)
    expect(screen.getByRole('button', { name: /trigger/i })).toBeEnabled()
  })

  it('offers only the actions valid for the selected controller', () => {
    useAppStore.setState({ connected: true })
    useAppStore.getState().setController('deliveryNote')
    expect(useAppStore.getState().action).toBe('Push')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run src/features/request`
Expected: FAIL — cannot resolve `./RequestToolbar`

- [ ] **Step 3: Implement `useTriggerAction.ts`**

```ts
import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { callAction } from '@/api/client'
import type { HistoryEntry } from '@/storage/history'

/**
 * Single path for every request the app makes. Menus in Task 7 pass a different
 * endpoint and extra body fields, but history, timing, and busy state are
 * recorded identically for all of them — including failures.
 */
export function useTriggerAction() {
  const [busy, setBusy] = useState(false)
  const store = useAppStore

  async function trigger(endpoint?: string, extra: Record<string, unknown> = {}) {
    const s = store.getState()
    const active = s.connections.find((c) => c.name === s.activeConnection)
    if (!active) return

    setBusy(true)
    try {
      const res = await callAction(endpoint ?? s.action, {
        connectorUrl: active.url,
        connectorToken: active.token,
        controller: s.controller,
        action: s.action,
        payload: s.payload,
        limit: s.limit,
        results: JSON.stringify(s.result?.data ?? ''),
        ...extra
      })

      s.setResult(res)

      const serialised = JSON.stringify(res.data ?? null)
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        at: Date.now(),
        connectionName: active.name,
        controller: String(extra.controller ?? s.controller),
        action: endpoint ?? s.action,
        payload: s.payload,
        limit: s.limit,
        status: res.ok ? 'ok' : 'error',
        httpStatus: res.httpStatus,
        durationMs: res.durationMs,
        response: res.data,
        responseBytes: serialised.length,
        truncated: false
      }
      await s.addHistory(entry)
    } finally {
      setBusy(false)
    }
  }

  return { trigger, busy }
}
```

- [ ] **Step 4: Implement `RequestToolbar.tsx`**

```tsx
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
```

- [ ] **Step 5: Implement `PayloadPane.tsx`**

```tsx
import CodeEditor from '@jtl-software/platform-ui-react/components/code-editor'
import { Button } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { useTriggerAction } from '@/features/request/useTriggerAction'

export function PayloadPane() {
  const { payload, setPayload, connected, result } = useAppStore()
  const { trigger, busy } = useTriggerAction()

  async function loadSkeleton() {
    await trigger('getSkeleton')
    const data = useAppStore.getState().result?.data
    if (data != null) setPayload(JSON.stringify(data, null, 2))
  }

  let valid = true
  if (payload.trim()) {
    try { JSON.parse(payload) } catch { valid = false }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderBottom: '1px solid rgba(128,128,128,.22)'
        }}
      >
        <span style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.65 }}>
          Payload
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Button label="Skeleton" size="sm" variant="ghost" disabled={!connected || busy} onClick={() => void loadSkeleton()} />
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0 }}>
        <CodeEditor value={payload} onChange={setPayload} defaultLanguage="json" height="100%" />
      </div>

      <footer style={{ padding: '4px 10px', fontSize: 10, opacity: 0.6, borderTop: '1px solid rgba(128,128,128,.22)' }}>
        {payload.trim() ? (valid ? 'JSON valid' : 'Invalid JSON') : 'Empty'}
        {result ? '' : ''}
      </footer>
    </section>
  )
}
```

- [ ] **Step 6: Implement `ResponsePane.tsx`**

```tsx
import { useState } from 'react'
import CodeEditor from '@jtl-software/platform-ui-react/components/code-editor'
import { useAppStore } from '@/store/useAppStore'

function countItems(data: unknown): string {
  if (Array.isArray(data)) return `${data.length} items`
  if (data && typeof data === 'object') {
    const r = (data as Record<string, unknown>).result
    if (Array.isArray(r)) return `${r.length} items`
  }
  return ''
}

export function ResponsePane() {
  const result = useAppStore((s) => s.result)
  const [filter, setFilter] = useState('')

  const text = result ? JSON.stringify(result.data, null, 2) : ''
  const shown = filter
    ? text.split('\n').filter((l) => l.toLowerCase().includes(filter.toLowerCase())).join('\n')
    : text

  return (
    <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, borderLeft: '1px solid rgba(128,128,128,.3)' }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 10px', borderBottom: '1px solid rgba(128,128,128,.22)', fontSize: 11
        }}
      >
        {result ? (
          <>
            <span
              style={{
                background: result.ok ? '#16a34a' : '#dc2626',
                color: '#fff', padding: '1px 6px', borderRadius: 3,
                fontWeight: 700, fontSize: 9
              }}
            >
              {result.httpStatus || 'ERR'}
            </span>
            <span>{result.durationMs.toFixed(0)} ms</span>
            <span>{countItems(result.data)}</span>
            {result.errorMessage && <span style={{ color: '#dc2626' }}>{result.errorMessage}</span>}
          </>
        ) : (
          <span style={{ opacity: 0.6 }}>No response yet</span>
        )}

        <input
          aria-label="Filter response"
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ marginLeft: 'auto', width: 140 }}
        />
      </header>

      <div style={{ flex: 1, minHeight: 0 }}>
        <CodeEditor value={shown} defaultLanguage="json" height="100%" readOnly />
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Assemble the workspace in `App.tsx`**

Replace the `<main>` block:

```tsx
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <RequestToolbar />
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <PayloadPane />
          <ResponsePane />
        </div>
      </main>
```

Add the imports:

```tsx
import { RequestToolbar } from '@/features/request/RequestToolbar'
import { PayloadPane } from '@/features/payload/PayloadPane'
import { ResponsePane } from '@/features/response/ResponsePane'
```

- [ ] **Step 8: Verify against a real connector**

Run: `cd frontend && npx vitest run` — expect PASS.

Then serve the PHP backend and the dev server together, authenticate against a real connector, and run a `category` `Pull`. Confirm the status badge, duration, and item count all populate.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features frontend/src/App.tsx
git commit -m "feat(frontend): add request toolbar, payload editor, and response viewer"
```

---

### Task 7: Dev and Linkings menus

**Files:**
- Create: `frontend/src/features/request/DevMenu.tsx`
- Create: `frontend/src/features/request/LinkingsMenu.tsx`
- Create: `frontend/src/features/request/ConfirmDialog.tsx`
- Modify: `frontend/src/features/request/RequestToolbar.tsx`
- Test: `frontend/src/features/request/LinkingsMenu.test.tsx`

**Interfaces:**
- Consumes: `useTriggerAction` from Task 6, `EXTRA_LINKING_TABLES` from Task 2.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/request/LinkingsMenu.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinkingsMenu } from './LinkingsMenu'
import { useAppStore } from '@/store/useAppStore'
import * as api from '@/api/client'

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState(useAppStore.getInitialState(), true)
  useAppStore.setState({
    connected: true,
    connections: [{ name: 'c', url: 'http://x', token: 't' }],
    activeConnection: 'c'
  })
  vi.restoreAllMocks()
})

describe('LinkingsMenu', () => {
  it('does not fire a destructive request until confirmed', async () => {
    const spy = vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 1, data: {}
    })

    render(<LinkingsMenu />)
    await userEvent.click(screen.getByRole('button', { name: /linkings/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /clear all/i }))

    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('fires the request after confirmation', async () => {
    const spy = vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 1, data: {}
    })

    render(<LinkingsMenu />)
    await userEvent.click(screen.getByRole('button', { name: /linkings/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /clear all/i }))
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }))

    expect(spy).toHaveBeenCalledWith('clearLinkings', expect.anything())
  })

  it('passes the variation table explicitly, not the selected controller', async () => {
    const spy = vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 1, data: {}
    })

    render(<LinkingsMenu />)
    await userEvent.click(screen.getByRole('button', { name: /linkings/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /clear variation linkings/i }))
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }))

    expect(spy).toHaveBeenCalledWith(
      'clearControllerLinkings',
      expect.objectContaining({ controller: 'productVariation' })
    )
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run src/features/request/LinkingsMenu.test.tsx`
Expected: FAIL — cannot resolve `./LinkingsMenu`

- [ ] **Step 3: Implement `ConfirmDialog.tsx`**

```tsx
import { Button } from '@jtl-software/platform-ui-react'

interface Props {
  open: boolean
  title: string
  message: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, destructive, onConfirm, onCancel }: Props) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
        display: 'grid', placeItems: 'center', zIndex: 60
      }}
    >
      <div style={{ background: 'var(--base-background, #1e1e1e)', padding: 20, borderRadius: 8, maxWidth: 460 }}>
        <h2 style={{ marginBottom: 8 }}>{title}</h2>
        <p style={{ marginBottom: 16, opacity: 0.8 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button label="Cancel" variant="ghost" onClick={onCancel} />
          <Button label="Confirm" variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement `LinkingsMenu.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { useTriggerAction } from './useTriggerAction'
import { ConfirmDialog } from './ConfirmDialog'

interface Entry {
  label: string
  endpoint: string
  table?: 'productVariation' | 'productVariationValue'
  destructive?: boolean
  message: string
}

const ENTRIES: Entry[] = [
  {
    label: 'Clear all', endpoint: 'clearLinkings', destructive: true,
    message: 'This clears every linking table for this connector. It cannot be undone.'
  },
  {
    label: 'Clear from JSON', endpoint: 'clearLinkingsFromJson',
    message: 'This clears the linkings listed in the payload. It cannot be undone.'
  },
  {
    label: 'Clear Method', endpoint: 'clearControllerLinkings',
    message: 'This clears all linkings for the selected controller. It cannot be undone.'
  },
  {
    label: 'Clear Variation Linkings', endpoint: 'clearControllerLinkings', table: 'productVariation',
    message: 'This clears all productVariation linkings. It cannot be undone.'
  },
  {
    label: 'Clear Variation Value Linkings', endpoint: 'clearControllerLinkings', table: 'productVariationValue',
    message: 'This clears all productVariationValue linkings. It cannot be undone.'
  }
]

export function LinkingsMenu() {
  const connected = useAppStore((s) => s.connected)
  const { trigger, busy } = useTriggerAction()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<Entry | null>(null)

  return (
    <>
      <Button
        label="⚠ Linkings"
        variant="outline"
        size="sm"
        disabled={!connected || busy}
        onClick={() => setOpen((v) => !v)}
      />

      {open && (
        <div role="menu" style={{ position: 'absolute', zIndex: 20, background: 'var(--base-background, #1e1e1e)', border: '1px solid rgba(128,128,128,.4)', borderRadius: 6, marginTop: 4 }}>
          {ENTRIES.map((e) => (
            <button
              key={e.label}
              role="menuitem"
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px',
                background: 'none', border: 0, cursor: 'pointer',
                color: e.destructive ? '#dc2626' : 'inherit'
              }}
              onClick={() => { setPending(e); setOpen(false) }}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.label ?? ''}
        message={pending?.message ?? ''}
        destructive={pending?.destructive}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const e = pending
          setPending(null)
          if (e) void trigger(e.endpoint, e.table ? { controller: e.table } : {})
        }}
      />
    </>
  )
}
```

- [ ] **Step 5: Implement `DevMenu.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { useTriggerAction } from './useTriggerAction'

const ENTRIES = [
  { label: 'Trigger Ack', endpoint: 'triggerAck' },
  { label: 'Manual Ack', endpoint: 'manualAck' },
  { label: 'Push Test', endpoint: 'pushTest' }
]

export function DevMenu() {
  const connected = useAppStore((s) => s.connected)
  const { trigger, busy } = useTriggerAction()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button label="Dev" variant="outline" size="sm" disabled={!connected || busy} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div role="menu" style={{ position: 'absolute', zIndex: 20, background: 'var(--base-background, #1e1e1e)', border: '1px solid rgba(128,128,128,.4)', borderRadius: 6, marginTop: 4 }}>
          {ENTRIES.map((e) => (
            <button
              key={e.endpoint}
              role="menuitem"
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 0, cursor: 'pointer' }}
              onClick={() => { setOpen(false); void trigger(e.endpoint) }}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 6: Add both menus to `RequestToolbar.tsx`**

Insert immediately before the Trigger button's wrapper `<div>`:

```tsx
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
```

Remove the old `marginLeft: 'auto'` wrapper that held only the Trigger button, and add:

```tsx
import { DevMenu } from './DevMenu'
import { LinkingsMenu } from './LinkingsMenu'
```

- [ ] **Step 7: Run tests and commit**

Run: `cd frontend && npx vitest run`
Expected: PASS — all suites

```bash
git add frontend/src/features/request
git commit -m "feat(frontend): add dev and linkings menus with confirmation"
```

---

### Task 8: History rail

**Files:**
- Create: `frontend/src/features/history/HistoryList.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/features/history/HistoryList.test.tsx`

**Interfaces:**
- Consumes: `useAppStore.history`, `HistoryEntry`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/history/HistoryList.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryList } from './HistoryList'
import { useAppStore } from '@/store/useAppStore'
import { clearHistory, type HistoryEntry } from '@/storage/history'

function entry(over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: crypto.randomUUID(), at: Date.now(), connectionName: 'c',
    controller: 'category', action: 'Pull', payload: '{"a":1}', limit: 50,
    status: 'ok', httpStatus: 200, durationMs: 42,
    response: { result: [] }, responseBytes: 12, truncated: false, ...over
  }
}

beforeEach(async () => {
  localStorage.clear()
  await clearHistory()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

describe('HistoryList', () => {
  it('shows an empty state', () => {
    render(<HistoryList />)
    expect(screen.getByText(/no requests yet/i)).toBeInTheDocument()
  })

  it('lists entries with status and duration', () => {
    useAppStore.setState({ history: [entry({ controller: 'product', durationMs: 1200 })] })
    render(<HistoryList />)
    expect(screen.getByText(/product/)).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('restores controller, action, limit, and payload on click', async () => {
    useAppStore.setState({
      history: [entry({ controller: 'manufacturer', action: 'Push', limit: 7, payload: '{"z":9}' })]
    })

    render(<HistoryList />)
    await userEvent.click(screen.getByRole('button', { name: /manufacturer/i }))

    const s = useAppStore.getState()
    expect(s.controller).toBe('manufacturer')
    expect(s.action).toBe('Push')
    expect(s.limit).toBe(7)
    expect(s.payload).toBe('{"z":9}')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run src/features/history`
Expected: FAIL — cannot resolve `./HistoryList`

- [ ] **Step 3: Implement `HistoryList.tsx`**

```tsx
import { Button } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'
import { clearHistory, type HistoryEntry } from '@/storage/history'
import { ACTIONS, type Action, type ControllerName } from '@/types/domain'

export function HistoryList() {
  const { history, setController, setAction, setLimit, setPayload, setResult, refreshHistory } = useAppStore()

  function restore(e: HistoryEntry) {
    const controller = e.controller as ControllerName
    if (ACTIONS[controller]) {
      setController(controller)
      if (ACTIONS[controller].includes(e.action as Action)) setAction(e.action as Action)
    }
    setLimit(e.limit)
    setPayload(e.payload)
    setResult({
      ok: e.status === 'ok',
      httpStatus: e.httpStatus,
      durationMs: e.durationMs,
      data: e.response
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', padding: '5px 10px',
          fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.65,
          borderBottom: '1px solid rgba(128,128,128,.22)'
        }}
      >
        History
        <div style={{ marginLeft: 'auto' }}>
          <Button
            label="Clear"
            size="sm"
            variant="ghost"
            onClick={async () => { await clearHistory(); await refreshHistory() }}
          />
        </div>
      </header>

      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        {history.length === 0 && (
          <p style={{ padding: '8px 10px', fontSize: 11, opacity: 0.6 }}>No requests yet.</p>
        )}

        {history.map((e) => (
          <button
            key={e.id}
            onClick={() => restore(e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              padding: '5px 10px', background: 'none', border: 0,
              borderBottom: '1px solid rgba(128,128,128,.16)',
              cursor: 'pointer', textAlign: 'left', fontSize: 11, color: 'inherit'
            }}
          >
            <span
              style={{
                background: e.status === 'ok' ? '#16a34a' : '#dc2626',
                color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 700
              }}
            >
              {e.httpStatus || 'ERR'}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.controller} · {e.action}
            </span>
            <span style={{ marginLeft: 'auto', opacity: 0.55, fontSize: 9 }}>
              {e.durationMs >= 1000 ? `${(e.durationMs / 1000).toFixed(1)}s` : `${e.durationMs.toFixed(0)}ms`}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add it to the rail in `App.tsx`**

Replace `<div style={{ flex: 1 }} />` with:

```tsx
        <HistoryList />
        <div style={{ flex: 1 }} />
```

and import it:

```tsx
import { HistoryList } from '@/features/history/HistoryList'
```

- [ ] **Step 5: Run tests, then verify persistence by hand**

Run: `cd frontend && npx vitest run` — expect PASS.

In the browser: run three requests, reload the page, and confirm all three are still listed. Then run 105 requests (or lower `HISTORY_LIMIT` temporarily) and confirm the list caps at 100.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/history frontend/src/App.tsx
git commit -m "feat(frontend): add request history rail with restore"
```

---

### Task 9: Saved payloads

**Files:**
- Create: `frontend/src/features/payload/SavedPayloadList.tsx`
- Modify: `frontend/src/features/payload/PayloadPane.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/features/payload/SavedPayloadList.test.tsx`

**Interfaces:**
- Consumes: `useAppStore.payloads`, `SavedPayload`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/payload/SavedPayloadList.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SavedPayloadList } from './SavedPayloadList'
import { useAppStore } from '@/store/useAppStore'

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

describe('SavedPayloadList', () => {
  it('shows an empty state', () => {
    render(<SavedPayloadList />)
    expect(screen.getByText(/no saved payloads/i)).toBeInTheDocument()
  })

  it('loads a payload into the editor and switches controller', async () => {
    useAppStore.setState({
      payloads: [{ id: '1', name: 'cat basic', controller: 'category', body: '{"x":1}', updatedAt: 1 }]
    })

    render(<SavedPayloadList />)
    await userEvent.click(screen.getByRole('button', { name: /cat basic/i }))

    expect(useAppStore.getState().payload).toBe('{"x":1}')
    expect(useAppStore.getState().controller).toBe('category')
  })

  it('persists across a store reload', () => {
    useAppStore.getState().setPayloads([
      { id: '1', name: 'kept', controller: 'product', body: '{}', updatedAt: 1 }
    ])
    expect(localStorage.getItem('jtl.payloads')).toContain('kept')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run src/features/payload/SavedPayloadList.test.tsx`
Expected: FAIL — cannot resolve `./SavedPayloadList`

- [ ] **Step 3: Implement `SavedPayloadList.tsx`**

```tsx
import { Button } from '@jtl-software/platform-ui-react'
import { useAppStore } from '@/store/useAppStore'

export function SavedPayloadList() {
  const { payloads, setPayload, setController, setPayloads } = useAppStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <header
        style={{
          padding: '5px 10px', fontSize: 9, letterSpacing: '.1em',
          textTransform: 'uppercase', opacity: 0.65,
          borderTop: '1px solid rgba(128,128,128,.22)',
          borderBottom: '1px solid rgba(128,128,128,.22)'
        }}
      >
        Saved payloads
      </header>

      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        {payloads.length === 0 && (
          <p style={{ padding: '8px 10px', fontSize: 11, opacity: 0.6 }}>No saved payloads.</p>
        )}

        {payloads.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(128,128,128,.16)' }}>
            <button
              onClick={() => { setController(p.controller); setPayload(p.body) }}
              style={{
                flex: 1, textAlign: 'left', padding: '5px 10px', fontSize: 11,
                background: 'none', border: 0, cursor: 'pointer', color: 'inherit',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}
            >
              {p.name}
            </button>
            <Button
              label="✕"
              size="sm"
              variant="ghost"
              onClick={() => setPayloads(payloads.filter((x) => x.id !== p.id))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add a Save button to `PayloadPane.tsx`**

Add to the header's button group, after `Skeleton`:

```tsx
          <Button
            label="Save"
            size="sm"
            variant="ghost"
            disabled={!payload.trim()}
            onClick={() => {
              const name = window.prompt('Name this payload')
              if (!name?.trim()) return
              const s = useAppStore.getState()
              s.setPayloads([
                ...s.payloads.filter((p) => p.name !== name.trim()),
                {
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  controller: s.controller,
                  body: s.payload,
                  updatedAt: Date.now()
                }
              ])
            }}
          />
```

- [ ] **Step 5: Add the list to the rail in `App.tsx`**

Immediately after `<HistoryList />`:

```tsx
        <SavedPayloadList />
```

with `import { SavedPayloadList } from '@/features/payload/SavedPayloadList'`.

- [ ] **Step 6: Run tests and commit**

Run: `cd frontend && npx vitest run`
Expected: PASS — all suites

```bash
git add frontend/src/features/payload frontend/src/App.tsx
git commit -m "feat(frontend): add saved payloads"
```

---

### Task 10: Remove `generatePayload` and document

**Files:**
- Modify: `src/Controller/Kernel.php`
- Modify: `src/Controller/RouteController.php`
- Modify: `src/Controller/DevOptionsController.php`
- Modify: `README.md`

**Interfaces:**
- Nothing consumes `generatePayload` after Task 1 deleted the Vue components.

- [ ] **Step 1: Confirm nothing still references it**

```bash
grep -rn "generatePayload\|filterOptionalProperties" src/ frontend/src/ public/
```

Expected: only the three PHP definitions about to be deleted. Any frontend hit means Task 1 left something behind — fix that first.

- [ ] **Step 2: Delete the route registration**

In `src/Controller/Kernel.php`, remove:

```php
        $app->post('/generatePayload', [RouteController::class, 'generatePayload']);
```

- [ ] **Step 3: Delete `RouteController::generatePayload`**

Remove the whole method (its docblock through its closing brace) at `src/Controller/RouteController.php:371-393`.

- [ ] **Step 4: Delete the DevOptionsController methods**

Remove `generatePayload` (from line 143) and `filterOptionalProperties` (from line 174), including their docblocks, from `src/Controller/DevOptionsController.php`.

Leave `getSkeleton`, `triggerAck`, `manualAck`, and `pushTest` alone. `getSkeleton` uses `getArrayFillingSerializer()` and must keep working.

- [ ] **Step 5: Verify the backend still passes static analysis**

```bash
composer install
vendor/bin/phpstan analyse src public/index.php
```

Expected: no new errors. If `Faker` or serializer imports are now unused, remove those `use` statements too.

- [ ] **Step 6: Verify the app end to end**

```bash
cd frontend && npm run build && cd ..
php -S 127.0.0.1:8080 -t public public/index.php
```

Open `http://127.0.0.1:8080/` and confirm: authenticate works, a `category` `Pull` returns data, `Get Skeleton` fills the editor, history persists across reload, and the Linkings menu still confirms before firing.

- [ ] **Step 7: Update the README**

In `README.md`, delete the `### Generate Payload` section if present, and replace the frontend build note under "How to install locally" with:

````markdown
2. Run `npm install` inside the frontend directory
3. Run `npm run build` inside the frontend directory (requires Node 20+)
````

Then add after the Features list:

````markdown
### Request history and saved payloads

The tester keeps your last 100 requests — controller, action, payload, response,
status, and timing. Click any entry in the left rail to restore that request.
History is stored in your browser (IndexedDB), so it is per-browser and per-device;
nothing is sent to or stored on the server.

Payloads can be named and saved for reuse. They are stored in localStorage
alongside your saved connections.

Responses larger than 512 KB are stored truncated so the history database stays
bounded. The full response is always shown in the response pane at the time of
the request.
````

- [ ] **Step 8: Commit**

```bash
git add src/ README.md
git commit -m "refactor: remove unused generatePayload endpoint and document new features"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Stack — React 19, TS, Vite 8, Zustand, axios contract | 1, 2, 4 |
| Library setup — CSS import, page reset, `data-color-scheme` | 1 |
| Offline Monaco (`loader.config`) + explicit verification | 1 Steps 7, 11 |
| Layout — rail + two-pane | 5, 6, 8, 9 |
| Control placement table (Skeleton/Save on payload pane; Dev; Linkings) | 6, 7, 9 |
| Removed: Generate Payload | 1 (frontend), 10 (backend) |
| Module boundaries | 2–9 |
| Controller/action bug fixed by construction | 2 |
| Persistence table — connections, payloads, history | 3 |
| Legacy connection migration | 3 Steps 1–4 |
| History retention (100 entries, 512 KB cap) | 3 Steps 5–8 |
| Desktop interaction (userData relocation) | Covered by the desktop plan; no frontend work needed |
| Build integration — `outDir`, `base` | 1 Step 4 |
| 7 delivery phases | Tasks 1–10 (phases 3 and 4 split into Tasks 6 and 7) |
| Testing — ACTIONS, storage, error normalisation, component tests | 2, 3, 5, 6, 7, 8, 9 |

**Type consistency:** `ControllerName`, `Action`, `Connection`, `ApiResult`, `RequestParams` are defined once in Task 2 and imported everywhere after. `HistoryEntry` and `SavedPayload` are defined in Task 3 and reused unchanged in Tasks 4, 6, 8, 9 — the `truncated` field is present in every construction site. `callAction(endpoint, params)` keeps one signature across Tasks 2, 5, 6, 7. `useTriggerAction()` returns `{ trigger, busy }` in Tasks 6, 7, and 9.

**Known gap, deliberate:** the `Dialog` components in Tasks 5 and 7 are hand-rolled overlays rather than the library's `Dialog` primitives, because the primitive composition could not be verified without Storybook access. Both render `role="dialog"` so the tests are correct either way. Swapping in the library primitives is a safe follow-up once someone with Storybook access confirms the composition — it is called out here so it is not mistaken for an oversight.
