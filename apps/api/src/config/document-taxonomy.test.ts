import { describe, expect, it } from 'vitest';

import { resolveDocumentCategory, type TenantDocumentTaxonomyPolicy } from './document-taxonomy';

const policy: TenantDocumentTaxonomyPolicy = {
  version: 'test-v1',
  updatedAt: new Date().toISOString(),
  updatedBy: 'user-1',
  allowedCategories: ['NDA', 'MSA', 'SOW'],
};

describe('document taxonomy policy', () => {
  it('normalizes categories against the tenant-managed taxonomy', () => {
    expect(resolveDocumentCategory(policy, 'nda')).toBe('NDA');
    expect(resolveDocumentCategory(policy, '  sow  ')).toBe('SOW');
  });

  it('rejects categories outside the tenant-managed taxonomy', () => {
    expect(() => resolveDocumentCategory(policy, 'Invoice')).toThrow(
      'Document category Invoice is not allowed by tenant policy'
    );
  });
});