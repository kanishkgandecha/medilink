import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Eye, EyeOff, ArrowRight, Heart, Shield, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// ─── Left decorative panel ────────────────────────────────
const LeftPanel = () => (
  <div className="hidden lg:flex flex-col justify-between h-full bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-10 relative overflow-hidden">
    <div className="absolute inset-0 bg-dots-pattern opacity-20" />
    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
    <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-500/10 blur-2xl" />

    {/* Logo */}
    <div className="relative z-10 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
        <Activity className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-white font-bold text-lg leading-none">MediLink</p>
        <p className="text-blue-200 text-[10px] uppercase tracking-[0.2em] font-medium mt-0.5">Hospital Management</p>
      </div>
    </div>

    {/* Central content */}
    <div className="relative z-10 space-y-7">
      <div>
        <p className="text-cyan-300 text-xs font-semibold uppercase tracking-widest mb-3">Healthcare Platform</p>
        <h2 className="text-[2.6rem] font-extrabold text-white leading-[1.15] tracking-tight">
          Smart Healthcare,<br />Simplified.
        </h2>
        <p className="mt-4 text-blue-200/90 text-sm leading-relaxed max-w-[260px]">
          One platform for patients, appointments, billing, and clinical workflows — all in one place.
        </p>
      </div>

      <div className="space-y-3.5">
        {[
          { icon: Heart,  text: 'Patient-centred care management'  },
          { icon: Shield, text: 'Role-based secure access control' },
          { icon: Zap,    text: 'Real-time scheduling & billing'   },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/15 flex-shrink-0 group-hover:bg-white/20 transition-colors duration-200">
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-blue-100 text-sm">{text}</span>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex gap-6 pt-2">
        {[['500+', 'Patients'], ['50+', 'Doctors'], ['99%', 'Uptime']].map(([val, label]) => (
          <div key={label}>
            <p className="text-white text-xl font-bold leading-none">{val}</p>
            <p className="text-blue-300 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Footer */}
    <div className="relative z-10">
      <p className="text-blue-300/70 text-xs">© {new Date().getFullYear()} MediLink. All rights reserved.</p>
    </div>
  </div>
)

// ─── Floating label input ─────────────────────────────────
const FloatField = ({ label, name, type = 'text', value, onChange, error, autoComplete, children }) => (
  <div>
    <div className="relative">
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder=" "
        autoComplete={autoComplete}
        className={`peer block w-full px-4 pt-5 pb-2 text-sm rounded-xl border bg-gray-50 text-gray-900
          focus:outline-none focus:ring-2 transition-all duration-200
          ${children ? 'pr-11' : ''}
          ${error
            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400'
            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300'
          }`}
      />
      <label
        htmlFor={name}
        className={`absolute left-4 z-10 pointer-events-none origin-[0] transition-all duration-200
          top-2 text-[10px] font-semibold tracking-wide
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2
          peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal
          peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:tracking-wide
          ${error
            ? 'text-red-500 peer-placeholder-shown:text-gray-400 peer-focus:text-red-500'
            : 'text-blue-600 peer-placeholder-shown:text-gray-400 peer-focus:text-blue-600'
          }`}
      >
        {label}
      </label>
      {children}
    </div>
    {error && <p className="mt-1 text-xs text-red-500 pl-0.5">{error}</p>}
  </div>
)

// ─── Main component ───────────────────────────────────────
const Login = () => {
  const { login } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false })
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [errors,   setErrors]   = useState({})

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!formData.email)    e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Enter a valid email'
    if (!formData.password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await login({ email: formData.email, password: formData.password })
    } catch (err) {
      console.error('Login error:', err)
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

      {/* Right: login form */}
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
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-400 text-sm mt-1">Sign in to your MediLink account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FloatField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              autoComplete="email"
            />

            <FloatField
              label="Password"
              name="password"
              type={showPw ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              autoComplete="current-password"
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

            {/* Remember + forgot */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                />
                <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors select-none">
                  Keep me signed in
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mt-2
                bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold
                hover:from-blue-700 hover:to-cyan-700 hover:scale-[1.02]
                shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                active:scale-[0.98] transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
              Register here
            </Link>
          </p>
        </div>

        <p className="absolute bottom-6 text-xs text-gray-300">
          Secure · HIPAA-ready · Role-based access
        </p>
      </div>
    </div>
  )
}

export default Login
