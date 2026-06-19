import React, { useState } from 'react'
import { Brain, Sparkles, Loader2, X, AlertTriangle, CheckCircle2, Clock, ArrowRight, RotateCcw, Stethoscope, User, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../services/api'
import { analyzeSymptoms } from '../services/aiService'

// ─── Condition Knowledge Base ─────────────────────────────────────────────────
const CONDITIONS = [
  {
    name: 'Viral Fever / Flu',
    keywords: ['fever', 'chill', 'body ache', 'cold', 'runny nose', 'fatigue', 'weakness', 'sore throat'],
    urgency: 'Low',
    speciality: 'General Physician',
    specialityKeys: ['general physician', 'general medicine', 'internal medicine'],
    advice: ['Rest and stay hydrated (8+ glasses of water)', 'Paracetamol for fever > 38.5°C', 'Monitor temperature every 6 hours', 'Warm saline gargles for throat'],
    redFlags: ['Fever above 40°C', 'Difficulty breathing', 'Persistent vomiting']
  },
  {
    name: 'Hypertension / High BP',
    keywords: ['headache', 'dizziness', 'blurred vision', 'neck pain', 'bp', 'blood pressure', 'palpitation'],
    urgency: 'Moderate',
    speciality: 'Cardiologist or General Physician',
    specialityKeys: ['cardiologist', 'cardiology', 'general physician', 'general medicine'],
    advice: ['Measure BP immediately if possible', 'Avoid salt, caffeine, and stress', 'Sit quietly and breathe slowly', 'Do not skip prescribed BP medications'],
    redFlags: ['Sudden severe headache', 'Chest pain', 'Numbness in face or arm']
  },
  {
    name: 'Cardiac Emergency',
    keywords: ['chest pain', 'chest tightness', 'chest pressure', 'left arm pain', 'jaw pain', 'shortness of breath', 'sweating', 'palpitation'],
    urgency: 'Critical',
    speciality: 'Emergency / Cardiologist',
    specialityKeys: ['emergency', 'cardiologist', 'cardiology'],
    advice: ['CALL 112 IMMEDIATELY', 'Chew one aspirin (300mg) if not allergic', 'Lie down and stay calm', 'Do not drive yourself to the hospital'],
    redFlags: ['All symptoms indicate possible cardiac event — seek emergency care NOW']
  },
  {
    name: 'Gastritis / Stomach Issues',
    keywords: ['stomach pain', 'stomach ache', 'nausea', 'vomiting', 'acidity', 'heartburn', 'bloating', 'indigestion', 'loose stool', 'diarrhoea'],
    urgency: 'Low',
    speciality: 'Gastroenterologist or General Physician',
    specialityKeys: ['gastroenterologist', 'gastroenterology', 'gastro', 'general physician'],
    advice: ['Eat light, bland food (rice, dal, khichdi)', 'Avoid spicy, oily, or acidic foods', 'Stay hydrated — ORS if diarrhoea', 'Antacids can help with acidity/heartburn'],
    redFlags: ['Blood in vomit or stool', 'Severe abdominal pain', 'Signs of dehydration']
  },
  {
    name: 'Respiratory Infection',
    keywords: ['cough', 'breathlessness', 'breathing difficulty', 'wheezing', 'mucus', 'congestion', 'chest tightness', 'sputum'],
    urgency: 'Moderate',
    speciality: 'Pulmonologist or General Physician',
    specialityKeys: ['pulmonologist', 'pulmonology', 'respiratory', 'general physician'],
    advice: ['Steam inhalation 2-3 times daily', 'Warm liquids — ginger tea, honey', 'Avoid cold air and dust exposure', 'Prescribed inhaler if asthmatic'],
    redFlags: ['Severe breathing difficulty', 'Blue lips or fingertips', 'Fever > 39°C with cough']
  },
  {
    name: 'Migraine / Tension Headache',
    keywords: ['headache', 'migraine', 'head pain', 'throbbing', 'light sensitivity', 'noise sensitivity', 'nausea with headache'],
    urgency: 'Low',
    speciality: 'Neurologist or General Physician',
    specialityKeys: ['neurologist', 'neurology', 'general physician'],
    advice: ['Rest in a dark, quiet room', 'Cold compress on forehead or neck', 'Ibuprofen or paracetamol for pain', 'Track triggers (food, stress, sleep)'],
    redFlags: ['Sudden "thunderclap" headache', 'Headache with stiff neck and fever', 'Headache after head injury']
  },
  {
    name: 'Urinary Tract Infection (UTI)',
    keywords: ['burning urination', 'frequent urination', 'pelvic pain', 'cloudy urine', 'blood in urine', 'lower back pain', 'urgency urination'],
    urgency: 'Moderate',
    speciality: 'Urologist or General Physician',
    specialityKeys: ['urologist', 'urology', 'general physician'],
    advice: ['Drink 2-3 litres of water daily', 'Avoid holding urine — urinate frequently', 'Cranberry juice may help mild cases', 'Antibiotics typically needed — see doctor'],
    redFlags: ['High fever with UTI symptoms', 'Severe back or flank pain', 'Vomiting with UTI']
  },
  {
    name: 'Allergic Reaction',
    keywords: ['rash', 'itching', 'hives', 'swelling', 'skin rash', 'allergy', 'sneezing', 'watery eyes', 'red eyes'],
    urgency: 'Low',
    speciality: 'Dermatologist or Allergist',
    specialityKeys: ['dermatologist', 'dermatology', 'allergist', 'allergy'],
    advice: ['Identify and avoid the trigger', 'Antihistamines (cetirizine) for relief', 'Cool compress for skin rash', 'Avoid scratching to prevent infection'],
    redFlags: ['Throat swelling or difficulty swallowing', 'Facial swelling', 'Difficulty breathing after exposure']
  },
  {
    name: 'Musculoskeletal Pain',
    keywords: ['joint pain', 'knee pain', 'back pain', 'muscle pain', 'sprain', 'stiffness', 'swollen joint', 'arthritis'],
    urgency: 'Low',
    speciality: 'Orthopaedic or Physiotherapist',
    specialityKeys: ['orthopaedic', 'orthopedic', 'orthopedics', 'orthopaedics', 'physiotherapist', 'physiotherapy'],
    advice: ['RICE method: Rest, Ice, Compression, Elevation', 'Avoid strenuous activity', 'Anti-inflammatory (ibuprofen) for pain', 'Physiotherapy may be recommended'],
    redFlags: ['Severe joint deformity', 'Joint unable to bear weight', 'Fever with joint pain (possible infection)']
  },
  {
    name: 'Anxiety / Stress',
    keywords: ['anxiety', 'panic', 'stress', 'racing heart', 'panic attack', 'nervousness', 'trembling', 'insomnia', 'sleep problem'],
    urgency: 'Low',
    speciality: 'Psychiatrist or Psychologist',
    specialityKeys: ['psychiatrist', 'psychiatry', 'psychologist', 'psychology', 'mental health'],
    advice: ['Practice 4-7-8 breathing technique', 'Reduce caffeine and screen time', 'Regular exercise and adequate sleep', 'Consider speaking with a therapist'],
    redFlags: ['Thoughts of self-harm', 'Inability to function in daily activities', 'Symptoms lasting more than 2 weeks']
  },
]

const QUICK_SYMPTOMS = [
  'Fever', 'Headache', 'Chest pain', 'Cough', 'Nausea', 'Fatigue',
  'Joint pain', 'Skin rash', 'Breathing difficulty', 'Stomach pain',
  'Dizziness', 'Back pain',
]

const URGENCY_CONFIG = {
  Critical: { color: 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-800', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-600', icon: AlertTriangle, label: 'Critical — Seek Emergency Care' },
  High:     { color: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-500', icon: AlertTriangle, label: 'High Priority — See Doctor Today' },
  Moderate: { color: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-500', icon: Clock, label: 'Moderate — Book Appointment Soon' },
  Low:      { color: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-500', icon: CheckCircle2, label: 'Low Priority — Monitor & Rest' },
}

// (local engine removed — analysis is now done by the backend AI agent)

// ─── Main Component ───────────────────────────────────────────────────────────
const SymptomCheckerAgent = ({ open, onClose, onBookAppointment }) => {
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const [customInput, setCustomInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [matchedDoctors, setMatchedDoctors] = useState([])

  const toggle = (s) => setSelected(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  )

  const addCustom = () => {
    const val = customInput.trim()
    if (!val) return
    if (selected.includes(val)) { setCustomInput(''); return }
    setSelected(prev => [...prev, val])
    setCustomInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustom() }
  }

  const analyze = async () => {
    if (selected.length === 0) { toast.warn('Please select or enter at least one symptom'); return }
    setLoading(true)
    try {
      const res = await analyzeSymptoms(selected)
      const aiData = res?.data || res
      if (!aiData?.conditions?.length) {
        toast.info('No matching conditions found. Please consult a doctor for a proper evaluation.')
        setLoading(false)
        return
      }
      // Map backend response to frontend schema
      const mapped = {
        conditions: aiData.conditions,
        overallUrgency: aiData.overallUrgency,
        aiSummary: aiData.aiSummary,
      }
      // Fetch matched doctors
      try {
        const doctorRes = await api.get('/doctors', { params: { limit: 200 } })
        const doctors = doctorRes.data?.data || doctorRes.data || []
        const dept = aiData.department?.toLowerCase() || ''
        const filtered = doctors.filter(d => d.isAvailable && (d.specialization || '').toLowerCase().includes(dept.split(/\s+/)[0]))
        setMatchedDoctors(filtered.slice(0, 3))
      } catch { setMatchedDoctors([]) }
      setResult(mapped)
    } catch {
      toast.error('Symptom analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setSelected([])
    setCustomInput('')
    setMatchedDoctors([])
  }

  const bookWithDoctor = (doctorId) => {
    onClose()
    navigate(`/appointments?doctor=${doctorId}`)
  }

  const bookAppointment = () => {
    const dept = result?.conditions?.[0]?.department || ''
    if (onBookAppointment) {
      onClose()
      onBookAppointment({ symptoms: selected.join(', '), department: dept })
    } else {
      onClose()
      navigate('/appointments')
    }
  }

  if (!open) return null

  const cfg = result ? URGENCY_CONFIG[result.overallUrgency] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-r from-violet-600 to-purple-600 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-base">AI Symptom Checker</h2>
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">AI Powered</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!result ? (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select your symptoms or type custom ones. Our AI will assess possible conditions and urgency level.
              </p>

              {/* Quick symptom chips */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Common Symptoms</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SYMPTOMS.map(s => (
                    <button
                      key={s}
                      onClick={() => toggle(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        selected.includes(s)
                          ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom input */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Add Custom Symptom</p>
                <div className="flex gap-2">
                  <input
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., neck stiffness, ear pain…"
                    className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                  <button
                    onClick={addCustom}
                    className="px-4 py-2 bg-violet-600 text-white text-sm rounded-xl hover:bg-violet-700 transition font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Selected list */}
              {selected.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Selected ({selected.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map(s => (
                      <span key={s} className="flex items-center gap-1.5 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 px-2.5 py-1 rounded-full font-medium">
                        {s}
                        <button onClick={() => toggle(s)} className="hover:text-violet-900 dark:hover:text-violet-200 transition">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={analyze}
                disabled={loading || selected.length === 0}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 transition shadow-lg shadow-violet-500/25"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing symptoms…</>
                  : <><Sparkles className="w-4 h-4" /> Analyse Symptoms</>
                }
              </button>
            </>
          ) : (
            <>
              {/* Overall urgency banner */}
              <div className={`rounded-xl border p-4 flex items-center gap-3 ${cfg.color}`}>
                <cfg.icon className={`w-5 h-5 flex-shrink-0 ${cfg.text}`} />
                <div>
                  <p className={`font-bold text-sm ${cfg.text}`}>{cfg.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Based on: {selected.join(', ')}
                  </p>
                </div>
                <span className={`ml-auto text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase ${cfg.badge}`}>
                  {result.overallUrgency}
                </span>
              </div>

              {/* Possible conditions */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Possible Conditions</p>
                <div className="space-y-3">
                  {result.conditions.map((cond, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{cond.name}</p>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${URGENCY_CONFIG[cond.urgency]?.badge || 'bg-gray-500'}`}>
                          {cond.urgency}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">Specialist: <span className="text-gray-600 dark:text-gray-300 font-medium">{cond.speciality}</span></p>
                      <ul className="space-y-1">
                        {cond.advice.map((a, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className="w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{j + 1}</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                      {cond.redFlags.length > 0 && (
                        <div className="mt-2.5 p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                          <p className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400 mb-1">⚠ Red Flags — Seek Immediate Care If:</p>
                          {cond.redFlags.map((f, j) => (
                            <p key={j} className="text-[10px] text-red-600 dark:text-red-400">• {f}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended doctors */}
              {matchedDoctors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Recommended Doctors</p>
                  <div className="space-y-2">
                    {matchedDoctors.map((doc) => (
                      <div key={doc._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {doc.userId?.name || doc.name || 'Doctor'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Stethoscope className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-500 truncate">{doc.specialization}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold">Available</span>
                          <button
                            onClick={() => bookWithDoctor(doc._id)}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                          >
                            <Calendar className="w-3 h-3" />Book
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                ⚕️ This AI assessment is for informational purposes only. Always consult a qualified medical professional for diagnosis and treatment.
              </p>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 transition"
                >
                  <RotateCcw className="w-4 h-4" /> Check Again
                </button>
                <button
                  onClick={bookAppointment}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-cyan-700 transition shadow-lg shadow-blue-500/25"
                >
                  Book Appointment <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SymptomCheckerAgent
