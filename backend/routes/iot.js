const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Get patient readings
router.get('/readings/:patientId', verifyToken, iotController.getPatientReadings);

// Get latest reading
router.get('/readings/:patientId/latest', verifyToken, iotController.getLatestReading);

// Get device status
router.get('/devices/:deviceId/status', verifyToken, iotController.getDeviceStatus);

// Get all devices
router.get('/devices', verifyToken, authorize(['admin', 'doctor', 'staff']), iotController.getAllDevices);

// Get patient alerts
router.get('/alerts/:patientId', verifyToken, iotController.getPatientAlerts);

// Get all active alerts (admin, staff)
router.get('/alerts', verifyToken, authorize(['admin', 'staff', 'doctor']), iotController.getAllAlerts);

// Acknowledge alert
router.patch('/alerts/:alertId/acknowledge', verifyToken, authorize(['doctor', 'staff']), iotController.acknowledgeAlert);

// Manual reading entry (for testing or backup)
router.post('/readings', verifyToken, authorize(['doctor', 'staff']), iotController.createManualReading);

module.exports = router;
