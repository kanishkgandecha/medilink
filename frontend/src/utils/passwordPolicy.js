// Mirrors the backend rule for register, reset-password, and update-password:
// at least 8 characters with a lowercase letter, an uppercase letter, and a digit.
export const PASSWORD_POLICY_HINT = 'At least 8 characters, with upper- and lowercase letters and a number'

export const passwordPolicyError = (password = '') => {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain a number'
  return null
}
