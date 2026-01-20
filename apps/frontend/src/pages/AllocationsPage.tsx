import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
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
import { cn, formatDate } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Allocation {
  id: string;
  role: string;
  percentage: number;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  status: 'PROPOSED' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  isBillable: boolean;
  billRate?: number;
  notes?: string;
  resource: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    designation: string;
    practice?: { name: string };
  };
  project: {
    id: string;
    code: string;
    name: string;
    client?: { name: string };
  };
}

interface Resource {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  designation?: string;
}

interface Project {
  id: string;
  code: string;
  name: string;
  client?: { name: string };
}

interface AllocationsResponse {
  data: Allocation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RolloffResponse {
  data: Allocation[];
}

// Allocation Form Modal Component
function AllocationFormModal({
  isOpen,
  onClose,
  allocation,
  onSubmit,
  isLoading,
  resources,
  projects,
  currencySymbol,
}: {
  isOpen: boolean;
  onClose: () => void;
  allocation?: Allocation | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  resources: Resource[];
  projects: Project[];
  currencySymbol: string;
}) {
  const [formData, setFormData] = useState({
    resourceId: '',
    projectId: '',
    role: '',
    percentage: 100,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'PROPOSED' as Allocation['status'],
    isBillable: true,
    billRate: 0,
    notes: '',
  });

  useEffect(() => {
    if (allocation) {
      setFormData({
        resourceId: allocation.resource.id,
        projectId: allocation.project.id,
        role: allocation.role || '',
        percentage: allocation.percentage || 100,
        startDate: allocation.startDate?.split('T')[0] || '',
        endDate: allocation.endDate?.split('T')[0] || '',
        status: allocation.status || 'PROPOSED',
        isBillable: allocation.isBillable ?? true,
        billRate: allocation.billRate || 0,
        notes: allocation.notes || '',
      });
    } else {
      setFormData({
        resourceId: '',
        projectId: '',
        role: '',
        percentage: 100,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'PROPOSED',
        isBillable: true,
        billRate: 0,
        notes: '',
      });
    }
  }, [allocation, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      resourceId: formData.resourceId,
      projectId: formData.projectId,
      role: formData.role,
      percentage: formData.percentage,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      isBillable: formData.isBillable,
      billRate: formData.billRate || undefined,
      notes: formData.notes || undefined,
      ...(allocation && { status: formData.status }),
    };
    onSubmit(submitData);
  };

  const commonRoles = [
    'Developer',
    'Senior Developer',
    'Tech Lead',
    'Architect',
    'Designer',
    'UX Designer',
    'Project Manager',
    'Business Analyst',
    'QA Engineer',
    'DevOps Engineer',
    'Data Engineer',
    'Data Scientist',
    'Product Manager',
    'Scrum Master',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{allocation ? 'Edit Allocation' : 'Create New Allocation'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={formData.resourceId}
                onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                required
                disabled={!!allocation}
              >
                <option value="">Select Resource</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.firstName} {resource.lastName} ({resource.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                required
                disabled={!!allocation}
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.code})
                    {project.client && ` - ${project.client.name}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="">Select Role</option>
                {commonRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allocation % *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.percentage}
                  onChange={(e) =>
                    setFormData({ ...formData, percentage: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </div>
              {allocation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as Allocation['status'] })
                    }
                  >
                    <option value="PROPOSED">Proposed</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  min={formData.startDate}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billable</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.isBillable ? 'yes' : 'no'}
                  onChange={(e) => setFormData({ ...formData, isBillable: e.target.value === 'yes' })}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bill Rate ({currencySymbol}/hr)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.billRate}
                  onChange={(e) =>
                    setFormData({ ...formData, billRate: parseFloat(e.target.value) || 0 })
                  }
                  disabled={!formData.isBillable}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this allocation..."
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : allocation ? 'Update Allocation' : 'Create Allocation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AllocationsPage() {
  const queryClient = useQueryClient();
  
  // Get currency context
  const { getCurrencySymbol } = useCurrency();
  const currencySymbol = getCurrencySymbol();
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string[]>(['ACTIVE', 'CONFIRMED', 'PROPOSED']);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [resourceFilter, setResourceFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [billableFilter, setBillableFilter] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', '20');
  if (statusFilter.length > 0) queryParams.set('status', statusFilter.join(','));
  if (resourceFilter) queryParams.set('resourceId', resourceFilter);
  if (projectFilter) queryParams.set('projectId', projectFilter);
  if (billableFilter) queryParams.set('isBillable', billableFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['allocations', { page, statusFilter, resourceFilter, projectFilter, billableFilter }],
    queryFn: () => api.get<AllocationsResponse>(`/allocations?${queryParams.toString()}`),
  });

  const { data: rolloffsData } = useQuery({
    queryKey: ['rolloffs'],
    queryFn: () => api.get<RolloffResponse>('/allocations/rolloffs?days=30'),
  });

  // Fetch resources and projects for the form
  const { data: resourcesData } = useQuery({
    queryKey: ['resources-list'],
    queryFn: () => api.get<{ data: Resource[] }>('/resources?limit=100'),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get<{ data: Project[] }>('/projects?limit=100&status=ACTIVE,PIPELINE'),
  });

  const allocations = data?.data ?? [];
  const pagination = data?.pagination;
  const rolloffs = rolloffsData?.data ?? [];
  const resources: Resource[] = resourcesData?.data ?? [];
  const projects: Project[] = projectsData?.data ?? [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/allocations', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['rolloffs'] });
      setShowAddModal(false);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || error.message || 'Failed to create allocation');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/allocations/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['rolloffs'] });
      setShowEditModal(false);
      setSelectedAllocation(null);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || error.message || 'Failed to update allocation');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/allocations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['rolloffs'] });
      setShowDeleteDialog(false);
      setSelectedAllocation(null);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || error.message || 'Failed to delete allocation');
    },
  });

  // Handlers
  const handleCreateAllocation = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdateAllocation = (data: any) => {
    if (selectedAllocation) {
      // Remove resourceId and projectId from update
      const { resourceId, projectId, ...updateData } = data;
      updateMutation.mutate({ id: selectedAllocation.id, data: updateData });
    }
  };

  const handleDeleteAllocation = () => {
    if (selectedAllocation) {
      deleteMutation.mutate(selectedAllocation.id);
    }
  };

  const openEditModal = (allocation: Allocation) => {
    setSelectedAllocation(allocation);
    setShowEditModal(true);
  };

  const openDeleteDialog = (allocation: Allocation) => {
    setSelectedAllocation(allocation);
    setShowDeleteDialog(true);
  };

  const handleExport = () => {
    const headers = [
      'Resource',
      'Employee ID',
      'Project',
      'Client',
      'Role',
      'Percentage',
      'Start Date',
      'End Date',
      'Status',
      'Billable',
    ];
    const csvContent = [
      headers.join(','),
      ...allocations.map((a) =>
        [
          `"${a.resource.firstName} ${a.resource.lastName}"`,
          a.resource.employeeId,
          `"${a.project.name}"`,
          a.project.client?.name || 'Internal',
          a.role,
          a.percentage,
          a.startDate?.split('T')[0] || '',
          a.endDate?.split('T')[0] || '',
          a.status,
          a.isBillable ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allocations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setStatusFilter(['ACTIVE', 'CONFIRMED', 'PROPOSED']);
    setResourceFilter('');
    setProjectFilter('');
    setBillableFilter('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'PROPOSED':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getDaysUntilEnd = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-charcoal">Allocations</h1>
            <p className="text-muted-foreground">Manage resource assignments to projects</p>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-lg border p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </Button>
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Allocation
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allocations.filter((a) => a.status === 'ACTIVE').length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allocations.filter((a) => a.status === 'PROPOSED').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-accent-orange/10 p-2 text-accent-orange">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rolloffs.length}</p>
                <p className="text-sm text-muted-foreground">Roll-offs (30d)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-accent-blue/10 p-2 text-accent-blue">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pagination?.total ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search allocations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {['ACTIVE', 'CONFIRMED', 'PROPOSED', 'COMPLETED'].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter.includes(status) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (statusFilter.includes(status)) {
                        setStatusFilter(statusFilter.filter((s) => s !== status));
                      } else {
                        setStatusFilter([...statusFilter, status]);
                      }
                    }}
                  >
                    {status}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                More Filters
                {showMoreFilters ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>

            {showMoreFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 mt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={resourceFilter}
                    onChange={(e) => setResourceFilter(e.target.value)}
                  >
                    <option value="">All Resources</option>
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.firstName} {r.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                  >
                    <option value="">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billable</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={billableFilter}
                    onChange={(e) => setBillableFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="true">Billable Only</option>
                    <option value="false">Non-Billable Only</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allocations List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{pagination?.total ?? 0} Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : allocations.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                <Calendar className="mb-4 h-12 w-12" />
                <p>No allocations found</p>
                <Button variant="link" className="mt-2" onClick={() => setShowAddModal(true)}>
                  Create your first allocation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {allocations.map((allocation) => {
                  const daysUntilEnd = getDaysUntilEnd(allocation.endDate);
                  const isEndingSoon = daysUntilEnd > 0 && daysUntilEnd <= 14;

                  return (
                    <div
                      key={allocation.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-slate-50',
                        isEndingSoon && 'border-amber-200 bg-amber-50/50'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {/* Resource Avatar */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {allocation.resource.firstName.charAt(0)}
                          {allocation.resource.lastName.charAt(0)}
                        </div>

                        {/* Resource Info */}
                        <div>
                          <p className="font-medium">
                            {allocation.resource.firstName} {allocation.resource.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {allocation.resource.designation}
                            {allocation.resource.practice &&
                              ` • ${allocation.resource.practice.name}`}
                          </p>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />

                        {/* Project Info */}
                        <div>
                          <p className="font-medium">{allocation.project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {allocation.project.client?.name ?? 'Internal'} • {allocation.role}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Percentage */}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{allocation.percentage}%</p>
                          <p className="text-xs text-muted-foreground">
                            {allocation.isBillable ? 'Billable' : 'Non-billable'}
                          </p>
                        </div>

                        {/* Dates */}
                        <div className="text-right min-w-[140px]">
                          <p className="text-sm font-medium">{formatDate(allocation.startDate)}</p>
                          <p className="text-sm text-muted-foreground">
                            to {formatDate(allocation.endDate)}
                          </p>
                          {isEndingSoon && (
                            <p className="text-xs text-amber-600">Ends in {daysUntilEnd} days</p>
                          )}
                        </div>

                        {/* Status */}
                        <span
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-medium',
                            getStatusColor(allocation.status)
                          )}
                        >
                          {allocation.status}
                        </span>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(allocation)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(allocation)}
                              destructive
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roll-offs Section */}
        {rolloffs.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Upcoming Roll-offs (Next 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {rolloffs.slice(0, 6).map((rolloff) => (
                  <div
                    key={rolloff.id}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {rolloff.resource.firstName} {rolloff.resource.lastName}
                      </p>
                      <span className="text-sm font-medium text-amber-700">
                        {getDaysUntilEnd(rolloff.endDate)}d
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{rolloff.project.name}</p>
                    <p className="mt-1 text-xs text-amber-600">
                      Ends {formatDate(rolloff.endDate)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Allocation Modal */}
        <AllocationFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateAllocation}
          isLoading={createMutation.isPending}
          resources={resources}
          projects={projects}
          currencySymbol={currencySymbol}
        />

        {/* Edit Allocation Modal */}
        <AllocationFormModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAllocation(null);
          }}
          allocation={selectedAllocation}
          onSubmit={handleUpdateAllocation}
          isLoading={updateMutation.isPending}
          resources={resources}
          projects={projects}
          currencySymbol={currencySymbol}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowDeleteDialog(false);
              setSelectedAllocation(null);
            }
          }}
          onConfirm={handleDeleteAllocation}
          title="Delete Allocation"
          description={`Are you sure you want to delete the allocation for "${selectedAllocation?.resource?.firstName} ${selectedAllocation?.resource?.lastName}" on "${selectedAllocation?.project?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      </motion.div>
    </MainLayout>
  );
}
