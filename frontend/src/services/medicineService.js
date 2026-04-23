import api from './api'

export const getAllMedicines = (params) => api.get('/medicines', { params })

export const getMedicineById = (id) => api.get(`/medicines/${id}`)

export const createMedicine = (data) => api.post('/medicines', data)

export const updateMedicine = (id, data) => api.put(`/medicines/${id}`, data)

export const deleteMedicine = (id) => api.delete(`/medicines/${id}`)

export const updateStock = (id, data) => api.put(`/medicines/${id}/stock`, data)

export const getMedicineStats = () => api.get('/medicines/stats')

export const getMedicineCategories = () => api.get('/medicines/categories')

export const getLowStockAlerts = () => api.get('/medicines/alerts/low-stock')

export const getExpiringMedicines = () => api.get('/medicines/alerts/expiring')

export const getExpiredMedicines = () => api.get('/medicines/alerts/expired')
