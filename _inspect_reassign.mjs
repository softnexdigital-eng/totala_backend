import prisma from './src/prisma/client.js';

async function main() {
  const appointmentId = 'cmuf3w5u2000b6wga7gnzb1sg';

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  console.log('=== Appointment ===');
  console.log(JSON.stringify(appointment, null, 2));

  const task = await prisma.task.findFirst({
    where: { appointmentId },
  });

  console.log('\n=== Task ===');
  console.log(JSON.stringify(task, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
