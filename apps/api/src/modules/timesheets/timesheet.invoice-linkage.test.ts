import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    timesheetPeriod: {
      findFirst: vi.fn(),
    },
    timesheetEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('../audit/audit.service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  createInvoiceLinkageAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import * as timesheetService from './timesheet.service';
import * as auditService from '../audit/audit.service';

describe('Timesheet invoice linkage', () => {
  const tenantId = 'tenant-1';
  const userId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TS-INV-001: links approved entry to invoice and marks it INVOICED', async () => {
    mockPrisma.timesheetEntry.findFirst.mockResolvedValue({
      id: 'entry-1',
      status: 'APPROVED',
      customFields: { billabilityDomain: { billableRatio: 1 } },
      date: new Date('2026-02-24T00:00:00.000Z'),
      resourceId: 'res-1',
      projectId: 'proj-1',
    });
    mockPrisma.timesheetEntry.update.mockResolvedValue({
      id: 'entry-1',
      status: 'INVOICED',
      customFields: {
        billabilityDomain: { billableRatio: 1 },
        invoiceReference: 'INV-2026-0101',
      },
    });

    const result = await timesheetService.linkTimesheetEntryToInvoice(tenantId, 'entry-1', userId, {
      invoiceReference: 'INV-2026-0101',
      reason: 'Weekly invoicing',
    });

    expect(result).toBeTruthy();
    expect(mockPrisma.timesheetEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'INVOICED',
          customFields: expect.objectContaining({
            invoiceReference: 'INV-2026-0101',
          }),
        }),
      })
    );
    expect(vi.mocked(auditService.createInvoiceLinkageAuditEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'INVOICE_LINKED',
        linkedEntityType: 'TimesheetEntry',
      })
    );
  });

  it('TS-INV-002: unlinks invoice reference and restores APPROVED status', async () => {
    mockPrisma.timesheetEntry.findFirst.mockResolvedValue({
      id: 'entry-1',
      status: 'INVOICED',
      customFields: {
        billabilityDomain: { billableRatio: 1 },
        invoiceReference: 'INV-2026-0101',
      },
      date: new Date('2026-02-24T00:00:00.000Z'),
      resourceId: 'res-1',
      projectId: 'proj-1',
    });
    mockPrisma.timesheetEntry.update.mockResolvedValue({
      id: 'entry-1',
      status: 'APPROVED',
      customFields: {
        billabilityDomain: { billableRatio: 1 },
        invoiceLinkage: { invoiceReference: null },
      },
    });

    const result = await timesheetService.unlinkTimesheetEntryFromInvoice(tenantId, 'entry-1', userId, {
      reason: 'Reversal',
    });

    expect(result).toBeTruthy();
    expect(mockPrisma.timesheetEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'APPROVED',
          customFields: expect.not.objectContaining({
            invoiceReference: 'INV-2026-0101',
          }),
        }),
      })
    );
    expect(vi.mocked(auditService.createInvoiceLinkageAuditEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'INVOICE_UNLINKED',
        linkedEntityType: 'TimesheetEntry',
      })
    );
  });

  it('TS-INV-003: links approved timesheet period entries to invoice', async () => {
    mockPrisma.timesheetPeriod.findFirst.mockResolvedValue({
      id: 'period-1',
      status: 'APPROVED',
      resourceId: 'res-1',
      periodStart: new Date('2026-02-17T00:00:00.000Z'),
      periodEnd: new Date('2026-02-23T00:00:00.000Z'),
    });
    mockPrisma.timesheetEntry.findMany.mockResolvedValue([
      { id: 'entry-1', status: 'APPROVED', customFields: {} },
      { id: 'entry-2', status: 'INVOICED', customFields: { invoiceReference: 'INV-2026-0101' } },
    ]);
    mockPrisma.timesheetEntry.update.mockResolvedValue({ id: 'entry-1' });

    const result = await timesheetService.linkTimesheetPeriodToInvoice(tenantId, 'period-1', userId, {
      invoiceReference: 'INV-2026-0101',
      reason: 'Monthly close',
    });

    expect(result).toEqual(
      expect.objectContaining({
        periodId: 'period-1',
        invoiceReference: 'INV-2026-0101',
        linkedEntries: 2,
      })
    );
    expect(mockPrisma.timesheetEntry.update).toHaveBeenCalledTimes(2);
    expect(vi.mocked(auditService.createInvoiceLinkageAuditEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'INVOICE_LINKED',
        linkedEntityType: 'TimesheetPeriod',
      })
    );
  });

  it('TS-INV-004: unlinks period entries by invoice reference', async () => {
    mockPrisma.timesheetPeriod.findFirst.mockResolvedValue({
      id: 'period-1',
      resourceId: 'res-1',
      periodStart: new Date('2026-02-17T00:00:00.000Z'),
      periodEnd: new Date('2026-02-23T00:00:00.000Z'),
    });
    mockPrisma.timesheetEntry.findMany.mockResolvedValue([
      { id: 'entry-1', status: 'INVOICED', customFields: { invoiceReference: 'INV-2026-0101' } },
      { id: 'entry-2', status: 'INVOICED', customFields: { invoiceReference: 'INV-2026-0101' } },
    ]);
    mockPrisma.timesheetEntry.update.mockResolvedValue({ id: 'entry-1' });

    const result = await timesheetService.unlinkTimesheetPeriodFromInvoice(tenantId, 'period-1', userId, {
      invoiceReference: 'INV-2026-0101',
      reason: 'Invoice reversal',
    });

    expect(result).toEqual(
      expect.objectContaining({
        periodId: 'period-1',
        invoiceReference: 'INV-2026-0101',
        unlinkedEntries: 2,
      })
    );
    expect(mockPrisma.timesheetEntry.update).toHaveBeenCalledTimes(2);
    expect(vi.mocked(auditService.createInvoiceLinkageAuditEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'INVOICE_UNLINKED',
        linkedEntityType: 'TimesheetPeriod',
      })
    );
  });

  it('TS-INV-005: filters timesheet entries by invoice reference in customFields', async () => {
    mockPrisma.timesheetEntry.findMany.mockResolvedValue([]);
    mockPrisma.timesheetEntry.count.mockResolvedValue(0);

    await timesheetService.getTimesheetEntries({
      tenantId,
      invoiceReference: 'INV-2026-0101',
      page: 1,
      limit: 50,
    });

    expect(mockPrisma.timesheetEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customFields: {
            path: ['invoiceReference'],
            equals: 'INV-2026-0101',
          },
        }),
      })
    );
  });
});
