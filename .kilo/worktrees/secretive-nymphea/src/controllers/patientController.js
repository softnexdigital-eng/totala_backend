import bcrypt from 'bcryptjs'
import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Patient Controller - handles CRUD for patient records
 */

/**
 * Create a new patient
 * POST /api/patients
 */
export const createPatient = async (req, res) => {
  try {
    const { name, phone, age, address, password, isRegistered } = req.body

    // Check if patient already exists with this phone
    const existingPatient = await prisma.patient.findUnique({
      where: { phone }
    })

    if (existingPatient) {
      return sendError(res, 'এই ফোন নাম্বের পেশেন্ট ইতোমদ্য আছে', 'Patient already exists', 400)
    }

    const data = { name, phone, age, address, isRegistered: isRegistered || false }

    // Hash password if provided and non-empty
    if (password && password.trim() !== '') {
      data.password = await bcrypt.hash(password, 10)
    }

    const patient = await prisma.patient.create({ data })

    const { password: _pw, ...patientSafe } = patient

    return sendSuccess(res, 'রোগী তৈরি সফল', patientSafe, 201)
  } catch (error) {
    if (error.code === 'P2002') {
      return sendError(res, 'এই ফোন নাম্বের পেশেন্ট ইতোমদ্য আছে', 'Duplicate phone number', 400)
    }
    return sendError(res, 'রোগী তৈরিতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get all patients
 * GET /api/patients
 */
export const getPatients = async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Remove password from each patient
    const safePatients = patients.map((p) => {
      const { password, ...rest } = p
      return rest
    })

    return sendSuccess(res, 'রোগীদের তালিকা', safePatients)
  } catch (error) {
    return sendError(res, 'রোগীদের তালিকা আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get a single patient by ID
 * GET /api/patients/:id
 */
export const getPatient = async (req, res) => {
  try {
    const { id } = req.params

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: { appointments: true }
    })

    if (!patient) {
      return sendError(res, 'রোগী পাওয়া যায়নি', 'Patient not found', 404)
    }

    const { password, ...patientSafe } = patient

    return sendSuccess(res, 'রোগী তথ্য', patientSafe)
  } catch (error) {
    return sendError(res, 'রোগী তথ্য আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update a patient
 * PUT /api/patients/:id
 */
export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params
    const { name, phone, age, address, password, isRegistered } = req.body

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id }
    })

    if (!existingPatient) {
      return sendError(res, 'রোগী পাওয়া যায়নি', 'Patient not found', 404)
    }

    // Check for phone uniqueness if phone is being changed
    if (phone && phone !== existingPatient.phone) {
      const phoneTaken = await prisma.patient.findUnique({
        where: { phone }
      })
      if (phoneTaken) {
        return sendError(res, 'এই ফোন নাম্বে অন্য রোগী আছে', 'Phone already in use', 400)
      }
    }

    const data = { name, phone, age, address, isRegistered }

    // Handle password update
    if (password !== undefined) {
      if (password && password.trim() !== '') {
        data.password = await bcrypt.hash(password, 10)
      } else {
        data.password = null
      }
    }

    const updated = await prisma.patient.update({
      where: { id },
      data
    })

    const { password: _pw, ...patientSafe } = updated

    return sendSuccess(res, 'রোগী আপডেট সফল', patientSafe)
  } catch (error) {
    if (error.code === 'P2002') {
      return sendError(res, 'এই ফোন নাম্বে অন্য রোগী আছে', 'Phone already in use', 400)
    }
    return sendError(res, 'রোগী আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Delete a patient
 * DELETE /api/patients/:id
 */
export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params

    const existingPatient = await prisma.patient.findUnique({
      where: { id }
    })

    if (!existingPatient) {
      return sendError(res, 'রোগী পাওয়া যায়নি', 'Patient not found', 404)
    }

    await prisma.patient.delete({
      where: { id }
    })

    return sendSuccess(res, 'রোগী ডিলিট সফল')
  } catch (error) {
    return sendError(res, 'রোগী ডিলিট করতে সমস্যা হয়েছে', error.message)
  }
}
