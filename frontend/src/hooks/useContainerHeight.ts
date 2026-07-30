import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Measures the pixel height of the returned ref's element and keeps it in
 * sync via ResizeObserver.
 *
 * Why this exists: @jtl-software/platform-ui-react's <CodeEditor> renders
 * its own outer wrapper as a plain block <div className="relative"> with no
 * height of its own — it relies entirely on the `height` prop being applied
 * to the inner Monaco container. Passing height="100%" only resolves against
 * a parent with a *definite* height; a flex-grown div with no explicit
 * height does not count, so the percentage resolves as if it were "auto"
 * and the editor collapses to fit its (mostly absolutely-positioned, so
 * near-zero) content — the ~21-23px sliver QA found. Handing Monaco a real
 * pixel number instead sidesteps that percentage-resolution failure
 * entirely, since an explicit length does not depend on the parent at all.
 */
export function useContainerHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    setHeight(el.clientHeight)

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setHeight(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, height }
}
