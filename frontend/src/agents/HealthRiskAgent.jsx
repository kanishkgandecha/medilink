import React, { useState } from 'react'
import { Activity, X, Loader2, AlertTriangle, CheckCircle2, TrendingUp, RotateCcw, ArrowRight, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { assessHealthRisk } from '../services/aiService'

// ─── Risk scoring ─────────────────────────────────────────────────────────────
const CHRONIC_CONDITIONS = [
  { id: 'diabetes',       label: 'Diabetes',                 riskPoints: 15 },
  { id: 'hypertension',   label: 'Hypertension / High BP',   riskPoints: 15 },
  { id: 'heart_disease',  label: 'Heart Disease',            riskPoints: 25 },
  { id: 'asthma',         label: 'Asthma / COPD',            riskPoints: 12 },
  { id: 'kidney',         label: 'Kidney Disease',           riskPoints: 18 },
  { id: 'obesity',        label: 'Obesity (BMI > 30)',        riskPoints: 12 },
  { id: 'smoking',        label: 'Smoking / Tobacco Use',    riskPoints: 15 },
  { id: 'thyroid',        label: 'Thyroid Disorder',         riskPoints: 8  },
  { id: 'liver',          label: 'Liver Disease',            riskPoints: 18 },
  { id: 'arthritis',      label: 'Arthritis / Joint Issues', riskPoints: 6  },
]

const ACUTE_SYMPTOMS = [
  { id: 'chest_pain',     label: 'Chest pain / tightness',   riskPoints: 25 },
  { id: 'breathlessness', label: 'Breathlessness',           riskPoints: 20 },
  { id: 'fever_high',     label: 'High fever (> 39°C)',       riskPoints: 15 },
  { id: 'dizziness',      label: 'Severe dizziness / fainting', riskPoints: 15 },
  { id: 'numbness',       label: 'Numbness / weakness in limbs', riskPoints: 20 },
  { id: 'confusion',      label: 'Confusion / altered consciousness', riskPoints: 25 },
  { id: 'nausea',         label: 'Persistent nausea / vomiting', riskPoints: 8 },
  { id: 'fatigue',        label: 'Extreme fatigue',           riskPoints: 8  },
]

const calcAgeRisk = (age) => {
  if (age < 18) return 0
  if (age < 30) return 5
  if (age < 45) return 10
  if (age < 60) return 20
  if (age < 75) return 30
  return 40
}

const getRiskLevel = (score) => {
  if (score >= 70) return { level: 'Critical', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', badge: 'bg-red-600', icon: AlertTriangle, action: 'Seek immediate medical evaluation.', barColor: 'bg-red-500' }
  if (score >= 45) return { level: 'High',     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-700', badge: 'bg-orange-500', icon: AlertTriangle, action: 'Book a doctor\'s appointment this week.', barColor: 'bg-orange-400' }
  if (score >= 25) return { level: 'Moderate', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', badge: 'bg-amber-500', icon: TrendingUp, action: 'Schedule a routine health check-up.', barColor: 'bg-amber-400' }
  return                { level: 'Low',      color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', badge: 'bg-emerald-500', icon: CheckCircle2, action: 'Maintain current healthy habits.', barColor: 'bg-emerald-400' }
}

const LIFESTYLE_TIPS = {
  Critical: [
    'Contact your doctor or go to the emergency room immediately.',
    'Do not ignore acute symptoms — early intervention saves lives.',
    'Have someone accompany you to the hospital.',
    'Bring a list of all current medications when seeking care.',
  ],
  High: [
    'Book an appointment with your primary care doctor this week.',
    'Monitor your vitals (BP, blood sugar) daily if you have equipment.',
    'Reduce sodium, fat, and sugar in your diet.',
    'Avoid strenuous exercise until evaluated by a doctor.',
  ],
  Moderate: [
    'Schedule a preventive health check-up within the next month.',
    'Exercise at least 30 minutes on most days of the week.',
    'Eat more fruits, vegetables, and whole grains.',
    'Get 7-8 hours of sleep per night.',
    'Manage stress through yoga, meditation, or leisure activities.',
  ],
  Low: [
    'Continue regular annual health check-ups.',
    'Stay active — aim for 150 min of moderate exercise per week.',
    'Maintain a balanced, plant-rich diet.',
    'Stay socially connected and mentally active.',
  ],
}

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = ['Age', 'Conditions', 'Symptoms', 'Result']

// ─── Main Component ───────────────────────────────────────────────────────────
const HealthRiskAgent = ({ open, onClose }) => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [age, setAge] = useState('')
  const [chronic, setChronic] = useState([])
  const [symptoms, setSymptoms] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const toggleChronic = (id) =>
    setChronic(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const toggleSymptom = (id) =>
    setSymptoms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const calcRisk = async () => {
    setLoading(true)
    try {
      const res = await assessHealthRisk({
        age: parseInt(age) || 0,
        chronicConditions: chronic,
        acuteSymptoms: symptoms,
      })
      const ai = res?.data || res
      const risk = getRiskLevel(ai.riskScore)
      setResult({ totalScore: ai.riskScore, riskFactors: ai.riskFactors, lifestyle: ai.lifestyle, urgentActions: ai.urgentActions, ...risk })
      setStep(3)
    } catch {
      // fallback to local calculation
      const ageNum = parseInt(age) || 0
      const ageRisk = calcAgeRisk(ageNum)
      const chronicRisk = CHRONIC_CONDITIONS.filter(c => chronic.includes(c.id)).reduce((s, c) => s + c.riskPoints, 0)
      const symptomRisk = ACUTE_SYMPTOMS.filter(s => symptoms.includes(s.id)).reduce((s, c) => s + c.riskPoints, 0)
      const totalScore = Math.min(100, ageRisk + chronicRisk + symptomRisk)
      const risk = getRiskLevel(totalScore)
      setResult({ totalScore, ageRisk, chronicRisk, symptomRisk, ...risk })
      setStep(3)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(0); setAge(''); setChronic([]); setSymptoms([]); setResult(null)
  }

  if (!open) return null

  const canContinue = step === 0 ? (parseInt(age) >= 1 && parseInt(age) <= 120) : true

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-base">Health Risk Predictor</h2>
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">AI Powered</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              {STEPS.slice(0, 3).map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>{i + 1}</div>
                    <span className={`text-xs ${i === step ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400'}`}>{s}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">

          {/* Step 0: Age */}
          {step === 0 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your age to calibrate the risk model. Age is a key factor in health risk assessment.
              </p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Your Age (years)</label>
                <input
                  type="number" min="1" max="120"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="e.g., 45"
                  className="w-full px-4 py-3 text-2xl font-bold text-center rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              {age && (
                <div className={`p-3 rounded-xl text-sm ${
                  parseInt(age) >= 60 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' :
                  parseInt(age) >= 45 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                  'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {parseInt(age) >= 60 ? '⚠ Age 60+ carries elevated baseline health risk.' :
                   parseInt(age) >= 45 ? 'ℹ Age 45-60 — routine check-ups become more important.' :
                   '✓ Good — lower baseline age risk.'}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Chronic Conditions */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select any known medical conditions. These significantly impact your overall health risk.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {CHRONIC_CONDITIONS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => toggleChronic(c.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium text-left transition ${
                      chronic.includes(c.id)
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                    }`}
                  >
                    <span>{c.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${chronic.includes(c.id) ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                      +{c.riskPoints} pts
                    </span>
                  </button>
                ))}
              </div>
              {chronic.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No conditions selected — you can skip this step.</p>
              )}
            </div>
          )}

          {/* Step 2: Current Symptoms */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select any symptoms you are currently experiencing. This helps predict acute risk.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {ACUTE_SYMPTOMS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleSymptom(s.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium text-left transition ${
                      symptoms.includes(s.id)
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${symptoms.includes(s.id) ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      +{s.riskPoints} pts
                    </span>
                  </button>
                ))}
              </div>
              {symptoms.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No acute symptoms — you can skip this step.</p>
              )}
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && result && (
            <div className="space-y-5">
              {/* Risk score */}
              <div className={`rounded-xl border p-5 ${result.bg} ${result.border}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${result.badge} flex items-center justify-center`}>
                    <result.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Risk Level</p>
                    <p className={`text-2xl font-bold ${result.color}`}>{result.level}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-400">Risk Score</p>
                    <p className={`text-3xl font-black ${result.color}`}>{result.totalScore}</p>
                    <p className="text-xs text-gray-400">/ 100</p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${result.barColor}`}
                    style={{ width: `${result.totalScore}%` }}
                  />
                </div>

                {/* Score breakdown */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Age', value: result.ageRisk },
                    { label: 'Conditions', value: result.chronicRisk },
                    { label: 'Symptoms', value: result.symptomRisk },
                  ].map(item => (
                    <div key={item.label} className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className={`font-bold text-sm ${result.color}`}>+{item.value}</p>
                    </div>
                  ))}
                </div>

                <p className={`text-sm font-semibold mt-3 ${result.color}`}>{result.action}</p>
              </div>

              {/* Lifestyle tips */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  <Shield className="w-3.5 h-3.5 inline mr-1.5" />
                  Recommended Actions
                </p>
                <ul className="space-y-2">
                  {LIFESTYLE_TIPS[result.level].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                ⚕️ This is an AI-generated risk estimate for informational purposes only. Consult a qualified doctor for professional medical advice.
              </p>

              <div className="flex gap-3">
                <button onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition">
                  <RotateCcw className="w-4 h-4" /> Reassess
                </button>
                {result.level !== 'Low' && (
                  <button
                    onClick={() => { onClose(); navigate('/appointments') }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-cyan-700 transition shadow-lg shadow-blue-500/25"
                  >
                    Book Appointment <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {step < 3 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between flex-shrink-0">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
            >
              Back
            </button>

            {step < 2 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canContinue}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={calcRisk}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculating…</> : <>Calculate Risk</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HealthRiskAgent
