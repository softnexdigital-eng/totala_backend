import express from 'express'
import {
  createTest,
  getTests,
  getTest,
  updateTest,
  deleteTest,
  getTestsByAppointment
} from '../controllers/testController.js'
import { validate, testSchemas } from '../middlewares/validation.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Test Routes (Protected)
 * GET /api/tests - Get all tests
 * POST /api/tests - Create a new test
 * GET /api/tests/:id - Get a single test
 * PUT /api/tests/:id - Update a test (including discount)
 * DELETE /api/tests/:id - Delete a test
 * GET /api/tests/appointment/:appointmentId - Get tests by appointment
 */

router.use(auth)

// Specific route before /:id to avoid parameter conflict
router.get('/appointment/:appointmentId', getTestsByAppointment)

router.route('/')
  .get(getTests)
  .post(validate(testSchemas.create), createTest)

router.route('/:id')
  .get(getTest)
  .put(validate(testSchemas.update), updateTest)
  .delete(deleteTest)

export default router
