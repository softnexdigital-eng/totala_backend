import jwt from 'jsonwebtoken'
import prisma from '../prisma/client.js'
import { sendError } from '../utils/responseHandler.js'

/**
 * Auth middleware - accepts both admin and agent JWT tokens
 * Attaches decoded info to req.admin or req.agent
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'অ্যাক্সেস আপাত্ত প্রয়োজন', 'No token provided', 401)
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (decoded.type === 'agent') {
      // Always load the latest agent from the database instead of relying on
      // the permissions snapshot baked into the JWT at login time. This way
      // permission changes made by the super admin take effect on the very
      // next request — no logout/login required.
      const liveAgent = await prisma.agent.findUnique({
        where: { id: decoded.id }
      })

      if (!liveAgent || !liveAgent.isActive) {
        return sendError(res, 'অ্যাক্সেস আপাত্ত প্রয়োজন', 'Agent not found or inactive', 401)
      }

      req.agent = {
        ...decoded,
        id: liveAgent.id,
        email: liveAgent.email,
        name: liveAgent.name,
        phone: liveAgent.phone,
        isActive: liveAgent.isActive,
        permissions: liveAgent.permissions || {}
      }
    } else {
      // Phase 2: load the latest admin record so audit logs can store the
      // real user name and the current role (role changes take effect
      // immediately, without requiring a new login).
      const liveAdmin = await prisma.admin.findUnique({
        where: { id: decoded.id }
      })

      if (!liveAdmin) {
        return sendError(res, 'অ্যাক্সেস আপাত্ত প্রয়োজন', 'Admin not found', 401)
      }

      req.admin = {
        ...decoded,
        id: liveAdmin.id,
        email: liveAdmin.email,
        name: liveAdmin.name,
        role: liveAdmin.role
      }
    }

    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'টোকেন মেয়াদ উত্তীর্ণ', 'Token expired', 401)
    }
    return sendError(res, 'অবৈধ টোকেন', 'Invalid token', 401)
  }
}

/**
 * Role-based authorization middleware
 * Usage: authRole('super_admin')
 */
export const authRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return sendError(res, 'অ্যাক্সেস আপাত্ত প্রয়োজন', 'Not authenticated', 401)
    }
    if (!roles.includes(req.admin.role)) {
      return sendError(res, 'আপনার অনুমতি নেই', 'Forbidden', 403)
    }
    next()
  }
}

export default auth
