'use strict';
const { callLLM } = require('../llmClient');
const { REPORT_ANALYSIS, DISCLAIMER } = require('../promptTemplates');

const REPORT_TYPES = [
  { keys: ['haemoglobin', 'hemoglobin', 'hb', 'wbc', 'rbc', 'platelet', 'hba1c', 'blood count', 'cbc'], type: 'Complete Blood Count (CBC)' },
  { keys: ['cholesterol', 'ldl', 'hdl', 'triglyceride', 'lipid', 'vldl'], type: 'Lipid Profile' },
  { keys: ['tsh', 'thyroid', 't3', 't4', 'triiodothyronine', 'thyroxine'], type: 'Thyroid Function Test (TFT)' },
  { keys: ['creatinine', 'urea', 'bun', 'egfr', 'kidney', 'renal'], type: 'Kidney Function Test (KFT)' },
  { keys: ['sgpt', 'sgot', 'alt', 'ast', 'bilirubin', 'liver', 'hepatic', 'albumin'], type: 'Liver Function Test (LFT)' },
  { keys: ['glucose', 'sugar', 'diabetes', 'insulin', 'fasting blood', 'postprandial'], type: 'Blood Sugar / Diabetes Panel' },
  { keys: ['urine', 'urea', 'protein', 'ketone', 'urinalysis', 'uric acid'], type: 'Urine Analysis' },
  { keys: ['x-ray', 'xray', 'chest x', 'fracture', 'opacity', 'radiology'], type: 'X-Ray Report' },
  { keys: ['mri', 'magnetic resonance', 'brain', 'spine', 'lesion'], type: 'MRI Report' },
  { keys: ['ct', 'computed tomography', 'scan', 'pulmonary', 'abdomen'], type: 'CT Scan Report' },
  { keys: ['ecg', 'electrocardiogram', 'cardiac', 'rhythm', 'sinus', 'qrs', 'arrhythmia'], type: 'ECG Report' },
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
  for (const rt of REPORT_TYPES) {
    if (rt.keys.some(k => lower.includes(k))) return rt.type;
  }
  return 'General Medical Report';
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
  const result = await callLLM(
    REPORT_ANALYSIS.system,
    REPORT_ANALYSIS.user({ reportText, reportType }),
    () => mockAnalyze(reportText, reportType),
  );
  return result.data;
}

module.exports = { runReportAnalysis };
