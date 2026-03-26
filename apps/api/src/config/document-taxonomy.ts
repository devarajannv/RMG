import prisma from '../lib/prisma';

export interface TenantDocumentTaxonomyPolicy {
  version: string;
  updatedAt: string;
  updatedBy: string | null;
  allowedCategories: string[];
}

const DEFAULT_POLICY: TenantDocumentTaxonomyPolicy = {
  version: 'default-v1',
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
  allowedCategories: [
    'NDA',
    'MSA',
    'SOW',
    'AMENDMENT',
    'CHANGE_REQUEST',
    'INVOICE',
    'TIMESHEET',
    'PROJECT_PLAN',
    'GOVERNANCE',
    'OTHER',
  ],
};

function normalizeCategoryValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizeCategoryArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => normalizeCategoryValue(item))
    )
  );

  return normalized.length > 0 ? normalized : fallback;
}

function parsePolicy(raw: unknown): TenantDocumentTaxonomyPolicy {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_POLICY;
  }

  const source = raw as Record<string, unknown>;
  return {
    version:
      typeof source.version === 'string' && source.version.trim().length > 0
        ? source.version
        : DEFAULT_POLICY.version,
    updatedAt:
      typeof source.updatedAt === 'string' && source.updatedAt.trim().length > 0
        ? source.updatedAt
        : DEFAULT_POLICY.updatedAt,
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : null,
    allowedCategories: normalizeCategoryArray(source.allowedCategories, DEFAULT_POLICY.allowedCategories),
  };
}

export async function getTenantDocumentTaxonomyPolicy(tenantId: string): Promise<TenantDocumentTaxonomyPolicy> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as Record<string, unknown> | null) ?? null;
  return parsePolicy(settings?.documentTaxonomy);
}

export async function updateTenantDocumentTaxonomyPolicy(
  tenantId: string,
  patch: Partial<Omit<TenantDocumentTaxonomyPolicy, 'version' | 'updatedAt'>>,
  updatedBy: string
): Promise<TenantDocumentTaxonomyPolicy> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const existingSettings = ((tenant?.settings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const existingPolicy = parsePolicy(existingSettings.documentTaxonomy);
  const now = new Date().toISOString();

  const nextPolicy: TenantDocumentTaxonomyPolicy = {
    ...existingPolicy,
    ...(patch.allowedCategories
      ? { allowedCategories: normalizeCategoryArray(patch.allowedCategories, existingPolicy.allowedCategories) }
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
        documentTaxonomy: nextPolicy,
      },
    },
  });

  return nextPolicy;
}

export function resolveDocumentCategory(
  policy: TenantDocumentTaxonomyPolicy,
  rawCategory: string | null | undefined
): string | undefined {
  if (!rawCategory || rawCategory.trim().length === 0) {
    return undefined;
  }

  const normalizedInput = normalizeCategoryValue(rawCategory);
  const matchedCategory = policy.allowedCategories.find(
    (category) => normalizeCategoryValue(category) === normalizedInput
  );

  if (!matchedCategory) {
    throw new Error(`Document category ${rawCategory.trim()} is not allowed by tenant policy`);
  }

  return matchedCategory;
}