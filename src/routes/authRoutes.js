import express from 'express'
import { register, login, verifyOtp, getMe, changePassword, logout } from '../controllers/authController.js'
import { validate, authSchemas } from '../middlewares/validation.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Auth Routes
 * POST /api/auth/register - Register a new admin
 * POST /api/auth/login - Login with email/password, sends OTP to email
 * POST /api/auth/verify-otp - Verify OTP and get JWT token
 * GET /api/auth/me - Get current admin profile (requires auth)
 * PUT /api/auth/change-password - Change admin password (requires auth)
 * POST /api/auth/logout - Logout
 */

// Public routes (no authentication required)
router.post('/register', validate(authSchemas.register), register)
router.post('/login', validate(authSchemas.login), login)
router.post('/verify-otp', validate(authSchemas.verifyOtp), verifyOtp)
router.post('/logout', logout)

// Protected routes (JWT authentication required)
router.use(auth)
router.get('/me', getMe)
router.put('/change-password', changePassword)

export default router
