import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Search,
  Plus,
  MoreHorizontal,
  Building2,
  Star,
  FileText,
  FolderKanban,
  Download,
  Eye,
  Edit,
  Trash2,
  X,
  Filter,
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
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  code: string;
  industry?: string;
  website?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
  tier?: 'STRATEGIC' | 'KEY' | 'STANDARD';
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contacts?: Array<{
    name: string;
    email: string;
    phone?: string;
    role?: string;
    isPrimary?: boolean;
  }>;
  notes?: string;
  _count: {
    contracts: number;
    projects: number;
  };
}

interface ClientsResponse {
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Client Form Modal Component
function ClientFormModal({
  isOpen,
  onClose,
  client,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    industry: '',
    website: '',
    status: 'PROSPECT' as Client['status'],
    tier: 'STANDARD' as 'STRATEGIC' | 'KEY' | 'STANDARD',
    notes: '',
    billingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    primaryContact: {
      name: '',
      email: '',
      phone: '',
      role: '',
    },
  });

  useEffect(() => {
    if (client) {
      const primaryContact = client.contacts?.find((c) => c.isPrimary) || client.contacts?.[0];
      setFormData({
        name: client.name || '',
        code: client.code || '',
        industry: client.industry || '',
        website: client.website || '',
        status: client.status || 'PROSPECT',
        tier: client.tier || 'STANDARD',
        notes: client.notes || '',
        billingAddress: {
          line1: client.billingAddress?.line1 || '',
          line2: client.billingAddress?.line2 || '',
          city: client.billingAddress?.city || '',
          state: client.billingAddress?.state || '',
          postalCode: client.billingAddress?.postalCode || '',
          country: client.billingAddress?.country || '',
        },
        primaryContact: {
          name: primaryContact?.name || '',
          email: primaryContact?.email || '',
          phone: primaryContact?.phone || '',
          role: primaryContact?.role || '',
        },
      });
    } else {
      setFormData({
        name: '',
        code: '',
        industry: '',
        website: '',
        status: 'PROSPECT',
        tier: 'STANDARD',
        notes: '',
        billingAddress: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
        primaryContact: {
          name: '',
          email: '',
          phone: '',
          role: '',
        },
      });
    }
  }, [client, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = {
      name: formData.name,
      code: formData.code,
      status: formData.status,
      tier: formData.tier,
    };

    if (formData.industry) submitData.industry = formData.industry;
    if (formData.website) submitData.website = formData.website;
    if (formData.notes) submitData.notes = formData.notes;

    // Add billing address if any field is filled
    const hasAddress = Object.values(formData.billingAddress).some((v) => v);
    if (hasAddress) {
      submitData.billingAddress = formData.billingAddress;
    }

    // Add contact if email is provided
    if (formData.primaryContact.email) {
      submitData.contacts = [
        {
          ...formData.primaryContact,
          isPrimary: true,
        },
      ];
    }

    onSubmit(submitData);
  };

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Manufacturing',
    'Retail',
    'Education',
    'Government',
    'Non-Profit',
    'Media & Entertainment',
    'Energy',
    'Transportation',
    'Real Estate',
    'Consulting',
    'Other',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" preventDismiss>
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Code *
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="ACME"
                  required
                  disabled={!!client}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                >
                  <option value="">Select Industry</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Client['status'] })}
                >
                  <option value="PROSPECT">Prospect</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value as 'STRATEGIC' | 'KEY' | 'STANDARD' })}
                >
                  <option value="STANDARD">Standard</option>
                  <option value="KEY">Key</option>
                  <option value="STRATEGIC">Strategic</option>
                </select>
              </div>
            </div>

            {/* Primary Contact */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Primary Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <Input
                    value={formData.primaryContact.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryContact: { ...formData.primaryContact, name: e.target.value },
                      })
                    }
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    value={formData.primaryContact.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryContact: { ...formData.primaryContact, email: e.target.value },
                      })
                    }
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    value={formData.primaryContact.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryContact: { ...formData.primaryContact, phone: e.target.value },
                      })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <Input
                    value={formData.primaryContact.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryContact: { ...formData.primaryContact, role: e.target.value },
                      })
                    }
                    placeholder="VP of Engineering"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Billing Address</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1
                  </label>
                  <Input
                    value={formData.billingAddress.line1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: { ...formData.billingAddress, line1: e.target.value },
                      })
                    }
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2
                  </label>
                  <Input
                    value={formData.billingAddress.line2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: { ...formData.billingAddress, line2: e.target.value },
                      })
                    }
                    placeholder="Suite 100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <Input
                      value={formData.billingAddress.city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          billingAddress: { ...formData.billingAddress, city: e.target.value },
                        })
                      }
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State/Province
                    </label>
                    <Input
                      value={formData.billingAddress.state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          billingAddress: { ...formData.billingAddress, state: e.target.value },
                        })
                      }
                      placeholder="NY"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <Input
                      value={formData.billingAddress.postalCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          billingAddress: { ...formData.billingAddress, postalCode: e.target.value },
                        })
                      }
                      placeholder="10001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <Input
                      value={formData.billingAddress.country}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          billingAddress: { ...formData.billingAddress, country: e.target.value },
                        })
                      }
                      placeholder="United States"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this client..."
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', '20');
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);
  else queryParams.set('status', 'ACTIVE,PROSPECT');
  if (tierFilter) queryParams.set('tier', tierFilter);
  if (industryFilter) queryParams.set('industry', industryFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search, page, statusFilter, tierFilter, industryFilter }],
    queryFn: () => api.get<ClientsResponse>(`/clients?${queryParams.toString()}`),
  });

  const clients = data?.data ?? [];
  const pagination = data?.pagination;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/clients', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowAddModal(false);
    },
    onError: (error: any) => {
      console.error('API Error:', error); alert('Failed to create client. Please try again.');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/clients/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowEditModal(false);
      setSelectedClient(null);
    },
    onError: (error: any) => {
      console.error('API Error:', error); alert('Failed to update client. Please try again.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowDeleteDialog(false);
      setSelectedClient(null);
    },
    onError: (error: any) => {
      console.error('API Error:', error); alert('Failed to delete client. Please try again.');
    },
  });

  // Handlers
  const handleCreateClient = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdateClient = (data: any) => {
    if (selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, data });
    }
  };

  const handleDeleteClient = () => {
    if (selectedClient) {
      deleteMutation.mutate(selectedClient.id);
    }
  };

  const openEditModal = (client: Client, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const openDeleteDialog = (client: Client, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedClient(client);
    setShowDeleteDialog(true);
  };

  const handleExport = () => {
    const headers = ['Code', 'Name', 'Industry', 'Status', 'Tier', 'Contracts', 'Projects'];
    const csvContent = [
      headers.join(','),
      ...clients.map((c) =>
        [
          c.code,
          `"${c.name}"`,
          c.industry || '',
          c.status,
          c.tier || '',
          c._count.contracts,
          c._count.projects,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setTierFilter('');
    setIndustryFilter('');
    setSearch('');
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'STRATEGIC': return 'bg-purple-100 text-purple-700';
      case 'KEY': return 'bg-blue-100 text-blue-700';
      case 'STANDARD': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
      case 'PROSPECT': return 'bg-amber-100 text-amber-700';
      case 'INACTIVE': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Statistics
  const stats = {
    total: pagination?.total || clients.length,
    active: clients.filter((c) => c.status === 'ACTIVE').length,
    strategic: clients.filter((c) => c.tier === 'STRATEGIC').length,
    prospects: clients.filter((c) => c.status === 'PROSPECT').length,
  };

  return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-charcoal">Clients</h1>
            <p className="text-muted-foreground">
              Manage your client relationships
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg p-2 bg-blue-100 text-blue-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg p-2 bg-emerald-100 text-emerald-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg p-2 bg-purple-100 text-purple-600">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.strategic}</p>
                <p className="text-sm text-muted-foreground">Strategic</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg p-2 bg-amber-100 text-amber-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.prospects}</p>
                <p className="text-sm text-muted-foreground">Prospects</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {showFilters ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 mt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                  >
                    <option value="">All Tiers</option>
                    <option value="STRATEGIC">Strategic</option>
                    <option value="KEY">Key</option>
                    <option value="STANDARD">Standard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <Input
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    placeholder="Filter by industry..."
                  />
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

        {/* Clients Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-lg bg-slate-200" />
                  <div className="mt-4 h-5 w-3/4 rounded bg-slate-200" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
                </CardContent>
              </Card>
            ))
          ) : clients.length === 0 ? (
            <div className="col-span-full flex h-64 flex-col items-center justify-center text-muted-foreground">
              <Building2 className="mb-4 h-12 w-12" />
              <p>No clients found</p>
              <Button variant="link" className="mt-2" onClick={() => setShowAddModal(true)}>
                Add your first client
              </Button>
            </div>
          ) : (
            clients.map((client) => (
              <Card 
                key={client.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold">{client.name}</h3>
                        <p className="text-sm text-muted-foreground">{client.code}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          navigate(`/clients/${client.id}`);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditModal(client)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(client)}
                          destructive
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {client.industry && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {client.industry}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-1 text-xs font-medium', getStatusColor(client.status))}>
                      {client.status}
                    </span>
                    {client.tier && (
                      <span className={cn('flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium', getTierColor(client.tier))}>
                        {client.tier === 'STRATEGIC' && <Star className="h-3 w-3" />}
                        {client.tier}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {client._count.contracts} contracts
                    </span>
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-4 w-4" />
                      {client._count.projects} projects
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* Add Client Modal */}
        <ClientFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateClient}
          isLoading={createMutation.isPending}
        />

        {/* Edit Client Modal */}
        <ClientFormModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
          onSubmit={handleUpdateClient}
          isLoading={updateMutation.isPending}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowDeleteDialog(false);
              setSelectedClient(null);
            }
          }}
          onConfirm={handleDeleteClient}
          title="Delete Client"
          description={`Are you sure you want to delete "${selectedClient?.name}"? This action cannot be undone and will affect all associated contracts and projects.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      </motion.div>
  );
}
