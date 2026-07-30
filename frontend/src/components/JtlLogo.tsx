import type { SVGProps } from 'react'

/**
 * JTL wordmark, inlined from the brand asset supplied by the design team
 * (`SVG/JTL_Logo_JTL-*.svg`, viewBox `0 0 1012.2 444.17`). The path data is
 * copied verbatim across all three colour variants of the source file — only
 * the fill differs between them — so a single set of paths rendered with
 * `fill="currentColor"` reproduces the mark exactly while inheriting
 * whatever text colour the surrounding theme applies, making it adapt to
 * both light and dark `data-color-scheme` automatically instead of needing
 * two separate image assets swapped at runtime.
 *
 * The library ships its own `JTLLogo` component
 * (`@jtl-software/platform-ui-react`), but it renders a different, more
 * compact mark (viewBox `0 0 80 56`, ~1.43:1) than the wordmark supplied for
 * this task (~2.28:1), and its light-theme colour token
 * (`--base-shaftblue` -> `#212d36`) doesn't match the brand's
 * `#0b1b45` used in the supplied assets — so it isn't "the same mark" and
 * this hand-rolled component is used instead, per the brief.
 */
export function JtlLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1012.2 444.17"
      fill="currentColor"
      role="img"
      aria-label="JTL"
      {...props}
    >
      <path d="M227.88,357.97c-83.42,0-141.69-51.97-141.69-126.13v-43.04h86.07v41.05c0,27.81,22.84,49.99,55.62,49.99s55.62-22.18,55.62-49.99V86.19h86.07v145.66c0,74.16-58.26,126.13-141.69,126.13Z" />
      <path d="M485.39,351.02v-187.37h-92.69v-77.46h271.46v77.46h-92.69v187.37h-86.07Z" />
      <path d="M688.04,351.02V86.19h86.07v187.37h152.28v77.47h-238.35Z" />
    </svg>
  )
}
