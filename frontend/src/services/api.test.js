import { describe, it, expect, beforeEach } from 'vitest'
import api from './api'

// The response interceptor normalizes error.message so every catch-block
// toast across the app shows something actionable instead of Axios's
// generic "Request failed with status code NNN". Reach into the registered
// interceptor directly since it isn't exported on its own.
const rejectedHandler = () => api.interceptors.response.handlers[0].rejected

const makeError = (status, data, headers = {}) => ({
  response: { status, data, headers },
  message: `Request failed with status code ${status}`,
})

describe('api response interceptor — error message normalization', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('surfaces the first express-validator field error for a 400 response', async () => {
    const error = makeError(400, {
      errors: [{ msg: 'Valid email is required', path: 'email' }],
    })
    await expect(rejectedHandler()(error)).rejects.toBe(error)
    expect(error.message).toBe('Valid email is required')
  })

  it('joins multiple field errors for a 400 response', async () => {
    const error = makeError(400, {
      errors: [{ msg: 'Valid email is required' }, { msg: 'Phone is required' }],
    })
    await expect(rejectedHandler()(error)).rejects.toBe(error)
    expect(error.message).toBe('Valid email is required; Phone is required')
  })

  it('surfaces a plain business-logic message for a 400 response', async () => {
    const error = makeError(400, { success: false, message: 'No beds available' })
    await expect(rejectedHandler()(error)).rejects.toBe(error)
    expect(error.message).toBe('No beds available')
  })

  it('falls back to the generic Axios message when a 400 response has no message or errors', async () => {
    const error = makeError(400, {})
    await expect(rejectedHandler()(error)).rejects.toBe(error)
    expect(error.message).toBe('Request failed with status code 400')
  })

  it('still gives a friendly message for 403', async () => {
    const error = makeError(403, { message: 'ignored' })
    await expect(rejectedHandler()(error)).rejects.toBe(error)
    expect(error.message).toBe('You do not have permission to perform this action.')
  })

  it('still gives a friendly message for 500', async () => {
    const error = makeError(500, {})
    await expect(rejectedHandler()(error)).rejects.toBe(error)
    expect(error.message).toMatch(/temporarily unavailable/)
  })

  it('surfaces the backend message for a 409 conflict (e.g. duplicate email)', async () => {
    const error = makeError(409, { success: false, message: 'Email already registered' })
    await expect(rejectedHandler()(error)).rejects.toBe(error)
    expect(error.message).toBe('Email already registered')
  })

  it('surfaces the backend message for a 404', async () => {
    const error = makeError(404, { message: 'Patient not found' })
    await expect(rejectedHandler()(error)).rejects.toBe(error)
    expect(error.message).toBe('Patient not found')
  })

  it('surfaces the backend message for a 422', async () => {
    const error = makeError(422, { message: 'Quantity exceeds available stock' })
    await expect(rejectedHandler()(error)).rejects.toBe(error)
    expect(error.message).toBe('Quantity exceeds available stock')
  })
})
