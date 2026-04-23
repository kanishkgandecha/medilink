import React, { useState, useRef, useEffect } from 'react'
import {
  Menu, Sun, Moon, User, Settings, LogOut,
  ChevronDown, Lock, Eye, EyeOff
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { changePassword } from '../../services/authService'
import { toast } from 'react-toastify'

// ─── Page title map ───────────────────────────────────────
const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/patients':     'Patients',
  '/doctors':      'Doctors',
  '/appointments': 'Appointments',
  '/wards':        'Wards & Beds',
  '/pharmacy':     'Pharmacy',
  '/prescriptions':'Prescriptions',
  '/billing':      'Billing',
  '/reports':      'Reports',
  '/staff':        'Staff',
  '/settings':     'Settings',
  '/test-reports': 'Test Reports',
}

// ─── Reusable icon button ─────────────────────────────────
const IconBtn = ({ onClick, title, darkMode, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`relative p-2 rounded-lg transition-all duration-200
      ${darkMode
        ? 'text-gray-400 hover:text-white hover:bg-gray-800'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
  >
    {children}
  </button>
)

// ─── Component ───────────────────────────────────────────
const Header = () => {
  const { darkMode, toggleDarkMode, toggleSidebar } = useTheme()
  const { user, logout }  = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()
  const [open, setOpen]   = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' })
  const [showPw,  setShowPw]  = useState({ current: false, next: false, confirm: false })
  const [submitting, setSubmitting] = useState(false)
  const dropdownRef = useRef(null)

  const pageTitle = PAGE_TITLES[location.pathname] || 'MediLink'
  const initials  = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChangePw = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      toast.error('All fields are required'); return
    }
    if (pwForm.next.length < 6) {
      toast.error('New password must be at least 6 characters'); return
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error('Passwords do not match'); return
    }
    setSubmitting(true)
    try {
      await changePassword(pwForm.current, pwForm.next)
      toast.success('Password changed successfully')
      setShowPwModal(false)
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(err.message || 'Failed to change password')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = `w-full px-4 py-2.5 rounded-xl border text-sm pr-10
    focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500
    transition-all duration-200
    ${darkMode
      ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400'
      : 'bg-gray-50   border-gray-200 text-gray-900 placeholder-gray-400'}`

  return (
    <>
      {/* ── Header bar ─────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 border-b
          ${darkMode
            ? 'bg-gray-900/95 border-gray-800'
            : 'bg-white/95   border-gray-100'}
          backdrop-blur-sm`}
        style={{ boxShadow: darkMode ? '0 1px 0 rgba(255,255,255,0.04)' : '0 1px 0 rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between px-5 h-14">

          {/* Left: sidebar toggle + page title */}
          <div className="flex items-center gap-3">
            <IconBtn onClick={toggleSidebar} title="Toggle sidebar" darkMode={darkMode}>
              <Menu className="w-[18px] h-[18px]" />
            </IconBtn>

            <div className="hidden sm:flex items-center gap-2">
              <h1 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1">
            {/* Dark/light toggle */}
            <IconBtn onClick={toggleDarkMode} title={darkMode ? 'Light mode' : 'Dark mode'} darkMode={darkMode}>
              {darkMode
                ? <Sun  className="w-[18px] h-[18px]" />
                : <Moon className="w-[18px] h-[18px]" />}
            </IconBtn>

            {/* Divider */}
            <div className={`mx-1.5 w-px h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen(v => !v)}
                className={`flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl transition-all duration-200
                  ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold select-none shadow-sm">
                  {initials}
                </div>

                {/* Name + role */}
                <div className="hidden sm:block text-left leading-tight">
                  <p className={`text-[13px] font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {user?.name?.split(' ')[0] || 'User'}
                  </p>
                  <p className="text-[11px] text-gray-400 capitalize">
                    {user?.subRole || user?.role || 'Staff'}
                  </p>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200
                    ${open ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown */}
              {open && (
                <div
                  className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl border
                    overflow-hidden z-50 animate-scale-in
                    ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
                  style={{ boxShadow: darkMode
                    ? '0 20px 40px rgba(0,0,0,0.5)'
                    : '0 20px 40px rgba(0,0,0,0.12)'
                  }}
                >
                  {/* User info header */}
                  <div className={`px-4 py-3.5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5">
                    {[
                      { icon: User,     label: 'My Profile',       action: () => { setOpen(false); navigate('/settings') } },
                      { icon: Settings, label: 'Settings',          action: () => { setOpen(false); navigate('/settings') } },
                      { icon: Lock,     label: 'Change Password',   action: () => { setOpen(false); setShowPwModal(true)  } },
                    ].map(({ icon: Icon, label, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150
                          ${darkMode
                            ? 'text-gray-300 hover:bg-gray-700/60 hover:text-white'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                        {label}
                      </button>
                    ))}

                    <div className={`mx-3 my-1 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />

                    <button
                      onClick={() => { setOpen(false); logout() }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150
                        text-red-500 hover:text-red-600
                        ${darkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`}
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Change Password Modal ─────────────────────────── */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowPwModal(false)}
          />

          {/* Panel */}
          <div
            className={`relative w-full max-w-md rounded-2xl shadow-2xl animate-scale-in
              ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.25)' }}
          >
            {/* Header */}
            <div className={`px-6 pt-6 pb-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Lock className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Change Password
                  </h2>
                  <p className="text-xs text-gray-400">Keep your account secure</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {[
                { key: 'current', label: 'Current Password',      placeholder: 'Enter current password' },
                { key: 'next',    label: 'New Password',           placeholder: 'At least 6 characters'  },
                { key: 'confirm', label: 'Confirm New Password',   placeholder: 'Re-enter new password'  },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide
                    ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw[key] ? 'text' : 'password'}
                      value={pwForm[key]}
                      onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      className={inputCls}
                      placeholder={placeholder}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t flex justify-end gap-3
              ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <button
                onClick={() => setShowPwModal(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200
                  ${darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePw}
                disabled={submitting}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium rounded-lg
                  hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-sm
                  hover:shadow-md hover:shadow-blue-500/25 active:scale-[0.97]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving…' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
