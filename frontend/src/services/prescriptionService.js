import api from './api'

export const getAllPrescriptions = (params) => api.get('/prescriptions', { params })

export const getPrescriptionById = (id) => api.get(`/prescriptions/${id}`)

export const createPrescription = (data) => api.post('/prescriptions', data)

export const updatePrescriptionStatus = (id, data) => api.put(`/prescriptions/${id}/status`, data)

export const refillPrescription = (id, data) => api.post(`/prescriptions/${id}/refill`, data)
