export const INVOICE_LINKAGE_EVENT_FOUNDATION_VERSION = '2026-02-24.ws8.v1' as const;

export const INVOICE_LINKAGE_EVENT_TYPES = [
  'INVOICE_LINK_ATTEMPTED',
  'INVOICE_LINKED',
  'INVOICE_UNLINKED',
  'INVOICE_LINK_REJECTED',
] as const;

export type InvoiceLinkageEventType = typeof INVOICE_LINKAGE_EVENT_TYPES[number];

export const INVOICE_LINKABLE_ENTITY_TYPES = [
  'Request',
  'TimesheetEntry',
  'TimesheetPeriod',
  'Allocation',
  'Contract',
] as const;

export type InvoiceLinkableEntityType = typeof INVOICE_LINKABLE_ENTITY_TYPES[number];

export interface InvoiceLinkageEventInput {
  tenantId: string;
  userId: string | null;
  eventType: InvoiceLinkageEventType;
  invoiceReference: string;
  linkedEntityType: InvoiceLinkableEntityType;
  linkedEntityId: string;
  reason?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export function validateInvoiceLinkageEventInput(input: InvoiceLinkageEventInput): void {
  if (!input.tenantId?.trim()) {
    throw new Error('Invoice linkage event requires tenantId');
  }
  if (!input.invoiceReference?.trim()) {
    throw new Error('Invoice linkage event requires invoiceReference');
  }
  if (!input.linkedEntityId?.trim()) {
    throw new Error('Invoice linkage event requires linkedEntityId');
  }
}

export function toInvoiceLinkageAuditPayload(input: InvoiceLinkageEventInput) {
  return {
    entityType: input.linkedEntityType,
    entityId: input.linkedEntityId,
    action: 'UPDATE' as const,
    changes: {
      eventType: input.eventType,
      invoiceReference: input.invoiceReference,
      linkedEntityType: input.linkedEntityType,
      linkedEntityId: input.linkedEntityId,
      reason: input.reason ?? null,
    },
    metadata: {
      auditEventClass: 'INVOICE_LINKAGE_FOUNDATION',
      foundationVersion: INVOICE_LINKAGE_EVENT_FOUNDATION_VERSION,
      eventType: input.eventType,
      correlationId: input.correlationId ?? null,
      ...(input.metadata ?? {}),
    },
  };
}