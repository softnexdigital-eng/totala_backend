import prisma from '../prisma/client.js'
import { sendOtpEmail } from './emailService.js'

/**
 * OTP Service - handles OTP generation, sending, and verification
 * OTP is sent to email only (not mobile)
 */

/**
 * Generate a random 6-digit OTP
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Create OTP record in database and send to email
 * @param {string} email - Admin's email address
 * @returns {Promise<string>} - The generated OTP
 */
export const createAndSendOTP = async (email) => {
  const otp = generateOtp()

  // Set expiry to 10 minutes from now
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  // Store OTP in database
  await prisma.oTP.create({
    data: {
      email,
      otp,
      expiresAt
    }
  })

  // Send OTP via email in the background (non-blocking) so the login
  // request responds instantly instead of waiting on Gmail SMTP (~6s).
  // Errors are caught here so a failed email never crashes the request.
  sendOtpEmail(email, otp).catch((error) => {
    console.error('Background OTP email failed:', error.message)
  })

  return otp
}

/**
 * Verify OTP for a given email
 * @param {string} email - Admin's email address
 * @param {string} otp - OTP to verify
 * @returns {Promise<boolean>} - True if valid
 */
export const verifyOTP = async (email, otp) => {
  // Find the most recent unused, unexpired OTP for this email
  const otpRecord = await prisma.oTP.findFirst({
    where: {
      email,
      otp,
      isUsed: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (!otpRecord) {
    throw new Error('অবৈধ OTP বা এটির মেয়াদ ওড়েছে অথবা ইউস করা হয়েছে')
  }

  // Mark OTP as used
  await prisma.oTP.update({
    where: { id: otpRecord.id },
    data: { isUsed: true }
  })

  return true
}

/**
 * Clean up expired OTPs (optional maintenance function)
 */
export const cleanupExpiredOTPs = async () => {
  await prisma.oTP.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  })
}

export default { createAndSendOTP, verifyOTP, cleanupExpiredOTPs }
