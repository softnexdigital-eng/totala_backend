import express from 'express'
import {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  assignAgent,
  deleteBooking
} from '../controllers/bookingController.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Booking Routes - booking requests submitted from the public landing page
 * "Book Now" modal and reviewed in the dashboard.
 *
 * POST   /api/bookings            - Create a request (public, no auth)
 * GET    /api/bookings            - List every request
 * GET    /api/bookings/:id        - Get a single request
 * PUT    /api/bookings/:id        - Update status / details
 * POST   /api/bookings/:id/assign - Assign an agent
 * DELETE /api/bookings/:id        - Delete a request
 */

// Public: submitted by website visitors who are not logged in yet.
router.post('/', createBooking)

// Everything below is dashboard-only (super admin / agent session).
router.use(auth)

router.get('/', getBookings)
router.post('/:id/assign', assignAgent)

router.route('/:id')
  .get(getBooking)
  .put(updateBooking)
  .delete(deleteBooking)

export default router
