import React, { useState, useEffect } from 'react'
import { Edit, Trash2, FileText, Calendar, Plus, Users } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import TableComponent from '../components/common/TableComponent'
import Modal from '../components/common/Modal'
import { SkeletonTable } from '../components/common/SkeletonCard'
import * as patientService from '../services/patientService'
import * as appointmentService from '../services/appointmentService'
import { toast } from 'react-toastify'

const EMPTY_FORM = {
  // User fields (only on create)
  name: '', email: '', phone: '', gender: '', dateOfBirth: '',
  // Patient profile fields
  bloodGroup: '',
  emergencyContact: '', emergencyContactName: '', emergencyContactRelation: '',
  allergies: []
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this patient record?')) return
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

  const columns = [
    { header: 'Patient ID', accessor: 'patientId' },
    { header: 'Name', accessor: 'name', render: (row) => row.userId?.name || 'N/A' },
    {
      header: 'Age', accessor: 'age',
      render: (row) => {
        const dob = row.userId?.dateOfBirth
        if (!dob) return 'N/A'
        return new Date().getFullYear() - new Date(dob).getFullYear()
      }
    },
    { header: 'Gender', accessor: 'gender', render: (row) => row.userId?.gender || 'N/A' },
    { header: 'Blood Group', accessor: 'bloodGroup' },
    { header: 'Phone', accessor: 'phone', render: (row) => row.userId?.phone || 'N/A' },
    {
      header: 'Actions', accessor: 'actions',
      render: (row) => (
        <div className="flex space-x-1">
          <button onClick={() => viewMedicalRecords(row)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition" title="Medical Records">
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={() => viewAppointments(row)} className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition" title="Appointments">
            <Calendar className="w-4 h-4" />
          </button>
          {canAdd && (
            <>
              <button onClick={() => openEdit(row)} className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition" title="Edit">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(row._id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ]

  if (loading) return <SkeletonTable rows={8} cols={columns.length} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Patient Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage patient records and information</p>
        </div>
        {canAdd && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Patient
          </button>
        )}
      </div>

      <TableComponent
        columns={columns}
        data={patients}
        searchPlaceholder="Search patients by name, ID, or phone…"
        emptyIcon={Users}
        emptyText="No patients found"
      />

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

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowAddModal(false)} className={`px-5 py-2 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-sm hover:shadow-md hover:shadow-blue-500/25 active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
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
    </div>
  )
}

export default Patients
