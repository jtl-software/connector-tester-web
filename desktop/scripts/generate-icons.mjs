#!/usr/bin/env node
// Generates desktop/build/icon.icns and desktop/build/icon.ico from the JTL
// brand mark: a full-bleed #0b1b45 square, macOS-style rounded corners
// (~22% corner radius), with the white JTL wordmark centred at ~62% of the
// square's width.
//
// This script is NOT a build dependency — electron-builder only ever reads
// the two generated files (build/icon.icns / build/icon.ico) from disk, and
// neither `sharp` nor `png-to-ico` is a dependency of desktop/package.json.
// It exists purely so the icons are reproducible if the artwork changes.
//
// Usage:
//   ICON_TOOLS_DIR=/path/to/a/scratch/dir/with/node_modules/{sharp,png-to-ico} \
//     node desktop/scripts/generate-icons.mjs
//
// ICON_TOOLS_DIR must contain a node_modules/ with `sharp` (renders SVG +
// composites) and `png-to-ico` (packs PNGs into a .ico) installed — e.g.:
//   mkdir -p /tmp/icon-tools && cd /tmp/icon-tools \
//     && npm init -y && npm install sharp png-to-ico
// Requires macOS `iconutil` on PATH to produce the .icns (the .ico step has
// no OS dependency beyond Node + png-to-ico).

import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.resolve(here, '..', 'build')

const toolsDir = process.env.ICON_TOOLS_DIR
if (!toolsDir) {
  console.error(
    'ICON_TOOLS_DIR is not set. Point it at a directory with sharp + png-to-ico\n' +
    'installed in node_modules (see the usage comment at the top of this script).'
  )
  process.exit(1)
}

const require = createRequire(import.meta.url)
let sharp, pngToIco
try {
  sharp = require(require.resolve('sharp', { paths: [toolsDir] }))
  const pngToIcoModule = require(require.resolve('png-to-ico', { paths: [toolsDir] }))
  pngToIco = pngToIcoModule.default ?? pngToIcoModule
} catch (err) {
  console.error(`Could not resolve sharp / png-to-ico from ${toolsDir}:`, err.message)
  process.exit(1)
}

// Brand mark path data, copied verbatim from the supplied
// SVG/JTL_Logo_JTL-White.svg (viewBox 0 0 1012.2 444.17) — same paths used
// by frontend/src/components/JtlLogo.tsx, just rendered here with an
// explicit white fill instead of currentColor.
const LOGO_VIEWBOX_W = 1012.2
const LOGO_VIEWBOX_H = 444.17
const LOGO_PATHS = [
  'M227.88,357.97c-83.42,0-141.69-51.97-141.69-126.13v-43.04h86.07v41.05c0,27.81,22.84,49.99,55.62,49.99s55.62-22.18,55.62-49.99V86.19h86.07v145.66c0,74.16-58.26,126.13-141.69,126.13Z',
  'M485.39,351.02v-187.37h-92.69v-77.46h271.46v77.46h-92.69v187.37h-86.07Z',
  'M688.04,351.02V86.19h86.07v187.37h152.28v77.47h-238.35Z'
]

const BRAND_BLUE = '#0b1b45'
const LOGO_WIDTH_FRACTION = 0.62 // logo width as a fraction of the square's side
const CORNER_RADIUS_FRACTION = 0.22 // rounded-corner radius as a fraction of the side

function logoSvg(size) {
  const logoW = size * LOGO_WIDTH_FRACTION
  const logoH = logoW * (LOGO_VIEWBOX_H / LOGO_VIEWBOX_W)
  const x = (size - logoW) / 2
  const y = (size - logoH) / 2
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${BRAND_BLUE}"/>
      <g transform="translate(${x}, ${y}) scale(${logoW / LOGO_VIEWBOX_W})">
        ${LOGO_PATHS.map((d) => `<path d="${d}" fill="#ffffff"/>`).join('\n        ')}
      </g>
    </svg>
  `
}

function roundedMaskSvg(size) {
  const r = size * CORNER_RADIUS_FRACTION
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/>
  </svg>`
}

/** Renders one flat PNG buffer at `size`x`size`, optionally rounding corners. */
async function renderPng(size, { rounded }) {
  const base = sharp(Buffer.from(logoSvg(size))).png()
  if (!rounded) return base.toBuffer()

  const mask = await sharp(Buffer.from(roundedMaskSvg(size))).png().toBuffer()
  return sharp(await base.toBuffer())
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function main() {
  mkdirSync(buildDir, { recursive: true })

  // --- .icns (rounded corners, macOS iconset convention) ---
  const iconset = mkdtempSync(path.join(tmpdir(), 'jtl-iconset-')) + '.iconset'
  mkdirSync(iconset)
  const icnsEntries = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_64x64.png', 64],
    ['icon_64x64@2x.png', 128],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024]
  ]
  for (const [name, size] of icnsEntries) {
    const buf = await renderPng(size, { rounded: true })
    writeFileSync(path.join(iconset, name), buf)
  }
  const icnsOut = path.join(buildDir, 'icon.icns')
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', icnsOut])
  rmSync(iconset, { recursive: true, force: true })
  console.log(`wrote ${icnsOut}`)

  // --- .ico (same rounded artwork) ---
  const icoSizes = [16, 32, 48, 64, 128, 256]
  const icoBuffers = []
  for (const size of icoSizes) {
    icoBuffers.push(await renderPng(size, { rounded: true }))
  }
  const icoBuffer = await pngToIco(icoBuffers)
  const icoOut = path.join(buildDir, 'icon.ico')
  writeFileSync(icoOut, icoBuffer)
  console.log(`wrote ${icoOut}`)

  // --- web favicon (same rounded artwork, .ico container) ---
  const faviconSizes = [16, 32, 48, 64]
  const faviconBuffers = []
  for (const size of faviconSizes) {
    faviconBuffers.push(await renderPng(size, { rounded: true }))
  }
  const faviconIco = await pngToIco(faviconBuffers)
  const faviconOut = path.resolve(here, '..', '..', 'frontend', 'public', 'favicon.ico')
  writeFileSync(faviconOut, faviconIco)
  console.log(`wrote ${faviconOut}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
