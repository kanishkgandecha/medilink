import React, { useState, useEffect } from 'react'
import { Pill, Eye, Plus, Trash2, Search, X, ClipboardList } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/common/Modal'
import * as prescriptionService from '../services/prescriptionService'
import * as patientService from '../services/patientService'
import * as medicineService from '../services/medicineService'
import { toast } from 'react-toastify'

const STATUS_BADGE = {
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Partially-Filled': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Fulfilled: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const FREQUENCIES = [
  'Once daily', 'Twice daily', 'Three times daily',
  'Four times daily', 'Every 6 hours', 'Every 8 hours',
  'Every 12 hours', 'As needed', 'Before meals', 'After meals',
  'At bedtime', 'Weekly'
]

const EMPTY_MED = { medicineId: '', medicineName: '', dosage: '', frequency: 'Twice daily', duration: '7 days', instructions: '', quantity: 1 }

const Prescriptions = () => {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const role = user?.role?.toLowerCase()
  const isDoctor = role === 'doctor'
  const isPatient = role === 'patient'
  const isPharmacist = role === 'pharmacist' || user?.subRole?.toLowerCase() === 'pharmacist'

  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(isPharmacist ? 'Pending' : '')
  const [selected, setSelected] = useState(null)

  // Doctor write prescription
  const [showWrite, setShowWrite] = useState(false)
  const [patients, setPatients] = useState([])
  const [medicines, setMedicines] = useState([])
  const [medSearch, setMedSearch] = useState('')
  const [rxForm, setRxForm] = useState({
    patientId: '',
    diagnosis: '',
    symptoms: '',
    notes: '',
    medItems: [{ ...EMPTY_MED }],
    labTests: ''
  })

  const cardBase = `border rounded-xl p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`
  const inp = `w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`
  const lbl = `block text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`
  const textCls = darkMode ? 'text-white' : 'text-gray-800'

  const loadPrescriptions = async () => {
    try {
      setLoading(true)
      const params = statusFilter ? { status: statusFilter } : {}
      const res = await prescriptionService.getAllPrescriptions(params)
      const data = res.data || res.prescriptions || []
      setPrescriptions(data)
    } catch {
      toast.error('Failed to load prescriptions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPrescriptions() }, [statusFilter])

  useEffect(() => {
    if (isDoctor && showWrite) {
      patientService.getAllPatients().then(r => setPatients(r.data || r.patients || [])).catch(() => {})
      medicineService.getAllMedicines({ limit: 200 }).then(r => setMedicines(r.data?.medicines || r.data || [])).catch(() => {})
    }
  }, [isDoctor, showWrite])

  const handleFulfill = async (id) => {
    try {
      await prescriptionService.updatePrescriptionStatus(id, { status: 'Fulfilled' })
      toast.success('Prescription fulfilled')
      loadPrescriptions()
      setSelected(null)
    } catch {
      toast.error('Failed to update prescription')
    }
  }

  const addMedItem = () => setRxForm(f => ({ ...f, medItems: [...f.medItems, { ...EMPTY_MED }] }))
  const removeMedItem = (i) => setRxForm(f => ({ ...f, medItems: f.medItems.filter((_, idx) => idx !== i) }))
  const updateMedItem = (i, field, val) => setRxForm(f => {
    const items = [...f.medItems]
    items[i] = { ...items[i], [field]: val }
    return { ...f, medItems: items }
  })

  const pickMedicine = (i, med) => {
    updateMedItem(i, 'medicineId', med._id)
    updateMedItem(i, 'medicineName', med.name)
  }

  const handleWritePrescription = async () => {
    if (!rxForm.patientId) return toast.error('Select a patient')
    if (rxForm.medItems.some(m => !m.medicineId)) return toast.error('Select a medicine for each row')
    if (rxForm.medItems.some(m => !m.dosage)) return toast.error('Enter dosage for each medicine')
    try {
      const payload = {
        patient: rxForm.patientId,
        medicines: rxForm.medItems.map(m => ({
          medicine: m.medicineId,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions,
          quantity: parseInt(m.quantity) || 1
        })),
        diagnosis: rxForm.diagnosis,
        symptoms: rxForm.symptoms,
        notes: rxForm.notes,
        labTests: rxForm.labTests ? rxForm.labTests.split(',').map(s => s.trim()).filter(Boolean) : []
      }
      await prescriptionService.createPrescription(payload)
      toast.success('Prescription created successfully')
      setShowWrite(false)
      setRxForm({ patientId: '', diagnosis: '', symptoms: '', notes: '', medItems: [{ ...EMPTY_MED }], labTests: '' })
      loadPrescriptions()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create prescription')
    }
  }

  const filteredMeds = medicines.filter(m =>
    !medSearch || m.name?.toLowerCase().includes(medSearch.toLowerCase()) ||
    m.genericName?.toLowerCase().includes(medSearch.toLowerCase())
  )

  const statusTabs = isPharmacist
    ? ['Pending', 'Partially-Filled', 'Fulfilled', '']
    : ['', 'Pending', 'Fulfilled', 'Cancelled']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${textCls}`}>Prescriptions</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {isDoctor ? 'Write and track prescriptions for your patients'
              : isPatient ? 'Your prescriptions from doctors'
              : 'Review and fulfill patient prescriptions'}
          </p>
        </div>
        {isDoctor && (
          <button
            onClick={() => setShowWrite(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition"
          >
            <Plus className="w-4 h-4" />
            Write Prescription
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className={cardBase}>
          {prescriptions.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className={`font-medium ${textCls}`}>No prescriptions found</p>
              <p className="text-sm text-gray-400 mt-1">
                {isDoctor ? 'Click "Write Prescription" to create one' : 'No prescriptions match this filter'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((rx) => {
                const patientName = rx.patient?.userId?.name || rx.patient?.patientId || 'Unknown'
                const doctorName = (rx.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
                const dateStr = rx.createdAt ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
                const isExpanded = selected?._id === rx._id

                return (
                  <div key={rx._id} className={`rounded-xl border transition-all ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div
                      className={`p-4 flex items-center justify-between cursor-pointer ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'} rounded-xl transition-colors`}
                      onClick={() => setSelected(isExpanded ? null : rx)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-gray-400">{rx.prescriptionId}</span>
                          {!isPatient && <p className={`font-semibold text-sm ${textCls}`}>{patientName}</p>}
                          {isPatient && <p className={`font-semibold text-sm ${textCls}`}>Dr. {doctorName}</p>}
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rx.status] || STATUS_BADGE.Pending}`}>
                            {rx.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {isPatient ? dateStr : `Dr. ${doctorName} · ${dateStr}`}
                          {rx.diagnosis && ` · ${rx.diagnosis}`}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(rx.medicines || []).slice(0, 3).map((m, i) => (
                            <span key={i} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                              <Pill className="w-3 h-3 text-blue-500" />
                              {m.medicine?.name || 'Medicine'}
                            </span>
                          ))}
                          {rx.medicines?.length > 3 && (
                            <span className="text-xs text-gray-400">+{rx.medicines.length - 3} more</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        {isPharmacist && rx.status === 'Pending' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleFulfill(rx._id) }}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition font-medium"
                          >
                            Fulfill
                          </button>
                        )}
                        <Eye className={`w-4 h-4 transition-transform ${isExpanded ? 'text-blue-500 rotate-0' : 'text-gray-400'}`} />
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className={`px-4 pb-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="pt-4 grid md:grid-cols-2 gap-4">
                          <div>
                            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 text-gray-400`}>Medicines</p>
                            <div className="space-y-2">
                              {(rx.medicines || []).map((m, i) => (
                                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                                  <Pill className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                  <div className="text-sm">
                                    <p className={`font-medium ${textCls}`}>{m.medicine?.name || 'Medicine'}</p>
                                    <p className="text-xs text-gray-400">
                                      {[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ')}
                                    </p>
                                    {m.instructions && <p className="text-xs text-gray-500 italic mt-0.5">{m.instructions}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-3">
                            {rx.diagnosis && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Diagnosis</p>
                                <p className={`text-sm ${textCls}`}>{rx.diagnosis}</p>
                              </div>
                            )}
                            {rx.labTests?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Lab Tests</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {rx.labTests.map((t, i) => (
                                    <span key={i} className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">{t}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {rx.notes && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                                <p className="text-sm text-gray-500 italic">{rx.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Write Prescription Modal (Doctor only) */}
      {isDoctor && (
        <Modal isOpen={showWrite} onClose={() => setShowWrite(false)} title="Write Prescription" size="xl">
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Patient */}
            <div>
              <label className={lbl}>Patient *</label>
              <select
                value={rxForm.patientId}
                onChange={e => setRxForm(f => ({ ...f, patientId: e.target.value }))}
                className={inp}
              >
                <option value="">— Select patient —</option>
                {patients.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.userId?.name} · {p.patientId}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Diagnosis</label>
                <input
                  value={rxForm.diagnosis}
                  onChange={e => setRxForm(f => ({ ...f, diagnosis: e.target.value }))}
                  className={inp}
                  placeholder="e.g., Acute Bronchitis"
                />
              </div>
              <div>
                <label className={lbl}>Symptoms</label>
                <input
                  value={rxForm.symptoms}
                  onChange={e => setRxForm(f => ({ ...f, symptoms: e.target.value }))}
                  className={inp}
                  placeholder="e.g., Cough, Fever"
                />
              </div>
            </div>

            {/* Medicine search helper */}
            {medicines.length > 0 && (
              <div>
                <label className={lbl}>Search Medicine</label>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    value={medSearch}
                    onChange={e => setMedSearch(e.target.value)}
                    placeholder="Type to search medicines…"
                    className="bg-transparent text-sm outline-none flex-1"
                  />
                  {medSearch && <button onClick={() => setMedSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}
                </div>
                {medSearch && filteredMeds.length > 0 && (
                  <div className={`mt-1 rounded-lg border max-h-40 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200 shadow-sm'}`}>
                    {filteredMeds.slice(0, 10).map(m => (
                      <button
                        key={m._id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition ${textCls}`}
                        onClick={() => {
                          const emptyIdx = rxForm.medItems.findIndex(mi => !mi.medicineId)
                          if (emptyIdx !== -1) { pickMedicine(emptyIdx, m) }
                          else {
                            setRxForm(f => ({ ...f, medItems: [...f.medItems, { ...EMPTY_MED, medicineId: m._id, medicineName: m.name }] }))
                          }
                          setMedSearch('')
                        }}
                      >
                        <span className="font-medium">{m.name}</span>
                        {m.genericName && <span className="text-gray-400 ml-2 text-xs">({m.genericName})</span>}
                        {m.strength && <span className="text-gray-400 ml-2 text-xs">{m.strength}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Medicine items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={lbl}>Medicines *</label>
                <button
                  onClick={addMedItem}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add row
                </button>
              </div>
              <div className="space-y-3">
                {rxForm.medItems.map((item, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-400">Medicine {i + 1}</span>
                      {rxForm.medItems.length > 1 && (
                        <button onClick={() => removeMedItem(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <select
                          value={item.medicineId}
                          onChange={e => {
                            const med = medicines.find(m => m._id === e.target.value)
                            if (med) pickMedicine(i, med)
                          }}
                          className={inp}
                        >
                          <option value="">— Select medicine —</option>
                          {medicines.map(m => (
                            <option key={m._id} value={m._id}>{m.name} {m.strength ? `(${m.strength})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          value={item.dosage}
                          onChange={e => updateMedItem(i, 'dosage', e.target.value)}
                          className={inp}
                          placeholder="Dosage (e.g., 1 tablet)"
                        />
                      </div>
                      <div>
                        <select
                          value={item.frequency}
                          onChange={e => updateMedItem(i, 'frequency', e.target.value)}
                          className={inp}
                        >
                          {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <input
                          value={item.duration}
                          onChange={e => updateMedItem(i, 'duration', e.target.value)}
                          className={inp}
                          placeholder="Duration (e.g., 7 days)"
                        />
                      </div>
                    </div>
                    <input
                      value={item.instructions}
                      onChange={e => updateMedItem(i, 'instructions', e.target.value)}
                      className={inp}
                      placeholder="Special instructions (optional)"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className={lbl}>Lab Tests (comma-separated)</label>
              <input
                value={rxForm.labTests}
                onChange={e => setRxForm(f => ({ ...f, labTests: e.target.value }))}
                className={inp}
                placeholder="e.g., CBC, Lipid Profile, Blood Sugar"
              />
            </div>

            <div>
              <label className={lbl}>Notes</label>
              <textarea
                value={rxForm.notes}
                onChange={e => setRxForm(f => ({ ...f, notes: e.target.value }))}
                className={`${inp} resize-none`}
                rows={2}
                placeholder="Additional instructions for patient..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => setShowWrite(false)}
              className={`px-5 py-2 rounded-lg border text-sm font-medium transition ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleWritePrescription}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition"
            >
              Issue Prescription
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Prescriptions
