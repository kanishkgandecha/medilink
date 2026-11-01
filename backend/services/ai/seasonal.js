'use strict';

// Seasonal guidance. Location packs list which seasons apply and in which
// months; the warning signs and wording live here so they are reviewed once.
// Rules can only add warning signs, add non-medication self-care, or raise
// urgency. They never name a disease (decision D-17) — patients and staff
// see symptoms to watch for, not a suspected condition.

const { withEnglish } = require('./language');

const SEASON_RULES = {
  // Monsoon / post-monsoon fever. Warning signs follow the WHO dengue
  // warning-sign framework referenced by India's national clinical guidance,
  // worded as symptoms only.
  'monsoon-fever': {
    trigger: /\b(fever|feverish|high temperature)\b/i,
    warningSigns: /\b(bleeding (?:from )?(?:the )?(?:gums?|nose)|(?:gum|nose|gums) bleed(?:ing)?|blood (?:in|from) (?:the )?(?:vomit|stool|urine|gums|nose)|red spots|severe (?:abdominal|belly|stomach) pain|persistent vomiting|vomiting (?:again and again|repeatedly|many times)|very drowsy|unusually drowsy|restless|lethargic|cold (?:hands|skin)|very weak)\b/i,
    floor: 'High',
    redFlags: [
      'Bleeding from the gums or nose, red spots on the skin, or blood in vomit, stool, or urine',
      'Persistent vomiting or severe belly pain',
      'Unusual drowsiness, restlessness, or cold, clammy skin',
    ],
    selfCare: ['Fevers are common in your area at this time of year: get a same-day medical check if any warning sign below appears, and do not wait for the fever to settle on its own.'],
  },
  // Summer heat. Heat-exposure wording is required so ordinary headaches and
  // dizziness are not attributed to the weather.
  'summer-heat': {
    trigger: /\b(heat exposure|in the sun|in the heat|under the sun|heatwave|heat wave|very hot (?:day|weather)|working outside|worked outside)\b/i,
    warningSigns: /\b(heavy sweating|dizz|headache|nausea|vomit|muscle cramps?|cramps|very weak|weakness|very thirsty|fast heartbeat)/i,
    floor: 'Moderate',
    redFlags: [
      'Very high body temperature, hot dry skin, or sweating that has stopped',
      'Confusion, fainting, seizures, or unusual behaviour',
    ],
    selfCare: [
      'Move to a cool, shaded place, loosen clothing, and cool the skin with water.',
      'Sip water if fully alert; seek medical care if symptoms do not improve quickly after cooling.',
    ],
  },
};

// Month (1–12) in India time, so a late-evening request falls in the right month.
const monthInIndia = (date) => Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'numeric' }).format(date));

// The offline evaluation fixes the date so its results do not change with
// the calendar month; it is never set in the running application.
let evaluationDate = null;
const setEvaluationDate = (date) => { evaluationDate = date; };

function activeSeasons(locale, now = new Date()) {
  const month = monthInIndia(locale?.asOf || evaluationDate || now);
  return (locale?.seasons || []).filter((season) => SEASON_RULES[season.id] && season.months.includes(month));
}

const URGENCY_RANK = { Low: 0, Moderate: 1, High: 2, Critical: 3 };

// Returns the additions for this text in this place and month; never removes.
function seasonalGuidance(symptoms, locale, now) {
  const text = withEnglish(symptoms);
  const result = { floor: null, redFlags: [], selfCare: [], applied: [] };
  for (const season of activeSeasons(locale, now)) {
    const rule = SEASON_RULES[season.id];
    if (!rule.trigger.test(text)) continue;
    result.applied.push(season.id);
    result.redFlags.push(...rule.redFlags);
    result.selfCare.push(...rule.selfCare);
    if (rule.warningSigns.test(text) && (!result.floor || URGENCY_RANK[rule.floor] > URGENCY_RANK[result.floor])) result.floor = rule.floor;
  }
  return result;
}

const raiseTo = (urgency, floor) => (floor && URGENCY_RANK[floor] > URGENCY_RANK[urgency] ? floor : urgency);

module.exports = { SEASON_RULES, activeSeasons, seasonalGuidance, raiseTo, monthInIndia, setEvaluationDate };
