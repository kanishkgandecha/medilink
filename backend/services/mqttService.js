const logger = require('../utils/logger');

class MQTTService {
  constructor() {
    this.client = null;
    this.connectedDevices = new Map();
  }

  connect() {
    logger.warn('MQTT service is optional and currently disabled');
    logger.warn('To enable IoT features, configure MQTT settings in .env');
    return null;
  }

  publish(topic, message) {
    logger.debug('MQTT publish skipped (service disabled)');
  }

  getDeviceStatus(deviceId) {
    return { status: 'disconnected', message: 'MQTT service disabled' };
  }

  getAllDevices() {
    return [];
  }

  disconnect() {
    logger.debug('MQTT disconnect (service was not running)');
  }
}

const mqttService = new MQTTService();
module.exports = mqttService;
