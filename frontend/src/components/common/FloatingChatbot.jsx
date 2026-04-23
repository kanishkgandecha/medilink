import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Activity, Bot } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'assistant',
    text: 'Hi! I\'m MediLink Assistant. I can help you with general health questions, appointment guidance, and navigating the platform. How can I help you today?'
  }
]

const QUICK_REPLIES = [
  'How do I book an appointment?',
  'Where can I view my prescriptions?',
  'How do I update my profile?',
]

const FloatingChatbot = () => {
  const { darkMode } = useTheme()
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput]     = useState('')
  const [typing, setTyping]   = useState(false)
  const endRef                = useRef(null)
  const inputRef              = useRef(null)

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages])

  const send = (text) => {
    const msg = (text ?? input).trim()
    if (!msg) return
    setInput('')

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: msg }])
    setTyping(true)

    // Simulated response
    setTimeout(() => {
      const lower = msg.toLowerCase()
      let reply = "I'm here to help! For specific medical advice, please consult your assigned doctor through the Appointments page."

      if (lower.includes('appointment') || lower.includes('book'))
        reply = "To book an appointment, go to the Appointments page from the sidebar and click 'New Appointment'. You can choose your preferred doctor and time slot."
      else if (lower.includes('prescription'))
        reply = "You can view your prescriptions under the Prescriptions section in the sidebar. Your doctor adds prescriptions after each consultation."
      else if (lower.includes('profile') || lower.includes('settings'))
        reply = "You can update your profile details in the Settings page. Click your name in the top-right corner and select Settings."
      else if (lower.includes('billing') || lower.includes('payment'))
        reply = "All billing information is available in the Billing page. You can view invoice status and payment history there."
      else if (lower.includes('doctor') || lower.includes('contact'))
        reply = "You can see your assigned doctor in the Patients section. For direct consultation, please schedule an appointment."

      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply }])
      setTyping(false)
    }, 900)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const dm = darkMode

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-24 right-6 z-50 w-80 flex flex-col rounded-2xl shadow-2xl border overflow-hidden
            transition-all duration-300 animate-scale-in
            ${dm ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
          style={{
            height: '420px',
            boxShadow: dm ? '0 24px 48px rgba(0,0,0,0.6)' : '0 24px 48px rgba(0,0,0,0.15)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-none">MediLink Assistant</p>
                <p className="text-blue-200 text-[10px] mt-0.5">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-tr-sm'
                      : dm
                        ? 'bg-gray-800 text-gray-200 rounded-tl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className={`px-3 py-2.5 rounded-2xl rounded-tl-sm ${dm ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Quick replies (only show after first message) */}
          {messages.length === 1 && (
            <div className={`px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0 border-t ${dm ? 'border-gray-800' : 'border-gray-100'} pt-2`}>
              {QUICK_REPLIES.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors
                    ${dm
                      ? 'border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-400'
                      : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'}`}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className={`flex items-center gap-2 px-3 py-2.5 border-t flex-shrink-0 ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              className={`flex-1 text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all
                ${dm
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || typing}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white
                disabled:opacity-40 hover:from-blue-700 hover:to-cyan-700 transition-all active:scale-95 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="MediLink Assistant"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl
          flex items-center justify-center transition-all duration-300
          ${open
            ? 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-gray-500/30'
            : 'bg-gradient-to-br from-blue-600 to-cyan-600 shadow-blue-500/40'}
          hover:scale-110 active:scale-95`}
        style={{ boxShadow: open
          ? '0 8px 32px rgba(0,0,0,0.3)'
          : '0 8px 32px rgba(59,130,246,0.5)'
        }}
      >
        {open
          ? <X className="w-6 h-6 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />
        }
      </button>
    </>
  )
}

export default FloatingChatbot
