import express from 'express'
import {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment
} from '../controllers/appointmentController.js'
import { validate, appointmentSchemas } from '../middlewares/validation.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Appointment Routes (Protected)
 * GET /api/appointments - Get all appointments
 * POST /api/appointments - Create a new appointment
 * POST /api/appointments/book - Book appointment alias
 * GET /api/appointments/:id - Get a single appointment
 * PUT /api/appointments/:id - Update an appointment
 * DELETE /api/appointments/:id - Delete an appointment
 */

router.use(auth)

router.route('/')
  .get(getAppointments)
  .post(validate(appointmentSchemas.create), createAppointment)

router.post('/book', validate(appointmentSchemas.create), createAppointment)

router.route('/:id')
  .get(getAppointment)
  .put(validate(appointmentSchemas.update), updateAppointment)
  .delete(deleteAppointment)

export default router
