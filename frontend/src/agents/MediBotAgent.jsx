import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, User, ArrowRight, Phone, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { chatWithAssistant } from '../services/aiService'

const INITIAL_QUICK = [
  'Book an appointment',
  'Check my symptoms',
  'View my prescriptions',
  'Billing & payments',
]

const MediBotAgent = ({ open, onClose, onOpenSymptomChecker }) => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { id: 1, from: 'bot', text: "Hi! I'm MediBot, your AI health assistant. How can I help you today?", actions: [] }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const [history, setHistory] = useState([])
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages])

  const sendMessage = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg) return
    setInput('')
    setShowQuick(false)

    const userMsg = { id: Date.now(), from: 'user', text: msg, actions: [] }
    setMessages(prev => [...prev, userMsg])
    setTyping(true)

    const newHistory = [...history, { role: 'user', content: msg }]

    try {
      const res = await chatWithAssistant(msg, history)
      const ai = res?.data || res

      // Handle symptom-checker callback
      if (ai.intent === 'symptoms' && onOpenSymptomChecker) {
        ai.actions = [{ label: 'Open Symptom Checker', type: 'callback', icon: null }]
      }

      const botMsg = {
        id: Date.now() + 1,
        from: 'bot',
        text: ai.reply || 'I encountered an issue. Please try again.',
        actions: (ai.actions || []).map(a => ({
          ...a,
          callback: a.type === 'callback' ? () => { onClose(); onOpenSymptomChecker?.() } : undefined,
        })),
        urgent: ai.urgent || false,
      }
      setMessages(prev => [...prev, botMsg])
      setHistory([...newHistory, { role: 'assistant', content: ai.reply }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        from: 'bot',
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        actions: [],
      }])
    } finally {
      setTyping(false)
    }
  }

  const handleAction = (action) => {
    if (action.type === 'navigate') { onClose(); navigate(action.route) }
    else if (action.type === 'external') { window.open(action.route, '_blank') }
    else if (action.type === 'callback') { action.callback?.() }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-none">MediBot</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-blue-100 text-[10px]">AI Assistant · Powered by LLM</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2 ${msg.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.from === 'bot' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              {msg.from === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
              )}
              <div className="max-w-[78%] space-y-1.5">
                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                  msg.from === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-tr-sm'
                    : msg.urgent
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-tl-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
                {msg.actions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-0.5">
                    {msg.actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleAction(action)}
                        className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        {action.urgent ? <Phone className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-800">
                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick replies */}
        {showQuick && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-2 flex-shrink-0">
            {INITIAL_QUICK.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-[10px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a health question…"
            className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white disabled:opacity-40 hover:from-blue-700 hover:to-cyan-700 transition active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default MediBotAgent
