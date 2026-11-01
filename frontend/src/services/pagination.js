// The API caps list page size at 100 and reports `page`/`pages`. Pages that
// need a complete list (pickers, client-side filtered grids) must follow the
// pages instead of asking for an oversized `limit`, which the server clamps.
export const MAX_PAGE_SIZE = 100

export const fetchAllPages = async (fetchPage, params = {}, { key = 'data', maxPages = 50 } = {}) => {
  const first = await fetchPage({ ...params, page: 1, limit: MAX_PAGE_SIZE })
  const items = [...(first?.[key] || [])]
  const pages = Math.min(Number(first?.pages) || 1, maxPages)
  for (let page = 2; page <= pages; page += 1) {
    const next = await fetchPage({ ...params, page, limit: MAX_PAGE_SIZE })
    items.push(...(next?.[key] || []))
  }
  return { ...first, [key]: items, count: items.length, page: 1, pages: 1 }
}
