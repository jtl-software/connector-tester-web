# Frontend engineer report — UI pane corrections (fix/ui-panes)

Date: 2026-07-30
Scope: `frontend/` only (worktree `/Users/patrick/Public/tester-fe`, branch `fix/ui-panes`)

## Request 1 — Swap Payload/Response panes

- `frontend/src/App.tsx`: swapped render order in the pane row from
  `<PayloadPane /><ResponsePane />` to `<ResponsePane /><PayloadPane />`.
  Response is now leftmost, Payload rightmost.
- `frontend/src/features/response/ResponsePane.tsx`: removed the
  `borderLeft: '1px solid rgba(128,128,128,.3)'` from the section — it no
  longer sits on the right of the pane row, so it no longer needs a left
  divider.
- `frontend/src/features/payload/PayloadPane.tsx`: added
  `borderLeft: '1px solid rgba(128,128,128,.3)'` to its section — it now
  sits on the right, so it owns the divider between the two panes.

Divider count verification: in a live browser (Playwright/CDP), I queried
`getComputedStyle(section).borderLeftWidth` / `borderRightWidth` for every
`main section` element. Result: exactly one non-zero value (`1px`, on the
Payload section's `borderLeftWidth`); every other section/border edge was
`0px`. Confirmed visually in a screenshot at 1400x900 and again at 900x600
— exactly one vertical rule, positioned between Response (left) and
Payload (right), no double line, no missing line.

## Request 2 — Equal-height pane headers

Root cause confirmed as diagnosed: both headers used `padding: '6px 10px'`
but different content (Payload's `Button size="sm"` vs Response's bare
`<span>`s/badge/`<input>`), giving different intrinsic heights.

Fix: extracted `frontend/src/components/PaneHeader.tsx`, a shared header
component used by both `PayloadPane` and `ResponsePane`:

- Fixed `height: PANE_HEADER_HEIGHT` (exported constant, currently `48`),
  `boxSizing: 'border-box'`, `display: 'flex'`, `alignItems: 'center'`,
  `flex: '0 0 auto'` (so it can't be squashed/stretched by flex siblings),
  default `padding: '6px 10px'` and `gap: 6`, with an optional `style` prop
  so each pane can override `gap`/`fontSize` for its own content without
  affecting the shared height.
- `PayloadPane.tsx` and `ResponsePane.tsx` now both render `<PaneHeader>`
  instead of a bare `<header>`, with their existing content unchanged
  inside it.

### How the 48px height was picked (measured, not guessed)

- Static check: `@jtl-software/platform-ui-react`'s `ButtonSize.js` maps
  `size="sm"` to `h-[var(--height-h-9)]`, and the shipped `index.css`
  defines `--height-h-9: 36px`.
  → Button size="sm" is 36px tall.
- Live measurement in the browser (Playwright `getBoundingClientRect()`)
  on the actual rendered "Skeleton" and "Save" buttons in the Payload
  header confirmed **36px** for both.
- 36px button + 6px padding above + 6px padding below = 48px exactly, with
  no clipping (`boxSizing: 'border-box'` on the header, height 48).
- Chose **48px** as `PANE_HEADER_HEIGHT`.

### Measured header heights (both panes, live browser)

- Response header (`main header`, index 0): **48px**
- Payload header (`main header`, index 1): **48px**

Equal, as required. Verified at both 1400x900 and 900x600 viewports —
heights stayed at 48/48 in both.

### Measured Monaco editor heights (live browser)

At 1400x900 viewport:
- Response editor (`.monaco-editor`): **777px**
- Payload editor (`.monaco-editor`): **756px**

At 900x600 viewport (after resize):
- Response editor: **477px**
- Payload editor: **456px**

Both are full-pane-height (no ~21px collapse regression). The 21px
difference between the two editors in both cases is expected and
pre-existing: `PayloadPane` has a footer row ("JSON valid"/"Invalid
JSON"/"Empty") below its editor that `ResponsePane` does not have, so
Payload's editor wrapper gets ~21px less vertical space. This is unrelated
to the header-height fix (headers are identical at 48/48 in both cases).

## Verification commands run

- `npx tsc --noEmit` → passes, no errors.
- `cd frontend && npm test` → 47/47 tests passed (10 test files), no test
  asserted on pane left/right ordering so nothing needed updating.
- `npm run build` → succeeds (only the pre-existing "chunk larger than
  500kB" advisory from Monaco/vite, unrelated to this change).
- Dev server (`npm run dev`) + Playwright: navigated to
  `http://localhost:5173/frontend/`, screenshotted at 1400x900 and
  900x600, confirmed Response-left/Payload-right, single divider, equal
  header heights, full-height editors, and that the layout holds across
  resize.

## Files changed

- `frontend/src/App.tsx`
- `frontend/src/features/payload/PayloadPane.tsx`
- `frontend/src/features/response/ResponsePane.tsx`
- `frontend/src/components/PaneHeader.tsx` (new)
