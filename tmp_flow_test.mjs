import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()

const BASE = 'http://localhost:5000/api'
const prisma = new PrismaClient()
const admin = await prisma.admin.findFirst({ where: { email: process.env.ADMIN_EMAIL } })
const token = jwt.sign(
  { id: admin.id, email: admin.email, role: admin.role, type: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
)

const send = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  })
  const json = await res.json()
  console.log(
    `${method} ${path} -> ${res.status} ${json.success} :: ${json.message} ::`,
    JSON.stringify(json.data).slice(0, 220)
  )
  if (!json.success) console.log('   ERR:', String(json.error).slice(0, 300))
  return json
}

const patient = await prisma.patient.findFirst({ where: { phone: '01888888888' } })
const doctor = await prisma.doctor.findFirst()
const agent = await prisma.agent.findFirst()
const pkg = await prisma.package.findFirst()

console.log('ids:', patient?.id, doctor?.id, agent?.id, pkg?.id)

// Appointment create (with package)
const appt = await send('POST', '/appointments', {
  patientId: patient.id,
  doctorId: doctor.id,
  agentId: agent.id,
  hospital: doctor.hospital || 'Test Hospital',
  date: new Date().toISOString(),
  serviceType: 'package',
  serviceFee: 50,
  packageId: pkg ? pkg.id : undefined,
  packagePrice: pkg ? pkg.totalPrice : undefined,
  packageDiscount: pkg ? pkg.discountPercent : undefined,
  notes: 'tmp appointment (api smoke test)'
})

// Test create
if (appt.success) {
  await send('POST', '/tests', { appointmentId: appt.data.id, testName: 'ZZ tmp test', actualCost: 100, discountPercent: 10 })
}

// Payment create + reject needs a task
const task = await prisma.task.findFirst({ include: { payments: true } })
if (task) {
  const payment = await send('POST', '/payments', {
    taskId: task.id,
    appointmentId: task.appointmentId,
    agentId: task.agentId,
    amount: 100,
    paymentMethod: 'bkash',
    transactionId: 'ZZTMP1',
    senderNumber: '01700000000'
  })
  if (payment.success) {
    await send('PUT', `/payments/${payment.data.id}`, { paymentStatus: 'REJECTED', rejectionReason: 'tmp reject reason' })
    await send('PUT', `/payments/${payment.data.id}`, { paymentStatus: 'VERIFIED' })
    await prisma.payment.delete({ where: { id: payment.data.id } })
    console.log('cleanup payment ok')
  }
}

// Task status transitions on the tmp appointment task
if (appt.success) {
  const t = await prisma.task.findFirst({ where: { appointmentId: appt.data.id } })
  if (t) {
    await send('PUT', `/tasks/${t.id}/receive`)
    await send('PUT', `/tasks/${t.id}/start`)
    await send('PUT', `/tasks/${t.id}/end`, { discountAmount: 10, transactionId: 'ZZTMP2', bkashNumber: '01700000001' })
    await send('PUT', `/tasks/${t.id}/approve`)
    await prisma.payment.deleteMany({ where: { taskId: t.id } })
    await prisma.task.delete({ where: { id: t.id } })
  }
  await prisma.test.deleteMany({ where: { appointmentId: appt.data.id } })
  await prisma.appointment.delete({ where: { id: appt.data.id } })
  console.log('cleanup appointment ok')
}

await prisma.patient.deleteMany({ where: { phone: '01888888888' } })
await prisma.$disconnect()

// Booking assign + transport list routes used by the dashboards
console.log('--- extra list routes ---')
for (const p of ['/bookings', '/transport/bookings', '/transport/pricing']) {
  const res = await fetch(BASE + p, { headers: { Authorization: `Bearer ${token}` } })
  const j = await res.json()
  console.log(p, res.status, j.success, Array.isArray(j.data) ? `array(${j.data.length})` : typeof j.data)
}
