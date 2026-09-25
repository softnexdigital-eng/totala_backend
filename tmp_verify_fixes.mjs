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
  console.log(`${method} ${path} -> ${res.status} ${json.success} :: ${json.message}`)
  console.log('   data:', JSON.stringify(json.data).slice(0, 300))
  if (!json.success) console.log('   ERR:', String(json.error).slice(0, 250))
  return json
}

console.log('=== dashboard summary ===')
await send('GET', '/dashboard/summary')

console.log('=== doctor CRUD (web field names) ===')
const created = await send('POST', '/doctors', {
  name: 'ZZ Tmp Doctor',
  designation: 'Consultant',
  specialty: 'Medicine',
  consultationFee: 800,
  hospital: 'ZZ Hospital',
  phone: '01199990011'
})
if (created.success) {
  await send('PUT', `/doctors/${created.data.id}`, { name: 'ZZ Tmp Doctor', specialty: 'Cardiology', consultationFee: 900, hospital: 'ZZ Hospital 2' })
  await send('DELETE', `/doctors/${created.data.id}`)
}

console.log('=== payment reject flow ===')
const task = await prisma.task.findFirst()
if (task) {
  const p = await send('POST', '/payments', {
    taskId: task.id,
    appointmentId: task.appointmentId,
    agentId: task.agentId,
    amount: 50,
    paymentMethod: 'BKASH',
    transactionId: 'ZZTMP9',
    senderNumber: '01700000009',
    notes: 'smoke test'
  })
  if (p.success) {
    await send('PUT', `/payments/${p.data.id}`, { paymentStatus: 'REJECTED', rejectionReason: 'Amount mismatch' })
    await send('PUT', `/payments/${p.data.id}`, { paymentStatus: 'UNDER_VERIFICATION' })
    await prisma.payment.delete({ where: { id: p.data.id } })
    console.log('cleanup payment ok')
  }
}

await prisma.$disconnect()
