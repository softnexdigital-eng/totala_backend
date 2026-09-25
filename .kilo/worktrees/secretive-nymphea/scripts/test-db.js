import prisma from '../src/prisma/client.js';

try {
  await prisma.$connect();
  console.log('DB connected');
  
  // Try a simple query
  const count = await prisma.doctor.count();
  console.log('Doctors count:', count);
} catch (e) {
  console.error('DB error:', e.message);
} finally {
  await prisma.$disconnect();
}
