import React, { useState, useEffect } from 'react'
import { CalendarCheck, X, Loader2, Sparkles, User, Stethoscope, RotateCcw, ArrowRight, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { optimizeAppointment } from '../services/aiService'

const URGENCY_STYLE = {
  Emergency: { badge: 'bg-red-600 text-white', text: 'text-red-600 dark:text-red-400', label: 'Go to Emergency immediately' },
  Urgent:    { badge: 'bg-orange-500 text-white', text: 'text-orange-600 dark:text-orange-400', label: 'Book appointment today' },
  Routine:   { badge: 'bg-emerald-500 text-white', text: 'text-emerald-600 dark:text-emerald-400', label: 'Schedule at your convenience' },
}

const QUICK_SYMPTOMS = [
  'Chest pain', 'Headache', 'Fever', 'Back pain', 'Stomach pain',
  'Skin rash', 'Joint pain', 'Breathlessness', 'Dizziness', 'Cough',
]

const AppointmentOptimizerAgent = ({ open, onClose, initialSymptoms = '', initialDepartment = '' }) => {
  const navigate = useNavigate()
  const [symptoms, setSymptoms] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && initialSymptoms) {
      setSymptoms(initialSymptoms)
      setResult(null)
      setTimeout(() => {
        optimizeAppointment(initialSymptoms, initialDepartment || undefined)
          .then(res => setResult(res?.data || res))
          .catch(() => {})
          .finally(() => setLoading(false))
        setLoading(true)
      }, 300)
    }
    if (!open) { setSymptoms(''); setResult(null) }
  }, [open, initialSymptoms, initialDepartment])

  const addQuick = (s) => {
    setSymptoms(prev => prev ? `${prev}, ${s}` : s)
  }

  const submit = async () => {
    if (!symptoms.trim()) { toast.warn('Please describe your symptoms first'); return }
    setLoading(true)
    try {
      const res = await optimizeAppointment(symptoms)
      setResult(res?.data || res)
    } catch {
      toast.error('Optimizer service unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const bookDoctor = (doctorId) => {
    onClose()
    navigate(doctorId ? `/appointments?doctor=${doctorId}` : '/appointments')
  }

  const reset = () => {
    setResult(null)
    setSymptoms('')
  }

  if (!open) return null

  const uStyle = result ? (URGENCY_STYLE[result.urgencyLevel] || URGENCY_STYLE.Routine) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 flex-shrink-0">
          <div className="flex items-center gap-3">
            <CalendarCheck className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-base">Appointment Optimizer</h2>
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium uppercase">LLM Powered</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Describe your symptoms and our AI will find the best available doctor — matched by specialization and lowest workload.
              </p>

              {/* Quick symptom chips */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Quick Add</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SYMPTOMS.map(s => (
                    <button
                      key={s}
                      onClick={() => addQuick(s)}
                      className="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symptoms input */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Your Symptoms *</label>
                <textarea
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                  placeholder="Describe what you're experiencing… e.g., persistent headache for 3 days, mild fever, neck stiffness"
                  rows={4}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <button
                onClick={submit}
                disabled={loading || !symptoms.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition shadow-lg shadow-indigo-500/25"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding best doctor…</> : <><Sparkles className="w-4 h-4" /> Find Optimal Doctor</>}
              </button>
            </>
          ) : (
            <>
              {/* Urgency banner */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{uStyle?.label}</p>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${uStyle?.badge}`}>{result.urgencyLevel}</span>
              </div>

              {/* Department */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900">
                <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <p className="text-sm text-indigo-800 dark:text-indigo-300">
                  Recommended department: <strong>{result.suggestedDepartment}</strong>
                </p>
              </div>

              {/* Best doctor */}
              {result.recommendedDoctor && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Best Match</p>
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white">{result.recommendedDoctor.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-sm text-gray-500">{result.recommendedDoctor.specialization}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{result.recommendedDoctor.currentLoad} appointment(s) today · Least loaded</p>
                    </div>
                    <button
                      onClick={() => bookDoctor(result.recommendedDoctor.id)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition flex-shrink-0"
                    >
                      Book <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Rationale */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Why this doctor?</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{result.rationale}</p>
              </div>

              {/* Alternatives */}
              {result.alternativeDoctors?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Other Options</p>
                  <div className="space-y-2">
                    {result.alternativeDoctors.map((doc, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-400">{doc.specialization}</p>
                        </div>
                        <button
                          onClick={() => bookDoctor(doc.id)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                          Book
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                ⚕️ Doctor availability may change. Confirm at time of booking.
              </p>

              <div className="flex gap-3">
                <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>
                <button onClick={() => bookDoctor(null)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition">
                  All Appointments <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AppointmentOptimizerAgent
