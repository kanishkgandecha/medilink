import React, { useState } from 'react'
import { User, Lock, Bell, Globe } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import * as authService from '../services/authService'

const Settings = () => {
  const { darkMode } = useTheme()
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  
  const [profileData, setProfileData] = useState({
    name:        user?.name        || '',
    email:       user?.email       || '',
    phone:       user?.phone       || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    gender:      user?.gender      || '',
    address:     user?.address     || ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [submitting, setSubmitting] = useState(false)

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    billingAlerts: true,
    systemUpdates: false
  })

  const handleProfileUpdate = async () => {
    if (!profileData.name?.trim()) return toast.error('Name is required')
    setSubmitting(true)
    try {
      const res = await authService.updateProfile({
        name:        profileData.name,
        phone:       profileData.phone,
        dateOfBirth: profileData.dateOfBirth || undefined,
        gender:      profileData.gender      || undefined,
      })
      if (res?.user) updateUser(res.user)
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update profile')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword) return toast.error('Enter your current password')
    if (!passwordData.newPassword) return toast.error('Enter a new password')
    if (passwordData.newPassword.length < 6) return toast.error('New password must be at least 6 characters')
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error('Passwords do not match')
    setSubmitting(true)
    try {
      await authService.changePassword(passwordData.currentPassword, passwordData.newPassword)
      toast.success('Password changed successfully')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to change password')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNotificationUpdate = () => {
    toast.success('Notification settings updated')
  }

  const tabs = [
    { id: 'profile',       label: 'Profile',       icon: User },
    { id: 'security',      label: 'Security',       icon: Lock },
    { id: 'notifications', label: 'Notifications',  icon: Bell },
    { id: 'preferences',   label: 'Preferences',    icon: Globe },
  ]

  const inp = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none
    focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200
    ${darkMode
      ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400'
      : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`

  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5
    ${darkMode ? 'text-gray-400' : 'text-gray-500'}`

  const card = `${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'} border rounded-xl`

  const Toggle = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-10 h-[22px] bg-gray-200 dark:bg-gray-600 rounded-full peer
        peer-checked:bg-[#2E86DE]
        after:content-[''] after:absolute after:top-[2px] after:left-[2px]
        after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all
        peer-checked:after:translate-x-[18px]" />
    </label>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
        <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab sidebar */}
        <div className={`${card} p-3 h-fit`}>
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === id
                    ? 'bg-[#2E86DE] text-white shadow-[0_2px_8px_rgba(46,134,222,0.3)]'
                    : darkMode
                    ? 'text-gray-300 hover:bg-gray-700/60'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content panel */}
        <div className={`lg:col-span-3 ${card} p-6`}>

          {/* ── Profile ── */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Profile Information</h2>
                <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Update your personal details</p>
              </div>

              {/* Avatar row */}
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2E86DE] to-cyan-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-[0_4px_16px_rgba(46,134,222,0.35)]">
                  {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                  <p className={`text-xs mt-0.5 capitalize ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.subRole || user?.role}</p>
                  <button
                    onClick={() => toast.info('Photo upload coming soon')}
                    className="mt-2 text-xs font-semibold text-[#2E86DE] hover:underline"
                  >
                    Change photo
                  </button>
                </div>
              </div>

              <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Full Name</label>
                  <input type="text" value={profileData.name}
                    onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                    className={inp} placeholder="Your full name" />
                </div>
                <div>
                  <label className={lbl}>Email Address</label>
                  <input type="email" value={profileData.email} readOnly
                    className={`${inp} opacity-60 cursor-not-allowed`} />
                </div>
                <div>
                  <label className={lbl}>Phone Number</label>
                  <input type="tel" value={profileData.phone}
                    onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                    className={inp} placeholder="10-digit number" />
                </div>
                <div>
                  <label className={lbl}>Date of Birth</label>
                  <input type="date" value={profileData.dateOfBirth}
                    onChange={e => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>Gender</label>
                  <select value={profileData.gender}
                    onChange={e => setProfileData({ ...profileData, gender: e.target.value })}
                    className={inp}>
                    <option value="">Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={handleProfileUpdate} disabled={submitting}
                  className="px-5 py-2.5 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50">
                  {submitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Security Settings</h2>
                <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage your password and security</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={lbl}>Current Password</label>
                  <input type="password" value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className={inp} placeholder="Enter current password" />
                </div>
                <div>
                  <label className={lbl}>New Password</label>
                  <input type="password" value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className={inp} placeholder="At least 6 characters" />
                </div>
                <div>
                  <label className={lbl}>Confirm New Password</label>
                  <input type="password" value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className={inp} placeholder="Re-enter new password" />
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handlePasswordChange} disabled={submitting}
                  className="px-5 py-2.5 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50">
                  {submitting ? 'Changing…' : 'Change Password'}
                </button>
              </div>

              <div className={`border-t pt-6 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Two-Factor Authentication</p>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Add an extra layer of security</p>
                  </div>
                  <Toggle checked={false} onChange={() => toast.info('2FA setup coming soon')} />
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Notification Settings</h2>
                <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Choose how you receive alerts</p>
              </div>

              <div className="space-y-1">
                {[
                  { key: 'emailNotifications',   label: 'Email Notifications',    desc: 'Receive updates via email' },
                  { key: 'smsNotifications',      label: 'SMS Notifications',       desc: 'Receive alerts via SMS' },
                  { key: 'appointmentReminders',  label: 'Appointment Reminders',  desc: 'Get reminded before appointments' },
                  { key: 'billingAlerts',         label: 'Billing Alerts',          desc: 'Notifications for bills and payments' },
                  { key: 'systemUpdates',         label: 'System Updates',          desc: 'Platform news and updates' },
                ].map(({ key, label, desc }) => (
                  <div key={key}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors
                      ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                    <div>
                      <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
                    </div>
                    <Toggle
                      checked={notificationSettings[key]}
                      onChange={e => setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={handleNotificationUpdate}
                  className="px-5 py-2.5 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] active:scale-[0.97] transition-all duration-200">
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* ── Preferences ── */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Application Preferences</h2>
                <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Customize your experience</p>
              </div>

              <div className="space-y-1">
                {[
                  { label: 'Language',    desc: 'Select your preferred language', options: ['English', 'Spanish', 'French', 'German'] },
                  { label: 'Time Zone',   desc: 'Set your local time zone',       options: ['UTC+5:30 (IST)', 'UTC+0 (GMT)', 'UTC-5 (EST)', 'UTC-8 (PST)'] },
                  { label: 'Date Format', desc: 'How dates are displayed',         options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
                ].map(({ label, desc, options }) => (
                  <div key={label}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors
                      ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                    <div>
                      <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
                    </div>
                    <select className={`px-3 py-2 rounded-xl border text-sm outline-none
                      focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all
                      ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                      {options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => toast.success('Preferences saved')}
                  className="px-5 py-2.5 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] active:scale-[0.97] transition-all duration-200">
                  Save Preferences
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default Settings