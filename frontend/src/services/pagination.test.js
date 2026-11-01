import { describe, it, expect, vi } from 'vitest'
import { fetchAllPages, MAX_PAGE_SIZE } from './pagination'

const pagedApi = (total, key = 'data') => vi.fn(async ({ page, limit }) => {
  const start = (page - 1) * limit
  const rows = Array.from({ length: Math.max(0, Math.min(limit, total - start)) }, (_, i) => ({ id: start + i }))
  return { success: true, [key]: rows, page, pages: Math.ceil(total / limit), total }
})

describe('fetchAllPages', () => {
  it('follows every page instead of relying on an oversized limit (regression: lists were truncated at 100)', async () => {
    const fetchPage = pagedApi(250)
    const result = await fetchAllPages(fetchPage, { search: 'x' })
    expect(result.data).toHaveLength(250)
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(fetchPage).toHaveBeenCalledWith({ search: 'x', page: 2, limit: MAX_PAGE_SIZE })
    expect(new Set(result.data.map((row) => row.id)).size).toBe(250)
  })

  it('supports responses that use a different list key (billing uses "bills")', async () => {
    const result = await fetchAllPages(pagedApi(120, 'bills'), {}, { key: 'bills' })
    expect(result.bills).toHaveLength(120)
  })

  it('makes a single request for small or unpaginated responses', async () => {
    const fetchPage = vi.fn(async () => ({ success: true, data: [{ id: 1 }] }))
    const result = await fetchAllPages(fetchPage)
    expect(result.data).toHaveLength(1)
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('stops at the page safety cap', async () => {
    const fetchPage = pagedApi(100000)
    await fetchAllPages(fetchPage, {}, { maxPages: 3 })
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })
})
