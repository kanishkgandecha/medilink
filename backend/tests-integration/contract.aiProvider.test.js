'use strict';

// AI provider-success path with an IN-PROCESS mocked provider (no request
// leaves the machine). Verifies that safety rules override model output,
// patients never see provider/model/fallback metadata, live-record agents
// recompute their answers, audits record the true source, and documents
// exactly which user data a provider request contains. Synthetic data only.

const { createHarness } = require('./support/harness');
const { mockHost, mockedRequests, blockedRequests } = require('./support/noExternalNetwork');
process.env.AI_REQUESTS_PER_MINUTE = '1000';
const test = require('node:test');
const assert = require('node:assert/strict');

const h = createHarness('ai-provider');
const P = {};
let providerPayload = {};
let providerStatus = 200;
const PROVIDER_HOST = new URL(process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions').hostname;

test.before(async () => {
  await h.start();
  // A placeholder key enables the provider branch; the mock below answers it.
  process.env.OPENROUTER_API_KEY = 'integration-mock-key-not-a-real-credential';
  mockHost(PROVIDER_HOST, async () => new Response(
    JSON.stringify({ choices: [{ message: { content: typeof providerPayload === 'string' ? providerPayload : JSON.stringify(providerPayload) } }] }),
    { status: providerStatus, headers: { 'Content-Type': 'application/json' } },
  ));
  P.patient = await h.createPatient('ai-patient');
  P.doctor = await h.createDoctor('ai-doctor', { specialization: 'Cardiology', department: 'Cardiology' });
  P.admin = await h.createUser('ai-admin', 'Admin');
  P.ward = await h.createWard();
});
test.after(async () => {
  process.env.OPENROUTER_API_KEY = '';
  await h.stop();
});

const HIDDEN = ['_source', '_model', '_degraded', '_fallbackReason', 'sourceType', 'sourceLabel', 'sourceExplanation', 'providerUsed', 'modelUsed', 'fallbackUsed'];
const hiddenKeys = (value, found = []) => {
  if (Array.isArray(value)) value.forEach((v) => hiddenKeys(v, found));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { if (HIDDEN.includes(k)) found.push(k); hiddenKeys(v, found); }
  return found;
};

test('symptom analysis: safety overrides a model that misses an emergency and makes disease claims', async () => {
  providerPayload = {
    overallUrgency: 'Low', aiSummary: 'You most likely have heart disease.',
    conditions: [{ name: 'Heart disease', probability: 'High', advice: ['Take aspirin 300 mg'] }],
  };
  const symptoms = 'severe chest pain and shortness of breath';
  const patientView = await h.request('/api/ai/symptom-analysis', { token: P.patient.token, method: 'POST', body: { symptoms } });
  assert.equal(patientView.status, 200);
  assert.equal(patientView.json.data.overallUrgency, 'Critical', 'emergency escalation enforced over the model');
  assert.doesNotMatch(JSON.stringify(patientView.json.data), /heart disease|most likely|probability|aspirin/i, 'no disease claims or medication advice');
  assert.deepEqual(hiddenKeys(patientView.json), [], 'patient sees no provider/model/fallback metadata');

  const clinicianView = await h.request('/api/ai/symptom-analysis', { token: P.doctor.token, method: 'POST', body: { symptoms } });
  assert.equal(clinicianView.json.data._source, 'llm');

  const audit = await h.prisma.aiAuditEvent.findFirst({ where: { requesterId: P.patient.user.id, agent: 'symptom_analysis' }, orderBy: { createdAt: 'desc' } });
  assert.equal(audit.source, 'llm');
  assert.equal(audit.degraded, false);
});

test('provider failure and malformed output degrade safely; patients are not told about the fallback', async () => {
  providerStatus = 500;
  const failed = await h.request('/api/ai/symptom-analysis', { token: P.patient.token, method: 'POST', body: { symptoms: 'mild headache' } });
  assert.equal(failed.status, 200);
  assert.deepEqual(hiddenKeys(failed.json), []);
  const clinician = await h.request('/api/ai/symptom-analysis', { token: P.doctor.token, method: 'POST', body: { symptoms: 'mild headache' } });
  assert.equal(clinician.json.data._degraded, true);
  providerStatus = 200;

  providerPayload = 'this is not JSON';
  const malformed = await h.request('/api/ai/report-analysis', { token: P.doctor.token, method: 'POST', body: { reportText: 'Hemoglobin: 10 g/dL (reference range 12-16 g/dL)' } });
  assert.equal(malformed.status, 200);
  assert.equal(malformed.json.data._degraded, true);
});

test('chat: provider request carries only the intended identity fields; unsafe actions are dropped', async () => {
  providerPayload = { reply: 'You can book from the appointments page.', actions: [{ label: 'Book', route: '/appointments' }, { label: 'Phish', route: 'https://evil.invalid/login' }] };
  const before = mockedRequests.length;
  const res = await h.request('/api/ai/chat', { token: P.patient.token, method: 'POST', body: { message: 'How do I book?' } });
  assert.equal(res.status, 200);
  assert.deepEqual(hiddenKeys(res.json), []);
  assert.doesNotMatch(JSON.stringify(res.json.data), /evil\.invalid/, 'external action routes removed');

  const sent = mockedRequests.slice(before).map((r) => JSON.stringify(r.body)).join('\n');
  assert.match(sent, /How do I book\?/, 'the message itself is sent to the provider');
  assert.equal(sent.includes('Synthetic ai-patient'), false, 'Phase 3: the user display name is no longer sent to the provider');
  assert.match(sent, /User role: Patient/, 'only the role is shared');
  assert.equal(sent.includes(P.patient.user.email), false, 'email is not sent');
  assert.equal(sent.includes(P.patient.user.phone), false, 'phone is not sent');
  assert.equal(sent.includes('integration-test-only'), false, 'no credential material is sent');
});

test('emails and phone numbers typed into free text are redacted before reaching the provider', async () => {
  providerPayload = { overallUrgency: 'Low', guidanceSummary: 'Monitor symptoms.' };
  const before = mockedRequests.length;
  const res = await h.request('/api/ai/symptom-analysis', { token: P.patient.token, method: 'POST', body: { symptoms: 'mild headache, call me on 9876543210 or mail synthetic.person@example.invalid' } });
  assert.equal(res.status, 200);
  const sent = mockedRequests.slice(before).map((r) => JSON.stringify(r.body)).join('\n');
  assert.ok(sent.length > 0, 'provider was called');
  assert.equal(sent.includes('9876543210'), false);
  assert.equal(sent.includes('synthetic.person@example.invalid'), false);
  assert.match(sent, /mild headache/, 'clinical content itself is still sent (documented)');
});

test('live-record agents recompute answers from the database even when the model suggests otherwise', async () => {
  providerPayload = { recommendedWard: 'Imaginary Ward', suggestedBed: 'Z-999', recommendedDoctor: { id: 'imaginary', name: 'Dr Imaginary' } };
  const bed = await h.request('/api/ai/bed-allocation', { token: P.admin.token, method: 'POST', body: { condition: 'routine observation', urgency: 'Routine', age: 30 } });
  assert.equal(bed.status, 200);
  assert.doesNotMatch(JSON.stringify(bed.json.data), /Imaginary Ward|Z-999/);
  assert.equal(bed.json.data.sourceType, 'live-records');

  const optimizer = await h.request('/api/ai/appointment-optimizer', { token: P.patient.token, method: 'POST', body: { symptoms: 'heart palpitations' } });
  assert.equal(optimizer.status, 200);
  assert.doesNotMatch(JSON.stringify(optimizer.json.data), /Dr Imaginary/);
  assert.deepEqual(hiddenKeys(optimizer.json), []);

  providerPayload = { overallUrgency: 'Low', guidanceSummary: 'Monitor symptoms.' };
  const chained = await h.request('/api/ai/symptom-to-appointment', { token: P.doctor.token, method: 'POST', body: { symptoms: 'heart palpitations' } });
  assert.equal(chained.status, 200);
  assert.ok(chained.json.data.symptomAnalysis && chained.json.data.appointmentOptimizer);
});

test('emergency contacts follow the patient profile state, and the location is never sent to the provider', async () => {
  providerPayload = { reply: 'Please seek care.', actions: [] };
  const gujarat = await h.createUser('ai-gujarat', 'Patient', null, { state: 'Gujarat', city: 'Synthetic City Vadnagar' });
  const before = mockedRequests.length;
  const chat = await h.request('/api/ai/chat', { token: gujarat.token, method: 'POST', body: { message: "I don't want to live anymore" } });
  assert.equal(chat.status, 200);
  assert.deepEqual(chat.json.data.actions.map((a) => a.route), ['tel:112', 'tel:108', 'tel:14416']);
  const symptoms = await h.request('/api/ai/symptom-analysis', { token: gujarat.token, method: 'POST', body: { symptoms: 'severe chest pain' } });
  assert.deepEqual(symptoms.json.data.emergencyContacts.map((c) => c.number), ['112', '108']);
  const sent = mockedRequests.slice(before).map((r) => JSON.stringify(r.body)).join('\n');
  assert.equal(/Gujarat|Vadnagar/.test(sent), false, 'location stays on the server');

  // Staff act from the hospital, so they get the hospital location (default: national).
  const staff = await h.request('/api/ai/symptom-analysis', { token: P.doctor.token, method: 'POST', body: { symptoms: 'severe chest pain' } });
  assert.deepEqual(staff.json.data.emergencyContacts.map((c) => c.number), ['112']);
});

test('every provider call in this suite was answered by the in-process mock; nothing left the machine', () => {
  assert.ok(mockedRequests.length >= 6, `mocked provider calls: ${mockedRequests.length}`);
  assert.ok(mockedRequests.every((r) => r.host === PROVIDER_HOST));
  assert.deepEqual(blockedRequests, []);
});
