import React, { useState, useEffect, useRef } from 'react'
import {
  User, Mail, Phone, MapPin, Calendar, Shield,
  Edit2, Save, X, Stethoscope, Heart, Briefcase,
  Droplet, Star, Loader2, CheckCircle, Upload, Camera
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import * as authService from '../services/authService'

const AVATAR_PRESETS = [
  { key: 'blue',    bg: 'linear-gradient(135deg,#3b82f6,#06b6d4)' },
  { key: 'emerald', bg: 'linear-gradient(135deg,#10b981,#14b8a6)' },
  { key: 'violet',  bg: 'linear-gradient(135deg,#8b5cf6,#a855f7)' },
  { key: 'rose',    bg: 'linear-gradient(135deg,#f43f5e,#ec4899)' },
  { key: 'amber',   bg: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  { key: 'cyan',    bg: 'linear-gradient(135deg,#06b6d4,#0ea5e9)'  },
  { key: 'indigo',  bg: 'linear-gradient(135deg,#6366f1,#4f46e5)'  },
  { key: 'red',     bg: 'linear-gradient(135deg,#ef4444,#f97316)'  },
]

const ROLE_AVATAR_DEFAULT = {
  Doctor: 'blue', Patient: 'emerald', Nurse: 'violet',
  Pharmacist: 'cyan', Admin: 'indigo', Receptionist: 'rose',
  Staff: 'amber', 'Lab Technician': 'red', 'Ward Manager': 'indigo',
}

const ROLE_BADGE = {
  Doctor:           'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
  Patient:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Nurse:            'bg-violet-100 text-violet-700  dark:bg-violet-900/30 dark:text-violet-300',
  Pharmacist:       'bg-cyan-100   text-cyan-700    dark:bg-cyan-900/30   dark:text-cyan-300',
  Admin:            'bg-indigo-100 text-indigo-700  dark:bg-indigo-900/30 dark:text-indigo-300',
  Receptionist:     'bg-rose-100   text-rose-700    dark:bg-rose-900/30   dark:text-rose-300',
  Staff:            'bg-amber-100  text-amber-700   dark:bg-amber-900/30  dark:text-amber-300',
  'Lab Technician': 'bg-red-100    text-red-700     dark:bg-red-900/30    dark:text-red-300',
  'Ward Manager':   'bg-indigo-100 text-indigo-700  dark:bg-indigo-900/30 dark:text-indigo-300',
}

const EMPTY_ADDR = { street: '', city: '', state: '', zipCode: '', country: '' }

const parseAddress = (addr) => {
  if (!addr) return { ...EMPTY_ADDR }
  if (typeof addr === 'string') return { ...EMPTY_ADDR, street: addr }
  return {
    street:  addr.street  || '',
    city:    addr.city    || '',
    state:   addr.state   || '',
    zipCode: addr.zipCode || '',
    country: addr.country || '',
  }
}

const formatAddress = (addr) => {
  if (!addr) return ''
  if (typeof addr === 'string') return addr
  return [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean).join(', ')
}

const getInitials = (name) =>
  (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, label, iconBg, note, darkMode }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon className="w-4 h-4" />
    </div>
    <h3 className={`font-semibold text-[15px] ${darkMode ? 'text-white' : 'text-[#2C3E50]'}`}>{label}</h3>
    {note && <span className="ml-auto text-xs text-gray-400 italic">{note}</span>}
  </div>
)

const ViewValue = ({ value, darkMode, mono = false }) => (
  <p className={`text-sm font-medium py-2 ${mono ? 'font-mono' : ''} ${darkMode ? 'text-white' : 'text-[#2C3E50]'}`}>
    {value || <span className="text-gray-400 font-normal italic">Not set</span>}
  </p>
)

// ─── Main component ───────────────────────────────────────────────────────────

const Profile = () => {
  const { darkMode } = useTheme()
  const { user, updateUser } = useAuth()

  const [profileData, setProfileData] = useState(null)
  const [roleProfile, setRoleProfile]  = useState(null)
  const [pageLoading, setPageLoading]  = useState(true)
  const [editing, setEditing]          = useState(false)
  const [saving, setSaving]            = useState(false)
  const [showPicker, setShowPicker]    = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading]      = useState(false)
  const fileInputRef                   = useRef(null)

  const role = user?.role || 'Staff'

  const [form, setForm] = useState({
    name: '', phone: '', dateOfBirth: '', gender: '',
    address: { ...EMPTY_ADDR }, avatar: ''
  })
  const [snapshot, setSnapshot] = useState({})

  // ── Styles ──
  const card = `border rounded-2xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200/80'}`
  const inp  = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE]
    ${darkMode
      ? 'bg-gray-700/70 border-gray-600 text-white placeholder-gray-500'
      : 'bg-[#F5F7FA] border-[#E2E8F0] text-[#2C3E50] placeholder-[#94A3B8] hover:border-[#5DADE2]/50'}`
  const inpDisabled = `w-full px-3 py-2.5 rounded-xl border text-sm cursor-not-allowed
    ${darkMode ? 'bg-gray-700/30 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`
  const lbl  = `block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-gray-500' : 'text-[#94A3B8]'}`
  const textCls = darkMode ? 'text-white' : 'text-[#2C3E50]'

  const isImageAvatar = form.avatar?.startsWith('/uploads/') || form.avatar?.startsWith('http')
  const avatarKey     = isImageAvatar ? null : (form.avatar || ROLE_AVATAR_DEFAULT[role] || 'blue')
  const avatarPreset  = AVATAR_PRESETS.find(p => p.key === avatarKey) || AVATAR_PRESETS[0]
  const initials      = getInitials(profileData?.name || user?.name)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file')
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB')

    const localUrl = URL.createObjectURL(file)
    setImagePreview(localUrl)

    try {
      setUploading(true)
      const res = await authService.uploadAvatar(file)
      const avatarUrl = res?.avatarUrl || res?.data?.avatarUrl
      if (avatarUrl) {
        setForm(f => ({ ...f, avatar: avatarUrl }))
        toast.success('Photo uploaded! Save your profile to confirm.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
      setImagePreview(null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Data loading ──
  const loadProfile = async () => {
    try {
      setPageLoading(true)
      const res = await authService.getMyProfile()
      const u   = res.user || res.data?.user || res
      const rp  = res.roleProfile ?? res.data?.roleProfile ?? null
      setProfileData(u)
      setRoleProfile(rp)
      const f = buildForm(u)
      setForm(f)
      setSnapshot(JSON.parse(JSON.stringify(f)))
    } catch {
      if (user) {
        const f = buildForm(user)
        setForm(f)
        setSnapshot(JSON.parse(JSON.stringify(f)))
        setProfileData(user)
      }
    } finally {
      setPageLoading(false)
    }
  }

  const buildForm = (u) => ({
    name:        u.name        || '',
    phone:       u.phone       || '',
    dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split('T')[0] : '',
    gender:      u.gender      || '',
    address:     parseAddress(u.address),
    avatar:      u.avatar      || '',
  })

  useEffect(() => { loadProfile() }, [])

  // ── Edit flow ──
  const startEdit = () => {
    setSnapshot(JSON.parse(JSON.stringify(form)))
    setEditing(true)
  }

  const cancelEdit = () => {
    setForm(JSON.parse(JSON.stringify(snapshot)))
    setEditing(false)
    setShowPicker(false)
  }

  const saveEdit = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      const res = await authService.updateProfile({
        name:        form.name.trim(),
        phone:       form.phone       || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender:      form.gender      || undefined,
        address:     form.address,
        avatar:      form.avatar      || undefined,
      })
      const updated = res?.user || res?.data?.user
      if (updated) updateUser(updated)
      setProfileData(prev => ({ ...prev, ...form }))
      setSnapshot(JSON.parse(JSON.stringify(form)))
      setEditing(false)
      setShowPicker(false)
      toast.success('Profile saved!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const setAddr = (field, val) =>
    setForm(f => ({ ...f, address: { ...f.address, [field]: val } }))

  // ── Role-specific read-only section ──
  const renderRoleSection = () => {
    if (!roleProfile) return null

    if (role === 'Doctor') return (
      <div className={card + ' p-6'}>
        <SectionHeader
          icon={Stethoscope}
          label="Medical Profile"
          iconBg="bg-blue-50 dark:bg-blue-900/20 text-[#2E86DE]"
          note="Read only"
          darkMode={darkMode}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {[
            { l: 'Specialization',   v: roleProfile.specialization },
            { l: 'Department',       v: roleProfile.department },
            { l: 'Experience',       v: roleProfile.experience != null ? `${roleProfile.experience} years` : null },
            { l: 'Qualification',    v: roleProfile.qualification },
            { l: 'License Number',   v: roleProfile.licenseNumber },
            { l: 'Consultation Fee', v: roleProfile.consultationFee != null ? `₹${roleProfile.consultationFee}` : null },
          ].filter(f => f.v).map(({ l, v }) => (
            <div key={l}>
              <p className={lbl}>{l}</p>
              <p className={`text-sm font-medium ${textCls}`}>{v}</p>
            </div>
          ))}
          {roleProfile.rating != null && (
            <div>
              <p className={lbl}>Rating</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className={`text-sm font-semibold ${textCls}`}>{roleProfile.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({roleProfile.totalRatings || 0} reviews)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )

    if (role === 'Patient') {
      const medHist  = roleProfile.medicalHistory || []
      const allergies = roleProfile.allergies || []
      return (
        <div className={card + ' p-6'}>
          <SectionHeader
            icon={Heart}
            label="Medical Record"
            iconBg="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
            note="Read only"
            darkMode={darkMode}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-4">
            <div>
              <p className={lbl}>Patient ID</p>
              <p className={`text-sm font-mono font-medium ${textCls}`}>{roleProfile.patientId}</p>
            </div>
            {roleProfile.bloodGroup && (
              <div>
                <p className={lbl}>Blood Group</p>
                <span className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  <Droplet className="w-3.5 h-3.5" />
                  {roleProfile.bloodGroup}
                </span>
              </div>
            )}
          </div>

          {allergies.length > 0 && (
            <div className="mb-4">
              <p className={lbl}>Allergies</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allergies.map((a, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {medHist.length > 0 && (
            <div>
              <p className={lbl}>Medical History</p>
              <div className="space-y-2 mt-1">
                {medHist.slice(0, 4).map((m, i) => (
                  <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      m.status === 'Active' ? 'bg-red-500' : m.status === 'Chronic' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <p className={`text-sm font-medium flex-1 ${textCls}`}>{m.condition}</p>
                    <span className="text-xs text-gray-400 shrink-0">{m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    // Staff / Nurse / Pharmacist / Receptionist
    return (
      <div className={card + ' p-6'}>
        <SectionHeader
          icon={Briefcase}
          label="Employment Details"
          iconBg="bg-amber-50 dark:bg-amber-900/20 text-amber-600"
          note="Read only"
          darkMode={darkMode}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {[
            { l: 'Employee ID',      v: roleProfile.employeeId },
            { l: 'Designation',      v: roleProfile.designation },
            { l: 'Department',       v: roleProfile.department },
            { l: 'Shift',            v: roleProfile.shift },
            { l: 'Employment Type',  v: roleProfile.employmentType },
            { l: 'Joining Date',     v: roleProfile.joiningDate
                ? new Date(roleProfile.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : null },
          ].filter(f => f.v).map(({ l, v }) => (
            <div key={l}>
              <p className={lbl}>{l}</p>
              <p className={`text-sm font-medium ${textCls}`}>{v}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Loading state ──
  if (pageLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[2.5px] border-[#2E86DE] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading profile…</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${textCls}`}>My Profile</h1>
          <p className="text-gray-500 mt-0.5 text-sm">View and manage your personal information</p>
        </div>

        {!editing ? (
          <button
            onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] active:scale-[0.97] transition-all"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={cancelEdit}
              className={`flex items-center gap-2 px-4 py-2.5 border text-sm font-medium rounded-xl transition-all
                ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* LEFT: Avatar panel */}
        <div className="w-full lg:w-[272px] xl:w-[288px] flex-shrink-0 lg:sticky lg:top-4 space-y-4">
          <div className={card + ' p-6 flex flex-col items-center text-center'}>

            {/* Avatar circle */}
            <div className="relative mb-4">
              {isImageAvatar || imagePreview ? (
                <img
                  src={imagePreview || form.avatar}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                  style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold select-none"
                  style={{ background: avatarPreset.bg, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
                >
                  {initials}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
              {editing && (
                <button
                  onClick={() => setShowPicker(v => !v)}
                  className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-md transition-colors
                    ${showPicker
                      ? 'bg-[#2E86DE] border-[#2E86DE] text-white'
                      : darkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-[#2E86DE]'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-[#2E86DE]'}`}
                  title="Change avatar"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Avatar picker: photo upload + color presets */}
            {editing && showPicker && (
              <div className={`w-full mb-3 p-3 rounded-xl border space-y-3 ${darkMode ? 'bg-gray-700/60 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                {/* Upload photo */}
                <div>
                  <p className="text-xs text-gray-400 mb-2 font-medium">Upload photo</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg border-2 border-dashed cursor-pointer text-xs font-medium transition-colors
                      ${darkMode
                        ? 'border-gray-500 text-gray-400 hover:border-[#2E86DE] hover:text-blue-400'
                        : 'border-gray-300 text-gray-500 hover:border-[#2E86DE] hover:text-[#2E86DE]'}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? 'Uploading…' : 'Choose image (max 2MB)'}
                  </label>
                  {isImageAvatar && (
                    <button
                      onClick={() => { setForm(f => ({ ...f, avatar: '' })); setImagePreview(null); setShowPicker(false) }}
                      className="mt-1.5 w-full text-xs text-red-500 hover:text-red-700 transition text-center"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
                {/* Color presets */}
                <div>
                  <p className="text-xs text-gray-400 mb-2 font-medium">Or choose color</p>
                  <div className="grid grid-cols-4 gap-2">
                    {AVATAR_PRESETS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => { setForm(f => ({ ...f, avatar: p.key })); setImagePreview(null); setShowPicker(false) }}
                        className={`h-8 rounded-lg transition-all duration-150 ${
                          avatarKey === p.key
                            ? 'ring-2 ring-[#2E86DE] ring-offset-2 scale-110'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ background: p.bg }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Name + role */}
            <h2 className={`text-base font-bold ${textCls} leading-tight`}>
              {profileData?.name || user?.name}
            </h2>
            <span className={`mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[role] || ROLE_BADGE.Staff}`}>
              {user?.subRole || role}
            </span>

            {/* Quick info */}
            <div className={`w-full border-t mt-4 pt-4 space-y-2.5 text-left ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-start gap-2.5 min-w-0">
                <Mail className="w-3.5 h-3.5 text-[#2E86DE] flex-shrink-0 mt-0.5" />
                <span className="text-xs text-gray-400 break-all leading-snug">{profileData?.email || user?.email}</span>
              </div>
              {form.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-[#2E86DE] flex-shrink-0" />
                  <span className="text-xs text-gray-400">{form.phone}</span>
                </div>
              )}
              {profileData?.createdAt && (
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-3.5 h-3.5 text-[#2E86DE] flex-shrink-0" />
                  <span className="text-xs text-gray-400">
                    Joined {new Date(profileData.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Shield className="w-3.5 h-3.5 text-[#2E86DE] flex-shrink-0" />
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
                  ${profileData?.isActive !== false
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                  <CheckCircle className="w-3 h-3" />
                  {profileData?.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Form + role info */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Personal Information */}
          <div className={card + ' p-6'}>
            <SectionHeader
              icon={User}
              label="Personal Information"
              iconBg={`${darkMode ? 'bg-gray-700' : 'bg-[#EBF5FB]'} text-[#2E86DE]`}
              darkMode={darkMode}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

              <div>
                <label className={lbl}>Full Name</label>
                {editing
                  ? <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} placeholder="Your full name" />
                  : <ViewValue value={profileData?.name} darkMode={darkMode} />}
              </div>

              <div>
                <label className={lbl}>Email</label>
                <input type="email" value={profileData?.email || user?.email || ''} readOnly className={inpDisabled} />
                <p className="text-[11px] text-gray-400 mt-1">Contact admin to change email</p>
              </div>

              <div>
                <label className={lbl}>Phone</label>
                {editing
                  ? <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} placeholder="+91 9876543210" />
                  : <ViewValue value={profileData?.phone} darkMode={darkMode} />}
              </div>

              <div>
                <label className={lbl}>Date of Birth</label>
                {editing
                  ? <input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className={inp} />
                  : <ViewValue
                      value={profileData?.dateOfBirth
                        ? new Date(profileData.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                        : null}
                      darkMode={darkMode}
                    />}
              </div>

              <div>
                <label className={lbl}>Gender</label>
                {editing
                  ? (
                    <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className={inp}>
                      <option value="">— Select —</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  )
                  : <ViewValue value={profileData?.gender} darkMode={darkMode} />}
              </div>

              <div>
                <label className={lbl}>Role</label>
                <div className="py-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE[role] || ROLE_BADGE.Staff}`}>
                    {user?.subRole || role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className={card + ' p-6'}>
            <SectionHeader
              icon={MapPin}
              label="Address"
              iconBg={`${darkMode ? 'bg-gray-700' : 'bg-[#EBF5FB]'} text-[#2E86DE]`}
              darkMode={darkMode}
            />
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div className="sm:col-span-2">
                  <label className={lbl}>Street</label>
                  <input type="text" value={form.address.street} onChange={e => setAddr('street', e.target.value)} className={inp} placeholder="Street / flat / building" />
                </div>
                <div>
                  <label className={lbl}>City</label>
                  <input type="text" value={form.address.city} onChange={e => setAddr('city', e.target.value)} className={inp} placeholder="City" />
                </div>
                <div>
                  <label className={lbl}>State</label>
                  <input type="text" value={form.address.state} onChange={e => setAddr('state', e.target.value)} className={inp} placeholder="State" />
                </div>
                <div>
                  <label className={lbl}>ZIP / Pincode</label>
                  <input type="text" value={form.address.zipCode} onChange={e => setAddr('zipCode', e.target.value)} className={inp} placeholder="ZIP code" />
                </div>
                <div>
                  <label className={lbl}>Country</label>
                  <input type="text" value={form.address.country} onChange={e => setAddr('country', e.target.value)} className={inp} placeholder="Country" />
                </div>
              </div>
            ) : (
              formatAddress(profileData?.address)
                ? <p className={`text-sm font-medium leading-relaxed ${textCls}`}>{formatAddress(profileData?.address)}</p>
                : <p className="text-sm text-gray-400 italic">No address on file</p>
            )}
          </div>

          {/* Role-specific section */}
          {renderRoleSection()}

        </div>
      </div>
    </div>
  )
}

export default Profile
