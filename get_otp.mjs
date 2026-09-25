import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()

const prisma = new PrismaClient()

const otp = await prisma.oTP.findFirst({
  where: { email: 'test2@example.com', isUsed: false },
  orderBy: { createdAt: 'desc' }
})

console.log(otp ? otp.otp : 'NO_OTP_FOUND')
await prisma.$disconnect()
