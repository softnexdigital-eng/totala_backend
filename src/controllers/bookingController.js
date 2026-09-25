import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Booking Controller - handles the public "Book Now" booking requests that are
 * submitted from the landing page / public agents page and reviewed by the
 * Super Admin under "Agent Booking Requests".
 *
 * Flow of a public submission:
 *  1. Validate the patient + service details coming from the website form.
 *  2. Resolve the patient by phone number (the Patient profile is reused when
 *     the same phone already exists, otherwise a new profile is auto-created).
 *  3. Store the booking request so it shows up in the dashboard.
 */

// Statuses shared with the frontend (`src/lib/bookingOptions.ts`).
const VALID_STATUSES = [
  'PENDING',
  'APPROVED',
  'ASSIGNED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED'
]

// Same rule as the frontend `validatePhone` helper (10-15 digits).
const PHONE_REGEX = /^[0-9]{10,15}$/

const DEFAULT_STATUS = 'PENDING'

const clean = (value) => String(value ?? '').trim()

const normalizePhone = (value) => String(value ?? '').replace(/\s/g, '')

const toNullableDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const toNullableInt = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

/**
 * Shape a booking row so that every consumer sees the fields it expects.
 *
 * The landing page talks about `serviceNeeded` / `preferredDate`, while the
 * "Online Bookings" dashboard reads `serviceType` / `date`, so a single payload
 * exposes both spellings instead of forcing the UI to guess.
 */
const serializeBooking = (booking, extra = {}) => {
  const preferredDate = booking.preferredDate
    ? booking.preferredDate.toISOString()
    : null

  return {
    id: booking.id,
    patientId: booking.patientId,
    patientName: booking.patientName,
    patientPhone: booking.patientPhone,
    patientAge: booking.patientAge,
    patientGender: booking.patientGender,
    patientAddress: booking.patientAddress,
    patient: booking.patient
      ? {
          id: booking.patient.id,
          name: booking.patient.name,
          phone: booking.patient.phone
        }
      : null,
    agentId: booking.agentId,
    agentName: booking.agent ? booking.agent.name : null,
    agent: booking.agent
      ? { id: booking.agent.id, name: booking.agent.name }
      : null,
    serviceNeeded: booking.serviceNeeded,
    serviceType: booking.serviceNeeded,
    preferredDate,
    preferredTime: booking.preferredTime,
    // Aliases used by the "Online Bookings" table.
    date: preferredDate,
    time: booking.preferredTime,
    hospital: booking.hospital,
    bookingReason: booking.bookingReason,
    additionalNote: booking.additionalNote,
    notes:
      [booking.bookingReason, booking.additionalNote].filter(Boolean).join('\n') ||
      null,
    doctor: null,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    ...extra
  }
}

const bookingInclude = { patient: true, agent: true }

/**
 * Find the patient matching `phone`, creating a lightweight (unregistered)
 * profile when the phone number is new. Returns the resolved patient id.
 */
const resolvePatient = async ({ patientId, name, phone, age, address }) => {
  if (patientId) {
    const existingById = await prisma.patient.findUnique({
      where: { id: patientId }
    })
    if (existingById) {
      return { patientId: existingById.id, autoCreatedPatient: false }
    }
  }

  if (!phone) return { patientId: null, autoCreatedPatient: false }

  let patient = await prisma.patient.findUnique({ where: { phone } })
  let autoCreatedPatient = false

  if (!patient) {
    try {
      patient = await prisma.patient.create({
        data: {
          name,
          phone,
          age: age ?? null,
          address: address || null,
          isRegistered: false
        }
      })
      autoCreatedPatient = true
    } catch (error) {
      // Another request may have created the same phone number in parallel.
      if (error?.code === 'P2002') {
        patient = await prisma.patient.findUnique({ where: { phone } })
      } else {
        throw error
      }
    }
  }

  return { patientId: patient ? patient.id : null, autoCreatedPatient }
}

/**
 * Create a booking request
 * POST /api/bookings  (public - no session required)
 *
 * Accepts both the nested `{ patient: {...} }` payload used by the landing page
 * and a flat payload for convenience.
 */
export const createBooking = async (req, res) => {
  try {
    const body = req.body || {}
    const patientInput = body.patient || {}

    const patientName = clean(patientInput.name || body.patientName)
    const patientPhone = normalizePhone(patientInput.phone || body.patientPhone)
    const patientAge = toNullableInt(
      patientInput.age ?? body.patientAge ?? body.age
    )
    const patientGender =
      clean(patientInput.gender || body.patientGender || body.gender) || null
    const patientAddress =
      clean(patientInput.address || body.patientAddress || body.address) || null
    const serviceNeeded = clean(body.serviceNeeded || body.serviceType)

    if (!patientName || !patientPhone || !patientAge || !patientAddress) {
      return sendError(
        res,
        'রোগীর নাম, ফোন, বয়স ও ঠিকানা প্রয়োজন',
        'Patient name, phone, age and address are required',
        400
      )
    }

    if (!serviceNeeded) {
      return sendError(res, 'সেবার ধরন প্রয়োজন', 'Service needed is required', 400)
    }

    if (!PHONE_REGEX.test(patientPhone)) {
      return sendError(
        res,
        'সঠিক ফোন নম্বর দিন',
        'Please provide a valid phone number',
        400
      )
    }

    if (patientAge <= 0 || patientAge > 130) {
      return sendError(res, 'সঠিক বয়স দিন', 'Please provide a valid age', 400)
    }

    // Verify the requested agent when one was picked on the website.
    const agentId = clean(body.agentId) || null
    if (agentId) {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } })
      if (!agent) {
        return sendError(res, 'এজেন্ট পাওয়া যায়নি', 'Agent not found', 404)
      }
    }

    const { patientId, autoCreatedPatient } = await resolvePatient({
      patientId: patientInput.patientId || body.patientId,
      name: patientName,
      phone: patientPhone,
      age: patientAge,
      address: patientAddress
    })

    const booking = await prisma.booking.create({
      data: {
        patientId,
        agentId,
        patientName,
        patientPhone,
        patientAge,
        patientGender,
        patientAddress,
        serviceNeeded,
        preferredDate: toNullableDate(body.preferredDate || body.date),
        preferredTime: clean(body.preferredTime || body.time) || null,
        hospital: clean(body.hospital) || null,
        bookingReason: clean(body.bookingReason || body.notes) || null,
        additionalNote: clean(body.additionalNote) || null,
        status: DEFAULT_STATUS
      },
      include: bookingInclude
    })

    return sendSuccess(
      res,
      'বুকিং রিকোয়েস্ট সফলভাবে জমা হয়েছে',
      serializeBooking(booking, { autoCreatedPatient }),
      201
    )
  } catch (error) {
    return sendError(res, 'বুকিং রিকোয়েস্ট জমা দিতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get every booking request (newest first)
 * GET /api/bookings  (protected)
 *
 * Optional query params: ?status= &agentId= &phone=
 */
export const getBookings = async (req, res) => {
  try {
    const { status, agentId, phone } = req.query
    const where = {}

    if (status) where.status = String(status).toUpperCase()
    if (agentId) where.agentId = String(agentId)
    if (phone) where.patientPhone = normalizePhone(phone)

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: bookingInclude
    })

    return sendSuccess(
      res,
      'বুকিং রিকোয়েস্টের তালিকা',
      bookings.map((booking) => serializeBooking(booking))
    )
  } catch (error) {
    return sendError(res, 'বুকিং রিকোয়েস্ট আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get a single booking request
 * GET /api/bookings/:id  (protected)
 */
export const getBooking = async (req, res) => {
  try {
    const { id } = req.params

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: bookingInclude
    })

    if (!booking) {
      return sendError(res, 'বুকিং রিকোয়েস্ট পাওয়া যায়নি', 'Booking not found', 404)
    }

    return sendSuccess(res, 'বুকিং রিকোয়েস্টের তথ্য', serializeBooking(booking))
  } catch (error) {
    return sendError(res, 'বুকিং রিকোয়েস্ট আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update a booking request (status, assigned agent or its details)
 * PUT /api/bookings/:id  (protected)
 */
export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params
    const body = req.body || {}

    const existing = await prisma.booking.findUnique({ where: { id } })
    if (!existing) {
      return sendError(res, 'বুকিং রিকোয়েস্ট পাওয়া যায়নি', 'Booking not found', 404)
    }

    const data = {}

    if (body.status !== undefined) {
      const status = String(body.status).toUpperCase()
      if (!VALID_STATUSES.includes(status)) {
        return sendError(
          res,
          'অবৈধ স্ট্যাটাস',
          `Status must be one of: ${VALID_STATUSES.join(', ')}`,
          400
        )
      }
      data.status = status
    }

    if (body.agentId !== undefined) {
      const agentId = clean(body.agentId) || null
      if (agentId) {
        const agent = await prisma.agent.findUnique({ where: { id: agentId } })
        if (!agent) {
          return sendError(res, 'এজেন্ট পাওয়া যায়নি', 'Agent not found', 404)
        }
      }
      data.agentId = agentId

      if (existing.agentId && existing.agentId !== agentId && existing.patientId) {
        await prisma.appointment.updateMany({
          where: { patientId: existing.patientId, agentId: existing.agentId },
          data: { agentId },
        })

        await prisma.task.updateMany({
          where: { agentId: existing.agentId, appointment: { patientId: existing.patientId } },
          data: { agentId },
        })
      }
    }

    if (body.patientName !== undefined) data.patientName = clean(body.patientName)
    if (body.patientPhone !== undefined) {
      data.patientPhone = normalizePhone(body.patientPhone)
    }
    if (body.patientAge !== undefined) {
      data.patientAge = toNullableInt(body.patientAge)
    }
    if (body.patientGender !== undefined) {
      data.patientGender = clean(body.patientGender) || null
    }
    if (body.patientAddress !== undefined) {
      data.patientAddress = clean(body.patientAddress) || null
    }
    if (body.serviceNeeded !== undefined || body.serviceType !== undefined) {
      data.serviceNeeded = clean(body.serviceNeeded || body.serviceType)
    }
    if (body.preferredDate !== undefined || body.date !== undefined) {
      data.preferredDate = toNullableDate(body.preferredDate || body.date)
    }
    if (body.preferredTime !== undefined || body.time !== undefined) {
      data.preferredTime = clean(body.preferredTime || body.time) || null
    }
    if (body.hospital !== undefined) data.hospital = clean(body.hospital) || null
    if (body.bookingReason !== undefined) {
      data.bookingReason = clean(body.bookingReason) || null
    }
    if (body.additionalNote !== undefined) {
      data.additionalNote = clean(body.additionalNote) || null
    }

    const updated = await prisma.booking.update({
      where: { id },
      data,
      include: bookingInclude
    })

    const response = sendSuccess(res, 'বুকিং আপডেট সফল', serializeBooking(updated))

    if (data.status === 'APPROVED' && updated.agentId && updated.patientId) {
      createAppointmentAndTask(updated)
    }

    return response
  } catch (error) {
    return sendError(res, 'বুকিং আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

const createAppointmentAndTask = async (booking) => {
  try {
    if (!booking.patientId) return

    const date = booking.preferredDate ? new Date(booking.preferredDate) : new Date()
    const notes = [booking.bookingReason, booking.additionalNote].filter(Boolean).join('\n') || null

    const appointment = await prisma.appointment.findFirst({
      where: {
        patientId: booking.patientId,
        serviceType: 'online',
        status: 'confirmed',
        date,
      },
    })

    let finalAppointment = appointment
    if (!appointment) {
      finalAppointment = await prisma.appointment.create({
        data: {
          patientId: booking.patientId,
          doctorId: null,
          agentId: booking.agentId,
          hospital: booking.hospital,
          date,
          status: 'confirmed',
          serviceType: 'online',
          serviceFee: 50,
          notes,
          whatsappNumber: null,
        },
      })
    } else {
      finalAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          agentId: booking.agentId,
          hospital: booking.hospital,
          notes,
        },
      })
    }

    const task = await prisma.task.findFirst({
      where: {
        appointmentId: finalAppointment.id,
      },
    })

    if (!task) {
      await prisma.task.create({
        data: {
          appointmentId: finalAppointment.id,
          agentId: booking.agentId,
          taskStatus: 'ASSIGNED',
          specialInstructions: booking.bookingReason || null,
          notes: booking.additionalNote || null,
        },
      })
    } else if (task.agentId !== booking.agentId) {
      await prisma.task.update({
        where: { id: task.id },
        data: { agentId: booking.agentId },
      })
    }
  } catch (error) {
    console.error('Failed to create appointment/task from booking:', error)
  }
}

/**
 * Assign an agent to a booking request
 * POST /api/bookings/:id/assign  (protected)
 */
export const assignAgent = async (req, res) => {
  try {
    const { id } = req.params
    const agentId = clean(req.body?.agentId)

    if (!agentId) {
      return sendError(res, 'এজেন্ট আইডি প্রয়োজন', 'agentId is required', 400)
    }

    const [existing, agent] = await Promise.all([
      prisma.booking.findUnique({ where: { id } }),
      prisma.agent.findUnique({ where: { id: agentId } })
    ])

    if (!existing) {
      return sendError(res, 'বুকিং রিকোয়েস্ট পাওয়া যায়নি', 'Booking not found', 404)
    }
    if (!agent) {
      return sendError(res, 'এজেন্ট পাওয়া যায়নি', 'Agent not found', 404)
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { agentId },
      include: bookingInclude
    })

    if (existing.agentId && existing.agentId !== agentId && existing.patientId) {
      await prisma.appointment.updateMany({
        where: { patientId: existing.patientId, agentId: existing.agentId },
        data: { agentId },
      })

      await prisma.task.updateMany({
        where: { agentId: existing.agentId, appointment: { patientId: existing.patientId } },
        data: { agentId },
      })
    }

    const response = sendSuccess(res, 'এজেন্ট অ্যাসাইন সফল', serializeBooking(updated))

    if (updated.status === 'APPROVED' && updated.patientId) {
      await createAppointmentAndTask(updated)
    }

    return response
  } catch (error) {
    return sendError(res, 'এজেন্ট অ্যাসাইন করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Delete a booking request
 * DELETE /api/bookings/:id  (protected)
 */
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.booking.findUnique({ where: { id } })
    if (!existing) {
      return sendError(res, 'বুকিং রিকোয়েস্ট পাওয়া যায়নি', 'Booking not found', 404)
    }

    await prisma.booking.delete({ where: { id } })

    return sendSuccess(res, 'বুকিং রিকোয়েস্ট ডিলিট সফল')
  } catch (error) {
    return sendError(res, 'বুকিং রিকোয়েস্ট ডিলিট করতে সমস্যা হয়েছে', error.message)
  }
}
