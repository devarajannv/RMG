import prisma from '../lib/prisma';

type MissingRow = {
  tenantId: string;
  action: string;
  count: bigint;
};

type TotalRow = {
  count: bigint;
};

async function getMissingTimesheetAuditRows(): Promise<MissingRow[]> {
  const actions = ['SUBMIT', 'APPROVE', 'REJECT'];

  return prisma.$queryRaw<MissingRow[]>`
    SELECT al."tenantId" AS "tenantId", al."action"::text AS action, COUNT(*)::bigint AS count
    FROM "AuditLog" al
    LEFT JOIN "TimesheetPeriod" tp
      ON tp.id = al."entityId"
      AND tp."tenantId" = al."tenantId"
    WHERE al."entityType" = 'TimesheetPeriod'
      AND al."action"::text = ANY (${actions}::text[])
      AND tp.id IS NULL
    GROUP BY al."tenantId", al."action"
  `;
}

async function getMissingCurrencyAuditRows(): Promise<MissingRow[]> {
  const actions = ['CREATE', 'UPDATE', 'DELETE'];

  return prisma.$queryRaw<MissingRow[]>`
    SELECT al."tenantId" AS "tenantId", al."action"::text AS action, COUNT(*)::bigint AS count
    FROM "AuditLog" al
    LEFT JOIN "Currency" c
      ON c.id = al."entityId"
      AND c."tenantId" = al."tenantId"
    WHERE al."entityType" = 'Currency'
      AND al."action"::text = ANY (${actions}::text[])
      AND c.id IS NULL
    GROUP BY al."tenantId", al."action"
  `;
}

async function getMissingExchangeRateAuditRows(): Promise<MissingRow[]> {
  const actions = ['CREATE', 'UPDATE'];

  return prisma.$queryRaw<MissingRow[]>`
    SELECT al."tenantId" AS "tenantId", al."action"::text AS action, COUNT(*)::bigint AS count
    FROM "AuditLog" al
    LEFT JOIN "ExchangeRate" er
      ON er.id = al."entityId"
      AND er."tenantId" = al."tenantId"
    WHERE al."entityType" = 'ExchangeRate'
      AND al."action"::text = ANY (${actions}::text[])
      AND er.id IS NULL
    GROUP BY al."tenantId", al."action"
  `;
}

async function getTotalAuditRows(entityType: 'TimesheetPeriod' | 'Currency' | 'ExchangeRate'): Promise<number> {
  const row = await prisma.$queryRaw<TotalRow[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "AuditLog" al
    WHERE al."entityType" = ${entityType}
  `;

  return Number(row[0]?.count ?? 0n);
}

function formatMismatchRows(domain: string, rows: MissingRow[]) {
  return rows.map((row) => ({
    domain,
    tenantId: row.tenantId,
    action: row.action,
    missingEntityReferences: Number(row.count),
  }));
}

async function main(): Promise<void> {
  const [
    missingTimesheetRows,
    missingCurrencyRows,
    missingExchangeRateRows,
    timesheetAuditTotal,
    currencyAuditTotal,
    exchangeRateAuditTotal,
  ] = await Promise.all([
    getMissingTimesheetAuditRows(),
    getMissingCurrencyAuditRows(),
    getMissingExchangeRateAuditRows(),
    getTotalAuditRows('TimesheetPeriod'),
    getTotalAuditRows('Currency'),
    getTotalAuditRows('ExchangeRate'),
  ]);

  const mismatches = [
    ...formatMismatchRows('TimesheetPeriod', missingTimesheetRows),
    ...formatMismatchRows('Currency', missingCurrencyRows),
    ...formatMismatchRows('ExchangeRate', missingExchangeRateRows),
  ];

  if (mismatches.length > 0) {
    console.error('❌ Domain audit integrity reconciliation FAILED');
    console.table(mismatches);
    process.exit(1);
  }

  console.log('✅ Domain audit integrity reconciliation PASSED');
  console.log(`TimesheetPeriod audit rows scanned: ${timesheetAuditTotal}`);
  console.log(`Currency audit rows scanned: ${currencyAuditTotal}`);
  console.log(`ExchangeRate audit rows scanned: ${exchangeRateAuditTotal}`);
}

main()
  .catch((error) => {
    console.error('❌ Domain reconciliation script failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
