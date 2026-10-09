import { describe, it, expect } from 'vitest'
import { normalizeBillingStatusForDisplay } from './Billing'

// Regression test for a defect found during the post-pull Stage 1 regression pass:
// the backend's Prisma enum returns "Partially_Paid" with an underscore, but
// STATUS_COLOR and every paymentStatus equality check in Billing.jsx are keyed on
// the hyphenated display form "Partially-Paid". Unnormalized, a partially paid
// bill rendered its raw enum value with no badge color and the invoice modal's
// highlight styling silently fell through to the "Unpaid" (red) branch.
describe('normalizeBillingStatusForDisplay', () => {
  it('converts the underscored backend enum value to its hyphenated display form', () => {
    expect(normalizeBillingStatusForDisplay('Partially_Paid')).toBe('Partially-Paid')
  })

  it('leaves already-clean statuses untouched', () => {
    for (const s of ['Unpaid', 'Paid', 'Refunded']) {
      expect(normalizeBillingStatusForDisplay(s)).toBe(s)
    }
  })
})
