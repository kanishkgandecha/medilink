import { describe, it, expect } from 'vitest'
import { SOURCE_TYPES, SOURCE_LABELS, classifySource, resolveSourceDisplay } from './aiSourceTaxonomy'

describe('classifySource', () => {
  it('classifies a genuine LLM result', () => {
    expect(classifySource({ _source: 'llm' })).toBe(SOURCE_TYPES.LLM)
  })

  it('classifies a degraded rules fallback distinctly from a normal rules result', () => {
    expect(classifySource({ _source: 'rules', _degraded: true })).toBe(SOURCE_TYPES.DEGRADED_FALLBACK)
    expect(classifySource({ _source: 'rules', _degraded: false })).toBe(SOURCE_TYPES.RULES)
    expect(classifySource({ _source: 'rules' })).toBe(SOURCE_TYPES.RULES)
  })

  it('classifies records and live-records passthrough', () => {
    expect(classifySource({ _source: 'records' })).toBe(SOURCE_TYPES.RECORDS)
    expect(classifySource({ _source: 'live-records' })).toBe(SOURCE_TYPES.LIVE_RECORDS)
  })

  it('classifies a client-side network-failure fallback as degraded', () => {
    expect(classifySource({ _source: 'local-rules' })).toBe(SOURCE_TYPES.DEGRADED_FALLBACK)
  })

  it('prefers an explicit backend-computed sourceType over the legacy fields', () => {
    expect(classifySource({ sourceType: SOURCE_TYPES.LIVE_RECORDS, _source: 'llm' })).toBe(SOURCE_TYPES.LIVE_RECORDS)
  })

  it('never guesses LLM: unknown/undefined input defaults to rules', () => {
    expect(classifySource(undefined)).toBe(SOURCE_TYPES.RULES)
    expect(classifySource({})).toBe(SOURCE_TYPES.RULES)
    expect(classifySource({ _source: 'something-unrecognized' })).toBe(SOURCE_TYPES.RULES)
  })

  it('every source type has a display label', () => {
    Object.values(SOURCE_TYPES).forEach((type) => {
      expect(SOURCE_LABELS[type]).toBeTruthy()
    })
  })
})

describe('resolveSourceDisplay', () => {
  it('shows provider/model only when the source is genuinely LLM', () => {
    const display = resolveSourceDisplay({ sourceType: SOURCE_TYPES.LLM, providerUsed: 'OpenRouter', modelUsed: 'openai/gpt-4o-mini' })
    expect(display.providerUsed).toBe('OpenRouter')
    expect(display.modelUsed).toBe('openai/gpt-4o-mini')
  })

  it('withholds provider/model for rules results even if fields are present on the object', () => {
    const display = resolveSourceDisplay({ sourceType: SOURCE_TYPES.RULES, providerUsed: 'OpenRouter', modelUsed: 'openai/gpt-4o-mini' })
    expect(display.providerUsed).toBeNull()
    expect(display.modelUsed).toBeNull()
  })

  it('withholds provider/model after a degraded fallback', () => {
    const display = resolveSourceDisplay({ sourceType: SOURCE_TYPES.DEGRADED_FALLBACK, providerUsed: 'OpenRouter', modelUsed: 'openai/gpt-4o-mini' })
    expect(display.providerUsed).toBeNull()
    expect(display.modelUsed).toBeNull()
    expect(display.fallbackUsed).toBe(true)
  })

  it('withholds provider/model for live-records and records results', () => {
    expect(resolveSourceDisplay({ sourceType: SOURCE_TYPES.LIVE_RECORDS, providerUsed: 'OpenRouter' }).providerUsed).toBeNull()
    expect(resolveSourceDisplay({ sourceType: SOURCE_TYPES.RECORDS, providerUsed: 'OpenRouter' }).providerUsed).toBeNull()
  })

  it('passes through limitations and requiresHumanReview', () => {
    const display = resolveSourceDisplay({ sourceType: SOURCE_TYPES.RULES, limitations: ['a', 'b'], requiresHumanReview: false })
    expect(display.limitations).toEqual(['a', 'b'])
    expect(display.requiresHumanReview).toBe(false)
  })

  it('defaults requiresHumanReview to true when unspecified', () => {
    expect(resolveSourceDisplay({ sourceType: SOURCE_TYPES.RULES }).requiresHumanReview).toBe(true)
  })
})
