import React, { useState, useEffect } from 'react'
import { Edit, Trash2, FileText, Calendar, Plus, Users, Search, X, Phone, Droplets, User, TrendingUp } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import StatCard from '../components/common/StatCard'
import { SkeletonTable } from '../components/common/SkeletonCard'
import * as patientService from '../services/patientService'
import * as appointmentService from '../services/appointmentService'
import { toast } from 'react-toastify'
import CardPagination, { paginateData } from '../components/common/CardPagination'
import PageLayout from '../components/common/PageLayout'

const EMPTY_FORM = {
  // User fields (only on create)
  name: '', email: '', phone: '', gender: '', dateOfBirth: '',
  // Patient profile fields
  bloodGroup: '',
  emergencyContact: '', emergencyContactName: '', emergencyContactRelation: '',
  allergies: []
}

// ─── Patient Card ──────────────────────────────────────────────
const PatientCard = ({ patient, canAdd, onView, onMedical, onEdit, onDelete, darkMode }) => {
  const name     = patient.userId?.name || 'Unknown'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const phone    = patient.userId?.phone || '—'
  const gender   = patient.userId?.gender || ''
  const dob      = patient.userId?.dateOfBirth
  const age      = dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : null
  const blood    = patient.bloodGroup || ''
  const allergies = patient.allergies || []

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200
      ${darkMode
        ? 'bg-gray-800 border-gray-700/60 hover:border-gray-600'
        : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-gray-200'}`}>

      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#2E86DE] flex items-center justify-center text-white font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{name}</p>
          <p className="text-xs text-gray-400 font-mono">{patient.patientId}</p>
        </div>
        {blood && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 flex-shrink-0">
            {blood}
          </span>
        )}
      </div>

      {/* Info row */}
      <div className={`flex items-center gap-4 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {(gender || age) && <span>{gender}{age ? `${gender ? ', ' : ''}${age} yrs` : ''}</span>}
        <span className="flex items-center gap-1 ml-auto">
          <Phone className="w-3 h-3" />{phone}
        </span>
      </div>

      {/* Allergies */}
      {allergies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Allergies:</span>
          {allergies.slice(0, 2).map((a, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {a}
            </span>
          ))}
          {allergies.length > 2 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              +{allergies.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center gap-1.5 pt-2.5 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <button
          onClick={() => onMedical(patient)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"
          title="Medical Records"
        >
          <FileText className="w-3.5 h-3.5" /> Records
        </button>
        <button
          onClick={() => onView(patient)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400"
          title="Appointments"
        >
          <Calendar className="w-3.5 h-3.5" /> Appts
        </button>
        {canAdd && (
          <>
            <button
              onClick={() => onEdit(patient)}
              className={`p-1.5 rounded-lg transition-all text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20`}
              title="Edit"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(patient._id)}
              className="p-1.5 rounded-lg transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const Patients = () => {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const role = user?.role?.toLowerCase()
  const subRole = user?.subRole?.toLowerCase()
  const canAdd = role === 'admin' || subRole === 'receptionist' || role === 'receptionist'

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showMedicalModal, setShowMedicalModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [medicalRecords, setMedicalRecords] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)

  const inp = `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 ${
    darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'
  }`
  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`

  useEffect(() => { fetchPatients() }, [])

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const data = await patientService.getAllPatients({ limit: 500 })
      setPatients(data.data || data.patients || [])
    } catch {
      toast.error('Failed to fetch patients')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setSelectedPatient(null)
    setFormData(EMPTY_FORM)
    setShowAddModal(true)
  }

  const openEdit = (patient) => {
    setSelectedPatient(patient)
    setFormData({
      name: patient.userId?.name || '',
      email: patient.userId?.email || '',
      phone: patient.userId?.phone || '',
      gender: patient.userId?.gender || '',
      dateOfBirth: patient.userId?.dateOfBirth ? patient.userId.dateOfBirth.split('T')[0] : '',
      bloodGroup: patient.bloodGroup || '',
      emergencyContact: patient.emergencyContact?.phone || '',
      emergencyContactName: patient.emergencyContact?.name || '',
      emergencyContactRelation: patient.emergencyContact?.relation || '',
      allergies: patient.allergies || []
    })
    setShowAddModal(true)
  }

  const handleSubmit = async () => {
    if (!selectedPatient && (!formData.name || !formData.email || !formData.phone)) {
      toast.error('Name, email and phone are required')
      return
    }
    setSubmitting(true)
    try {
      if (selectedPatient) {
        await patientService.updatePatient(selectedPatient._id, formData)
        toast.success('Patient updated successfully')
      } else {
        await patientService.createPatient(formData)
        toast.success('Patient created. Default password is their phone number.')
      }
      setShowAddModal(false)
      setFormData(EMPTY_FORM)
      setSelectedPatient(null)
      fetchPatients()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleDelete = async (id) => {
    try {
      await patientService.deletePatient(id)
      toast.success('Patient deleted')
      fetchPatients()
    } catch {
      toast.error('Failed to delete patient')
    }
  }

  const viewMedicalRecords = async (patient) => {
    try {
      const data = await patientService.getPatientMedicalRecords(patient._id)
      setMedicalRecords(data.data)
      setSelectedPatient(patient)
      setShowMedicalModal(true)
    } catch {
      toast.error('Failed to fetch medical records')
    }
  }

  const viewAppointments = async (patient) => {
    try {
      const data = await appointmentService.getPatientAppointments(patient._id)
      setAppointments(data.data || [])
      setSelectedPatient(patient)
      setShowViewModal(true)
    } catch {
      toast.error('Failed to fetch appointments')
    }
  }

  if (loading) return <SkeletonTable rows={8} cols={6} />

  // Stats
  const now           = new Date()
  const newThisMonth  = patients.filter(p => {
    const d = new Date(p.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const maleCount    = patients.filter(p => p.userId?.gender?.toLowerCase() === 'male').length
  const femaleCount  = patients.filter(p => p.userId?.gender?.toLowerCase() === 'female').length

  const filteredPatients = patients.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return [p.userId?.name, p.patientId, p.userId?.phone, p.bloodGroup]
      .some(v => v?.toLowerCase().includes(q))
  })
  const pagePatients = paginateData(filteredPatients, page)

  const textCls = darkMode ? 'text-white' : 'text-gray-900'
  const card    = `border rounded-xl transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`

  const leftPanel = (
    <div className="space-y-3">
      <StatCard title="Total Patients" value={patients.length} icon={Users}      iconBg="bg-blue-50 text-[#2E86DE]"     />
      <StatCard title="New This Month" value={newThisMonth}    icon={TrendingUp}  iconBg="bg-violet-50 text-violet-600"  />
      <StatCard title="Male"           value={maleCount}       icon={User}        iconBg="bg-sky-50 text-sky-600"        />
      <StatCard title="Female"         value={femaleCount}     icon={User}        iconBg="bg-pink-50 text-pink-600"      />
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${textCls}`}>Patient Management</h1>
          <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage patient records and information
          </p>
        </div>
        {canAdd && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2E86DE] hover:bg-[#1a6db5] text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            Add Patient
          </button>
        )}
      </div>

      <PageLayout leftPanel={leftPanel}>

      {/* ── Search ──────────────────────────────────────────── */}
      <div className={`${card} p-3`}>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border
            ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by name, ID, phone, or blood group…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className={`bg-transparent text-sm outline-none flex-1 ${darkMode ? 'text-white placeholder-gray-500' : 'text-gray-900'}`}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className={`text-sm px-3 font-medium whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Patient cards ────────────────────────────────────── */}
      {filteredPatients.length === 0 ? (
        <div className={`${card} py-16 text-center`}>
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className={`font-semibold ${textCls}`}>No patients found</p>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {search ? 'Try adjusting your search' : 'Add a patient to get started'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pagePatients.map(pt => (
              <PatientCard
                key={pt._id}
                patient={pt}
                canAdd={canAdd}
                onView={viewAppointments}
                onMedical={viewMedicalRecords}
                onEdit={openEdit}
                onDelete={id => setConfirmDelete(id)}
                darkMode={darkMode}
              />
            ))}
          </div>
          <CardPagination total={filteredPatients.length} page={page} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
        </>
      )}

      </PageLayout>

      {/* Add / Edit Patient Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setSelectedPatient(null) }}
        title={selectedPatient ? 'Edit Patient' : 'Add New Patient'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Personal Info — only shown when adding new patient */}
          {!selectedPatient && (
            <>
              <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-blue-900/20 border border-blue-800 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
                Default password will be set to the patient's phone number
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={lbl}>Full Name *</label>
                  <input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className={inp} placeholder="Patient full name" />
                </div>
                <div>
                  <label className={lbl}>Email *</label>
                  <input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} className={inp} placeholder="email@example.com" />
                </div>
                <div>
                  <label className={lbl}>Phone *</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} className={inp} placeholder="10-digit number" />
                </div>
                <div>
                  <label className={lbl}>Gender</label>
                  <select value={formData.gender} onChange={e => setFormData(f => ({ ...f, gender: e.target.value }))} className={inp}>
                    <option value="">Select gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Date of Birth</label>
                  <input type="date" value={formData.dateOfBirth} onChange={e => setFormData(f => ({ ...f, dateOfBirth: e.target.value }))} className={inp} />
                </div>
              </div>

              <div className={`border-t pt-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`} />
            </>
          )}

          {/* Medical Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Blood Group</label>
              <select value={formData.bloodGroup} onChange={e => setFormData(f => ({ ...f, bloodGroup: e.target.value }))} className={inp}>
                <option value="">Select blood group</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Emergency Contact Name</label>
              <input value={formData.emergencyContactName} onChange={e => setFormData(f => ({ ...f, emergencyContactName: e.target.value }))} className={inp} placeholder="Contact name" />
            </div>
            <div>
              <label className={lbl}>Emergency Contact Phone</label>
              <input type="tel" value={formData.emergencyContact} onChange={e => setFormData(f => ({ ...f, emergencyContact: e.target.value }))} className={inp} placeholder="Contact number" />
            </div>
            <div>
              <label className={lbl}>Relation</label>
              <input value={formData.emergencyContactRelation} onChange={e => setFormData(f => ({ ...f, emergencyContactRelation: e.target.value }))} className={inp} placeholder="e.g. Spouse, Parent" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => setShowAddModal(false)} className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 bg-[#2E86DE] hover:bg-[#1a6db5] text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : selectedPatient ? 'Update Patient' : 'Add Patient'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Medical Records Modal */}
      <Modal isOpen={showMedicalModal} onClose={() => setShowMedicalModal(false)} title="Medical Records" size="xl">
        {medicalRecords && (
          <div className="space-y-6">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className="font-semibold">Patient ID: {medicalRecords.patientId}</p>
              <p className="text-sm text-gray-500 mt-1">Name: {medicalRecords.userId?.name}</p>
            </div>

            <div>
              <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Medical History</h3>
              {medicalRecords.medicalHistory?.length > 0 ? (
                <div className="space-y-2">
                  {medicalRecords.medicalHistory.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <p className="font-medium text-sm">{item.condition}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Diagnosed: {new Date(item.diagnosedDate).toLocaleDateString()} · Status: {item.status}
                      </p>
                      {item.notes && <p className="text-xs text-gray-400 mt-1">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">No medical history recorded</p>}
            </div>

            <div>
              <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Lab Reports</h3>
              {medicalRecords.labReports?.length > 0 ? (
                <div className="space-y-2">
                  {medicalRecords.labReports.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <p className="font-medium text-sm">{item.testName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.testType} · {item.lab || ''} · {new Date(item.reportDate || item.testDate).toLocaleDateString()}
                      </p>
                      {item.result && <p className="text-xs text-gray-400 mt-1">Result: {item.result}</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">No lab reports available</p>}
            </div>

            <div>
              <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Allergies</h3>
              {medicalRecords.allergies?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {medicalRecords.allergies.map((a, idx) => (
                    <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm">{a}</span>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">No allergies recorded</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* Appointments Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Patient Appointments" size="lg">
        <div className="space-y-3">
          {appointments.length > 0 ? appointments.map((apt, idx) => (
            <div key={idx} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">Dr. {(apt.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()}</p>
                  <p className="text-xs text-gray-400">{apt.doctor?.specialization}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.timeSlot?.startTime || '—'}
                  </p>
                  {apt.symptoms && <p className="text-xs text-gray-500">Symptoms: {apt.symptoms}</p>}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  apt.status === 'Scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  apt.status === 'Completed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' :
                  apt.status === 'Cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>{apt.status}</span>
              </div>
            </div>
          )) : (
            <div className="text-center py-10">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No appointments found</p>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
        title="Delete Patient Record"
        message="This will permanently delete the patient's data including appointments and medical history."
        confirmLabel="Delete"
      />
    </div>
  )
}

export default Patients
