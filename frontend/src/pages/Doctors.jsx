import React, { useState, useEffect } from 'react'
import {
  Plus, Edit, Trash2, Calendar, Clock, Star,
  Filter, UserPlus, Stethoscope, X, Search, ChevronRight,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import StatCard from '../components/common/StatCard'
import CardPagination, { paginateData, CARDS_PER_PAGE } from '../components/common/CardPagination'
import PageLayout from '../components/common/PageLayout'
import { SkeletonDashboard } from '../components/common/SkeletonCard'
import * as doctorService from '../services/doctorService'
import { toast } from 'react-toastify'

const EMPTY_FORM = {
  name: '', email: '', phone: '', gender: '', dateOfBirth: '',
  specialization: '', qualification: '', experience: '',
  licenseNumber: '', department: '', consultationFee: '', availability: []
}

const EMPTY_SCHEDULE = {
  monday:    { available: false, startTime: '09:00', endTime: '17:00' },
  tuesday:   { available: false, startTime: '09:00', endTime: '17:00' },
  wednesday: { available: false, startTime: '09:00', endTime: '17:00' },
  thursday:  { available: false, startTime: '09:00', endTime: '17:00' },
  friday:    { available: false, startTime: '09:00', endTime: '17:00' },
  saturday:  { available: false, startTime: '09:00', endTime: '14:00' },
  sunday:    { available: false, startTime: '09:00', endTime: '14:00' }
}

// ── DoctorCard ────────────────────────────────────────────────────────────────
const DoctorCard = ({ doc, canManage, onSchedule, onEdit, onDelete, darkMode }) => {
  const name     = doc.userId?.name || 'Unknown'
  const email    = doc.userId?.email || ''
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const rating   = (doc.rating || 0).toFixed(1)
  const fee      = doc.consultationFee?.toLocaleString('en-IN') || '0'

  const cardBase = `border rounded-xl p-5 transition-all duration-200 ${darkMode
    ? 'bg-gray-800 border-gray-700/60 hover:border-gray-500/60'
    : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(46,134,222,0.10)] hover:border-[#2E86DE]/20'}`

  return (
    <div className={cardBase}>
      {/* Top row */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2E86DE] to-[#1ABC9C] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-[0_2px_8px_rgba(46,134,222,0.3)]">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm leading-tight ${darkMode ? 'text-white' : 'text-[#1e293b]'}`}>{name}</p>
          <p className={`text-xs mt-0.5 truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{email}</p>
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0
          ${doc.isAvailable
            ? darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            : darkMode ? 'bg-red-900/30 text-red-400'     : 'bg-red-50 text-red-500'}`}>
          {doc.isAvailable ? 'Available' : 'Unavailable'}
        </span>
      </div>

      {/* Specialization + Department */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {doc.specialization && (
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium
            ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-[#EBF5FB] text-[#2E86DE]'}`}>
            {doc.specialization}
          </span>
        )}
        {doc.department && (
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium
            ${darkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
            {doc.department}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className={`grid grid-cols-3 gap-2 mb-4 py-3 border-t border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="text-center">
          <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#1e293b]'}`}>{doc.experience || 0}y</p>
          <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Experience</p>
        </div>
        <div className="text-center">
          <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#1e293b]'}`}>₹{fee}</p>
          <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Consult Fee</p>
        </div>
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#1e293b]'}`}>{rating}</p>
          </div>
          <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Rating</p>
        </div>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSchedule(doc)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
              ${darkMode ? 'bg-gray-700 text-emerald-400 hover:bg-emerald-900/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
          >
            <Calendar className="w-3.5 h-3.5" /> Schedule
          </button>
          <button
            onClick={() => onEdit(doc)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
              ${darkMode ? 'bg-gray-700 text-[#2E86DE] hover:bg-blue-900/30' : 'bg-[#EBF5FB] text-[#2E86DE] hover:bg-blue-100'}`}
          >
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={() => onDelete(doc._id)}
            className={`p-2 rounded-lg transition-all
              ${darkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-500 hover:bg-red-50'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const Doctors = () => {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const canManage = ['Admin', 'Receptionist'].includes(user?.role) || ['Admin', 'Receptionist'].includes(user?.subRole)

  const [doctors, setDoctors]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [showAddModal, setShowAddModal]   = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [formData, setFormData]           = useState(EMPTY_FORM)
  const [scheduleData, setScheduleData]   = useState(EMPTY_SCHEDULE)
  const [search, setSearch]               = useState('')
  const [filterDept, setFilterDept]       = useState('')
  const [filterAvailability, setFilterAvailability] = useState('')
  const [filterExp, setFilterExp]         = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [page, setPage]                   = useState(1)

  const textCls = darkMode ? 'text-white' : 'text-[#2C3E50]'
  const subCls  = 'text-[#7B8A8B]'

  useEffect(() => { fetchDoctors() }, [])

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const data = await doctorService.getAllDoctors({ limit: 200 })
      setDoctors(data.data || [])
    } catch { toast.error('Failed to fetch doctors') }
    finally { setLoading(false) }
  }

  const field = (key, value) => setFormData(f => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    if (!formData.specialization) { toast.error('Specialization is required'); return }
    if (!selectedDoctor && (!formData.name || !formData.email || !formData.phone)) {
      toast.error('Name, email and phone are required'); return
    }
    setSubmitting(true)
    try {
      if (selectedDoctor) {
        await doctorService.updateDoctor(selectedDoctor._id, {
          specialization: formData.specialization, qualification: formData.qualification,
          experience: formData.experience, department: formData.department, consultationFee: formData.consultationFee
        })
        toast.success('Doctor updated successfully')
      } else {
        await doctorService.createDoctor(formData)
        toast.success('Doctor created. Default password is their phone number.')
      }
      setShowAddModal(false); setFormData(EMPTY_FORM); setSelectedDoctor(null); fetchDoctors()
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Operation failed') }
    finally { setSubmitting(false) }
  }

  const handleScheduleUpdate = async () => {
    try {
      const availabilityArray = Object.keys(scheduleData)
        .filter(day => scheduleData[day].available)
        .map(day => ({ day: day.charAt(0).toUpperCase() + day.slice(1), slots: [{ startTime: scheduleData[day].startTime, endTime: scheduleData[day].endTime, isAvailable: true }] }))
      await doctorService.updateDoctorSchedule(selectedDoctor._id, availabilityArray)
      toast.success('Schedule updated successfully')
      setShowScheduleModal(false); fetchDoctors()
    } catch { toast.error('Failed to update schedule') }
  }

  const handleDelete = async (id) => {
    try { await doctorService.deleteDoctor(id); toast.success('Doctor deleted'); fetchDoctors() }
    catch { toast.error('Failed to delete doctor') }
  }

  const openEdit = (doc) => {
    setSelectedDoctor(doc)
    setFormData({ ...EMPTY_FORM, specialization: doc.specialization || '', qualification: doc.qualification || '', experience: doc.experience || '', licenseNumber: doc.licenseNumber || '', department: doc.department || '', consultationFee: doc.consultationFee || '' })
    setShowAddModal(true)
  }

  const filtered = doctors.filter(d => {
    if (search && !`${d.userId?.name} ${d.specialization} ${d.department}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filterDept && d.department !== filterDept) return false
    if (filterAvailability === 'available' && !d.isAvailable) return false
    if (filterAvailability === 'unavailable' && d.isAvailable) return false
    if (filterExp === '0-5' && d.experience > 5) return false
    if (filterExp === '5-10' && (d.experience < 5 || d.experience > 10)) return false
    if (filterExp === '10+' && d.experience < 10) return false
    return true
  })

  const pageDocs = paginateData(filtered, page)

  const resetFilters = () => { setSearch(''); setFilterDept(''); setFilterAvailability(''); setFilterExp(''); setPage(1) }
  const hasFilters = search || filterDept || filterAvailability || filterExp

  const inp = `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'}`
  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`

  if (loading) return <SkeletonDashboard />

  const leftPanel = (
    <div className="space-y-3">
      <StatCard title="Total Doctors"    value={doctors.length}
        icon={UserPlus}    iconBg="bg-blue-50 text-[#2E86DE]"
        onClick={() => { resetFilters() }} />
      <StatCard title="Available Today"  value={doctors.filter(d => d.isAvailable).length}
        icon={Clock}       iconBg="bg-emerald-50 text-emerald-600"
        onClick={() => { setFilterAvailability(filterAvailability === 'available' ? '' : 'available'); setPage(1) }} />
      <StatCard title="Specializations"  value={new Set(doctors.map(d => d.specialization).filter(Boolean)).size}
        icon={Stethoscope} iconBg="bg-violet-50 text-violet-600" />
      <StatCard title="Avg Rating"       value={doctors.length ? (doctors.reduce((s, d) => s + (d.rating || 0), 0) / doctors.length).toFixed(1) : '0.0'}
        icon={Star}        iconBg="bg-orange-50 text-orange-600" />
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textCls}`}>Doctor Management</h1>
          <p className={`text-sm mt-0.5 ${subCls}`}>Manage doctor profiles and schedules</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setSelectedDoctor(null); setFormData(EMPTY_FORM); setShowAddModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" /> Add Doctor
          </button>
        )}
      </div>

      <PageLayout leftPanel={leftPanel}>

      {/* Search + Filters */}
      <div className={`border rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center
        ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className={`flex items-center gap-2 flex-1 min-w-[180px] max-w-xs px-3 py-1.5 rounded-lg border
          ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search doctors…"
            className="bg-transparent text-sm outline-none flex-1 min-w-0"
          />
          {search && <button onClick={() => { setSearch(''); setPage(1) }}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {[
          { value: filterDept, setter: v => { setFilterDept(v); setPage(1) }, placeholder: 'All Departments', options: [...new Set(doctors.map(d => d.department).filter(Boolean))].sort() },
          { value: filterAvailability, setter: v => { setFilterAvailability(v); setPage(1) }, placeholder: 'All Availability', options: [{ v: 'available', l: 'Available' }, { v: 'unavailable', l: 'Unavailable' }], obj: true },
          { value: filterExp, setter: v => { setFilterExp(v); setPage(1) }, placeholder: 'Any Experience', options: [{ v: '0-5', l: '0–5 years' }, { v: '5-10', l: '5–10 years' }, { v: '10+', l: '10+ years' }], obj: true },
        ].map((f, i) => (
          <select key={i} value={f.value} onChange={e => f.setter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-sm focus:outline-none transition-all
              ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
            <option value="">{f.placeholder}</option>
            {f.obj ? f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>) : f.options.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        {hasFilters && (
          <button onClick={resetFilters}
            className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <span className={`text-xs tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'} ${!hasFilters ? 'ml-auto' : ''}`}>
          {filtered.length} doctor{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 rounded-xl border
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <UserPlus className="w-10 h-10 text-gray-300 mb-3" />
          <p className={`font-medium ${textCls}`}>No doctors found</p>
          <p className={`text-sm mt-1 ${subCls}`}>{hasFilters ? 'Try adjusting your filters' : 'Add your first doctor to get started'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pageDocs.map(doc => (
              <DoctorCard
                key={doc._id}
                doc={doc}
                canManage={canManage}
                onSchedule={d => { setSelectedDoctor(d); setShowScheduleModal(true) }}
                onEdit={openEdit}
                onDelete={id => setConfirmDelete(id)}
                darkMode={darkMode}
              />
            ))}
          </div>
          <CardPagination
            total={filtered.length}
            page={page}
            onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        </>
      )}

      </PageLayout>

      {/* Add / Edit Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={selectedDoctor ? 'Edit Doctor' : 'Add New Doctor'} size="lg">
        <div className="space-y-5">
          {!selectedDoctor && (
            <>
              <div className={`rounded-xl p-3 text-sm ${darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                Default password will be the doctor's phone number.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={lbl}>Full Name *</label><input type="text" value={formData.name} onChange={e => field('name', e.target.value)} className={inp} placeholder="Dr. Priya Sharma" /></div>
                <div><label className={lbl}>Email *</label><input type="email" value={formData.email} onChange={e => field('email', e.target.value)} className={inp} placeholder="doctor@hospital.com" /></div>
                <div><label className={lbl}>Phone * (default password)</label><input type="tel" value={formData.phone} onChange={e => field('phone', e.target.value)} className={inp} placeholder="9876543210" /></div>
                <div><label className={lbl}>Gender</label>
                  <select value={formData.gender} onChange={e => field('gender', e.target.value)} className={inp}>
                    <option value="">Select Gender</option>
                    {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <hr className={darkMode ? 'border-gray-700' : 'border-gray-200'} />
            </>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={lbl}>Specialization *</label>
              <select value={formData.specialization} onChange={e => field('specialization', e.target.value)} className={inp}>
                <option value="">Select Specialization</option>
                {['Cardiology','Neurology','Orthopedics','Pediatrics','Dermatology','Gynecology','ENT','General Surgery','General Medicine','Psychiatry','Radiology','Oncology','Urology','Nephrology'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Department *</label>
              <select value={formData.department} onChange={e => field('department', e.target.value)} className={inp}>
                <option value="">Select Department</option>
                {['Cardiology','Neurology','Orthopedics','Pediatrics','Emergency','General Medicine','ICU','Surgery','Radiology','Oncology'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Qualification *</label><input type="text" value={formData.qualification} onChange={e => field('qualification', e.target.value)} className={inp} placeholder="MBBS, MD Cardiology" /></div>
            <div><label className={lbl}>Experience (Years)</label><input type="number" min="0" max="60" value={formData.experience} onChange={e => field('experience', e.target.value)} className={inp} placeholder="10" /></div>
            <div><label className={lbl}>License Number</label><input type="text" value={formData.licenseNumber} onChange={e => field('licenseNumber', e.target.value)} className={inp} placeholder="LIC123456" disabled={!!selectedDoctor} /></div>
            <div><label className={lbl}>Consultation Fee (₹)</label><input type="number" min="0" value={formData.consultationFee} onChange={e => field('consultationFee', e.target.value)} className={inp} placeholder="500" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAddModal(false)} className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-5 py-2.5 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] active:scale-[0.97] transition-all disabled:opacity-60">
              {submitting ? 'Saving…' : (selectedDoctor ? 'Update Doctor' : 'Add Doctor')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title={`Schedule – ${selectedDoctor?.userId?.name || 'Doctor'}`} size="lg">
        <div className="space-y-3">
          {Object.keys(scheduleData).map(day => (
            <div key={day} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-3 mb-2">
                <input type="checkbox" checked={scheduleData[day].available}
                  onChange={e => setScheduleData(s => ({ ...s, [day]: { ...s[day], available: e.target.checked } }))}
                  className="w-4 h-4 text-[#2E86DE] rounded" />
                <label className={`text-sm font-semibold capitalize ${darkMode ? 'text-white' : 'text-gray-800'}`}>{day}</label>
              </div>
              {scheduleData[day].available && (
                <div className="grid grid-cols-2 gap-3 ml-7">
                  <div><label className="block text-xs text-gray-500 mb-1">Start</label><input type="time" value={scheduleData[day].startTime} onChange={e => setScheduleData(s => ({ ...s, [day]: { ...s[day], startTime: e.target.value } }))} className={inp} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">End</label><input type="time" value={scheduleData[day].endTime} onChange={e => setScheduleData(s => ({ ...s, [day]: { ...s[day], endTime: e.target.value } }))} className={inp} /></div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setShowScheduleModal(false)} className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
          <button onClick={handleScheduleUpdate} className="px-5 py-2.5 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all">Update Schedule</button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
        title="Delete Doctor"
        message="This will permanently remove the doctor and their associated data."
        confirmLabel="Delete"
      />
    </div>
  )
}

export default Doctors
