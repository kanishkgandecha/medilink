import { describe, it, expect } from 'vitest'
import { NEXT_STATUS_ACTION, normalizeStatusForDisplay, slotTime, slotEndTime } from './Appointments'

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

// Regression test for a Stage 4 defect found live while testing the new
// Reschedule modal: getDoctorAvailability's slots can come back as plain
// time strings ("09:00") rather than {startTime, endTime} objects (the same
// dual shape BookingWizard already handles). The modal assumed the object
// shape unconditionally, so slot.startTime was undefined for every slot —
// every time button rendered blank, and aria-pressed was true on all seven
// of them simultaneously, since undefined === undefined.
describe('slotTime / slotEndTime', () => {
  it('reads the time from a plain string slot', () => {
    expect(slotTime('09:00')).toBe('09:00')
    expect(slotEndTime('09:00')).toBe('09:30')
  })

  it('reads the time from an {startTime, endTime} object slot', () => {
    expect(slotTime({ startTime: '10:00', endTime: '10:30' })).toBe('10:00')
    expect(slotEndTime({ startTime: '10:00', endTime: '10:30' })).toBe('10:30')
  })

  it('derives a 30-minute end time for an object slot with no endTime', () => {
    expect(slotEndTime({ startTime: '11:30' })).toBe('12:00')
  })
})
