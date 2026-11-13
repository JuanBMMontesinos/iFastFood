import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const models = [
    'user',
    'session',
    'refreshToken',
    'otpChallenge',
    'role',
    'permission',
    'consent',
    'auditLog',
    'customer',
    'address',
    'wallet',
    'walletTransaction',
    'subscriptionPlan',
    'customerSubscription',
    'merchantCategory',
    'merchant',
    'merchantContract',
    'merchantStaff',
    'merchantDocument',
    'menuCategory',
    'product',
    'productOptionGroup',
    'productOption',
    'businessHour',
    'deliveryZone',
    'coupon',
    'couponRedemption',
    'courier',
    'courierDocument',
    'courierShift',
    'courierLocation',
    'order',
    'orderItem',
    'orderItemOption',
    'orderEventOrderState',
    'delivery',
    'payment',
    'refund',
    'payout',
    'payoutItem',
    'ledgerAccount',
    'ledgerEntry',
    'invoice',
    'rating',
    'supportTicket',
    'ticketMessage',
    'notification',
    'webhookEvent',
    'appConfig',
    'cmsPage',
  ];

  console.log('--- CONTAGEM DE LINHAS POR TABELA NO SUPABASE ---');
  const emptyTables: string[] = [];
  const populatedTables: { table: string; count: number }[] = [];

  for (const m of models) {
    try {
      const count = await (prisma as any)[m].count();
      if (count === 0) {
        emptyTables.push(m);
      } else {
        populatedTables.push({ table: m, count });
      }
    } catch (err: any) {
      console.error(`Erro ao consultar ${m}:`, err.message);
    }
  }

  console.log('\n✅ TABELAS POPULADAS:');
  for (const p of populatedTables) {
    console.log(` - ${p.table}: ${p.count} registros`);
  }

  console.log(`\n⚠️ TABELAS VAZIAS (${emptyTables.length}):`);
  for (const e of emptyTables) {
    console.log(` - ${e}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
