import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MoreHorizontal,
  Building2,
  Calendar,
  DollarSign,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';

// ============================================================================
// Types
// ============================================================================

interface Contract {
  id: string;
  contractNumber: string;
  name: string;
  type: 'MSA' | 'SOW' | 'AMENDMENT' | 'NDA' | 'OTHER';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';
  startDate: string;
  endDate?: string;
  signedDate?: string;
  value?: number;
  currency: string;
  billingType: 'TM' | 'FIXED' | 'RETAINER' | 'MILESTONE' | 'HYBRID';
  autoRenew: boolean;
  client: { id: string; name: string; code: string };
  accountManager?: { id: string; firstName: string; lastName: string };
  _count?: { projects: number };
}

interface ContractStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  expiringSoon: number;
  expiringLater: number;
  totalActiveValue: number;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  PENDING_APPROVAL: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  EXPIRED: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: XCircle },
  TERMINATED: { label: 'Terminated', color: 'bg-red-100 text-red-700', icon: XCircle },
  RENEWED: { label: 'Renewed', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
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
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDaysUntilExpiry(endDate?: string): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Main Component
// ============================================================================

export default function ContractsPage() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [page, statusFilter, typeFilter]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
      });

      const [contractsRes, statsRes] = await Promise.all([
        api.get<{ data: Contract[]; pagination: { totalPages: number } }>(`/contracts?${params}`),
        api.get<{ data: ContractStats }>('/contracts/stats/summary'),
      ]);

      setContracts(contractsRes.data);
      setTotalPages(contractsRes.pagination.totalPages);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load contracts:', err);
      setError('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    setPage(1);
    loadData();
  }

  const StatusBadge = ({ status }: { status: Contract['status'] }) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
            <p className="text-gray-500 text-sm">Manage client contracts and agreements</p>
          </div>
          <Button onClick={() => navigate('/contracts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Contracts</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{stats.byStatus['ACTIVE'] || 0}</p>
                <p className="text-xs text-gray-500">Active</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-700">{stats.byStatus['DRAFT'] || 0}</p>
                <p className="text-xs text-gray-500">Draft</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-700">{stats.expiringSoon}</p>
                <p className="text-xs text-gray-500">Expiring (30d)</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{stats.byStatus['EXPIRED'] || 0}</p>
                <p className="text-xs text-gray-500">Expired</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalActiveValue)}</p>
                <p className="text-xs text-gray-500">Active Value</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[300px] flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, number, or client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch}>Search</Button>
              </div>

              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Status</label>
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  >
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Type</label>
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                  >
                    <option value="">All Types</option>
                    {Object.entries(TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(1); }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error}
            <Button variant="link" onClick={loadData} className="ml-2">Retry</Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Contracts List */}
        {!loading && contracts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No contracts found</p>
              <Button className="mt-4" onClick={() => navigate('/contracts/new')}>
                Create First Contract
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && contracts.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Contract</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Client</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Type</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Duration</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-600">Value</th>
                      <th className="text-center p-4 text-sm font-medium text-gray-600">Projects</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contracts.map((contract) => {
                      const daysToExpiry = getDaysUntilExpiry(contract.endDate);
                      const isExpiringSoon = daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 30;

                      return (
                        <tr
                          key={contract.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/contracts/${contract.id}`)}
                        >
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-gray-900">{contract.name}</p>
                              <p className="text-sm text-gray-500">{contract.contractNumber}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-900">{contract.client.name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-gray-700">
                              {TYPE_LABELS[contract.type] || contract.type}
                            </span>
                            <p className="text-xs text-gray-500">
                              {BILLING_LABELS[contract.billingType] || contract.billingType}
                            </p>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={contract.status} />
                            {isExpiringSoon && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                                <AlertTriangle className="h-3 w-3" />
                                {daysToExpiry} days left
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-gray-700">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {formatDate(contract.startDate)}
                            </div>
                            {contract.endDate && (
                              <p className="text-xs text-gray-500">
                                to {formatDate(contract.endDate)}
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {contract.value ? (
                              <div className="flex items-center justify-end gap-1">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(contract.value, contract.currency)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                              {contract._count?.projects || 0}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expiring Soon Alert */}
        {stats && stats.expiringSoon > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                Contracts Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700 mb-3">
                {stats.expiringSoon} contract(s) expiring within the next 30 days.
                Review and take action to avoid service disruption.
              </p>
              <Button
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => { setStatusFilter('ACTIVE'); setShowFilters(true); }}
              >
                View Expiring Contracts
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

