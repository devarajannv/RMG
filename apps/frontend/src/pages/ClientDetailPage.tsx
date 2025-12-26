import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import MainLayout from '@/components/layout/MainLayout';
import { ArrowLeft, Building2, FileText, FolderKanban, User, Phone, Mail, Globe, Star } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Client {
  id: string;
  name: string;
  code: string;
  industry: string | null;
  website: string | null;
  status: string;
  tier: string | null;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  contracts: Array<{
    id: string;
    name: string;
    contractNumber: string;
    status: string;
    type: string;
    startDate: string;
    endDate: string | null;
    value: number | null;
  }>;
  projects: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    type: string;
    startDate: string;
    endDate: string | null;
    _count: { allocations: number };
  }>;
  _count: { contracts: number; projects: number };
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'projects'>('overview');

  // Currency state
  const [, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [baseCurrency] = useState<string>('INR');

  useEffect(() => {
    loadCurrencies();
  }, []);

  async function loadCurrencies() {
    try {
      const res = await api.get<Currency[]>('/currency/currencies');
      setCurrencies(res || []);
      const base = res?.find((c: Currency) => c.isBase) || res?.find((c: Currency) => c.code === 'INR');
      if (base) setSelectedCurrency(base);
    } catch (err) {
      setSelectedCurrency({ id: '', code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: true });
    }
  }

  const loadExchangeRate = useCallback(async () => {
    if (!selectedCurrency || selectedCurrency.code === baseCurrency) {
      setExchangeRate(1);
      return;
    }
    try {
      const res = await api.post<{ rate: number }>('/currency/exchange-rates/convert', {
        amount: 1,
        fromCurrency: baseCurrency,
        toCurrency: selectedCurrency.code,
      });
      setExchangeRate(res.rate || 1);
    } catch {
      setExchangeRate(1);
    }
  }, [selectedCurrency, baseCurrency]);

  useEffect(() => {
    loadExchangeRate();
  }, [loadExchangeRate]);

  useEffect(() => {
    if (id) {
      loadClient(id);
    }
  }, [id]);

  async function loadClient(clientId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: Client }>(`/clients/${clientId}`);
      setClient(res.data);
    } catch (err) {
      console.error('Failed to load client:', err);
      setError('Failed to load client details');
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800';
      case 'PROSPECT': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getTierColor(tier: string | null) {
    switch (tier) {
      case 'STRATEGIC': return 'bg-amber-100 text-amber-800';
      case 'KEY': return 'bg-purple-100 text-purple-800';
      case 'STANDARD': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatCurrency(value: number) {
    const converted = value * exchangeRate;
    const symbol = selectedCurrency?.symbol || '₹';
    const code = selectedCurrency?.code || 'INR';
    
    if (code === 'INR') {
      if (converted >= 10000000) return `${symbol}${(converted / 10000000).toFixed(1)}Cr`;
      if (converted >= 100000) return `${symbol}${(converted / 100000).toFixed(1)}L`;
      return `${symbol}${converted.toLocaleString()}`;
    } else {
      if (converted >= 1000000) return `${symbol}${(converted / 1000000).toFixed(1)}M`;
      if (converted >= 1000) return `${symbol}${(converted / 1000).toFixed(1)}K`;
      return `${symbol}${converted.toLocaleString()}`;
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !client) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-red-600 mb-4">{error || 'Client not found'}</p>
          <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
        </div>
      </MainLayout>
    );
  }

  const totalContractValue = client.contracts.reduce((sum, c) => sum + (c.value || 0), 0);
  const activeContracts = client.contracts.filter(c => c.status === 'ACTIVE').length;
  const activeProjects = client.projects.filter(p => p.status === 'ACTIVE').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-white shadow-lg">
                {client.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                  {client.tier === 'STRATEGIC' && <Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
                </div>
                <p className="text-gray-500">{client.code} • {client.industry || 'No industry'}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Edit Client</Button>
            <Button>New Contract</Button>
          </div>
        </div>

        {/* Status & Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${getStatusColor(client.status)}`}>
                {client.status}
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Tier</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${getTierColor(client.tier)}`}>
                {client.tier || 'Not Set'}
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Contracts</p>
              <p className="text-2xl font-bold text-primary">{activeContracts} / {client._count.contracts}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Projects</p>
              <p className="text-2xl font-bold text-green-600">{activeProjects} / {client._count.projects}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalContractValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'contracts', label: `Contracts (${client._count.contracts})`, icon: FileText },
            { id: 'projects', label: `Projects (${client._count.projects})`, icon: FolderKanban },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.contactName && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Primary Contact</p>
                      <p className="font-medium">{client.contactName}</p>
                    </div>
                  </div>
                )}
                {client.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <a href={`mailto:${client.contactEmail}`} className="font-medium text-primary hover:underline">
                        {client.contactEmail}
                      </a>
                    </div>
                  </div>
                )}
                {client.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <a href={`tel:${client.contactPhone}`} className="font-medium">
                        {client.contactPhone}
                      </a>
                    </div>
                  </div>
                )}
                {client.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Website</p>
                      <a href={client.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                        {client.website}
                      </a>
                    </div>
                  </div>
                )}
                {client.address && (
                  <div className="p-4 bg-gray-50 rounded-lg mt-4">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">{client.address}</p>
                  </div>
                )}
                {!client.contactName && !client.contactEmail && !client.contactPhone && !client.website && (
                  <p className="text-gray-400 text-center py-4">No contact information available</p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {client.notes ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
                ) : (
                  <p className="text-gray-400 text-center py-8">No notes available</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'contracts' && (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {client.contracts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No contracts found</p>
                  <Button className="mt-4">Create First Contract</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-600">Contract</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-600">Type</th>
                        <th className="text-center p-4 text-sm font-medium text-gray-600">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-600">Duration</th>
                        <th className="text-right p-4 text-sm font-medium text-gray-600">Value</th>
                        <th className="text-center p-4 text-sm font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {client.contracts.map((contract) => (
                        <tr key={contract.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <Link to={`/contracts/${contract.id}`} className="hover:text-primary">
                              <p className="font-medium">{contract.name}</p>
                              <p className="text-sm text-gray-500">{contract.contractNumber}</p>
                            </Link>
                          </td>
                          <td className="p-4 text-sm">{contract.type}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                              {contract.status}
                            </span>
                          </td>
                          <td className="p-4 text-sm">
                            <p>{formatDate(contract.startDate)}</p>
                            <p className="text-gray-500">to {contract.endDate ? formatDate(contract.endDate) : 'Ongoing'}</p>
                          </td>
                          <td className="p-4 text-right font-medium">
                            {contract.value ? formatCurrency(contract.value) : '-'}
                          </td>
                          <td className="p-4 text-center">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/contracts/${contract.id}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'projects' && (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {client.projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No projects found</p>
                  <Button className="mt-4">Create First Project</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-600">Project</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-600">Type</th>
                        <th className="text-center p-4 text-sm font-medium text-gray-600">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-600">Duration</th>
                        <th className="text-center p-4 text-sm font-medium text-gray-600">Team Size</th>
                        <th className="text-center p-4 text-sm font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {client.projects.map((project) => (
                        <tr key={project.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <Link to={`/projects/${project.id}`} className="hover:text-primary">
                              <p className="font-medium">{project.name}</p>
                              <p className="text-sm text-gray-500">{project.code}</p>
                            </Link>
                          </td>
                          <td className="p-4 text-sm">{project.type}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                              {project.status}
                            </span>
                          </td>
                          <td className="p-4 text-sm">
                            <p>{formatDate(project.startDate)}</p>
                            <p className="text-gray-500">to {project.endDate ? formatDate(project.endDate) : 'Ongoing'}</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-medium">{project._count.allocations}</span>
                          </td>
                          <td className="p-4 text-center">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/projects/${project.id}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

