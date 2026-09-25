import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * `Payment` has no dedicated column for a rejection reason, so it is kept as a
 * marked line inside `notes`. This helper surfaces it back as
 * `rejectionReason` for the dashboards (web + mobile) without a schema change.
 */
const REJECTION_PREFIX = 'Rejection reason: '

const withRejectionReason = (payment) => {
  const notes = payment.notes || ''
  const reasonLine = notes.split('\n').find((line) => line.startsWith(REJECTION_PREFIX))

  return {
    ...payment,
    rejectionReason: reasonLine ? reasonLine.slice(REJECTION_PREFIX.length) : null
  }
}

/**
 * Create a new payment
 * POST /api/payments
 */
export const createPayment = async (req, res) => {
  try {
    const { taskId, appointmentId, agentId, amount, paymentMethod, transactionId, senderNumber, notes } = req.body

    if (!taskId || !appointmentId || !agentId || !amount || !paymentMethod) {
      return sendError(res, 'সব তথ্য প্রয়োজন', 'All required fields must be provided', 400)
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!task) {
      return sendError(res, 'তাস্ক পাওয়া যায়নি', 'Task not found', 404)
    }

    if (req.agent && task.agentId !== req.agent.id) {
      return sendError(res, 'আপনার অনুমতি নেই', 'Forbidden', 403)
    }

    const payment = await prisma.payment.create({
      data: {
        taskId,
        appointmentId,
        agentId,
        amount,
        paymentMethod,
        transactionId: transactionId || null,
        senderNumber: senderNumber || null,
        notes: notes || null,
        paymentStatus: 'PENDING',
        paymentDate: new Date()
      },
      include: {
        task: true,
        appointment: true,
        agent: true
      }
    })

    return sendSuccess(res, 'পেমেন্ট তৈরি সফল', payment, 201)
  } catch (error) {
    return sendError(res, 'পেমেন্ট তৈরিতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get all payments
 * GET /api/payments
 */
export const getPayments = async (req, res) => {
  try {
    const where = req.agent ? { agentId: req.agent.id } : {}

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            taskStatus: true
          }
        },
        appointment: {
          select: {
            id: true,
            date: true,
            serviceType: true
          }
        },
        agent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return sendSuccess(res, 'পেমেন্টের তালিকা', payments.map(withRejectionReason))
  } catch (error) {
    return sendError(res, 'পেমেন্টের তালিকা আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get a single payment by ID
 * GET /api/payments/:id
 */
export const getPayment = async (req, res) => {
  try {
    const { id } = req.params

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        task: true,
        appointment: true,
        agent: true
      }
    })

    if (!payment) {
      return sendError(res, 'পেমেন্ট পাওয়া যায়নি', 'Payment not found', 404)
    }

    if (req.agent && payment.agentId !== req.agent.id) {
      return sendError(res, 'আপনার অনুমতি নেই', 'Forbidden', 403)
    }

    return sendSuccess(res, 'পেমেন্ট তথ্য', withRejectionReason(payment))
  } catch (error) {
    return sendError(res, 'পেমেন্ট আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update a payment
 * PUT /api/payments/:id
 */
export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params
    const { paymentStatus, rejectionReason, amount, paymentMethod, transactionId, senderNumber, notes } = req.body

    const payment = await prisma.payment.findUnique({
      where: { id }
    })

    if (!payment) {
      return sendError(res, 'পেমেন্ট পাওয়া যায়নি', 'Payment not found', 404)
    }

    if (req.agent && payment.agentId !== req.agent.id) {
      return sendError(res, 'আপনার অনুমতি নেই', 'Forbidden', 403)
    }

    const data = {}

    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus
    if (amount !== undefined) data.amount = amount
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod
    if (transactionId !== undefined) data.transactionId = transactionId
    if (senderNumber !== undefined) data.senderNumber = senderNumber

    // Notes + rejection reason share the same `notes` column.
    if (notes !== undefined || rejectionReason !== undefined) {
      const baseNotes = (notes !== undefined ? notes : payment.notes) || ''
      const keptLines = baseNotes
        .split('\n')
        .filter((line) => !line.startsWith(REJECTION_PREFIX))
        .join('\n')
        .trim()
      const reasonLine = rejectionReason ? `${REJECTION_PREFIX}${rejectionReason}` : ''

      data.notes = [keptLines, reasonLine].filter(Boolean).join('\n') || null
    }

    const updated = await prisma.payment.update({
      where: { id },
      data,
      include: {
        task: true,
        appointment: true,
        agent: true
      }
    })

    return sendSuccess(res, 'পেমেন্ট আপডেট সফল', withRejectionReason(updated))
  } catch (error) {
    return sendError(res, 'পেমেন্ট আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get payments by appointment ID
 * GET /api/appointments/:appointmentId/payments
 */
export const getPaymentsByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params

    const payments = await prisma.payment.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            taskStatus: true
          }
        },
        appointment: {
          select: {
            id: true,
            date: true,
            serviceType: true
          }
        },
        agent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return sendSuccess(res, 'পেমেন্টের তালিকা', payments.map(withRejectionReason))
  } catch (error) {
    return sendError(res, 'পেমেন্টের তালিকা আনতে সমস্যা হয়েছে', error.message)
  }
}
