import { describe, expect, it } from 'vitest'
import { normalizeSymptomGuidance } from './symptomGuidance'

describe('normalizeSymptomGuidance', () => {
  it('turns a legacy chest-pain response into complete emergency guidance without a disease claim', () => {
    const result = normalizeSymptomGuidance({
      overallUrgency: 'Critical',
      aiSummary: 'The most likely condition is a cardiac disease.',
      conditions: [{ name: 'Cardiac Emergency', speciality: 'Cardiologist', advice: ['Chew aspirin 300mg'] }],
    }, ['severe chest pain'])

    expect(result.recommendedSpeciality).toBe('Emergency Medicine')
    expect(result.selfCare).toHaveLength(2)
    expect(result.redFlags).toHaveLength(1)
    expect(result.guidanceSummary).not.toMatch(/cardiac disease|most likely/i)
    expect(JSON.stringify(result.selfCare)).not.toMatch(/aspirin|mg/i)
  })

  it('does not mark isolated chest and stomach pain as automatically critical', () => {
    const result = normalizeSymptomGuidance({
      overallUrgency: 'Critical',
      department: 'Emergency',
      conditions: [{ speciality: 'Cardiologist' }],
    }, ['Chest pain', 'Stomach pain'])

    expect(result.overallUrgency).toBe('High')
    expect(result.recommendedSpeciality).toBe('General Physician / Urgent Care')
    expect(result.guidanceSummary).toMatch(/same-day medical assessment/i)
  })

  it('preserves the current non-diagnostic response contract', () => {
    const result = normalizeSymptomGuidance({
      overallUrgency: 'Low',
      guidanceSummary: 'Personalized guidance only.',
      recommendedSpeciality: 'General Physician',
      selfCare: ['Rest and hydrate.'],
      redFlags: ['Symptoms worsen'],
    })

    expect(result.guidanceSummary).toBe('Personalized guidance only.')
    expect(result.selfCare).toEqual(['Rest and hydrate.'])
  })
})
