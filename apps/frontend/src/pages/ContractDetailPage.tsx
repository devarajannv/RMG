import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  User,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';

// ============================================================================
// Types
// ============================================================================

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

function formatCurrency(value: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================================================
// Main Component
// ============================================================================

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) loadContract();
  }, [id]);

  async function loadContract() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: ContractDetail }>(`/contracts/${id}`);
      setContract(res.data);
    } catch (err) {
      console.error('Failed to load contract:', err);
      setError('Failed to load contract details');
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate() {
    if (!contract || !confirm('Activate this contract?')) return;
    setActionLoading(true);
    try {
      await api.post(`/contracts/${contract.id}/activate`);
      await loadContract();
    } catch (err) {
      console.error('Failed to activate:', err);
      alert('Failed to activate contract');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTerminate() {
    if (!contract) return;
    const reason = prompt('Reason for termination:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await api.post(`/contracts/${contract.id}/terminate`, { reason });
      await loadContract();
    } catch (err) {
      console.error('Failed to terminate:', err);
      alert('Failed to terminate contract');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRenew() {
    if (!contract) return;
    const newEndDateStr = prompt('New end date (YYYY-MM-DD):');
    if (!newEndDateStr) return;
    const newEndDate = new Date(newEndDateStr);
    if (isNaN(newEndDate.getTime())) {
      alert('Invalid date format');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/contracts/${contract.id}/renew`, { newEndDate });
      await loadContract();
      alert('Contract renewed successfully');
    } catch (err) {
      console.error('Failed to renew:', err);
      alert('Failed to renew contract');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!contract || !confirm('Delete this contract? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await api.delete(`/contracts/${contract.id}`);
      navigate('/contracts');
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete contract. It may have linked projects.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !contract) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Contract not found'}</p>
          <Button onClick={() => navigate('/contracts')}>Back to Contracts</Button>
        </div>
      </MainLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[contract.status];

  return (
    <MainLayout>
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
              </div>
              <p className="text-gray-500">{contract.contractNumber}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {contract.status === 'DRAFT' && (
              <Button onClick={handleActivate} disabled={actionLoading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate
              </Button>
            )}
            {contract.status === 'ACTIVE' && (
              <>
                <Button variant="outline" onClick={handleRenew} disabled={actionLoading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Renew
                </Button>
                <Button variant="outline" onClick={handleTerminate} disabled={actionLoading} className="text-red-600 hover:text-red-700">
                  <XCircle className="h-4 w-4 mr-2" />
                  Terminate
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => navigate(`/contracts/${contract.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="ghost" onClick={handleDelete} disabled={actionLoading} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
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
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Link Project
                </Button>
              </CardHeader>
              <CardContent>
                {contract.projects.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No projects linked to this contract</p>
                ) : (
                  <div className="space-y-3">
                    {contract.projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
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
                  className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
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
                      {formatCurrency(contract.value, contract.currency)}
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

            {/* Document */}
            {contract.documentUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Document</CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={contract.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100"
                  >
                    <FileText className="h-5 w-5" />
                    <span>View Contract Document</span>
                  </a>
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
      </div>
    </MainLayout>
  );
}

