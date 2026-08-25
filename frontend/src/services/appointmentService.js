import api from './api'

// Get all appointments with optional filters
export const getAllAppointments = async (params) => {
  try {
    return await api.get('/appointments', { params })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    throw error
  }
}

// Get single appointment by ID
export const getAppointmentById = async (id) => {
  try {
    return await api.get(`/appointments/${id}`)
  } catch (error) {
    console.error('Error fetching appointment:', error)
    throw error
  }
}

// Create new appointment
export const createAppointment = async (data, bookingKey = crypto.randomUUID()) => {
  try {
    return await api.post('/appointments', { ...data, bookingKey }, { headers: { 'Idempotency-Key': bookingKey } })
  } catch (error) {
    console.error('Error creating appointment:', error)
    throw error
  }
}

// Update appointment
export const updateAppointment = async (id, data) => {
  try {
    return await api.put(`/appointments/${id}`, data)
  } catch (error) {
    console.error('Error updating appointment:', error)
    throw error
  }
}

// Delete appointment
export const deleteAppointment = async (id) => {
  try {
    return await api.delete(`/appointments/${id}`)
  } catch (error) {
    console.error('Error deleting appointment:', error)
    throw error
  }
}

// Cancel appointment
export const cancelAppointment = async (id, reason) => {
  try {
    return await api.put(`/appointments/${id}/cancel`, { reason })
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    throw error
  }
}

// Reschedule appointment
export const rescheduleAppointment = async (id, data) => {
  try {
    return await api.put(`/appointments/${id}/reschedule`, data)
  } catch (error) {
    console.error('Error rescheduling appointment:', error)
    throw error
  }
}

// Get doctor availability for a specific date
export const getDoctorAvailability = async (doctorId, date) => {
  try {
    return await api.get(`/appointments/availability/${doctorId}`, {
      params: { date }
    })
  } catch (error) {
    console.error('Error fetching doctor availability:', error)
    throw error
  }
}

// Get appointments by doctor
export const getDoctorAppointments = async (doctorId, params) => {
  try {
    return await api.get('/appointments', { 
      params: { ...params, doctor: doctorId } 
    })
  } catch (error) {
    console.error('Error fetching doctor appointments:', error)
    throw error
  }
}

// Get appointments by patient
export const getPatientAppointments = async (patientId, params) => {
  try {
    return await api.get('/appointments', { 
      params: { ...params, patient: patientId } 
    })
  } catch (error) {
    console.error('Error fetching patient appointments:', error)
    throw error
  }
}

// Get today's appointments
export const getTodayAppointments = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    return await api.get('/appointments', { 
      params: { date: today } 
    })
  } catch (error) {
    console.error('Error fetching today appointments:', error)
    throw error
  }
}

// Update appointment status
export const updateAppointmentStatus = async (id, status) => {
  try {
    return await api.put(`/appointments/${id}`, { status })
  } catch (error) {
    console.error('Error updating appointment status:', error)
    throw error
  }
}
