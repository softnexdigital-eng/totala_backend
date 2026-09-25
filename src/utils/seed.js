import prisma from '../prisma/client.js'
import bcrypt from 'bcryptjs'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Seed database with initial data:
 * - 1 Admin (admin@helpcenter.com / admin123)
 * - 3 Doctors (Cardiology, Gynecology, Orthopedics)
 * - 2 Agents
 */

const seedAdmin = async () => {
  const existing = await prisma.admin.findUnique({
    where: { email: process.env.ADMIN_EMAIL }
  })

  if (existing) {
    console.log('  ✓ Admin already exists, skipping')
    return existing
  }

  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)

  const admin = await prisma.admin.create({
    data: {
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      name: 'Super Admin',
      role: 'super_admin'
    }
  })

  console.log('  ✓ Admin created:', admin.email)
  return admin
}

const seedDoctors = async () => {
  const doctors = [
    {
      name: 'ডা. রাহুল চৌধুরী',
      specialization: 'Cardiology',
      fee: 500,
      hospital: 'ঢাকা মেডিকেল হাসপাতাল',
      phone: '01711111111'
    },
    {
      name: 'ডাঁয়া. শারমিন আক্তার',
      specialization: 'Gynecology',
      fee: 600,
      hospital: 'বাংলাদেশ মেডিকেল হাসপাতাল',
      phone: '01722222222'
    },
    {
      name: 'ডা. মোহাম্মদ রহিম',
      specialization: 'Orthopedics',
      fee: 700,
      hospital: 'ইসলামিক হাসপাতাল',
      phone: '01733333333'
    }
  ]

  for (const doctor of doctors) {
    const existing = await prisma.doctor.findFirst({
      where: { name: doctor.name, specialization: doctor.specialization }
    })
    if (existing) {
      console.log('  ✓ Doctor already exists:', doctor.name)
      continue
    }
    await prisma.doctor.create({ data: doctor })
    console.log('  ✓ Doctor created:', doctor.name, `(${doctor.specialization})`)
  }

  return doctors.length
}

const seedAgents = async () => {
  const agents = [
    {
      name: 'আবু বকর সিদ্দিক',
      phone: '01911111111',
      email: 'abu.agent@example.com'
    },
    {
      name: 'রুপা বাবু',
      phone: '01922222222',
      email: 'ropa.agent@example.com'
    }
  ]

  for (const agent of agents) {
    const existing = await prisma.agent.findUnique({
      where: { phone: agent.phone }
    })
    if (existing) {
      console.log('  ✓ Agent already exists:', agent.name)
      continue
    }
    await prisma.agent.create({ data: agent })
    console.log('  ✓ Agent created:', agent.name)
  }

  return agents.length
}

const seedPatients = async () => {
  const patients = [
    {
      name: 'মোহাম্মদ আলী',
      phone: '01811111111',
      age: 45,
      address: 'ঢাকা, বাংলাদেশ',
      isRegistered: true
    },
    {
      name: 'ফাতিমা খান',
      phone: '01822222222',
      age: 32,
      address: 'চট্টগ্রাম, বাংলাদেশ',
      isRegistered: false
    }
  ]

  for (const patient of patients) {
    const existing = await prisma.patient.findUnique({
      where: { phone: patient.phone }
    })
    if (existing) {
      console.log('  ✓ Patient already exists:', patient.name)
      continue
    }

    const data = { ...patient }
    if (patient.isRegistered) {
      data.password = await bcrypt.hash(patient.phone, 10)
    }

    await prisma.patient.create({ data })
    console.log('  ✓ Patient created:', patient.name)
  }

  return patients.length
}

const seedAppointments = async () => {
  const patients = await prisma.patient.findMany()
  const doctors = await prisma.doctor.findMany()
  const agents = await prisma.agent.findMany()

  if (patients.length === 0 || doctors.length === 0) {
    console.log('  ⚠ Skipping appointments: no patients/doctors available')
    return 0
  }

  const now = new Date()
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  const appointments = [
    {
      patientId: patients[0].id,
      doctorId: doctors[0].id,
      agentId: agents.length > 0 ? agents[0].id : null,
      date: daysAgo(10), // old -> auto-verification will complete it
      status: 'pending',
      serviceType: 'online',
      notes: 'রেগুলার চেকআপ',
      whatsappNumber: patients[0].phone
    },
    {
      patientId: patients.length > 1 ? patients[1].id : patients[0].id,
      doctorId: doctors.length > 1 ? doctors[1].id : doctors[0].id,
      agentId: agents.length > 1 ? agents[1].id : agents[0].id,
      date: daysAgo(1),
      status: 'confirmed',
      serviceType: 'package',
      notes: 'ডায়াবেটিস ফলো-আপ',
      whatsappNumber: patients[0].phone
    },
    {
      patientId: patients[0].id,
      doctorId: doctors.length > 2 ? doctors[2].id : doctors[0].id,
      date: daysAgo(3),
      status: 'completed',
      serviceType: 'online',
      notes: '',
      whatsappNumber: patients[0].phone
    }
  ]

  let created = 0
  for (const appt of appointments) {
    const serviceFee = appt.serviceType === 'package' ? 500 : 50
    const existing = await prisma.appointment.findFirst({
      where: { patientId: appt.patientId, doctorId: appt.doctorId, date: appt.date }
    })
    if (existing) {
      console.log('  ✓ Appointment already exists, skipping')
      continue
    }
    await prisma.appointment.create({
      data: { ...appt, serviceFee }
    })
    created++
    console.log(`  ✓ Appointment created (${appt.serviceType}, status: ${appt.status})`)
  }

  return created
}

const seedTests = async () => {
  const appointments = await prisma.appointment.findMany()

  if (appointments.length === 0) {
    console.log('  ⚠ Skipping tests: no appointments available')
    return 0
  }

  const tests = [
    { testName: 'Complete Blood Count (CBC)', actualCost: 300, discountPercent: 10, status: 'completed' },
    { testName: 'Diabetes Panel', actualCost: 500, discountPercent: 0, status: 'pending' },
    { testName: 'Chest X-Ray', actualCost: 800, discountPercent: 20, status: 'completed' }
  ]

  let created = 0
  for (let i = 0; i < appointments.length; i++) {
    const test = tests[i % tests.length]
    const finalCost = Math.round(test.actualCost * (1 - (test.discountPercent || 0) / 100))
    const existing = await prisma.test.findFirst({
      where: { appointmentId: appointments[i].id, testName: test.testName }
    })
    if (existing) {
      console.log('  ✓ Test already exists, skipping')
      continue
    }
    await prisma.test.create({
      data: {
        appointmentId: appointments[i].id,
        testName: test.testName,
        actualCost: test.actualCost,
        discountPercent: test.discountPercent,
        finalCost,
        status: test.status,
        uploadedAt: test.status === 'completed' ? new Date() : null
      }
    })
    created++
    console.log(`  ✓ Test created: ${test.testName}`)
  }

  return created
}

/**
 * Main seed function
 */
const runSeed = async () => {
  console.log('\n🌱 Starting database seed...\n')

  try {
    await seedAdmin()
    console.log('')
    await seedDoctors()
    console.log('')
    await seedAgents()
    console.log('')
    await seedPatients()
    console.log('')
    await seedAppointments()
    console.log('')
    await seedTests()
    console.log('')
    console.log('✅ Seed completed successfully!\n')
    console.log('Admin Login:')
    console.log(`  Email: ${process.env.ADMIN_EMAIL}`)
    console.log(`  Password: ${process.env.ADMIN_PASSWORD}`)
    console.log('')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runSeed()
