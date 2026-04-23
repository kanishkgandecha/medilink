import api from './api'

export const getAllStaff = (params) => api.get('/staff', { params })

export const getStaffById = (id) => api.get(`/staff/${id}`)

export const createStaff = (data) => api.post('/staff', data)

export const updateStaff = (id, data) => api.put(`/staff/${id}`, data)

export const deleteStaff = (id) => api.delete(`/staff/${id}`)

export const getAvailableStaffUsers = () => api.get('/staff/available-users')

export const getStaffStats = () => api.get('/staff/stats')

export const getStaffByDepartment = (department) => api.get(`/staff/department/${department}`)

export const updateStaffPerformance = (id, data) => api.put(`/staff/${id}/performance`, data)
