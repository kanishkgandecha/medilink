'use strict';
const { callLLM } = require('../llmClient');
const { PATIENT_ASSISTANT, DISCLAIMER } = require('../promptTemplates');

const INTENT_MAP = [
  { intent: 'emergency',    patterns: ['emergency', 'ambulance', 'dying', 'heart attack', 'stroke', 'unconscious', 'can\'t breathe', 'severe chest pain', 'bleeding heavily', '112'] },
  { intent: 'appointment',  patterns: ['book appointment', 'schedule', 'doctor appointment', 'see a doctor', 'consult', 'appointment'] },
  { intent: 'billing',      patterns: ['bill', 'payment', 'invoice', 'pay', 'due', 'outstanding', 'fee', 'charge'] },
  { intent: 'prescription', patterns: ['prescription', 'medicine', 'medication', 'drug', 'tablet', 'dosage', 'refill'] },
  { intent: 'reports',      patterns: ['test report', 'lab report', 'blood test', 'x-ray', 'mri', 'ct scan', 'report', 'result', 'ultrasound'] },
  { intent: 'symptoms',     patterns: ['symptom', 'feeling sick', 'not well', 'pain', 'hurt', 'ache', 'unwell', 'check my symptoms', 'what do i have'] },
  { intent: 'navigation',   patterns: ['where', 'how to', 'find', 'settings', 'profile', 'ward', 'doctor list', 'pharmacy'] },
  { intent: 'general',      patterns: ['help', 'what can you', 'hello', 'hi', 'hey', 'thanks', 'thank you', 'namaste'] },
];

const RESPONSES = {
  emergency: {
    reply: '🚨 This sounds like a medical emergency. Please call 112 immediately or go to the nearest Emergency Room. Do not wait — every second matters in an emergency.',
    actions: [{ label: 'Call Emergency (112)', route: 'tel:112', type: 'external' }],
    urgent: true,
  },
  appointment: {
    reply: 'You can book an appointment from the Appointments page. Select your preferred doctor, department, date, and available time slot. Our AI Appointment Optimizer can also suggest the best doctor for your symptoms.',
    actions: [{ label: 'Book Appointment', route: '/appointments', type: 'navigate' }],
    urgent: false,
  },
  billing: {
    reply: 'All billing information — invoices, payment status, and history — is available in the Billing section. You can view unpaid bills and detailed payment breakdowns there.',
    actions: [{ label: 'View Billing', route: '/billing', type: 'navigate' }],
    urgent: false,
  },
  prescription: {
    reply: 'Your active prescriptions are available in the Prescriptions section. Each entry shows your medicines, dosage, frequency, and duration as prescribed by your doctor.',
    actions: [{ label: 'View Prescriptions', route: '/prescriptions', type: 'navigate' }],
    urgent: false,
  },
  reports: {
    reply: 'Your lab reports and diagnostic results are in the Test Reports section. You can also use our AI Report Analyser to get a plain-language explanation of any report.',
    actions: [{ label: 'View Reports', route: '/test-reports', type: 'navigate' }],
    urgent: false,
  },
  symptoms: {
    reply: 'I can help assess your symptoms using our AI Symptom Checker. It analyses your symptoms, identifies possible conditions, urgency level, and recommends specialists — all in seconds.',
    actions: [{ label: 'Open Symptom Checker', route: '/symptom-checker', type: 'navigate' }],
    urgent: false,
  },
  navigation: {
    reply: 'I can guide you anywhere in MediLink. What are you looking for — Appointments, Doctors, Prescriptions, Billing, Reports, or Settings?',
    actions: [
      { label: 'Appointments', route: '/appointments', type: 'navigate' },
      { label: 'My Doctors', route: '/doctors', type: 'navigate' },
    ],
    urgent: false,
  },
  general: {
    reply: 'Hello! I\'m MediBot, your AI health assistant for MediLink. I can help you book appointments, view prescriptions and reports, check symptoms, manage billing, and navigate the system. What can I help you with today?',
    actions: [],
    urgent: false,
  },
};

const FALLBACK_REPLIES = [
  'I\'m not sure I understood that completely. Could you rephrase? I can help with appointments, prescriptions, billing, symptoms, and reports.',
  'That\'s slightly outside my current capabilities. For medical advice, please book an appointment with your doctor through the Appointments section.',
  'I didn\'t quite catch that. Try asking about your appointments, test reports, prescriptions, or use the Symptom Checker for health questions.',
];

function detectIntent(message) {
  const lower = message.toLowerCase();
  for (const { intent, patterns } of INTENT_MAP) {
    if (patterns.some(p => lower.includes(p))) return intent;
  }
  return null;
}

function mockRespond({ message }) {
  const intent = detectIntent(message);
  if (intent && RESPONSES[intent]) {
    return {
      intent,
      ...RESPONSES[intent],
      followUpQuestions: ['Can I help you with anything else?'],
    };
  }
  return {
    intent: 'general',
    reply: FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)],
    actions: [{ label: 'Book Appointment', route: '/appointments', type: 'navigate' }],
    followUpQuestions: ['Would you like to book an appointment?', 'Shall I check your symptoms?'],
    urgent: false,
  };
}

async function runPatientAssistant({ message, history, userData }) {
  const result = await callLLM(
    PATIENT_ASSISTANT.system,
    PATIENT_ASSISTANT.user({ message, history, userData }),
    () => mockRespond({ message }),
  );
  return result.data;
}

module.exports = { runPatientAssistant };
