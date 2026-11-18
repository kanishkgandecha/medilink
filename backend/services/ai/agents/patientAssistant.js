'use strict';
const { callLLM } = require('../llmClient');
const { PATIENT_ASSISTANT, DISCLAIMER } = require('../promptTemplates');
const { enforceAssistantSafety } = require('../safety');
const { buildSourceMeta } = require('../sourceClassification');
const { withEnglish } = require('../language');

// Topic vocabularies shared by the intent patterns below.
const TEST_NAMES = /\b(?:biopsy|ecg|ekg|echo(?:cardiogram)?|2d echo|mammogram|pap smear|culture|hba1c|lipid profile|thyroid profile|cbc|sonography|pet scan|endoscopy|colonoscopy|angiography|tmt|dexa|images?)\b/;
const MEDICINE_TYPES = /\b(?:antibiotics?|painkillers?|pain killers?|(?:bp|sugar|thyroid) (?:tablets?|medicines?)|insulin|vitamins?|supplements?|creams?|antacids?)\b/;
const BILLING_TERMS = /\b(?:transactions?|total (?:for|amount|bill)|(?:health|insurance|company) policy|coverage|covered|emi|gst|discount|package)\b/;
const BODY_SYMPTOM = /\b(?:eyes?|ears?|nose|tooth|teeth|gums?|knees?|legs?|arms?|hands?|feet|foot|neck|skin|chest|back|joints?)\b.*\b(?:red|swollen|watering|aching|bleeding|burning|numb|itchy|pain(?:ful)?|sore|stiff)\b/;

// Whole-word patterns per intent. The intent with the most matching patterns
// wins; ties go to the earlier intent. Word boundaries stop accidental
// matches such as "hi" in "which" or "fee" in "feeling".
const INTENT_PATTERNS = [
  { intent: 'emergency',    patterns: [/\bemergency\b/, /\bambulance\b/, /\bdying\b/, /\bheart attack\b/, /\bstroke\b/, /\bunconscious\b/, /\bcan'?t breathe\b/, /\bsevere chest pain\b/, /\bbleeding heavily\b/, /\b112\b/] },
  { intent: 'appointment',  patterns: [/\bappointments?\b/, /\bbook(?:ing)?\b/, /\bre-?schedule\b/, /\bschedule\b/, /\bcancel\b/, /\bvisit\b/, /\bconsult(?:ation)?\b/, /\b(?:post|pre)pone\b/, /\bcheck-?ups?\b/, /\bmeet (?:a|the|my|dr)\b/, /\b(?:ent|eye|dental|skin|child|bone) (?:doctor|specialist|clinic)\b/, /\bdoctor (?:on|at|for) (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/, /\bsee (?:a|the|my) (?:doctor|specialist|\w+(?:ologist|ician|iatrist))\b/, /\b(?:cardiologist|dermatologist|neurologist|pediatrician|paediatrician|orthopedic|gynaecologist|gynecologist|skin doctor|specialist)\b/, /\bprocedure\b/, /\b(?:fix|book|get) a (?:time|slot)\b/, /\bslot\b/, /\b(?:free|available) (?:today|tomorrow|on)\b/, /\bdr\.? \w+ (?:free|available)\b/, /\bvaccinat\w*\b/, /\bvaccines?\b/, /\b(?:an earlier|a later|another) (?:time|date|slot)\b/, /\bopd\b/] },
  { intent: 'billing',      patterns: [/\bbills?\b/, /\bbilling\b/, /\bpay(?:ment|ments)?\b/, /\binvoices?\b/, /\bowe\b/, /\bdues?\b/, /\boutstanding\b/, /\bfees?\b/, /\bcharged?\b/, /\breceipts?\b/, /\binsurance\b/, /\bmediclaim\b/, /\bclaims?\b/, /\brefund\b/, /\bhow much\b/, /\bbalance\b/, /\bupi\b/, /\bcost\b/, /\bcashless\b/, /\btpa\b/, /\bestimate\b/, /\bprice\b/, /\bpaid\b/, /\bdeposit\b/, BILLING_TERMS] },
  { intent: 'prescription', patterns: [/\bprescriptions?\b/, /\bprescribed\b/, /\bmedicines?\b/, /\bmedications?\b/, /\bpills?\b/, /\btablets?\b/, /\bdrugs?\b/, /\brefill\b/, /\bdos(?:e|age)\b/, /\bsyrups?\b/, /\bcapsules?\b/, /\binjections?\b/, /\binhalers?\b/, /\bointments?\b/, /\b(?:eye|ear) drops\b/, MEDICINE_TYPES] },
  { intent: 'reports',      patterns: [/\breports?\b/, /\btest results?\b/, /\bresults?\b/, /\blab\b/, /\bblood test\b/, /\b(?:sugar|thyroid|urine) test\b/, /\bx-?ray\b/, /\bmri\b/, /\bct scan\b/, /\bscan\b/, /\bultrasound\b/, TEST_NAMES] },
  { intent: 'symptoms',     patterns: [/\bsymptoms?\b/, /\bsick\b/, /\bunwell\b/, /\bnot (?:feeling )?well\b/, /\bpain(?:ful)?\b/, /\bhurt(?:s|ing)?\b/, /\bache\b/, /\bfever\b/, /\bcough\b/, /\bsore\b/, /\bheadache\b/, /\bcold\b/, /\bvomit(?:ing)?\b/, /\bdizzy\b/, /\bweak\b/, /\bswollen\b/, /\brash\b/, /\bwhat (?:could it be|do i have)\b/, /\bstomach\b/, /\bthroat\b/, /\bloose motions?\b/, /\bdiarrh(?:o)?ea\b/, /\bconstipat\w*/, /\bitch(?:ing|y)?\b/, /\bswelling\b/, /\bburning\b/, /\btired\b/, /\bbreath(?:less)?\b/, /\bnausea\b/, /\bbleeding\b/, /\binjur(?:y|ed)\b/, BODY_SYMPTOM] },
  { intent: 'navigation',   patterns: [/\bpassword\b/, /\bsettings?\b/, /\bprofile\b/, /\bphoto\b/, /\bphone number\b/, /\baccount\b/, /\b(?:list of|all|which) doctors\b/, /\bdoctors? list\b/, /\bwhere (?:is|can i|do i)\b/, /\bhow (?:do|can) i (?:change|update|find)\b/, /\bvisiting (?:time|hours)\b/, /\btimings?\b/, /\bpharmacy\b/, /\bward\b/, /\bemail\b/, /\bnotifications?\b/, /\blog ?out\b/, /\bsign ?out\b/, /\blanguage\b/, /\bdelete my account\b/, /\balerts?\b/, /\bsms\b/, /\breminders?\b/, /\bdisplay picture\b/, /\bprivacy\b/] },
  { intent: 'general',      patterns: [/\bhelp\b/, /\bwhat can you\b/, /\bwho are you\b/, /^(?:hello|hi|hey|namaste|good (?:morning|afternoon|evening))\b/, /\b(?:hello|namaste)\b/, /\bthanks?\b/, /\bthank you\b/] },
];

// Navigation requests open the page they ask about.
const NAVIGATION_ROUTES = [
  { pattern: /\b(?:password|settings?|notifications?|language|log ?out|sign ?out|alerts?|sms|reminders?|privacy)\b/, action: { label: 'Open Settings', route: '/settings', type: 'navigate' } },
  { pattern: /\b(?:profile|photo|display picture|phone number|email|account|address)\b/, action: { label: 'Open Profile', route: '/profile', type: 'navigate' } },
  { pattern: /\bdoctors?\b/, action: { label: 'View Doctors', route: '/doctors', type: 'navigate' } },
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

// Model intents such as "appointments" or "report" map to the known intents.
const INTENT_ALIASES = { appointments: 'appointment', bills: 'billing', bill: 'billing', prescriptions: 'prescription', report: 'reports', symptom: 'symptoms', greeting: 'general' };

function detectIntent(message) {
  const lower = withEnglish(message).toLowerCase();
  let best = null;
  for (const { intent, patterns } of INTENT_PATTERNS) {
    const score = patterns.filter((p) => p.test(lower)).length;
    if (intent === 'emergency' && score) return intent;
    if (score && (!best || score > best.score)) best = { intent, score };
  }
  return best?.intent || null;
}

function navigationActions(message) {
  const lower = withEnglish(message).toLowerCase();
  const matched = NAVIGATION_ROUTES.filter(({ pattern }) => pattern.test(lower)).map(({ action }) => action);
  return matched.length ? matched : RESPONSES.navigation.actions;
}

function mockRespond({ message }) {
  const intent = detectIntent(message);
  if (intent && RESPONSES[intent]) {
    return {
      intent,
      ...RESPONSES[intent],
      ...(intent === 'navigation' ? { actions: navigationActions(message) } : {}),
      followUpQuestions: ['Can I help you with anything else?'],
    };
  }
  return {
    intent: 'general',
    reply: FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)],
    // When the request is not understood, offer the main pages instead of guessing.
    actions: [
      { label: 'Appointments', route: '/appointments', type: 'navigate' },
      { label: 'Billing', route: '/billing', type: 'navigate' },
      { label: 'Prescriptions', route: '/prescriptions', type: 'navigate' },
      { label: 'Test Reports', route: '/test-reports', type: 'navigate' },
      { label: 'Symptom Checker', route: '/symptom-checker', type: 'navigate' },
    ],
    followUpQuestions: ['Which of these do you need help with?'],
    urgent: false,
  };
}

async function runPatientAssistant({ message, history, userData, locale }) {
  const result = await callLLM(
    PATIENT_ASSISTANT.system,
    PATIENT_ASSISTANT.user({ message, history, userData }),
    () => mockRespond({ message }),
  );
  if (result.data?.intent && !RESPONSES[result.data.intent]) result.data.intent = INTENT_ALIASES[String(result.data.intent).toLowerCase()] || 'general';
  const safe = enforceAssistantSafety(result.data, message, locale);
  // When the model gives no usable page link, offer the one for its intent
  // (or the rules' intent), so a reply always leads somewhere.
  if (!safe.urgent && !safe.actions.length) {
    const intent = RESPONSES[safe.intent] && safe.intent !== 'general' ? safe.intent : detectIntent(message);
    safe.actions = intent === 'navigation' ? navigationActions(message) : (RESPONSES[intent]?.actions || []);
  }
  return {
    ...safe,
    ...buildSourceMeta(safe, {
      requiresHumanReview: false,
      limitations: [
        'General navigation and guidance only — it cannot read or change any medical record.',
        'For medical advice, book an appointment with a qualified clinician; for an emergency, call emergency services.',
      ],
    }),
  };
}

module.exports = { runPatientAssistant };
