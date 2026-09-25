import express from 'express'
import {
  createPayment,
  getPayments,
  getPayment,
  updatePayment,
  getPaymentsByAppointment
} from '../controllers/paymentController.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Payment Routes
 * POST /api/payments - Create a new payment
 * GET /api/payments - Get all payments
 * GET /api/payments/:id - Get a single payment
 * PUT /api/payments/:id - Update a payment
 * GET /api/appointments/:appointmentId/payments - Get payments by appointment
 */

router.use(auth)

router.post('/', createPayment)
router.get('/', getPayments)
router.get('/:id', getPayment)
router.put('/:id', updatePayment)
router.get('/appointments/:appointmentId/payments', getPaymentsByAppointment)

export default router
