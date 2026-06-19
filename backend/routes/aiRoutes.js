'use strict';
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { runSymptomAnalysis }     = require('../services/ai/agents/symptomAnalysis');
const { runReportAnalysis }      = require('../services/ai/agents/reportAnalysis');
const { runHealthRisk }          = require('../services/ai/agents/healthRisk');
const { runPatientAssistant }    = require('../services/ai/agents/patientAssistant');
const { runBedAllocation }       = require('../services/ai/agents/bedAllocation');
const { runAppointmentOptimizer } = require('../services/ai/agents/appointmentOptimizer');
const { runPatientSummary }      = require('../services/ai/agents/patientSummary');
const { runAdminInsights }       = require('../services/ai/agents/adminInsights');
const { runPharmacyAlerts }      = require('../services/ai/agents/pharmacyAlerts');

// All AI routes require authentication
router.use(protect);

// ── Patient Assistant (chatbot) ─────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'message is required' });
    const data = await runPatientAssistant({ message, history, userData: req.user });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[AI /chat]', err.message);
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Symptom Analysis ────────────────────────────────────────────────────────
router.post('/symptom-analysis', async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;
    if (!symptoms) return res.status(400).json({ success: false, message: 'symptoms is required' });
    const data = await runSymptomAnalysis({ symptoms, age, gender });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[AI /symptom-analysis]', err.message);
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Report Analysis ─────────────────────────────────────────────────────────
router.post('/report-analysis', async (req, res) => {
  try {
    const { reportText, reportType } = req.body;
    if (!reportText?.trim()) return res.status(400).json({ success: false, message: 'reportText is required' });
    const data = await runReportAnalysis({ reportText, reportType });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[AI /report-analysis]', err.message);
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Health Risk ─────────────────────────────────────────────────────────────
router.post('/health-risk', async (req, res) => {
  try {
    const { age, gender, chronicConditions, acuteSymptoms } = req.body;
    if (!age) return res.status(400).json({ success: false, message: 'age is required' });
    const data = await runHealthRisk({ age, gender, chronicConditions, acuteSymptoms });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[AI /health-risk]', err.message);
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Bed Allocation ──────────────────────────────────────────────────────────
router.post('/bed-allocation', async (req, res) => {
  try {
    const { condition, urgency, age, gender } = req.body;
    if (!condition) return res.status(400).json({ success: false, message: 'condition is required' });
    const data = await runBedAllocation({ condition, urgency, age, gender });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[AI /bed-allocation]', err.message);
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Appointment Optimizer ───────────────────────────────────────────────────
router.post('/appointment-optimizer', async (req, res) => {
  try {
    const { symptoms, department } = req.body;
    if (!symptoms) return res.status(400).json({ success: false, message: 'symptoms is required' });
    const data = await runAppointmentOptimizer({ symptoms, department });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[AI /appointment-optimizer]', err.message);
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

// ── Patient Summary — accessible to Patient (own), Doctor, Admin, Nurse ─────
router.get('/patient-summary/:patientId', async (req, res) => {
  try {
    const role = req.user?.role?.toLowerCase();
    const subRole = req.user?.subRole?.toLowerCase() || '';
    const allowedRoles = ['admin', 'administrator', 'doctor', 'nurse', 'receptionist', 'patient'];
    if (!allowedRoles.includes(role) && !allowedRoles.includes(subRole)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const data = await runPatientSummary({ patientId: req.params.patientId });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[AI /patient-summary]', err.message);
    res.status(500).json({ success: false, message: err.message || 'AI service error' });
  }
});

// ── Orchestrated flow: Symptom → Appointment Optimizer in one call ──────────
router.post('/symptom-to-appointment', async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;
    if (!symptoms) return res.status(400).json({ success: false, message: 'symptoms is required' });

    // Chain: analyze symptoms → use detected department for appointment optimizer
    const symptomResult = await runSymptomAnalysis({ symptoms, age, gender });
    const detectedDept  = symptomResult?.conditions?.[0]?.department || null;
    const aptResult     = await runAppointmentOptimizer({ symptoms, department: detectedDept });

    res.json({
      success: true,
      data: {
        symptomAnalysis: symptomResult,
        appointmentOptimizer: aptResult,
        detectedDepartment: detectedDept,
      }
    });
  } catch (err) {
    console.error('[AI /symptom-to-appointment]', err.message);
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
    const data = await runAdminInsights();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[AI /admin-insights]', err.message);
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
    const data = await runPharmacyAlerts();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[AI /pharmacy-alerts]', err.message);
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

module.exports = router;
