import { describe, it, expect } from 'vitest'
import { NEXT_STATUS_ACTION, normalizeStatusForDisplay } from './Appointments'

// Regression test for a Phase 7 defect: the appointment quick-action button
// always tried to jump straight to "Completed" regardless of the
// appointment's current status, so it always failed with a 409 for a
// Scheduled or Confirmed appointment (the backend's state machine in
// backend/utils/stateMachines.js only allows Scheduled -> Confirmed ->
// In-Progress -> Completed). This asserts the frontend's next-step map
// matches that one-step-at-a-time state machine.
describe('Appointments NEXT_STATUS_ACTION', () => {
  it('only offers the single valid next status for each active status', () => {
    expect(NEXT_STATUS_ACTION.Scheduled).toEqual({ next: 'Confirmed', label: 'Confirm' })
    expect(NEXT_STATUS_ACTION.Confirmed).toEqual({ next: 'In-Progress', label: 'Start' })
    expect(NEXT_STATUS_ACTION['In-Progress']).toEqual({ next: 'Completed', label: 'Complete' })
  })

  it('offers no advance action for terminal statuses', () => {
    expect(NEXT_STATUS_ACTION.Completed).toBeUndefined()
    expect(NEXT_STATUS_ACTION.Cancelled).toBeUndefined()
    expect(NEXT_STATUS_ACTION['No-Show']).toBeUndefined()
  })
})

// Regression test for a Phase 7 defect: the backend's Prisma enum returns
// "In_Progress"/"No_Show" with underscores, but every frontend consumer
// (status badge color, status filter dropdown, NEXT_STATUS_ACTION lookup)
// is keyed on the hyphenated display form. Unnormalized, an appointment in
// either state rendered its raw enum value, could never be found via the
// status filter, and had no "Complete"/next-step action button at all.
describe('normalizeStatusForDisplay', () => {
  it('converts the two underscored backend enum values to their hyphenated display form', () => {
    expect(normalizeStatusForDisplay('In_Progress')).toBe('In-Progress')
    expect(normalizeStatusForDisplay('No_Show')).toBe('No-Show')
  })

  it('leaves already-clean statuses untouched', () => {
    for (const s of ['Scheduled', 'Confirmed', 'Completed', 'Cancelled']) {
      expect(normalizeStatusForDisplay(s)).toBe(s)
    }
  })
})
