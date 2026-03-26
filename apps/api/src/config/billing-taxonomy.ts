import prisma from '../lib/prisma';

export type InvoicingModel = 'CONTRACT_LED' | 'PROJECT_LED' | 'HYBRID';

export interface TenantBillingTaxonomyPolicy {
  version: string;
  updatedAt: string;
  updatedBy: string | null;
  allowedInvoicingModels: InvoicingModel[];
  allowedBillingTypes: string[];
  allowContractProjectLinkage: boolean;
}

export interface BillingTaxonomyEvaluationInput {
  contractId?: string | null;
  projectId?: string | null;
  requestData?: Record<string, unknown>;
}

export interface BillingTaxonomyEvaluationResult {
  allowed: boolean;
  invoicingModel: InvoicingModel;
  billingType: string | null;
  reason?: string;
}

const DEFAULT_POLICY: TenantBillingTaxonomyPolicy = {
  version: 'default-v1',
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
  allowedInvoicingModels: ['CONTRACT_LED', 'PROJECT_LED', 'HYBRID'],
  allowedBillingTypes: ['TM', 'FIXED', 'RETAINER', 'MILESTONE', 'HYBRID'],
  allowContractProjectLinkage: true,
};

function toStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim().toUpperCase());
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeInvoicingModels(value: unknown): InvoicingModel[] {
  const values = toStringArray(value, DEFAULT_POLICY.allowedInvoicingModels);
  const allowed: InvoicingModel[] = ['CONTRACT_LED', 'PROJECT_LED', 'HYBRID'];
  const filtered = values.filter((item): item is InvoicingModel => allowed.includes(item as InvoicingModel));
  return filtered.length > 0 ? filtered : DEFAULT_POLICY.allowedInvoicingModels;
}

function parsePolicy(raw: unknown): TenantBillingTaxonomyPolicy {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_POLICY;
  }

  const source = raw as Record<string, unknown>;
  return {
    version: typeof source.version === 'string' && source.version.trim().length > 0
      ? source.version
      : DEFAULT_POLICY.version,
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt.trim().length > 0
      ? source.updatedAt
      : DEFAULT_POLICY.updatedAt,
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : null,
    allowedInvoicingModels: normalizeInvoicingModels(source.allowedInvoicingModels),
    allowedBillingTypes: toStringArray(source.allowedBillingTypes, DEFAULT_POLICY.allowedBillingTypes),
    allowContractProjectLinkage: typeof source.allowContractProjectLinkage === 'boolean'
      ? source.allowContractProjectLinkage
      : DEFAULT_POLICY.allowContractProjectLinkage,
  };
}

export async function getTenantBillingTaxonomyPolicy(tenantId: string): Promise<TenantBillingTaxonomyPolicy> {
  const tenantClient = (prisma as unknown as { tenant?: { findUnique?: typeof prisma.tenant.findUnique } }).tenant;
  if (!tenantClient?.findUnique) {
    return DEFAULT_POLICY;
  }

  const tenant = await tenantClient.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as Record<string, unknown> | null) ?? null;
  const rawPolicy = settings?.billingTaxonomy;
  return parsePolicy(rawPolicy);
}

export async function updateTenantBillingTaxonomyPolicy(
  tenantId: string,
  patch: Partial<Omit<TenantBillingTaxonomyPolicy, 'version' | 'updatedAt'>>,
  updatedBy: string
): Promise<TenantBillingTaxonomyPolicy> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const existingSettings = ((tenant?.settings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const existingPolicy = parsePolicy(existingSettings.billingTaxonomy);

  const now = new Date().toISOString();
  const nextPolicy: TenantBillingTaxonomyPolicy = {
    ...existingPolicy,
    ...(patch.allowedInvoicingModels ? { allowedInvoicingModels: normalizeInvoicingModels(patch.allowedInvoicingModels) } : {}),
    ...(patch.allowedBillingTypes ? { allowedBillingTypes: toStringArray(patch.allowedBillingTypes, existingPolicy.allowedBillingTypes) } : {}),
    ...(patch.allowContractProjectLinkage !== undefined
      ? { allowContractProjectLinkage: patch.allowContractProjectLinkage }
      : {}),
    updatedAt: now,
    updatedBy,
    version: `${now}-v1`,
  };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...existingSettings,
        billingTaxonomy: nextPolicy,
      },
    },
  });

  return nextPolicy;
}

export function resolveInvoicingModel(input: BillingTaxonomyEvaluationInput): InvoicingModel {
  if (input.contractId && input.projectId) {
    return 'HYBRID';
  }
  if (input.contractId) {
    return 'CONTRACT_LED';
  }
  return 'PROJECT_LED';
}

export function resolveBillingType(input: BillingTaxonomyEvaluationInput): string | null {
  const data = input.requestData ?? {};
  const candidates = [
    data.billingType,
    data.invoicingType,
    data.projectBillingType,
    data.contractBillingType,
  ];

  const found = candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return found ? found.toUpperCase() : null;
}

export function evaluateBillingTaxonomyCompliance(
  policy: TenantBillingTaxonomyPolicy,
  input: BillingTaxonomyEvaluationInput
): BillingTaxonomyEvaluationResult {
  const invoicingModel = resolveInvoicingModel(input);
  const billingType = resolveBillingType(input);

  if (!policy.allowedInvoicingModels.includes(invoicingModel)) {
    return {
      allowed: false,
      invoicingModel,
      billingType,
      reason: `Invoicing model ${invoicingModel} is disabled by tenant policy`,
    };
  }

  if (!policy.allowContractProjectLinkage && input.contractId && input.projectId) {
    return {
      allowed: false,
      invoicingModel,
      billingType,
      reason: 'Contract + project linkage is disabled by tenant policy',
    };
  }

  if (billingType && !policy.allowedBillingTypes.includes(billingType)) {
    return {
      allowed: false,
      invoicingModel,
      billingType,
      reason: `Billing type ${billingType} is not allowed for this tenant`,
    };
  }

  return {
    allowed: true,
    invoicingModel,
    billingType,
  };
}