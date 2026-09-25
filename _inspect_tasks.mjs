import prisma from './src/prisma/client.js';

async function main() {
  const tasks = await prisma.task.findMany({
    where: {
      agent: { name: 'Md.Abdullah Al Numan' }
    },
    include: {
      appointment: {
        include: {
          patient: true,
          doctor: true,
          agent: true
        }
      },
      agent: true,
      payments: true
    }
  });

  console.log('=== Tasks for Md.Abdullah Al Numan ===');
  console.log(JSON.stringify(tasks, null, 2));

  const bookings = await prisma.booking.findMany({
    where: {
      agent: { name: 'Md.Abdullah Al Numan' }
    },
    include: {
      patient: true,
      agent: true
    }
  });

  console.log('\n=== Bookings for Md.Abdullah Al Numan ===');
  console.log(JSON.stringify(bookings, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
