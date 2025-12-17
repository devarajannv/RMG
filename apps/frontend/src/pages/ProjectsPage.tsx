import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  FolderKanban,
  TrendingUp,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  Edit,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
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

interface Project {
  id: string;
  code: string;
  name: string;
  type: 'BILLABLE' | 'INTERNAL' | 'PRESALES' | 'SUPPORT';
  status: 'PIPELINE' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  healthStatus?: 'GREEN' | 'AMBER' | 'RED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  startDate: string;
  endDate?: string;
  description?: string;
  category?: string;
  deliveryModel?: 'ONSITE' | 'OFFSHORE' | 'HYBRID';
  billingType?: 'TM' | 'FIXED' | 'RETAINER' | 'MILESTONE' | 'HYBRID';
  budgetHours?: number;
  budgetAmount?: number;
  defaultRate?: number;
  client?: { id: string; name: string; code: string };
  manager?: { id: string; firstName: string; lastName: string };
  practice?: { id: string; name: string };
  _count: { allocations: number };
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

interface ProjectsResponse {
  data: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Project Form Modal Component
function ProjectFormModal({
  isOpen,
  onClose,
  project,
  onSubmit,
  isLoading,
  clients,
  managers,
}: {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  clients: Client[];
  managers: Resource[];
}) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'BILLABLE' as Project['type'],
    status: 'PIPELINE' as Project['status'],
    priority: 'MEDIUM' as Project['priority'],
    healthStatus: 'GREEN' as 'GREEN' | 'AMBER' | 'RED',
    description: '',
    category: '',
    deliveryModel: 'HYBRID' as 'ONSITE' | 'OFFSHORE' | 'HYBRID',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    clientId: '',
    managerId: '',
    billingType: 'TM' as 'TM' | 'FIXED' | 'RETAINER' | 'MILESTONE' | 'HYBRID',
    budgetHours: 0,
    budgetAmount: 0,
    defaultRate: 0,
  });

  useEffect(() => {
    if (project) {
      setFormData({
        code: project.code || '',
        name: project.name || '',
        type: project.type || 'BILLABLE',
        status: project.status || 'PIPELINE',
        priority: project.priority || 'MEDIUM',
        healthStatus: project.healthStatus || 'GREEN',
        description: project.description || '',
        category: project.category || '',
        deliveryModel: project.deliveryModel || 'HYBRID',
        startDate: project.startDate?.split('T')[0] || '',
        endDate: project.endDate?.split('T')[0] || '',
        clientId: project.client?.id || '',
        managerId: project.manager?.id || '',
        billingType: project.billingType || 'TM',
        budgetHours: project.budgetHours || 0,
        budgetAmount: project.budgetAmount || 0,
        defaultRate: project.defaultRate || 0,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        type: 'BILLABLE',
        status: 'PIPELINE',
        priority: 'MEDIUM',
        healthStatus: 'GREEN',
        description: '',
        category: '',
        deliveryModel: 'HYBRID',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        clientId: '',
        managerId: '',
        billingType: 'TM',
        budgetHours: 0,
        budgetAmount: 0,
        defaultRate: 0,
      });
    }
  }, [project, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      clientId: formData.clientId || undefined,
      managerId: formData.managerId || undefined,
      budgetHours: formData.budgetHours || undefined,
      budgetAmount: formData.budgetAmount || undefined,
      defaultRate: formData.defaultRate || undefined,
    };
    onSubmit(submitData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Code *
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="PROJ-001"
                  required
                  disabled={!!project}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Project Name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Project['type'] })}
                  required
                >
                  <option value="BILLABLE">Billable</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="PRESALES">Pre-Sales</option>
                  <option value="SUPPORT">Support</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                >
                  <option value="PIPELINE">Pipeline</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Project['priority'] })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Health Status</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.healthStatus}
                  onChange={(e) => setFormData({ ...formData, healthStatus: e.target.value as 'GREEN' | 'AMBER' | 'RED' })}
                >
                  <option value="GREEN">Green</option>
                  <option value="AMBER">Amber</option>
                  <option value="RED">Red</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Model</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.deliveryModel}
                  onChange={(e) => setFormData({ ...formData, deliveryModel: e.target.value as 'ONSITE' | 'OFFSHORE' | 'HYBRID' })}
                >
                  <option value="ONSITE">Onsite</option>
                  <option value="OFFSHORE">Offshore</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.billingType}
                  onChange={(e) => setFormData({ ...formData, billingType: e.target.value as 'TM' | 'FIXED' | 'RETAINER' | 'MILESTONE' | 'HYBRID' })}
                >
                  <option value="TM">Time & Material</option>
                  <option value="FIXED">Fixed Price</option>
                  <option value="RETAINER">Retainer</option>
                  <option value="MILESTONE">Milestone</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Hours</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.budgetHours}
                  onChange={(e) => setFormData({ ...formData, budgetHours: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Amount ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budgetAmount}
                  onChange={(e) => setFormData({ ...formData, budgetAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Rate ($/hr)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.defaultRate}
                  onChange={(e) => setFormData({ ...formData, defaultRate: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Web Development, Mobile, Data Analytics"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string[]>(['ACTIVE', 'PIPELINE']);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Fetch projects
  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, page, status: statusFilter, type: typeFilter, priority: priorityFilter }],
    queryFn: () =>
      api.get<ProjectsResponse>(
        `/projects?page=${page}&limit=20&search=${search}&status=${statusFilter.join(',')}&type=${typeFilter}&priority=${priorityFilter}`
      ),
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

  const projects = data?.data ?? [];
  const pagination = data?.pagination;
  const clients: Client[] = clientsData?.data ?? [];
  const managers: Resource[] = resourcesData?.data ?? [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/projects', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowAddModal(false);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || error.message || 'Failed to create project');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/projects/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowEditModal(false);
      setSelectedProject(null);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || error.message || 'Failed to update project');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowDeleteDialog(false);
      setSelectedProject(null);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || error.message || 'Failed to delete project');
    },
  });

  // Handlers
  const handleCreateProject = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdateProject = (data: any) => {
    if (selectedProject) {
      updateMutation.mutate({ id: selectedProject.id, data });
    }
  };

  const handleDeleteProject = () => {
    if (selectedProject) {
      deleteMutation.mutate(selectedProject.id);
    }
  };

  const openEditModal = (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedProject(project);
    setShowEditModal(true);
  };

  const openDeleteDialog = (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedProject(project);
    setShowDeleteDialog(true);
  };

  const handleExport = () => {
    const headers = ['Code', 'Name', 'Type', 'Status', 'Priority', 'Client', 'Manager', 'Start Date', 'End Date'];
    const csvContent = [
      headers.join(','),
      ...projects.map((p) =>
        [
          p.code,
          `"${p.name}"`,
          p.type,
          p.status,
          p.priority,
          p.client?.name || '',
          p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : '',
          p.startDate?.split('T')[0] || '',
          p.endDate?.split('T')[0] || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projects-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setStatusFilter(['ACTIVE', 'PIPELINE']);
    setTypeFilter('');
    setPriorityFilter('');
    setSearch('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
      case 'PIPELINE': return 'bg-blue-100 text-blue-700';
      case 'ON_HOLD': return 'bg-amber-100 text-amber-700';
      case 'COMPLETED': return 'bg-slate-100 text-slate-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getHealthIcon = (health?: string) => {
    if (!health) return null;
    const colors = {
      GREEN: 'text-emerald-500',
      AMBER: 'text-amber-500',
      RED: 'text-red-500',
    };
    return <div className={cn('h-3 w-3 rounded-full bg-current', colors[health as keyof typeof colors])} />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BILLABLE': return 'text-emerald-600';
      case 'INTERNAL': return 'text-blue-600';
      case 'PRESALES': return 'text-purple-600';
      case 'SUPPORT': return 'text-amber-600';
      default: return 'text-slate-600';
    }
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
            <h1 className="text-2xl font-bold text-brand-charcoal">Projects</h1>
            <p className="text-muted-foreground">
              Manage projects and track progress
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Total Projects"
            value={pagination?.total ?? 0}
            icon={FolderKanban}
            color="blue"
          />
          <SummaryCard
            title="Active"
            value={projects.filter((p) => p.status === 'ACTIVE').length}
            icon={TrendingUp}
            color="green"
          />
          <SummaryCard
            title="Pipeline"
            value={projects.filter((p) => p.status === 'PIPELINE').length}
            icon={Clock}
            color="purple"
          />
          <SummaryCard
            title="At Risk"
            value={projects.filter((p) => p.healthStatus === 'RED').length}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {['ACTIVE', 'PIPELINE', 'ON_HOLD', 'COMPLETED'].map((status) => (
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
                    {status.replace('_', ' ')}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="BILLABLE">Billable</option>
                    <option value="INTERNAL">Internal</option>
                    <option value="PRESALES">Pre-Sales</option>
                    <option value="SUPPORT">Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
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

        {/* Projects Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                  <div className="mt-2 h-6 w-3/4 rounded bg-slate-200" />
                  <div className="mt-4 h-20 rounded bg-slate-100" />
                </CardContent>
              </Card>
            ))
          ) : projects.length === 0 ? (
            <div className="col-span-full flex h-64 flex-col items-center justify-center text-muted-foreground">
              <FolderKanban className="mb-4 h-12 w-12" />
              <p>No projects found</p>
              <Button variant="link" className="mt-2" onClick={() => setShowAddModal(true)}>
                Create your first project
              </Button>
            </div>
          ) : (
            projects.map((project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={cn('text-xs font-medium', getTypeColor(project.type))}>
                        {project.type}
                      </p>
                      <h3 className="mt-1 font-semibold">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getHealthIcon(project.healthStatus)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            navigate(`/projects/${project.id}`);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(project)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(project)}
                            destructive
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    {project.client && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{project.client.name}</span>
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {formatDate(project.startDate)}
                      {project.endDate && ` - ${formatDate(project.endDate)}`}
                    </p>
                    {project.manager && (
                      <p className="text-muted-foreground">
                        PM: {project.manager.firstName} {project.manager.lastName}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium',
                        getStatusColor(project.status)
                      )}
                    >
                      {project.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {project._count.allocations} allocations
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pagination.limit + 1} to{' '}
              {Math.min(page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} projects
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrev}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Add Project Modal */}
        <ProjectFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateProject}
          isLoading={createMutation.isPending}
          clients={clients}
          managers={managers}
        />

        {/* Edit Project Modal */}
        <ProjectFormModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          onSubmit={handleUpdateProject}
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
              setSelectedProject(null);
            }
          }}
          onConfirm={handleDeleteProject}
          title="Delete Project"
          description={`Are you sure you want to delete "${selectedProject?.name}"? This action cannot be undone and will remove all associated allocations and data.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      </motion.div>
    </MainLayout>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-accent-blue/10 text-accent-blue',
    green: 'bg-emerald-500/10 text-emerald-600',
    purple: 'bg-violet-500/10 text-violet-600',
    red: 'bg-red-500/10 text-red-600',
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn('rounded-lg p-2', colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
