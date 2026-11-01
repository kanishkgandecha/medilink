import { describe, it, expect } from 'vitest'
import { passwordPolicyError } from './passwordPolicy'

describe('passwordPolicyError (mirrors the backend rule)', () => {
  it('accepts a password with 8+ characters, mixed case, and a digit', () => {
    expect(passwordPolicyError('Synthetic9x')).toBeNull()
  })
  it.each([
    ['Short1a', /at least 8/],
    ['alllowercase1', /uppercase/],
    ['ALLUPPERCASE1', /lowercase/],
    ['NoDigitsHere', /number/],
  ])('rejects %s', (value, message) => {
    expect(passwordPolicyError(value)).toMatch(message)
  })
})
