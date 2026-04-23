import React, { useState, useEffect } from 'react'
import { FlaskConical, Upload, Eye, Download, FileText, Plus, X, Calendar, User } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/common/Modal'
import * as patientService from '../services/patientService'
import { toast } from 'react-toastify'

const REPORT_TYPES = [
  'Blood Test', 'Urine Test', 'X-Ray', 'CT Scan', 'MRI Scan',
  'Ultrasound', 'ECG', 'Echocardiogram', 'Biopsy', 'Culture & Sensitivity',
  'Lipid Profile', 'Thyroid Function', 'Liver Function', 'Kidney Function', 'Other'
]

const TestReports = () => {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const role = user?.role?.toLowerCase()
  const isPatient = role === 'patient'

  const [labReports, setLabReports] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [searchPatient, setSearchPatient] = useState('')

  const [reportForm, setReportForm] = useState({
    testName: '',
    testType: 'Blood Test',
    lab: '',
    reportDate: new Date().toISOString().split('T')[0],
    result: '',
    referenceRange: '',
    status: 'Normal',
    notes: '',
  })

  const card = `border rounded-xl transition-all ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`
  const inp = `w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`
  const lbl = `block text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`
  const textCls = darkMode ? 'text-white' : 'text-gray-800'

  const fetchOwnReports = async () => {
    try {
      setLoading(true)
      const res = await patientService.getAllPatients()
      const allPatients = res.data || res.patients || []
      if (isPatient) {
        const mine = allPatients[0]
        if (mine) {
          const rec = await patientService.getPatientMedicalRecords(mine._id)
          setLabReports(rec.data?.labReports || [])
          setSelectedPatientId(mine._id)
        }
      } else {
        setPatients(allPatients)
      }
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const fetchPatientReports = async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const rec = await patientService.getPatientMedicalRecords(id)
      setLabReports(rec.data?.labReports || [])
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOwnReports() }, [])
  useEffect(() => { if (selectedPatientId && !isPatient) fetchPatientReports(selectedPatientId) }, [selectedPatientId])

  const handleAddReport = async () => {
    if (!reportForm.testName) return toast.error('Enter a test name')
    const pid = selectedPatientId
    if (!pid) return toast.error('Select a patient')
    try {
      await patientService.addLabReport(pid, {
        testName: reportForm.testName,
        testType: reportForm.testType,
        lab: reportForm.lab,
        reportDate: reportForm.reportDate,
        result: reportForm.result,
        referenceRange: reportForm.referenceRange,
        status: reportForm.status,
        notes: reportForm.notes,
      })
      toast.success('Report added successfully')
      setShowAddModal(false)
      setReportForm({ testName: '', testType: 'Blood Test', lab: '', reportDate: new Date().toISOString().split('T')[0], result: '', referenceRange: '', status: 'Normal', notes: '' })
      fetchPatientReports(pid)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add report')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Normal': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'Abnormal': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'Borderline': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  const filteredPatients = patients.filter(p =>
    !searchPatient ||
    p.userId?.name?.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.patientId?.toLowerCase().includes(searchPatient.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${textCls}`}>Test Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isPatient ? 'Your lab tests and diagnostic reports' : 'View and manage patient lab reports'}
          </p>
        </div>
        {!isPatient && selectedPatientId && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Report
          </button>
        )}
      </div>

      {/* Patient selector (non-patient roles) */}
      {!isPatient && (
        <div className={`${card} p-4`}>
          <div className="flex items-center gap-3 flex-wrap">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              value={searchPatient}
              onChange={e => setSearchPatient(e.target.value)}
              placeholder="Search patient by name or ID…"
              className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-blue-500`}
            />
            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">— Select patient —</option>
              {filteredPatients.map(p => (
                <option key={p._id} value={p._id}>
                  {p.userId?.name} · {p.patientId}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : !isPatient && !selectedPatientId ? (
        <div className={`${card} p-12 text-center`}>
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className={`font-medium ${textCls}`}>Select a patient</p>
          <p className="text-sm text-gray-400 mt-1">Choose a patient above to view their lab reports</p>
        </div>
      ) : labReports.length === 0 ? (
        <div className={`${card} p-12 text-center`}>
          <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className={`font-medium ${textCls}`}>No test reports found</p>
          <p className="text-sm text-gray-400 mt-1">
            {isPatient ? 'Your doctor will upload reports after tests' : 'Click "Add Report" to add a lab report'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {labReports.map((report, i) => (
            <div
              key={report._id || i}
              className={`${card} p-5 cursor-pointer hover:border-blue-400 transition-all`}
              onClick={() => setSelectedReport(selectedReport?._id === report._id ? null : report)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                    <FlaskConical className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm ${textCls}`}>{report.testName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{report.testType}</p>
                    {report.lab && <p className="text-xs text-gray-400">{report.lab}</p>}
                    {report.reportDate && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {new Date(report.reportDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {report.status && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                )}
              </div>

              {/* Expanded */}
              {selectedReport?._id === report._id || selectedReport === report ? (
                <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'} space-y-2`}>
                  {report.result && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Result</p>
                      <p className={`text-sm ${textCls}`}>{report.result}</p>
                    </div>
                  )}
                  {report.referenceRange && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Reference Range</p>
                      <p className="text-sm text-gray-500">{report.referenceRange}</p>
                    </div>
                  )}
                  {report.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                      <p className="text-sm text-gray-500 italic">{report.notes}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Add Report Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Lab Report" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Test Name *</label>
              <input
                value={reportForm.testName}
                onChange={e => setReportForm(f => ({ ...f, testName: e.target.value }))}
                className={inp}
                placeholder="e.g., Complete Blood Count"
              />
            </div>
            <div>
              <label className={lbl}>Test Type</label>
              <select
                value={reportForm.testType}
                onChange={e => setReportForm(f => ({ ...f, testType: e.target.value }))}
                className={inp}
              >
                {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Laboratory</label>
              <input
                value={reportForm.lab}
                onChange={e => setReportForm(f => ({ ...f, lab: e.target.value }))}
                className={inp}
                placeholder="Lab name"
              />
            </div>
            <div>
              <label className={lbl}>Report Date</label>
              <input
                type="date"
                value={reportForm.reportDate}
                onChange={e => setReportForm(f => ({ ...f, reportDate: e.target.value }))}
                className={inp}
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Result</label>
            <textarea
              value={reportForm.result}
              onChange={e => setReportForm(f => ({ ...f, result: e.target.value }))}
              className={`${inp} resize-none`}
              rows={3}
              placeholder="Enter test results..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Reference Range</label>
              <input
                value={reportForm.referenceRange}
                onChange={e => setReportForm(f => ({ ...f, referenceRange: e.target.value }))}
                className={inp}
                placeholder="e.g., 4.5–11.0 × 10³/µL"
              />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select
                value={reportForm.status}
                onChange={e => setReportForm(f => ({ ...f, status: e.target.value }))}
                className={inp}
              >
                <option value="Normal">Normal</option>
                <option value="Abnormal">Abnormal</option>
                <option value="Borderline">Borderline</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Notes</label>
            <textarea
              value={reportForm.notes}
              onChange={e => setReportForm(f => ({ ...f, notes: e.target.value }))}
              className={`${inp} resize-none`}
              rows={2}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={() => setShowAddModal(false)}
            className={`px-5 py-2 rounded-lg border text-sm font-medium transition ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleAddReport}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition"
          >
            Save Report
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default TestReports
