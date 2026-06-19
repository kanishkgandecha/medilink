import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Users, UserPlus, Calendar, Bed, Pill,
  DollarSign, BarChart3, Briefcase, Settings,
  FileText, ClipboardList, FlaskConical,
  Sun, Moon, Bell, ChevronDown, LogOut, User, Lock, Eye, EyeOff,
  X, CheckCheck,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { changePassword } from '../../services/authService'
import { toast } from 'react-toastify'
import logoLight from '../../assets/logo/logo-icon-bg-light.png'
import logoDark  from '../../assets/logo/logo-icon-bg-dark.png'

// ── Role → nav items ─────────────────────────────────────────────────────────
const MENUS = {
  admin: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,          path: '/dashboard'    },
    { id: 'patients',     label: 'Patients',     icon: Users,         path: '/patients'     },
    { id: 'doctors',      label: 'Doctors',      icon: UserPlus,      path: '/doctors'      },
    { id: 'staff',        label: 'Staff',        icon: Briefcase,     path: '/staff'        },
    { id: 'appointments', label: 'Appointments', icon: Calendar,      path: '/appointments' },
    { id: 'wards',        label: 'Wards & Beds', icon: Bed,           path: '/wards'        },
    { id: 'pharmacy',     label: 'Pharmacy',     icon: Pill,          path: '/pharmacy'     },
    { id: 'billing',      label: 'Billing',      icon: DollarSign,    path: '/billing'      },
    { id: 'reports',      label: 'Reports',      icon: BarChart3,     path: '/reports'      },
  ],
  doctor: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,          path: '/dashboard'    },
    { id: 'appointments', label: 'Appointments', icon: Calendar,      path: '/appointments' },
    { id: 'patients',     label: 'Patients',     icon: Users,         path: '/patients'     },
    { id: 'prescriptions',label: 'Prescriptions',icon: FileText,      path: '/prescriptions'},
    { id: 'test-reports', label: 'Test Reports', icon: FlaskConical,  path: '/test-reports' },
  ],
  patient: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,          path: '/dashboard'    },
    { id: 'appointments', label: 'Appointments', icon: Calendar,      path: '/appointments' },
    { id: 'prescriptions',label: 'Prescriptions',icon: Pill,          path: '/prescriptions'},
    { id: 'billing',      label: 'My Bills',     icon: DollarSign,    path: '/billing'      },
    { id: 'test-reports', label: 'Test Reports', icon: FileText,      path: '/test-reports' },
  ],
  nurse: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,          path: '/dashboard'    },
    { id: 'patients',     label: 'Patients',     icon: Users,         path: '/patients'     },
    { id: 'wards',        label: 'Ward Status',  icon: Bed,           path: '/wards'        },
    { id: 'prescriptions',label: 'Prescriptions',icon: ClipboardList, path: '/prescriptions'},
    { id: 'appointments', label: 'Appointments', icon: Calendar,      path: '/appointments' },
  ],
  receptionist: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,          path: '/dashboard'    },
    { id: 'appointments', label: 'Appointments', icon: Calendar,      path: '/appointments' },
    { id: 'patients',     label: 'Patients',     icon: Users,         path: '/patients'     },
    { id: 'billing',      label: 'Billing',      icon: DollarSign,    path: '/billing'      },
  ],
  pharmacist: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,          path: '/dashboard'    },
    { id: 'pharmacy',     label: 'Medicines',    icon: Pill,          path: '/pharmacy'     },
    { id: 'prescriptions',label: 'Prescriptions',icon: FileText,      path: '/prescriptions'},
    { id: 'billing',      label: 'Billing',      icon: DollarSign,    path: '/billing'      },
  ],
  'lab technician': [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,          path: '/dashboard'    },
    { id: 'test-reports', label: 'Test Reports', icon: FileText,      path: '/test-reports' },
    { id: 'patients',     label: 'Patients',     icon: Users,         path: '/patients'     },
  ],
  'ward manager': [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,          path: '/dashboard'    },
    { id: 'wards',        label: 'Wards & Beds', icon: Bed,           path: '/wards'        },
    { id: 'patients',     label: 'Patients',     icon: Users,         path: '/patients'     },
  ],
}
MENUS.administrator = MENUS.admin

// ── Role-based notification data ──────────────────────────────────────────────
const DOT_COLOR = {
  blue:    'bg-[#2E86DE]',
  teal:    'bg-teal-500',
  amber:   'bg-amber-500',
  violet:  'bg-violet-500',
  red:     'bg-red-500',
  orange:  'bg-orange-500',
  emerald: 'bg-emerald-500',
}

const ROLE_NOTIFS = {
  admin: [
    { id: 'a1', title: 'New staff accounts',    desc: '2 registrations pending approval',    time: '5m ago',  color: 'blue'   },
    { id: 'a2', title: 'Low pharmacy stock',     desc: 'Paracetamol below reorder threshold', time: '1h ago',  color: 'amber'  },
    { id: 'a3', title: '14 appointments today',  desc: 'Peak hours: 10 AM – 2 PM',            time: '2h ago',  color: 'violet' },
  ],
  doctor: [
    { id: 'd1', title: '6 appointments today',   desc: 'Next slot: 10:30 AM',                time: '10m ago', color: 'blue'  },
    { id: 'd2', title: 'Lab report ready',        desc: 'Results available for review',       time: '30m ago', color: 'teal'  },
  ],
  patient: [
    { id: 'p1', title: 'Upcoming appointment',   desc: 'Dr. Sharma — Tomorrow 11 AM',         time: '1h ago',  color: 'blue'   },
    { id: 'p2', title: 'Prescription ready',      desc: 'Available at pharmacy counter',       time: '3h ago',  color: 'violet' },
  ],
  pharmacist: [
    { id: 'ph1', title: 'Critical stock alert',  desc: '3 medications need restocking',       time: '5m ago',  color: 'red'   },
    { id: 'ph2', title: 'Expiring soon',           desc: '5 batches expire within 30 days',   time: '1h ago',  color: 'amber' },
  ],
  nurse: [
    { id: 'n1', title: 'Ward B — 3 beds free',   desc: 'New bed allocations available',       time: '15m ago', color: 'teal'   },
    { id: 'n2', title: 'Vitals pending',           desc: '4 patients need recording',          time: '30m ago', color: 'orange' },
  ],
  receptionist: [
    { id: 'r1', title: '8 check-ins today',      desc: '3 patients pending arrival',          time: '20m ago', color: 'blue'   },
    { id: 'r2', title: 'Slot freed up',            desc: '1 appointment was cancelled',        time: '1h ago',  color: 'orange' },
  ],
  'lab technician': [
    { id: 'l1', title: '3 tests pending',        desc: 'Reports awaiting processing',         time: '10m ago', color: 'blue'  },
  ],
  'ward manager': [
    { id: 'w1', title: 'Ward A at capacity',     desc: 'No beds available — divert patients', time: '30m ago', color: 'red'   },
    { id: 'w2', title: '2 discharges scheduled',  desc: 'Beds free after 2 PM',               time: '1h ago',  color: 'teal'  },
  ],
}
ROLE_NOTIFS.administrator = ROLE_NOTIFS.admin
const FALLBACK_NOTIFS = [
  { id: 'sys1', title: 'Welcome to MediLink', desc: 'Your healthcare dashboard is ready', time: 'Now', color: 'blue' },
]

// ── TopNav ────────────────────────────────────────────────────────────────────
const TopNav = () => {
  const { darkMode, toggleDarkMode } = useTheme()
  const { user, logout }   = useAuth()
  const navigate           = useNavigate()
  const location           = useLocation()

  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwForm, setPwForm]           = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw]           = useState({ current: false, next: false, confirm: false })
  const [submitting, setSubmitting]   = useState(false)
  const [dismissed, setDismissed]     = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ml-notifs-dismissed') || '[]') } catch { return [] }
  })

  const profileRef = useRef(null)
  const notifRef   = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const userRole    = user?.role?.toLowerCase()    || 'patient'
  const userSubRole = user?.subRole?.toLowerCase() || ''
  const menuKey     = userRole === 'staff'
    ? (userSubRole && MENUS[userSubRole] ? userSubRole : 'patient')
    : userRole
  const items = MENUS[menuKey] || MENUS.patient

  const roleKey        = (user?.subRole || user?.role || '').toLowerCase()
  const allNotifs      = ROLE_NOTIFS[roleKey] || FALLBACK_NOTIFS
  const visibleNotifs  = allNotifs.filter(n => !dismissed.includes(n.id))
  const notifCount     = visibleNotifs.length

  const dismissNotif = (id) => {
    const next = [...dismissed, id]
    setDismissed(next)
    sessionStorage.setItem('ml-notifs-dismissed', JSON.stringify(next))
  }
  const dismissAll = () => {
    const all = allNotifs.map(n => n.id)
    setDismissed(all)
    sessionStorage.setItem('ml-notifs-dismissed', JSON.stringify(all))
  }

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

  const initials    = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const displayRole = user?.subRole || user?.role || 'Staff'
  const logo        = darkMode ? logoDark : logoLight

  const inputCls = `w-full px-4 py-2.5 rounded-xl border text-sm pr-10
    focus:outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE]
    transition-all duration-200
    ${darkMode
      ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400'
      : 'bg-[#F5F7FA] border-[#E2E8F0] text-[#2C3E50] placeholder-[#7B8A8B]'}`

  const barBg = darkMode
    ? 'bg-gray-800 border border-gray-700/70 shadow-[0_4px_24px_rgba(0,0,0,0.35)]'
    : 'bg-white border border-gray-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.07)]'

  const logoPill = darkMode
    ? 'bg-gray-700/80 border border-gray-600/60 shadow-sm'
    : 'bg-gray-50 border border-gray-200 shadow-sm'

  const navTrack = darkMode ? 'bg-gray-700/50' : 'bg-gray-100/90'

  const activeTab = darkMode
    ? 'bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.18)]'
    : 'bg-[#1e293b] text-white shadow-[0_2px_10px_rgba(30,41,59,0.25)]'

  const inactiveTab = darkMode
    ? 'text-gray-400 hover:bg-gray-600/60 hover:text-white'
    : 'text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'

  const iconPill = darkMode
    ? 'bg-gray-700/80 border border-gray-600/60 text-gray-300 hover:bg-gray-600 hover:text-white shadow-sm'
    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm'

  const dropdownCls = `absolute right-0 top-[calc(100%+8px)] rounded-2xl border overflow-hidden z-50
    ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`
  const dropdownShadow = {
    boxShadow: darkMode
      ? '0 20px 40px rgba(0,0,0,0.5)'
      : '0 8px 32px rgba(44,62,80,0.14), 0 0 0 1px rgba(46,134,222,0.04)'
  }

  return (
    <>
      {/* ── Sticky header wrapper ─────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 px-4 pt-2.5 pb-2
        ${darkMode ? 'bg-gray-900/98 backdrop-blur-sm' : 'bg-[#F9F8F4]'}`}>

        <div className={`flex items-center gap-2.5 rounded-2xl px-2.5 py-1.5 ${barBg}`}>

          {/* Logo pill */}
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 px-4 py-[7px] rounded-full flex-shrink-0
              transition-all duration-150 ${logoPill}`}
          >
            <img src={logo} alt="MediLink"
              className="w-[18px] h-[18px] rounded object-contain flex-shrink-0" draggable={false} />
            <span className={`text-[13px] font-bold tracking-tight ${darkMode ? 'text-white' : 'text-[#1e293b]'}`}>
              MediLink
            </span>
          </Link>

          {/* Nav track — hidden on mobile (replaced by BottomNav) */}
          <div className={`flex-1 min-w-0 hidden md:flex items-center rounded-full p-[5px] gap-0.5
            overflow-x-auto scrollbar-hide ${navTrack}`}>
            {items.map(item => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3.5 py-[6px] rounded-full
                    text-[13px] font-medium whitespace-nowrap flex-shrink-0
                    transition-all duration-150
                    ${isActive ? activeTab : inactiveTab}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Action pills */}
          <div className="flex items-center gap-1.5 flex-shrink-0">

            {/* Settings pill */}
            <button
              onClick={() => navigate('/settings')}
              className={`flex items-center gap-1.5 px-3 py-[7px] rounded-full
                text-[13px] font-medium transition-all duration-150 ${iconPill}`}
            >
              <Settings className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
              <span className="hidden md:block">Settings</span>
            </button>

            {/* Dark/light toggle */}
            <button
              onClick={toggleDarkMode}
              title={darkMode ? 'Light mode' : 'Dark mode'}
              className={`w-8 h-8 rounded-full flex items-center justify-center
                transition-all duration-150 flex-shrink-0 ${iconPill}`}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Notifications */}
            <div className="relative flex-shrink-0" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(v => !v); setProfileOpen(false) }}
                title="Notifications"
                className={`w-8 h-8 rounded-full flex items-center justify-center
                  transition-all duration-150 flex-shrink-0 ${iconPill}`}
              >
                <span className="relative block">
                  <Bell className="w-3.5 h-3.5" />
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full
                      bg-[#2E86DE] border-2 border-white dark:border-gray-800
                      flex items-center justify-center text-white text-[9px] font-bold leading-none">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </span>
              </button>

              {notifOpen && (
                <div className={`${dropdownCls} w-80`} style={dropdownShadow}>
                  {/* Notif header */}
                  <div className={`px-4 py-3 border-b flex items-center justify-between
                    ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-[#2E86DE]" />
                      <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#2C3E50]'}`}>
                        Notifications
                      </span>
                      {notifCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2E86DE] text-white leading-none">
                          {notifCount}
                        </span>
                      )}
                    </div>
                    {notifCount > 0 && (
                      <button
                        onClick={dismissAll}
                        className={`text-xs font-medium flex items-center gap-1 transition-colors
                          ${darkMode ? 'text-gray-400 hover:text-white' : 'text-[#7B8A8B] hover:text-[#2E86DE]'}`}
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notif list */}
                  <div className="max-h-72 overflow-y-auto">
                    {visibleNotifs.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <CheckCheck className={`w-8 h-8 mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>All caught up!</p>
                        <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>No new notifications</p>
                      </div>
                    ) : visibleNotifs.map(n => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors
                          ${darkMode ? 'border-gray-700/50 hover:bg-gray-700/30' : 'border-gray-50 hover:bg-[#EBF5FB]/30'}`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${DOT_COLOR[n.color] || 'bg-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#2C3E50]'}`}>{n.title}</p>
                          <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-[#7B8A8B]'}`}>{n.desc}</p>
                          <p className={`text-[10px] mt-1 font-medium ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{n.time}</p>
                        </div>
                        <button
                          onClick={() => dismissNotif(n.id)}
                          className={`p-1 rounded-lg flex-shrink-0 transition-colors
                            ${darkMode ? 'text-gray-600 hover:text-gray-400 hover:bg-gray-700' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative flex-shrink-0" ref={profileRef}>
              <button
                onClick={() => { setProfileOpen(v => !v); setNotifOpen(false) }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2E86DE] to-[#1ABC9C]
                  flex items-center justify-center text-white text-[11px] font-bold
                  shadow-[0_2px_8px_rgba(46,134,222,0.35)] hover:shadow-[0_4px_14px_rgba(46,134,222,0.45)]
                  transition-all duration-150 select-none flex-shrink-0"
              >
                {initials}
              </button>

              {profileOpen && (
                <div className={`${dropdownCls} w-64`} style={dropdownShadow}>
                  {/* User info */}
                  <div className={`px-4 py-3.5 border-b
                    ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2E86DE] to-[#1ABC9C]
                        flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-[#1e293b]'}`}>
                          {user?.name}
                        </p>
                        <p className={`text-xs truncate capitalize ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {displayRole}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5">
                    {[
                      { icon: User,     label: 'My Profile',     action: () => { setProfileOpen(false); navigate('/profile')  } },
                      { icon: Lock,     label: 'Change Password', action: () => { setProfileOpen(false); setShowPwModal(true)  } },
                    ].map(({ icon: Icon, label, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm
                          transition-colors duration-150
                          ${darkMode
                            ? 'text-gray-300 hover:bg-gray-700/60 hover:text-white'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-[#2E86DE]'}`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                        {label}
                      </button>
                    ))}

                    <div className={`mx-3 my-1 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />

                    <button
                      onClick={() => { setProfileOpen(false); logout() }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm
                        text-red-500 transition-colors duration-150
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

      {/* ── Change Password Modal ────────────────────────────────────────────── */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setShowPwModal(false)}
          />
          <div
            className={`relative w-full max-w-md rounded-2xl shadow-2xl
              ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            style={{ boxShadow: '0 32px 64px rgba(44,62,80,0.2)' }}
          >
            <div className={`px-6 pt-6 pb-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-[#2E86DE]" />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-[#1e293b]'}`}>
                    Change Password
                  </h2>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Keep your account secure
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {[
                { key: 'current', label: 'Current Password',    placeholder: 'Enter current password' },
                { key: 'next',    label: 'New Password',         placeholder: 'At least 6 characters'  },
                { key: 'confirm', label: 'Confirm New Password', placeholder: 'Re-enter new password'  },
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
                      className={`absolute right-3 top-1/2 -translate-y-1/2
                        ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}
                    >
                      {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <button
                onClick={() => setShowPwModal(false)}
                className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all
                  ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePw}
                disabled={submitting}
                className="px-5 py-2 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl
                  hover:bg-[#1a6db5] transition-all shadow-[0_2px_8px_rgba(46,134,222,0.35)]
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

export default TopNav
