import express from 'express'
import { getDashboardStats, getDashboardSummary } from '../controllers/dashboardController.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Dashboard routes - protected, work for both admin and agent tokens
 * GET /api/dashboard          - role-appropriate dashboard statistics
 * GET /api/dashboard/summary  - today's counters + money summary (dashboard cards)
 */
router.use(auth)
router.get('/summary', getDashboardSummary)
router.get('/', getDashboardStats)

export default router