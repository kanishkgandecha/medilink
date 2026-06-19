import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  X, Send, Maximize2, Minimize2,
  CheckCircle2, Stethoscope, Loader2, RotateCcw, CalendarCheck,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { chatWithAssistant } from '../../services/aiService'

import logoIconBgLight from '../../assets/logo/logo-icon-bg-light.png'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = { IDLE: 'idle', DEPT: 'dept', DOCTOR: 'doctor', DATE: 'date', SLOT: 'slot', CONFIRM: 'confirm', DONE: 'done' }
const STEP_ORDER = ['idle', 'dept', 'doctor', 'date', 'slot', 'confirm', 'done']

const DEPARTMENTS = [
  'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics',
  'Dermatology', 'Neurology', 'Gynecology', 'ENT', 'Ophthalmology', 'Psychiatry',
]

const DEPT_SPEC_MAP = {
  'General Medicine': ['general', 'internal medicine', 'family'],
  'Cardiology': ['cardio', 'cardiac', 'heart'],
  'Orthopedics': ['orthopedic', 'ortho', 'bone', 'joint'],
  'Pediatrics': ['pediatric', 'child', 'infant'],
  'Dermatology': ['dermatol', 'skin'],
  'Neurology': ['neurol', 'neuro', 'brain'],
  'Gynecology': ['gynecol', 'obstetric', 'women'],
  'ENT': ['ent', 'ear', 'nose', 'throat'],
  'Ophthalmology': ['ophthal', 'eye'],
  'Psychiatry': ['psychiatr', 'mental', 'psychol'],
}

const INITIAL_BOOKING = {
  step: STEPS.IDLE, department: '', doctorId: '', doctorName: '',
  doctorSpec: '', date: '', startTime: '', endTime: '', confirmLoading: false,
}

const EMERGENCY_KEYWORDS = ['emergency', 'dying', 'heart attack', 'stroke', 'unconscious', "can't breathe", 'severe chest', 'critical']
const BOOKING_KEYWORDS = ['book', 'appointment', 'schedule', 'see a doctor', 'consult', 'visit doctor']

const WELCOME_MSG = {
  id: 1, role: 'bot',
  text: "Hi! I'm MediLink Assistant. I can help you book appointments, answer questions about prescriptions, billing, and more. How can I help?",
}

// ─── Widget Sub-components ────────────────────────────────────────────────────

const DeptChips = ({ onSelect, handled, selected, dm }) => (
  <div className="mt-2 grid grid-cols-2 gap-1.5">
    {DEPARTMENTS.map(d => (
      <button
        key={d}
        disabled={handled}
        onClick={() => !handled && onSelect(d)}
        className={`text-[11px] px-2 py-1.5 rounded-lg border text-left transition-all font-medium ${
          selected === d
            ? 'bg-blue-600 border-blue-600 text-white'
            : handled
              ? dm ? 'border-gray-700 text-gray-600 cursor-default' : 'border-gray-200 text-gray-400 cursor-default'
              : dm ? 'border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-300' : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
        }`}
      >
        {d}
      </button>
    ))}
  </div>
)

const DoctorCards = ({ doctors, loading, onSelect, handled, selected, dm }) => {
  if (loading) return (
    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 py-1">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading doctors…
    </div>
  )
  if (!doctors?.length) return (
    <p className="mt-2 text-xs text-amber-500">No doctors available for this department right now.</p>
  )
  return (
    <div className="mt-2 space-y-1.5">
      {doctors.map(doc => {
        const name = doc.userId?.name || doc.name || 'Unknown'
        const isSelected = selected === doc._id
        return (
          <button
            key={doc._id}
            disabled={handled}
            onClick={() => !handled && onSelect(doc)}
            className={`w-full text-left rounded-xl border p-2.5 transition-all ${
              isSelected
                ? 'bg-blue-600 border-blue-600'
                : handled
                  ? dm ? 'border-gray-700 opacity-40 cursor-default' : 'border-gray-200 opacity-40 cursor-default'
                  : dm ? 'border-gray-700 hover:border-blue-500 hover:bg-gray-800' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-blue-100'}`}>
                <Stethoscope className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-semibold truncate ${isSelected ? 'text-white' : dm ? 'text-white' : 'text-gray-800'}`}>
                  Dr. {name}
                </p>
                <p className={`text-[10px] truncate ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                  {doc.specialization}{doc.consultationFee ? ` • ₹${doc.consultationFee}` : ''}
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

const DatePickerWidget = ({ onSelect, handled, selected, dm }) => {
  const today = new Date()
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i + 1)
    return d
  })
  return (
    <div className="mt-2 grid grid-cols-4 gap-1.5">
      {dates.map(d => {
        const iso = d.toISOString().split('T')[0]
        const isSelected = selected === iso
        return (
          <button
            key={iso}
            disabled={handled}
            onClick={() => !handled && onSelect(iso)}
            className={`text-[10px] py-2 px-1 rounded-xl border transition-all flex flex-col items-center gap-0.5 ${
              isSelected
                ? 'bg-blue-600 border-blue-600 text-white'
                : handled
                  ? dm ? 'border-gray-700 opacity-40 cursor-default' : 'border-gray-200 opacity-40 cursor-default'
                  : dm ? 'border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-300' : 'border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <span className="font-medium">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            <span className="font-bold text-sm leading-none">{d.getDate()}</span>
            <span className={`text-[9px] ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
              {d.toLocaleDateString('en-US', { month: 'short' })}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const SlotGrid = ({ slots, loading, onSelect, handled, selected, dm }) => {
  if (loading) return (
    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 py-1">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking availability…
    </div>
  )
  if (!slots?.length) return (
    <p className="mt-2 text-xs text-amber-500">No slots available on this date. Please pick another date.</p>
  )
  return (
    <div className="mt-2 grid grid-cols-4 gap-1.5">
      {slots.map(slot => (
        <button
          key={slot}
          disabled={handled}
          onClick={() => !handled && onSelect(slot)}
          className={`text-[11px] py-1.5 rounded-lg border transition-all font-medium ${
            selected === slot
              ? 'bg-blue-600 border-blue-600 text-white'
              : handled
                ? dm ? 'border-gray-700 opacity-40 cursor-default' : 'border-gray-200 opacity-40 cursor-default'
                : dm ? 'border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-300' : 'border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          {slot}
        </button>
      ))}
    </div>
  )
}

const ConfirmCard = ({ data, onConfirm, onCancel, loading, handled, dm }) => (
  <div className={`mt-2 rounded-xl border p-3 space-y-2 ${dm ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
    {[
      { label: 'Department', value: data?.department },
      { label: 'Doctor', value: `Dr. ${data?.doctorName}` },
      { label: 'Date', value: data?.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '' },
      { label: 'Time', value: data?.startTime },
    ].map(({ label, value }) => (
      <div key={label} className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{label}</span>
        <span className={`text-[11px] font-semibold ${dm ? 'text-white' : 'text-gray-800'}`}>{value}</span>
      </div>
    ))}
    {!handled && (
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={loading}
          className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${dm ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold flex items-center justify-center gap-1 hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {loading ? 'Booking…' : 'Confirm'}
        </button>
      </div>
    )}
  </div>
)

const SuccessCard = ({ data, dm }) => (
  <div className={`mt-2 rounded-xl border p-3 text-center ${dm ? 'border-emerald-800 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'}`}>
    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
    <p className={`text-sm font-bold ${dm ? 'text-emerald-400' : 'text-emerald-700'}`}>Appointment Booked!</p>
    <p className="text-[11px] text-gray-400 mt-0.5">
      Dr. {data?.doctorName} &bull;{' '}
      {data?.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}{' '}
      at {data?.startTime}
    </p>
  </div>
)

// ─── Main Component ───────────────────────────────────────────────────────────

const FloatingChatbot = () => {
  const { darkMode: dm } = useTheme()
  const navigate = useNavigate()

  const [open, setOpen]           = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [messages, setMessages]   = useState([WELCOME_MSG])
  const [input, setInput]         = useState('')
  const [typing, setTyping]       = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const [booking, setBooking]     = useState(INITIAL_BOOKING)
  const [chatHistory, setChatHistory] = useState([])

  // Mobile detection + slide animation
  const [isMobile, setIsMobile]     = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [sheetSlid, setSheetSlid]   = useState(false)

  const endRef   = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Slide-up animation: mount with translate-y-full, then transition to translate-y-0
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setSheetSlid(true))
      return () => cancelAnimationFrame(id)
    } else {
      setSheetSlid(false)
    }
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  // ── Message helpers ──────────────────────────────────────────────────────

  const addBotMsg = useCallback((text, widget = null) => {
    const id = Date.now() + Math.random()
    setMessages(prev => [...prev, { id, role: 'bot', text, ...(widget && { widget }) }])
    return id
  }, [])

  const addUserMsg = (text) => setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'user', text }])

  const updateMsgWidget = (id, updates) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, widget: { ...m.widget, ...updates } } : m))

  const markLastWidgetHandled = (selected) =>
    setMessages(prev => {
      const copy = [...prev]
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].widget && !copy[i].widget.handled) {
          copy[i] = { ...copy[i], widget: { ...copy[i].widget, handled: true, selected } }
          break
        }
      }
      return copy
    })

  const updateLastConfirmWidget = (updates) =>
    setMessages(prev => {
      const copy = [...prev]
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].widget?.type === 'confirm-card') {
          copy[i] = { ...copy[i], widget: { ...copy[i].widget, ...updates } }
          break
        }
      }
      return copy
    })

  // ── Booking flow ─────────────────────────────────────────────────────────

  const startBookingFlow = useCallback(() => {
    setShowQuick(false)
    setBooking(prev => ({ ...prev, step: STEPS.DEPT }))
    setMessages(prev => [...prev, {
      id: Date.now(), role: 'bot',
      text: 'Which department would you like to book an appointment in?',
      widget: { type: 'dept-chips', handled: false },
    }])
  }, [])

  const handleDeptSelect = async (dept) => {
    markLastWidgetHandled(dept)
    addUserMsg(dept)
    setBooking(prev => ({ ...prev, department: dept, step: STEPS.DOCTOR }))

    const specs = DEPT_SPEC_MAP[dept] || [dept.toLowerCase()]
    const msgId = Date.now() + Math.random()
    setMessages(prev => [...prev, {
      id: msgId, role: 'bot',
      text: `Great! Here are available doctors in ${dept}:`,
      widget: { type: 'doctor-cards', handled: false, loading: true, data: [] },
    }])

    try {
      const res = await api.get('/doctors', { params: { limit: 100, isAvailable: true } })
      const all = res?.data?.doctors || res?.data || res || []
      const filtered = (Array.isArray(all) ? all : []).filter(d => {
        const spec = (d.specialization || '').toLowerCase()
        return specs.some(s => spec.includes(s))
      })
      updateMsgWidget(msgId, { loading: false, data: filtered.slice(0, 5) })
    } catch {
      updateMsgWidget(msgId, { loading: false, data: [] })
    }
  }

  const handleDoctorSelect = (doc) => {
    const name = doc.userId?.name || doc.name || 'Unknown'
    markLastWidgetHandled(doc._id)
    addUserMsg(`Dr. ${name}`)
    setBooking(prev => ({ ...prev, doctorId: doc._id, doctorName: name, doctorSpec: doc.specialization, step: STEPS.DATE }))
    setMessages(prev => [...prev, {
      id: Date.now(), role: 'bot',
      text: `Dr. ${name} is available. Please choose a date:`,
      widget: { type: 'date-picker', handled: false },
    }])
  }

  const handleDateSelect = async (date) => {
    markLastWidgetHandled(date)
    const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    addUserMsg(displayDate)

    let currentDoctorId = ''
    setBooking(prev => { currentDoctorId = prev.doctorId; return { ...prev, date, step: STEPS.SLOT } })

    const msgId = Date.now() + Math.random()
    setMessages(prev => [...prev, {
      id: msgId, role: 'bot',
      text: `Available slots for ${displayDate}:`,
      widget: { type: 'slot-grid', handled: false, loading: true, data: [] },
    }])

    try {
      const res = await api.get(`/appointments/availability/${currentDoctorId}`, { params: { date } })
      const slots = res?.data?.availableSlots || res?.availableSlots || []
      updateMsgWidget(msgId, { loading: false, data: slots })
    } catch {
      const fallback = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00']
      updateMsgWidget(msgId, { loading: false, data: fallback })
    }
  }

  const handleSlotSelect = (slot) => {
    markLastWidgetHandled(slot)
    addUserMsg(slot)

    setBooking(prev => {
      const [sh, sm] = slot.split(':').map(Number)
      const endH = sm >= 30 ? sh + 1 : sh
      const endM = (sm + 30) % 60
      const endSlot = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
      const updated = { ...prev, startTime: slot, endTime: endSlot, step: STEPS.CONFIRM }

      setTimeout(() => setMessages(msgs => [...msgs, {
        id: Date.now(), role: 'bot',
        text: 'Please confirm your appointment:',
        widget: {
          type: 'confirm-card', handled: false,
          data: { department: prev.department, doctorName: prev.doctorName, date: prev.date, startTime: slot },
        },
      }]), 0)

      return updated
    })
  }

  const handleConfirm = async () => {
    updateLastConfirmWidget({ loading: true })
    const { doctorId, date, startTime, endTime, doctorName } = booking

    try {
      await api.post('/appointments', {
        doctor: doctorId,
        appointmentDate: date,
        timeSlot: { startTime, endTime },
        type: 'Consultation',
        priority: 'Normal',
      })
      updateLastConfirmWidget({ loading: false, handled: true, confirmed: true })
      setMessages(prev => [
        ...prev,
        { id: Date.now(), role: 'bot', text: 'Your appointment is confirmed!', widget: { type: 'success-card', data: { doctorName, date, startTime } } },
        { id: Date.now() + 1, role: 'bot', text: 'Is there anything else I can help you with?' },
      ])
      setBooking(INITIAL_BOOKING)
      setShowQuick(true)
    } catch {
      updateLastConfirmWidget({ loading: false })
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'bot',
        text: "Sorry, I couldn't complete the booking. Please try the Appointments page directly.",
      }])
      setBooking(INITIAL_BOOKING)
    }
  }

  const handleCancelBooking = () => {
    updateLastConfirmWidget({ handled: true })
    setBooking(INITIAL_BOOKING)
    setMessages(prev => [...prev, { id: Date.now(), role: 'bot', text: 'Booking cancelled. How else can I help?' }])
    setShowQuick(true)
  }

  const cancelBookingFromHeader = () => {
    setBooking(INITIAL_BOOKING)
    setMessages(prev => [...prev, { id: Date.now(), role: 'bot', text: 'Booking cancelled. How else can I help?' }])
    setShowQuick(true)
  }

  // ── Chat send ────────────────────────────────────────────────────────────

  const sendMessage = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg) return
    setInput('')
    setShowQuick(false)
    addUserMsg(msg)

    const lower = msg.toLowerCase()

    if (EMERGENCY_KEYWORDS.some(k => lower.includes(k))) {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'bot',
        text: '🚨 This sounds like a medical emergency! Please call 112 immediately or go to the nearest Emergency Room. Do not wait.',
      }])
      return
    }

    if (lower === 'cancel' && booking.step !== STEPS.IDLE) {
      cancelBookingFromHeader()
      return
    }

    if (BOOKING_KEYWORDS.some(k => lower.includes(k)) && booking.step === STEPS.IDLE) {
      setTyping(true)
      setTimeout(() => { setTyping(false); startBookingFlow() }, 400)
      return
    }

    if (booking.step !== STEPS.IDLE) {
      setMessages(prev => [...prev, { id: Date.now(), role: 'bot', text: "Please complete your booking above, or type 'cancel' to start over." }])
      return
    }

    setTyping(true)
    try {
      const res = await chatWithAssistant(msg, chatHistory.slice(-6))
      const ai = res?.data || res
      const reply = ai?.reply || ai?.message || "I'm here to help with anything health-related!"
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: reply },
      ])
      const widgetId = Date.now()
      setMessages(prev => [...prev, {
        id: widgetId, role: 'bot', text: reply,
        ...(ai?.actions?.length && { widget: { type: 'ai-actions', handled: false, data: ai.actions, msgId: widgetId } }),
      }])
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), role: 'bot', text: "I'm having a bit of trouble right now. Please try again in a moment." }])
    } finally {
      setTyping(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Widget renderer ──────────────────────────────────────────────────────

  const renderWidget = (widget, msgId) => {
    if (!widget) return null
    switch (widget.type) {
      case 'dept-chips':
        return <DeptChips onSelect={handleDeptSelect} handled={widget.handled} selected={widget.selected} dm={dm} />
      case 'doctor-cards':
        return <DoctorCards doctors={widget.data} loading={widget.loading} onSelect={handleDoctorSelect} handled={widget.handled} selected={widget.selected} dm={dm} />
      case 'date-picker':
        return <DatePickerWidget onSelect={handleDateSelect} handled={widget.handled} selected={widget.selected} dm={dm} />
      case 'slot-grid':
        return <SlotGrid slots={widget.data} loading={widget.loading} onSelect={handleSlotSelect} handled={widget.handled} selected={widget.selected} dm={dm} />
      case 'confirm-card':
        return <ConfirmCard data={widget.data} onConfirm={handleConfirm} onCancel={handleCancelBooking} loading={widget.loading} handled={widget.handled} dm={dm} />
      case 'success-card':
        return <SuccessCard data={widget.data} dm={dm} />
      case 'ai-actions':
        return widget.handled || !widget.data?.length ? null : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {widget.data.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  navigate(action.route)
                  setMessages(prev => prev.map(m => m.id === msgId ? { ...m, widget: { ...m.widget, handled: true } } : m))
                }}
                className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition ${
                  dm ? 'border-blue-700 text-blue-400 hover:bg-blue-900/30' : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )
      default: return null
    }
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  const stepIndex   = STEP_ORDER.indexOf(booking.step)
  const progressPct = booking.step !== STEPS.IDLE ? Math.min((stepIndex / 5) * 100, 100) : 0

  const desktopPanelStyle = {
    width:     expanded ? '520px' : '420px',
    height:    expanded ? '80vh'  : '580px',
    maxWidth:  'calc(100vw - 24px)',
    maxHeight: 'calc(100vh - 100px)',
    boxShadow: dm ? '0 32px 64px rgba(0,0,0,0.7)' : '0 32px 64px rgba(0,0,0,0.18)',
  }

  // ── Shared panel internals ────────────────────────────────────────────────

  const panelHeader = (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
          <img src={logoIconBgLight} alt="MediLink" className="w-full h-full object-cover" draggable={false} />
        </div>
        <div>
          <p className="text-white text-sm font-bold leading-none">MediLink Assistant</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-blue-200 text-[10px]">AI-powered • Always available</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Expand/minimize — desktop only */}
        {!isMobile && (
          <button
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Minimize' : 'Expand'}
            className="text-white/70 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10"
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
        {booking.step !== STEPS.IDLE && (
          <button
            onClick={cancelBookingFromHeader}
            title="Cancel booking"
            className="text-white/70 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setOpen(false)}
          className="text-white/70 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  const bookingProgress = booking.step !== STEPS.IDLE && (
    <div className={`px-4 py-2 flex-shrink-0 border-b ${dm ? 'border-gray-800 bg-gray-900/60' : 'border-gray-100 bg-blue-50/60'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Booking in progress</span>
        <span className="text-[10px] text-gray-400">{stepIndex}/5 steps</span>
      </div>
      <div className={`h-1 rounded-full overflow-hidden ${dm ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )

  const messageList = (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map(msg => (
        <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          {msg.role === 'bot' && (
            <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 mt-0.5">
              <img src={logoIconBgLight} alt="" aria-hidden="true" className="w-full h-full object-cover" draggable={false} />
            </div>
          )}
          <div className={`flex-1 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            <div
              className={`inline-block max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-tr-sm'
                  : dm
                    ? 'bg-gray-800 text-gray-200 rounded-tl-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                }`}
            >
              {msg.text}
            </div>
            {msg.widget && (
              <div className={msg.role === 'bot' ? '' : 'flex justify-end'}>
                {renderWidget(msg.widget, msg.id)}
              </div>
            )}
          </div>
        </div>
      ))}

      {typing && (
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
            <img src={logoIconBgLight} alt="" aria-hidden="true" className="w-full h-full object-cover" draggable={false} />
          </div>
          <div className={`px-3.5 py-3 rounded-2xl rounded-tl-sm ${dm ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )

  const quickReplies = showQuick && !typing && (
    <div className={`px-4 pb-3 pt-3 flex flex-wrap gap-2 flex-shrink-0 border-t ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
      <button
        onClick={startBookingFlow}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold hover:from-blue-700 hover:to-cyan-700 transition shadow-sm shadow-blue-500/25"
      >
        <CalendarCheck className="w-3.5 h-3.5" /> Book Appointment
      </button>
      {['My prescriptions', 'Billing info', 'Emergency help'].map(q => (
        <button
          key={q}
          onClick={() => sendMessage(q)}
          className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition ${
            dm ? 'border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-400' : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {q}
        </button>
      ))}
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Mobile: backdrop ────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-[58] md:hidden transition-opacity duration-300
          bg-black/50 backdrop-blur-[2px]
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      {/* ── Mobile: slide-up sheet ───────────────────────────────────────────── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[60] flex flex-col md:hidden overflow-hidden
          rounded-t-[28px] transition-transform duration-300 ease-out will-change-transform
          ${sheetSlid && open ? 'translate-y-0' : 'translate-y-full'}
          ${dm ? 'bg-gray-900' : 'bg-white'}`}
        style={{ height: '92svh' }}
      >
        {/* Drag handle — tap to close */}
        <button
          onClick={() => setOpen(false)}
          className="flex justify-center py-2.5 flex-shrink-0 w-full"
          aria-label="Close assistant"
        >
          <div className={`w-10 h-[5px] rounded-full ${dm ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </button>

        {panelHeader}
        {bookingProgress}
        {messageList}
        {quickReplies}

        {/* Mobile input — with safe-area bottom padding */}
        <div
          className={`flex items-center gap-2.5 px-3.5 border-t flex-shrink-0
            ${dm ? 'border-gray-800' : 'border-gray-100'}`}
          style={{ paddingTop: '12px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={booking.step !== STEPS.IDLE ? "Type 'cancel' to exit booking…" : "Ask me anything…"}
            className={`flex-1 text-[13px] px-3.5 py-2.5 rounded-xl border outline-none
              focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all
              ${dm ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            className="w-10 h-10 flex items-center justify-center rounded-xl
              bg-gradient-to-br from-blue-600 to-cyan-600 text-white
              disabled:opacity-40 hover:from-blue-700 hover:to-cyan-700
              transition-all active:scale-95 flex-shrink-0 shadow-sm shadow-blue-500/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Desktop: floating panel (unchanged behavior) ─────────────────────── */}
      {open && (
        <div
          className={`fixed bottom-24 right-6 z-50 hidden md:flex flex-col rounded-2xl border overflow-hidden transition-all duration-300
            ${dm ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
          style={desktopPanelStyle}
        >
          {panelHeader}
          {bookingProgress}
          {messageList}
          {quickReplies}

          {/* Desktop input */}
          <div className={`flex items-center gap-2.5 px-3.5 py-3 border-t flex-shrink-0
            ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
            <input
              ref={!isMobile ? inputRef : undefined}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={booking.step !== STEPS.IDLE ? "Type 'cancel' to exit booking…" : "Ask me anything…"}
              className={`flex-1 text-[13px] px-3.5 py-2.5 rounded-xl border outline-none
                focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all
                ${dm ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || typing}
              className="w-10 h-10 flex items-center justify-center rounded-xl
                bg-gradient-to-br from-blue-600 to-cyan-600 text-white
                disabled:opacity-40 hover:from-blue-700 hover:to-cyan-700
                transition-all active:scale-95 flex-shrink-0 shadow-sm shadow-blue-500/30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      {/* Mobile: sits above bottom nav (~80px); Desktop: bottom-6 */}
      <div className="fixed right-6 z-[55] bottom-[5.5rem] md:bottom-6">
        {!open && (
          <span className="absolute inset-0 rounded-full bg-[#2E86DE] opacity-25 animate-ping"
            style={{ animationDuration: '2.5s' }} />
        )}
        <button
          onClick={() => setOpen(v => !v)}
          title="MediLink Assistant"
          className={`relative w-14 h-14 rounded-full flex items-center justify-center
            transition-all duration-300 hover:scale-110 active:scale-95
            ${open ? 'bg-gradient-to-br from-gray-600 to-gray-700' : 'bg-[#2E86DE]'}`}
          style={{ boxShadow: open ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(46,134,222,0.55)' }}
        >
          {open
            ? <X className="w-6 h-6 text-white" />
            : <img src={logoIconBgLight} alt="MediLink Assistant" className="w-8 h-8 rounded-xl object-cover" draggable={false} />
          }
        </button>
      </div>
    </>
  )
}

export default FloatingChatbot
