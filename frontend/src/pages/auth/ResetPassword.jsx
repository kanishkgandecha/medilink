import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Activity, Eye, EyeOff, ArrowLeft, Lock, Shield, Zap, CheckCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import * as authService from '../../services/authService'

const LeftPanel = () => (
  <div className="hidden lg:flex flex-col justify-between h-full bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-10 relative overflow-hidden">
    <div className="absolute inset-0 bg-dots-pattern opacity-20" />
    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
    <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-500/10 blur-2xl" />

    <div className="relative z-10 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
        <Activity className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-white font-bold text-lg leading-none">MediLink</p>
        <p className="text-blue-200 text-[10px] uppercase tracking-[0.2em] font-medium mt-0.5">Hospital Management</p>
      </div>
    </div>

    <div className="relative z-10 space-y-7">
      <div>
        <p className="text-cyan-300 text-xs font-semibold uppercase tracking-widest mb-3">Secure Reset</p>
        <h2 className="text-[2.6rem] font-extrabold text-white leading-[1.15] tracking-tight">
          Create a new<br />password.
        </h2>
        <p className="mt-4 text-blue-200/90 text-sm leading-relaxed max-w-[260px]">
          Choose a strong password to keep your MediLink account secure.
        </p>
      </div>

      <div className="space-y-3.5">
        {[
          { icon: Lock,   text: 'Minimum 6 characters recommended' },
          { icon: Shield, text: 'Secure token-based verification'   },
          { icon: Zap,    text: 'Instant access after reset'        },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/15 flex-shrink-0 group-hover:bg-white/20 transition-colors duration-200">
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-blue-100 text-sm">{text}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-6 pt-2">
        {[['500+', 'Patients'], ['50+', 'Doctors'], ['99%', 'Uptime']].map(([val, label]) => (
          <div key={label}>
            <p className="text-white text-xl font-bold leading-none">{val}</p>
            <p className="text-blue-300 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="relative z-10">
      <p className="text-blue-300/70 text-xs">© {new Date().getFullYear()} MediLink. All rights reserved.</p>
    </div>
  </div>
)

const FloatField = ({ label, id, type, value, onChange, children }) => (
  <div>
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer block w-full px-4 pt-5 pb-2 text-sm rounded-xl border bg-gray-50 text-gray-900
          border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          hover:border-gray-300 transition-all duration-200"
      />
      <label
        htmlFor={id}
        className="absolute left-4 z-10 pointer-events-none origin-[0] transition-all duration-200
          top-2 text-[10px] font-semibold tracking-wide text-blue-600
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2
          peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-gray-400
          peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-blue-600"
      >
        {label}
      </label>
      {children}
    </div>
  </div>
)

const ResetPassword = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) return toast.error('Enter a new password')
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    if (password !== confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white animate-enter">
      {/* Left panel */}
      <div className="w-[460px] flex-shrink-0 flex flex-col">
        <LeftPanel />
      </div>

      {/* Right: form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-gray-50 overflow-y-auto">
        {/* Mobile brand */}
        <div className="lg:hidden mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">MediLink</h1>
          <p className="text-gray-400 text-sm mt-0.5">Smart Healthcare, Simplified.</p>
        </div>

        <div className="w-full max-w-sm">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-500/25">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password reset!</h2>
              <p className="text-gray-500 text-sm mb-6">Redirecting you to sign in…</p>
              <Link
                to="/login"
                className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold
                  shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-cyan-700 transition"
              >
                Sign in now
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Set new password</h2>
                <p className="text-gray-400 text-sm mt-1">Choose a strong password for your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <FloatField
                  label="New Password"
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                >
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </FloatField>

                <FloatField
                  label="Confirm Password"
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                >
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </FloatField>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mt-2
                    bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold
                    hover:from-blue-700 hover:to-cyan-700 hover:scale-[1.02]
                    shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                    active:scale-[0.98] transition-all duration-200
                    disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Resetting…
                    </>
                  ) : 'Reset Password'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
