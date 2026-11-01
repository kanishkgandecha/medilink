const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { dateRangeQuery, wardUsageQuery, revenueQuery } = require('../middleware/queryValidation');
const {
  getPatientVisitsReport,
  getDoctorPerformanceReport,
  getWardUsageReport,
  getRevenueReport,
  getDashboardStats
} = require('../controllers/reportController');

router.use(protect);
router.use(authorize('Admin'));

router.get('/patient-visits', dateRangeQuery, getPatientVisitsReport);
router.get('/doctor-performance', dateRangeQuery, getDoctorPerformanceReport);
router.get('/ward-usage', wardUsageQuery, getWardUsageReport);
router.get('/revenue', revenueQuery, getRevenueReport);
router.get('/dashboard', getDashboardStats);

module.exports = router;

