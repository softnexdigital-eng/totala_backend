import prisma from './src/prisma/client.js';

async function main() {
  const appointmentId = 'cmuf3w5u2000b6wga7gnzb1sg';

  const task = await prisma.task.findFirst({
    where: { appointmentId },
  });

  if (task && task.taskStatus === 'CANCELLED') {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        taskStatus: 'ASSIGNED',
        agentId: 'cmu5hkjug0001mfjxmj7xfcp4',
        receiveTime: null,
        startTime: null,
        endTime: null,
      },
    });
    console.log('Reset task to ASSIGNED:', task.id);
  } else {
    console.log('Task not found or not cancelled');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
