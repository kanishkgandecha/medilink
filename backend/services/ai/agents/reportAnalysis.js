'use strict';
const { callLLM } = require('../llmClient');
const { REPORT_ANALYSIS, DISCLAIMER } = require('../promptTemplates');
const { enforceReportSafety } = require('../safety');
const { parseReportMeasurements } = require('../reportParser');
const { buildSourceMeta } = require('../sourceClassification');

// Whole-word keys per report type. Imaging and ECG headers ("CT ABDOMEN",
// "USG", "ECG") weigh more than organ words that appear in many reports.
const REPORT_TYPES = [
  { type: 'X-Ray Report', heading: /\b(?:x-?ray|radiograph)\b/, keys: [/\bopacity\b/, /\bfracture\b/, /\bpa view\b/, /\bcostophrenic\b/] },
  { type: 'MRI Report', heading: /\b(?:mri|magnetic resonance)\b/, keys: [/\blesion\b/, /\binfarct\b/, /\bt2\b/] },
  { type: 'CT Scan Report', heading: /\b(?:ct|hrct|cect|ncct|computed tomography)\b/, keys: [/\bcontrast\b/, /\bhounsfield\b/] },
  { type: 'Ultrasound Report', heading: /\b(?:usg|ultrasound|ultrasonography|sonography|doppler)\b/, keys: [/\bechotexture\b/, /\bcalculi\b/, /\bgall ?bladder\b/] },
  { type: 'ECG Report', heading: /\b(?:ecg|ekg|electrocardiogram)\b/, keys: [/\bsinus\b/, /\bqrs\b/, /\bst (?:changes|segment)\b/, /\baxis\b/, /\barrhythmia\b/] },
  { type: 'Blood Sugar / Diabetes Panel', keys: [/\bhba1c\b/, /\bglycated\b/, /\bglucose\b/, /\bblood sugar\b/, /\bfasting\b/, /\bpost ?prandial\b/, /\bppbs\b/, /\bfbs\b/, /\binsulin\b/] },
  { type: 'Lipid Profile', keys: [/\bcholesterol\b/, /\bldl\b/, /\bhdl\b/, /\bvldl\b/, /\btriglycerides?\b/, /\blipid\b/] },
  { type: 'Thyroid Function Test (TFT)', keys: [/\btsh\b/, /\bthyroid\b/, /\b(?:free )?t3\b/, /\b(?:free )?t4\b/, /\bthyroxine\b/] },
  { type: 'Kidney Function Test (KFT)', keys: [/\bcreatinine\b/, /\burea\b/, /\bbun\b/, /\begfr\b/, /\buric acid\b/, /\bsodium\b/, /\bpotassium\b/, /\b(?:kidney|renal) (?:function|panel)\b/] },
  { type: 'Liver Function Test (LFT)', keys: [/\bsgpt\b/, /\bsgot\b/, /\balt\b/, /\bast\b/, /\bbilirubin\b/, /\balkaline phosphatase\b/, /\bggt\b/, /\bliver function\b/] },
  { type: 'Urine Analysis', keys: [/\burine\b/, /\burinalysis\b/, /\bspecific gravity\b/, /\bpus cells\b/, /\bketones?\b/] },
  { type: 'Complete Blood Count (CBC)', keys: [/\bha?emoglobin\b/, /\bhb\b/, /\bwbc\b/, /\brbc\b/, /\bplatelets?\b/, /\bcbc\b/, /\bblood count\b/, /\bleucocytes?\b/, /\bneutrophils\b/, /\blymphocytes\b/, /\besr\b/, /\bmcv\b/] },
];

const MOCK_FINDINGS = {
  'Complete Blood Count (CBC)': {
    summary: 'Blood panel reviewed. Most haematological parameters are within normal limits. Minor borderline findings noted.',
    findings: [
      { parameter: 'Haemoglobin (Hb)', value: '13.4 g/dL', normalRange: '12–17 g/dL', status: 'Normal', explanation: 'Adequate oxygen-carrying capacity. No anaemia detected.' },
      { parameter: 'WBC Count', value: '7,200 cells/µL', normalRange: '4,500–11,000 cells/µL', status: 'Normal', explanation: 'White blood cell count is normal, suggesting no active infection or significant immune response.' },
      { parameter: 'Platelet Count', value: '210,000 /µL', normalRange: '150,000–400,000 /µL', status: 'Normal', explanation: 'Platelet count is normal, indicating adequate clotting ability.' },
      { parameter: 'Fasting Blood Sugar', value: '102 mg/dL', normalRange: '70–100 mg/dL', status: 'Borderline', explanation: 'Slightly above normal fasting range. May indicate pre-diabetic tendency. Lifestyle monitoring advised.' },
      { parameter: 'HbA1c', value: '5.8%', normalRange: '< 5.7%', status: 'Borderline', explanation: 'Marginally elevated 3-month blood sugar average. Dietary modification recommended.' },
    ],
    insights: ['Most blood parameters are normal.', 'Borderline blood sugar warrants dietary changes and a 3-month follow-up.', 'Consider reducing refined carbohydrates and increasing physical activity.'],
    recommendations: 'Follow up in 3 months for repeat fasting glucose and HbA1c. Consult a diabetologist if HbA1c rises above 6%. Adopt a low-glycaemic diet.',
    urgency: 'Routine',
  },
  'Lipid Profile': {
    summary: 'Cardiovascular risk markers show a mixed pattern. HDL is low and LDL is elevated, indicating increased cardiovascular risk.',
    findings: [
      { parameter: 'Total Cholesterol', value: '198 mg/dL', normalRange: '< 200 mg/dL', status: 'Normal', explanation: 'Just within acceptable total cholesterol range.' },
      { parameter: 'HDL (Good Cholesterol)', value: '42 mg/dL', normalRange: '> 60 mg/dL', status: 'Abnormal', explanation: 'Low HDL reduces cardiovascular protection. Increasing aerobic exercise and omega-3 intake can help.' },
      { parameter: 'LDL (Bad Cholesterol)', value: '132 mg/dL', normalRange: '< 100 mg/dL', status: 'Abnormal', explanation: 'Elevated LDL is a major risk factor for arterial plaque and heart disease.' },
      { parameter: 'Triglycerides', value: '168 mg/dL', normalRange: '< 150 mg/dL', status: 'Borderline', explanation: 'Mildly elevated. Often linked to diet, alcohol, and metabolic syndrome.' },
    ],
    insights: ['Low HDL + elevated LDL significantly increases cardiovascular risk.', 'Triglycerides are borderline — dietary improvement is key.', 'Cardiology consultation is strongly recommended.'],
    recommendations: 'Consult a cardiologist. Start a heart-healthy diet: reduce saturated fats, increase omega-3 (fish, flaxseed), eat more fibre. Reassess in 6 weeks.',
    urgency: 'Soon',
  },
  'Thyroid Function Test (TFT)': {
    summary: 'All thyroid markers are within normal reference ranges. No thyroid dysfunction detected.',
    findings: [
      { parameter: 'TSH', value: '3.2 mIU/L', normalRange: '0.4–4.0 mIU/L', status: 'Normal', explanation: 'TSH is the primary indicator of thyroid health. Normal value confirms adequate thyroid regulation.' },
      { parameter: 'Free T3', value: '2.9 pg/mL', normalRange: '2.3–4.2 pg/mL', status: 'Normal', explanation: 'Active thyroid hormone is normal. No over- or under-activity detected.' },
      { parameter: 'Free T4', value: '1.1 ng/dL', normalRange: '0.8–1.8 ng/dL', status: 'Normal', explanation: 'Thyroxine level is normal, confirming balanced thyroid hormone production.' },
    ],
    insights: ['Thyroid function is completely normal.', 'No signs of hypothyroidism or hyperthyroidism.', 'Routine monitoring every 12 months is advisable.'],
    recommendations: 'No medication or intervention required. Annual TFT monitoring recommended, especially if there is a family history of thyroid disorders.',
    urgency: 'Routine',
  },
  'Kidney Function Test (KFT)': {
    summary: 'Renal function is mostly within acceptable limits with a mildly reduced eGFR worth monitoring.',
    findings: [
      { parameter: 'Serum Creatinine', value: '0.9 mg/dL', normalRange: '0.7–1.3 mg/dL', status: 'Normal', explanation: 'Creatinine is normal, indicating adequate kidney filtration.' },
      { parameter: 'Blood Urea Nitrogen (BUN)', value: '18 mg/dL', normalRange: '7–20 mg/dL', status: 'Normal', explanation: 'BUN within normal range, consistent with adequate kidney function.' },
      { parameter: 'eGFR', value: '88 mL/min/1.73m²', normalRange: '> 90 mL/min/1.73m²', status: 'Borderline', explanation: 'Slightly below optimal eGFR. Indicates mildly reduced kidney filtration rate (CKD Stage G2 borderline). Hydration and blood pressure control are important.' },
    ],
    insights: ['Kidney function is near-normal but the eGFR warrants monitoring.', 'Adequate hydration (2-3 L/day) is essential.', 'Avoid NSAIDs (ibuprofen) without medical supervision.'],
    recommendations: 'Repeat KFT in 3–6 months. Maintain optimal blood pressure. Stay well-hydrated. Limit high-protein diet. Consult nephrologist if eGFR drops below 60.',
    urgency: 'Routine',
  },
};

function detectReportType(text, hint) {
  if (hint && hint !== 'Medical Report') return hint;
  const lower = text.toLowerCase();
  const firstLines = lower.split(/\r?\n/).slice(0, 3).join(' ');
  let best = null;
  for (const rt of REPORT_TYPES) {
    // An imaging/ECG heading in the first lines decides the type outright.
    if (rt.heading && rt.heading.test(firstLines)) return rt.type;
    const score = rt.keys.filter((key) => key.test(lower)).length + (rt.heading && rt.heading.test(lower) ? 2 : 0);
    if (score && (!best || score > best.score)) best = { type: rt.type, score };
  }
  return best?.type || 'General Medical Report';
}

function mockAnalyze(reportText, reportType) {
  const detectedType = detectReportType(reportText, reportType);
  const template = MOCK_FINDINGS[detectedType];

  if (template) {
    return { reportType: detectedType, ...template, disclaimer: DISCLAIMER };
  }

  return {
    reportType: detectedType,
    summary: 'Medical report received and reviewed. The document contains clinical data that has been assessed for key findings.',
    keyFindings: [
      { parameter: 'Overall Assessment', value: 'Reviewed', normalRange: 'N/A', status: 'Normal', explanation: 'No critical abnormalities identified based on initial screening. A qualified physician should review the full report for clinical interpretation.' },
    ],
    insights: ['Report has been reviewed at a high level.', 'For detailed interpretation, please consult your treating physician.', 'Bring this report to your next appointment for clinical discussion.'],
    recommendations: 'Please share this report with your doctor at your next appointment for a complete clinical interpretation and follow-up plan.',
    urgency: 'Routine',
    disclaimer: DISCLAIMER,
  };
}

async function runReportAnalysis({ reportText, reportType }) {
  const parsedFindings = parseReportMeasurements(reportText);
  const result = await callLLM(
    REPORT_ANALYSIS.system,
    REPORT_ANALYSIS.user({ reportText, reportType }),
    () => mockAnalyze(reportText, reportType),
  );
  const safeNarrative = enforceReportSafety(result.data, reportText);
  const abnormal = parsedFindings.filter((finding) => finding.status === 'Abnormal').length;
  const assessed = parsedFindings.filter((finding) => finding.status !== 'Not assessed').length;
  const unassessed = parsedFindings.length - assessed;
  const combined = {
    ...safeNarrative,
    keyFindings: parsedFindings,
    summary: parsedFindings.length
      ? `${assessed} measurement(s) with printed reference ranges were extracted from the submitted text; ${abnormal} fall outside those ranges.${unassessed ? ` ${unassessed} value(s) have no printed range and were not assessed.` : ''}`
      : 'No measurements with explicit numeric reference ranges could be reliably extracted. No clinical conclusions were generated.',
    insights: parsedFindings.length ? [`Statuses were calculated only against reference ranges printed in the submitted report.`] : [],
    recommendations: abnormal > 0
      ? 'Ask a qualified clinician to interpret the out-of-range values in the context of symptoms, history, and the laboratory’s methodology.'
      : 'Share the original report with a qualified clinician; a value within a printed range does not by itself establish health or exclude disease.',
    urgency: abnormal > 0 ? 'Soon' : 'Routine',
    interpretationBasis: 'submitted_values_and_printed_reference_ranges_only',
    parsedMeasurementCount: parsedFindings.length,
  };
  return {
    ...combined,
    ...buildSourceMeta(combined, {
      limitations: [
        'This is decision support, not a diagnosis, and may be incomplete or incorrect.',
        'Key findings are grounded only in values and reference ranges printed in the submitted text.',
        'It must be reviewed by an appropriate healthcare professional.',
      ],
    }),
  };
}

module.exports = { runReportAnalysis };
