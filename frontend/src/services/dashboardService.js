import api from './api'

export const getAdminDashboard = () => api.get('/dashboards/admin')

export const getDoctorDashboard = () => api.get('/dashboards/doctor')

export const getPatientDashboard = () => api.get('/dashboards/patient')

export const getNurseDashboard = () => api.get('/dashboards/nurse')

export const getReceptionistDashboard = () => api.get('/dashboards/receptionist')

export const getPharmacistDashboard = () => api.get('/dashboards/pharmacist')
