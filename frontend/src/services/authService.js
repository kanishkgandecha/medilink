import api from './api'

export const login = async (credentials) => {
  return await api.post('/auth/login', credentials)
}

export const register = async (userData) => {
  return await api.post('/auth/register', userData)
}

export const logout = async () => {
  return await api.post('/auth/logout')
}

export const verifyToken = async () => {
  return await api.get('/auth/verify')
}

export const forgotPassword = async (email) => {
  return await api.post('/auth/forgot-password', { email })
}

export const resetPassword = async (token, password) => {
  return await api.post(`/auth/reset-password/${token}`, { password })
}

export const changePassword = async (currentPassword, newPassword) => {
  return await api.put('/auth/update-password', { currentPassword, newPassword })
}