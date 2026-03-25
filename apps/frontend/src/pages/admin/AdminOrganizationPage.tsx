import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

import type { BillingTaxonomyPolicy, DocumentTaxonomyPolicy, OrganizationStats } from './shared';

export default function AdminOrganizationPage() {
  const queryClient = useQueryClient();
  const [billingTaxonomyDraft, setBillingTaxonomyDraft] = useState<BillingTaxonomyPolicy | null>(null);
  const [documentTaxonomyDraft, setDocumentTaxonomyDraft] = useState<DocumentTaxonomyPolicy | null>(null);
  const [newDocumentCategory, setNewDocumentCategory] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const { data: orgStats } = useQuery<OrganizationStats>({
    queryKey: ['organization-stats'],
    queryFn: async () => {
      const res = await api.get<{ data: OrganizationStats }>('/organization/stats');
      return res.data;
    },
  });

  const { data: billingTaxonomyPolicy } = useQuery<BillingTaxonomyPolicy>({
    queryKey: ['organization-billing-taxonomy'],
    queryFn: async () => {
      const res = await api.get<{ data: BillingTaxonomyPolicy }>('/organization/billing-taxonomy');
      return res.data;
    },
  });

  const { data: documentTaxonomyPolicy } = useQuery<DocumentTaxonomyPolicy>({
    queryKey: ['organization-document-taxonomy'],
    queryFn: async () => {
      const res = await api.get<{ data: DocumentTaxonomyPolicy }>('/organization/document-taxonomy');
      return res.data;
    },
  });

  useEffect(() => {
    if (billingTaxonomyPolicy) {
      setBillingTaxonomyDraft(billingTaxonomyPolicy);
    }
  }, [billingTaxonomyPolicy]);

  useEffect(() => {
    if (documentTaxonomyPolicy) {
      setDocumentTaxonomyDraft(documentTaxonomyPolicy);
    }
  }, [documentTaxonomyPolicy]);

  const updateBillingTaxonomyMutation = useMutation({
    mutationFn: async (data: Partial<BillingTaxonomyPolicy>) => api.patch('/organization/billing-taxonomy', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-billing-taxonomy'] });
      showMessage('success', 'Billing taxonomy updated');
    },
    onError: () => showMessage('error', 'Failed to update billing taxonomy'),
  });

  const updateDocumentTaxonomyMutation = useMutation({
    mutationFn: async (data: Partial<DocumentTaxonomyPolicy>) => api.patch('/organization/document-taxonomy', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-document-taxonomy'] });
      setNewDocumentCategory('');
      showMessage('success', 'Document taxonomy updated');
    },
    onError: () => showMessage('error', 'Failed to update document taxonomy'),
  });

  const addDocumentCategory = () => {
    if (!documentTaxonomyDraft) {
      return;
    }

    const trimmed = newDocumentCategory.trim().toUpperCase();
    if (!trimmed || documentTaxonomyDraft.allowedCategories.includes(trimmed)) {
      return;
    }

    setDocumentTaxonomyDraft({
      ...documentTaxonomyDraft,
      allowedCategories: [...documentTaxonomyDraft.allowedCategories, trimmed],
    });
    setNewDocumentCategory('');
  };

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div
          className={cn(
            'p-3 rounded-lg border',
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          )}
        >
          {saveMessage.text}
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Organization
          </CardTitle>
          <CardDescription>
            Review tenant profile, operating footprint, and billing taxonomy controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {orgStats ? (
            <>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{orgStats.tenant.name}</p>
                    <p className="text-sm text-gray-500">Slug: {orgStats.tenant.slug} • Status: {orgStats.tenant.status}</p>
                    <p className="text-sm text-gray-500">Created: {formatDate(orgStats.tenant.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold text-primary">{orgStats.users.total}</p>
                  <p className="text-xs text-gray-500">{orgStats.users.active} active</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Resources</p>
                  <p className="text-2xl font-bold text-green-600">{orgStats.resources.active}</p>
                  <p className="text-xs text-gray-500">{orgStats.resources.onBench} on bench</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Projects</p>
                  <p className="text-2xl font-bold text-blue-600">{orgStats.projects.active}</p>
                  <p className="text-xs text-gray-500">{orgStats.projects.total} total</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Clients</p>
                  <p className="text-2xl font-bold text-purple-600">{orgStats.clients.active}</p>
                  <p className="text-xs text-gray-500">{orgStats.clients.total} total</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Storage</p>
                <p className="text-lg font-medium">{orgStats.storage.documentsCount} documents</p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Loading organization data...</p>
            </div>
          )}

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Admin Only:</strong> Organization settings can only be modified by administrators.
            </p>
          </div>

          {billingTaxonomyDraft && (
            <div className="p-4 border rounded-lg space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Billing Taxonomy Policy</h4>
                <p className="text-xs text-gray-500">Version: {billingTaxonomyDraft.version} • Updated: {formatDate(billingTaxonomyDraft.updatedAt)}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Allowed Invoicing Models</p>
                  {['CONTRACT_LED', 'PROJECT_LED', 'HYBRID'].map((model) => (
                    <label key={model} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={billingTaxonomyDraft.allowedInvoicingModels.includes(model as 'CONTRACT_LED' | 'PROJECT_LED' | 'HYBRID')}
                        onChange={(e) => {
                          const existing = billingTaxonomyDraft.allowedInvoicingModels;
                          const next = e.target.checked
                            ? [...existing, model as 'CONTRACT_LED' | 'PROJECT_LED' | 'HYBRID']
                            : existing.filter((m) => m !== model);
                          setBillingTaxonomyDraft({ ...billingTaxonomyDraft, allowedInvoicingModels: next });
                        }}
                      />
                      <span>{model.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Allowed Billing Types</p>
                  {['TM', 'FIXED', 'RETAINER', 'MILESTONE', 'HYBRID'].map((billingType) => (
                    <label key={billingType} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={billingTaxonomyDraft.allowedBillingTypes.includes(billingType)}
                        onChange={(e) => {
                          const existing = billingTaxonomyDraft.allowedBillingTypes;
                          const next = e.target.checked
                            ? [...existing, billingType]
                            : existing.filter((t) => t !== billingType);
                          setBillingTaxonomyDraft({ ...billingTaxonomyDraft, allowedBillingTypes: next });
                        }}
                      />
                      <span>{billingType}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={billingTaxonomyDraft.allowContractProjectLinkage}
                  onChange={(e) => setBillingTaxonomyDraft({ ...billingTaxonomyDraft, allowContractProjectLinkage: e.target.checked })}
                />
                Allow contract + project linkage in the same decision
              </label>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    updateBillingTaxonomyMutation.mutate({
                      allowedInvoicingModels: billingTaxonomyDraft.allowedInvoicingModels,
                      allowedBillingTypes: billingTaxonomyDraft.allowedBillingTypes,
                      allowContractProjectLinkage: billingTaxonomyDraft.allowContractProjectLinkage,
                    });
                  }}
                  disabled={
                    updateBillingTaxonomyMutation.isPending
                    || billingTaxonomyDraft.allowedInvoicingModels.length === 0
                    || billingTaxonomyDraft.allowedBillingTypes.length === 0
                  }
                >
                  Save Billing Taxonomy
                </Button>
              </div>
            </div>
          )}

          {documentTaxonomyDraft && (
            <div className="p-4 border rounded-lg space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Document Taxonomy Policy</h4>
                <p className="text-xs text-gray-500">Version: {documentTaxonomyDraft.version} • Updated: {formatDate(documentTaxonomyDraft.updatedAt)}</p>
              </div>

              <p className="text-sm text-gray-600">
                PMO and contract operations can only save document categories from this managed list.
              </p>

              <div className="flex gap-2">
                <Input
                  value={newDocumentCategory}
                  onChange={(e) => setNewDocumentCategory(e.target.value)}
                  placeholder="Add category, for example NDA"
                />
                <Button type="button" variant="outline" onClick={addDocumentCategory} disabled={!newDocumentCategory.trim()}>
                  Add Category
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {documentTaxonomyDraft.allowedCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                    onClick={() => setDocumentTaxonomyDraft({
                      ...documentTaxonomyDraft,
                      allowedCategories: documentTaxonomyDraft.allowedCategories.filter((item) => item !== category),
                    })}
                  >
                    {category} ×
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    updateDocumentTaxonomyMutation.mutate({
                      allowedCategories: documentTaxonomyDraft.allowedCategories,
                    });
                  }}
                  disabled={
                    updateDocumentTaxonomyMutation.isPending
                    || documentTaxonomyDraft.allowedCategories.length === 0
                  }
                >
                  Save Document Taxonomy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
