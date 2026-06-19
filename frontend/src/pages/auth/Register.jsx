import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, ArrowRight, Heart, Shield, Zap,
  ChevronDown, Users, CalendarCheck, CheckCircle2, Clock,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-toastify'
import logoIconBgLight from '../../assets/logo/logo-icon-bg-light.png'

// ── Animated ECG / heartbeat line ─────────────────────────────────────────────
const HeartbeatSVG = () => (
  <svg viewBox="0 0 380 60" fill="none" className="w-full max-w-[300px]">
    <defs>
      <linearGradient id="ecgGradR" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#5DADE2" stopOpacity="0" />
        <stop offset="25%"  stopColor="#5DADE2" stopOpacity="1" />
        <stop offset="65%"  stopColor="#1ABC9C" stopOpacity="1" />
        <stop offset="100%" stopColor="#1ABC9C" stopOpacity="0" />
      </linearGradient>
    </defs>
    <line x1="0" y1="30" x2="380" y2="30" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
    <path
      className="login-ecg"
      d="M0,30 L50,30 Q57,22 65,30 L80,30 L83,33 L90,3 L97,57 L102,30 C112,30 120,16 132,30 L380,30"
      stroke="url(#ecgGradR)"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle className="login-ecg-dot" cx="90" cy="3" r="3" fill="#1ABC9C" />
  </svg>
)

// ── Glassmorphism stat card ───────────────────────────────────────────────────
const GlassCard = ({ icon: Icon, value, label, className }) => (
  <div
    className={`absolute flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg ${className}`}
    style={{
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)',
      borderColor: 'rgba(255,255,255,0.15)',
    }}
  >
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.15)' }}
    >
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div>
      <p className="text-white font-bold text-sm leading-none">{value}</p>
      <p className="text-blue-200/60 text-[11px] mt-0.5">{label}</p>
    </div>
    <span
      className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
      style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
    />
  </div>
)

// ── Left visual panel ─────────────────────────────────────────────────────────
const LeftPanel = () => (
  <div
    className="relative h-full overflow-hidden flex flex-col"
    style={{ background: 'linear-gradient(145deg, #0c1f3a 0%, #163e6e 45%, #0a5248 100%)' }}
  >
    {/* Animated gradient blobs */}
    <div
      className="login-blob-1 absolute pointer-events-none"
      style={{
        top: '-120px', right: '-80px',
        width: '480px', height: '480px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(46,134,222,0.32) 0%, transparent 68%)',
      }}
    />
    <div
      className="login-blob-2 absolute pointer-events-none"
      style={{
        bottom: '-100px', left: '-60px',
        width: '420px', height: '420px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(26,188,156,0.28) 0%, transparent 68%)',
      }}
    />
    <div
      className="login-blob-3 absolute pointer-events-none"
      style={{
        top: '40%', left: '30%',
        width: '260px', height: '260px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(93,173,226,0.12) 0%, transparent 70%)',
      }}
    />

    {/* Dot grid overlay */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        opacity: 0.035,
      }}
    />

    {/* Floating stat cards */}
    <GlassCard icon={Clock}         value="2 min"  label="Account setup"      className="login-float-card-1 top-[20%] right-5 z-20" />
    <GlassCard icon={Shield}        value="HIPAA"  label="Compliance ready"   className="login-float-card-2 top-[55%] right-5 z-20" />
    <GlassCard icon={Users}         value="500+"   label="Active patients"    className="login-float-card-3 bottom-[16%] right-5 z-20" />

    {/* Main content */}
    <div className="login-panel-in relative z-10 flex flex-col justify-between h-full p-10">

      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-white/20 blur-md scale-110" />
          <img
            src={logoIconBgLight}
            alt=""
            aria-hidden
            className="relative w-11 h-11 rounded-xl object-contain"
            draggable={false}
          />
        </div>
        <span className="text-white font-extrabold text-2xl tracking-tight">MediLink</span>
      </div>

      {/* Hero block */}
      <div className="space-y-7 max-w-[240px]">

        {/* Pill badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
          style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
          />
          <span className="text-cyan-300 text-[11px] font-bold uppercase tracking-widest">Free Patient Account</span>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h2 className="text-[2.5rem] font-extrabold text-white leading-[1.1] tracking-tight">
            Join<br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #5DADE2 0%, #1ABC9C 100%)' }}
            >
              MediLink.
            </span>
          </h2>
          <p className="text-blue-200/65 text-sm leading-relaxed">
            Set up your free patient account in under 2 minutes.
          </p>
        </div>

        {/* ECG line */}
        <div className="space-y-1.5">
          <p className="text-white/25 text-[9px] uppercase tracking-[0.2em] font-semibold">Live system monitor</p>
          <HeartbeatSVG />
        </div>

        {/* Feature bullets */}
        <div className="space-y-3">
          {[
            { icon: CalendarCheck, text: 'Book appointments in seconds'     },
            { icon: Shield,        text: 'HIPAA-compliant secure records'   },
            { icon: Zap,           text: 'View prescriptions & test reports'},
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <Icon className="w-3.5 h-3.5 text-cyan-300" />
              </div>
              <span className="text-blue-100/80 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-blue-400/35 text-xs">
        © {new Date().getFullYear()} MediLink · Secure · HIPAA-ready
      </p>
    </div>
  </div>
)

// ── Floating label input (identical to Login's) ───────────────────────────────
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
        className={`peer block w-full px-4 pt-6 pb-2 text-sm rounded-xl border text-gray-900
          focus:outline-none transition-all duration-200
          ${children ? 'pr-11' : ''}
          ${error
            ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-4 focus:ring-red-500/10'
            : 'border-gray-200 bg-gray-50/60 hover:border-gray-300 hover:bg-white focus:border-[#2E86DE] focus:ring-4 focus:ring-[#2E86DE]/10 focus:bg-white'
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
            : 'text-[#2E86DE] peer-placeholder-shown:text-gray-400 peer-focus:text-[#2E86DE]'
          }`}
      >
        {label}
      </label>
      {children}
    </div>
    {error && (
      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5 pl-0.5">
        <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
)

// ── Static label field (date / select) ───────────────────────────────────────
const StaticField = ({ label, error, children }) => (
  <div>
    <label className={`block text-[10px] font-semibold tracking-wide mb-1.5
      ${error ? 'text-red-500' : 'text-[#2E86DE]'}`}>
      {label}
    </label>
    {children}
    {error && (
      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5 pl-0.5">
        <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
)

// ── Password strength bar ─────────────────────────────────────────────────────
const PasswordStrength = ({ password }) => {
  if (!password) return null
  let score = 0
  if (password.length >= 6)  score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++

  const labels   = ['', 'Weak', 'Good', 'Strong']
  const barColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500']
  const txtColor = ['', 'text-red-500', 'text-amber-600', 'text-emerald-600']

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? barColor[score] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-semibold ${txtColor[score]}`}>{labels[score]}</p>
    </div>
  )
}

// ── Main register component ───────────────────────────────────────────────────
const Register = () => {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', dateOfBirth: '', gender: '',
    password: '', confirmPassword: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'India' }
  })
  const [showPw,      setShowPw]      = useState({ password: false, confirmPassword: false })
  const [errors,      setErrors]      = useState({})
  const [loading,     setLoading]     = useState(false)
  const [step,        setStep]        = useState(1)
  const [showAddress, setShowAddress] = useState(false)

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
    if (!formData.name)        e.name        = 'Full name is required'
    if (!formData.email)       e.email       = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Enter a valid email'
    if (!formData.phone)       e.phone       = 'Phone number is required'
    if (!formData.dateOfBirth) e.dateOfBirth = 'Date of birth is required'
    if (!formData.gender)      e.gender      = 'Gender is required'
    return e
  }

  const validateStep2 = () => {
    const e = {}
    if (!formData.password)        e.password        = 'Password is required'
    else if (formData.password.length < 6) e.password = 'At least 6 characters required'
    if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password'
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match'
    return e
  }

  const goNext = () => {
    const errs = validateStep1()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
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

  const selCls = (hasErr) =>
    `w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none transition-all duration-200
    ${hasErr
      ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-4 focus:ring-red-500/10'
      : 'border-gray-200 bg-gray-50/60 hover:border-gray-300 hover:bg-white focus:border-[#2E86DE] focus:ring-4 focus:ring-[#2E86DE]/10 focus:bg-white'
    }`

  const passwordsMatch =
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">

      {/* ── Left visual panel ─────────────────────────────────── */}
      <div className="hidden lg:block w-[460px] flex-shrink-0">
        <LeftPanel />
      </div>

      {/* ── Right: auth panel ─────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-y-auto"
        style={{
          background: 'linear-gradient(160deg, #f0f4f8 0%, #fafbfd 55%, #edf7f4 100%)',
        }}
      >
        {/* Ambient light blobs */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-60px', right: '-40px',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(46,134,222,0.07) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-80px', left: '-60px',
            width: '380px', height: '380px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,188,156,0.07) 0%, transparent 65%)',
          }}
        />

        {/* Mobile brand header */}
        <div className="lg:hidden mb-8 flex flex-col items-center gap-3 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-lg scale-110" />
            <img
              src={logoIconBgLight}
              alt="MediLink"
              className="relative w-14 h-14 rounded-2xl object-contain"
              draggable={false}
            />
          </div>
          <span className="text-gray-800 font-extrabold text-xl tracking-tight">MediLink</span>
          <p className="text-gray-400 text-sm">Smart Healthcare, Simplified.</p>
        </div>

        {/* ── Auth card ──────────────────────────────────────── */}
        <div
          className="login-card-in relative z-10 w-full max-w-[440px] rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.75)',
            boxShadow: '0 24px 64px rgba(44,62,80,0.12), 0 4px 16px rgba(44,62,80,0.06)',
          }}
        >
          {/* Card header */}
          <div className="login-field-in-1 mb-6">
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="w-1 h-7 rounded-full flex-shrink-0"
                style={{ background: 'linear-gradient(180deg, #2E86DE 0%, #1ABC9C 100%)' }}
              />
              <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
            </div>
            <p className="text-gray-400 text-sm mt-0.5 pl-3.5">
              Patient self-registration · free forever
            </p>
          </div>

          {/* Step indicator */}
          <div className="login-field-in-2 flex items-center gap-3 mb-7">
            {[
              { num: 1, label: 'Personal Info' },
              { num: 2, label: 'Security'      },
            ].map(({ num, label }, i) => (
              <React.Fragment key={num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                      ${num < step   ? 'bg-[#2E86DE] border-[#2E86DE] text-white'
                      : num === step ? 'border-[#2E86DE] text-[#2E86DE] bg-white'
                      :                'border-gray-200 text-gray-400 bg-white'}`}
                  >
                    {num < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : num}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden sm:block transition-colors duration-300
                      ${num <= step ? 'text-[#2E86DE]' : 'text-gray-400'}`}
                  >
                    {label}
                  </span>
                </div>
                {i < 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-all duration-500
                      ${step > 1 ? 'bg-[#2E86DE]' : 'bg-gray-200'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {step === 1 ? (
              <div className="space-y-4">

                <div className="login-field-in-2">
                  <FloatField
                    label="Full Name *"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    autoComplete="name"
                  />
                </div>

                <div className="login-field-in-3 grid grid-cols-2 gap-3">
                  <FloatField
                    label="Email *"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    autoComplete="email"
                  />
                  <FloatField
                    label="Phone *"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    autoComplete="tel"
                  />
                </div>

                <div className="login-field-in-4 grid grid-cols-2 gap-3">
                  <StaticField label="Date of Birth *" error={errors.dateOfBirth}>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className={selCls(!!errors.dateOfBirth)}
                    />
                  </StaticField>
                  <StaticField label="Gender *" error={errors.gender}>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={selCls(!!errors.gender)}
                    >
                      <option value="">Select gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </StaticField>
                </div>

                {/* Collapsible address */}
                <div className="login-field-in-5">
                  <button
                    type="button"
                    onClick={() => setShowAddress(v => !v)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-200
                      bg-gray-50/60 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
                  >
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">
                      Address (optional)
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showAddress ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showAddress && (
                    <div className="mt-3 space-y-3">
                      <FloatField
                        label="Street Address"
                        name="address.street"
                        value={formData.address.street}
                        onChange={handleChange}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FloatField label="City"  name="address.city"  value={formData.address.city}  onChange={handleChange} />
                        <FloatField label="State" name="address.state" value={formData.address.state} onChange={handleChange} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FloatField label="Zip Code" name="address.zipCode" value={formData.address.zipCode} onChange={handleChange} />
                        <FloatField label="Country"  name="address.country" value={formData.address.country} onChange={handleChange} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="login-field-in-5 pt-1">
                  <button
                    type="button"
                    onClick={goNext}
                    className="login-submit-btn w-full relative flex items-center justify-center gap-2 py-3.5 rounded-xl
                      text-white text-sm font-semibold overflow-hidden
                      transition-all duration-300 hover:scale-[1.015] active:scale-[0.985]"
                    style={{
                      background: 'linear-gradient(135deg, #2E86DE 0%, #1ABC9C 100%)',
                      boxShadow: '0 8px 24px rgba(46,134,222,0.35)',
                    }}
                  >
                    <span
                      className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)' }}
                    />
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">

                <div className="login-field-in-2">
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
                      tabIndex={-1}
                      onClick={() => setShowPw(p => ({ ...p, password: !p.password }))}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
                    >
                      {showPw.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </FloatField>
                  <PasswordStrength password={formData.password} />
                </div>

                <div className="login-field-in-3">
                  <FloatField
                    label="Confirm Password *"
                    name="confirmPassword"
                    type={showPw.confirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    autoComplete="new-password"
                  >
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {passwordsMatch && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPw(p => ({ ...p, confirmPassword: !p.confirmPassword }))}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
                      >
                        {showPw.confirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FloatField>
                </div>

                <div className="login-field-in-4 px-4 py-3 rounded-xl border text-xs text-blue-700 bg-blue-50/80 border-blue-200/60 leading-relaxed">
                  Your account will be registered as a{' '}
                  <span className="font-semibold">patient</span>.
                  For staff access, contact your hospital administrator.
                </div>

                <div className="login-field-in-5 flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setErrors({}) }}
                    className="flex-1 py-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600
                      hover:bg-gray-50 hover:border-gray-300 active:scale-[0.985] transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit-btn flex-1 relative flex items-center justify-center gap-2 py-3.5 rounded-xl
                      text-white text-sm font-semibold overflow-hidden
                      transition-all duration-300 hover:scale-[1.015] active:scale-[0.985]
                      disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                    style={{
                      background: loading
                        ? 'linear-gradient(135deg, #4a94d4 0%, #25a990 100%)'
                        : 'linear-gradient(135deg, #2E86DE 0%, #1ABC9C 100%)',
                      boxShadow: loading ? 'none' : '0 8px 24px rgba(46,134,222,0.35)',
                    }}
                  >
                    <span
                      className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)' }}
                    />
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
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

          {/* Sign in link */}
          <p className="login-field-in-5 mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#2E86DE] hover:text-[#1a6db5] font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Trust badge footer */}
        <div className="login-field-in-5 relative z-10 mt-6 flex items-center gap-3 text-[11px] text-gray-300">
          {['Secure Registration', 'HIPAA-ready', 'Free forever'].map((t, i) => (
            <React.Fragment key={t}>
              {i > 0 && <span className="w-1 h-1 rounded-full bg-gray-300/60" />}
              <span>{t}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Register
