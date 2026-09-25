import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

const otp = await prisma.oTP.findFirst({
  where: { email: process.env.ADMIN_EMAIL, isUsed: false },
  orderBy: { createdAt: 'desc' }
})
console.log('OTP=' + (otp ? otp.otp : 'none'))

const admin = await prisma.admin.findFirst()
console.log('ADMIN=' + admin.id + '|' + admin.email + '|' + admin.role)

const agents = await prisma.agent.findMany({
  select: { id: true, email: true, name: true, isActive: true, password: true }
})
console.log('AGENTS=' + JSON.stringify(agents.map((a) => ({ ...a, password: a.password ? 'set' : null }))))

await prisma.$disconnect()
