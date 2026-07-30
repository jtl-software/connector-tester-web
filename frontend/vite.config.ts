/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
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
