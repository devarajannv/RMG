import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Download,
  Eye,
  Edit,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Play,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  ConfirmDialog,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface Contract {
  id: string;
  contractNumber: string;
  name: string;
  type: 'MSA' | 'SOW' | 'AMENDMENT' | 'NDA' | 'OTHER';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';
  description?: string;
  startDate: string;
  endDate?: string;
  signedDate?: string;
  value?: number;
  currency: string;
  billingType: 'TM' | 'FIXED' | 'RETAINER' | 'MILESTONE' | 'HYBRID';
  paymentTerms?: string;
  autoRenew: boolean;
  notes?: string;
  client: { id: string; name: string; code: string };
  accountManager?: { id: string; firstName: string; lastName: string };
  _count?: { projects: number };
}

interface Client {
  id: string;
  name: string;
  code: string;
}

interface Resource {
  id: string;
  firstName: string;
  lastName: string;
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

function formatCurrencyValue(value: number, currency: string = 'USD'): string {
  if (currency === 'INR') {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
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
// Contract Form Modal Component
// ============================================================================

function ContractFormModal({
  isOpen,
  onClose,
  contract,
  onSubmit,
  isLoading,
  clients,
  managers,
}: {
  isOpen: boolean;
  onClose: () => void;
  contract?: Contract | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  clients: Client[];
  managers: Resource[];
}) {
  const [formData, setFormData] = useState({
    clientId: '',
    contractNumber: '',
    name: '',
    type: 'SOW' as Contract['type'],
    status: 'DRAFT' as Contract['status'],
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    signedDate: '',
    value: 0,
    currency: 'INR',
    billingType: 'TM' as Contract['billingType'],
    paymentTerms: 'Net 30',
    autoRenew: false,
    accountMgrId: '',
    notes: '',
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        clientId: contract.client?.id || '',
        contractNumber: contract.contractNumber || '',
        name: contract.name || '',
        type: contract.type || 'SOW',
        status: contract.status || 'DRAFT',
        description: contract.description || '',
        startDate: contract.startDate?.split('T')[0] || '',
        endDate: contract.endDate?.split('T')[0] || '',
        signedDate: contract.signedDate?.split('T')[0] || '',
        value: contract.value || 0,
        currency: contract.currency || 'INR',
        billingType: contract.billingType || 'TM',
        paymentTerms: contract.paymentTerms || 'Net 30',
        autoRenew: contract.autoRenew || false,
        accountMgrId: contract.accountManager?.id || '',
        notes: contract.notes || '',
      });
    } else {
      setFormData({
        clientId: '',
        contractNumber: '',
        name: '',
        type: 'SOW',
        status: 'DRAFT',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        signedDate: '',
        value: 0,
        currency: 'INR',
        billingType: 'TM',
        paymentTerms: 'Net 30',
        autoRenew: false,
        accountMgrId: '',
        notes: '',
      });
    }
  }, [contract, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = {
      clientId: formData.clientId,
      contractNumber: formData.contractNumber,
      name: formData.name,
      type: formData.type,
      billingType: formData.billingType,
      startDate: new Date(formData.startDate),
      currency: formData.currency,
    };

    if (formData.description) submitData.description = formData.description;
    if (formData.endDate) submitData.endDate = new Date(formData.endDate);
    if (formData.signedDate) submitData.signedDate = new Date(formData.signedDate);
    if (formData.value > 0) submitData.value = formData.value;
    if (formData.paymentTerms) submitData.paymentTerms = formData.paymentTerms;
    if (formData.accountMgrId) submitData.accountMgrId = formData.accountMgrId;
    if (formData.notes) submitData.notes = formData.notes;
    submitData.autoRenew = formData.autoRenew;

    if (contract) {
      submitData.status = formData.status;
    }

    onSubmit(submitData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" preventDismiss>
        <DialogHeader>
          <DialogTitle>{contract ? 'Edit Contract' : 'Create New Contract'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  required
                  disabled={!!contract}
                >
                  <option value="">Select Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Number *
                </label>
                <Input
                  value={formData.contractNumber}
                  onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                  placeholder="CTR-2024-001"
                  required
                  disabled={!!contract}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Project Implementation Agreement"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Contract['type'] })}
                  required
                >
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {contract && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Contract['status'] })}
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Contract description..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signed Date</label>
                <Input
                  type="date"
                  value={formData.signedDate}
                  onChange={(e) => setFormData({ ...formData, signedDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.billingType}
                  onChange={(e) => setFormData({ ...formData, billingType: e.target.value as Contract['billingType'] })}
                  required
                >
                  {Object.entries(BILLING_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                >
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Manager</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.accountMgrId}
                  onChange={(e) => setFormData({ ...formData, accountMgrId: e.target.value })}
                >
                  <option value="">Select Manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRenew"
                checked={formData.autoRenew}
                onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="autoRenew" className="text-sm text-gray-700">
                Auto-renew contract
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : contract ? 'Update Contract' : 'Create Contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ContractsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', '20');
  if (searchTerm) queryParams.set('search', searchTerm);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (typeFilter) queryParams.set('type', typeFilter);

  // Fetch contracts
  const { data: contractsData, isLoading } = useQuery({
    queryKey: ['contracts', { page, searchTerm, statusFilter, typeFilter }],
    queryFn: () => api.get<{ data: Contract[]; pagination: any }>(`/contracts?${queryParams.toString()}`),
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['contracts-stats'],
    queryFn: () => api.get<{ data: ContractStats }>('/contracts/stats/summary'),
  });

  // Fetch clients for form
  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get<{ data: Client[] }>('/clients?limit=100'),
  });

  // Fetch resources for manager selection
  const { data: resourcesData } = useQuery({
    queryKey: ['resources-list'],
    queryFn: () => api.get<{ data: Resource[] }>('/resources?limit=100'),
  });

  const contracts: Contract[] = contractsData?.data ?? [];
  const pagination = contractsData?.pagination;
  const stats: ContractStats | null = statsData?.data ?? null;
  const clients: Client[] = clientsData?.data ?? [];
  const managers: Resource[] = resourcesData?.data ?? [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/contracts', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      setShowAddModal(false);
    },
    onError: (error: any) => {
      console.error('API Error:', error); alert('Failed to create contract. Please try again.');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/contracts/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      setShowEditModal(false);
      setSelectedContract(null);
    },
    onError: (error: any) => {
      console.error('API Error:', error); alert('Failed to update contract. Please try again.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      setShowDeleteDialog(false);
      setSelectedContract(null);
    },
    onError: (error: any) => {
      console.error('API Error:', error); alert('Failed to delete contract. Please try again.');
    },
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/contracts/${id}/activate`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
    },
    onError: (error: any) => {
      console.error('API Error:', error); alert('Failed to activate contract. Please try again.');
    },
  });

  // Handlers
  const handleCreateContract = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdateContract = (data: any) => {
    if (selectedContract) {
      const { clientId, contractNumber, ...updateData } = data;
      updateMutation.mutate({ id: selectedContract.id, data: updateData });
    }
  };

  const handleDeleteContract = () => {
    if (selectedContract) {
      deleteMutation.mutate(selectedContract.id);
    }
  };

  const handleActivateContract = (contract: Contract, e?: React.MouseEvent) => {
    e?.stopPropagation();
    activateMutation.mutate(contract.id);
  };

  const openEditModal = (contract: Contract, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedContract(contract);
    setShowEditModal(true);
  };

  const openDeleteDialog = (contract: Contract, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedContract(contract);
    setShowDeleteDialog(true);
  };

  const handleExport = () => {
    const headers = [
      'Contract Number',
      'Name',
      'Client',
      'Type',
      'Status',
      'Billing Type',
      'Start Date',
      'End Date',
      'Value',
      'Currency',
    ];
    const csvContent = [
      headers.join(','),
      ...contracts.map((c) =>
        [
          c.contractNumber,
          `"${c.name}"`,
          c.client.name,
          c.type,
          c.status,
          c.billingType,
          c.startDate?.split('T')[0] || '',
          c.endDate?.split('T')[0] || '',
          c.value || '',
          c.currency,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setSearchTerm('');
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
  };

  const StatusBadge = ({ status }: { status: Contract['status'] }) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
          config.color
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
            <p className="text-gray-500 text-sm">Manage client contracts and agreements</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          </div>
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
                <p className="text-2xl font-bold text-red-700">
                  {stats.byStatus['EXPIRED'] || 0}
                </p>
                <p className="text-xs text-gray-500">Expired</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrencyValue(stats.totalActiveValue)}
                </p>
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

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Status</label>
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Type</label>
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Types</option>
                    {Object.entries(TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button variant="ghost" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Contracts List */}
        {!isLoading && contracts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No contracts found</p>
              <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                Create First Contract
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && contracts.length > 0 && (
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
                      const isExpiringSoon =
                        daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 30;

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
                                  {formatCurrencyValue(contract.value, contract.currency)}
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigate(`/contracts/${contract.id}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditModal(contract)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {contract.status === 'DRAFT' && (
                                  <DropdownMenuItem
                                    onClick={() => handleActivateContract(contract)}
                                  >
                                    <Play className="h-4 w-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(contract)}
                                  destructive
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-500">
                    Page {page} of {pagination.totalPages}
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
                      disabled={page === pagination.totalPages}
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
                {stats.expiringSoon} contract(s) expiring within the next 30 days. Review and take
                action to avoid service disruption.
              </p>
              <Button
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => {
                  setStatusFilter('ACTIVE');
                  setShowFilters(true);
                }}
              >
                View Expiring Contracts
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Contract Modal */}
        <ContractFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateContract}
          isLoading={createMutation.isPending}
          clients={clients}
          managers={managers}
        />

        {/* Edit Contract Modal */}
        <ContractFormModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          onSubmit={handleUpdateContract}
          isLoading={updateMutation.isPending}
          clients={clients}
          managers={managers}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowDeleteDialog(false);
              setSelectedContract(null);
            }
          }}
          onConfirm={handleDeleteContract}
          title="Delete Contract"
          description={`Are you sure you want to delete "${selectedContract?.name}"? This action cannot be undone and will affect all linked projects.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      </div>
  );
}
