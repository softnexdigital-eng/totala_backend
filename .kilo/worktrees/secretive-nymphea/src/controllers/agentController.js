import prisma from '../prisma/client.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Agent Controller - handles CRUD for agent records and agent authentication
 */

/**
 * Create a new agent
 * POST /api/agents
 */
export const createAgent = async (req, res) => {
  try {
    const { name, phone, email, password, isActive } = req.body

    const existingAgent = await prisma.agent.findUnique({
      where: { phone }
    })

    if (existingAgent) {
      return sendError(res, 'এই ফোন নাম্বে এজেন্ট ইতোমদ্য আছে', 'Agent already exists', 400)
    }

    const data = {
      name,
      phone,
      email: email || null,
      isActive: isActive !== undefined ? isActive : true
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }

    const agent = await prisma.agent.create({
      data
    })

    const permissions = agent.permissions ? JSON.parse(agent.permissions) : {}

    return sendSuccess(res, 'এজেন্ট তৈরি সফল', {
      ...agent,
      permissions
    }, 201)
  } catch (error) {
    if (error.code === 'P2002') {
      return sendError(res, 'এই ফোন নাম্বে এজেন্ট ইতোমদ্য আছে', 'Duplicate phone number', 400)
    }
    return sendError(res, 'এজেন্ট তৈরিতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get all agents
 * GET /api/agents
 */
export const getAgents = async (req, res) => {
  try {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' },
    include: { appointments: true }
  })

  const agentsWithPermissions = agents.map((agent) => ({
    ...agent,
    permissions: agent.permissions ? JSON.parse(agent.permissions) : {}
  }))

  return sendSuccess(res, 'এজেন্টদের তালিকা', agentsWithPermissions)
  } catch (error) {
    return sendError(res, 'এজেন্টদের তালিকা আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get a single agent by ID
 * GET /api/agents/:id
 */
export const getAgent = async (req, res) => {
  try {
    const { id } = req.params

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { appointments: true }
    })

    if (!agent) {
      return sendError(res, 'এজেন্ট পাওয়া যায়নি', 'Agent not found', 404)
    }

    const permissions = agent.permissions ? JSON.parse(agent.permissions) : {}

    return sendSuccess(res, 'এজেন্ট তথ্য', {
      ...agent,
      permissions
    })
  } catch (error) {
    return sendError(res, 'এজেন্ট তথ্য আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update an agent
 * PUT /api/agents/:id
 */
export const updateAgent = async (req, res) => {
  try {
    const { id } = req.params
    const { name, phone, email, isActive, password } = req.body

    const existingAgent = await prisma.agent.findUnique({
      where: { id }
    })

    if (!existingAgent) {
      return sendError(res, 'এজেন্ট পাওয়া যায়নি', 'Agent not found', 404)
    }

    if (phone && phone !== existingAgent.phone) {
      const phoneTaken = await prisma.agent.findUnique({
        where: { phone }
      })
      if (phoneTaken) {
        return sendError(res, 'এই ফোন নাম্বে অন্য এজেন্ট আছে', 'Phone already in use', 400)
      }
    }

    const data = {
      name,
      phone,
      email: email || null,
      isActive: isActive !== undefined ? isActive : existingAgent.isActive
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }

    const updated = await prisma.agent.update({
      where: { id },
      data
    })

    return sendSuccess(res, 'এজেন্ট আপডেট সফল', updated)
  } catch (error) {
    if (error.code === 'P2002') {
      return sendError(res, 'এই ফোন নাম্বে অন্য এজেন্ট আছে', 'Phone already in use', 400)
    }
    return sendError(res, 'এজেন্ট আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Delete an agent
 * DELETE /api/agents/:id
 */
export const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params

    const existingAgent = await prisma.agent.findUnique({
      where: { id }
    })

    if (!existingAgent) {
      return sendError(res, 'এজেন্ট পাওয়া যায়নি', 'Agent not found', 404)
    }

    await prisma.agent.delete({
      where: { id }
    })

    return sendSuccess(res, 'এজেন্ট ডিলিট সফল')
  } catch (error) {
    return sendError(res, 'এজেন্ট ডিলিট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Agent Login - verify credentials and return JWT token
 * POST /api/agents/login
 * Body: { email, password }
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return sendError(res, 'ইমেল এবং পাসওয়ার্ড প্রয়োজন', 'Email and password required', 400)
    }

    const agent = await prisma.agent.findFirst({
      where: { email }
    })

    if (!agent || !agent.password) {
      return sendError(res, 'অবৈধ ইমেল বা পাসওয়ার্ড', 'Invalid email or password', 401)
    }

    const isMatch = await bcrypt.compare(password, agent.password)

    if (!isMatch) {
      return sendError(res, 'পাসওয়ার্ড ভুল', 'Password mismatch', 401)
    }

    if (!agent.isActive) {
      return sendError(res, 'অ্যাকাউন্ট নিষ্ক্রিয়', 'Account is inactive', 401)
    }

    const token = jwt.sign(
      { id: agent.id, email: agent.email, name: agent.name, type: 'agent' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    )

    const permissions = agent.permissions ? JSON.parse(agent.permissions) : {}

    return sendSuccess(res, 'লগিন সফল', {
      token,
      agent: {
        id: agent.id,
        email: agent.email,
        name: agent.name,
        phone: agent.phone,
        isActive: agent.isActive,
        permissions
      }
    })
  } catch (error) {
    return sendError(res, 'লগিন করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get current agent profile
 * GET /api/agents/me
 */
export const getMe = async (req, res) => {
  try {
    if (!req.agent) {
      return sendError(res, 'অ্যাক্সেস আপাত্ত প্রয়োজন', 'Not authenticated as agent', 401)
    }

    const agent = await prisma.agent.findUnique({
      where: { id: req.agent.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!agent) {
      return sendError(res, 'এজেন্ট পাওয়া যায়নি', 'Agent not found', 404)
    }

    const permissions = agent.permissions ? JSON.parse(agent.permissions) : {}

    return sendSuccess(res, 'এজেন্ট তথ্য', {
      ...agent,
      permissions
    })
  } catch (error) {
    return sendError(res, 'তথ্য আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get permission structure
 * GET /api/agents/permissions/structure
 */
export const getPermissionsStructure = async (req, res) => {
  try {
    const structure = {
      dashboard: { label: 'Dashboard', description: 'Dashboard overview access' },
      patients: { label: 'Patients', description: 'Create, edit, view patients' },
      doctors: { label: 'Doctors', description: 'Manage doctors' },
      agents: { label: 'Agents', description: 'Manage agents' },
      packages: { label: 'Packages', description: 'Manage packages' },
      appointments: { label: 'Appointments', description: 'Manage appointments' },
      doctorBooking: { label: 'Doctor Booking', description: 'Doctor booking access' },
      tests: { label: 'Tests', description: 'Manage tests' },
      reports: { label: 'Reports', description: 'View reports' },
      permissions: { label: 'Permissions', description: 'Manage agent permissions' }
    }

    return sendSuccess(res, 'Permission structure', structure)
  } catch (error) {
    return sendError(res, 'Permission structure আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Update agent permissions
 * PUT /api/agents/:id/permissions
 * Body: { permissions: { dashboard: true, patients: false, ... } }
 */
export const updatePermissions = async (req, res) => {
  try {
    const { id } = req.params
    const { permissions } = req.body

    if (!permissions || typeof permissions !== 'object') {
      return sendError(res, 'পারমিশন অবশ্যই অবজেক্ট হতে হবে', 'Permissions must be an object', 400)
    }

    const agent = await prisma.agent.findUnique({
      where: { id }
    })

    if (!agent) {
      return sendError(res, 'এজেন্ট পাওয়া যায়নি', 'Agent not found', 404)
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        permissions: JSON.stringify(permissions)
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const parsedPermissions = updated.permissions ? JSON.parse(updated.permissions) : {}

    return sendSuccess(res, 'পারমিশন আপডেট সফল', {
      ...updated,
      permissions: parsedPermissions
    })
  } catch (error) {
    return sendError(res, 'পারমিশন আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}
