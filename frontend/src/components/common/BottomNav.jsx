import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home, Users, UserPlus, Calendar, Bed, Pill,
  DollarSign, BarChart3, Briefcase, Settings,
  FileText, ClipboardList, FlaskConical,
  MoreHorizontal, X, User,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

// ── Primary nav items per role (max 4 — 5th slot is always "More") ────────────
const PRIMARY = {
  admin: [
    { id: 'dashboard',    label: 'Home',     icon: Home,       path: '/dashboard'    },
    { id: 'patients',     label: 'Patients', icon: Users,      path: '/patients'     },
    { id: 'appointments', label: 'Schedule', icon: Calendar,   path: '/appointments' },
    { id: 'staff',        label: 'Staff',    icon: Briefcase,  path: '/staff'        },
  ],
  doctor: [
    { id: 'dashboard',    label: 'Home',     icon: Home,       path: '/dashboard'    },
    { id: 'appointments', label: 'Schedule', icon: Calendar,   path: '/appointments' },
    { id: 'patients',     label: 'Patients', icon: Users,      path: '/patients'     },
    { id: 'prescriptions',label: 'Rx',       icon: FileText,   path: '/prescriptions'},
  ],
  patient: [
    { id: 'dashboard',    label: 'Home',     icon: Home,       path: '/dashboard'    },
    { id: 'appointments', label: 'Appts',    icon: Calendar,   path: '/appointments' },
    { id: 'prescriptions',label: 'Rx',       icon: Pill,       path: '/prescriptions'},
    { id: 'billing',      label: 'Bills',    icon: DollarSign, path: '/billing'      },
  ],
  nurse: [
    { id: 'dashboard',    label: 'Home',     icon: Home,       path: '/dashboard'    },
    { id: 'patients',     label: 'Patients', icon: Users,      path: '/patients'     },
    { id: 'wards',        label: 'Wards',    icon: Bed,        path: '/wards'        },
    { id: 'appointments', label: 'Schedule', icon: Calendar,   path: '/appointments' },
  ],
  receptionist: [
    { id: 'dashboard',    label: 'Home',     icon: Home,       path: '/dashboard'    },
    { id: 'appointments', label: 'Schedule', icon: Calendar,   path: '/appointments' },
    { id: 'patients',     label: 'Patients', icon: Users,      path: '/patients'     },
    { id: 'billing',      label: 'Billing',  icon: DollarSign, path: '/billing'      },
  ],
  pharmacist: [
    { id: 'dashboard',    label: 'Home',      icon: Home,       path: '/dashboard'    },
    { id: 'pharmacy',     label: 'Medicines', icon: Pill,       path: '/pharmacy'     },
    { id: 'prescriptions',label: 'Rx',        icon: FileText,   path: '/prescriptions'},
    { id: 'billing',      label: 'Billing',   icon: DollarSign, path: '/billing'      },
  ],
  'lab technician': [
    { id: 'dashboard',    label: 'Home',     icon: Home,        path: '/dashboard'    },
    { id: 'test-reports', label: 'Reports',  icon: FlaskConical,path: '/test-reports' },
    { id: 'patients',     label: 'Patients', icon: Users,       path: '/patients'     },
  ],
  'ward manager': [
    { id: 'dashboard',    label: 'Home',     icon: Home,       path: '/dashboard'    },
    { id: 'wards',        label: 'Wards',    icon: Bed,        path: '/wards'        },
    { id: 'patients',     label: 'Patients', icon: Users,      path: '/patients'     },
  ],
}
PRIMARY.administrator = PRIMARY.admin

// ── All nav items per role (shown in "More" drawer) ───────────────────────────
const ALL_ITEMS = {
  admin: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,       path: '/dashboard'    },
    { id: 'patients',     label: 'Patients',     icon: Users,      path: '/patients'     },
    { id: 'doctors',      label: 'Doctors',      icon: UserPlus,   path: '/doctors'      },
    { id: 'staff',        label: 'Staff',        icon: Briefcase,  path: '/staff'        },
    { id: 'appointments', label: 'Appointments', icon: Calendar,   path: '/appointments' },
    { id: 'wards',        label: 'Wards & Beds', icon: Bed,        path: '/wards'        },
    { id: 'pharmacy',     label: 'Pharmacy',     icon: Pill,       path: '/pharmacy'     },
    { id: 'billing',      label: 'Billing',      icon: DollarSign, path: '/billing'      },
    { id: 'reports',      label: 'Reports',      icon: BarChart3,  path: '/reports'      },
  ],
  doctor: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,        path: '/dashboard'    },
    { id: 'appointments', label: 'Appointments', icon: Calendar,    path: '/appointments' },
    { id: 'patients',     label: 'Patients',     icon: Users,       path: '/patients'     },
    { id: 'prescriptions',label: 'Prescriptions',icon: FileText,    path: '/prescriptions'},
    { id: 'test-reports', label: 'Test Reports', icon: FlaskConical,path: '/test-reports' },
  ],
  patient: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,       path: '/dashboard'    },
    { id: 'appointments', label: 'Appointments', icon: Calendar,   path: '/appointments' },
    { id: 'prescriptions',label: 'Prescriptions',icon: Pill,       path: '/prescriptions'},
    { id: 'billing',      label: 'My Bills',     icon: DollarSign, path: '/billing'      },
    { id: 'test-reports', label: 'Test Reports', icon: FileText,   path: '/test-reports' },
  ],
  nurse: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,          path: '/dashboard'    },
    { id: 'patients',     label: 'Patients',     icon: Users,         path: '/patients'     },
    { id: 'wards',        label: 'Ward Status',  icon: Bed,           path: '/wards'        },
    { id: 'prescriptions',label: 'Prescriptions',icon: ClipboardList, path: '/prescriptions'},
    { id: 'appointments', label: 'Appointments', icon: Calendar,      path: '/appointments' },
  ],
  receptionist: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,       path: '/dashboard'    },
    { id: 'appointments', label: 'Appointments', icon: Calendar,   path: '/appointments' },
    { id: 'patients',     label: 'Patients',     icon: Users,      path: '/patients'     },
    { id: 'billing',      label: 'Billing',      icon: DollarSign, path: '/billing'      },
  ],
  pharmacist: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,       path: '/dashboard'    },
    { id: 'pharmacy',     label: 'Medicines',    icon: Pill,       path: '/pharmacy'     },
    { id: 'prescriptions',label: 'Prescriptions',icon: FileText,   path: '/prescriptions'},
    { id: 'billing',      label: 'Billing',      icon: DollarSign, path: '/billing'      },
  ],
  'lab technician': [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,        path: '/dashboard'    },
    { id: 'test-reports', label: 'Test Reports', icon: FlaskConical,path: '/test-reports' },
    { id: 'patients',     label: 'Patients',     icon: Users,       path: '/patients'     },
  ],
  'ward manager': [
    { id: 'dashboard',    label: 'Dashboard',    icon: Home,       path: '/dashboard'    },
    { id: 'wards',        label: 'Wards & Beds', icon: Bed,        path: '/wards'        },
    { id: 'patients',     label: 'Patients',     icon: Users,      path: '/patients'     },
  ],
}
ALL_ITEMS.administrator = ALL_ITEMS.admin

// ── BottomNav ─────────────────────────────────────────────────────────────────
const BottomNav = () => {
  const { user }    = useAuth()
  const { darkMode } = useTheme()
  const location    = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const userRole    = user?.role?.toLowerCase() || 'patient'
  const userSubRole = user?.subRole?.toLowerCase() || ''
  const menuKey     = userRole === 'staff'
    ? (userSubRole && PRIMARY[userSubRole] ? userSubRole : 'patient')
    : userRole

  const primaryItems = PRIMARY[menuKey] || PRIMARY.patient
  const allItems     = ALL_ITEMS[menuKey] || ALL_ITEMS.patient

  const barBg = darkMode
    ? 'bg-gray-800/95 border-gray-700/80'
    : 'bg-white/95 border-gray-200/80'

  const navItemActive   = (isActive) => isActive ? 'text-[#2E86DE]'           : darkMode ? 'text-gray-400' : 'text-gray-500'
  const navPillActive   = (isActive) => isActive ? 'bg-[#2E86DE]/10'          : ''
  const drawerItemActive = (isActive) => isActive
    ? 'bg-[#2E86DE]/10 text-[#2E86DE]'
    : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50'

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/20 backdrop-blur-[1px]"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── More drawer (slide up from bottom) ────────────────────────────── */}
      <div
        className={`fixed left-0 right-0 z-[45] md:hidden px-3 transition-all duration-250 ease-out
          ${drawerOpen
            ? 'bottom-20 opacity-100 translate-y-0 pointer-events-auto'
            : 'bottom-20 opacity-0 translate-y-4 pointer-events-none'}`}
      >
        <div className={`rounded-2xl border overflow-hidden
          shadow-[0_-8px_40px_rgba(0,0,0,0.15)]
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>

          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className={`w-8 h-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />
          </div>

          <p className={`px-4 pt-1 pb-3 text-[11px] font-semibold uppercase tracking-widest
            ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            All Pages
          </p>

          {/* Grid of all role items */}
          <div className="px-3 grid grid-cols-3 gap-2">
            {allItems.map(item => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center
                    transition-all duration-150 ${drawerItemActive(isActive)}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 1.75} />
                  <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className={`mx-4 mt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />

          {/* Profile + Settings row */}
          <div className="px-3 py-3 grid grid-cols-2 gap-2">
            {[
              { icon: User,     label: 'Profile',  path: '/profile'  },
              { icon: Settings, label: 'Settings', path: '/settings' },
            ].map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl transition-all duration-150
                    ${drawerItemActive(isActive)}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom nav bar ────────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className={`mb-3 rounded-2xl border backdrop-blur-md flex items-center justify-around
          h-16 px-1 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] ${barBg}`}>

          {primaryItems.map(item => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
              >
                <div className={`flex items-center justify-center w-10 h-8 rounded-xl
                  transition-all duration-150 ${navPillActive(isActive)}`}>
                  <Icon
                    className={`w-[22px] h-[22px] transition-colors duration-150 ${navItemActive(isActive)}`}
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                </div>
                <span className={`text-[10px] font-medium leading-none transition-colors duration-150
                  ${navItemActive(isActive)}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setDrawerOpen(v => !v)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
          >
            <div className={`flex items-center justify-center w-10 h-8 rounded-xl
              transition-all duration-150 ${navPillActive(drawerOpen)}`}>
              {drawerOpen
                ? <X className={`w-[22px] h-[22px] ${navItemActive(true)}`} strokeWidth={2.5} />
                : <MoreHorizontal className={`w-[22px] h-[22px] ${navItemActive(false)}`} strokeWidth={1.75} />
              }
            </div>
            <span className={`text-[10px] font-medium leading-none transition-colors duration-150
              ${navItemActive(drawerOpen)}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default BottomNav
