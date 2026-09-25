import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Test Controller - handles test management with discount tracking
 * Admin can set any discount percentage (not limited to specific percentages)
 */

/**
 * Calculate final cost from actual cost and discount percentage
 * finalCost = actualCost - (actualCost * discountPercent / 100)
 * @param {number} actualCost
 * @param {number} discountPercent
 * @returns {number}
 */
const calculateFinalCost = (actualCost, discountPercent) => {
  const discount = actualCost * (discountPercent / 100)
  return parseFloat((actualCost - discount).toFixed(2))
}

/**
 * Create a new test
 * POST /api/tests
 */
export const createTest = async (req, res) => {
  try {
    const {
      appointmentId,
      testName,
      actualCost,
      discountPercent,
      finalCost,
      reportUrl,
      prescriptionUrl,
      receiptUrl,
      status
    } = req.body

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    })

    if (!appointment) {
      return sendError(res, 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি', 'Appointment not found', 404)
    }

    // Calculate final cost if not provided
    let finalCostValue = finalCost
    if (finalCostValue === undefined) {
      const discount = discountPercent || 0
      finalCostValue = calculateFinalCost(actualCost, discount)
    }

    const testData = {
      appointmentId,
      testName,
      actualCost,
      discountPercent: discountPercent || 0,
      finalCost: finalCostValue,
      status: status || 'pending'
    }

    if (reportUrl) testData.reportUrl = reportUrl
    if (prescriptionUrl) testData.prescriptionUrl = prescriptionUrl
    if (receiptUrl) testData.receiptUrl = receiptUrl

    const test = await prisma.test.create({ data: testData })

    return sendSuccess(res, 'টেস্ট তৈরি সফল', test, 201)
  } catch (error) {
    return sendError(res, 'টেস্ট তৈরিতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get all tests
 * GET /api/tests
 */
export const getTests = async (req, res) => {
  try {
    const tests = await prisma.test.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          include: {
            patient: true,
            doctor: true,
            agent: true
          }
        }
      }
    })

    return sendSuccess(res, 'টেস্টগুলোর তালিকা', tests)
  } catch (error) {
    return sendError(res, 'টেস্ট আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get a single test by ID
 * GET /api/tests/:id
 */
export const getTest = async (req, res) => {
  try {
    const { id } = req.params

    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            patient: true,
            doctor: true,
            agent: true
          }
        }
      }
    })

    if (!test) {
      return sendError(res, 'টেস্ট পাওয়া যায়নি', 'Test not found', 404)
    }

    return sendSuccess(res, 'টেস্ট তথ্য', test)
  } catch (error) {
    return sendError(res, 'টেস্ট তথ্য আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update a test (including discount management)
 * PUT /api/tests/:id
 */
export const updateTest = async (req, res) => {
  try {
    const { id } = req.params
    const {
      testName,
      actualCost,
      discountPercent,
      finalCost,
      reportUrl,
      prescriptionUrl,
      receiptUrl,
      status,
      uploadedAt
    } = req.body

    const existingTest = await prisma.test.findUnique({
      where: { id }
    })

    if (!existingTest) {
      return sendError(res, 'টেস্ট পাওয়া যায়নি', 'Test not found', 404)
    }

    const updateData = {}

    if (testName !== undefined) updateData.testName = testName
    if (reportUrl !== undefined) updateData.reportUrl = reportUrl
    if (prescriptionUrl !== undefined) updateData.prescriptionUrl = prescriptionUrl
    if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl
    if (status !== undefined) updateData.status = status
    if (uploadedAt !== undefined) {
      updateData.uploadedAt = uploadedAt ? new Date(uploadedAt) : null
    }

    // Handle cost and discount updates
    // Admin can set ANY discount percentage (not limited to 30% or 40%)
    if (actualCost !== undefined) updateData.actualCost = actualCost
    if (discountPercent !== undefined) updateData.discountPercent = discountPercent

    // Recalculate finalCost if actualCost or discountPercent changed
    const newActualCost = actualCost !== undefined ? actualCost : existingTest.actualCost
    const newDiscount = discountPercent !== undefined ? discountPercent : existingTest.discountPercent || 0

    if (finalCost !== undefined) {
      // Use provided finalCost
      updateData.finalCost = finalCost
    } else if (actualCost !== undefined || discountPercent !== undefined) {
      // Recalculate based on changed values
      updateData.finalCost = calculateFinalCost(newActualCost, newDiscount)
    }

    const updated = await prisma.test.update({
      where: { id },
      data: updateData,
      include: {
        appointment: {
          include: {
            patient: true,
            doctor: true,
            agent: true
          }
        }
      }
    })

    return sendSuccess(res, 'টেস্ট আপডেট সফল', updated)
  } catch (error) {
    return sendError(res, 'টেস্ট আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Delete a test
 * DELETE /api/tests/:id
 */
export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params

    const existingTest = await prisma.test.findUnique({
      where: { id }
    })

    if (!existingTest) {
      return sendError(res, 'টেস্ট পাওয়া যায়নি', 'Test not found', 404)
    }

    await prisma.test.delete({
      where: { id }
    })

    return sendSuccess(res, 'টেস্ট ডিলিট সফল')
  } catch (error) {
    return sendError(res, 'টেস্ট ডিলিট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get all tests for a specific appointment
 * GET /api/tests/appointment/:appointmentId
 */
export const getTestsByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    })

    if (!appointment) {
      return sendError(res, 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি', 'Appointment not found', 404)
    }

    const tests = await prisma.test.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' }
    })

    return sendSuccess(res, 'এই অ্যাপয়েন্টমেন্টের টেস্টগুলোর তালিকা', tests)
  } catch (error) {
    return sendError(res, 'টেস্ট আনতে সমস্যা হয়েছে', error.message)
  }
}
