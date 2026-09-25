import prisma from '../prisma/client.js'
import bcrypt from 'bcryptjs'

/**
 * Auto Verification Service
 * After 7 days, appointments with status "pending" are automatically
 * marked as "completed"
 */

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Check and auto-complete appointments that are older than 7 days
 * @returns {Promise<{updated: number}>} - Number of appointments updated
 */
export const runAutoVerification = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_IN_MS)

    const result = await prisma.appointment.updateMany({
      where: {
        status: 'pending',
        date: { lt: sevenDaysAgo }
      },
      data: {
        status: 'completed'
      }
    })

    if (result.count > 0) {
      console.log(`🔄 Auto-verification: ${result.count} appointment(s) marked as completed`)
    }

    return { updated: result.count }
  } catch (error) {
    console.error('Auto-verification error:', error)
    return { updated: 0, error: error.message }
  }
}

/**
 * Start the auto-verification scheduler
 * Runs every 6 hours
 */
export const startAutoVerificationScheduler = () => {
  // Run immediately on startup
  runAutoVerification()

  // Then run every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000
  setInterval(() => {
    runAutoVerification()
  }, SIX_HOURS)

  console.log('⏰ Auto-verification scheduler started (every 6 hours)')
}

export default { runAutoVerification, startAutoVerificationScheduler }
