/* Temporary verification script for the new public endpoints. Delete after use. */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const get = async (url) => {
  const res = await fetch(url);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = '<non-json>';
  }
  return { status: res.status, body };
};

(async () => {
  // 1. Live data check
  const agents = await prisma.agent.findMany({
    select: { id: true, name: true, phone: true, isActive: true },
  });
  const activeCount = await prisma.agent.count({ where: { isActive: true } });
  console.log('=== DATABASE ===');
  console.log('total agents :', agents.length);
  console.log('active agents:', activeCount);
  agents.forEach((a) => console.log('  -', a.id, '|', a.name, '| phone:', a.phone, '| isActive:', a.isActive));

  // 2. New public endpoint (direct backend)
  console.log('\n=== BACKEND  GET /api/public-agents (no auth) ===');
  const direct = await get('http://localhost:5000/api/public-agents');
  console.log('status:', direct.status, '| success:', direct.body?.success);
  console.log('returned:', (direct.body?.data || []).length, 'agent(s)');
  console.log('message:', JSON.stringify(direct.body?.message));
  (direct.body?.data || []).forEach((a) => console.log('  ->', JSON.stringify(a)));

  // 3. Leak check: no password / permissions / raw phone exposed
  const first = (direct.body?.data || [])[0];
  if (first) {
    console.log('exposed keys:', Object.keys(first).join(', '));
    console.log('leaks password   :', 'password' in first);
    console.log('leaks permissions:', 'permissions' in first);
    console.log('leaks phone      :', 'phone' in first);
  }

  // 4. Frontend proxy
  console.log('\n=== FRONTEND GET /api/public-agents (via Next.js) ===');
  try {
    const viaNext = await get('http://localhost:3111/api/public-agents');
    console.log('status:', viaNext.status, '| success:', viaNext.body?.success, '| returned:', (viaNext.body?.data || []).length);
  } catch (e) {
    console.log('frontend not running:', e.message);
  }

  // 5. Existing protected route must stay protected
  console.log('\n=== BACKEND  GET /api/agents (must stay 401) ===');
  const guarded = await get('http://localhost:5000/api/agents');
  console.log('status:', guarded.status, '| message:', JSON.stringify(guarded.body?.message));

  await prisma.$disconnect();
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
