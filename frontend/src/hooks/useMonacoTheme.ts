import { useEffect, useState } from 'react'

/**
 * Mirrors the theme resolution @jtl-software/platform-ui-react's <CodeEditor>
 * does internally (see node_modules/@jtl-software/platform-ui-react/dist/components/code-editor/CodeEditor.js):
 * read `document.documentElement.dataset.colorScheme` and map `'dark'` to
 * Monaco's built-in `'vs-dark'` theme, anything else to the string
 * `'light'`.
 *
 * `'light'` is not actually a registered Monaco theme name — Monaco's
 * standaloneThemeService.setTheme() falls back to its built-in light theme
 * (`'vs'`) for any unrecognised theme id (confirmed in
 * node_modules/monaco-editor/esm/vs/editor/standalone/browser/standaloneThemeService.js,
 * setTheme() around line 266), so this reliably resolves to the light theme
 * without needing to register one ourselves. Reusing the exact same string
 * the library uses keeps our editor and the payload pane's <CodeEditor> in
 * theme lockstep, since Monaco's theme registry is global.
 */
function computeTheme(): string {
  return document.documentElement.dataset.colorScheme === 'dark' ? 'vs-dark' : 'light'
}

/** Tracks the app's `data-color-scheme` attribute and returns the matching Monaco theme id. */
export function useMonacoTheme(): string {
  const [theme, setTheme] = useState(computeTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(computeTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-scheme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}
