import prisma from './src/prisma/client.js'

const tables = ['Doctor', 'Appointment', 'Package']
for (const t of tables) {
  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name AS col, data_type AS typ, is_nullable AS nullable
     FROM information_schema.columns
     WHERE table_name = '${t}'
     ORDER BY ordinal_position`
  )
  console.log('=== ' + t + ' ===')
  console.log(JSON.stringify(cols, null, 2))
}

// check migration history
const migs = await prisma.$queryRawUnsafe(
  `SELECT migration_name, finished_at, rolled_back_at
   FROM _prisma_migrations ORDER BY started_at`
)
console.log('=== _prisma_migrations ===')
console.log(JSON.stringify(migs, null, 2))

await prisma.$disconnect()