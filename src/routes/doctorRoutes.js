import express from 'express'
import {
  createDoctor,
  getDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor
} from '../controllers/doctorController.js'
import { validate, doctorSchemas } from '../middlewares/validation.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Doctor Routes (Protected)
 * GET /api/doctors - Get all doctors
 * POST /api/doctors - Create a new doctor
 * GET /api/doctors/:id - Get a single doctor
 * PUT /api/doctors/:id - Update a doctor
 * DELETE /api/doctors/:id - Delete a doctor
 */

router.use(auth)

router.route('/')
  .get(getDoctors)
  .post(validate(doctorSchemas.create), createDoctor)

router.route('/:id')
  .get(getDoctor)
  .put(validate(doctorSchemas.update), updateDoctor)
  .delete(deleteDoctor)

export default router
