export type BillabilityEligibility = 'ELIGIBLE' | 'INELIGIBLE' | 'CONDITIONAL';
export type BillabilityIntent = 'BILLABLE' | 'NON_BILLABLE' | 'MIXED';
export type BillabilityOutcome = 'BILLABLE' | 'NON_BILLABLE' | 'PARTIALLY_BILLABLE' | 'UNBILLED';

export interface BillabilityDomainContext {
  isBillable?: boolean;
  billableRatio?: number;
  status?: string;
  hours?: number;
}

export interface BillabilityDomainResult {
  eligibility: BillabilityEligibility;
  intent: BillabilityIntent;
  outcome: BillabilityOutcome;
  billableRatio: number;
  billableHours?: number;
  nonBillableHours?: number;
}

export function clampBillableRatio(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  if (value < 0) return 0;
  if (value > 1) return 1;
  return Math.round(value * 10000) / 10000;
}

export function resolveBillabilityDomain(context: BillabilityDomainContext): BillabilityDomainResult {
  const intentFromFlag: BillabilityIntent = context.isBillable === false ? 'NON_BILLABLE' : 'BILLABLE';
  const defaultRatio = context.isBillable === false ? 0 : 1;
  const billableRatio = clampBillableRatio(context.billableRatio, defaultRatio);

  let intent: BillabilityIntent = intentFromFlag;
  if (billableRatio > 0 && billableRatio < 1) {
    intent = 'MIXED';
  }

  const eligibility: BillabilityEligibility =
    billableRatio === 0
      ? 'INELIGIBLE'
      : billableRatio < 1
        ? 'CONDITIONAL'
        : 'ELIGIBLE';

  let outcome: BillabilityOutcome;
  if (context.status === 'DRAFT' || context.status === 'SUBMITTED') {
    outcome = 'UNBILLED';
  } else if (billableRatio === 0) {
    outcome = 'NON_BILLABLE';
  } else if (billableRatio < 1) {
    outcome = 'PARTIALLY_BILLABLE';
  } else {
    outcome = 'BILLABLE';
  }

  const result: BillabilityDomainResult = {
    eligibility,
    intent,
    outcome,
    billableRatio,
  };

  if (typeof context.hours === 'number') {
    const billableHours = Math.round((context.hours * billableRatio) * 100) / 100;
    result.billableHours = billableHours;
    result.nonBillableHours = Math.round((context.hours - billableHours) * 100) / 100;
  }

  return result;
}