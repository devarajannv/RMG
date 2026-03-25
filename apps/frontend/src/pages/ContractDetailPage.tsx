import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  User,
  Link as LinkIcon,
  Plus,
  Target,
  History,
  File,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ContractStatusTimeline } from '@/components/contracts/ContractStatusTimeline';
import { ContractMilestones } from '@/components/contracts/ContractMilestones';
import { ContractDocuments } from '@/components/contracts/ContractDocuments';
import { ContractBudgetPanel } from '@/components/contracts/ContractBudgetPanel';
import { ContractAuditHistory } from '@/components/contracts/ContractAuditHistory';
import { ContractRenewalDialog } from '@/components/contracts/ContractRenewalDialog';
import { ContractQuickActions } from '@/components/contracts/ContractQuickActions';
import { Can } from '@/components/permissions';

// ============================================================================
// Types
// ============================================================================

interface ContractMilestone {
  id: string;
  name: string;
  description?: string;
  type: 'DELIVERABLE' | 'PAYMENT' | 'REVIEW' | 'KICKOFF' | 'COMPLETION' | 'OTHER';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  completedDate?: string;
  amount?: number;
  order: number;
}

interface ContractDocument {
  id: string;
  name: string;
  type: 'CONTRACT' | 'AMENDMENT' | 'ATTACHMENT' | 'SOW' | 'INVOICE' | 'OTHER';
  mimeType: string;
  size: number;
  url: string;
  version: number;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  uploadedAt: string;
  description?: string;
}

interface ContractAuditEntry {
  id: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  userId: string;
  userName: string;
  timestamp: string;
}

interface ContractBudget {
  totalValue: number;
  invoiced: number;
  paid: number;
  remaining: number;
  currency: string;
  utilization: number;
}

interface ContractDetail {
  id: string;
  contractNumber: string;
  name: string;
  type: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';
  description?: string;
  startDate: string;
  endDate?: string;
  signedDate?: string;
  value?: number;
  currency: string;
  billingType: string;
  paymentTerms?: string;
  autoRenew: boolean;
  documentUrl?: string;
  notes?: string;
  renewalDate?: string;
  client: {
    id: string;
    name: string;
    code: string;
    industry?: string;
    website?: string;
  };
  accountManager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  projects: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    startDate: string;
    endDate?: string;
    manager?: { firstName: string; lastName: string };
    _count: { allocations: number };
  }>;
  milestones?: ContractMilestone[];
  documents?: ContractDocument[];
  auditHistory?: ContractAuditEntry[];
  budget?: ContractBudget;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700' },
  EXPIRED: { label: 'Expired', color: 'bg-red-100 text-red-700' },
  TERMINATED: { label: 'Terminated', color: 'bg-red-100 text-red-700' },
  RENEWED: { label: 'Renewed', color: 'bg-blue-100 text-blue-700' },
};

const TYPE_LABELS: Record<string, string> = {
  MSA: 'Master Service Agreement',
  SOW: 'Statement of Work',
  AMENDMENT: 'Amendment',
  NDA: 'Non-Disclosure Agreement',
  OTHER: 'Other',
};

const BILLING_LABELS: Record<string, string> = {
  TM: 'Time & Material',
  FIXED: 'Fixed Price',
  RETAINER: 'Retainer',
  MILESTONE: 'Milestone',
  HYBRID: 'Hybrid',
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrencyValue(value: number, currency: string = 'USD'): string {
  if (currency === 'INR') {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  // Use Intl for proper currency formatting
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDaysRemaining(endDate?: string): { days: number; status: 'ok' | 'warning' | 'critical' } | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    days: diffDays,
    status: diffDays <= 0 ? 'critical' : diffDays <= 30 ? 'warning' : 'ok',
  };
}

// ============================================================================
// Main Component
// ============================================================================

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);

  // Fetch contract with React Query
  const { data: contract, isLoading, error, refetch } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const res = await api.get<{ data: ContractDetail }>(`/contracts/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/contracts/${id}`),
    onSuccess: () => {
      navigate('/contracts');
    },
  });

  // Handlers
  async function handleDelete() {
    if (!confirm('Delete this contract? This cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete contract. It may have linked projects.');
    }
  }

  // Loading state
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  // Error state
  if (error || !contract) {
    return (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error ? String(error) : 'Contract not found'}</p>
          <Button onClick={() => navigate('/contracts')}>Back to Contracts</Button>
        </div>
    );
  }

  const statusConfig = STATUS_CONFIG[contract.status] || STATUS_CONFIG.DRAFT;
  const daysRemaining = getDaysRemaining(contract.endDate);

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" onClick={() => navigate('/contracts')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{contract.name}</h1>
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium', statusConfig.color)}>
                  {statusConfig.label}
                </span>
                {daysRemaining && contract.status === 'ACTIVE' && (
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1',
                    daysRemaining.status === 'critical' ? 'bg-red-100 text-red-700' :
                    daysRemaining.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    <Clock className="h-3 w-3" />
                    {daysRemaining.days <= 0 
                      ? 'Expired' 
                      : `${daysRemaining.days} days left`
                    }
                  </span>
                )}
              </div>
              <p className="text-gray-500">{contract.contractNumber}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <ContractQuickActions
              contract={contract}
              onStatusChange={() => refetch()}
              onEdit={() => navigate(`/contracts/${contract.id}/edit`)}
              onRenew={() => setShowRenewalDialog(true)}
              onDelete={() => handleDelete()}
            />
          </div>
        </div>

        {/* Status Timeline */}
        <ContractStatusTimeline
          currentStatus={contract.status}
          startDate={contract.startDate}
          endDate={contract.endDate}
          signedDate={contract.signedDate}
          renewalDate={contract.renewalDate}
        />

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="milestones" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Milestones</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <File className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Budget</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Contract Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Contract Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      Contract Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-medium">{TYPE_LABELS[contract.type] || contract.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Billing Type</p>
                      <p className="font-medium">{BILLING_LABELS[contract.billingType] || contract.billingType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p className="font-medium">{formatDate(contract.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">End Date</p>
                      <p className="font-medium">{formatDate(contract.endDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Signed Date</p>
                      <p className="font-medium">{formatDate(contract.signedDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Auto Renew</p>
                      <p className="font-medium">{contract.autoRenew ? 'Yes' : 'No'}</p>
                    </div>
                    {contract.paymentTerms && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Payment Terms</p>
                        <p className="font-medium">{contract.paymentTerms}</p>
                      </div>
                    )}
                    {contract.description && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Description</p>
                        <p className="font-medium">{contract.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Linked Projects */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-gray-400" />
                      Linked Projects ({contract.projects.length})
                    </CardTitle>
                    <Can permission="projects:create">
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Link Project
                      </Button>
                    </Can>
                  </CardHeader>
                  <CardContent>
                    {contract.projects.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No projects linked to this contract</p>
                    ) : (
                      <div className="space-y-3">
                        {contract.projects.map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            <div>
                              <p className="font-medium text-gray-900">{project.name}</p>
                              <p className="text-sm text-gray-500">{project.code}</p>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                'px-2 py-1 rounded-full text-xs font-medium',
                                project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              )}>
                                {project.status}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                {project._count.allocations} allocations
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes */}
                {contract.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Client & Value Info */}
              <div className="space-y-6">
                {/* Client Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => navigate(`/clients/${contract.client.id}`)}
                    >
                      <p className="font-medium text-gray-900">{contract.client.name}</p>
                      <p className="text-sm text-gray-500">{contract.client.code}</p>
                      {contract.client.industry && (
                        <p className="text-sm text-gray-500 mt-1">{contract.client.industry}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Contract Value */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                      Contract Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contract.value ? (
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-3xl font-bold text-green-700">
                          {formatCurrencyValue(contract.value, contract.currency)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{contract.currency}</p>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No value specified</p>
                    )}
                  </CardContent>
                </Card>

                {/* Account Manager */}
                {contract.accountManager && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-gray-400" />
                        Account Manager
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium">
                          {contract.accountManager.firstName[0]}{contract.accountManager.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {contract.accountManager.firstName} {contract.accountManager.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{contract.accountManager.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Key Dates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      Key Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Start</span>
                      <span className="font-medium">{formatDate(contract.startDate)}</span>
                    </div>
                    {contract.endDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">End</span>
                        <span className="font-medium">{formatDate(contract.endDate)}</span>
                      </div>
                    )}
                    {contract.signedDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Signed</span>
                        <span className="font-medium">{formatDate(contract.signedDate)}</span>
                      </div>
                    )}
                    {contract.renewalDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Renewed</span>
                        <span className="font-medium">{formatDate(contract.renewalDate)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="mt-6">
            <ContractMilestones
              contractId={contract.id}
              milestones={contract.milestones || []}
              currency={contract.currency}
            />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            <ContractDocuments
              contractId={contract.id}
              documents={contract.documents || []}
            />
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="mt-6">
            <ContractBudgetPanel
              contractId={contract.id}
              contractValue={contract.value || 0}
              currency={contract.currency}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <ContractAuditHistory
              contractId={contract.id}
            />
          </TabsContent>
        </Tabs>

        {/* Renewal Dialog */}
        <ContractRenewalDialog
          isOpen={showRenewalDialog}
          onClose={() => setShowRenewalDialog(false)}
          contract={contract}
          onSuccess={() => refetch()}
        />
      </div>
  );
}

