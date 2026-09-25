import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'
import { sendAppointmentConfirmation } from '../services/emailService.js'

/**
 * Appointment Controller - handles booking and management of appointments
 * Service types: online (50 BDT), package (500 BDT)
 */

// Service fee mapping
const SERVICE_FEES = {
  online: 50,
  package: 500
}

/**
 * Create a new appointment
 * POST /api/appointments
 */
export const createAppointment = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      agentId,
      hospital,
      date,
      status,
      serviceType,
      notes,
      whatsappNumber,
      packageId,
      packagePrice,
      packageDiscount,
      discountPercent
    } = req.body

    // Verify doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId }
    })
    if (!doctor) {
      return sendError(res, 'ডাক্তার পাওয়া যায়নি', 'Doctor not found', 404)
    }

    // Verify agent exists if provided
    let agent = null
    if (agentId) {
      agent = await prisma.agent.findUnique({
        where: { id: agentId }
      })
      if (!agent) {
        return sendError(res, 'এজেন্ট পাওয়া যায়নি', 'Agent not found', 404)
      }
    }

    // Verify patient exists if provided
    if (patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      })
      if (!patient) {
        return sendError(res, 'রোগী পাওয়া যায়নি', 'Patient not found', 404)
      }
    }

    // Verify package exists if provided
    let packageData = null
    if (packageId) {
      packageData = await prisma.package.findUnique({
        where: { id: packageId }
      })
      if (!packageData) {
        return sendError(res, 'Package পাওয়া যায়নি', 'Package not found', 404)
      }
    }

    // Auto-set service fee based on service type
    const serviceFee = SERVICE_FEES[serviceType] || 50

    // Calculate package final price
    let packageFinalPrice = null
    if (packageId && packagePrice) {
      const discount = packageDiscount || 0
      packageFinalPrice = parseFloat((packagePrice - (packagePrice * discount / 100)).toFixed(2))
    }

        const appointment = await prisma.appointment.create({
      data: {
        patientId: patientId || null,
        doctorId,
        agentId: agentId || null,
        packageId: packageId || null,
        hospital: hospital || null,
        date: new Date(date),
        status: status || 'pending',
        serviceType,
        serviceFee,
        packagePrice: packagePrice || null,
        packageDiscount: packageDiscount || 0,
        packageFinalPrice: packageFinalPrice,
        discountPercent: discountPercent != null ? discountPercent : 0,
        notes: notes || null,
        whatsappNumber: whatsappNumber || null
      },
      include: {
        patient: true,
        doctor: true,
        agent: true,
        package: true
      }
    })

    return sendSuccess(res, 'অ্যাপয়েন্টমেন্ট বুকিং সফল', appointment, 201)
  } catch (error) {
    return sendError(res, 'অ্যাপয়েন্টমেন্ট বুক করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get all appointments
 * GET /api/appointments
 * Admin/super_admin sees all appointments
 * Agent sees only their own appointments
 */
export const getAppointments = async (req, res) => {
  try {
    const where = {}

    if (req.agent) {
      where.agentId = req.agent.id
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        doctor: true,
        agent: true,
        package: true,
        tests: true
      }
    })

    return sendSuccess(res, 'অ্যাপয়েন্টমেন্টগুলোর তালিকা', appointments)
  } catch (error) {
    return sendError(res, 'অ্যাপয়েন্টমেন্ট আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get a single appointment by ID
 * GET /api/appointments/:id
 */
export const getAppointment = async (req, res) => {
  try {
    const { id } = req.params

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        agent: true,
        package: true,
        tests: true
      }
    })

    if (!appointment) {
      return sendError(res, 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি', 'Appointment not found', 404)
    }

    return sendSuccess(res, 'অ্যাপয়েন্টমেন্ট তথ্য', appointment)
  } catch (error) {
    return sendError(res, 'অ্যাপয়েন্টমেন্ট তথ্য আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update an appointment
 * PUT /api/appointments/:id
 */
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params
    const {
      patientId,
      doctorId,
      agentId,
      hospital,
      date,
      status,
      serviceType,
      serviceFee,
      notes,
      whatsappNumber,
      packageId,
      packagePrice,
      packageDiscount,
      discountPercent
    } = req.body

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    })

    if (!existingAppointment) {
      return sendError(res, 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি', 'Appointment not found', 404)
    }

    // Recalculate service fee if serviceType changes
    let updatedServiceFee = serviceFee
    if (serviceType && serviceType !== existingAppointment.serviceType) {
      updatedServiceFee = SERVICE_FEES[serviceType] || 50
    }

    let finalPackageId = packageId
    if (packageId) {
      const packageData = await prisma.package.findUnique({
        where: { id: packageId }
      })
      if (!packageData) {
        return sendError(res, 'Package পাওয়া যায়নি', 'Package not found', 404)
      }
      finalPackageId = packageId
    } else if (packageId === null) {
      finalPackageId = null
    } else {
      finalPackageId = existingAppointment.packageId
    }

    let updatedPackagePrice = existingAppointment.packagePrice
    let updatedPackageDiscount = existingAppointment.packageDiscount
    let updatedPackageFinalPrice = existingAppointment.packageFinalPrice

    if (packagePrice !== undefined) {
      updatedPackagePrice = packagePrice
      updatedPackageDiscount = packageDiscount !== undefined ? packageDiscount : existingAppointment.packageDiscount || 0
      updatedPackageFinalPrice = parseFloat((packagePrice - (packagePrice * updatedPackageDiscount / 100)).toFixed(2))
    } else if (packageDiscount !== undefined && existingAppointment.packagePrice) {
      updatedPackageDiscount = packageDiscount
      updatedPackageFinalPrice = parseFloat((existingAppointment.packagePrice - (existingAppointment.packagePrice * packageDiscount / 100)).toFixed(2))
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        patientId: patientId || existingAppointment.patientId,
        doctorId: doctorId || existingAppointment.doctorId,
        agentId: agentId ? agentId : existingAppointment.agentId,
        packageId: finalPackageId,
        hospital: hospital ? hospital : existingAppointment.hospital,
        date: date ? new Date(date) : existingAppointment.date,
        status: status || existingAppointment.status,
        serviceType: serviceType || existingAppointment.serviceType,
        serviceFee: updatedServiceFee !== undefined ? updatedServiceFee : existingAppointment.serviceFee,
        packagePrice: updatedPackagePrice,
        packageDiscount: updatedPackageDiscount,
        packageFinalPrice: updatedPackageFinalPrice,
        discountPercent: discountPercent !== undefined ? discountPercent : existingAppointment.discountPercent,
        notes: notes !== undefined ? notes : existingAppointment.notes,
        whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : existingAppointment.whatsappNumber
      },
      include: {
        patient: true,
        doctor: true,
        agent: true,
        package: true
      }
    })

    // Send confirmation email if status changed to "confirmed"
    if (status === 'confirmed' && existingAppointment.status !== 'confirmed') {
      // Email is optional for patients - only send if they have email
      // For now, we just log this
      console.log(`Appointment ${id} confirmed - ready to send confirmation email`)
    }

    return sendSuccess(res, 'অ্যাপয়েন্টমেন্ট আপডেট সফল', updated)
  } catch (error) {
    return sendError(res, 'অ্যাপয়েন্টমেন্ট আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update appointment status (task tracking workflow)
 * PUT /api/appointments/:id/status
 * Body: { status, discountPercent? }
 * - Admin/super_admin can set any allowed status
 * - Agents can only progress their OWN appointments through:
 *     confirmed -> received -> ongoing -> completed
 */
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, discountPercent } = req.body

    if (!['pending', 'confirmed', 'received', 'ongoing', 'completed', 'cancelled'].includes(status)) {
      return sendError(res, 'অবৈধ স্ট্যাটাস', 'Invalid status', 400)
    }

    const appointment = await prisma.appointment.findUnique({ where: { id } })

    if (!appointment) {
      return sendError(res, 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি', 'Appointment not found', 404)
    }

    if (req.agent) {
      // Agents can only act on appointments assigned to them
      if (appointment.agentId !== req.agent.id) {
        return sendError(res, 'এটি আপনার অ্যাপয়েন্টমেন্ট নয়', 'Not your appointment', 403)
      }

      const agentTransitions = {
        confirmed: ['received'],
        received: ['ongoing'],
        ongoing: ['completed']
      }

      if (!agentTransitions[appointment.status] || !agentTransitions[appointment.status].includes(status)) {
        return sendError(res, 'এই স্ট্যাটাস পরিবর্তন অনুমোদিত নয়', 'Invalid status transition', 400)
      }

      // Discount must be provided when ending the task
      if (status === 'completed' && (discountPercent === undefined || discountPercent === null)) {
        return sendError(res, 'ডিসকাউন্ট শতাংশ প্রয়োজন', 'Discount percent required', 400)
      }
    }

    const data = { status }
    if (discountPercent !== undefined && discountPercent !== null) {
      data.discountPercent = Number(discountPercent) || 0
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: true,
        doctor: true,
        agent: true,
        package: true,
        tests: true
      }
    })

    return sendSuccess(res, 'স্ট্যাটাস আপডেট সফল', updated)
  } catch (error) {
    return sendError(res, 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Delete an appointment
 * DELETE /api/appointments/:id
 */
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    })

    if (!existingAppointment) {
      return sendError(res, 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি', 'Appointment not found', 404)
    }

    await prisma.appointment.delete({
      where: { id }
    })

    return sendSuccess(res, 'অ্যাপয়েন্টমেন্ট ডিলিট সফল')
  } catch (error) {
    return sendError(res, 'অ্যাপয়েন্টমেন্ট ডিলিট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get appointments by patient ID
 * GET /api/appointments/patient/:patientId
 */
export const getAppointmentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params

    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    })

    if (!patient) {
      return sendError(res, 'রোগী পাওয়া যায়নি', 'Patient not found', 404)
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        doctor: true,
        agent: true,
        package: true,
        tests: true
      }
    })

    return sendSuccess(res, 'রোগীর অ্যাপয়েন্টমেন্টগুলোর তালিকা', appointments)
  } catch (error) {
    return sendError(res, 'অ্যাপয়েন্টমেন্ট আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get appointments by date
 * GET /api/appointments/date/:date
 * Admin/super_admin sees all appointments for the date
 * Agent sees only their own appointments for the date
 */
export const getAppointmentsByDate = async (req, res) => {
  try {
    const { date } = req.params

    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    const where = {
      date: {
        gte: startDate,
        lte: endDate
      }
    }

    if (req.agent) {
      where.agentId = req.agent.id
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        patient: true,
        doctor: true,
        agent: true,
        package: true,
        tests: true
      }
    })

    return sendSuccess(res, `${date} তারিখের অ্যাপয়েন্টমেন্টগুলোর তালিকা`, appointments)
  } catch (error) {
    return sendError(res, 'অ্যাপয়েন্টমেন্ট আনতে সমস্যা হয়েছে', error.message)
  }
}
