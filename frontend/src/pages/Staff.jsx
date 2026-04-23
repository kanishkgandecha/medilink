import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Briefcase, Filter, Star, TrendingUp, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import TableComponent from '../components/common/TableComponent'
import Modal from '../components/common/Modal'
import StatCard from '../components/common/StatCard'
import { SkeletonDashboard } from '../components/common/SkeletonCard'
import * as staffService from '../services/staffService'
import { toast } from 'react-toastify'

const SUB_ROLES = ['Nurse', 'Receptionist', 'Pharmacist', 'Lab Technician', 'Ward Manager']

const EMPTY_FORM = {
  // User fields (add mode only)
  name: '',
  email: '',
  phone: '',
  gender: '',
  // Staff profile fields
  subRole: '',
  department: '',
  qualification: '',
  joiningDate: new Date().toISOString().split('T')[0],
  employmentType: 'Full-Time',
  shift: 'Morning',
  salary: { basic: '', allowances: '' },
  skills: []
}

const Staff = () => {
  const { darkMode } = useTheme()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [skillInput, setSkillInput] = useState('')
  const [filterSubRole, setFilterSubRole] = useState('')
  const [filterShift, setFilterShift] = useState('')

  useEffect(() => { fetchStaff() }, [])

  const fetchStaff = async () => {
    setLoading(true)
    try {
      const res = await staffService.getAllStaff()
      setStaff(res.data || [])
    } catch {
      toast.error('Failed to fetch staff members')
    } finally {
      setLoading(false)
    }
  }

  const field = (key, value) => setFormData(f => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    if (!formData.department) { toast.error('Department is required'); return }
    if (!selectedStaff && (!formData.name || !formData.email || !formData.phone)) {
      toast.error('Name, email and phone are required'); return
    }
    if (!selectedStaff && !formData.subRole) { toast.error('Sub-role is required'); return }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        designation: formData.subRole || formData.designation,
        salary: {
          basic: parseFloat(formData.salary.basic) || 0,
          allowances: parseFloat(formData.salary.allowances) || 0
        }
      }
      if (selectedStaff) {
        await staffService.updateStaff(selectedStaff._id, payload)
        toast.success('Staff member updated successfully')
      } else {
        await staffService.createStaff(payload)
        toast.success('Staff member added. Default password is their phone number.')
      }
      setShowAddModal(false)
      setFormData(EMPTY_FORM)
      setSelectedStaff(null)
      fetchStaff()
    } catch (err) {
      toast.error(err.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this staff member?')) return
    try {
      await staffService.deleteStaff(id)
      toast.success('Staff member deactivated')
      fetchStaff()
    } catch {
      toast.error('Failed to deactivate staff member')
    }
  }

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !formData.skills.includes(s)) {
      field('skills', [...formData.skills, s])
      setSkillInput('')
    }
  }

  const inp = `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 ${
    darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'
  }`
  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`

  const columns = [
    {
      header: 'Employee ID',
      accessor: 'employeeId',
      render: (row) => <span className="font-mono text-sm">{row.employeeId || 'N/A'}</span>
    },
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-semibold">{row.userId?.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">{row.userId?.email || ''}</p>
        </div>
      )
    },
    {
      header: 'Role',
      accessor: 'designation',
      render: (row) => {
        const role = row.userId?.subRole || row.designation || 'Staff'
        const colours = {
          'Nurse': 'bg-green-100 text-green-700',
          'Receptionist': 'bg-blue-100 text-blue-700',
          'Pharmacist': 'bg-purple-100 text-purple-700',
          'Lab Technician': 'bg-yellow-100 text-yellow-700',
          'Ward Manager': 'bg-orange-100 text-orange-700'
        }
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colours[role] || 'bg-gray-100 text-gray-700'}`}>{role}</span>
      }
    },
    { header: 'Department', accessor: 'department' },
    { header: 'Phone', accessor: 'phone', render: (row) => row.userId?.phone || 'N/A' },
    {
      header: 'Shift',
      accessor: 'shift',
      render: (row) => {
        const colours = { Morning: 'bg-blue-100 text-blue-700', Evening: 'bg-orange-100 text-orange-700', Night: 'bg-purple-100 text-purple-700', Rotational: 'bg-gray-100 text-gray-700' }
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colours[row.shift] || 'bg-gray-100 text-gray-700'}`}>{row.shift}</span>
      }
    },
    {
      header: 'Type',
      accessor: 'employmentType',
      render: (row) => {
        const colours = { 'Full-Time': 'bg-green-100 text-green-700', 'Part-Time': 'bg-yellow-100 text-yellow-700', Contract: 'bg-red-100 text-red-700', Intern: 'bg-gray-100 text-gray-700' }
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colours[row.employmentType] || 'bg-gray-100 text-gray-700'}`}>{row.employmentType}</span>
      }
    },
    {
      header: 'Salary',
      accessor: 'salary',
      render: (row) => <span className="font-semibold text-green-600">₹{row.salary?.total?.toLocaleString() || '0'}</span>
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedStaff(row)
              setFormData({
                ...EMPTY_FORM,
                subRole: row.userId?.subRole || row.designation || '',
                department: row.department || '',
                qualification: row.qualification || '',
                joiningDate: row.joiningDate ? new Date(row.joiningDate).toISOString().split('T')[0] : '',
                employmentType: row.employmentType || 'Full-Time',
                shift: row.shift || 'Morning',
                salary: { basic: row.salary?.basic || '', allowances: row.salary?.allowances || '' },
                skills: row.skills || []
              })
              setShowAddModal(true)
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  const filtered = staff.filter(s => {
    const role = s.userId?.subRole || s.designation || ''
    if (filterSubRole && role !== filterSubRole) return false
    if (filterShift && s.shift !== filterShift) return false
    return true
  })

  if (loading) return <SkeletonDashboard />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Staff Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage hospital staff and employees</p>
        </div>
        <button
          onClick={() => { setSelectedStaff(null); setFormData(EMPTY_FORM); setShowAddModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Staff" value={staff.length} icon={Users} color="from-blue-600 to-cyan-500" />
        <StatCard title="Nurses" value={staff.filter(s => (s.userId?.subRole || s.designation) === 'Nurse').length} icon={Briefcase} color="from-emerald-600 to-teal-500" />
        <StatCard title="Support Staff" value={staff.filter(s => (s.userId?.subRole || s.designation) !== 'Nurse').length} icon={Star} color="from-violet-600 to-purple-500" />
        <StatCard title="On Duty" value={staff.filter(s => s.isActive).length} icon={TrendingUp} color="from-orange-500 to-amber-500" />
      </div>

      {/* Filters */}
      <div className={`border rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center
        ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`}>
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <select
          value={filterSubRole}
          onChange={e => setFilterSubRole(e.target.value)}
          className={`px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
            ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
        >
          <option value="">All Sub-Roles</option>
          {SUB_ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
        <select
          value={filterShift}
          onChange={e => setFilterShift(e.target.value)}
          className={`px-3 py-1.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
            ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
        >
          <option value="">All Shifts</option>
          {['Morning', 'Evening', 'Night', 'Rotational'].map(s => <option key={s}>{s}</option>)}
        </select>
        {(filterSubRole || filterShift) && (
          <button
            onClick={() => { setFilterSubRole(''); setFilterShift('') }}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
        <span className={`ml-auto text-xs tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {filtered.length} of {staff.length} members
        </span>
      </div>

      <TableComponent
        columns={columns}
        data={filtered}
        searchPlaceholder="Search staff by name, ID, or role…"
        emptyIcon={Users}
        emptyText="No staff members found"
      />

      {/* Add / Edit Staff Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={selectedStaff ? 'Edit Staff Member' : 'Add New Staff Member'} size="xl">
        <div className="space-y-5">
          {/* Personal info — only when creating new */}
          {!selectedStaff && (
            <>
              <div className={`rounded-lg p-3 text-sm ${darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                Default password will be the staff member's phone number. They can change it after first login.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Full Name *</label>
                  <input type="text" value={formData.name} onChange={e => field('name', e.target.value)} className={inp} placeholder="Anjali Mehta" />
                </div>
                <div>
                  <label className={lbl}>Email *</label>
                  <input type="email" value={formData.email} onChange={e => field('email', e.target.value)} className={inp} placeholder="staff@hospital.com" />
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

          {/* Staff profile fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Sub-Role *</label>
              <select value={formData.subRole} onChange={e => field('subRole', e.target.value)} className={inp}>
                <option value="">Select Sub-Role</option>
                {SUB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Department *</label>
              <select value={formData.department} onChange={e => field('department', e.target.value)} className={inp}>
                <option value="">Select Department</option>
                {['General Ward','ICU','Emergency','Pharmacy','Laboratory','Radiology','Administration','Finance','Maintenance','OPD'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Employment Type</label>
              <select value={formData.employmentType} onChange={e => field('employmentType', e.target.value)} className={inp}>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Shift</label>
              <select value={formData.shift} onChange={e => field('shift', e.target.value)} className={inp}>
                <option value="Morning">Morning (6 AM – 2 PM)</option>
                <option value="Evening">Evening (2 PM – 10 PM)</option>
                <option value="Night">Night (10 PM – 6 AM)</option>
                <option value="Rotational">Rotational</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Joining Date</label>
              <input type="date" value={formData.joiningDate} onChange={e => field('joiningDate', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Qualification</label>
              <input type="text" value={formData.qualification} onChange={e => field('qualification', e.target.value)} className={inp} placeholder="B.Sc Nursing, MBBS" />
            </div>
            <div>
              <label className={lbl}>Basic Salary (₹)</label>
              <input type="number" value={formData.salary.basic} onChange={e => setFormData(f => ({ ...f, salary: { ...f.salary, basic: e.target.value } }))} className={inp} placeholder="30000" />
            </div>
            <div>
              <label className={lbl}>Allowances (₹)</label>
              <input type="number" value={formData.salary.allowances} onChange={e => setFormData(f => ({ ...f, salary: { ...f.salary, allowances: e.target.value } }))} className={inp} placeholder="5000" />
            </div>
            <div>
              <label className={lbl}>Total Salary</label>
              <input readOnly value={`₹${((parseFloat(formData.salary.basic) || 0) + (parseFloat(formData.salary.allowances) || 0)).toLocaleString()}`} className={`${inp} opacity-60 cursor-not-allowed`} />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className={lbl}>Skills</label>
            <div className="flex space-x-2 mb-2">
              <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} className={`${inp} flex-1`} placeholder="Add a skill and press Enter" />
              <button type="button" onClick={addSkill} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((s, i) => (
                <span key={i} className={`px-3 py-1 rounded-full text-sm flex items-center gap-1.5 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                  {s}
                  <button type="button" onClick={() => field('skills', formData.skills.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 font-bold">×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAddModal(false)} className={`px-5 py-2 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-sm hover:shadow-md hover:shadow-blue-500/25 active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : (selectedStaff ? 'Update Staff' : 'Add Staff')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Staff
