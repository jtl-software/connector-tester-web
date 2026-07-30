# Frontend Rewrite — React 19 + JTL Platform UI — Design

**Date:** 2026-07-30
**Status:** Approved
**Branch:** `feature/frontend-react` (stays unmerged until sign-off)
**Scope:** Replace the Vue 3 / Bootstrap frontend with React 19 on JTL's official
component library, and rework the UX around request history, saved payloads,
persistent connection state, and better response reading.

## Problem

The current UI is a Vue 3 + Bootstrap SPA (19 components, ~1,000 LOC) that works but
makes the core testing loop harder than it needs to be:

- **No history.** Every response overwrites the last. Comparing two runs is impossible.
- **Payloads are disposable.** `getSkeleton` produces a shell, but it goes into a plain
  textarea with no validation and is lost on controller switch.
- **Nothing is reusable.** Payloads can't be named or kept. Only connections persist.
- **One undifferentiated blob.** `vue-json-pretty` renders the whole response; errors,
  timings, and data all look alike.
- **Scattered actions.** Trigger, two dropdowns, Limit, and the controller/action
  pickers are spread across three regions of the page.

It also does not use JTL's design system, so it looks nothing like the rest of the
platform.

## Goals

Replace the frontend with React 19 on `@jtl-software/platform-ui-react`, and address all
four pain points above. Ship to both the web tester and the desktop app from one codebase.

## Non-Goals

Changing the PHP API contract (beyond deleting one dead endpoint). Response diffing.
Keyboard shortcut system. Multi-tab / multi-request concurrency. Any auth change.

## Stack

| Concern | Choice | Note |
|---|---|---|
| Framework | React 19 | Library peer-requires `^19.0.0`. |
| Language | TypeScript | The library's repo is private and Storybook is internal-only; its **1,331 shipped `.d.ts` files** are effectively the documentation. TS turns them into autocomplete instead of guesswork. |
| Build | Vite 8 | Up from Vite 4. React 19 and Tailwind 4 require modern Vite. |
| UI | `@jtl-software/platform-ui-react` 1.56.1 | Public on npm. Clean install against React 19: 309 packages, no peer warnings, 0 vulnerabilities. |
| State | Zustand | Four small slices; ~1 KB. Swappable for Context + `useReducer` if the dependency is unwanted. |
| HTTP | axios (kept) | Retains `Content-Type: application/x-www-form-urlencoded` — PHP's `addBodyParsingMiddleware` expects form-encoded. |
| Test | Vitest 4 + React Testing Library | |

`react-hook-form`, `zod`, and `monaco-editor` all arrive transitively with the library —
no extra direct dependencies for forms or the editor.

### Library setup

Import `@jtl-software/platform-ui-react/index.css` once at the entry point (166 KB,
precompiled — no Tailwind config needed in this app). The library ships only a targeted
form-control reset, so the app supplies its own page-level reset. Dark mode is
`data-color-scheme="dark"` on `<html>`; the library's `ThemeSwitcher` drives it.

### Offline Monaco — required, not optional

The library's `CodeEditor` imports `Editor` from `@monaco-editor/react` **without calling
`loader.config()`**. That package's default behaviour is to fetch Monaco from the jsDelivr
CDN at runtime. In the desktop app — which must work fully offline — the payload editor
would render as an empty box.

The app entry must call `loader.config({ monaco })` against the locally installed
`monaco-editor` so Vite bundles it. This gets an explicit item in the desktop smoke
checklist, because it fails only when offline and only in the packaged build.

## Layout

Left rail plus a two-pane main area. (Wireframe preserved at
`.superpowers/brainstorm/89498-1785419767/content/layout-v2.html`.)

```
┌────────────┬──────────────────────────────────────────────────────┐
│ shop-dev ▾ │ [Category ▾][Pull ▾][Limit 100]  [Dev ▾][⚠ Linkings ▾][▶ Trigger] │
│ ● Connected│──────────────────────────┬───────────────────────────│
│ localhost/…│ PAYLOAD  [Skeleton][Save]│ 200 OK · 142 ms · 27 items│
│────────────│                          │                           │
│ HISTORY    │      Monaco editor       │      JSON viewer          │
│ 200 category · Pull                   │                           │
│ 200 product · Push                    │                           │
│ 500 image · Push                      │                           │
│────────────│                          │                           │
│ SAVED      │                          │                           │
│ category + variations                 │                           │
│────────────│                          │                           │
│ ◐ Theme    │                          │                           │
└────────────┴──────────────────────────┴───────────────────────────┘
```

### Control placement

Every control from the current UI is retained. Two moved deliberately:

| Control | Placement | Rationale |
|---|---|---|
| Get Skeleton | Payload pane header | It does one thing: write JSON into that editor. It belongs next to the editor, not in a debug dropdown. |
| Save as… | Payload pane header | New; same reasoning. |
| Trigger Ack, Manual Ack, Push Test | `Dev ▾` menu | Genuinely dev-only request actions. |
| Clear all, Clear from JSON, Clear Method, Clear Variation Linkings, Clear Variation Value Linkings | `⚠ Linkings ▾`, destructively styled, separate from Trigger | Five of six destroy data; "Clear all" wipes every linking table. A neutral dropdown adjacent to the primary action makes a misclick too cheap. Each keeps its existing confirmation dialog. |
| Connection management (today's Credentials modal) | Rail header ⚙ | Connections are switched often; the endpoint URL is now permanently visible. |
| Limit | Toolbar | Unchanged. |

### Removed: Generate Payload

Dropped as unused bloat. Removes ~310 LOC: the three `payload_generator/` components,
`RouteController::generatePayload` and its route registration, and
`DevOptionsController::generatePayload` + `filterOptionalProperties`.

`fakerphp/faker` **stays** — it arrives transitively via `jtl/connector`, not from this
project's own `composer.json`. `getSkeleton` retains the serializer machinery
(`getArrayFillingSerializer`, `DynamicArrayFillerSubscriber`), which it uses independently.

## Module boundaries

```
src/
  api/          one typed function per endpoint; shared error normalisation
  storage/      IndexedDB (history) + localStorage (connections, payloads),
                behind one interface; includes legacy migration
  store/        connection · request · history · payloads slices
  features/
    connection/ rail header, switcher, manage-connections dialog
    request/    toolbar, controller + action, Dev menu, Linkings menu
    payload/    Monaco editor, Skeleton, Save as…
    response/   status bar, JSON viewer, search
    history/    rail list, restore
  types/        Controller, Action, HistoryEntry, SavedPayload
```

## The controller/action bug, fixed by construction

The current `FormControlsComponent.vue` offers **18** controllers in its `<select>` but
its `actions` map has only **16** keys. `productVariation` and `productVariationValue`
are missing, so selecting either calls `buildDefaultAction()` → `this.possibleActions[0]`
on `undefined` → TypeError.

**Resolution:** those two are not controllers. They are new linking tables that do not
exist in the connector-core SDK, and they were only ever meant as Clear Linkings targets.

```ts
type ControllerName =
  | 'category' | 'connector' | 'core' | 'crossSelling' | 'customer'
  | 'customerOrder' | 'deliveryNote' | 'globalData' | 'image'
  | 'manufacturer' | 'payment' | 'product' | 'productPrice'
  | 'productStockLevel' | 'specific' | 'statusChange';   // 16

const ACTIONS: Record<ControllerName, readonly Action[]> = { … };

type LinkingTarget =
  | ControllerName | 'productVariation' | 'productVariationValue';
```

The controller dropdown renders `ControllerName` only. `Record<ControllerName, …>` makes
any future mismatch a compile error rather than a runtime crash.

**Note:** this crash exists in production today, introduced by the currently-uncommitted
`ControlsComponent.vue` change. It is worth a two-line fix on `master` independently of
this rewrite.

## Persistence

Client-side only. The backend stays stateless, which matters because the public web
tester is multi-user and its PHP sessions are ephemeral.

| Data | Store | Notes |
|---|---|---|
| Connections | `localStorage["jtl.connections"]` | Namespaced. |
| Saved payloads | `localStorage["jtl.payloads"]` | `{id, name, controller, body, updatedAt}`. |
| History | IndexedDB `jtl-tester` / `history` | Responses get large; localStorage's ~5 MB cap would break. |

### Legacy connection migration — required

Connections are currently stored as **unnamespaced flat localStorage keys**:
`localStorage["shop-dev"] = '{"url":"…","token":"…"}'`. The existing code treats *every*
localStorage key as a connection.

On first boot, if `jtl.connections` is absent: scan all localStorage keys, import each
value that parses as JSON matching `{url: string, token: string}`, and **leave the
originals in place** so that rolling back to the Vue build does not lose them. Without
this step every user silently loses their saved connectors.

### History retention

`HistoryEntry` records `{id, at, connectionName, controller, action, payload?, limit,
status, httpStatus?, durationMs, response, responseBytes}`. `durationMs` comes from the
existing `X-Request-Time` header.

Keep the **last 100** entries. Response bodies over **512 KB** are stored truncated with
a flag, so the database cannot grow without bound.

### Desktop interaction

In the Electron app, `app.setPath('userData', dataDir)` (see the desktop spec) relocates
IndexedDB **and** localStorage together into the portable `data/` folder. History, saved
payloads, and connections travel with the app on a USB stick with no extra work.

## Build integration

Vite `outDir` stays `../public/frontend` so `RouteController::index` continues to serve
`public/frontend/index.html` untouched. `base` is corrected from the odd `/../frontend`
(which browsers normalise to `/frontend/`) to a plain `/frontend/`.

## Delivery — 7 phases, app working after each

1. **Scaffold** — Vite 8 / React 19 / TS, library CSS, reset, theme, offline Monaco, static shell
2. **Connections** — manage dialog, switching, authenticate/disconnect, legacy migration
3. **Request core** — controller/action/limit, payload editor, Trigger, response viewer
4. **Menus** — Dev menu and Linkings menu, confirmations preserved
5. **History** — IndexedDB, restore-on-click, retention cap
6. **Saved payloads**
7. **Cleanup** — delete Vue sources, remove `generatePayload` from PHP, update README

## Testing

Vitest covers:

- `ACTIONS` exhaustiveness against `ControllerName`
- Storage adapters, **especially legacy connection migration** — the one place silent
  data loss could hide
- API error normalisation

Component tests: Trigger disabled while disconnected; clicking a history entry restores
controller, action, limit, and payload; destructive Linkings actions require confirmation.

Not chasing coverage numbers.

## Risks

| Risk | Mitigation |
|---|---|
| Library is undocumented externally (private repo, internal Storybook) | Work from the 1,331 shipped `.d.ts` files, which carry JSDoc usage examples. TypeScript surfaces mismatches at compile time. |
| Monaco silently CDN-loads and breaks offline | `loader.config({ monaco })` at entry; explicit offline check in the desktop smoke checklist. |
| Users lose saved connections | Legacy migration with originals preserved; covered by unit tests. |
| Vite 4 → 8 jump | Frontend has no exotic build config: one plugin, one alias, one `outDir`. |
| Removing `generatePayload` touches shared PHP | Stays on this branch until merge; nothing reaches production early. |

## Cross-spec dependency

This spec and `2026-07-30-desktop-app-electron-design.md` are independent branches, but
they interact in exactly two places, both already accounted for:

1. `app.setPath('userData')` must run before `app.whenReady()` for IndexedDB and
   localStorage to land in the portable `data/` folder.
2. The offline Monaco configuration must be verified in the packaged desktop build.
