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
