import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Public Controller - handles the unauthenticated endpoints that power the
 * patient-facing website (the "Our Trusted Agents" directory on the landing
 * page). Only non-sensitive agent fields are exposed here.
 */

// A task is considered finished once it reaches the final workflow status.
const COMPLETED_TASK_STATUS = 'COMPLETED'

/**
 * Get the publicly listed (active) agents
 * GET /api/public-agents
 */
export const getPublicAgents = async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          select: { taskStatus: true }
        }
      }
    })

    const publicAgents = agents.map((agent) => {
      const tasks = agent.tasks || []

      return {
        id: agent.id,
        name: agent.name,
        // The Agent model has no area/services/rating columns yet, so the
        // directory reports neutral values instead of inventing data.
        area: null,
        services: [],
        averageRating: 0,
        completedTasks: tasks.filter((task) => task.taskStatus === COMPLETED_TASK_STATUS).length,
        isActive: agent.isActive,
        createdAt: agent.createdAt
      }
    })

    return sendSuccess(res, 'এজেন্টদের তালিকা', publicAgents)
  } catch (error) {
    return sendError(res, 'এজেন্টদের তালিকা আনতে সমস্যা হয়েছে', error.message)
  }
}
