import api from './api'

// Get all doctors with optional filters
export const getAllDoctors = async (params) => {
  try {
    return await api.get('/doctors', { params })
  } catch (error) {
    console.error('Error fetching doctors:', error)
    throw error
  }
}

// Get single doctor by ID
export const getDoctorById = async (id) => {
  try {
    return await api.get(`/doctors/${id}`)
  } catch (error) {
    console.error('Error fetching doctor:', error)
    throw error
  }
}

// Get available doctor users (users with role "Doctor" without profiles)
export const getAvailableDoctorUsers = async () => {
  try {
    return await api.get('/doctors/available-users')
  } catch (error) {
    console.error('Error fetching available doctor users:', error)
    throw error
  }
}

// Create doctor profile for existing user
export const createDoctor = async (data) => {
  try {
    return await api.post('/doctors', data)
  } catch (error) {
    console.error('Error creating doctor:', error)
    throw error
  }
}

// Update doctor profile
export const updateDoctor = async (id, data) => {
  try {
    return await api.put(`/doctors/${id}`, data)
  } catch (error) {
    console.error('Error updating doctor:', error)
    throw error
  }
}

// Delete doctor profile
export const deleteDoctor = async (id) => {
  try {
    return await api.delete(`/doctors/${id}`)
  } catch (error) {
    console.error('Error deleting doctor:', error)
    throw error
  }
}

// Get doctor schedule/availability
export const getDoctorSchedule = async (id, params) => {
  try {
    return await api.get(`/doctors/${id}/schedule`, { params })
  } catch (error) {
    console.error('Error fetching doctor schedule:', error)
    throw error
  }
}

// Update doctor availability/schedule
export const updateDoctorSchedule = async (id, data) => {
  try {
    return await api.put(`/doctors/${id}/availability`, { availability: data })
  } catch (error) {
    console.error('Error updating doctor schedule:', error)
    throw error
  }
}

// Add on-call shift for doctor
export const addOnCallShift = async (id, data) => {
  try {
    return await api.post(`/doctors/${id}/oncall`, data)
  } catch (error) {
    console.error('Error adding on-call shift:', error)
    throw error
  }
}

// Get doctor appointments
export const getDoctorAppointments = async (id, params) => {
  try {
    return await api.get(`/doctors/${id}/appointments`, { params })
  } catch (error) {
    console.error('Error fetching doctor appointments:', error)
    throw error
  }
}