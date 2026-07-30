import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { callAction } from './client'

vi.mock('axios')

const params = {
  connectorUrl: 'http://localhost/connector.php',
  connectorToken: 'tok',
  controller: 'category',
  action: 'Pull',
  payload: '',
  limit: 100
}

beforeEach(() => vi.resetAllMocks())

describe('callAction', () => {
  it('reads the duration from the X-Request-Time header', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: { result: [] },
      headers: { 'x-request-time': '142.87' }
    } as never)

    const result = await callAction('Pull', params)

    expect(result.ok).toBe(true)
    expect(result.httpStatus).toBe(200)
    expect(result.durationMs).toBeCloseTo(142.87, 2)
  })

  it('defaults duration to 0 when the header is absent', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      status: 200, data: {}, headers: {}
    } as never)

    const result = await callAction('Pull', params)
    expect(result.durationMs).toBe(0)
  })

  it('normalises a network failure into a result rather than throwing', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('Network Error'))

    const result = await callAction('Pull', params)

    expect(result.ok).toBe(false)
    expect(result.errorMessage).toContain('Network Error')
    expect(result.httpStatus).toBe(0)
  })

  it('normalises an HTTP error response', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { status: 500, data: { error: 'boom' }, headers: {} },
      message: 'Request failed'
    })

    const result = await callAction('Push', params)

    expect(result.ok).toBe(false)
    expect(result.httpStatus).toBe(500)
    expect(result.data).toEqual({ error: 'boom' })
  })
})
