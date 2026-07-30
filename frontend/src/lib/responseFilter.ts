/**
 * Filtering logic for the Response pane.
 *
 * The naive approach (splitting the raw JSON text into lines and keeping only
 * the lines that match) throws away context: filtering by an id shows you
 * `"id": ["sku-42", 42],` with no idea which entity it belonged to.
 *
 * Instead, when the response looks like a list of entities (a bare JSON
 * array, or an object with an array of entities under a conventional key
 * like `result` or `data`), we test each *entity* as a whole and, if it
 * matches, return it formatted in full together with the line numbers (within
 * its own formatted text) that should be highlighted.
 *
 * If the response doesn't look like an entity list (a scalar, `null`, or a
 * plain object with no obvious entity array), we degrade gracefully to the
 * old line-based behaviour rather than showing nothing.
 *
 * No React here on purpose — this module is plain data in, plain data out,
 * so it can be unit-tested directly.
 */

/** Conventional keys under which connector responses nest their entity list. */
const ENTITY_ARRAY_KEYS = ['result', 'data', 'items', 'entities', 'records', 'list']

export interface EntityMatch {
  /** `JSON.stringify(entity, null, 2)` for this entity. */
  text: string
  /** 0-based indices into `text.split('\n')` that matched the filter. */
  matchedLines: number[]
}

export type FilterResult =
  | { kind: 'entities'; totalCount: number; matches: EntityMatch[] }
  | { kind: 'lines'; text: string }

/**
 * Finds the array of entities inside a parsed response body, if there
 * obviously is one. Returns `null` when `data` doesn't look like an entity
 * list at all (scalar, `null`, or a plain object with no array under any of
 * the conventional keys) — the caller should fall back to line filtering.
 */
function findEntityArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data

  if (data !== null && typeof data === 'object') {
    for (const key of ENTITY_ARRAY_KEYS) {
      const value = (data as Record<string, unknown>)[key]
      if (Array.isArray(value)) return value
    }
  }

  return null
}

/** JSON.stringify that never returns `undefined` (which it does for `undefined`/functions/symbols at the top level). */
function safeStringify(value: unknown): string {
  const text = JSON.stringify(value, null, 2)
  return text === undefined ? String(value) : text
}

/**
 * Which 0-based lines of `text` contain `filterLower` (already lower-cased),
 * matched case-insensitively.
 *
 * Because `filterLower` comes from a single-line `<input>`, it can never
 * contain '\n' — so any match against the full text is guaranteed to sit
 * entirely within one line, which means per-line substring matching finds
 * exactly the same occurrences a whole-text search would, while also telling
 * us which lines they're on. Since `JSON.stringify(..., null, 2)` renders
 * every key and every scalar value as its own token on its own line, this
 * naturally covers matches against keys and values at any nesting depth.
 */
function computeMatchedLines(text: string, filterLower: string): number[] {
  const matched: number[] = []
  text.split('\n').forEach((line, index) => {
    if (line.toLowerCase().includes(filterLower)) matched.push(index)
  })
  return matched
}

/**
 * Filters a connector response by `filter`, matching case-insensitively
 * against keys and values at any nesting depth.
 *
 * Callers should only invoke this with a non-empty `filter` — with no filter
 * the caller should just render the response unmodified.
 */
export function filterResponse(data: unknown, filter: string): FilterResult {
  const filterLower = filter.toLowerCase()
  const entities = findEntityArray(data)

  if (entities !== null) {
    const matches: EntityMatch[] = []
    for (const entity of entities) {
      const text = safeStringify(entity)
      const matchedLines = computeMatchedLines(text, filterLower)
      if (matchedLines.length > 0) matches.push({ text, matchedLines })
    }
    return { kind: 'entities', totalCount: entities.length, matches }
  }

  const text = safeStringify(data)
    .split('\n')
    .filter((line) => line.toLowerCase().includes(filterLower))
    .join('\n')
  return { kind: 'lines', text }
}
