import express from 'express'
import { getPublicAgents } from '../controllers/publicController.js'

const router = express.Router()

/**
 * Public Agent Routes (no authentication required)
 * GET /api/public-agents - Get the active agents shown on the landing page
 */

router.get('/', getPublicAgents)

export default router
