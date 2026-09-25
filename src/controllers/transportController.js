import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'
import { sendEmail } from '../services/emailService.js'

export const getTransportPricings = async (req, res) => {
  try {
    const pricings = await prisma.transportPricing.findMany({
      orderBy: { vehicleType: 'asc' },
    })
    return sendSuccess(res, 'Transport pricing fetched', pricings)
  } catch (error) {
    return sendError(res, 'Failed to fetch transport pricing', error.message)
  }
}

export const upsertTransportPricing = async (req, res) => {
  try {
    const { vehicleType, label, price } = req.body

    if (!vehicleType || !label || price === undefined) {
      return sendError(res, 'vehicleType, label and price are required', null, 400)
    }

    const pricing = await prisma.transportPricing.upsert({
      where: { vehicleType },
      update: { label, price },
      create: { vehicleType, label, price },
    })

    return sendSuccess(res, 'Transport pricing saved', pricing)
  } catch (error) {
    return sendError(res, 'Failed to save transport pricing', error.message)
  }
}

export const createTransportBooking = async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      vehicleType,
      fromDestination,
      toDestination,
      travelDate,
      travelType,
      note,
    } = req.body

    if (!customerName || !customerEmail || !customerPhone || !vehicleType || !fromDestination || !toDestination || !travelDate) {
      return sendError(res, 'All required fields must be provided', null, 400)
    }

    const booking = await prisma.transportBooking.create({
      data: {
        customerName,
        customerEmail,
        customerPhone,
        vehicleType,
        fromDestination,
        toDestination,
        travelDate: new Date(travelDate),
        travelType: travelType || 'one_way',
        note: note || null,
      },
    })

    return sendSuccess(res, 'Transport booking submitted successfully', booking, 201)
  } catch (error) {
    return sendError(res, 'Failed to submit transport booking', error.message)
  }
}

export const getTransportBookings = async (req, res) => {
  try {
    const bookings = await prisma.transportBooking.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return sendSuccess(res, 'Transport bookings fetched', bookings)
  } catch (error) {
    return sendError(res, 'Failed to fetch transport bookings', error.message)
  }
}

export const getTransportBooking = async (req, res) => {
  try {
    const { id } = req.params

    const booking = await prisma.transportBooking.findUnique({
      where: { id },
    })

    if (!booking) {
      return sendError(res, 'Booking not found', 'Booking not found', 404)
    }

    return sendSuccess(res, 'Transport booking fetched', booking)
  } catch (error) {
    return sendError(res, 'Failed to fetch transport booking', error.message)
  }
}

export const approveTransportBooking = async (req, res) => {
  try {
    const { id } = req.params
    const { driverName, driverPhone, carType, carColor, carNumber, rentFee } = req.body

    const booking = await prisma.transportBooking.findUnique({
      where: { id },
    })

    if (!booking) {
      return sendError(res, 'Booking not found', 'Booking not found', 404)
    }

    if (booking.status !== 'PENDING') {
      return sendError(res, 'This booking cannot be approved', null, 400)
    }

    const updated = await prisma.transportBooking.update({
      where: { id },
      data: {
        status: 'APPROVED',
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        carType: carType || null,
        carColor: carColor || null,
        carNumber: carNumber || null,
        rentFee: rentFee !== undefined ? Number(rentFee) : null,
        approvedAt: new Date(),
      },
    })

    return sendSuccess(res, 'Transport booking approved', updated)
  } catch (error) {
    return sendError(res, 'Failed to approve transport booking', error.message)
  }
}

export const rejectTransportBooking = async (req, res) => {
  try {
    const { id } = req.params

    const booking = await prisma.transportBooking.findUnique({
      where: { id },
    })

    if (!booking) {
      return sendError(res, 'Booking not found', 'Booking not found', 404)
    }

    if (booking.status !== 'PENDING') {
      return sendError(res, 'This booking cannot be rejected', null, 400)
    }

    const updated = await prisma.transportBooking.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
    })

    return sendSuccess(res, 'Transport booking rejected', updated)
  } catch (error) {
    return sendError(res, 'Failed to reject transport booking', error.message)
  }
}

export const sendTransportInvoice = async (req, res) => {
  try {
    const { id } = req.params

    const booking = await prisma.transportBooking.findUnique({
      where: { id },
    })

    if (!booking) {
      return sendError(res, 'Booking not found', 'Booking not found', 404)
    }

    if (booking.status !== 'APPROVED') {
      return sendError(res, 'Invoice can only be sent for approved bookings', null, 400)
    }

    const dateStr = new Date(booking.travelDate).toLocaleString('en-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const subject = `${process.env.APP_NAME} - Transport Booking Invoice`
    const text = `Dear ${booking.customerName},\n\nYour transport booking has been approved.\n\nBooking ID: ${booking.id}\nVehicle Type: ${booking.vehicleType}\nFrom: ${booking.fromDestination}\nTo: ${booking.toDestination}\nDate: ${dateStr}\nTravel Type: ${booking.travelType === 'one_way' ? 'One Way' : 'Round Trip'}\nDriver: ${booking.driverName || 'N/A'}\nCar: ${booking.carType || 'N/A'} (${booking.carColor || 'N/A'})\nCar Number: ${booking.carNumber || 'N/A'}\nRent Fee: ${booking.rentFee || 0} BDT\n\nNote: ${booking.note || 'N/A'}\n\nThank you for choosing our service.`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${process.env.APP_NAME} - Transport Booking Invoice</h2>
        <p>Dear ${booking.customerName},</p>
        <p>Your transport booking has been approved. Here are the details:</p>
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Vehicle Type:</strong> ${booking.vehicleType}</p>
          <p><strong>From:</strong> ${booking.fromDestination}</p>
          <p><strong>To:</strong> ${booking.toDestination}</p>
          <p><strong>Date:</strong> ${dateStr}</p>
          <p><strong>Travel Type:</strong> ${booking.travelType === 'one_way' ? 'One Way' : 'Round Trip'}</p>
          <p><strong>Driver:</strong> ${booking.driverName || 'N/A'}</p>
          <p><strong>Car:</strong> ${booking.carType || 'N/A'} (${booking.carColor || 'N/A'})</p>
          <p><strong>Car Number:</strong> ${booking.carNumber || 'N/A'}</p>
          <p><strong>Rent Fee:</strong> ${booking.rentFee || 0} BDT</p>
          ${booking.note ? `<p><strong>Note:</strong> ${booking.note}</p>` : ''}
        </div>
        <p style="color: #6b7280;">Thank you for choosing our service. For any queries, please contact us.</p>
      </div>
    `

    await sendEmail(booking.customerEmail, subject, text, html)

    return sendSuccess(res, 'Invoice sent successfully')
  } catch (error) {
    return sendError(res, 'Failed to send invoice', error.message)
  }
}
