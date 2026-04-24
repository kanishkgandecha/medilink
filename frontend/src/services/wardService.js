import api from './api'

export const getAllWards   = (params) => api.get('/wards', { params })
export const getWardById  = (id)      => api.get(`/wards/${id}`)
export const createWard   = (data)    => api.post('/wards', data)
export const updateWard   = (id, data) => api.put(`/wards/${id}`, data)
export const deleteWard   = (id)      => api.delete(`/wards/${id}`)

// Legacy: auto-assigns next available bed
export const allocateBed  = (wardId, data) => api.post(`/wards/${wardId}/allocate`, data)
// Legacy: release by bedNumber string
export const releaseBed   = (wardId, data) => api.post(`/wards/${wardId}/release`, data)

// New: assign a specific bed (by beds._id) to a patient
export const assignBed    = (wardId, data) => api.post(`/wards/${wardId}/assign`, data)
// New: discharge from a specific bed (by beds._id)
export const dischargeBed = (wardId, data) => api.post(`/wards/${wardId}/discharge`, data)
