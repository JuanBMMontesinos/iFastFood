/**
 * Seed idempotente de RBAC (papéis + permissões do backoffice).
 * Uso: node --env-file=.env scripts/seed-rbac.js
 * Mantenha em sync com apps/api/src/identity/permissions.ts
 * (a F5 levará a gestão dinâmica para o portal admin).
 */
const { PrismaClient } = require('@prisma/client');

const PERMISSION_CATALOG = [
  ['users.read', 'Consultar usuários da plataforma e da própria equipe'],
  ['users.write', 'Criar/atualizar usuários da própria equipe'],
  ['merchants.read', 'Consultar restaurantes parceiros'],
  ['merchants.write', 'Criar/atualizar restaurantes e contratos'],
  ['merchants.block', 'Bloquear/reativar restaurantes'],
  ['couriers.read', 'Consultar entregadores'],
  ['couriers.write', 'Criar/atualizar entregadores e documentos'],
  ['catalog.read', 'Consultar catálogos'],
  ['catalog.write', 'Editar catálogos'],
  ['orders.read', 'Consultar pedidos'],
  ['orders.write', 'Intervir em pedidos (cancelamento, reembolso)'],
  ['finance.read', 'Consultar financeiro e conciliação'],
  ['finance.write', 'Aprovar pagamentos/payouts e ajustes'],
  ['marketing.read', 'Consultar campanhas/cupons'],
  ['marketing.write', 'Criar/atualizar campanhas e cupons'],
  ['support.read', 'Consultar tickets'],
  ['support.write', 'Responder tickets e solicitar dados'],
  ['dsar.read', 'Consultar solicitações LGPD'],
  ['dsar.write', 'Executar exportações/anonimizações LGPD'],
  ['admin.read', 'Consultar configurações da plataforma'],
  ['admin.write', 'Alterar configurações da plataforma'],
];

const ROLE_MATRIX = {
  ADMIN: PERMISSION_CATALOG.map(([code]) => code),
  OPS: [
    'users.read',
    'orders.read',
    'orders.write',
    'merchants.read',
    'merchants.write',
    'couriers.read',
    'couriers.write',
    'catalog.read',
    'catalog.write',
    'support.read',
  ],
  FINANCE: ['users.read', 'merchants.read', 'finance.read', 'finance.write', 'orders.read'],
  SUPPORT_N1: ['users.read', 'orders.read', 'merchants.read', 'couriers.read', 'support.read', 'support.write'],
  SUPPORT_N2: [
    'users.read',
    'orders.read',
    'merchants.read',
    'couriers.read',
    'support.read',
    'support.write',
    'dsar.read',
  ],
  MARKETING: ['marketing.read', 'marketing.write', 'orders.read', 'merchants.read'],
};

const ROLE_DESCRIPTIONS = {
  ADMIN: 'Acesso total ao backoffice',
  OPS: 'Operações de pedidos, parceiros, frotas e catálogo',
  FINANCE: 'Financeiro, conciliação e payouts',
  SUPPORT_N1: 'Suporte de primeiro nível (tickets + leitura)',
  SUPPORT_N2: 'Recorrências e solicitações LGPD',
  MARKETING: 'Campanhas, cupons e merchandising',
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const permissionIds = new Map();
    for (const [code, description] of PERMISSION_CATALOG) {
      const row = await prisma.permission.upsert({
        where: { code },
        create: { code, description },
        update: { description },
      });
      permissionIds.set(code, row.id);
    }
    console.log(`PERMISSOES=${PERMISSION_CATALOG.length}`);

    for (const [name, codes] of Object.entries(ROLE_MATRIX)) {
      const role = await prisma.role.upsert({
        where: { name },
        create: { name, isSystem: true, description: ROLE_DESCRIPTIONS[name] ?? null },
        update: { isSystem: true, description: ROLE_DESCRIPTIONS[name] ?? null },
      });
      await prisma.role.update({
        where: { id: role.id },
        data: { permissions: { set: codes.map((code) => ({ id: permissionIds.get(code) })) } },
      });
      console.log(`ROLE ${name}=${codes.length} perms`);
    }
    console.log('SEED_RBAC_OK');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('SEED_RBAC_ERRO', error.message);
  process.exitCode = 1;
});
