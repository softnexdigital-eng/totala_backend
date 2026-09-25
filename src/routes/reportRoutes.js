import express from 'express'
import { getDailyReport, getMonthlyReport } from '../controllers/reportController.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Report Routes (Protected)
 * GET /api/reports/daily?date=YYYY-MM-DD
 * GET /api/reports/monthly?month=YYYY-MM
 */

router.use(auth)

router.get('/daily', getDailyReport)
router.get('/monthly', getMonthlyReport)

export default router
