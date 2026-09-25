import express from 'express'
import {
  getTasks,
  getTaskTracking,
  getTask,
  updateTask,
  updateTaskStatus,
  receiveTask,
  startTask,
  endTask,
  approveTask
} from '../controllers/taskController.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Task Routes
 * GET /api/tasks - Get all tasks (agent scoped / admin global)
 * GET /api/tasks/tracking - Get task-tracking view for the dashboard
 *   (super admin sees all agents; agent sees only own tasks)
 * GET /api/tasks/:id - Get a single task
 * PUT /api/tasks/:id - Update a task
 * PUT /api/tasks/:id/status - Update task status
 * PUT /api/tasks/:id/receive - Agent receives task
 * PUT /api/tasks/:id/start - Agent starts task/receives patient
 * PUT /api/tasks/:id/end - Agent ends task
 * PUT /api/tasks/:id/approve - Super admin approves task completion
 */

router.use(auth)

router.get('/', getTasks)
// `/tracking` must be declared BEFORE `/:id` so it is not shadowed.
router.get('/tracking', getTaskTracking)
router.get('/:id', getTask)
router.put('/:id', updateTask)
router.put('/:id/status', updateTaskStatus)
router.put('/:id/receive', receiveTask)
router.put('/:id/start', startTask)
router.put('/:id/end', endTask)
router.put('/:id/approve', approveTask)

export default router
