import api from './api'

export const getAllWards = (params) => api.get('/wards', { params })

export const getWardById = (id) => api.get(`/wards/${id}`)

export const createWard = (data) => api.post('/wards', data)

export const updateWard = (id, data) => api.put(`/wards/${id}`, data)

export const deleteWard = (id) => api.delete(`/wards/${id}`)

export const allocateBed = (wardId, data) => api.post(`/wards/${wardId}/allocate`, data)

export const releaseBed = (wardId, data) => api.post(`/wards/${wardId}/release`, data)
