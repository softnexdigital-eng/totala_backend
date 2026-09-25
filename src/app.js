import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import errorHandler from './middlewares/errorHandler.js'

// Import routes
import authRoutes from './routes/authRoutes.js'
import patientRoutes from './routes/patientRoutes.js'
import doctorRoutes from './routes/doctorRoutes.js'
import appointmentRoutes from './routes/appointmentRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'
import agentRoutes from './routes/agentRoutes.js'
import publicAgentRoutes from './routes/publicAgentRoutes.js'
import taskRoutes from './routes/taskRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import testRoutes from './routes/testRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import packageRoutes from './routes/packageRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import dashboardRoutes from './routes/dashboardRoute.js'
import transportRoutes from './routes/transportRoutes.js'

// Import utilities
import { startAutoVerificationScheduler } from './utils/autoVerification.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Middlewares
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/doctors', doctorRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/public-agents', publicAgentRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/tests', testRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/packages', packageRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/transport', transportRoutes)

// API info at root
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Help Center API is running',
    data: {
      status: 'OK',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        patients: '/api/patients',
        doctors: '/api/doctors',
        appointments: '/api/appointments',
        bookings: '/api/bookings',
        agents: '/api/agents',
        tasks: '/api/tasks',
        payments: '/api/payments',
        packages: '/api/packages',
        reports: '/api/reports',
        dashboard: '/api/dashboard',
        transport: '/api/transport'
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    },
    error: null
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Help Center API is running',
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    },
    error: null
  })
})

// 404 handler - must come after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'রাউট পাওয়া যায়নি',
    data: null,
    error: `Cannot ${req.method} ${req.originalUrl}`
  })
})

// Global error handler - must be last
app.use(errorHandler)

export default app
