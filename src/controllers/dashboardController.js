import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * All dashboard money/date figures are anchored to Bangladesh local time
 * (UTC+6), matching the web dashboard which formats everything with the
 * `Asia/Dhaka` time zone.
 */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000

const dayRange = (now = new Date()) => {
  const shifted = new Date(now.getTime() + DHAKA_OFFSET_MS)
  shifted.setUTCHours(0, 0, 0, 0)

  const start = new Date(shifted.getTime() - DHAKA_OFFSET_MS)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)

  return { start, end }
}

/**
 * Dashboard summary - the single call used by the super-admin dashboard cards
 * on both the web and the mobile app.
 *
 * GET /api/dashboard/summary
 *
 * - todayAppointments: appointments scheduled for today
 * - todayTasks:        tasks created today
 * - completedTasks:    tasks completed today (endTime falls back to updatedAt)
 * - activeAgents:      active agent accounts
 * - pendingPayments:   payments waiting for the agent/hub (PENDING)
 * - paymentsUnderVerification: payments handed in and being checked
 * - todayIncome:       cleared payments collected today
 * - todayExpense:      refunds paid out today + discounts given today
 * - todayNet:          todayIncome - todayExpense
 */
export const getDashboardSummary = async (req, res) => {
  try {
    if (!req.admin && !req.agent) {
      return sendError(res, 'অ্যাক্সেস আপাত্ত প্রয়োজন', 'Not authenticated', 401)
    }

    const { start, end } = dayRange()
    const today = { gte: start, lte: end }

    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      totalAgents,
      todayAppointments,
      todayTasks,
      completedTasks,
      pendingPayments,
      paymentsUnderVerification,
      clearedToday,
      refundedToday,
      discountedToday,
      taskStatusRows
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.doctor.count(),
      prisma.appointment.count(),
      prisma.agent.count({ where: { isActive: true } }),
      prisma.appointment.count({ where: { date: today } }),
      prisma.task.count({ where: { createdAt: today } }),
      prisma.task.count({ where: { taskStatus: 'COMPLETED', OR: [{ endTime: today }, { completedAt: today }] } }),
      prisma.payment.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.payment.count({ where: { paymentStatus: { in: ['SUBMITTED', 'UNDER_VERIFICATION'] } } }),
      prisma.payment.findMany({
        where: { paymentStatus: { in: ['PAID_CLEARED', 'VERIFIED'] }, paymentDate: today },
        select: { amount: true }
      }),
      prisma.payment.findMany({
        where: { paymentStatus: 'REFUNDED', paymentDate: today },
        select: { amount: true }
      }),
      prisma.task.findMany({
        where: { endTime: today },
        select: { discountAmount: true }
      }),
      prisma.task.groupBy({ by: ['taskStatus'], _count: { _all: true } })
    ])

    const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)
    const todayIncome = sum(clearedToday, 'amount')
    const todayExpense = sum(refundedToday, 'amount') + sum(discountedToday, 'discountAmount')

    const taskStatusCounts = {}
    let totalTasks = 0
    taskStatusRows.forEach((row) => {
      taskStatusCounts[row.taskStatus] = row._count._all
      totalTasks += row._count._all
    })

    return sendSuccess(res, 'ড্যাশবোর্ড সারসংক্ষেপ', {
      date: start.toISOString().split('T')[0],
      todayAppointments,
      todayTasks,
      completedTasks,
      activeAgents: totalAgents,
      pendingPayments,
      paymentsUnderVerification,
      todayIncome,
      todayExpense,
      todayNet: todayIncome - todayExpense,
      totalPatients,
      totalDoctors,
      totalAppointments,
      totalAgents,
      totalTasks,
      taskStatusCounts
    })
  } catch (error) {
    return sendError(res, 'ড্যাশবোর্ড সারসংক্ষেপ আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Dashboard Stats
 * GET /api/dashboard
 * - Admin/super_admin: global counts (patients, doctors, appointments, agents)
 * - Agent: sees only their own appointments and related patients, plus total doctors
 */
export const getDashboardStats = async (req, res) => {
  try {
    if (req.admin) {
      const totalPatients = await prisma.patient.count()
      const totalDoctors = await prisma.doctor.count()
      const totalAppointments = await prisma.appointment.count()
      const totalAgents = await prisma.agent.count({ where: { isActive: true } })

      // Aggregate the live task-tracking breakdown so the super admin dashboard
      // can show how many tasks are at each stage of the agent workflow.
      // This stays in sync with the agent's "Receive Task" / "Receive Patient"
      // actions because both read/write the shared `Task` table.
      const taskStatusRows = await prisma.task.groupBy({
        by: ['taskStatus'],
        _count: { _all: true }
      })

      const taskStatusCounts = {}
      let totalTasks = 0
      taskStatusRows.forEach((row) => {
        taskStatusCounts[row.taskStatus] = row._count._all
        totalTasks += row._count._all
      })

      return sendSuccess(res, 'Dashboard statistics', {
        totalPatients,
        totalDoctors,
        totalAppointments,
        totalAgents,
        // Task tracking summary (super admin only).
        // Full per-task details -> GET /api/tasks/tracking
        totalTasks,
        taskStatusCounts,
        agentTasks: totalTasks
      })
    }

    if (req.agent) {
      const agentId = req.agent.id

      const totalDoctors = await prisma.doctor.count()
      const totalAppointments = await prisma.appointment.count({ where: { agentId } })
      const pendingAppointments = await prisma.appointment.count({ where: { agentId, status: 'pending' } })
      const agentPatientRows = await prisma.appointment.findMany({
        where: { agentId, patientId: { not: null } },
        select: { patientId: true }
      })

      const totalPatients = new Set(agentPatientRows.map((a) => a.patientId)).size

      // The agent's own task-tracking breakdown (mirrors what the buttons do:
      // receive task -> RECEIVED, receive patient -> IN_PROGRESS, end -> COMPLETED...).
      const agentTaskRows = await prisma.task.groupBy({
        by: ['taskStatus'],
        where: { agentId },
        _count: { _all: true }
      })
      const agentTaskStatusCounts = {}
      let totalAgentTasks = 0
      agentTaskRows.forEach((row) => {
        agentTaskStatusCounts[row.taskStatus] = row._count._all
        totalAgentTasks += row._count._all
      })

      return sendSuccess(res, 'Dashboard statistics', {
        totalPatients,
        totalDoctors,
        totalAppointments,
        pendingAppointments,
        totalAgentTasks,
        agentTaskStatusCounts
      })
    }

    return sendError(res, 'অ্যাক্সেস আপাত্ত প্রয়োজন', 'Not authenticated', 401)
  } catch (error) {
    return sendError(res, 'ড্যাশবোর্ড তথ্য আনতে সমস্যা হয়েছে', error.message)
  }
}
