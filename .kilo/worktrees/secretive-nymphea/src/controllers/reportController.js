import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Get daily report
 * GET /api/reports/daily?date=YYYY-MM-DD
 */
export const getDailyReport = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0]

    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        patient: true,
        doctor: true,
        agent: true,
        tests: true
      }
    })

    const totalAppointments = appointments.length
    const totalPatients = new Set(appointments.map(a => a.patientId).filter(Boolean)).size
    const totalRevenue = appointments.reduce((sum, a) => sum + (a.serviceFee || 0), 0)

    return sendSuccess(res, 'দৈনিক রিপোর্ট', {
      date,
      totalAppointments,
      totalPatients,
      totalRevenue,
      appointments
    })
  } catch (error) {
    return sendError(res, 'রিপোর্ট আনতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Get monthly report
 * GET /api/reports/monthly?month=YYYY-MM
 */
export const getMonthlyReport = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7)

    const [year, monthNum] = month.split('-').map(Number)
    const startDate = new Date(year, monthNum - 1, 1)
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        patient: true,
        doctor: true,
        agent: true,
        tests: true
      }
    })

    const totalAppointments = appointments.length
    const totalPatients = new Set(appointments.map(a => a.patientId).filter(Boolean)).size
    const totalRevenue = appointments.reduce((sum, a) => sum + (a.serviceFee || 0), 0)

    return sendSuccess(res, 'মাসিক রিপোর্ট', {
      month,
      totalAppointments,
      totalPatients,
      totalRevenue,
      appointments
    })
  } catch (error) {
    return sendError(res, 'রিপোর্ট আনতে সমস্যা হয়েছে', error.message)
  }
}
