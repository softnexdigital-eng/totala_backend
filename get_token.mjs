import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

dotenv.config()

const prisma = new PrismaClient()

const otp = await prisma.oTP.findFirst({
  where: { email: 'test2@example.com', isUsed: false },
  orderBy: { createdAt: 'desc' }
})

if (!otp) {
  console.log('NO_OTP')
  process.exit(0)
}

await prisma.oTP.update({
  where: { id: otp.id },
  data: { isUsed: true }
})

const admin = await prisma.admin.findUnique({
  where: { email: 'test2@example.com' }
})

const token = jwt.sign(
  { id: admin.id, email: admin.email, role: admin.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE }
)

console.log('TOKEN:' + token)
await prisma.$disconnect()
