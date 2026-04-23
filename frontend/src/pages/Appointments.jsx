import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Calendar as CalendarIcon, Plus, Clock, Edit, CheckCircle, XCircle,
  ChevronRight, ChevronLeft, User, Stethoscope, CheckCircle2, IndianRupee,
  AlertCircle, Search, X
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/common/Modal'
import * as appointmentService from '../services/appointmentService'
import * as patientService from '../services/patientService'
import * as doctorService from '../services/doctorService'
import { toast } from 'react-toastify'

const drName = (name) => `Dr. ${(name || '').replace(/^Dr\.?\s*/i, '').trim()}`

// ─── Constants ────────────────────────────────────────────────
// Base list — combined with live doctor departments at render time
const BASE_DEPARTMENTS = [
  'Cardiology', 'Dermatology', 'Emergency', 'ENT', 'Gastroenterology',
  'General Medicine', 'General Surgery', 'Gynaecology', 'Nephrology',
  'Neurology', 'Oncology', 'Ophthalmology', 'Orthopedics',
  'Pediatrics', 'Psychiatry', 'Pulmonology', 'Radiology', 'Urology'
]

const STATUS_COLOR = {
  Confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'In-Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'No-Show': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

const EMPTY_BOOKING = {
  step: 1,
  department: '',
  date: '',
  symptoms: '',
  type: 'Consultation',
  priority: 'Normal',
  patientId: '',      // Patient profile _id
  doctorId: '',
  startTime: '',
  endTime: '',
}

// ─── Step indicator ───────────────────────────────────────────
const StepDots = ({ step, total }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`transition-all duration-300 rounded-full ${
          i + 1 === step
            ? 'w-8 h-2.5 bg-blue-600'
            : i + 1 < step
            ? 'w-2.5 h-2.5 bg-blue-400'
            : 'w-2.5 h-2.5 bg-gray-200 dark:bg-gray-600'
        }`}
      />
    ))}
  </div>
)

// ─── Booking wizard modal ─────────────────────────────────────
const BookingWizard = ({ isOpen, onClose, doctors, isPatient, onSuccess, darkMode }) => {
  // Merge base list with departments from loaded doctors so filter always matches DB values
  const DEPARTMENTS = [...new Set([
    ...BASE_DEPARTMENTS,
    ...doctors.map(d => d.department).filter(Boolean)
  ])].sort()
  const [booking, setBooking] = useState(EMPTY_BOOKING)
  const [submitting, setSubmitting] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Patient search state
  const [patientQuery, setPatientQuery] = useState('')
  const [patientSuggestions, setPatientSuggestions] = useState([])
  const [patientSelected, setPatientSelected] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef(null)
  const suggestionRef = useRef(null)

  const inp = `w-full px-4 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
  }`
  const lbl = `block text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`

  // Click-outside to close suggestions
  useEffect(() => {
    const handler = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handlePatientQuery = (value) => {
    setPatientQuery(value)
    setShowSuggestions(true)
    if (!patientSelected) {
      setBooking(b => ({ ...b, patientId: '' }))
    }
    clearTimeout(searchTimer.current)
    if (!value.trim()) {
      setPatientSuggestions([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await patientService.searchPatients(value)
        setPatientSuggestions(res.data || [])
      } catch {
        setPatientSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  const selectPatient = (p) => {
    setPatientSelected(p)
    setPatientQuery(p.userId?.name || '')
    setBooking(b => ({ ...b, patientId: p._id }))
    setShowSuggestions(false)
    setPatientSuggestions([])
  }

  const clearPatient = () => {
    setPatientSelected(null)
    setPatientQuery('')
    setBooking(b => ({ ...b, patientId: '' }))
    setPatientSuggestions([])
  }

  const filteredDoctors = doctors.filter(d =>
    !booking.department || d.department === booking.department
  )

  const selectedDoctor = doctors.find(d => d._id === booking.doctorId)

  // Fetch slots when doctor + date are chosen (step 3 for all roles)
  useEffect(() => {
    if (booking.step === 3 && booking.doctorId && booking.date) {
      setLoadingSlots(true)
      setAvailableSlots([])
      appointmentService.getDoctorAvailability(booking.doctorId, booking.date)
        .then(res => setAvailableSlots(res?.data?.availableSlots || res?.slots || res?.availableSlots || []))
        .catch(() => setAvailableSlots([]))
        .finally(() => setLoadingSlots(false))
    }
  }, [booking.step, booking.doctorId, booking.date])

  const totalSteps = 4

  const canNext = () => {
    const { step, department, date, doctorId, patientId, startTime } = booking
    if (step === 1) return !!date && !!department && (!isPatient ? !!patientId : true)
    if (step === 2) return !!doctorId
    if (step === 3) return !!startTime
    return true
  }

  const next = () => setBooking(b => ({ ...b, step: b.step + 1 }))
  const back = () => setBooking(b => ({ ...b, step: b.step - 1 }))

  const handleSlotPick = (slot) => {
    const end = slot.endTime || calcEnd(slot.startTime)
    setBooking(b => ({ ...b, startTime: slot.startTime, endTime: end }))
  }

  const calcEnd = (start) => {
    if (!start) return ''
    const [h, m] = start.split(':').map(Number)
    const total = h * 60 + m + 30
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = {
        doctor: booking.doctorId,
        appointmentDate: booking.date,
        timeSlot: { startTime: booking.startTime, endTime: booking.endTime || calcEnd(booking.startTime) },
        type: booking.type,
        priority: booking.priority,
        symptoms: booking.symptoms,
      }
      if (!isPatient) payload.patient = booking.patientId
      await appointmentService.createAppointment(payload)
      toast.success('Appointment booked successfully!')
      setBooking(EMPTY_BOOKING)
      onClose()
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setBooking(EMPTY_BOOKING)
    clearPatient()
    onClose()
  }

  const STEP_TITLE = ['Details', 'Choose Doctor', 'Time & Type', 'Confirm']

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Book Appointment" size="lg">
      {/* Step header */}
      <div className="text-center mb-1">
        <p className={`text-xs font-semibold uppercase tracking-widest ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          Step {booking.step} of {totalSteps} — {STEP_TITLE[booking.step - 1]}
        </p>
      </div>
      <StepDots step={booking.step} total={totalSteps} />

      {/* ── STEP 1: Details ── */}
      {booking.step === 1 && (
        <div className="space-y-4">
          {/* Patient search (non-patient roles only) */}
          {!isPatient && (
            <div className="relative" ref={suggestionRef}>
              <label className={lbl}>Search Patient *</label>
              <div className={`relative flex items-center rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}>
                <Search className="w-4 h-4 text-gray-400 absolute left-3 shrink-0" />
                <input
                  type="text"
                  value={patientQuery}
                  onChange={e => handlePatientQuery(e.target.value)}
                  onFocus={() => patientQuery && setShowSuggestions(true)}
                  placeholder="Type name or phone number…"
                  className={`w-full pl-9 pr-9 py-2.5 bg-transparent text-sm rounded-lg outline-none ${
                    darkMode ? 'text-white placeholder-gray-400' : 'text-gray-900'
                  }`}
                />
                {(patientQuery || patientSelected) && (
                  <button onClick={clearPatient} className="absolute right-3 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Selected badge */}
              {patientSelected && (
                <div className={`mt-2 px-3 py-2 rounded-lg flex items-center gap-2.5 border ${
                  darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {patientSelected.userId?.name?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {patientSelected.userId?.name}
                    </p>
                    <p className="text-xs text-gray-400">{patientSelected.patientId} · {patientSelected.userId?.phone}</p>
                  </div>
                </div>
              )}

              {/* Suggestions dropdown */}
              {showSuggestions && (searching || patientSuggestions.length > 0) && (
                <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-lg z-50 overflow-hidden ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  {searching ? (
                    <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>
                  ) : (
                    patientSuggestions.map(p => (
                      <button
                        key={p._id}
                        onClick={() => selectPatient(p)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                          darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {p.userId?.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {p.userId?.name}
                          </p>
                          <p className="text-xs text-gray-400">{p.patientId} · {p.userId?.phone}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Department *</label>
              <select
                value={booking.department}
                onChange={e => setBooking(b => ({ ...b, department: e.target.value, doctorId: '' }))}
                className={inp}
              >
                <option value="">— All departments —</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Appointment Date *</label>
              <input
                type="date"
                value={booking.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setBooking(b => ({ ...b, date: e.target.value }))}
                className={inp}
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Symptoms / Reason for Visit</label>
            <textarea
              value={booking.symptoms}
              onChange={e => setBooking(b => ({ ...b, symptoms: e.target.value }))}
              rows={3}
              placeholder="Describe your symptoms or reason for visit..."
              className={`${inp} resize-none`}
            />
          </div>
        </div>
      )}

      {/* ── STEP 2: Choose Doctor ── */}
      {booking.step === 2 && (
        <div>
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-10">
              <Stethoscope className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                No doctors found{booking.department ? ` in ${booking.department}` : ''}
              </p>
              <button
                onClick={() => setBooking(b => ({ ...b, department: '' }))}
                className="mt-2 text-sm text-blue-500 hover:underline"
              >
                Clear department filter
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {filteredDoctors.map(doc => {
                const isSelected = booking.doctorId === doc._id
                return (
                  <button
                    key={doc._id}
                    onClick={() => setBooking(b => ({ ...b, doctorId: doc._id }))}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/30'
                        : darkMode
                        ? 'border-gray-700 hover:border-gray-500 hover:bg-gray-700/50'
                        : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                        isSelected ? 'bg-blue-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      }`}>
                        {doc.userId?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'Dr'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {drName(doc.userId?.name)}
                        </p>
                        <p className="text-xs text-gray-400">{doc.specialization} · {doc.department}</p>
                        <p className="text-xs text-gray-400">{doc.experience} yrs exp · ★ {doc.rating?.toFixed(1) || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          ₹{doc.consultationFee}
                        </p>
                        <p className="text-xs text-gray-400">fee</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Time & Type (all roles) ── */}
      {booking.step === 3 && (
        <div className="space-y-4">
          {loadingSlots ? (
            <p className="text-center text-sm text-gray-400 py-4">Loading available slots…</p>
          ) : availableSlots.length > 0 ? (
            <div>
              <label className={lbl}>Available Time Slots</label>
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot, i) => {
                  const time = slot.startTime || slot
                  const isSelected = booking.startTime === time
                  return (
                    <button
                      key={i}
                      onClick={() => handleSlotPick(typeof slot === 'string' ? { startTime: slot } : slot)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : darkMode
                          ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-blue-400'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Start Time *</label>
                <input
                  type="time"
                  value={booking.startTime}
                  onChange={e => setBooking(b => ({ ...b, startTime: e.target.value, endTime: calcEnd(e.target.value) }))}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>End Time</label>
                <input
                  type="time"
                  value={booking.endTime}
                  onChange={e => setBooking(b => ({ ...b, endTime: e.target.value }))}
                  className={inp}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Appointment Type</label>
              <select
                value={booking.type}
                onChange={e => setBooking(b => ({ ...b, type: e.target.value }))}
                className={inp}
              >
                <option value="Consultation">Consultation</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Emergency">Emergency</option>
                <option value="Surgery">Surgery</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Priority</label>
              <select
                value={booking.priority}
                onChange={e => setBooking(b => ({ ...b, priority: e.target.value }))}
                className={inp}
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Confirm ── */}
      {booking.step === 4 && (
        <div className={`rounded-xl border p-5 space-y-3 ${darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className={`font-bold text-base mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Booking Summary</h3>

          {!isPatient && patientSelected && (
            <SummaryRow label="Patient" value={`${patientSelected.userId?.name} · ${patientSelected.patientId}`} darkMode={darkMode} />
          )}
          {selectedDoctor && (
            <>
              <SummaryRow label="Doctor" value={drName(selectedDoctor.userId?.name)} darkMode={darkMode} />
              <SummaryRow label="Department" value={selectedDoctor.department} darkMode={darkMode} />
              <SummaryRow label="Consultation Fee" value={`₹${selectedDoctor.consultationFee}`} darkMode={darkMode} />
            </>
          )}
          <SummaryRow label="Date" value={booking.date ? new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'} darkMode={darkMode} />
          <SummaryRow label="Time" value={booking.startTime ? `${booking.startTime} – ${booking.endTime || calcEnd(booking.startTime)}` : '—'} darkMode={darkMode} />
          <SummaryRow label="Type" value={booking.type} darkMode={darkMode} />
          <SummaryRow label="Priority" value={booking.priority} darkMode={darkMode} />
          {booking.symptoms && <SummaryRow label="Symptoms" value={booking.symptoms} darkMode={darkMode} />}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={booking.step === 1 ? handleClose : back}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition ${
            darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          {booking.step === 1 ? 'Cancel' : 'Back'}
        </button>

        {booking.step < 4 ? (
          <button
            onClick={next}
            disabled={!canNext()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Booking…' : 'Confirm Booking'}
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </Modal>
  )
}

const SummaryRow = ({ label, value, darkMode }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-400 font-medium">{label}</span>
    <span className={`font-semibold text-right max-w-[60%] ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</span>
  </div>
)

// ─── Main Appointments page ───────────────────────────────────
const Appointments = () => {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const role = user?.role?.toLowerCase()
  const isPatient = role === 'patient'
  const canManage = ['admin', 'administrator', 'receptionist', 'doctor'].includes(role)

  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [showBooking, setShowBooking] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const card = `border rounded-2xl transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`
  const textCls = darkMode ? 'text-white' : 'text-gray-900'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [apptRes, doctorRes] = await Promise.all([
        appointmentService.getAllAppointments(),
        doctorService.getAllDoctors({ limit: 200 }),
      ])
      setAppointments(apptRes.data || [])
      setDoctors(doctorRes.data || [])
    } catch {
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleStatusUpdate = async (id, status) => {
    try {
      await appointmentService.updateAppointmentStatus(id, status)
      toast.success(status === 'Completed' ? 'Marked as Completed — bill auto-generated' : `Marked as ${status}`)
      fetchAll()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleCancel = async (id) => {
    const reason = window.prompt('Cancellation reason (optional):') ?? null
    if (reason === null) return // user pressed Cancel on prompt
    try {
      await appointmentService.cancelAppointment(id, reason || 'Cancelled by user')
      toast.success('Appointment cancelled')
      fetchAll()
    } catch {
      toast.error('Failed to cancel appointment')
    }
  }

  // Client-side filter
  const filtered = appointments.filter(apt => {
    const patName = apt.patient?.userId?.name || ''
    const docName = apt.doctor?.userId?.name || ''
    const matchSearch = !search || [patName, docName, apt.appointmentId].some(s => s.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = !statusFilter || apt.status === statusFilter
    return matchSearch && matchStatus
  })

  const getStatusBadge = (status) => (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[status] || STATUS_COLOR.Scheduled}`}>
      {status}
    </span>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${textCls}`}>
            {isPatient ? 'My Appointments' : 'Appointments'}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isPatient ? 'Your upcoming and past appointments' : 'Manage all patient appointments'}
          </p>
        </div>
        <button
          onClick={() => setShowBooking(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Book Appointment
        </button>
      </div>

      {/* Filters */}
      <div className={`${card} p-4 flex flex-wrap gap-3`}>
        <div className={`flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search patient, doctor, ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`bg-transparent text-sm outline-none flex-1 ${darkMode ? 'text-white placeholder-gray-500' : 'text-gray-900'}`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
        >
          <option value="">All statuses</option>
          {['Scheduled', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'No-Show'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className={`text-sm px-3 py-2 rounded-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading appointments…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className={`font-semibold ${textCls}`}>No appointments found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || statusFilter ? 'Try adjusting your filters' : 'Click "Book Appointment" to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <th className="px-5 py-3 text-left">ID</th>
                  {!isPatient && <th className="px-5 py-3 text-left">Patient</th>}
                  <th className="px-5 py-3 text-left">Doctor</th>
                  <th className="px-5 py-3 text-left">Date & Time</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map(apt => (
                  <tr key={apt._id} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50/80'}`}>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-gray-500">{apt.appointmentId}</span>
                    </td>
                    {!isPatient && (
                      <td className="px-5 py-3.5">
                        <p className={`font-medium text-sm ${textCls}`}>{apt.patient?.userId?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{apt.patient?.patientId}</p>
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      <p className={`font-medium text-sm ${textCls}`}>{apt.doctor?.userId?.name ? drName(apt.doctor.userId.name) : '—'}</p>
                      <p className="text-xs text-gray-400">{apt.doctor?.specialization}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={`text-sm ${textCls}`}>
                        {apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                      <p className="text-xs text-gray-400">{apt.timeSlot?.startTime} – {apt.timeSlot?.endTime}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{apt.type}</span>
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(apt.status)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                          <>
                            {canManage && (
                              <button
                                onClick={() => handleStatusUpdate(apt._id, 'Completed')}
                                title="Mark Completed"
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleCancel(apt._id)}
                              title="Cancel"
                              className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(apt.status === 'Completed' || apt.status === 'Cancelled') && (
                          <span className="text-xs text-gray-400 px-2">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Wizard */}
      <BookingWizard
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
        doctors={doctors}
        isPatient={isPatient}
        onSuccess={fetchAll}
        darkMode={darkMode}
      />
    </div>
  )
}

export default Appointments
