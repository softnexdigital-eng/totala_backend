import express from 'express'
import { getDashboardStats } from '../controllers/dashboardController.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Dashboard route - protected, works for both admin and agent tokens
 * GET /api/dashboard - Returns role-appropriate dashboard statistics
 */
router.use(auth)
router.get('/', getDashboardStats)

export default router