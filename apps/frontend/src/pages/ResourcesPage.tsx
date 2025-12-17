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
  firstName: string;
  lastName: string;
  email: string;
  designation?: string;
  department?: string;
  skills: SkillItem[];
  capacity?: number;
  currentUtilization?: number;
  isOnBench?: boolean;
  costPerHour?: number;
  billRateDefault?: number;
  location?: { id: string; name: string; code: string };
  practice?: { id: string; name: string; code: string };
  dateOfJoining?: string;
  status: string;
  manager?: { id: string; firstName: string; lastName: string };
  phone?: string;
  band?: string;
  tags?: string[];
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

// Form data interface (for the modal form)
interface ResourceFormData {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  department: string;
  phone: string;
  band: string;
  capacity: number;
  costPerHour: number;
  billRateDefault: number;
  dateOfJoining: string;
  status: string;
  skills: string[];
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
  onSubmit: (data: Partial<ResourceFormData>) => void;
  isLoading: boolean;
  skills: Skill[];
}) {
  const [formData, setFormData] = useState<ResourceFormData>({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    designation: '',
    department: '',
    phone: '',
    band: 'E1-E2',
    capacity: 100,
    costPerHour: 0,
    billRateDefault: 0,
    dateOfJoining: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    skills: [],
  });

  useEffect(() => {
    if (resource) {
      setFormData({
        employeeId: resource.employeeId || '',
        firstName: resource.firstName || '',
        lastName: resource.lastName || '',
        email: resource.email || '',
        designation: resource.designation || '',
        department: resource.practice?.name || '',
        phone: resource.phone || '',
        band: resource.band || 'E1-E2',
        capacity: resource.capacity || 100,
        costPerHour: resource.costPerHour || 0,
        billRateDefault: resource.billRateDefault || 0,
        dateOfJoining: resource.dateOfJoining?.split('T')[0] || '',
        status: resource.status || 'ACTIVE',
        skills: getSkillNames(resource.skills),
      });
    } else {
      setFormData({
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        designation: '',
        department: '',
        phone: '',
        band: 'E1-E2',
        capacity: 100,
        costPerHour: 0,
        billRateDefault: 0,
        dateOfJoining: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        skills: [],
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
                  placeholder="NVS00001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  required
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  required
                >
                  <option value="">Select Designation</option>
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="Senior Software Engineer">Senior Software Engineer</option>
                  <option value="Tech Lead">Tech Lead</option>
                  <option value="Architect">Architect</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Business Analyst">Business Analyst</option>
                  <option value="QA Engineer">QA Engineer</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                  <option value="Data Engineer">Data Engineer</option>
                  <option value="Data Scientist">Data Scientist</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Band *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.band}
                  onChange={(e) => setFormData({ ...formData, band: e.target.value })}
                  required
                >
                  <option value="E1-E2">E1-E2 (Entry)</option>
                  <option value="E3-E4">E3-E4 (Mid)</option>
                  <option value="M1-M2">M1-M2 (Senior)</option>
                  <option value="M3+">M3+ (Lead/Manager)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) || 100 })
                  }
                  placeholder="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Rate ($/hr)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPerHour}
                  onChange={(e) =>
                    setFormData({ ...formData, costPerHour: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="75.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bill Rate ($/hr)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.billRateDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, billRateDefault: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="150.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining *</label>
                <Input
                  type="date"
                  value={formData.dateOfJoining}
                  onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="NOTICE">On Notice</option>
                </select>
              </div>
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
  const [showInactive, setShowInactive] = useState(false);  // Toggle for inactive resources
  const [filters, setFilters] = useState({
    department: '',
    role: '',
    availability: '',
    status: '',
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
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
    queryKey: ['resources', showInactive],
    queryFn: async () => {
      // Pass includeInactive parameter and higher limit to API
      return api.get<{ data: Resource[]; pagination: { total: number; page: number; limit: number } }>(
        `/resources?includeInactive=${showInactive}&limit=1000`
      );
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
          resource.firstName?.toLowerCase().includes(search) ||
          resource.lastName?.toLowerCase().includes(search) ||
          resource.email?.toLowerCase().includes(search) ||
          resource.employeeId?.toLowerCase().includes(search) ||
          resource.designation?.toLowerCase().includes(search) ||
          getSkillNames(resource.skills).some((skill) => skill.toLowerCase().includes(search))
      );
    }

    // Apply filters
    if (filters.department) {
      result = result.filter((r) => r.practice?.name === filters.department);
    }
    if (filters.role) {
      result = result.filter((r) => r.designation === filters.role);
    }
    if (filters.availability) {
      // bench filter
      if (filters.availability === 'bench') {
        result = result.filter((r) => r.isOnBench);
      }
    }
    if (filters.status) {
      result = result.filter((r) => r.status?.toUpperCase() === filters.status.toUpperCase());
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        // Handle compound fields like name (firstName + lastName)
        aValue = (a as any)[sortConfig.key];
        bValue = (b as any)[sortConfig.key];
        
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
  const handleSort = (key: string) => {
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
      'First Name',
      'Last Name',
      'Email',
      'Designation',
      'Practice',
      'Skills',
      'Utilization %',
      'Bill Rate',
      'Location',
      'Status',
    ];
    const csvContent = [
      headers.join(','),
      ...filteredResources.map((r) =>
        [
          r.employeeId,
          r.firstName,
          r.lastName,
          r.email,
          r.designation || '',
          r.practice?.name || '',
          `"${getSkillNames(r.skills).join('; ')}"`,
          r.currentUtilization || 0,
          r.billRateDefault || 0,
          r.location?.name || '',
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
  const uniqueDepartments = [...new Set(resources.map((r) => r.practice?.name).filter(Boolean))];
  const uniqueDesignations = [...new Set(resources.map((r) => r.designation).filter(Boolean))];

  // Statistics
  const stats = {
    total: resourcesData?.pagination?.total || resources.length,
    active: resources.filter((r) => r.status?.toUpperCase() === 'ACTIVE').length,
    onBench: resources.filter((r) => r.isOnBench).length,
    avgBillRate:
      resources.length > 0
        ? resources.reduce((sum, r) => sum + (r.billRateDefault || 0), 0) / resources.length
        : 0,
  };

  const getStatusBadge = (status: string) => {
    const upperStatus = status?.toUpperCase();
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      NOTICE: 'bg-yellow-100 text-yellow-800',
      TERMINATED: 'bg-red-100 text-red-800',
    };
    return styles[upperStatus] || 'bg-gray-100 text-gray-800';
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
              {/* Show Inactive Toggle */}
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 whitespace-nowrap">Show Former Employees</span>
              </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Practice</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  >
                    <option value="">All Practices</option>
                    {uniqueDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={filters.role}
                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  >
                    <option value="">All Designations</option>
                    {uniqueDesignations.map((designation) => (
                      <option key={designation} value={designation}>
                        {designation}
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
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="NOTICE">On Notice</option>
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
                      onClick={() => handleSort('firstName')}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortConfig?.key === 'firstName' &&
                          (sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('designation')}
                    >
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Practice
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Skills</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Availability
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('billRateDefault')}
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
                  {filteredResources.map((resource) => {
                    const isInactive = resource.status?.toUpperCase() === 'INACTIVE' || 
                                       resource.status?.toUpperCase() === 'TERMINATED';
                    const fullName = `${resource.firstName || ''} ${resource.lastName || ''}`.trim();
                    const utilization = resource.currentUtilization ?? 0;
                    const isOnBench = resource.isOnBench;
                    return (
                    <tr 
                      key={resource.id} 
                      className={`hover:bg-gray-50 ${isInactive ? 'bg-gray-100 opacity-70' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">{resource.employeeId}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className={`text-sm font-medium ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}>
                            {fullName}
                            {isInactive && <span className="ml-2 text-xs text-red-500">(Former)</span>}
                          </p>
                          <p className="text-sm text-gray-500">{resource.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{resource.designation || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{resource.practice?.name || '-'}</td>
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
                        {isOnBench ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            On Bench
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            {utilization}% Allocated
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        ${resource.billRateDefault?.toFixed(0) || 0}/hr
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
                    );
                  })}
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
        description={`Are you sure you want to delete "${selectedResource?.firstName} ${selectedResource?.lastName}"? This action cannot be undone and will remove all associated data.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteMutation.isPending}
      />
      </div>
    </MainLayout>
  );
}
