import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowLeft, Mail, Heart, Shield, Zap, CheckCircle } from 'lucide-react'
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
        <p className="text-cyan-300 text-xs font-semibold uppercase tracking-widest mb-3">Account Recovery</p>
        <h2 className="text-[2.6rem] font-extrabold text-white leading-[1.15] tracking-tight">
          Forgot your<br />password?
        </h2>
        <p className="mt-4 text-blue-200/90 text-sm leading-relaxed max-w-[260px]">
          No worries. Enter your email and we'll send you a secure link to reset it.
        </p>
      </div>

      <div className="space-y-3.5">
        {[
          { icon: Mail,   text: 'Secure reset link via email'      },
          { icon: Shield, text: 'Token expires after 1 hour'        },
          { icon: Zap,    text: 'Back to work in under a minute'    },
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

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return toast.error('Enter your email address')
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setEmailSent(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset link')
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
          {!emailSent ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Forgot password?</h2>
                <p className="text-gray-400 text-sm mt-1">Enter your email and we'll send a reset link</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder=" "
                      autoComplete="email"
                      className="peer block w-full px-4 pt-5 pb-2 text-sm rounded-xl border bg-gray-50 text-gray-900 border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300 transition-all duration-200"
                    />
                    <label
                      htmlFor="email"
                      className="absolute left-4 z-10 pointer-events-none origin-[0] transition-all duration-200
                        top-2 text-[10px] font-semibold tracking-wide text-blue-600
                        peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2
                        peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-gray-400
                        peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-blue-600"
                    >
                      Email Address
                    </label>
                  </div>
                </div>

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
                      Sending…
                    </>
                  ) : 'Send Reset Link'}
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
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-500/25">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-gray-500 text-sm mb-1">
                We sent a reset link to
              </p>
              <p className="text-gray-900 font-semibold text-sm mb-6">{email}</p>
              <p className="text-xs text-gray-400 mb-8">
                Didn't receive it? Check your spam folder or try again.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setEmailSent(false)}
                  className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Try a different email
                </button>
                <Link
                  to="/login"
                  className="block w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold text-center
                    hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
