import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Plus,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  DollarSign,
  Briefcase,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  ConfirmDialog,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import MainLayout from '../components/layout/MainLayout';

// Skill can be a string or an object from the API
type SkillItem = string | {
  resourceId?: string;
  skillId?: string;
  id?: string;
  name?: string;
  proficiency?: number;
  skill?: { id: string; name: string; category?: string };
};

// Helper to extract skill name from various skill formats
function getSkillName(skill: SkillItem): string {
  if (typeof skill === 'string') return skill;
  if (skill?.skill?.name) return skill.skill.name;
  if (skill?.name) return skill.name;
  return 'Unknown';
}

// Helper to extract skill names array
function getSkillNames(skills: SkillItem[] | undefined | null): string[] {
  if (!skills) return [];
  return skills.map(getSkillName);
}

interface Resource {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  skills: SkillItem[];
  availability: string;
  costRate: number;
  billRate: number;
  location: string;
  startDate: string;
  status: string;
  manager?: string;
  phone?: string;
  certifications?: string[];
  yearsOfExperience?: number;
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

// Resource Form Modal Component
function ResourceFormModal({
  isOpen,
  onClose,
  resource,
  onSubmit,
  isLoading,
  skills,
}: {
  isOpen: boolean;
  onClose: () => void;
  resource?: Resource | null;
  onSubmit: (data: Partial<Resource>) => void;
  isLoading: boolean;
  skills: Skill[];
}) {
  const [formData, setFormData] = useState<Partial<Resource>>({
    employeeId: '',
    name: '',
    email: '',
    role: '',
    department: '',
    skills: [],
    availability: 'full-time',
    costRate: 0,
    billRate: 0,
    location: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'active',
    manager: '',
    phone: '',
  });

  useEffect(() => {
    if (resource) {
      setFormData({
        employeeId: resource.employeeId || '',
        name: resource.name || '',
        email: resource.email || '',
        role: resource.role || '',
        department: resource.department || '',
        skills: getSkillNames(resource.skills),
        availability: resource.availability || 'full-time',
        costRate: resource.costRate || 0,
        billRate: resource.billRate || 0,
        location: resource.location || '',
        startDate: resource.startDate?.split('T')[0] || '',
        status: resource.status || 'active',
        manager: resource.manager || '',
        phone: resource.phone || '',
      });
    } else {
      setFormData({
        employeeId: '',
        name: '',
        email: '',
        role: '',
        department: '',
        skills: [],
        availability: 'full-time',
        costRate: 0,
        billRate: 0,
        location: '',
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
        manager: '',
        phone: '',
      });
    }
  }, [resource, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleSkillToggle = (skillName: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills?.includes(skillName)
        ? prev.skills.filter((s) => s !== skillName)
        : [...(prev.skills || []), skillName],
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID *
                </label>
                <Input
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="EMP001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="">Select Role</option>
                  <option value="Developer">Developer</option>
                  <option value="Senior Developer">Senior Developer</option>
                  <option value="Tech Lead">Tech Lead</option>
                  <option value="Architect">Architect</option>
                  <option value="Designer">Designer</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Business Analyst">Business Analyst</option>
                  <option value="QA Engineer">QA Engineer</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                  <option value="Data Scientist">Data Scientist</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                >
                  <option value="">Select Department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Product">Product</option>
                  <option value="Data">Data</option>
                  <option value="Operations">Operations</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="New York, NY"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                <Input
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="Jane Smith"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Rate ($/hr) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costRate}
                  onChange={(e) =>
                    setFormData({ ...formData, costRate: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="75.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bill Rate ($/hr) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.billRate}
                  onChange={(e) =>
                    setFormData({ ...formData, billRate: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="150.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                >
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="bench">On Bench</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on-leave">On Leave</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => handleSkillToggle(skill.name)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        formData.skills?.includes(skill.name)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>
              {formData.skills && formData.skills.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Selected: {formData.skills.join(', ')}
                </p>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : resource ? 'Update Resource' : 'Create Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ResourcesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    role: '',
    availability: '',
    status: '',
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Resource;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Fetch resources
  const {
    data: resourcesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      return api.get<{ data: Resource[] }>('/resources');
    },
  });

  // Fetch skills for the form
  const { data: skillsData } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      return api.get<{ data: Skill[] }>('/skills');
    },
  });

  const resources: Resource[] = resourcesData?.data || [];
  const skills: Skill[] = skillsData?.data || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Resource>) => {
      return api.post<Resource>('/resources', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowAddModal(false);
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to create resource');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Resource> }) => {
      return api.put<Resource>(`/resources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowEditModal(false);
      setSelectedResource(null);
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to update resource');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowDeleteDialog(false);
      setSelectedResource(null);
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to delete resource');
    },
  });

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    let result = [...resources];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (resource) =>
          resource.name?.toLowerCase().includes(search) ||
          resource.email?.toLowerCase().includes(search) ||
          resource.employeeId?.toLowerCase().includes(search) ||
          resource.role?.toLowerCase().includes(search) ||
          getSkillNames(resource.skills).some((skill) => skill.toLowerCase().includes(search))
      );
    }

    // Apply filters
    if (filters.department) {
      result = result.filter((r) => r.department === filters.department);
    }
    if (filters.role) {
      result = result.filter((r) => r.role === filters.role);
    }
    if (filters.availability) {
      result = result.filter((r) => r.availability === filters.availability);
    }
    if (filters.status) {
      result = result.filter((r) => r.status === filters.status);
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [resources, searchTerm, filters, sortConfig]);

  // Handlers
  const handleSort = (key: keyof Resource) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleExport = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Email',
      'Role',
      'Department',
      'Skills',
      'Availability',
      'Cost Rate',
      'Bill Rate',
      'Location',
      'Status',
    ];
    const csvContent = [
      headers.join(','),
      ...filteredResources.map((r) =>
        [
          r.employeeId,
          r.name,
          r.email,
          r.role,
          r.department,
          `"${getSkillNames(r.skills).join('; ')}"`,
          r.availability,
          r.costRate,
          r.billRate,
          r.location,
          r.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resources-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateResource = (data: Partial<Resource>) => {
    createMutation.mutate(data);
  };

  const handleUpdateResource = (data: Partial<Resource>) => {
    if (selectedResource) {
      updateMutation.mutate({ id: selectedResource.id, data });
    }
  };

  const handleDeleteResource = () => {
    if (selectedResource) {
      deleteMutation.mutate(selectedResource.id);
    }
  };

  const openEditModal = (resource: Resource) => {
    setSelectedResource(resource);
    setShowEditModal(true);
  };

  const openDeleteDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setShowDeleteDialog(true);
  };

  // Get unique values for filters
  const uniqueDepartments = [...new Set(resources.map((r) => r.department).filter(Boolean))];
  const uniqueRoles = [...new Set(resources.map((r) => r.role).filter(Boolean))];

  // Statistics
  const stats = {
    total: resources.length,
    active: resources.filter((r) => r.status === 'active').length,
    onBench: resources.filter((r) => r.availability === 'bench').length,
    avgBillRate:
      resources.length > 0
        ? resources.reduce((sum, r) => sum + (r.billRate || 0), 0) / resources.length
        : 0,
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      'on-leave': 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getAvailabilityBadge = (availability: string) => {
    const styles: Record<string, string> = {
      'full-time': 'bg-blue-100 text-blue-800',
      'part-time': 'bg-purple-100 text-purple-800',
      contract: 'bg-orange-100 text-orange-800',
      bench: 'bg-red-100 text-red-800',
    };
    return styles[availability] || 'bg-gray-100 text-gray-800';
  };

  if (error) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Failed to load resources. Please try again later.
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
          <p className="text-gray-500">Manage your team members and their skills</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Resources</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">On Bench</p>
                <p className="text-2xl font-bold">{stats.onBench}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Bill Rate</p>
                <p className="text-2xl font-bold">${stats.avgBillRate.toFixed(0)}/hr</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, ID, role, or skills..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-blue-50' : ''}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  >
                    <option value="">All Departments</option>
                    {uniqueDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={filters.role}
                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  >
                    <option value="">All Roles</option>
                    {uniqueRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Availability
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={filters.availability}
                    onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                  >
                    <option value="">All</option>
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="bench">On Bench</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on-leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({ department: '', role: '', availability: '', status: '' })
                    }
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resources Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resources ({filteredResources.length}
            {filteredResources.length !== resources.length && ` of ${resources.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No resources found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || Object.values(filters).some(Boolean)
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first resource'}
              </p>
              {!searchTerm && !Object.values(filters).some(Boolean) && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('employeeId')}
                    >
                      <div className="flex items-center gap-1">
                        ID
                        {sortConfig?.key === 'employeeId' &&
                          (sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortConfig?.key === 'name' &&
                          (sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('role')}
                    >
                      Role
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('department')}
                    >
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Skills</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Availability
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('billRate')}
                    >
                      Bill Rate
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredResources.map((resource) => (
                    <tr key={resource.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{resource.employeeId}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{resource.name}</p>
                          <p className="text-sm text-gray-500">{resource.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{resource.role}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{resource.department}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(resource.skills || []).slice(0, 3).map((skill, index) => {
                            // Handle both string skills and object skills from API
                            const skillName = typeof skill === 'string' 
                              ? skill 
                              : (skill?.skill?.name || skill?.name || 'Unknown');
                            const skillKey = typeof skill === 'string' 
                              ? skill 
                              : (skill?.skillId || skill?.id || index);
                            return (
                              <span
                                key={skillKey}
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
                              >
                                {skillName}
                              </span>
                            );
                          })}
                          {(resource.skills || []).length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                              +{resource.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getAvailabilityBadge(resource.availability)}`}
                        >
                          {resource.availability}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        ${resource.billRate?.toFixed(0) || 0}/hr
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(resource.status)}`}
                        >
                          {resource.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/resources/${resource.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(resource)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(resource)}
                              destructive
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Resource Modal */}
      <ResourceFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateResource}
        isLoading={createMutation.isPending}
        skills={skills}
      />

      {/* Edit Resource Modal */}
      <ResourceFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedResource(null);
        }}
        resource={selectedResource}
        onSubmit={handleUpdateResource}
        isLoading={updateMutation.isPending}
        skills={skills}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false);
            setSelectedResource(null);
          }
        }}
        onConfirm={handleDeleteResource}
        title="Delete Resource"
        description={`Are you sure you want to delete "${selectedResource?.name}"? This action cannot be undone and will remove all associated data.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteMutation.isPending}
      />
      </div>
    </MainLayout>
  );
}
