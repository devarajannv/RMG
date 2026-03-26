import prisma from '../lib/prisma';

type InvoiceLinkageAuditRow = {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  changes: Record<string, unknown> | null;
};

type MissingEntityRow = {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
};

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

async function main(): Promise<void> {
  const rows = (await prisma.auditLog.findMany({
    where: {
      metadata: {
        path: ['auditEventClass'],
        equals: 'INVOICE_LINKAGE_FOUNDATION',
      },
    },
    select: {
      id: true,
      tenantId: true,
      entityType: true,
      entityId: true,
      metadata: true,
      changes: true,
    },
    orderBy: { timestamp: 'desc' },
  })) as unknown as InvoiceLinkageAuditRow[];

  const invalid = rows.filter((row) => {
    const metadata = row.metadata ?? {};
    const changes = row.changes ?? {};
    return (
      !hasNonEmptyString(row.tenantId) ||
      !hasNonEmptyString(row.entityType) ||
      !hasNonEmptyString(row.entityId) ||
      !hasNonEmptyString(changes.eventType) ||
      !hasNonEmptyString(changes.invoiceReference) ||
      !hasNonEmptyString(metadata.foundationVersion)
    );
  });

  if (invalid.length > 0) {
    console.error('❌ WS-8 invoice-linkage reconciliation failed');
    console.table(
      invalid.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        entityType: row.entityType,
        entityId: row.entityId,
        foundationVersion: (row.metadata ?? {}).foundationVersion ?? null,
        eventType: (row.changes ?? {}).eventType ?? null,
        invoiceReference: (row.changes ?? {}).invoiceReference ?? null,
      }))
    );
    process.exit(1);
  }

  const missingEntityRows = rows.length > 0
    ? ((await prisma.$queryRaw`
      SELECT al."id", al."tenantId", al."entityType", al."entityId"
      FROM "AuditLog" al
      LEFT JOIN "Request" r
        ON al."entityType" = 'Request'
       AND r."id" = al."entityId"
       AND r."tenantId" = al."tenantId"
      LEFT JOIN "TimesheetEntry" te
        ON al."entityType" = 'TimesheetEntry'
       AND te."id" = al."entityId"
       AND te."tenantId" = al."tenantId"
      LEFT JOIN "TimesheetPeriod" tp
        ON al."entityType" = 'TimesheetPeriod'
       AND tp."id" = al."entityId"
       AND tp."tenantId" = al."tenantId"
      LEFT JOIN "Allocation" a
        ON al."entityType" = 'Allocation'
       AND a."id" = al."entityId"
       AND a."tenantId" = al."tenantId"
      LEFT JOIN "Contract" c
        ON al."entityType" = 'Contract'
       AND c."id" = al."entityId"
       AND c."tenantId" = al."tenantId"
      WHERE al."metadata" ->> 'auditEventClass' = 'INVOICE_LINKAGE_FOUNDATION'
        AND (
          (al."entityType" = 'Request' AND r."id" IS NULL) OR
          (al."entityType" = 'TimesheetEntry' AND te."id" IS NULL) OR
          (al."entityType" = 'TimesheetPeriod' AND tp."id" IS NULL) OR
          (al."entityType" = 'Allocation' AND a."id" IS NULL) OR
          (al."entityType" = 'Contract' AND c."id" IS NULL)
        )
      ORDER BY al."timestamp" DESC
    `) as unknown as MissingEntityRow[])
    : [];

  if (missingEntityRows.length > 0) {
    console.error('❌ WS-8 invoice-linkage reconciliation failed (missing referenced entities)');
    console.table(missingEntityRows);
    process.exit(1);
  }

  console.log(`✅ WS-8 invoice-linkage reconciliation passed (${rows.length} rows scanned)`);
}

main()
  .catch((error) => {
    console.error('❌ WS-8 invoice-linkage reconciliation execution failed');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });