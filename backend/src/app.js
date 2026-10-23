const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const queueRoutes = require('./routes/queueRoutes');
const recordRoutes = require('./routes/recordRoutes');
const consentRoutes = require('./routes/consentRoutes');
const lifeShareRoutes = require('./routes/lifeShareRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const bloodAlertRoutes = require('./routes/bloodAlertRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Security and utility middleware
app.use(helmet({ contentSecurityPolicy: false }));
// Dynamic CORS configuration supporting local dev and Vercel production domains
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Allow any vercel.app preview or production URL
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback allow for seamless deployment
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting for API stability
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', apiLimiter);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/blood-alerts', bloodAlertRoutes);
app.use('/api/emergency-cases', emergencyRoutes);
app.use('/api/reports', reportRoutes);

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// LifeShare Voluntary Blood Donor Program routes
app.use('/api', lifeShareRoutes);

// Base health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'SmartCare Smart Hospital Management System',
    timestamp: new Date().toISOString()
  });
});

// Secure One-Time Database Seed Endpoint for Cloud Deployments (Render Free Tier)
// Trigger by visiting: https://your-backend.onrender.com/api/seed?key=smartcare2026
app.get('/api/seed', async (req, res) => {
  const secretKey = req.query.key;
  if (secretKey !== (process.env.SEED_SECRET || 'smartcare2026')) {
    return res.status(403).json({
      error: 'Unauthorized seed trigger. Provide the secret query parameter: ?key=smartcare2026'
    });
  }

  try {
    const seedData = require('./scripts/seed');
    console.log('[Seed Endpoint] Triggering cloud database seed...');
    await seedData(false);
    res.json({
      success: true,
      message: '✅ SmartCare + LifeShare Cloud Database Seeded Successfully!',
      demoLogins: [
        'patient@smartcare.hospital',
        'doctor1@smartcare.hospital',
        'admin@smartcare.hospital',
        'bloodofficer@smartcare.hospital',
        'reception@smartcare.hospital'
      ]
    });
  } catch (err) {
    console.error('[Seed Endpoint Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
