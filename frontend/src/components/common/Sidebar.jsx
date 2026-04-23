import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home, Users, UserPlus, Calendar, Bed, Pill,
  DollarSign, BarChart3, Briefcase, Settings,
  Activity, FileText, ClipboardList, FlaskConical
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

// ─── Role menus ──────────────────────────────────────────
const MENUS = {
  admin: [
    { id: 'dashboard',    label: 'Dashboard',     icon: Home,         path: '/dashboard'    },
    { id: 'patients',     label: 'Patients',       icon: Users,        path: '/patients'     },
    { id: 'doctors',      label: 'Doctors',        icon: UserPlus,     path: '/doctors'      },
    { id: 'appointments', label: 'Appointments',   icon: Calendar,     path: '/appointments' },
    { id: 'wards',        label: 'Wards & Beds',   icon: Bed,          path: '/wards'        },
    { id: 'pharmacy',     label: 'Pharmacy',       icon: Pill,         path: '/pharmacy'     },
    { id: 'billing',      label: 'Billing',        icon: DollarSign,   path: '/billing'      },
    { id: 'reports',      label: 'Reports',        icon: BarChart3,    path: '/reports'      },
    { id: 'staff',        label: 'Staff',          icon: Briefcase,    path: '/staff'        },
    { id: 'settings',     label: 'Settings',       icon: Settings,     path: '/settings'     },
  ],
  doctor: [
    { id: 'dashboard',    label: 'Dashboard',      icon: Home,         path: '/dashboard'    },
    { id: 'appointments', label: 'My Appointments',icon: Calendar,     path: '/appointments' },
    { id: 'patients',     label: 'My Patients',    icon: Users,        path: '/patients'     },
    { id: 'prescriptions',label: 'Prescriptions',  icon: FileText,     path: '/prescriptions'},
    { id: 'test-reports', label: 'Test Reports',   icon: FlaskConical, path: '/test-reports' },
    { id: 'settings',     label: 'Settings',       icon: Settings,     path: '/settings'     },
  ],
  patient: [
    { id: 'dashboard',    label: 'Dashboard',      icon: Home,         path: '/dashboard'    },
    { id: 'appointments', label: 'My Appointments',icon: Calendar,     path: '/appointments' },
    { id: 'prescriptions',label: 'My Prescriptions',icon: Pill,        path: '/prescriptions'},
    { id: 'billing',      label: 'My Bills',       icon: DollarSign,   path: '/billing'      },
    { id: 'test-reports', label: 'Test Reports',   icon: FileText,     path: '/test-reports' },
    { id: 'settings',     label: 'Settings',       icon: Settings,     path: '/settings'     },
  ],
  nurse: [
    { id: 'dashboard',    label: 'Dashboard',      icon: Home,         path: '/dashboard'    },
    { id: 'patients',     label: 'Assigned Patients',icon: Users,      path: '/patients'     },
    { id: 'wards',        label: 'Ward Status',    icon: Bed,          path: '/wards'        },
    { id: 'prescriptions',label: 'Prescriptions',  icon: ClipboardList,path: '/prescriptions'},
    { id: 'settings',     label: 'Settings',       icon: Settings,     path: '/settings'     },
  ],
  receptionist: [
    { id: 'dashboard',    label: 'Dashboard',      icon: Home,         path: '/dashboard'    },
    { id: 'appointments', label: 'Appointments',   icon: Calendar,     path: '/appointments' },
    { id: 'patients',     label: 'Patients',       icon: Users,        path: '/patients'     },
    { id: 'billing',      label: 'Billing',        icon: DollarSign,   path: '/billing'      },
    { id: 'settings',     label: 'Settings',       icon: Settings,     path: '/settings'     },
  ],
  pharmacist: [
    { id: 'dashboard',    label: 'Dashboard',      icon: Home,         path: '/dashboard'    },
    { id: 'pharmacy',     label: 'Medicine Inventory',icon: Pill,      path: '/pharmacy'     },
    { id: 'prescriptions',label: 'Prescriptions',  icon: FileText,     path: '/prescriptions'},
    { id: 'billing',      label: 'Billing',        icon: DollarSign,   path: '/billing'      },
    { id: 'settings',     label: 'Settings',       icon: Settings,     path: '/settings'     },
  ],
  'lab technician': [
    { id: 'dashboard',    label: 'Dashboard',      icon: Home,         path: '/dashboard'    },
    { id: 'test-reports', label: 'Test Reports',   icon: FileText,     path: '/test-reports' },
    { id: 'patients',     label: 'Patients',       icon: Users,        path: '/patients'     },
    { id: 'settings',     label: 'Settings',       icon: Settings,     path: '/settings'     },
  ],
  'ward manager': [
    { id: 'dashboard',    label: 'Dashboard',      icon: Home,         path: '/dashboard'    },
    { id: 'wards',        label: 'Wards & Beds',   icon: Bed,          path: '/wards'        },
    { id: 'patients',     label: 'Patients',       icon: Users,        path: '/patients'     },
    { id: 'settings',     label: 'Settings',       icon: Settings,     path: '/settings'     },
  ],
}
// administrator = admin
MENUS.administrator = MENUS.admin

// ─── Component ───────────────────────────────────────────
const Sidebar = () => {
  const { user } = useAuth()
  const { darkMode, sidebarOpen } = useTheme()
  const location = useLocation()

  const userRole    = user?.role?.toLowerCase()    || 'patient'
  const userSubRole = user?.subRole?.toLowerCase() || ''
  const menuKey     = userRole === 'staff'
    ? (userSubRole && MENUS[userSubRole] ? userSubRole : 'patient')
    : userRole
  const items = MENUS[menuKey] || MENUS.patient

  const initials    = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const displayRole = user?.subRole || user?.role || 'Staff'

  return (
    <aside
      className={`
        relative z-30 flex-shrink-0 flex flex-col h-screen border-r
        transition-[width] duration-300 ease-in-out will-change-auto
        ${darkMode
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-100'}
        ${sidebarOpen ? 'w-64' : 'w-[60px]'}
      `}
    >
      {/* ── Brand ─────────────────────────────────────────── */}
      <div
        className={`flex items-center h-14 flex-shrink-0 overflow-hidden px-3.5 border-b
          ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}
      >
        {/* Logo mark */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/25">
          <Activity className="w-4 h-4 text-white" />
        </div>

        {/* Brand text — fades when collapsed */}
        <div
          className={`ml-3 overflow-hidden transition-all duration-300 ease-in-out
            ${sidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'}`}
        >
          <p className={`text-[15px] font-extrabold whitespace-nowrap tracking-tight leading-none
            ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            MediLink
          </p>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.12em] whitespace-nowrap mt-0.5">
            Hospital Management
          </p>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 py-2.5 px-2 space-y-0.5 overflow-y-auto scrollbar-hide">
        {items.map((item) => {
          const Icon    = item.icon
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.id}
              to={item.path}
              title={!sidebarOpen ? item.label : undefined}
              className={`
                flex items-center rounded-xl overflow-hidden
                transition-all duration-200 ease-out group
                ${sidebarOpen ? 'px-3 gap-3' : 'justify-center px-0'}
                py-2.5
                ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25'
                  : darkMode
                  ? 'text-gray-400 hover:bg-gray-800/80 hover:text-white'
                  : 'text-gray-500 hover:bg-blue-50/80 hover:text-blue-700'}
              `}
            >
              {/* Icon */}
              <Icon
                className={`flex-shrink-0 transition-transform duration-200
                  ${sidebarOpen ? 'w-[18px] h-[18px]' : 'w-5 h-5'}
                  ${!isActive ? 'group-hover:scale-110' : ''}`}
                strokeWidth={isActive ? 2.25 : 1.75}
              />

              {/* Label — slides + fades when collapsed */}
              <span
                className={`text-sm font-medium whitespace-nowrap overflow-hidden leading-none
                  transition-all duration-300 ease-in-out
                  ${sidebarOpen ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0'}`}
              >
                {item.label}
              </span>

              {/* Active dot */}
              {sidebarOpen && isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-white/70 ml-auto flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── User section ──────────────────────────────────── */}
      <div
        className={`flex-shrink-0 p-2 border-t
          ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}
      >
        <div
          className={`flex items-center rounded-xl py-2 cursor-default
            transition-colors duration-200
            ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}
            ${sidebarOpen ? 'px-2 gap-2.5' : 'justify-center px-0'}`}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm ring-2 ring-white/20">
            {initials}
          </div>

          {/* Name + role */}
          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ease-in-out
              ${sidebarOpen ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0'}`}
          >
            <p className={`text-[13px] font-semibold truncate leading-tight
              ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {user?.name?.split(' ')[0] || 'User'}
            </p>
            <p className="text-[11px] text-gray-400 truncate capitalize leading-tight">
              {displayRole}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
