const IoTReading = require('../models/IoTReading');
const Patient = require('../models/Patient');
const mqttService = require('../services/mqttService');

// Get patient readings
exports.getPatientReadings = async (req, res) => {
  try {
    const { type, timeRange } = req.query;
    const { patientId } = req.params;

    let query = { patientId };

    if (type) query.readingType = type;

    if (timeRange) {
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      query.timestamp = { $gte: startDate };
    }

    const readings = await IoTReading.find(query).sort({ timestamp: -1 });

    res.json({
      success: true,
      count: readings.length,
       readings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching readings',
      error: error.message,
    });
  }
};

// Get latest reading
exports.getLatestReading = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { type } = req.query;

    const reading = await IoTReading.findOne({
      patientId,
      ...(type && { readingType: type }),
    }).sort({ timestamp: -1 });

    if (!reading) {
      return res.status(404).json({
        success: false,
        message: 'No readings found',
      });
    }

    res.json({
      success: true,
       reading,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching latest reading',
      error: error.message,
    });
  }
};

// Get device status
exports.getDeviceStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const status = mqttService.getDeviceStatus(deviceId);

    res.json({
      success: true,
       status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching device status',
      error: error.message,
    });
  }
};

// Get all devices
exports.getAllDevices = async (req, res) => {
  try {
    const devices = mqttService.getAllDevices();

    res.json({
      success: true,
      count: devices.length,
       devices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching devices',
      error: error.message,
    });
  }
};

// Get patient alerts
exports.getPatientAlerts = async (req, res) => {
  try {
    const { patientId } = req.params;

    const alerts = await IoTReading.find({
      patientId,
      isAbnormal: true,
    })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message,
    });
  }
};

// Get all active alerts
exports.getAllAlerts = async (req, res) => {
  try {
    const alerts = await IoTReading.find({
      isAbnormal: true,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .populate('patientId', 'userId dateOfBirth gender assignedWard')
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      count: alerts.length,
       alerts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message,
    });
  }
};

// Acknowledge alert
exports.acknowledgeAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const reading = await IoTReading.findByIdAndUpdate(
      alertId,
      {
        alertSent: true,
        notes: req.body.notes || 'Alert acknowledged',
      },
      { new: true }
    );

    if (!reading) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert acknowledged',
       reading,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error acknowledging alert',
      error: error.message,
    });
  }
};

// Create manual reading
exports.createManualReading = async (req, res) => {
  try {
    const { patientId, deviceId, readingType, value, unit, normalRange } = req.body;

    const reading = await IoTReading.create({
      patientId,
      deviceId,
      readingType,
      value,
      unit,
      normalRange,
      notes: 'Manual entry',
    });

    res.status(201).json({
      success: true,
      message: 'Reading created successfully',
       reading,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating reading',
      error: error.message,
    });
  }
};

module.exports = exports;
