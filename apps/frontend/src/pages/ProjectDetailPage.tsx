import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import MainLayout from '@/components/layout/MainLayout';
import { ArrowLeft, Users, Building2, User, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Project {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  healthStatus: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
  manager: { id: string; firstName: string; lastName: string; email: string } | null;
  client: { id: string; name: string; code: string } | null;
  contract: { id: string; name: string; contractNumber: string } | null;
  allocations: Array<{
    id: string;
    resource: { id: string; firstName: string; lastName: string; employeeId: string; designation: string };
    role: string;
    allocationPercentage: number;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  _count: { allocations: number };
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProject(id);
    }
  }, [id]);

  async function loadProject(projectId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: Project }>(`/projects/${projectId}`);
      setProject(res.data);
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PIPELINE': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'ON_HOLD': return 'bg-amber-100 text-amber-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getHealthIcon(health: string | null) {
    switch (health) {
      case 'GREEN': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'AMBER': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'RED': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  if (error || !project) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-red-600 mb-4">{error || 'Project not found'}</p>
          <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                {getHealthIcon(project.healthStatus)}
              </div>
              <p className="text-gray-500">{project.code} • {project.type}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Edit Project</Button>
            <Button>Add Allocation</Button>
          </div>
        </div>

        {/* Status Card */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium">{formatDate(project.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="font-medium">{project.endDate ? formatDate(project.endDate) : 'Ongoing'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Team Size</p>
                <p className="font-medium">{project._count.allocations} members</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Health</p>
                <div className="flex items-center gap-2 mt-1">
                  {getHealthIcon(project.healthStatus)}
                  <span className="font-medium">{project.healthStatus || 'Not Set'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Details */}
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{project.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">Client</span>
                  </div>
                  {project.client ? (
                    <Link to={`/clients/${project.client.id}`} className="font-medium text-primary hover:underline">
                      {project.client.name}
                    </Link>
                  ) : (
                    <p className="text-gray-400">No client assigned</p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Project Manager</span>
                  </div>
                  {project.manager ? (
                    <p className="font-medium">
                      {project.manager.firstName} {project.manager.lastName}
                    </p>
                  ) : (
                    <p className="text-gray-400">No manager assigned</p>
                  )}
                </div>
              </div>

              {project.contract && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Contract</p>
                  <Link to={`/contracts/${project.contract.id}`} className="font-medium text-primary hover:underline">
                    {project.contract.name} ({project.contract.contractNumber})
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Active Allocations</p>
                <p className="text-3xl font-bold text-green-600">
                  {project.allocations.filter(a => a.status === 'ACTIVE').length}
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-gray-500">Pending Allocations</p>
                <p className="text-3xl font-bold text-amber-600">
                  {project.allocations.filter(a => a.status === 'PENDING').length}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Allocation %</p>
                <p className="text-3xl font-bold text-gray-700">
                  {project.allocations.reduce((sum, a) => sum + a.allocationPercentage, 0)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Allocations */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Allocations ({project.allocations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.allocations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No team members allocated yet</p>
                <Button className="mt-4">Add First Allocation</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Resource</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Role</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-600">Allocation</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Duration</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {project.allocations.map((allocation) => (
                      <tr key={allocation.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <Link to={`/resources/${allocation.resource.id}`} className="hover:text-primary">
                            <p className="font-medium">{allocation.resource.firstName} {allocation.resource.lastName}</p>
                            <p className="text-sm text-gray-500">{allocation.resource.employeeId}</p>
                          </Link>
                        </td>
                        <td className="p-3">
                          <p className="font-medium">{allocation.role}</p>
                          <p className="text-sm text-gray-500">{allocation.resource.designation}</p>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full border-4 border-primary/20">
                            <span className="text-xl font-bold text-primary">{allocation.allocationPercentage}%</span>
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          <p>{formatDate(allocation.startDate)}</p>
                          <p className="text-gray-500">to {formatDate(allocation.endDate)}</p>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            allocation.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            allocation.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {allocation.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

