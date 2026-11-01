'use strict';
const express = require('express');
const router = express.Router();
const { auditRoute, fromParam, patientFromResource, idOf } = require('../utils/audit');
const { protect, authorize } = require('../middleware/auth');
const { requirePatientAccess } = require('../middleware/patientAccess');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { runSymptomAnalysis }     = require('../services/ai/agents/symptomAnalysis');
const { runReportAnalysis }      = require('../services/ai/agents/reportAnalysis');
const { runHealthRisk }          = require('../services/ai/agents/healthRisk');
const { runPatientAssistant }    = require('../services/ai/agents/patientAssistant');
const { runBedAllocation }       = require('../services/ai/agents/bedAllocation');
const { runAppointmentOptimizer } = require('../services/ai/agents/appointmentOptimizer');
const { runPatientSummary }      = require('../services/ai/agents/patientSummary');
const { runAdminInsights }       = require('../services/ai/agents/adminInsights');
const { runPharmacyAlerts }      = require('../services/ai/agents/pharmacyAlerts');
const { runAuditedAi, getAiAuditSummary } = require('../services/ai/audit');
const { aiRateLimiter, aiConcurrencyLimit } = require('../middleware/aiUsageLimits');
const { reliabilityQuery } = require('../middleware/queryValidation');
const logger = require('../utils/logger');
const { logSafeError } = require('../utils/redact');
const { patientSafeAiResponses } = require('../utils/aiPatientView');
const { resolveLocale } = require('../services/ai/locale');
const prisma = require('../config/prisma');

const audited = (req, agent, operation) => runAuditedAi({ agent, requesterId: req.user.id, operation });

// Patients get contacts for the state on their profile; staff act from the
// hospital, so they get the hospital's location. The location stays on the
// server and is never sent to the AI provider. A lookup failure falls back to
// the hospital default rather than blocking care.
const localeFor = async (req) => {
  if (req.user.role !== 'Patient') return resolveLocale();
  try {
    const place = await prisma.user.findUnique({ where: { id: req.user.id }, select: { state: true, country: true } });
    return resolveLocale(place || {});
  } catch (err) {
    logSafeError(logger, 'ai_locale_lookup_failed', err, { requestId: req.id });
    return resolveLocale();
  }
};

// All AI routes require authentication
router.use(protect);
router.use(aiRateLimiter);
router.use(aiConcurrencyLimit);
// Patients never receive provider/model/fallback metadata (audit is unaffected).
router.use(patientSafeAiResponses);

router.get('/reliability', authorize('Admin'), reliabilityQuery, async (req, res) => {
  try {
    const data = await getAiAuditSummary(req.query.hours);
    res.json({ success: true, data });
  } catch (error) {
    logSafeError(logger, 'ai_reliability_failed', error, { requestId: req.id });
    res.status(503).json({ success: false, message: 'AI reliability data is unavailable until audit storage is ready' });
  }
});

// ── Patient Assistant (chatbot) ─────────────────────────────────────────────
router.post('/chat', authorize('Admin', 'Doctor', 'Patient', 'Nurse', 'Receptionist', 'Pharmacist', 'Lab Technician', 'Radiology Technician', 'Billing Staff', 'Ward Manager'), [
  body('message').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('message must be between 1 and 2000 characters'),
  body('history').optional().isArray({ max: 10 }).withMessage('history may contain at most 10 entries'),
  body('history.*.role').optional().isIn(['user', 'assistant']).withMessage('history role is invalid'),
  body('history.*.content').optional().isString().isLength({ max: 2000 }).withMessage('history content is too long'),
  validate,
], async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'message is required' });
    const locale = await localeFor(req);
    const data = await audited(req, 'patient_assistant', () => runPatientAssistant({
      message, history, userData: { role: req.user.role }, locale,
    }));
    res.json({ success: true, data });
  } catch (err) {
    logSafeError(logger, 'ai_request_failed', err, { requestId: req.id, agentRoute: '/chat' });
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Symptom Analysis ────────────────────────────────────────────────────────
router.post('/symptom-analysis', authorize('Admin', 'Doctor', 'Patient', 'Nurse', 'Receptionist'), [
  body('symptoms').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('symptoms must be between 1 and 2000 characters'),
  body('age').optional().isInt({ min: 0, max: 120 }).withMessage('age must be between 0 and 120'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('gender is invalid'),
  validate,
], async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;
    if (!symptoms) return res.status(400).json({ success: false, message: 'symptoms is required' });
    const locale = await localeFor(req);
    const data = await audited(req, 'symptom_analysis', () => runSymptomAnalysis({ symptoms, age, gender, locale }));
    res.json({ success: true, data });
  } catch (err) {
    logSafeError(logger, 'ai_request_failed', err, { requestId: req.id, agentRoute: '/symptom-analysis' });
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Report Analysis ─────────────────────────────────────────────────────────
router.post('/report-analysis', authorize('Admin', 'Doctor', 'Patient', 'Lab Technician', 'Radiology Technician'), [
  body('reportText').isString().trim().isLength({ min: 1, max: 12000 }).withMessage('reportText must be between 1 and 12000 characters'),
  body('reportType').optional().isString().isLength({ max: 100 }).withMessage('reportType is too long'),
  validate,
], async (req, res) => {
  try {
    const { reportText, reportType } = req.body;
    if (!reportText?.trim()) return res.status(400).json({ success: false, message: 'reportText is required' });
    const data = await audited(req, 'report_analysis', () => runReportAnalysis({ reportText, reportType }));
    res.json({ success: true, data });
  } catch (err) {
    logSafeError(logger, 'ai_request_failed', err, { requestId: req.id, agentRoute: '/report-analysis' });
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Health Risk ─────────────────────────────────────────────────────────────
router.post('/health-risk', authorize('Admin', 'Doctor', 'Patient'), [
  body('age').isInt({ min: 0, max: 120 }).withMessage('age must be between 0 and 120'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('gender is invalid'),
  body('chronicConditions').optional().isArray({ max: 20 }).withMessage('chronicConditions may contain at most 20 entries'),
  body('acuteSymptoms').optional().isArray({ max: 20 }).withMessage('acuteSymptoms may contain at most 20 entries'),
  body('chronicConditions.*').optional().isString().isLength({ max: 200 }).withMessage('condition is too long'),
  body('acuteSymptoms.*').optional().isString().isLength({ max: 200 }).withMessage('symptom is too long'),
  validate,
], async (req, res) => {
  try {
    const { age, gender, chronicConditions, acuteSymptoms } = req.body;
    if (!age) return res.status(400).json({ success: false, message: 'age is required' });
    const locale = await localeFor(req);
    const data = await audited(req, 'health_risk', () => runHealthRisk({ age, gender, chronicConditions, acuteSymptoms, locale }));
    res.json({ success: true, data });
  } catch (err) {
    logSafeError(logger, 'ai_request_failed', err, { requestId: req.id, agentRoute: '/health-risk' });
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Bed Allocation ──────────────────────────────────────────────────────────
router.post('/bed-allocation', authorize('Admin', 'Doctor', 'Nurse', 'Ward Manager'), [
  body('condition').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('condition must be between 1 and 1000 characters'),
  body('urgency').optional().isIn(['Routine', 'Standard', 'High', 'Critical', 'Emergency']).withMessage('urgency is invalid'),
  body('age').optional().isInt({ min: 0, max: 120 }).withMessage('age must be between 0 and 120'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('gender is invalid'),
  validate,
], async (req, res) => {
  try {
    const { condition, urgency, age, gender } = req.body;
    if (!condition) return res.status(400).json({ success: false, message: 'condition is required' });
    const data = await audited(req, 'bed_allocation', () => runBedAllocation({ condition, urgency, age, gender }));
    res.json({ success: true, data });
  } catch (err) {
    logSafeError(logger, 'ai_request_failed', err, { requestId: req.id, agentRoute: '/bed-allocation' });
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Appointment Optimizer ───────────────────────────────────────────────────
router.post('/appointment-optimizer', authorize('Admin', 'Doctor', 'Patient', 'Receptionist'), [
  body('symptoms').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('symptoms must be between 1 and 2000 characters'),
  body('department').optional().isString().isLength({ max: 100 }).withMessage('department is too long'),
  validate,
], async (req, res) => {
  try {
    const { symptoms, department } = req.body;
    if (!symptoms) return res.status(400).json({ success: false, message: 'symptoms is required' });
    const data = await audited(req, 'appointment_optimizer', () => runAppointmentOptimizer({ symptoms, department }));
    res.json({ success: true, data });
  } catch (err) {
    logSafeError(logger, 'ai_request_failed', err, { requestId: req.id, agentRoute: '/appointment-optimizer' });
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Patient Summary — accessible to Patient (own), Doctor, Admin, Nurse ─────
router.get('/patient-summary/:patientId', auditRoute('AI_PATIENT_SUMMARY_VIEWED', { resourceType: 'Patient', resourceId: patientFromResource, patientId: patientFromResource }), requirePatientAccess('Admin', 'Doctor', 'Nurse'), async (req, res) => {
  try {
    const data = await audited(req, 'patient_summary', () => runPatientSummary({ patientId: req.patientResource.id }));
    res.json({ success: true, data });
  } catch (err) {
    logSafeError(logger, 'ai_request_failed', err, { requestId: req.id, agentRoute: '/patient-summary' });
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Orchestrated flow: Symptom → Appointment Optimizer in one call ──────────
router.post('/symptom-to-appointment', authorize('Admin', 'Doctor', 'Patient', 'Receptionist'), [
  body('symptoms').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('symptoms must be between 1 and 2000 characters'),
  body('age').optional().isInt({ min: 0, max: 120 }).withMessage('age must be between 0 and 120'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('gender is invalid'),
  validate,
], async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;
    if (!symptoms) return res.status(400).json({ success: false, message: 'symptoms is required' });

    // Chain: analyze symptoms → use detected department for appointment optimizer
    const locale = await localeFor(req);
    const chained = await audited(req, 'symptom_to_appointment', async () => {
      const symptomResult = await runSymptomAnalysis({ symptoms, age, gender, locale });
      const detectedDept = symptomResult?.department || null;
      const appointmentOptimizer = await runAppointmentOptimizer({ symptoms, department: detectedDept });
      return { symptomAnalysis: symptomResult, appointmentOptimizer, detectedDepartment: detectedDept,
        _source: symptomResult._source === 'llm' && appointmentOptimizer._source === 'llm' ? 'llm' : 'rules',
        _degraded: Boolean(symptomResult._degraded || appointmentOptimizer._degraded) };
    });

    res.json({
      success: true,
      data: chained,
    });
  } catch (err) {
    logSafeError(logger, 'ai_request_failed', err, { requestId: req.id, agentRoute: '/symptom-to-appointment' });
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Admin Insights — aggregated operational intelligence ────────────────────
router.get('/admin-insights', async (req, res) => {
  try {
    const role = req.user?.role?.toLowerCase();
    const subRole = req.user?.subRole?.toLowerCase() || '';
    const allowed = ['admin', 'administrator'];
    if (!allowed.includes(role) && !allowed.includes(subRole)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const data = await audited(req, 'admin_insights', () => runAdminInsights());
    res.json({ success: true, data });
  } catch (err) {
    logSafeError(logger, 'ai_request_failed', err, { requestId: req.id, agentRoute: '/admin-insights' });
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Pharmacy Alerts — stock and expiry intelligence ─────────────────────────
router.get('/pharmacy-alerts', async (req, res) => {
  try {
    const role = req.user?.role?.toLowerCase();
    const subRole = req.user?.subRole?.toLowerCase() || '';
    const allowed = ['admin', 'administrator', 'pharmacist'];
    if (!allowed.includes(role) && !allowed.includes(subRole)) {
      return res.status(403).json({ success: false, message: 'Pharmacist or Admin access required' });
    }
    const data = await audited(req, 'pharmacy_alerts', () => runPharmacyAlerts());
    res.json({ success: true, data });
  } catch (err) {
    logSafeError(logger, 'ai_request_failed', err, { requestId: req.id, agentRoute: '/pharmacy-alerts' });
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

module.exports = router;
