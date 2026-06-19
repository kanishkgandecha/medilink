'use strict';
const { callLLM } = require('../llmClient');
const { SYMPTOM_ANALYSIS, DISCLAIMER } = require('../promptTemplates');

const CONDITIONS = [
  { name: 'Viral Fever / Flu', keywords: ['fever', 'chill', 'body ache', 'cold', 'runny nose', 'fatigue', 'weakness', 'sore throat'], urgency: 'Low', speciality: 'General Physician', department: 'General Medicine', advice: ['Rest and stay hydrated (8+ glasses of water)', 'Paracetamol for fever > 38.5°C', 'Monitor temperature every 6 hours', 'Warm saline gargles for throat'], redFlags: ['Fever above 40°C', 'Difficulty breathing', 'Persistent vomiting'] },
  { name: 'Hypertension / High BP', keywords: ['headache', 'dizziness', 'blurred vision', 'neck pain', 'bp', 'blood pressure', 'palpitation'], urgency: 'Moderate', speciality: 'Cardiologist', department: 'Cardiology', advice: ['Measure BP immediately if possible', 'Avoid salt, caffeine, and stress', 'Sit quietly and breathe slowly', 'Do not skip prescribed BP medications'], redFlags: ['Sudden severe headache', 'Chest pain', 'Numbness in face or arm'] },
  { name: 'Cardiac Emergency', keywords: ['chest pain', 'chest tightness', 'chest pressure', 'left arm pain', 'jaw pain', 'shortness of breath', 'sweating', 'palpitation'], urgency: 'Critical', speciality: 'Emergency / Cardiologist', department: 'Emergency', advice: ['CALL 112 IMMEDIATELY', 'Chew one aspirin (300mg) if not allergic', 'Lie down and stay calm', 'Do not drive yourself to the hospital'], redFlags: ['All symptoms indicate possible cardiac event — seek emergency care NOW'] },
  { name: 'Gastritis / Stomach Issues', keywords: ['stomach pain', 'stomach ache', 'nausea', 'vomiting', 'acidity', 'heartburn', 'bloating', 'indigestion', 'loose stool', 'diarrhoea', 'diarrhea'], urgency: 'Low', speciality: 'Gastroenterologist', department: 'Gastroenterology', advice: ['Eat light bland food (rice, khichdi)', 'Avoid spicy, oily, or acidic foods', 'Stay hydrated — ORS if diarrhoea', 'Antacids help with acidity'], redFlags: ['Blood in vomit or stool', 'Severe abdominal pain', 'Signs of dehydration'] },
  { name: 'Respiratory Infection', keywords: ['cough', 'breathlessness', 'breathing difficulty', 'wheezing', 'mucus', 'congestion', 'chest tightness', 'sputum'], urgency: 'Moderate', speciality: 'General Physician', department: 'General Medicine', advice: ['Steam inhalation 2-3 times daily', 'Warm liquids — ginger tea, honey', 'Avoid cold air and dust', 'Use prescribed inhaler if asthmatic'], redFlags: ['Severe breathing difficulty', 'Blue lips or fingertips', 'Fever > 39°C with cough'] },
  { name: 'Migraine / Headache', keywords: ['headache', 'migraine', 'head pain', 'throbbing', 'light sensitivity', 'noise sensitivity', 'nausea with headache'], urgency: 'Low', speciality: 'Neurologist', department: 'Neurology', advice: ['Rest in dark, quiet room', 'Cold compress on forehead', 'Ibuprofen or paracetamol', 'Track triggers (food, stress, sleep)'], redFlags: ['Sudden thunderclap headache', 'Headache with stiff neck and fever', 'Headache after head injury'] },
  { name: 'Urinary Tract Infection', keywords: ['burning urination', 'frequent urination', 'pelvic pain', 'cloudy urine', 'blood in urine', 'lower back pain', 'urgency urination'], urgency: 'Moderate', speciality: 'General Physician', department: 'General Medicine', advice: ['Drink 2-3 litres of water daily', 'Avoid holding urine', 'Cranberry juice may help mild cases', 'Antibiotics typically needed'], redFlags: ['High fever with UTI symptoms', 'Severe back or flank pain', 'Vomiting with UTI'] },
  { name: 'Allergic Reaction', keywords: ['rash', 'itching', 'hives', 'swelling', 'skin rash', 'allergy', 'sneezing', 'watery eyes', 'red eyes'], urgency: 'Low', speciality: 'Dermatologist', department: 'Dermatology', advice: ['Identify and avoid the trigger', 'Antihistamines (cetirizine) for relief', 'Cool compress for skin rash', 'Avoid scratching'], redFlags: ['Throat swelling', 'Facial swelling', 'Difficulty breathing after exposure'] },
  { name: 'Musculoskeletal Pain', keywords: ['joint pain', 'knee pain', 'back pain', 'muscle pain', 'sprain', 'stiffness', 'swollen joint', 'arthritis'], urgency: 'Low', speciality: 'Orthopaedic Surgeon', department: 'Orthopaedics', advice: ['RICE: Rest, Ice, Compression, Elevation', 'Avoid strenuous activity', 'Anti-inflammatory (ibuprofen)', 'Physiotherapy may be needed'], redFlags: ['Severe joint deformity', 'Cannot bear weight on joint', 'Fever with joint pain'] },
  { name: 'Anxiety / Stress', keywords: ['anxiety', 'panic', 'stress', 'racing heart', 'panic attack', 'nervousness', 'trembling', 'insomnia', 'sleep problem'], urgency: 'Low', speciality: 'General Physician', department: 'General Medicine', advice: ['Practice 4-7-8 breathing', 'Reduce caffeine and screen time', 'Regular exercise and sleep', 'Consider speaking with a therapist'], redFlags: ['Thoughts of self-harm', 'Cannot function daily', 'Symptoms lasting > 2 weeks'] },
];

const URGENCY_ORDER = ['Critical', 'High', 'Moderate', 'Low'];

function mockAnalyze(symptoms, age) {
  const tokens = (Array.isArray(symptoms) ? symptoms.join(' ') : symptoms).toLowerCase();

  const scored = CONDITIONS.map(c => {
    const matches = c.keywords.filter(kw => tokens.includes(kw));
    return { ...c, score: matches.length };
  }).filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  if (!scored.length) {
    return {
      conditions: [{ name: 'Unspecified Complaint', probability: 'Low', urgency: 'Low', speciality: 'General Physician', department: 'General Medicine', advice: ['Monitor symptoms', 'See a doctor if symptoms worsen'], redFlags: [] }],
      overallUrgency: 'Low',
      department: 'General Medicine',
      aiSummary: 'No clear condition pattern detected from the provided symptoms. Please consult a General Physician for a thorough evaluation.',
      disclaimer: DISCLAIMER,
    };
  }

  const overallUrgency = URGENCY_ORDER.find(u => scored.some(c => c.urgency === u)) || 'Low';
  const top = scored[0];

  return {
    conditions: scored.map((c, i) => ({
      name: c.name,
      probability: i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low',
      urgency: c.urgency,
      speciality: c.speciality,
      department: c.department,
      advice: c.advice,
      redFlags: c.redFlags,
    })),
    overallUrgency,
    department: top.department,
    aiSummary: `Based on the reported symptoms, the most likely condition is ${top.name} with ${top.urgency.toLowerCase()} urgency. ${scored.length > 1 ? `${scored.length - 1} other condition(s) have also been flagged.` : ''} Recommended specialist: ${top.speciality}.`,
    disclaimer: DISCLAIMER,
  };
}

async function runSymptomAnalysis({ symptoms, age, gender }) {
  const result = await callLLM(
    SYMPTOM_ANALYSIS.system,
    SYMPTOM_ANALYSIS.user({ symptoms, age, gender }),
    () => mockAnalyze(symptoms, age),
  );
  return result.data;
}

module.exports = { runSymptomAnalysis };
