import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import api from './api'
import { allocateBed, analyzeSymptoms, chatWithAssistant, symptomToAppointment } from './aiService'

describe('AI service request contracts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('serializes symptom chips to the string required by the API', () => {
    analyzeSymptoms(['Fever', ' chest pain ', ''])

    expect(api.post).toHaveBeenCalledWith('/ai/symptom-analysis', {
      symptoms: 'Fever, chest pain',
    })
  })

  it('normalizes optional symptom workflow demographics', () => {
    symptomToAppointment(['Fever', 'Cough'], '42', 'Female')

    expect(api.post).toHaveBeenCalledWith('/ai/symptom-to-appointment', {
      symptoms: 'Fever, Cough',
      age: 42,
      gender: 'Female',
    })
  })

  it('omits empty optional bed fields and sends a numeric age', () => {
    allocateBed({ condition: 'Post-operative monitoring', urgency: 'Standard', age: '', gender: '' })

    expect(api.post).toHaveBeenCalledWith('/ai/bed-allocation', {
      condition: 'Post-operative monitoring',
      urgency: 'Standard',
    })

    allocateBed({ condition: 'Observation', urgency: 'High', age: '67', gender: 'Male' })
    expect(api.post).toHaveBeenLastCalledWith('/ai/bed-allocation', {
      condition: 'Observation',
      urgency: 'High',
      age: 67,
      gender: 'Male',
    })
  })

  it('keeps chat history within the backend limit', () => {
    const history = Array.from({ length: 14 }, (_, index) => ({
      role: index % 2 ? 'assistant' : 'user',
      content: `Message ${index}`,
    }))

    chatWithAssistant('  What should I do next?  ', history)

    expect(api.post).toHaveBeenCalledWith('/ai/chat', {
      message: 'What should I do next?',
      history: history.slice(-10),
    })
  })
})
