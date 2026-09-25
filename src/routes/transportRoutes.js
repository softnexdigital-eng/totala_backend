import express from 'express'
import {
  getTransportPricings,
  upsertTransportPricing,
  createTransportBooking,
  getTransportBookings,
  getTransportBooking,
  approveTransportBooking,
  rejectTransportBooking,
  sendTransportInvoice,
} from '../controllers/transportController.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

// Public route for customer booking submission
router.post('/bookings', createTransportBooking)

// Protected routes for admin
router.use(auth)

router.get('/pricing', getTransportPricings)
router.put('/pricing', upsertTransportPricing)
router.get('/bookings', getTransportBookings)
router.get('/bookings/:id', getTransportBooking)
router.put('/bookings/:id/approve', approveTransportBooking)
router.put('/bookings/:id/reject', rejectTransportBooking)
router.post('/bookings/:id/send-invoice', sendTransportInvoice)

export default router
