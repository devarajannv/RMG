import prisma from '../lib/prisma';

type CountRow = {
  tenantId: string;
  action: string;
  count: bigint;
};

const REQUEST_TO_AUDIT_ACTION: Record<string, string> = {
  CREATED: 'CREATE',
  UPDATED: 'UPDATE',
  SUBMITTED: 'SUBMIT',
  APPROVED: 'APPROVE',
  REJECTED: 'REJECT',
  RETURNED: 'REQUEST_RETURNED',
  CANCELLED: 'REQUEST_CANCELLED',
};

function toKey(tenantId: string, action: string): string {
  return `${tenantId}::${action}`;
}

async function main(): Promise<void> {
  const requestActions = Object.keys(REQUEST_TO_AUDIT_ACTION);
  const auditActions = Object.values(REQUEST_TO_AUDIT_ACTION);

  const requestHistoryCounts = await prisma.$queryRaw<CountRow[]>`
    SELECT r."tenantId" AS "tenantId", rh."action"::text AS action, COUNT(*)::bigint AS count
    FROM "RequestHistory" rh
    INNER JOIN "Request" r ON r.id = rh."requestId"
    WHERE rh."action"::text = ANY (${requestActions}::text[])
    GROUP BY r."tenantId", rh."action"
  `;

  const auditCounts = await prisma.$queryRaw<CountRow[]>`
    SELECT al."tenantId" AS "tenantId", al."action"::text AS action, COUNT(*)::bigint AS count
    FROM "AuditLog" al
    WHERE al."entityType" = 'Request'
      AND al."action"::text = ANY (${auditActions}::text[])
    GROUP BY al."tenantId", al."action"
  `;

  const auditMap = new Map<string, number>();
  for (const row of auditCounts) {
    auditMap.set(toKey(row.tenantId, row.action), Number(row.count));
  }

  const mismatches: Array<{
    tenantId: string;
    requestAction: string;
    expectedAuditAction: string;
    requestHistoryCount: number;
    auditLogCount: number;
    delta: number;
  }> = [];

  for (const row of requestHistoryCounts) {
    const expectedAuditAction = REQUEST_TO_AUDIT_ACTION[row.action];
    const requestHistoryCount = Number(row.count);
    const auditLogCount = auditMap.get(toKey(row.tenantId, expectedAuditAction)) ?? 0;
    const delta = auditLogCount - requestHistoryCount;

    if (delta !== 0) {
      mismatches.push({
        tenantId: row.tenantId,
        requestAction: row.action,
        expectedAuditAction,
        requestHistoryCount,
        auditLogCount,
        delta,
      });
    }
  }

  if (mismatches.length > 0) {
    console.error('❌ RequestHistory ↔ AuditLog reconciliation FAILED');
    console.table(mismatches);
    process.exit(1);
  }

  const requestTotal = requestHistoryCounts.reduce((sum, row) => sum + Number(row.count), 0);
  const auditTotal = auditCounts.reduce((sum, row) => sum + Number(row.count), 0);

  console.log('✅ RequestHistory ↔ AuditLog reconciliation PASSED');
  console.log(`Mapped RequestHistory rows: ${requestTotal}`);
  console.log(`Mapped AuditLog rows: ${auditTotal}`);
}

main()
  .catch((error) => {
    console.error('❌ Reconciliation script failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
