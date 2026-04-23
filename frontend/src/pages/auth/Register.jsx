import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff, ArrowRight, Heart, Shield, Zap, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-toastify'

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
        <p className="text-cyan-300 text-xs font-semibold uppercase tracking-widest mb-3">Join MediLink</p>
        <h2 className="text-[2.6rem] font-extrabold text-white leading-[1.15] tracking-tight">
          Smart Healthcare,<br />Simplified.
        </h2>
        <p className="mt-4 text-blue-200/90 text-sm leading-relaxed max-w-[260px]">
          Create your patient account to access appointments, prescriptions, and health records online.
        </p>
      </div>

      <div className="space-y-3.5">
        {[
          { icon: Heart,  text: 'Book appointments in seconds'       },
          { icon: Shield, text: 'HIPAA-compliant secure records'     },
          { icon: Zap,    text: 'Instant billing & prescription view'},
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

// ─── Static label field (for select / date) ───────────────
const StaticField = ({ label, error, children }) => (
  <div>
    <label className={`block text-[10px] font-semibold tracking-wide mb-1.5
      ${error ? 'text-red-500' : 'text-blue-600'}`}>
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500 pl-0.5">{error}</p>}
  </div>
)

// ─── Main component ───────────────────────────────────────
const Register = () => {
  const { register } = useAuth()
  const navigate      = useNavigate()

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', dateOfBirth: '', gender: '',
    password: '', confirmPassword: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'India' }
  })
  const [showPw,  setShowPw]  = useState({ password: false, confirmPassword: false })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [step,    setStep]    = useState(1)

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('address.')) {
      const key = name.split('.')[1]
      setFormData(f => ({ ...f, address: { ...f.address, [key]: value } }))
    } else {
      setFormData(f => ({ ...f, [name]: value }))
    }
    if (errors[name]) setErrors(f => ({ ...f, [name]: '' }))
  }

  const validateStep1 = () => {
    const e = {}
    if (!formData.name)        e.name  = 'Name is required'
    if (!formData.email)       e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Enter a valid email'
    if (!formData.phone)       e.phone = 'Phone number is required'
    if (!formData.dateOfBirth) e.dateOfBirth = 'Date of birth is required'
    if (!formData.gender)      e.gender = 'Gender is required'
    return e
  }

  const validateStep2 = () => {
    const e = {}
    if (!formData.password)        e.password = 'Password is required'
    else if (formData.password.length < 6) e.password = 'At least 6 characters'
    if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password'
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match'
    return e
  }

  const goNext = () => {
    const errs = validateStep1()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateStep2()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const res = await register({
        name: formData.name, email: formData.email, password: formData.password,
        phone: formData.phone, dateOfBirth: formData.dateOfBirth,
        gender: formData.gender, address: formData.address
      })
      if (!res?.token) {
        toast.success('Account created! Please sign in.')
        navigate('/login')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const selectCls = (hasErr) => `w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 text-gray-900
    focus:outline-none focus:ring-2 transition-all duration-200
    ${hasErr
      ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400'
      : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300'
    }`

  return (
    <div className="min-h-screen flex bg-white animate-enter">
      {/* Left panel */}
      <div className="w-[420px] flex-shrink-0 flex flex-col">
        <LeftPanel />
      </div>

      {/* Right: form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        {/* Mobile brand */}
        <div className="lg:hidden mb-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">MediLink</h1>
          <p className="text-gray-400 text-sm mt-0.5">Smart Healthcare, Simplified.</p>
        </div>

        <div className="w-full max-w-lg py-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-400 text-sm mt-1">Patient self-registration — staff accounts are set up by admin</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-7">
            {[1, 2].map(s => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 text-xs font-semibold transition-colors
                  ${s <= step ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    ${s < step  ? 'bg-blue-600 border-blue-600 text-white'
                    : s === step ? 'border-blue-600 text-blue-600'
                    : 'border-gray-300 text-gray-400'}`}>
                    {s}
                  </div>
                  <span className="hidden sm:inline">{s === 1 ? 'Personal Info' : 'Security'}</span>
                </div>
                {s < 2 && (
                  <div className={`flex-1 h-px transition-colors ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {step === 1 ? (
              <div className="space-y-4">
                <FloatField
                  label="Full Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FloatField
                    label="Email *"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                  />
                  <FloatField
                    label="Phone *"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StaticField label="Date of Birth *" error={errors.dateOfBirth}>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className={selectCls(!!errors.dateOfBirth)}
                    />
                  </StaticField>

                  <StaticField label="Gender *" error={errors.gender}>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={selectCls(!!errors.gender)}
                    >
                      <option value="">Select gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </StaticField>
                </div>

                {/* Address — optional */}
                <div className="pt-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Address (optional)
                  </p>
                  <div className="space-y-3">
                    <FloatField
                      label="Street Address"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleChange}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FloatField label="City" name="address.city" value={formData.address.city} onChange={handleChange} />
                      <FloatField label="State" name="address.state" value={formData.address.state} onChange={handleChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FloatField label="Zip Code" name="address.zipCode" value={formData.address.zipCode} onChange={handleChange} />
                      <FloatField label="Country" name="address.country" value={formData.address.country} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mt-2
                    bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold
                    hover:from-blue-700 hover:to-cyan-700 hover:scale-[1.02]
                    shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                    active:scale-[0.98] transition-all duration-200"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <FloatField
                  label="Password *"
                  name="password"
                  type={showPw.password ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  autoComplete="new-password"
                >
                  <button
                    type="button"
                    onClick={() => setShowPw(p => ({ ...p, password: !p.password }))}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </FloatField>

                <FloatField
                  label="Confirm Password *"
                  name="confirmPassword"
                  type={showPw.confirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                >
                  <button
                    type="button"
                    onClick={() => setShowPw(p => ({ ...p, confirmPassword: !p.confirmPassword }))}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw.confirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </FloatField>

                <div className="p-3.5 rounded-xl border text-xs text-blue-700 bg-blue-50 border-blue-200 leading-relaxed">
                  Your account will be registered as a patient. For staff access, contact the hospital administrator.
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600
                      hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                      bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold
                      hover:from-blue-700 hover:to-cyan-700 hover:scale-[1.02]
                      shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                      active:scale-[0.98] transition-all duration-200
                      disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Creating…
                      </>
                    ) : (
                      <>Create Account <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="pb-4 text-xs text-gray-300">
          Secure · HIPAA-ready · Role-based access
        </p>
      </div>
    </div>
  )
}

export default Register
