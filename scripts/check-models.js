import prisma from '../src/prisma/client.js';

async function checkModels() {
  try {
    // Check if Package model exists
    const packageExists = prisma.package ? true : false;
    console.log('Package model exists:', packageExists);
    
    // Check if Appointment model has package field
    const appointment = prisma.appointment;
    console.log('Appointment model exists:', !!appointment);
    
    // Try to query packages
    if (packageExists) {
      const packages = await prisma.package.findMany();
      console.log('Packages count:', packages.length);
    }
    
    // Try to query doctors
    const doctors = await prisma.doctor.findMany();
    console.log('Doctors count:', doctors.length);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkModels();
