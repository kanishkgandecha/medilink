module.exports = {
    host: process.env.MQTT_HOST || 'localhost',
    port: process.env.MQTT_PORT || 1883,
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    topics: {
      heartRate: 'hospital/devices/+/heartrate',
      bloodPressure: 'hospital/devices/+/bloodpressure',
      temperature: 'hospital/devices/+/temperature',
      oxygen: 'hospital/devices/+/oxygen',
      respiratory: 'hospital/devices/+/respiratory',
      alert: 'hospital/devices/+/alert',
    },
  };
  