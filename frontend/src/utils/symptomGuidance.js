const MEDICATION_PATTERN = /\b(aspirin|paracetamol|acetaminophen|ibuprofen|antibiotic|antacid|antihistamine|cetirizine|tablet|dose|dosage|mg\b)/i

const safeItems = (items) => (Array.isArray(items) ? items : [])
  .filter((item) => typeof item === 'string' && item.trim())
  .map((item) => item.trim())
  .filter((item) => !MEDICATION_PATTERN.test(item))

export const normalizeSymptomGuidance = (data = {}, symptoms = []) => {
  const symptomText = Array.isArray(symptoms) ? symptoms.join(' ') : String(symptoms || '')
  const hasChestDiscomfort = /\b(chest pain|chest discomfort|chest tightness)\b/i.test(symptomText)
  const hasChestRedFlag = /\b(severe chest pain|chest pressure|chest squeezing|shortness of breath|breathlessness|cold sweat|sweating|faint(?:ed|ing)?|lightheaded|jaw pain|arm pain|back pain)\b/i.test(symptomText)
  const isolatedChestDiscomfort = hasChestDiscomfort && !hasChestRedFlag
  const normalizedUrgency = isolatedChestDiscomfort ? 'High' : data.overallUrgency
  const critical = normalizedUrgency === 'Critical'
  const highPriorityChestGuidance = isolatedChestDiscomfort || (normalizedUrgency === 'High' && data.department === 'Emergency')
  const legacyPrimary = Array.isArray(data.conditions) ? data.conditions[0] : null
  const legacySelfCare = safeItems(legacyPrimary?.advice)
  const legacyRedFlags = safeItems(legacyPrimary?.redFlags)

  return {
    ...data,
    overallUrgency: normalizedUrgency,
    guidanceSummary: highPriorityChestGuidance
      ? 'Chest discomfort can have different causes and cannot be safely identified here. Arrange a same-day medical assessment; seek emergency care immediately if warning signs appear.'
      : (data.guidanceSummary || (critical
      ? 'Your reported symptoms include a warning sign that needs immediate in-person medical attention. This tool does not determine the cause.'
      : 'These symptoms cannot be diagnosed here. Follow the guidance below and consult a qualified clinician if they persist, worsen, or concern you.')),
    recommendedSpeciality: critical
      ? 'Emergency Medicine'
      : (highPriorityChestGuidance
        ? 'General Physician / Urgent Care'
        : (data.recommendedSpeciality || legacyPrimary?.speciality || 'General Physician')),
    department: critical ? 'Emergency' : (data.department || legacyPrimary?.department || 'General Medicine'),
    selfCare: critical
      ? ['Call emergency services (112 in India) or go to the nearest emergency department now.', 'Do not drive yourself; ask someone to accompany you.']
      : (highPriorityChestGuidance
        ? ['Stop strenuous activity and rest while arranging a same-day medical assessment.', 'If discomfort becomes severe, persistent, or occurs with breathlessness, sweating, fainting, or arm/jaw/back pain, call emergency services (112 in India).']
        : (safeItems(data.selfCare).length
        ? safeItems(data.selfCare)
        : (legacySelfCare.length
          ? legacySelfCare
          : ['Rest and monitor how your symptoms change.', 'Arrange a clinical consultation if symptoms persist or worsen.']))),
    redFlags: critical
      ? ['The reported symptoms include an emergency warning sign.']
      : (safeItems(data.redFlags).length ? safeItems(data.redFlags) : legacyRedFlags),
  }
}
