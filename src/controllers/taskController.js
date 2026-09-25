import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Human-readable status labels shown on the agent's appointment card.
 * The super admin dashboard mirrors these EXACT labels so the admin can see
 * the same status text ("receive task", "receive patient", ...) the agent sees.
 */
export const TASK_STATUS_LABELS = {
  ASSIGNED: 'Assigned',
  RECEIVED: 'Receive Task',
  IN_PROGRESS: 'Receive Patient',
  SERVICE_COMPLETED: 'Service Completed',
  COMPLETED: 'Completed'
}

/**
 * Allowed task statuses (kept in sync with the workflow transitions below).
 */
export const ALLOWED_TASK_STATUSES = Object.keys(TASK_STATUS_LABELS)

/**
 * Get all tasks
 * GET /api/tasks
 */
export const getTasks = async (req, res) => {
  try {
    const where = req.agent ? { agentId: req.agent.id } : {}

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                name: true,
                phone: true,
                address: true
              }
            },
            doctor: {
              select: {
                name: true,
                specialization: true
              }
            }
          }
        },
        agent: {
          select: {
            id: true,
            name: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    const seen = new Map()
    const unique = tasks.filter((task) => {
      const key = task.appointmentId
      if (seen.has(key)) return false
      seen.set(key, task.id)
      return true
    })

    return sendSuccess(res, 'তাস্কের তালিকা', unique)
  } catch (error) {
    return sendError(res, 'তাস্কের তালিকা আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get task tracking for the dashboard.
 * GET /api/tasks/tracking
 *
 * WHY THIS EXISTS:
 * The agent clicks "Receive Task" -> PUT /api/tasks/:id/receive (taskStatus -> RECEIVED,
 * receiveTime set) and then "Receive Patient" -> PUT /api/tasks/:id/start (taskStatus ->
 * IN_PROGRESS, startTime set). These writes hit the SHARED `Task` table, so the super admin
 * can read the IDENTICAL status + timer data here — no extra sync is required.
 *
 * - super_admin / admin: sees EVERY task across EVERY agent (full task tracking view).
 * - agent:            sees only their own tasks (their own "timer"/"process").
 *
 * The response carries taskStatus, a human-readable displayStatus, and the timing
 * fields (receiveTime, startTime, endTime) plus a computed elapsedSeconds for the
 * running timer, so the super admin dashboard mirrors exactly what the agent sees.
 *
 * Optional query filters: ?agentId=  ?status=  ?date=
 */
export const getTaskTracking = async (req, res) => {
  try {
    if (!req.admin && !req.agent) {
      return sendError(res, 'অ্যাক্সেস আপাত্ত প্রয়োজন', 'Not authenticated', 401)
    }

    const { agentId, status: statusFilter, date } = req.query
    const where = {}

    // Agents can only see their own tasks.
    if (req.agent && !req.admin) {
      where.agentId = req.agent.id
    }

    // Admin-scoped filter (useful when the super admin drills into one agent).
    // Guarded by req.admin so an agent can never view another agent's tasks.
    if (agentId && req.admin) {
      where.agentId = agentId
    }

    if (statusFilter && ALLOWED_TASK_STATUSES.includes(statusFilter)) {
      where.taskStatus = statusFilter
    }

    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      where.updatedAt = { gte: startOfDay, lte: endOfDay }
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        agent: {
          select: { id: true, name: true, phone: true, email: true }
        },
        appointment: {
          include: {
            patient: { select: { name: true, phone: true, address: true } },
            doctor: { select: { name: true, specialization: true } },
            package: { select: { id: true, name: true, totalPrice: true, finalPrice: true } }
          }
        },
        payments: { orderBy: { createdAt: 'desc' } }
      }
    })

    const now = new Date()

    const tracking = tasks.map((task) => {
      // Elapsed seconds for the running timer — matches what the agent's
      // client computes locally, so the admin sees the same live timer.
      let elapsedSeconds = null
      if (task.taskStatus === 'IN_PROGRESS' && task.startTime) {
        elapsedSeconds = Math.floor((now.getTime() - new Date(task.startTime).getTime()) / 1000)
      }

      return {
        id: task.id,
        appointmentId: task.appointmentId,
        agentId: task.agentId,
        taskStatus: task.taskStatus,
        displayStatus: TASK_STATUS_LABELS[task.taskStatus] || task.taskStatus,
        receiveTime: task.receiveTime,
        startTime: task.startTime,
        endTime: task.endTime,
        elapsedSeconds,
        specialInstructions: task.specialInstructions,
        notes: task.notes,
        discountPercent: task.discountPercent,
        discountAmount: task.discountAmount,
        transactionId: task.transactionId,
        bkashNumber: task.bkashNumber,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        agent: task.agent,
        appointment: task.appointment,
        payments: task.payments
      }
    })

    return sendSuccess(res, 'টাস্ক ট্র্যাকিং', tracking)
  } catch (error) {
    return sendError(res, 'টাস্ক ট্র্যাকিং আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get a single task by ID
 * GET /api/tasks/:id
 */
export const getTask = async (req, res) => {
  try {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                name: true,
                phone: true,
                address: true
              }
            },
            doctor: {
              select: {
                name: true,
                specialization: true
              }
            }
          }
        },
        agent: {
          select: {
            id: true,
            name: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!task) {
      return sendError(res, 'তাস্ক পাওয়া যায়নি', 'Task not found', 404)
    }

    if (req.agent && task.agentId !== req.agent.id) {
      return sendError(res, 'আপনার অনুমতি নেই', 'Forbidden', 403)
    }

    return sendSuccess(res, 'তাস্ক তথ্য', task)
  } catch (error) {
    return sendError(res, 'তাস্ক আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update a task
 * PUT /api/tasks/:id
 */
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params
    const { specialInstructions, notes, discountPercent, discountAmount, transactionId, bkashNumber } = req.body

    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return sendError(res, 'তাস্ক পাওয়া যায়নি', 'Task not found', 404)
    }

    if (req.agent && task.agentId !== req.agent.id) {
      return sendError(res, 'আপনার অনুমতি নেই', 'Forbidden', 403)
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        specialInstructions: specialInstructions ?? task.specialInstructions,
        notes: notes ?? task.notes,
        discountPercent: discountPercent ?? task.discountPercent,
        discountAmount: discountAmount ?? task.discountAmount,
        transactionId: transactionId ?? task.transactionId,
        bkashNumber: bkashNumber ?? task.bkashNumber
      },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                name: true,
                phone: true,
                address: true
              }
            },
            doctor: {
              select: {
                name: true,
                specialization: true
              }
            }
          }
        },
        agent: {
          select: {
            id: true,
            name: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return sendSuccess(res, 'তাস্ক আপডেট সফল', updated)
  } catch (error) {
    return sendError(res, 'তাস্ক আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update task status
 * PUT /api/tasks/:id/status
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { taskStatus } = req.body

    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return sendError(res, 'তাস্ক পাওয়া যায়নি', 'Task not found', 404)
    }

    if (req.agent && task.agentId !== req.agent.id) {
      return sendError(res, 'আপনার অনুমতি নেই', 'Forbidden', 403)
    }

    const data = { taskStatus }

    if (taskStatus === 'RECEIVED') {
      data.receiveTime = new Date()
    }

    if (taskStatus === 'IN_PROGRESS') {
      data.startTime = new Date()
    }

    if (taskStatus === 'SERVICE_COMPLETED') {
      data.endTime = new Date()
    }

    const updated = await prisma.task.update({
      where: { id },
      data,
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                name: true,
                phone: true,
                address: true
              }
            },
            doctor: {
              select: {
                name: true,
                specialization: true
              }
            }
          }
        },
        agent: {
          select: {
            id: true,
            name: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (taskStatus === 'CANCELLED') {
      await prisma.appointment.update({
        where: { id: task.appointmentId },
        data: {
          status: 'cancelled',
          agentId: null,
        },
      })
    }

    return sendSuccess(res, 'তাস্ক স্ট্যাটাস আপডেট সফল', updated)
  } catch (error) {
    return sendError(res, 'তাস্ক স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Receive task - agent clicks receive button
 * PUT /api/tasks/:id/receive
 */
export const receiveTask = async (req, res) => {
  try {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return sendError(res, 'তাস্ক পাওয়া যায়নি', 'Task not found', 404)
    }

    if (req.agent && task.agentId !== req.agent.id) {
      return sendError(res, 'আপনার অনুমতি নেই', 'Forbidden', 403)
    }

    if (task.taskStatus !== 'ASSIGNED') {
      return sendError(res, 'এই তাস্ক ইতোমদ্য গৃহীত হয়েছে', 'Task already received', 400)
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        taskStatus: 'RECEIVED',
        receiveTime: new Date()
      },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                name: true,
                phone: true,
                address: true
              }
            },
            doctor: {
              select: {
                name: true,
                specialization: true
              }
            }
          }
        },
        agent: {
          select: {
            id: true,
            name: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return sendSuccess(res, 'তাস্ক গৃহীত হয়েছে', updated)
  } catch (error) {
    return sendError(res, 'তাস্ক গৃহীত করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Start task - agent clicks receive patient button
 * PUT /api/tasks/:id/start
 */
export const startTask = async (req, res) => {
  try {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return sendError(res, 'তাস্ক পাওয়া যায়নি', 'Task not found', 404)
    }

    if (req.agent && task.agentId !== req.agent.id) {
      return sendError(res, 'আপনার অনুমতি নেই', 'Forbidden', 403)
    }

    if (!['ASSIGNED', 'RECEIVED'].includes(task.taskStatus)) {
      return sendError(res, 'এই তাস্ক শুরু করা যাবে না', 'Task cannot be started', 400)
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        taskStatus: 'IN_PROGRESS',
        startTime: new Date()
      },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                name: true,
                phone: true,
                address: true
              }
            },
            doctor: {
              select: {
                name: true,
                specialization: true
              }
            }
          }
        },
        agent: {
          select: {
            id: true,
            name: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return sendSuccess(res, 'তাস্ক শুরু হয়েছে', updated)
  } catch (error) {
    return sendError(res, 'তাস্ক শুরু করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * End task - agent clicks end task button
 * PUT /api/tasks/:id/end
 */
export const endTask = async (req, res) => {
  try {
    const { id } = req.params
    const { discountAmount, transactionId, bkashNumber } = req.body

    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return sendError(res, 'তাস্ক পাওয়া যায়নি', 'Task not found', 404)
    }

    if (req.agent && task.agentId !== req.agent.id) {
      return sendError(res, 'আপনার অনুমতি নেই', 'Forbidden', 403)
    }

    if (task.taskStatus !== 'IN_PROGRESS') {
      return sendError(res, 'এই তাস্ক শেষ করা যাবে না', 'Task cannot be ended', 400)
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        taskStatus: 'SERVICE_COMPLETED',
        endTime: new Date(),
        discountAmount: discountAmount ?? task.discountAmount,
        transactionId: transactionId ?? task.transactionId,
        bkashNumber: bkashNumber ?? task.bkashNumber
      },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                name: true,
                phone: true,
                address: true
              }
            },
            doctor: {
              select: {
                name: true,
                specialization: true
              }
            }
          }
        },
        agent: {
          select: {
            id: true,
            name: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return sendSuccess(res, 'তাস্ক শেষ হয়েছে', updated)
  } catch (error) {
    return sendError(res, 'তাস্ক শেষ করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Approve task completion - super admin approves
 * PUT /api/tasks/:id/approve
 */
export const approveTask = async (req, res) => {
  try {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return sendError(res, 'তাস্ক পাওয়া যায়নি', 'Task not found', 404)
    }

    if (task.taskStatus !== 'SERVICE_COMPLETED') {
      return sendError(res, 'এই তাস্ক অনুমোদন করা যাবে না', 'Task cannot be approved', 400)
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        taskStatus: 'COMPLETED'
      },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                name: true,
                phone: true,
                address: true
              }
            },
            doctor: {
              select: {
                name: true,
                specialization: true
              }
            }
          }
        },
        agent: {
          select: {
            id: true,
            name: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return sendSuccess(res, 'তাস্ক সম্পূর্ণ সম্পন্ন হয়েছে', updated)
  } catch (error) {
    return sendError(res, 'তাস্ক অনুমোদন করতে সমস্যা হয়েছে', error.message)
  }
}
