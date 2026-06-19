import api from './api'

// ── Core agents ──────────────────────────────────────────────────────────────
export const chatWithAssistant      = (message, history) => api.post('/ai/chat', { message, history })
export const analyzeSymptoms        = (symptoms, age, gender) => api.post('/ai/symptom-analysis', { symptoms, age, gender })
export const analyzeReport          = (reportText, reportType) => api.post('/ai/report-analysis', { reportText, reportType })
export const assessHealthRisk       = (payload) => api.post('/ai/health-risk', payload)
export const allocateBed            = (payload) => api.post('/ai/bed-allocation', payload)
export const optimizeAppointment    = (symptoms, department) => api.post('/ai/appointment-optimizer', { symptoms, department })
export const getPatientSummary      = (patientId) => api.get(`/ai/patient-summary/${patientId}`)

// ── Orchestrated flows ────────────────────────────────────────────────────────
// Symptom → auto-detects department → runs appointment optimizer in one call
export const symptomToAppointment   = (symptoms, age, gender) => api.post('/ai/symptom-to-appointment', { symptoms, age, gender })

// ── Operational intelligence ─────────────────────────────────────────────────
export const getAdminInsights       = () => api.get('/ai/admin-insights')
export const getPharmacyAlerts      = () => api.get('/ai/pharmacy-alerts')
