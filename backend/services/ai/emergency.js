'use strict';

// Shared emergency detector used by every agent and by the safety layer, so
// symptom analysis, chat, appointments, bed allocation, and health risk all
// escalate the same presentations. Sources for the warning signs: WHO
// Interagency Integrated Triage Tool high-risk signs and ICMR Standard
// Treatment Workflow red flags (see docs/ai-datasets-and-location-rules-plan.md).
//
// Detection can only escalate. Free text is normalised (case, punctuation,
// common misspellings) before matching. A statement is treated as history,
// not a current emergency, only when it carries both a past-time marker and
// a resolved marker ("last year ... now fine"); self-harm is never discounted.

const CAN_NOT = "(?:can'?t|cannot|can not|unable to|could ?n'?t)";

const SIGNS = [
  { category: 'cardiac', pattern: /\b(severe chest pain|chest pressure|crushing (?:chest|pressure|pain)|chest (?:is )?squeezing|squeezing (?:in|of) (?:my |the )?chest|heart attack)\b/ },
  { category: 'breathing', pattern: new RegExp(`\\b(${CAN_NOT} (?:breathe|catch (?:my |his |her )?breath)|difficulty (?:in )?breathing|struggling to breathe|not breathing|stopped breathing|gasping|choking|blue lips|lips (?:are |turning |look )?blue|turning blue|looks? bluish|bluish (?:lips|skin|face)|breathless(?:ness)? (?:at rest|even (?:when|while) (?:sitting|resting|lying)))\\b`) },
  { category: 'stroke', pattern: new RegExp(`\\b(stroke|face (?:is )?drooping|drooping (?:of )?(?:the )?face|facial droop|slurred speech|${CAN_NOT} speak (?:clearly|properly)|sudden (?:numbness|weakness)|(?:one|left|right) side of (?:my |his |her |the )?(?:body|face) (?:went |is |feels |became )?(?:numb|weak)|weakness (?:on|in) one side|sudden confusion)\\b`) },
  { category: 'neurological', pattern: /\b(unconscious|unresponsive|not responding|seizures?|convulsions?|(?:having|had|getting) (?:a )?fits?|fainting|fainted|passed out|collapsed|worst headache (?:of my life|ever)|thunderclap headache|sudden severe headache)\b/ },
  { category: 'anaphylaxis', pattern: /\b(anaphylaxis|throat (?:is )?swelling|swelling (?:of|in) (?:my |the )?throat|(?:lips|tongue|face) (?:and (?:lips|tongue|face) )?(?:are |is )?swelling\b.*\b(?:wheez|breath|sting|bite|ate|eating|allerg))/ },
  { category: 'bleeding', pattern: /\b(heavy bleeding|bleeding heavily|bleeding (?:that )?(?:will not|won'?t|wont|does not|doesn'?t) stop|vomiting blood|blood in (?:my )?vomit|coughing (?:up )?blood|black (?:tarry )?stools?|tarry stools?)\b/ },
  { category: 'abdominal', pattern: /\b(severe (?:abdominal|belly|stomach|tummy) pain)\b/ },
  { category: 'self-harm', pattern: /\b(suicid(?:e|al)|self[- ]?harm|kill (?:my ?self|himself|herself)|end (?:my|his|her) life|want to die|(?:don'?t|do not) want to live|took (?:too many|an overdose|a lot of)\b|overdose)/ },
  { category: 'poisoning', pattern: /\b(swallowed|drank|drunk|ingested)\b.*\b(bleach|poison|acid|kerosene|pesticide|insecticide|phenyl|rat poison|battery|cleaner)\b|\bpoison(?:ed|ing)\b|\bsnake ?bite\b|\bbitten by a snake\b/ },
];

// Presentations that are emergencies only in combination.
const COMBINATIONS = [
  { category: 'cardiac', all: [/\bchest (?:pain|tightness|discomfort|hurts?|ache)\b/, /\b(shortness of breath|breathless|sweat(?:ing|y)?|cold sweat|faint|lightheaded|jaw pain|arm pain|back pain)/] },
  { category: 'meningitis', all: [/\bfever\b/, /\b(stiff neck|neck stiffness|rash (?:that )?(?:does not|doesn'?t|won'?t) fade|non[- ]?blanching rash)\b/] },
  { category: 'head-injury', all: [/\b(hit|banged|injured|hurt|fell on) (?:my |his |her |the )?head\b|\bhead injury\b/, /\b(vomit|drowsy|confus|unconscious|seizure)/] },
  { category: 'pregnancy-bleeding', all: [/\bpregnan/, /\bbleed/] },
  { category: 'gi-bleed', all: [/\b(black|tarry|bloody) stool/, /\b(dizz|faint|weak)/] },
];

// Common misspellings of words that matter for escalation. Kept explicit
// rather than fuzzy so unrelated words are never rewritten into warning signs.
const MISSPELLINGS = {
  chset: 'chest', chets: 'chest', cheast: 'chest',
  breathlesness: 'breathlessness', breathlessnes: 'breathlessness', brethlessness: 'breathlessness', breathelessness: 'breathlessness',
  breth: 'breath', brething: 'breathing', breating: 'breathing', breatheing: 'breathing',
  unconcious: 'unconscious', unconscius: 'unconscious', siezure: 'seizure', seizur: 'seizure', seziure: 'seizure',
  bleding: 'bleeding', bleeing: 'bleeding', sweting: 'sweating', swetting: 'sweating',
  vomitting: 'vomiting', vommiting: 'vomiting', suicde: 'suicide', sucide: 'suicide', suiside: 'suicide',
  stomache: 'stomach', abdominel: 'abdominal', droping: 'drooping',
};

const PAST = /\b(last (?:week|month|year)|years? ago|months? ago|weeks? ago|in the past|previously|history of)\b/;
const RESOLVED = /\b(now (?:fine|ok|okay|better|normal)|i am fine|i'?m fine|fully recovered|no (?:symptoms|problems?) now)\b/;

function normalize(value) {
  const raw = Array.isArray(value) ? value.join(' ') : String(value || '');
  return raw
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => MISSPELLINGS[word] || word)
    .join(' ')
    .trim();
}

// Returns { emergency, categories } for any free text or list of symptoms.
function detectEmergency(value) {
  const text = normalize(value);
  if (!text) return { emergency: false, categories: [] };
  const categories = new Set();
  for (const { category, pattern } of SIGNS) if (pattern.test(text)) categories.add(category);
  for (const { category, all } of COMBINATIONS) if (all.every((p) => p.test(text))) categories.add(category);

  if (categories.size && !categories.has('self-harm') && PAST.test(text) && RESOLVED.test(text)) {
    return { emergency: false, categories: [], discounted: [...categories] };
  }
  return { emergency: categories.size > 0, categories: [...categories] };
}

const isEmergency = (value) => detectEmergency(value).emergency;

// India defaults; per-state contacts move to locale packs in phase L1.
const EMERGENCY_CONTACTS = Object.freeze({
  emergency: { label: 'Call Emergency (112)', number: '112' },
  mentalHealth: { label: 'Tele-MANAS (14416)', number: '14416' },
});

module.exports = { detectEmergency, isEmergency, normalize, EMERGENCY_CONTACTS };
