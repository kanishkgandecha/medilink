import React, { useState } from 'react'
import { BedDouble, X, Loader2, Sparkles, AlertTriangle, CheckCircle2, Clock, RotateCcw, Building2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { allocateBed } from '../services/aiService'

const URGENCY_OPTIONS = ['Routine', 'Moderate', 'High', 'Critical', 'Emergency']
const PRIORITY_STYLE = {
  Immediate: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', badge: 'bg-red-600', icon: AlertTriangle },
  High:      { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', badge: 'bg-orange-500', icon: Clock },
  Standard:  { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', badge: 'bg-emerald-500', icon: CheckCircle2 },
}

const BedAllocationAgent = ({ open, onClose }) => {
  const [form, setForm] = useState({ condition: '', urgency: 'Moderate', age: '', gender: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handle = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!form.condition.trim()) { toast.warn('Please describe the patient condition'); return }
    setLoading(true)
    try {
      const res = await allocateBed(form)
      setResult(res?.data || res)
    } catch {
      toast.error('Bed allocation service unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setForm({ condition: '', urgency: 'Moderate', age: '', gender: '' })
  }

  if (!open) return null

  const pStyle = result ? (PRIORITY_STYLE[result.priority] || PRIORITY_STYLE.Standard) : null
  const PIcon = pStyle?.icon || CheckCircle2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-r from-sky-600 to-blue-600 flex-shrink-0">
          <div className="flex items-center gap-3">
            <BedDouble className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-base">AI Bed Allocation</h2>
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium uppercase">LLM Powered</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter patient condition and urgency. The AI will assess available wards and recommend the most appropriate bed placement.
              </p>

              {/* Condition */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Patient Condition *</label>
                <textarea
                  value={form.condition}
                  onChange={e => handle('condition', e.target.value)}
                  placeholder="e.g., Post-cardiac surgery requiring monitoring, Paediatric fever with dehydration, Road traffic accident with head injury…"
                  rows={3}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                />
              </div>

              {/* Urgency + Age + Gender */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Urgency</label>
                  <select
                    value={form.urgency}
                    onChange={e => handle('urgency', e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    {URGENCY_OPTIONS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Age</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={e => handle('age', e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => handle('gender', e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="">–</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <button
                onClick={submit}
                disabled={loading || !form.condition.trim()}
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-sky-700 hover:to-blue-700 disabled:opacity-50 transition shadow-lg shadow-sky-500/25"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing wards…</> : <><Sparkles className="w-4 h-4" /> Find Best Bed</>}
              </button>
            </>
          ) : (
            <>
              {/* Priority banner */}
              <div className={`rounded-xl border p-4 flex items-center gap-3 ${pStyle?.bg} border-transparent`}>
                <PIcon className={`w-5 h-5 flex-shrink-0 ${pStyle?.color}`} />
                <div className="flex-1">
                  <p className={`font-bold text-sm ${pStyle?.color}`}>
                    {result.priority} Priority — {result.priority === 'Immediate' ? 'Admit Now' : result.priority === 'High' ? 'Admit Today' : 'Standard Admission'}
                  </p>
                </div>
                <span className={`text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase ${pStyle?.badge}`}>{result.priority}</span>
              </div>

              {/* Recommended Ward */}
              {result.ward ? (
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{result.ward.name}</p>
                      <p className="text-xs text-gray-500">{result.ward.type} Ward · {result.ward.availableBeds} bed(s) available</p>
                    </div>
                    <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                      Bed {result.ward.suggestedBed}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{result.rationale}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4">
                  <p className="font-semibold text-red-700 dark:text-red-400 text-sm">No beds currently available</p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">{result.rationale}</p>
                </div>
              )}

              {/* Ward type recommendation */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <BedDouble className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <span>Recommended ward type: <strong className="text-gray-900 dark:text-white">{result.recommendedWardType}</strong></span>
              </div>

              {/* Special requirements */}
              {result.specialRequirements?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Special Requirements</p>
                  <ul className="space-y-1">
                    {result.specialRequirements.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-sky-500 flex-shrink-0">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alternatives */}
              {result.alternatives?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Alternatives</p>
                  {result.alternatives.map((a, i) => (
                    <p key={i} className="text-xs text-gray-500 dark:text-gray-400">• {a}</p>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                ⚕️ Final bed assignment must be confirmed by a nurse or ward manager.
              </p>

              <button
                onClick={reset}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 text-sm font-medium hover:bg-sky-50 dark:hover:bg-sky-900/20 transition"
              >
                <RotateCcw className="w-4 h-4" /> Check Another Patient
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default BedAllocationAgent
