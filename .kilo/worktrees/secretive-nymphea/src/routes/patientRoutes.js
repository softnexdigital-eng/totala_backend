import express from 'express'
import {
  createPatient,
  getPatients,
  getPatient,
  updatePatient,
  deletePatient
} from '../controllers/patientController.js'
import { validate, patientSchemas } from '../middlewares/validation.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Patient Routes (Protected)
 * GET /api/patients - Get all patients
 * POST /api/patients - Create a new patient
 * GET /api/patients/:id - Get a single patient
 * PUT /api/patients/:id - Update a patient
 * DELETE /api/patients/:id - Delete a patient
 */

router.use(auth)

router.route('/')
  .get(getPatients)
  .post(validate(patientSchemas.create), createPatient)

router.route('/:id')
  .get(getPatient)
  .put(validate(patientSchemas.update), updatePatient)
  .delete(deletePatient)

export default router
