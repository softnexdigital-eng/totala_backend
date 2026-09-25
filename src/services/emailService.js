import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Nodemailer transporter using Gmail SMTP
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 */
export const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      text,
      html
    })
    console.log(`📧 Email sent to ${to}: ${info.messageId}`)
    return info
  } catch (error) {
    console.error('Email send error:', error)
    throw new Error('ইমেল পাঠাতে সমস্যা হয়েছে')
  }
}

/**
 * Send OTP to admin's email (OTP goes to email only, not mobile)
 * @param {string} email - Admin's email
 * @param {string} otp - OTP code
 */
export const sendOtpEmail = async (email, otp) => {
  const subject = `${process.env.APP_NAME} - লগিন OTP`
  const text = `আপনার ${process.env.APP_NAME} লগিন OTP: ${otp}\n\nএটি ১০ মিনিটের জন্য বৈধ।\n\nযদি আপনি এই অনুরোধটি করেননি, অনুগ্রহ যোগ করে আমাকে জানান।`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">${process.env.APP_NAME} - লগিন OTP</h2>
      <p>আপনার লগিন OTP কোড:</p>
      <h1 style="font-size: 32px; color: #2563eb; letter-spacing: 4px; background: #f3f4f6; padding: 16px 32px; border-radius: 8px; display: inline-block;">${otp}</h1>
      <p style="color: #6b7280; margin-top: 16px;">এই কোডটি ১০ মিনিটের জন্য বৈধ।</p>
      <p style="color: #6b7280;">যদি আপনি এই অনুরোধটি করেননি, অনুগ্রহ করে আমাকে জানান।</p>
    </div>
  `
  return sendEmail(email, subject, text, html)
}

/**
 * Send appointment confirmation email
 * @param {string} email - Patient's email
 * @param {object} appointment - Appointment details
 */
export const sendAppointmentConfirmation = async (email, appointment) => {
  const subject = `${process.env.APP_NAME} - অ্যাপয়েন্টমেন্ট নিশ্চিত`
  const dateStr = new Date(appointment.date).toLocaleString('en-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  const text = `আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে!\n\nতারিখ: ${dateStr}\nডাক্তার: ${appointment.doctor.name}\nসেবার ধরন: ${appointment.serviceType === 'online' ? 'অনলাইন' : 'প্যাকেজ'}\nফি: ${appointment.serviceFee} টাকা`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">${process.env.APP_NAME} - অ্যাপয়েন্টমেন্ট নিশ্চিত</h2>
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p><strong>তারিখ:</strong> ${dateStr}</p>
        <p><strong>ডাক্তার:</strong> ${appointment.doctor.name} (${appointment.doctor.specialization})</p>
        <p><strong>সেবার ধরন:</strong> ${appointment.serviceType === 'online' ? 'অনলাইন' : 'প্যাকেজ'}</p>
        <p><strong>সেবার ফি:</strong> ${appointment.serviceFee} টাকা</p>
        ${appointment.notes ? `<p><strong>নোট:</strong> ${appointment.notes}</p>` : ''}
      </div>
      <p style="color: #6b7280;">অ্যাপয়েন্টমেন্টটি সম্পন্ন করতে আজই আসবেন। ধন্যবাদান্তে জানাই আমাদের জন্য সেবা ব্যবহার করার জন্য।</p>
    </div>
  `
  return sendEmail(email, subject, text, html)
}

/**
 * Send appointment reminder email
 * @param {string} email - Patient's email
 * @param {object} appointment - Appointment details
 */
export const sendAppointmentReminder = async (email, appointment) => {
  const subject = `${process.env.APP_NAME} - অ্যাপয়েন্টমেন্ট রিমাইন্ডার`
  const dateStr = new Date(appointment.date).toLocaleString('en-BD')
  const text = `আপনার অ্যাপয়েন্টমেন্টের রিমাইন্ডার\n\nতারিখ: ${dateStr}\nডাক্তার: ${appointment.doctor.name}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">${process.env.APP_NAME} - রিমাইন্ডার</h2>
      <p>আপনার একটি অ্যাপয়েন্টমেন্ট আছে।</p>
      <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p><strong>তারিখ:</strong> ${dateStr}</p>
        <p><strong>ডাক্তার:</strong> ${appointment.doctor.name} (${appointment.doctor.specialization})</p>
      </div>
      <p style="color: #6b7280;">দয়া করে সময় মেনে চলুন।</p>
    </div>
  `
  return sendEmail(email, subject, text, html)
}

export default { sendEmail, sendOtpEmail, sendAppointmentConfirmation, sendAppointmentReminder }
