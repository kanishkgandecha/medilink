const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const connectDB = require('./config/db.js');
const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const doctorRoutes = require('./routes/doctor');
const patientRoutes = require('./routes/patient');
const appointmentRoutes = require('./routes/appointment');
const inventoryRoutes = require('./routes/inventory');
const wardRoutes = require('./routes/ward');
const prescriptionRoutes = require('./routes/prescription');
const iotRoutes = require('./routes/iot');

require('dotenv').config();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

console.log('MongoDB URI:', process.env.MONGO_URI);
console.log('Port:', process.env.PORT);

const PORT = process.env.PORT || 5000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(mongoSanitize());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
async function db() {
  await connectDB().then(() => {
    console.log("db is connected.");
  })
    .catch((err) => {
      console.log(err);
    })
}
db();

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 SERVER STARTED SUCCESSFULLY!');
  console.log('='.repeat(50));
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Backend: http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log('='.repeat(50) + '\n');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

app.get('/', (req, res) => {
  res.json({
    message: '🏥 Hospital Management System API',
    version: '1.0.0',
    status: 'Running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/iot', iotRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

