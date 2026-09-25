import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Doctor Controller - handles CRUD for doctor records
 */

/**
 * Create a new doctor
 * POST /api/doctors
 */
const toText = (value) => {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * The `Doctor` table stores `specialization`, `fee`, `hospital` and `phone`.
 * Older dashboard screens (and the mobile app) also talk about `specialty`,
 * `designation` and `consultationFee`, so every response exposes BOTH
 * spellings — the same approach used by `serializeBooking` in the booking
 * controller. Fields with no matching column (room, visitingDays, ...) are
 * echoed back as empty strings instead of `undefined` so tables never break.
 */
const serializeDoctor = (doctor) => ({
  ...doctor,
  specialty: doctor.specialization || '',
  designation: doctor.designation || '',
  qualifications: doctor.qualifications || '',
  department: doctor.department || '',
  unit: doctor.unit || '',
  room: doctor.room || '',
  consultationFee: doctor.fee != null ? doctor.fee : null,
  visitingDays: doctor.visitingDays || '',
  visitingTime: doctor.visitingTime || '',
  profileUrl: doctor.profileUrl || '',
  imageUrl: doctor.imageUrl || '',
  appointmentUrl: doctor.appointmentUrl || ''
})

/**
 * Accepts both field naming styles from the request body.
 * `specialty` / `designation` are stored in the `specialization` column and
 * `consultationFee` in the `fee` column so the same doctor record works for
 * the web dashboard and the mobile app.
 */
const readDoctorPayload = (body) => ({
  name: toText(body.name),
  specialization: toText(body.specialty) || toText(body.specialization) || toText(body.designation),
  fee: toNumber(body.consultationFee) ?? toNumber(body.fee),
  hospital: toText(body.hospital),
  phone: toText(body.phone)
})

/**
 * Create a new doctor
 * POST /api/doctors
 */
export const createDoctor = async (req, res) => {
  try {
    const { name, specialization, fee, hospital, phone } = readDoctorPayload(req.body)

    if (!name) {
      return sendError(res, 'ডাক্তারের নাম প্রয়োজন', 'Doctor name is required', 400)
    }

    if (phone) {
      const phoneTaken = await prisma.doctor.findUnique({ where: { phone } })
      if (phoneTaken) {
        return sendError(res, 'এই ফোন নাম্বে অন্য ডাক্তার আছে', 'Phone already in use', 400)
      }
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        specialization,
        fee,
        hospital,
        phone,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true
      }
    })

    return sendSuccess(res, 'ডাক্তার তৈরি সফল', serializeDoctor(doctor), 201)
  } catch (error) {
    if (error.code === 'P2002') {
      return sendError(res, 'এই ফোন নাম্বে অন্য ডাক্তার আছে', 'Phone already in use', 400)
    }
    return sendError(res, 'ডাক্তার তৈরিতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get all doctors
 * GET /api/doctors
 */
export const getDoctors = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      orderBy: { createdAt: 'desc' },
      include: { appointments: true }
    })

    return sendSuccess(res, 'ডাক্তারদের তালিকা', doctors.map(serializeDoctor))
  } catch (error) {
    return sendError(res, 'ডাক্তারদের তালিকা আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get a single doctor by ID
 * GET /api/doctors/:id
 */
export const getDoctor = async (req, res) => {
  try {
    const { id } = req.params

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { appointments: true }
    })

    if (!doctor) {
      return sendError(res, 'ডাক্তার পাওয়া যায়নি', 'Doctor not found', 404)
    }

    return sendSuccess(res, 'ডাক্তার তথ্য', serializeDoctor(doctor))
  } catch (error) {
    return sendError(res, 'ডাক্তার তথ্য আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update a doctor
 * PUT /api/doctors/:id
 */
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params
    const { name, specialization, fee, hospital, phone } = readDoctorPayload(req.body)

    const existingDoctor = await prisma.doctor.findUnique({
      where: { id }
    })

    if (!existingDoctor) {
      return sendError(res, 'ডাক্তার পাওয়া যায়নি', 'Doctor not found', 404)
    }

    if (phone && phone !== existingDoctor.phone) {
      const phoneTaken = await prisma.doctor.findUnique({ where: { phone } })
      if (phoneTaken) {
        return sendError(res, 'এই ফোন নাম্বে অন্য ডাক্তার আছে', 'Phone already in use', 400)
      }
    }

    const updated = await prisma.doctor.update({
      where: { id },
      data: {
        name: name || existingDoctor.name,
        specialization: specialization ?? existingDoctor.specialization,
        fee: fee ?? existingDoctor.fee,
        hospital: hospital ?? existingDoctor.hospital,
        phone: phone ?? existingDoctor.phone,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : existingDoctor.isActive
      }
    })

    return sendSuccess(res, 'ডাক্তার আপডেট সফল', serializeDoctor(updated))
  } catch (error) {
    if (error.code === 'P2002') {
      return sendError(res, 'এই ফোন নাম্বে অন্য ডাক্তার আছে', 'Phone already in use', 400)
    }
    return sendError(res, 'ডাক্তার আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Delete a doctor
 * DELETE /api/doctors/:id
 */
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params

    const existingDoctor = await prisma.doctor.findUnique({
      where: { id }
    })

    if (!existingDoctor) {
      return sendError(res, 'ডাক্তার পাওয়া যায়নি', 'Doctor not found', 404)
    }

    await prisma.doctor.delete({
      where: { id }
    })

    return sendSuccess(res, 'ডাক্তার ডিলিট সফল')
  } catch (error) {
    return sendError(res, 'ডাক্তার ডিলিট করতে সমস্যা হয়েছে', error.message)
  }
}
