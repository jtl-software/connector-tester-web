/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'))

export default defineConfig({
  base: '/frontend/',
  build: {
    outDir: '../public/frontend',
    emptyOutDir: true
  },
  // Exposes the package version to the app at build time so the UI can
  // display which build is actually running (see BrandHeader.tsx). A
  // hardcoded version string would drift on the next release, silently
  // reintroducing the "which build am I on" problem this solves.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  test: {
    // NOTE: on Node 24+, Node's built-in Web Storage shadows jsdom's
    // localStorage/sessionStorage and lacks `.clear()`, which many tests
    // rely on. This project's `npm test` / `npm run test:watch` scripts set
    // NODE_OPTIONS=--no-experimental-webstorage via cross-env to disable
    // Node's built-in implementation before it can shadow jsdom's. Running
    // `npx vitest run` directly (bypassing the npm script) skips that flag
    // and fails with "localStorage.clear is not a function". Always go
    // through the npm scripts, or set that env var yourself.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Without this, Vitest treats @jtl-software/platform-ui-react as an
    // external CJS/ESM dependency and imports it with Node's native loader,
    // which chokes on the CSS side-effect imports the library's components
    // ship with ("Unknown file extension .css"). Inlining routes it through
    // Vite's own transform pipeline (same as `vite dev`/`vite build`), which
    // understands CSS imports.
    server: {
      deps: {
        inline: [/@jtl-software\/platform-ui-react/]
      }
    }
  }
})
