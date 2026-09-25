import prisma from './src/prisma/client.js';

async function main() {
  const appointmentId = 'cmuf3w5u2000b6wga7gnzb1sg';
  const agentId = 'cmu5hkjug0001mfjxmj7xfcp4';

  const existingTask = await prisma.task.findFirst({
    where: { appointmentId },
  });

  if (existingTask) {
    console.log('Task already exists:', existingTask.id);
  } else {
    const task = await prisma.task.create({
      data: {
        appointmentId,
        agentId,
        taskStatus: 'ASSIGNED',
      },
    });
    console.log('Created task:', task.id);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
