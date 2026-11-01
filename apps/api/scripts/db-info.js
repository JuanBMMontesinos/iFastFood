/**
 * Verificação de banco — conta tabelas do schema public e valida acesso.
 * Uso: node --env-file=.env scripts/db-info.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const [{ tabelas }] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS tabelas FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  console.log(`TABELAS_PUBLIC=${tabelas}`);

  const [{ nomes }] = await prisma.$queryRawUnsafe(
    `SELECT string_agg(table_name, ', ' ORDER BY table_name) AS nomes
       FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  console.log(`NOMES=${nomes}`);

  const [{ projeto }] = await prisma.$queryRawUnsafe(
    `SELECT current_database() || ' em ' || host(inet_server_addr()) AS projeto`,
  );
  console.log(`BANCO=${projeto}`);
}

main()
  .catch((e) => {
    console.error(`ERRO=${e.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
