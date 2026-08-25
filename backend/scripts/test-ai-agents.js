'use strict';
require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (_e) {}

const prisma = require('../config/prisma');
const { runSymptomAnalysis } = require('../services/ai/agents/symptomAnalysis');
const { runReportAnalysis } = require('../services/ai/agents/reportAnalysis');
const { runHealthRisk } = require('../services/ai/agents/healthRisk');
const { runPatientAssistant } = require('../services/ai/agents/patientAssistant');
const { runBedAllocation } = require('../services/ai/agents/bedAllocation');
const { runAppointmentOptimizer } = require('../services/ai/agents/appointmentOptimizer');
const { runPatientSummary } = require('../services/ai/agents/patientSummary');
const { runAdminInsights } = require('../services/ai/agents/adminInsights');
const { runPharmacyAlerts } = require('../services/ai/agents/pharmacyAlerts');

async function testAllAgents() {
  console.log('===========================================================');
  console.log('🧪 MEDILINK AI ENGINE & AGENTS SUITE VALIDATION');
  console.log('===========================================================');

  const testResults = [];

  // Helper for running and recording agent test
  async function testAgent(name, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      const isSuccess = Boolean(result);
      const source = result?._source || 'mock';
      testResults.push({ name, status: 'PASS', duration: `${duration}ms`, source });
      console.log(`  ✅ [${name}] PASS (${duration}ms, source: ${source})`);
    } catch (err) {
      const duration = Date.now() - start;
      testResults.push({ name, status: 'FAIL', duration: `${duration}ms`, error: err.message });
      console.error(`  ❌ [${name}] FAIL (${duration}ms):`, err.message);
    }
  }

  // Fetch a sample patient from PostgreSQL for testing patientSummary
  const samplePatient = await prisma.patient.findFirst({
    include: { user: true },
  });

  if (!samplePatient) {
    console.error('❌ No patient found in PostgreSQL. Please run `npm run seed` first.');
    process.exit(1);
  }

  console.log(`\n📌 Sample Patient for Testing: ${samplePatient.user?.name} (ID: ${samplePatient.id})`);
  console.log('-----------------------------------------------------------');

  // 1. Symptom Analysis
  await testAgent('Symptom Analysis', () =>
    runSymptomAnalysis({ symptoms: 'high fever, body ache, chills', age: 35, gender: 'Male' })
  );

  // 2. Report Analysis
  await testAgent('Report Analysis', () =>
    runReportAnalysis({
      reportText: 'Haemoglobin: 13.4 g/dL (Normal 12-17), Fasting Blood Sugar: 102 mg/dL (High), HbA1c: 5.8%',
      reportType: 'Complete Blood Count (CBC)',
    })
  );

  // 3. Health Risk
  await testAgent('Health Risk', () =>
    runHealthRisk({ age: 52, gender: 'Female', chronicConditions: ['Hypertension'], acuteSymptoms: ['Headache'] })
  );

  // 4. Patient Assistant Chatbot
  await testAgent('Patient Assistant', () =>
    runPatientAssistant({ message: 'How do I book an appointment with a cardiologist?', userData: samplePatient.user })
  );

  // 5. Bed Allocation
  await testAgent('Bed Allocation', () =>
    runBedAllocation({ condition: 'Acute Myocardial Infarction', urgency: 'Critical', age: 60, gender: 'Male' })
  );

  // 6. Appointment Optimizer
  await testAgent('Appointment Optimizer', () =>
    runAppointmentOptimizer({ symptoms: 'chest tightness and shortness of breath', department: 'Cardiology' })
  );

  // 7. Patient Summary
  await testAgent('Patient Summary', () =>
    runPatientSummary({ patientId: samplePatient.id })
  );

  // 8. Admin Insights
  await testAgent('Admin Insights', () =>
    runAdminInsights()
  );

  // 9. Pharmacy Alerts
  await testAgent('Pharmacy Alerts', () =>
    runPharmacyAlerts()
  );

  console.log('\n===========================================================');
  console.log('📊 AI SUITE TEST SUMMARY REPORT');
  console.log('===========================================================');
  const passed = testResults.filter((r) => r.status === 'PASS').length;
  console.log(`Total Agents Tested : ${testResults.length}`);
  console.log(`Passed              : ${passed}`);
  console.log(`Failed              : ${testResults.length - passed}`);
  console.log(`Pass Rate           : ${((passed / testResults.length) * 100).toFixed(1)}%`);
  console.log('===========================================================\n');

  await prisma.$disconnect();
}

testAllAgents().catch((err) => {
  console.error('❌ Suite execution crashed:', err);
  process.exit(1);
});
