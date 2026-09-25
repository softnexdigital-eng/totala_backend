import express from 'express'
import {
  createAgent,
  getAgents,
  getAgent,
  updateAgent,
  deleteAgent,
  login,
  getMe,
  getPermissionsStructure,
  updatePermissions
} from '../controllers/agentController.js'
import { validate, agentSchemas } from '../middlewares/validation.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Agent Routes
 * POST /api/agents/login - Agent login with email and password
 * GET /api/agents/me - Get current agent profile (requires auth)
 * GET /api/agents/permissions/structure - Get permission structure (requires auth)
 * PUT /api/agents/:id/permissions - Update agent permissions (requires auth)
 * GET /api/agents - Get all agents (requires auth)
 * POST /api/agents - Create a new agent (requires auth)
 * GET /api/agents/:id - Get a single agent (requires auth)
 * PUT /api/agents/:id - Update an agent (requires auth)
 * DELETE /api/agents/:id - Delete an agent (requires auth)
 */

// Public routes
router.post('/login', validate(agentSchemas.login), login)

// Protected routes (JWT authentication required)
router.use(auth)
router.get('/me', getMe)
router.get('/permissions/structure', getPermissionsStructure)
router.put('/:id/permissions', updatePermissions)
router.route('/')
  .get(getAgents)
  .post(validate(agentSchemas.create), createAgent)

router.route('/:id')
  .get(getAgent)
  .put(validate(agentSchemas.update), updateAgent)
  .delete(deleteAgent)

export default router
