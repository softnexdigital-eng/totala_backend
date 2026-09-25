import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Doctor Controller - handles CRUD for doctor records
 */

/**
 * Create a new doctor
 * POST /api/doctors
 */
export const createDoctor = async (req, res) => {
  try {
    const {
      name,
      profileUrl,
      imageUrl,
      designation,
      specialty,
      qualifications,
      hospital,
      department,
      unit,
      room,
      consultationFee,
      visitingDays,
      visitingTime,
      appointmentUrl,
      isActive
    } = req.body

    const doctor = await prisma.doctor.create({
      data: {
        name,
        profileUrl: profileUrl || null,
        imageUrl: imageUrl || null,
        designation: designation || null,
        specialty: specialty || null,
        qualifications: qualifications || null,
        hospital: hospital || null,
        department: department || null,
        unit: unit || null,
        room: room || null,
        consultationFee: consultationFee != null ? consultationFee : null,
        visitingDays: visitingDays || null,
        visitingTime: visitingTime || null,
        appointmentUrl: appointmentUrl || null,
        isActive: isActive !== undefined ? isActive : true
      }
    })

    return sendSuccess(res, 'ডাক্তার তৈরি সফল', doctor, 201)
  } catch (error) {
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

    return sendSuccess(res, 'ডাক্তারদের তালিকা', doctors)
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

    return sendSuccess(res, 'ডাক্তার তথ্য', doctor)
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
    const {
      name,
      profileUrl,
      imageUrl,
      designation,
      specialty,
      qualifications,
      hospital,
      department,
      unit,
      room,
      consultationFee,
      visitingDays,
      visitingTime,
      appointmentUrl,
      isActive
    } = req.body

    const existingDoctor = await prisma.doctor.findUnique({
      where: { id }
    })

    if (!existingDoctor) {
      return sendError(res, 'ডাক্তার পাওয়া যায়নি', 'Doctor not found', 404)
    }

    const updated = await prisma.doctor.update({
      where: { id },
      data: {
        name,
        profileUrl: profileUrl != null ? profileUrl : undefined,
        imageUrl: imageUrl != null ? imageUrl : undefined,
        designation: designation != null ? designation : undefined,
        specialty: specialty != null ? specialty : undefined,
        qualifications: qualifications != null ? qualifications : undefined,
        hospital: hospital != null ? hospital : undefined,
        department: department != null ? department : undefined,
        unit: unit != null ? unit : undefined,
        room: room != null ? room : undefined,
        consultationFee: consultationFee != null ? consultationFee : undefined,
        visitingDays: visitingDays != null ? visitingDays : undefined,
        visitingTime: visitingTime != null ? visitingTime : undefined,
        appointmentUrl: appointmentUrl != null ? appointmentUrl : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    })

    return sendSuccess(res, 'ডাক্তার আপডেট সফল', updated)
  } catch (error) {
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
