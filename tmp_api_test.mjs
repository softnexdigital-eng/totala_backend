import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()

const BASE = 'http://localhost:5000/api'
const prisma = new PrismaClient()

const call = async (path, token) => {
  const res = await fetch(BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  let body = null
  try {
    body = await res.json()
  } catch (e) {
    body = { parseError: e.message }
  }
  const size =
    body && body.data
      ? Array.isArray(body.data)
        ? `array(${body.data.length})`
        : `keys(${Object.keys(body.data).slice(0, 10).join(',')})`
      : 'null'
  console.log(`${res.status} ${path} -> ${body && body.success} :: ${size} :: ${body && body.message}`)
  if (!res.ok) console.log('   ERR:', JSON.stringify(body && (body.error || body.message)).slice(0, 400))
  return body
}

const main = async () => {
  const admin = await prisma.admin.findFirst({ where: { email: process.env.ADMIN_EMAIL } })
  const adminToken = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role, type: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )

  const agent = await prisma.agent.findFirst({ where: { email: 'test.agent@example.com' } })
  const agentToken = jwt.sign(
    { id: agent.id, email: agent.email, name: agent.name, type: 'agent' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )

  console.log('--- ADMIN ---')
  await call('/dashboard', adminToken)
  await call('/auth/me', adminToken)
  await call('/patients', adminToken)
  await call('/doctors', adminToken)
  await call('/agents', adminToken)
  await call('/agents/permissions/structure', adminToken)
  await call('/appointments', adminToken)
  await call('/tasks', adminToken)
  await call('/tasks/tracking', adminToken)
  await call('/payments', adminToken)
  await call('/tests', adminToken)
  await call('/packages', adminToken)
  await call('/bookings', adminToken)
  await call('/transport/bookings/list', adminToken)
  await call('/transport/pricing', adminToken)
  await call('/reports/daily', adminToken)
  await call('/reports/monthly', adminToken)
  await call('/dashboard/summary', adminToken)
  await call('/ratings', adminToken)
  await call('/audit-logs', adminToken)

  console.log('--- AGENT ---')
  await call('/agents/me', agentToken)
  await call('/dashboard', agentToken)
  await call('/tasks', agentToken)
  await call('/tasks/tracking', agentToken)
  await call('/appointments', agentToken)
  await call('/payments', agentToken)
  await call('/patients', agentToken)
  await call('/reports/daily', agentToken)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('FATAL', e)
  await prisma.$disconnect()
})
