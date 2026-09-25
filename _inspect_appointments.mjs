import prisma from './src/prisma/client.js';

async function main() {
  const appointments = await prisma.appointment.findMany({
    where: {
      agent: { name: 'Md.Abdullah Al Numan' }
    },
    include: {
      patient: true,
      doctor: true,
      agent: true,
    }
  });

  console.log('=== Appointments for Md.Abdullah Al Numan ===');
  console.log(JSON.stringify(appointments, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
