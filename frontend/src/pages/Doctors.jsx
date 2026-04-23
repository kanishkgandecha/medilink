import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, Clock, Star, Filter, UserPlus, Stethoscope, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import TableComponent from '../components/common/TableComponent'
import Modal from '../components/common/Modal'
import StatCard from '../components/common/StatCard'
import { SkeletonDashboard } from '../components/common/SkeletonCard'
import * as doctorService from '../services/doctorService'
import { toast } from 'react-toastify'

const EMPTY_FORM = {
  // User fields (only used when creating new)
  name: '',
  email: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  // Doctor profile fields
  specialization: '',
  qualification: '',
  experience: '',
  licenseNumber: '',
  department: '',
  consultationFee: '',
  availability: []
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

const Doctors = () => {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const canManage = ['Admin', 'Receptionist'].includes(user?.role) || ['Admin', 'Receptionist'].includes(user?.subRole)
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [scheduleData, setScheduleData] = useState(EMPTY_SCHEDULE)
  const [filterDept, setFilterDept] = useState('')
  const [filterAvailability, setFilterAvailability] = useState('')
  const [filterExp, setFilterExp] = useState('')

  useEffect(() => { fetchDoctors() }, [])

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const data = await doctorService.getAllDoctors({ limit: 200 })
      setDoctors(data.data || [])
    } catch {
      toast.error('Failed to fetch doctors')
    } finally {
      setLoading(false)
    }
  }

  const field = (key, value) => setFormData(f => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    if (!formData.specialization) {
      toast.error('Specialization is required')
      return
    }
    if (!selectedDoctor && (!formData.name || !formData.email || !formData.phone)) {
      toast.error('Name, email and phone are required')
      return
    }
    setSubmitting(true)
    try {
      if (selectedDoctor) {
        await doctorService.updateDoctor(selectedDoctor._id, {
          specialization: formData.specialization,
          qualification: formData.qualification,
          experience: formData.experience,
          department: formData.department,
          consultationFee: formData.consultationFee
        })
        toast.success('Doctor updated successfully')
      } else {
        await doctorService.createDoctor(formData)
        toast.success('Doctor created. Default password is their phone number.')
      }
      setShowAddModal(false)
      setFormData(EMPTY_FORM)
      setSelectedDoctor(null)
      fetchDoctors()
    } catch (err) {
      toast.error(err.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleScheduleUpdate = async () => {
    try {
      const availabilityArray = Object.keys(scheduleData)
        .filter(day => scheduleData[day].available)
        .map(day => ({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          slots: [{ startTime: scheduleData[day].startTime, endTime: scheduleData[day].endTime, isAvailable: true }]
        }))
      await doctorService.updateDoctorSchedule(selectedDoctor._id, availabilityArray)
      toast.success('Schedule updated successfully')
      setShowScheduleModal(false)
      fetchDoctors()
    } catch {
      toast.error('Failed to update schedule')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this doctor? This cannot be undone.')) return
    try {
      await doctorService.deleteDoctor(id)
      toast.success('Doctor deleted successfully')
      fetchDoctors()
    } catch {
      toast.error('Failed to delete doctor')
    }
  }

  const inp = `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 ${
    darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'
  }`
  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`

  const columns = [
    {
      header: 'Doctor',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-semibold text-sm">
            {row.userId?.name ? row.userId.name.split(' ').map(n => n[0]).join('').slice(0,2) : 'Dr'}
          </div>
          <div>
            <p className="font-semibold">{row.userId?.name || 'N/A'}</p>
            <p className="text-xs text-gray-500">{row.userId?.email || 'N/A'}</p>
          </div>
        </div>
      )
    },
    { header: 'Specialization', accessor: 'specialization' },
    { header: 'Department', accessor: 'department' },
    {
      header: 'Experience',
      accessor: 'experience',
      render: (row) => <span>{row.experience} yrs</span>
    },
    {
      header: 'Fee',
      accessor: 'consultationFee',
      render: (row) => (
        <span className="font-semibold text-green-600">₹{row.consultationFee?.toLocaleString('en-IN') || '0'}</span>
      )
    },
    {
      header: 'Rating',
      accessor: 'rating',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold">{(row.rating || 0).toFixed(1)}</span>
        </div>
      )
    },
    ...(canManage ? [{
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => { setSelectedDoctor(row); setShowScheduleModal(true) }}
            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
            title="Manage Schedule"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedDoctor(row)
              setFormData({
                ...EMPTY_FORM,
                specialization: row.specialization || '',
                qualification: row.qualification || '',
                experience: row.experience || '',
                licenseNumber: row.licenseNumber || '',
                department: row.department || '',
                consultationFee: row.consultationFee || ''
              })
              setShowAddModal(true)
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
            title="Edit Doctor"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            title="Delete Doctor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }] : [])
  ]

  const filtered = doctors.filter(d => {
    if (filterDept && d.department !== filterDept) return false
    if (filterAvailability === 'available' && !d.isAvailable) return false
    if (filterAvailability === 'unavailable' && d.isAvailable) return false
    if (filterExp === '0-5' && d.experience > 5) return false
    if (filterExp === '5-10' && (d.experience < 5 || d.experience > 10)) return false
    if (filterExp === '10+' && d.experience < 10) return false
    return true
  })

  if (loading) return <SkeletonDashboard />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Doctor Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage doctor profiles and schedules</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setSelectedDoctor(null); setFormData(EMPTY_FORM); setShowAddModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Doctor
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Doctors" value={doctors.length} icon={UserPlus} color="from-blue-600 to-cyan-500" />
        <StatCard title="Available Today" value={doctors.filter(d => d.isAvailable).length} icon={Clock} color="from-emerald-600 to-teal-500" />
        <StatCard title="Specializations" value={new Set(doctors.map(d => d.specialization).filter(Boolean)).size} icon={Stethoscope} color="from-violet-600 to-purple-500" />
        <StatCard
          title="Avg Rating"
          value={doctors.length ? (doctors.reduce((s, d) => s + (d.rating || 0), 0) / doctors.length).toFixed(1) : '0.0'}
          icon={Star}
          color="from-orange-500 to-amber-500"
        />
      </div>

      {/* Filters */}
      <div className={`border rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center
        ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`}>
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className={`px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
            ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
        >
          <option value="">All Departments</option>
          {[...new Set(doctors.map(d => d.department).filter(Boolean))].sort().map(d => <option key={d}>{d}</option>)}
        </select>
        <select
          value={filterAvailability}
          onChange={e => setFilterAvailability(e.target.value)}
          className={`px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
            ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
        >
          <option value="">All Availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <select
          value={filterExp}
          onChange={e => setFilterExp(e.target.value)}
          className={`px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
            ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
        >
          <option value="">Any Experience</option>
          <option value="0-5">0–5 years</option>
          <option value="5-10">5–10 years</option>
          <option value="10+">10+ years</option>
        </select>
        {(filterDept || filterAvailability || filterExp) && (
          <button
            onClick={() => { setFilterDept(''); setFilterAvailability(''); setFilterExp('') }}
            className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      <TableComponent
        columns={columns}
        data={filtered}
        searchPlaceholder="Search doctors by name or specialization…"
        emptyIcon={UserPlus}
        emptyText="No doctors found"
      />

      {/* Add / Edit Doctor Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={selectedDoctor ? 'Edit Doctor' : 'Add New Doctor'} size="lg">
        <div className="space-y-5">
          {/* Personal info — only shown when creating new */}
          {!selectedDoctor && (
            <>
              <div className={`rounded-lg p-3 text-sm ${darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                Default password will be the doctor's phone number. They can change it after first login.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Full Name *</label>
                  <input type="text" value={formData.name} onChange={e => field('name', e.target.value)} className={inp} placeholder="Dr. Priya Sharma" />
                </div>
                <div>
                  <label className={lbl}>Email *</label>
                  <input type="email" value={formData.email} onChange={e => field('email', e.target.value)} className={inp} placeholder="doctor@hospital.com" />
                </div>
                <div>
                  <label className={lbl}>Phone * (used as default password)</label>
                  <input type="tel" value={formData.phone} onChange={e => field('phone', e.target.value)} className={inp} placeholder="9876543210" />
                </div>
                <div>
                  <label className={lbl}>Gender</label>
                  <select value={formData.gender} onChange={e => field('gender', e.target.value)} className={inp}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <hr className={darkMode ? 'border-gray-700' : 'border-gray-200'} />
            </>
          )}

          {/* Professional info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Specialization *</label>
              <select value={formData.specialization} onChange={e => field('specialization', e.target.value)} className={inp}>
                <option value="">Select Specialization</option>
                {['Cardiology','Neurology','Orthopedics','Pediatrics','Dermatology','Gynecology','ENT','General Surgery','General Medicine','Psychiatry','Radiology','Oncology','Urology','Nephrology'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Department *</label>
              <select value={formData.department} onChange={e => field('department', e.target.value)} className={inp}>
                <option value="">Select Department</option>
                {['Cardiology','Neurology','Orthopedics','Pediatrics','Emergency','General Medicine','ICU','Surgery','Radiology','Oncology'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Qualification *</label>
              <input type="text" value={formData.qualification} onChange={e => field('qualification', e.target.value)} className={inp} placeholder="MBBS, MD Cardiology" />
            </div>
            <div>
              <label className={lbl}>Experience (Years)</label>
              <input type="number" min="0" max="60" value={formData.experience} onChange={e => field('experience', e.target.value)} className={inp} placeholder="10" />
            </div>
            <div>
              <label className={lbl}>License Number</label>
              <input type="text" value={formData.licenseNumber} onChange={e => field('licenseNumber', e.target.value)} className={inp} placeholder="LIC123456" disabled={!!selectedDoctor} />
            </div>
            <div>
              <label className={lbl}>Consultation Fee (₹)</label>
              <input type="number" min="0" value={formData.consultationFee} onChange={e => field('consultationFee', e.target.value)} className={inp} placeholder="500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAddModal(false)} className={`px-5 py-2 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-sm hover:shadow-md hover:shadow-blue-500/25 active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : (selectedDoctor ? 'Update Doctor' : 'Add Doctor')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title={`Manage Schedule – ${selectedDoctor?.userId?.name || 'Doctor'}`} size="lg">
        <div className="space-y-3">
          {Object.keys(scheduleData).map(day => (
            <div key={day} className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center space-x-3 mb-2">
                <input
                  type="checkbox"
                  checked={scheduleData[day].available}
                  onChange={e => setScheduleData(s => ({ ...s, [day]: { ...s[day], available: e.target.checked } }))}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <label className={`text-sm font-semibold capitalize ${darkMode ? 'text-white' : 'text-gray-800'}`}>{day}</label>
              </div>
              {scheduleData[day].available && (
                <div className="grid grid-cols-2 gap-3 ml-8">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start</label>
                    <input type="time" value={scheduleData[day].startTime} onChange={e => setScheduleData(s => ({ ...s, [day]: { ...s[day], startTime: e.target.value } }))} className={`${inp} text-sm`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End</label>
                    <input type="time" value={scheduleData[day].endTime} onChange={e => setScheduleData(s => ({ ...s, [day]: { ...s[day], endTime: e.target.value } }))} className={`${inp} text-sm`} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setShowScheduleModal(false)} className={`px-5 py-2 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
          <button onClick={handleScheduleUpdate} className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-sm hover:shadow-md hover:shadow-blue-500/25 active:scale-[0.97] transition-all duration-200">Update Schedule</button>
        </div>
      </Modal>
    </div>
  )
}

export default Doctors
