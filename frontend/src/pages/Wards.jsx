import React, { useState, useEffect, useMemo } from 'react'
import {
  Bed, Users, Activity, Plus, Edit, Trash2, UserPlus, UserMinus,
  BarChart3, Search, X, Calendar, CheckCircle2, AlertCircle, User, Sparkles
} from 'lucide-react'
import StatCard from '../components/common/StatCard'
import PageLayout from '../components/common/PageLayout'
import { SkeletonDashboard } from '../components/common/SkeletonCard'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/common/Modal'
import { toast } from 'react-toastify'
import * as wardService from '../services/wardService'
import api from '../services/api'
import BedAllocationAgent from '../agents/BedAllocationAgent'

// ── Helpers ───────────────────────────────────────────────────────────────────
const calcAge = (dob) => {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000))
}

const shortDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

const WARD_TYPES = ['General', 'ICU', 'NICU', 'Private', 'Semi-Private', 'Emergency', 'Isolation']

// ── Bed Card ─────────────────────────────────────────────────────────────────
const BedCard = ({ bed, ward, canManage, onAssign, onDischarge, darkMode }) => {
  const patientUser = bed.patient?.userId
  const age  = calcAge(patientUser?.dateOfBirth)
  const name = patientUser?.name || 'Unknown Patient'

  if (bed.isOccupied) {
    return (
      <div className={`rounded-xl border p-3.5 flex flex-col gap-2 transition-all
        ${darkMode
          ? 'bg-blue-900/20 border-blue-700/60'
          : 'bg-blue-50 border-blue-200'}`}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bed className="w-3.5 h-3.5 text-blue-500" />
            <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {bed.bedNumber}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            Occupied
          </span>
        </div>

        {/* Patient info */}
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold leading-tight truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {age !== null ? `${age}y` : '—'}
              {patientUser?.gender ? ` · ${patientUser.gender}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>Admitted {shortDate(bed.admissionDate)}</span>
        </div>

        {bed.expectedDischargeDate && (
          <div className="text-xs text-orange-600 dark:text-orange-400">
            Discharge by {shortDate(bed.expectedDischargeDate)}
          </div>
        )}

        {canManage && (
          <button
            onClick={() => onDischarge(ward, bed)}
            className="mt-auto w-full py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
          >
            <UserMinus className="w-3 h-3" />
            Discharge
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-xl border p-3.5 flex flex-col gap-2 transition-all
      ${darkMode
        ? 'bg-emerald-900/10 border-emerald-800/50'
        : 'bg-emerald-50 border-emerald-200'}`}>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bed className="w-3.5 h-3.5 text-emerald-500" />
          <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {bed.bedNumber}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          Available
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center py-2">
        <div className="text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
          <p className="text-xs text-gray-400">No patient assigned</p>
        </div>
      </div>

      {canManage && (
        <button
          onClick={() => onAssign(ward, bed)}
          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
        >
          <UserPlus className="w-3 h-3" />
          Assign Patient
        </button>
      )}
    </div>
  )
}

// ── Ward Card ─────────────────────────────────────────────────────────────────
const WardCard = ({ ward, canManage, onEdit, onDelete, onAllocate, onRelease, darkMode }) => {
  const [expanded, setExpanded] = useState(false)
  const occupied = ward.totalBeds - ward.availableBeds
  const pct = ward.totalBeds > 0 ? (occupied / ward.totalBeds) * 100 : 0

  const typeColors = {
    ICU:         'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    NICU:        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    Emergency:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Private:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Isolation:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    General:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Semi-Private': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  }

  return (
    <div className={`border rounded-xl transition-all duration-200
      ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`}>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {ward.wardName}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{ward.wardNumber} · Floor {ward.floor || 'N/A'}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${typeColors[ward.wardType] || typeColors.General}`}>
            {ward.wardType}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          {[
            { label: 'Total', value: ward.totalBeds },
            { label: 'Occupied', value: occupied, color: 'text-red-500' },
            { label: 'Free', value: ward.availableBeds, color: 'text-emerald-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-lg py-2 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <p className={`text-lg font-bold ${color || (darkMode ? 'text-white' : 'text-gray-900')}`}>{value}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        <div className="mb-3">
          <div className={`w-full rounded-full h-1.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className={`h-1.5 rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-orange-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">{Math.round(pct)}% occupied · ₹{ward.dailyRate}/day</p>
        </div>

        <div className="flex gap-2">
          {canManage && (
            <>
              <button
                onClick={() => setExpanded(v => !v)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border
                  ${expanded
                    ? 'bg-[#2E86DE] text-white border-[#2E86DE]'
                    : darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}`}
              >
                {expanded ? 'Hide Beds' : 'View Beds'}
              </button>
              <button
                onClick={() => onEdit(ward)}
                className={`p-2 rounded-lg transition-all duration-200 ${darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                title="Edit ward"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(ward._id)}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                title="Delete ward"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {!canManage && (
            <button
              onClick={() => setExpanded(v => !v)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border
                ${expanded
                  ? 'bg-[#2E86DE] text-white border-[#2E86DE]'
                  : darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {expanded ? 'Hide Beds' : 'View Beds'}
            </button>
          )}
        </div>
      </div>

      {/* Inline bed grid */}
      {expanded && (
        <div className={`px-5 pb-5 pt-0 border-t ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mt-4 mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Beds in this ward
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ward.beds?.map(bed => (
              <BedCard
                key={bed._id}
                bed={bed}
                ward={ward}
                canManage={canManage}
                onAssign={onAllocate}
                onDischarge={onRelease}
                darkMode={darkMode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
const Wards = () => {
  const { darkMode } = useTheme()
  const { user }     = useAuth()

  const canManage = ['Admin', 'Doctor', 'Nurse', 'Ward Manager', 'Receptionist'].includes(user?.role) ||
                    ['Admin', 'Doctor', 'Nurse', 'Ward Manager', 'Receptionist'].includes(user?.subRole)

  // ── State ────────────────────────────────────────────────────────
  const [wards,    setWards]    = useState([])
  const [patients, setPatients] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDeleteWard, setConfirmDeleteWard] = useState(null)

  // Ward CRUD modal
  const [showWardModal, setShowWardModal] = useState(false)
  const [editingWard,   setEditingWard]   = useState(null)
  const [wardForm,      setWardForm]      = useState({
    wardNumber: '', wardName: '', wardType: 'General', department: '',
    floor: 1, totalBeds: 10, gender: 'Mixed', facilities: [], dailyRate: 0
  })

  // Assign modal
  const [showAssignModal, setShowAssignModal]   = useState(false)
  const [showBedAI, setShowBedAI]               = useState(false)
  const [assignTarget, setAssignTarget]         = useState({ ward: null, bed: null })
  const [patientSearch, setPatientSearch]     = useState('')
  const [assignPatient, setAssignPatient]     = useState(null)
  const [assignDates, setAssignDates]         = useState({
    admissionDate: new Date().toISOString().split('T')[0],
    expectedDischargeDate: ''
  })

  // Discharge confirm modal
  const [showDischargeModal, setShowDischargeModal] = useState(false)
  const [dischargeTarget, setDischargeTarget]       = useState({ ward: null, bed: null })

  // Overview filter
  const [wardFilter, setWardFilter]       = useState('all')
  const [statusFilter, setStatusFilter]   = useState('all')

  // ── Data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    fetchWards()
    fetchPatients()
  }, [])

  const fetchWards = async () => {
    setLoading(true)
    try {
      const res = await wardService.getAllWards()
      setWards(res.data || [])
    } catch {
      toast.error('Failed to load wards')
    } finally {
      setLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients', { params: { limit: 1000 } })
      setPatients(res.data || [])
    } catch {
      // non-fatal
    }
  }

  // ── Stats ────────────────────────────────────────────────────────
  const totalBeds    = wards.reduce((s, w) => s + w.totalBeds, 0)
  const occupiedBeds = wards.reduce((s, w) => s + (w.totalBeds - w.availableBeds), 0)
  const freeBeds     = wards.reduce((s, w) => s + w.availableBeds, 0)
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  // ── Ward CRUD ────────────────────────────────────────────────────
  const resetWardForm = () => {
    setWardForm({ wardNumber: '', wardName: '', wardType: 'General', department: '',
                  floor: 1, totalBeds: 10, gender: 'Mixed', facilities: [], dailyRate: 0 })
    setEditingWard(null)
  }

  const openEditWard = (ward) => {
    setEditingWard(ward)
    setWardForm({
      wardNumber: ward.wardNumber, wardName: ward.wardName, wardType: ward.wardType,
      department: ward.department || '', floor: ward.floor || 1,
      totalBeds: ward.totalBeds, gender: ward.gender || 'Mixed',
      facilities: ward.facilities || [], dailyRate: ward.dailyRate
    })
    setShowWardModal(true)
  }

  const handleSaveWard = async () => {
    if (!wardForm.wardNumber || !wardForm.wardName || !wardForm.dailyRate) {
      return toast.error('Ward number, name and daily rate are required')
    }
    setSubmitting(true)
    try {
      if (editingWard) {
        await wardService.updateWard(editingWard._id, wardForm)
        toast.success('Ward updated')
      } else {
        await wardService.createWard(wardForm)
        toast.success('Ward created')
      }
      setShowWardModal(false)
      resetWardForm()
      fetchWards()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteWard = async (wardId) => {
    try {
      await wardService.deleteWard(wardId)
      toast.success('Ward deleted')
      fetchWards()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ward')
    }
  }

  // ── Assign patient to specific bed ──────────────────────────────
  const openAssignModal = (ward, bed) => {
    setAssignTarget({ ward, bed })
    setAssignPatient(null)
    setPatientSearch('')
    setAssignDates({
      admissionDate: new Date().toISOString().split('T')[0],
      expectedDischargeDate: ''
    })
    setShowAssignModal(true)
  }

  const handleAssign = async () => {
    if (!assignPatient) return toast.error('Please select a patient')
    setSubmitting(true)
    try {
      await wardService.assignBed(assignTarget.ward._id, {
        patientId:            assignPatient._id,
        bedId:                assignTarget.bed._id,
        admissionDate:        assignDates.admissionDate,
        expectedDischargeDate: assignDates.expectedDischargeDate || undefined
      })
      toast.success(`${assignPatient.userId?.name || 'Patient'} assigned to bed ${assignTarget.bed.bedNumber}`)
      setShowAssignModal(false)
      fetchWards()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign bed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Discharge patient from specific bed ─────────────────────────
  const openDischargeModal = (ward, bed) => {
    setDischargeTarget({ ward, bed })
    setShowDischargeModal(true)
  }

  const handleDischarge = async () => {
    setSubmitting(true)
    try {
      const res = await wardService.dischargeBed(dischargeTarget.ward._id, { bedId: dischargeTarget.bed._id })
      const bill = res?.wardBill || res?.data?.wardBill
      if (bill) {
        const days  = bill.items?.[0]?.quantity || 1
        const total = bill.totalAmount || 0
        toast.success(`Patient discharged from ${dischargeTarget.bed.bedNumber} · Ward bill ₹${total.toLocaleString()} (${days} day${days !== 1 ? 's' : ''}) auto-generated`)
      } else {
        toast.success(`Patient discharged from bed ${dischargeTarget.bed.bedNumber}`)
      }
      setShowDischargeModal(false)
      fetchWards()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discharge patient')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Filtered patients for assign modal ─────────────────────────
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(p => {
      const name  = (p.userId?.name  || '').toLowerCase()
      const phone = (p.userId?.phone || '').toLowerCase()
      const pid   = (p.patientId     || '').toLowerCase()
      return name.includes(q) || phone.includes(q) || pid.includes(q)
    })
  }, [patients, patientSearch])

  // Already-assigned patient IDs (across all wards, occupied beds)
  const assignedPatientIds = useMemo(() => {
    const ids = new Set()
    wards.forEach(w => w.beds?.forEach(b => {
      if (b.isOccupied && b.patient?._id) ids.add(b.patient._id.toString())
    }))
    return ids
  }, [wards])

  // ── All-beds flat list for the overview grid ─────────────────────
  const allBeds = useMemo(() => {
    return wards.flatMap(w =>
      (w.beds || []).map(b => ({ ...b, wardName: w.wardName, wardId: w._id, wardObj: w }))
    )
  }, [wards])

  const overviewBeds = useMemo(() => {
    return allBeds.filter(b => {
      const matchWard   = wardFilter   === 'all' || b.wardObj._id === wardFilter
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'occupied'  &&  b.isOccupied)
        || (statusFilter === 'available' && !b.isOccupied)
      return matchWard && matchStatus
    })
  }, [allBeds, wardFilter, statusFilter])

  // ── Style helpers ────────────────────────────────────────────────
  const inp = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200
    ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`
  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`
  const card = `border rounded-xl ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`

  // ════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Ward & Bed Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">Monitor ward status and patient-bed assignments in real-time</p>
        </div>
        {canManage && user?.role === 'Admin' && (
          <button
            onClick={() => { resetWardForm(); setShowWardModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2E86DE] hover:bg-[#1a6db5] text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            Add Ward
          </button>
        )}
      </div>

      <PageLayout leftPanel={
        <div className="space-y-3">
          <StatCard title="Total Beds" value={totalBeds}          icon={Bed}      iconBg="bg-blue-50 text-[#2E86DE]"       />
          <StatCard title="Occupied"   value={occupiedBeds}       icon={Users}    iconBg="bg-red-50 text-red-600"          />
          <StatCard title="Available"  value={freeBeds}           icon={Activity} iconBg="bg-emerald-50 text-emerald-600"  />
          <StatCard title="Occupancy"  value={`${occupancyPct}%`} icon={BarChart3} iconBg="bg-violet-50 text-violet-600"  />
        </div>
      }>

      {/* ── Ward Cards ───────────────────────────────────────────── */}
      {loading ? (
        <SkeletonDashboard />
      ) : wards.length === 0 ? (
        <div className={`${card} p-12 text-center`}>
          <Bed className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No wards yet</p>
          {user?.role === 'Admin' && (
            <button
              onClick={() => { resetWardForm(); setShowWardModal(true) }}
              className="mt-4 px-5 py-2 bg-[#2E86DE] text-white text-sm rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all duration-200"
            >Add First Ward</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {wards.map(ward => (
            <WardCard
              key={ward._id}
              ward={ward}
              canManage={canManage}
              darkMode={darkMode}
              onEdit={openEditWard}
              onDelete={setConfirmDeleteWard}
              onAllocate={openAssignModal}
              onRelease={openDischargeModal}
            />
          ))}
        </div>
      )}

      {/* ── All-Beds Overview Grid ───────────────────────────────── */}
      {wards.length > 0 && (
        <div className={`${card} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                All Beds Overview
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {overviewBeds.filter(b => b.isOccupied).length} occupied · {overviewBeds.filter(b => !b.isOccupied).length} available
              </p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={wardFilter}
                onChange={e => setWardFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'}`}
              >
                <option value="all">All Wards</option>
                {wards.map(w => <option key={w._id} value={w._id}>{w.wardName}</option>)}
              </select>
              <div className="flex rounded-lg border overflow-hidden text-xs font-semibold
                border-gray-300 dark:border-gray-600">
                {[['all','All'],['available','Available'],['occupied','Occupied']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setStatusFilter(val)}
                    className={`px-3 py-1.5 transition ${statusFilter === val
                      ? 'bg-[#2E86DE] text-white'
                      : darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-500">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-gray-500">Occupied</span>
            </div>
          </div>

          {/* Ward sections */}
          <div className="space-y-7">
            {wards
              .filter(w => wardFilter === 'all' || w._id === wardFilter)
              .map(ward => {
                const visibleBeds = ward.beds?.filter(b =>
                  statusFilter === 'all'
                  || (statusFilter === 'occupied'  &&  b.isOccupied)
                  || (statusFilter === 'available' && !b.isOccupied)
                ) || []
                if (visibleBeds.length === 0) return null
                return (
                  <div key={ward._id}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {ward.wardName}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {ward.wardNumber} · {ward.wardType}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                      {visibleBeds.map(bed => (
                        <BedCard
                          key={bed._id}
                          bed={bed}
                          ward={ward}
                          canManage={canManage}
                          onAssign={openAssignModal}
                          onDischarge={openDischargeModal}
                          darkMode={darkMode}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      </PageLayout>

      {/* ════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════ */}

      {/* ── Create / Edit Ward ─────────────────────────────────── */}
      <Modal
        isOpen={showWardModal}
        onClose={() => { setShowWardModal(false); resetWardForm() }}
        title={editingWard ? 'Edit Ward' : 'Add New Ward'}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Ward Number *</label>
              <input value={wardForm.wardNumber}
                onChange={e => setWardForm(f => ({ ...f, wardNumber: e.target.value }))}
                placeholder="e.g. W101"
                disabled={!!editingWard}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Ward Name *</label>
              <input value={wardForm.wardName}
                onChange={e => setWardForm(f => ({ ...f, wardName: e.target.value }))}
                placeholder="e.g. General Ward A"
                className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Ward Type</label>
              <select value={wardForm.wardType}
                onChange={e => setWardForm(f => ({ ...f, wardType: e.target.value }))}
                className={inp}>
                {WARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Gender</label>
              <select value={wardForm.gender}
                onChange={e => setWardForm(f => ({ ...f, gender: e.target.value }))}
                className={inp}>
                {['Male','Female','Mixed'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Department</label>
              <input value={wardForm.department}
                onChange={e => setWardForm(f => ({ ...f, department: e.target.value }))}
                placeholder="e.g. Cardiology"
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Floor</label>
              <input type="number" min="1" value={wardForm.floor}
                onChange={e => setWardForm(f => ({ ...f, floor: parseInt(e.target.value) || 1 }))}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Total Beds *</label>
              <input type="number" min="1" value={wardForm.totalBeds}
                onChange={e => setWardForm(f => ({ ...f, totalBeds: parseInt(e.target.value) || 1 }))}
                disabled={!!editingWard}
                className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Daily Rate (₹) *</label>
            <input type="number" min="0" step="0.01" value={wardForm.dailyRate}
              onChange={e => setWardForm(f => ({ ...f, dailyRate: parseFloat(e.target.value) || 0 }))}
              className={inp} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => { setShowWardModal(false); resetWardForm() }}
              className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              Cancel
            </button>
            <button onClick={handleSaveWard} disabled={submitting}
              className="px-5 py-2.5 bg-[#2E86DE] hover:bg-[#1a6db5] text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all disabled:opacity-50">
              {submitting ? 'Saving…' : editingWard ? 'Update Ward' : 'Create Ward'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Assign Patient to Bed ──────────────────────────────── */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Patient — Bed ${assignTarget.bed?.bedNumber || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Selected bed info */}
          <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Bed className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {assignTarget.bed?.bedNumber}
              </p>
              <p className="text-xs text-gray-400">{assignTarget.ward?.wardName} · {assignTarget.ward?.wardType}</p>
            </div>
            <button
              onClick={() => setShowBedAI(true)}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 hover:bg-sky-200 dark:hover:bg-sky-900/50 transition"
            >
              <Sparkles className="w-3 h-3" /> AI Recommendation
            </button>
          </div>

          {/* Patient search */}
          <div>
            <label className={lbl}>Search Patient</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                placeholder="Search by name, phone or patient ID…"
                className={`${inp} pl-9`}
              />
              {patientSearch && (
                <button onClick={() => setPatientSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Patient list */}
          <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="max-h-52 overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No patients found</div>
              ) : (
                filteredPatients.map(pt => {
                  const isAlreadyAssigned = assignedPatientIds.has(pt._id?.toString())
                  const isSelected = assignPatient?._id === pt._id
                  const age = calcAge(pt.userId?.dateOfBirth)
                  return (
                    <button
                      key={pt._id}
                      disabled={isAlreadyAssigned}
                      onClick={() => setAssignPatient(isSelected ? null : pt)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b last:border-b-0
                        ${darkMode ? 'border-gray-700' : 'border-gray-100'}
                        ${isSelected
                          ? 'bg-[#2E86DE] text-white'
                          : isAlreadyAssigned
                          ? darkMode ? 'bg-gray-800/50 opacity-40 cursor-not-allowed' : 'bg-gray-50 opacity-40 cursor-not-allowed'
                          : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                        <User className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {pt.userId?.name || 'Unknown'}
                        </p>
                        <p className={`text-xs truncate ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                          {pt.patientId}
                          {age !== null ? ` · ${age}y` : ''}
                          {pt.userId?.gender ? ` · ${pt.userId.gender}` : ''}
                          {pt.userId?.phone  ? ` · ${pt.userId.phone}` : ''}
                        </p>
                      </div>
                      {isAlreadyAssigned && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 flex-shrink-0">
                          In Bed
                        </span>
                      )}
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Selected patient summary */}
          {assignPatient && (
            <div className={`flex items-center gap-2 p-3 rounded-xl border
              ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Selected: {assignPatient.userId?.name} ({assignPatient.patientId})
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Admission Date *</label>
              <input type="date" value={assignDates.admissionDate}
                onChange={e => setAssignDates(d => ({ ...d, admissionDate: e.target.value }))}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Expected Discharge</label>
              <input type="date" value={assignDates.expectedDischargeDate}
                onChange={e => setAssignDates(d => ({ ...d, expectedDischargeDate: e.target.value }))}
                min={assignDates.admissionDate}
                className={inp} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => setShowAssignModal(false)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              Cancel
            </button>
            <button onClick={handleAssign} disabled={!assignPatient || submitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50">
              {submitting ? 'Assigning…' : 'Assign to Bed'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Discharge Confirmation ─────────────────────────────── */}
      <Modal
        isOpen={showDischargeModal}
        onClose={() => setShowDischargeModal(false)}
        title="Discharge Patient"
        size="sm"
      >
        {dischargeTarget.bed && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dischargeTarget.bed.patient?.userId?.name || 'Unknown Patient'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Bed {dischargeTarget.bed.bedNumber} · {dischargeTarget.ward?.wardName}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {dischargeTarget.bed.admissionDate && (
                  <p>Admitted: {shortDate(dischargeTarget.bed.admissionDate)}</p>
                )}
                {dischargeTarget.bed.expectedDischargeDate && (
                  <p>Expected discharge: {shortDate(dischargeTarget.bed.expectedDischargeDate)}</p>
                )}
              </div>
            </div>

            <div className={`flex items-start gap-2 p-3 rounded-xl border
              ${darkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`}>
              <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700 dark:text-orange-400">
                This will discharge the patient and make bed {dischargeTarget.bed.bedNumber} available.
                The patient's discharge date will be recorded as today.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDischargeModal(false)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                Cancel
              </button>
              <button onClick={handleDischarge} disabled={submitting}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50">
                {submitting ? 'Discharging…' : 'Discharge Patient'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDeleteWard}
        onClose={() => setConfirmDeleteWard(null)}
        onConfirm={() => handleDeleteWard(confirmDeleteWard)}
        title="Delete Ward"
        message="This will permanently delete the ward. All beds must be empty before deletion."
        confirmLabel="Delete Ward"
      />

      <BedAllocationAgent open={showBedAI} onClose={() => setShowBedAI(false)} />
    </div>
  )
}

export default Wards
