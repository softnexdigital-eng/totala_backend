import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

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
