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

const post = async (path, body) => {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  console.log(res.status, path, '->', JSON.stringify(json).slice(0, 500))
  return json
}

// 1) Doctor create exactly like the current web form / controller fields
const created = await post('/doctors', {
  name: 'ZZ Test Doctor (tmp)',
  specialization: 'Medicine',
  fee: 500,
  hospital: 'ZZ Test Hospital',
  phone: '01999999999'
})

// 2) Patient create
await post('/patients', { name: 'ZZ Test Patient (tmp)', phone: '01888888888', age: 30, address: 'N/A' })

if (created && created.data && created.data.id) {
  const del = await fetch(`${BASE}/doctors/${created.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  console.log('cleanup doctor:', del.status)
}

await prisma.$disconnect()
