import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../prisma/client.js'
import { createAndSendOTP, verifyOTP } from '../services/otpService.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Auth Controller - handles admin registration, login with OTP, and profile management
 */

/**
 * Register a new admin
 * POST /api/auth/register
 * Body: { name, email, password, whatsappNumber? }
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, whatsappNumber } = req.body

    // Check if admin already exists with this email
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    })

    if (existingAdmin) {
      return sendError(res, 'এই ইমেল দিয়ে অ্যাডমিন ইতোমদ্য আছে', 'Admin already exists', 400)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        whatsappNumber: whatsappNumber || null
      }
    })

    return sendSuccess(
      res,
      'অ্যাডমিন রেজিস্টার সফল',
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        whatsappNumber: admin.whatsappNumber
      },
      201
    )
  } catch (error) {
    return sendError(res, 'রেজিস্টার করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Login - verify credentials and send OTP to email
 * POST /api/auth/login
 * Body: { email, password }
 * OTP is sent to email only (not mobile)
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Find admin by email
    const admin = await prisma.admin.findUnique({
      where: { email }
    })

    if (!admin) {
      return sendError(res, 'অ্যাডমিন পাওয়া যায়নি', 'Admin not found', 404)
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password)

    if (!isMatch) {
      return sendError(res, 'পাসওয়ার্ড ভুল', 'Password mismatch', 401)
    }

    // Create and send OTP to email (OTP goes to email only, not mobile)
    await createAndSendOTP(email)

    return sendSuccess(res, 'OTP ইমেলে পাঠানো হয়েছে', { email })
  } catch (error) {
    return sendError(res, 'লগিন করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Verify OTP and return JWT token
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body

    // Verify OTP
    await verifyOTP(email, otp)

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email }
    })

    if (!admin) {
      return sendError(res, 'অ্যাডমিন পাওয়া যায়নি', 'Admin not found', 404)
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    )

    return sendSuccess(res, 'লগিন সফল', {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        whatsappNumber: admin.whatsappNumber
      }
    })
  } catch (error) {
    return sendError(res, 'OTP ভেরিফিকেশন ব্যর্থ', error.message, 401)
  }
}

/**
 * Get current admin profile
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        whatsappNumber: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!admin) {
      return sendError(res, 'অ্যাডমিন পাওয়া যায়নি', 'Admin not found', 404)
    }

    return sendSuccess(res, 'অ্যাডমিন তথ্য', admin)
  } catch (error) {
    return sendError(res, 'তথ্য আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Change admin password
 * PUT /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id }
    })

    if (!admin) {
      return sendError(res, 'অ্যাডমিন পাওয়া যায়নি', 'Admin not found', 404)
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password)

    if (!isMatch) {
      return sendError(res, 'বর্তমান পাসওয়ার্ড ভুল', 'Current password mismatch', 401)
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    })

    return sendSuccess(res, 'পাসওয়ার্ড আপডেট সফল')
  } catch (error) {
    return sendError(res, 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Logout - client should remove the token
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  return sendSuccess(res, 'লগআউট সফল')
}
