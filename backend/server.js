const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

console.log('🔄 Loading environment variables...');
require('dotenv').config();

console.log('✅ Environment loaded');
console.log('📍 MongoDB URI:', process.env.MONGO_URI);
console.log('📍 Port:', process.env.PORT);

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔄 Importing modules...');

let connectDB, logger;

try {
  connectDB = require('./config/db');
  console.log('✅ Database config loaded');
} catch (error) {
  console.error('❌ Error loading database config:', error.message);
  process.exit(1);
}

try {
  logger = require('./utils/logger');
  console.log('✅ Logger loaded');
} catch (error) {
  console.error('❌ Error loading logger:', error.message);
  console.log('Creating basic logger...');
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    stream: { write: (msg) => console.log(msg.trim()) }
  };
}

// Security middleware
console.log('🔄 Setting up middleware...');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

console.log('✅ Middleware configured');

// Import routes
console.log('🔄 Loading routes...');

let authRoutes, userRoutes, doctorRoutes, patientRoutes, appointmentRoutes, 
    inventoryRoutes, wardRoutes, prescriptionRoutes, iotRoutes;

try {
  authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

try {
  userRoutes = require('./routes/user');
  console.log('✅ User routes loaded');
} catch (error) {
  console.error('❌ Error loading user routes:', error.message);
}

try {
  doctorRoutes = require('./routes/doctor');
  console.log('✅ Doctor routes loaded');
} catch (error) {
  console.error('❌ Error loading doctor routes:', error.message);
}

try {
  patientRoutes = require('./routes/patient');
  console.log('✅ Patient routes loaded');
} catch (error) {
  console.error('❌ Error loading patient routes:', error.message);
}

try {
  appointmentRoutes = require('./routes/appointment');
  console.log('✅ Appointment routes loaded');
} catch (error) {
  console.error('❌ Error loading appointment routes:', error.message);
}

try {
  inventoryRoutes = require('./routes/inventory');
  console.log('✅ Inventory routes loaded');
} catch (error) {
  console.error('❌ Error loading inventory routes:', error.message);
}

try {
  wardRoutes = require('./routes/ward');
  console.log('✅ Ward routes loaded');
} catch (error) {
  console.error('❌ Error loading ward routes:', error.message);
}

try {
  prescriptionRoutes = require('./routes/prescription');
  console.log('✅ Prescription routes loaded');
} catch (error) {
  console.error('❌ Error loading prescription routes:', error.message);
}

try {
  iotRoutes = require('./routes/iot');
  console.log('✅ IoT routes loaded');
} catch (error) {
  console.error('❌ Error loading IoT routes:', error.message);
}

// API routes
if (authRoutes) app.use('/api/auth', authRoutes);
if (userRoutes) app.use('/api/users', userRoutes);
if (doctorRoutes) app.use('/api/doctors', doctorRoutes);
if (patientRoutes) app.use('/api/patients', patientRoutes);
if (appointmentRoutes) app.use('/api/appointments', appointmentRoutes);
if (inventoryRoutes) app.use('/api/inventory', inventoryRoutes);
if (wardRoutes) app.use('/api/wards', wardRoutes);
if (prescriptionRoutes) app.use('/api/prescriptions', prescriptionRoutes);
if (iotRoutes) app.use('/api/iot', iotRoutes);

console.log('✅ Routes registered');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Hospital Management System API',
    version: '1.0.0',
    status: 'Running',
  });
});

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

// Connect to database and start server
const startServer = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected');
    
    // Start MQTT service (optional)
    try {
      const mqttService = require('./services/mqttService');
      mqttService.connect();
      console.log('✅ MQTT service initialized');
    } catch (error) {
      console.warn('⚠️  MQTT service not available - IoT features disabled');
    }
    
    // Start server
    console.log('🔄 Starting HTTP server...');
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🚀 SERVER STARTED SUCCESSFULLY!');
      console.log('='.repeat(50));
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📍 Backend: http://localhost:${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log('='.repeat(50) + '\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥');
      console.error(err);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

console.log('🔄 Calling startServer()...');
startServer();

module.exports = app;
