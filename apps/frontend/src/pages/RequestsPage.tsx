import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit,
  X,
  ArrowUpRight,
  Calendar,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';
import { PERMISSIONS } from '@/hooks/usePermissions';
import { Can } from '@/components/permissions/Can';

// ============================================================================
// Types
// ============================================================================

interface Request {
  id: string;
  requestNumber: string;
  typeCode: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'ON_HOLD';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requestData: Record<string, unknown>;
  requestedCompletionDate?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  resource?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  project?: {
    id: string;
    name: string;
    code: string;
  };
  currentApproval?: {
    id: string;
    stepOrder: number;
    status: string;
    approverRole: string;
    assignedTo?: {
      firstName: string;
      lastName: string;
    };
  };
  requestType: {
    code: string;
    name: string;
    category: string;
    icon?: string;
  };
}

interface RequestType {
  code: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  isActive: boolean;
}

interface RequestsResponse {
  data: Request[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface DashboardStats {
  myRequests: {
    total: number;
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  pendingApprovals: number;
  recentRequests: Request[];
}

// ============================================================================
// Status & Priority Helpers
// ============================================================================

const statusConfig: Record<Request['status'], { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: ArrowUpRight },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: X },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  ON_HOLD: { label: 'On Hold', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
};

const priorityConfig: Record<Request['priority'], { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-600' },
};

const categoryConfig: Record<string, { label: string; color: string }> = {
  RESOURCE: { label: 'Resource', color: 'text-violet-600' },
  PROJECT: { label: 'Project', color: 'text-blue-600' },
  TIME: { label: 'Time & Leave', color: 'text-green-600' },
  FINANCIAL: { label: 'Financial', color: 'text-amber-600' },
  ADMINISTRATIVE: { label: 'Administrative', color: 'text-gray-600' },
};

// ============================================================================
// Create Request Modal
// ============================================================================

function CreateRequestModal({
  isOpen,
  onClose,
  requestTypes,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  requestTypes: RequestType[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [step, setStep] = useState<'select-type' | 'fill-form'>('select-type');
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as Request['priority'],
    requestedCompletionDate: '',
    requestData: {} as Record<string, unknown>,
  });

  const handleSelectType = (type: RequestType) => {
    setSelectedType(type);
    setFormData(prev => ({
      ...prev,
      title: '',
      description: '',
    }));
    setStep('fill-form');
  };

  const handleSubmit = () => {
    if (!selectedType) return;
    onSubmit({
      typeCode: selectedType.code,
      ...formData,
    });
  };

  const handleClose = () => {
    setStep('select-type');
    setSelectedType(null);
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      requestedCompletionDate: '',
      requestData: {},
    });
    onClose();
  };

  // Group request types by category
  const groupedTypes = requestTypes.reduce((acc, type) => {
    const category = type.category || 'OTHER';
    if (!acc[category]) acc[category] = [];
    acc[category].push(type);
    return acc;
  }, {} as Record<string, RequestType[]>);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(step === 'select-type' ? 'max-w-3xl' : 'max-w-xl')}>
        <DialogHeader>
          <DialogTitle>
            {step === 'select-type' ? 'Create New Request' : `New ${selectedType?.name}`}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {step === 'select-type' ? (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">
                Select the type of request you want to create
              </p>
              {Object.entries(groupedTypes).map(([category, types]) => (
                <div key={category}>
                  <h3 className={cn(
                    'text-sm font-medium mb-3',
                    categoryConfig[category]?.color || 'text-gray-600'
                  )}>
                    {categoryConfig[category]?.label || category}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {types.filter(t => t.isActive).map((type) => (
                      <button
                        key={type.code}
                        onClick={() => handleSelectType(type)}
                        className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{type.name}</p>
                          {type.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {type.description}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setStep('select-type')}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                ← Change request type
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={`Enter ${selectedType?.name?.toLowerCase()} title`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide details about your request..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Request['priority'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Needed By
                  </label>
                  <Input
                    type="date"
                    value={formData.requestedCompletionDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, requestedCompletionDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogBody>
        {step === 'fill-form' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Request'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Request Card Component
// ============================================================================

function RequestCard({ request, onClick }: { request: Request; onClick: () => void }) {
  const status = statusConfig[request.status] || { label: request.status || 'Unknown', color: 'bg-gray-100 text-gray-700', icon: FileText };
  const priority = priorityConfig[request.priority] || { label: request.priority || 'Medium', color: 'bg-blue-100 text-blue-600' };
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">{request.requestNumber}</span>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', priority.color)}>
            {priority.label}
          </span>
        </div>
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1', status.color)}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{request.title}</h3>
      
      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
        {request.description || 'No description provided'}
      </p>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className={cn('font-medium', request.requestType ? categoryConfig[request.requestType.category]?.color : 'text-gray-600')}>
          {request.requestType?.name || request.typeCode || 'Unknown Type'}
        </span>
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {request.requester?.firstName} {request.requester?.lastName}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(request.createdAt)}
        </span>
      </div>

      {request.currentApproval && request.status === 'PENDING_APPROVAL' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-amber-600">
            Pending: {request.currentApproval.approverRole}
            {request.currentApproval.assignedTo && (
              <span className="text-gray-500">
                {' '}({request.currentApproval.assignedTo.firstName} {request.currentApproval.assignedTo.lastName})
              </span>
            )}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function RequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my-requests' | 'pending-approvals'>('all');

  // Fetch request types
  const { data: requestTypesData } = useQuery({
    queryKey: ['request-types'],
    queryFn: async () => {
      const response = await api.get<{ data: RequestType[] }>('/request-types');
      return response.data;
    },
  });

  // Fetch dashboard stats
  const { data: dashboardData } = useQuery({
    queryKey: ['requests-dashboard'],
    queryFn: async () => {
      const response = await api.get<{ data: DashboardStats }>('/requests/dashboard');
      return response.data;
    },
  });

  // Fetch requests based on active tab
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['requests', activeTab, searchQuery, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      statusFilter.forEach(s => params.append('status', s));
      typeFilter.forEach(t => params.append('typeCode', t));
      
      let endpoint = '/requests';
      if (activeTab === 'my-requests') endpoint = '/requests/my-requests';
      if (activeTab === 'pending-approvals') endpoint = '/requests/pending-approvals';
      
      const response = await api.get<RequestsResponse>(`${endpoint}?${params}`);
      return response;
    },
  });

  // Create request mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/requests', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['requests-dashboard'] });
      setShowCreateModal(false);
    },
  });

  const stats = dashboardData;
  const requests = requestsData?.data || [];
  const requestTypes = requestTypesData || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
            <p className="text-gray-500 mt-1">Manage and track all requests</p>
          </div>
          <Can permission={PERMISSIONS.REQUESTS_CREATE}>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </Can>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.myRequests?.total || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Drafts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.myRequests?.draft || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Edit className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.myRequests?.pending || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.myRequests?.approved || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">My Approvals</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.pendingApprovals || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            All Requests
          </button>
          <button
            onClick={() => setActiveTab('my-requests')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'my-requests' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            My Requests
          </button>
          <button
            onClick={() => setActiveTab('pending-approvals')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              activeTab === 'pending-approvals' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Pending My Approval
            {(stats?.pendingApprovals || 0) > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                {stats?.pendingApprovals}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Status
                {statusFilter.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-primary text-white rounded text-xs">
                    {statusFilter.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {Object.entries(statusConfig).map(([value, config]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => {
                    setStatusFilter(prev =>
                      prev.includes(value)
                        ? prev.filter(s => s !== value)
                        : [...prev, value]
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(value)}
                      onChange={() => {}}
                      className="rounded"
                    />
                    <span className={cn('px-2 py-0.5 rounded text-xs', config.color)}>
                      {config.label}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              {statusFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter([])}>
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                Type
                {typeFilter.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-primary text-white rounded text-xs">
                    {typeFilter.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
              {requestTypes.map((type) => (
                <DropdownMenuItem
                  key={type.code}
                  onClick={() => {
                    setTypeFilter(prev =>
                      prev.includes(type.code)
                        ? prev.filter(t => t !== type.code)
                        : [...prev, type.code]
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={typeFilter.includes(type.code)}
                      onChange={() => {}}
                      className="rounded"
                    />
                    <span>{type.name}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              {typeFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter([])}>
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Request List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-500 mb-4">
                {activeTab === 'pending-approvals'
                  ? "You don't have any requests pending your approval"
                  : "Get started by creating your first request"}
              </p>
              {activeTab !== 'pending-approvals' && (
                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Request
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onClick={() => navigate(`/requests/${request.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        requestTypes={requestTypes}
        onSubmit={createMutation.mutate}
        isLoading={createMutation.isPending}
      />
    </MainLayout>
  );
}
