import api from './api'

const normalizeSymptoms = (symptoms) => Array.isArray(symptoms)
  ? symptoms.map((item) => String(item).trim()).filter(Boolean).join(', ')
  : String(symptoms || '').trim()

const compactOptionalFields = (payload) => Object.fromEntries(
  Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== undefined)
)

// ── Core agents ──────────────────────────────────────────────────────────────
export const chatWithAssistant      = (message, history = []) => api.post('/ai/chat', {
  message: String(message || '').trim(),
  history: Array.isArray(history) ? history.slice(-10) : [],
})
export const analyzeSymptoms        = (symptoms, age, gender) => api.post('/ai/symptom-analysis', compactOptionalFields({
  symptoms: normalizeSymptoms(symptoms),
  age: age === '' || age === undefined || age === null ? undefined : Number(age),
  gender,
}))
export const analyzeReport          = (reportText, reportType) => api.post('/ai/report-analysis', { reportText, reportType })
export const assessHealthRisk       = (payload) => api.post('/ai/health-risk', payload)
export const allocateBed            = (payload) => api.post('/ai/bed-allocation', compactOptionalFields({
  ...payload,
  age: payload?.age === '' || payload?.age === undefined || payload?.age === null
    ? undefined
    : Number(payload.age),
}))
export const optimizeAppointment    = (symptoms, department) => api.post('/ai/appointment-optimizer', { symptoms, department })
export const getPatientSummary      = (patientId) => api.get(`/ai/patient-summary/${patientId}`)

// ── Orchestrated flows ────────────────────────────────────────────────────────
// Symptom → auto-detects department → runs appointment optimizer in one call
export const symptomToAppointment   = (symptoms, age, gender) => api.post('/ai/symptom-to-appointment', compactOptionalFields({
  symptoms: normalizeSymptoms(symptoms),
  age: age === '' || age === undefined || age === null ? undefined : Number(age),
  gender,
}))

// ── Operational intelligence ─────────────────────────────────────────────────
export const getAdminInsights       = () => api.get('/ai/admin-insights')
export const getPharmacyAlerts      = () => api.get('/ai/pharmacy-alerts')
export const getAiReliability       = (hours = 24) => api.get('/ai/reliability', { params: { hours } })
