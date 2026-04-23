import api from './api'

export const getPatientVisitReport = (params) => api.get('/reports/patient-visits', { params })

export const getDoctorPerformanceReport = (params) => api.get('/reports/doctor-performance', { params })

export const getWardUsageReport = (params) => api.get('/reports/ward-usage', { params })

export const getRevenueReport = (params) => api.get('/reports/revenue', { params })

export const getDashboardReport = () => api.get('/reports/dashboard')
