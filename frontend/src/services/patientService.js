import api from './api'

// Get all patients
export const getAllPatients = async (params) => {
  return await api.get('/patients', { params })
}

// Search patients by name / phone / ID (autocomplete)
export const searchPatients = async (q) => {
  return await api.get('/patients/search', { params: { q } })
}

// Get all registered users with role "Patient" (users without patient profile)
export const getAvailablePatientUsers = async () => {
  return await api.get('/patients/available-users')
}

// Get patient by ID
export const getPatientById = async (id) => {
  return await api.get(`/patients/${id}`)
}

// Create patient — supports both legacy (userId) and atomic (name/email/phone) flows
export const createPatient = async (data) => {
  const payload = {
    bloodGroup: data.bloodGroup,
    emergencyContact: {
      name: data.emergencyContactName || '',
      phone: data.emergencyContact || '',
      relation: data.emergencyContactRelation || ''
    },
    allergies: data.allergies || [],
    insuranceInfo: data.insuranceInfo || {}
  }

  if (data.userId) {
    payload.userId = data.userId
  } else {
    // Atomic user + patient creation
    payload.name = data.name
    payload.email = data.email
    payload.phone = data.phone
    if (data.gender) payload.gender = data.gender
    if (data.dateOfBirth) payload.dateOfBirth = data.dateOfBirth
  }

  return await api.post('/patients', payload)
}

// Update patient
export const updatePatient = async (id, data) => {
  try {
    const payload = {
      bloodGroup: data.bloodGroup,
      emergencyContact: {
        name: data.emergencyContactName || '',
        phone: data.emergencyContact || '',
        relation: data.emergencyContactRelation || ''
      },
      allergies: data.allergies || [],
      insuranceInfo: data.insuranceInfo || {}
    }
    
    const response = await api.put(`/patients/${id}`, payload)
    return response
  } catch (error) {
    throw error
  }
}

// Archive patient while retaining linked clinical records
export const deletePatient = async (id) => {
  return await api.delete(`/patients/${id}`)
}

// Get patient medical records
export const getPatientMedicalRecords = async (id) => {
  return await api.get(`/patients/${id}/medical-records`)
}

export const getDiagnosticWorkspace = async () => {
  return await api.get('/patients/diagnostic-workspace')
}

export const getDiagnosticRecords = async (id) => {
  return await api.get(`/patients/diagnostic-workspace/${id}`)
}

// Add medical history
export const addMedicalHistory = async (id, data) => {
  return await api.post(`/patients/${id}/medical-history`, data)
}

// Add lab report
export const addLabReport = async (id, data) => {
  return await api.post(`/patients/${id}/lab-report`, data)
}

// Upload (or, with replace: true, overwrite) a report's file attachment.
// onProgress receives a 0-100 integer for an accessible progress indicator.
export const uploadLabReportAttachment = async (patientId, reportId, file, { replace = false, onProgress } = {}) => {
  const form = new FormData()
  form.append('attachment', file)
  if (replace) form.append('replace', 'true')
  return await api.post(`/patients/${patientId}/lab-report/${reportId}/attachment`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (event) => onProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0)
      : undefined,
  })
}

// Downloads the attachment as a Blob for client-side viewing/saving — the
// file is never reachable via a plain URL, only through this authenticated call.
export const downloadLabReportAttachment = async (patientId, reportId) => {
  return await api.get(`/patients/${patientId}/lab-report/${reportId}/attachment`, {
    responseType: 'blob',
  })
}

// Get patient appointments
export const getPatientAppointments = async (id) => {
  return await api.get(`/patients/${id}/appointments`)
}

// Create appointment for patient
export const createAppointment = async (data) => {
  return await api.post('/appointments', data)
}

