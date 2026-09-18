import { describe, it, expect } from 'vitest'
import { normalizeRxStatusForDisplay } from './Prescriptions'

// Regression test for a Phase 7 defect: the backend's Prisma enum returns
// "Partially_Filled" with an underscore, but STATUS_BADGE and the
// pharmacist dispense-action check are both keyed on the hyphenated
// display form "Partially-Filled". Unnormalized, a partially filled
// prescription rendered its raw enum value and hid the pharmacist's
// "Dispense" action for that exact prescription.
describe('normalizeRxStatusForDisplay', () => {
  it('converts the underscored backend enum value to its hyphenated display form', () => {
    expect(normalizeRxStatusForDisplay('Partially_Filled')).toBe('Partially-Filled')
  })

  it('leaves already-clean statuses untouched', () => {
    for (const s of ['Pending', 'Fulfilled', 'Cancelled']) {
      expect(normalizeRxStatusForDisplay(s)).toBe(s)
    }
  })
})
