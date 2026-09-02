import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '../../context/ThemeContext'
import CardPagination, { CARDS_PER_PAGE, paginateData } from './CardPagination'

const renderPagination = (props) =>
  render(
    <ThemeProvider>
      <CardPagination {...props} />
    </ThemeProvider>
  )

describe('paginateData', () => {
  it('slices records by CARDS_PER_PAGE', () => {
    const data = Array.from({ length: 30 }, (_, i) => i)
    expect(paginateData(data, 1)).toHaveLength(CARDS_PER_PAGE)
    expect(paginateData(data, 3)).toHaveLength(30 - 2 * CARDS_PER_PAGE)
  })
})

describe('CardPagination', () => {
  let errorSpy

  beforeEach(() => {
    // React logs missing/duplicate key warnings via console.error — fail the
    // test if any page-number button is rendered without a stable key.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('renders nothing when everything fits on one page', () => {
    const { container } = renderPagination({ total: 5, page: 1, onPage: vi.fn() })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders one button per page number with no React key warnings', () => {
    renderPagination({ total: CARDS_PER_PAGE * 3, page: 1, onPage: vi.fn() })
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    const keyWarning = errorSpy.mock.calls.some((call) =>
      String(call[0] || '').includes('unique "key" prop')
    )
    expect(keyWarning).toBe(false)
  })

  it('disables Previous on the first page and Next on the last page', () => {
    renderPagination({ total: CARDS_PER_PAGE * 2, page: 1, onPage: vi.fn() })
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled() // Previous
    expect(buttons[buttons.length - 1]).not.toBeDisabled() // Next
  })

  it('clamps out-of-range pages back to the last valid page after the result count shrinks', () => {
    const onPage = vi.fn()
    // 3 pages worth of results, but caller passed page=5 (e.g. a filter
    // just reduced the result count out from under the current page).
    renderPagination({ total: CARDS_PER_PAGE * 3, page: 5, onPage })
    expect(onPage).toHaveBeenCalledWith(3)
  })

  it('calls onPage with the clicked page number', () => {
    const onPage = vi.fn()
    renderPagination({ total: CARDS_PER_PAGE * 3, page: 1, onPage })
    fireEvent.click(screen.getByText('2'))
    expect(onPage).toHaveBeenCalledWith(2)
  })
})
