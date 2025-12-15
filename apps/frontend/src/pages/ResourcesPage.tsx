import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  MoreHorizontal,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';

interface Resource {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  band: string;
  employmentType: 'FTE' | 'CONTRACTOR' | 'INTERN';
  status: 'ACTIVE' | 'INACTIVE' | 'NOTICE';
  practice?: { name: string };
  location?: { name: string };
  currentUtilization: number;
  isOnBench: boolean;
  skills: Array<{ skill: { name: string } }>;
}

interface ResourcesResponse {
  data: Resource[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function ResourcesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string[]>(['ACTIVE']);

  const { data, isLoading } = useQuery({
    queryKey: ['resources', { search, page, status: statusFilter }],
    queryFn: () =>
      api.get<ResourcesResponse>(
        `/resources?page=${page}&limit=20&search=${search}&status=${statusFilter.join(',')}`
      ),
  });

  const resources = data?.data ?? [];
  const pagination = data?.pagination;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-700';
      case 'INACTIVE':
        return 'bg-slate-100 text-slate-700';
      case 'NOTICE':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'text-emerald-600';
    if (utilization >= 50) return 'text-amber-600';
    return 'text-red-600';
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
            <h1 className="text-2xl font-bold text-brand-charcoal">Resources</h1>
            <p className="text-muted-foreground">
              Manage your workforce and track availability
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Resource
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Total Resources"
            value={pagination?.total ?? 0}
            icon={Users}
            color="blue"
          />
          <SummaryCard
            title="Active"
            value={resources.filter((r) => r.status === 'ACTIVE').length}
            icon={CheckCircle}
            color="green"
          />
          <SummaryCard
            title="On Bench"
            value={resources.filter((r) => r.isOnBench).length}
            icon={AlertCircle}
            color="orange"
          />
          <SummaryCard
            title="In Notice"
            value={resources.filter((r) => r.status === 'NOTICE').length}
            icon={Clock}
            color="yellow"
          />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {['ACTIVE', 'INACTIVE', 'NOTICE'].map((status) => (
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
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resources Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {pagination?.total ?? 0} Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : resources.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                <Users className="mb-4 h-12 w-12" />
                <p>No resources found</p>
                <Button variant="link" className="mt-2">
                  Add your first resource
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Resource</th>
                      <th className="pb-3 font-medium">Designation</th>
                      <th className="pb-3 font-medium">Practice</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Utilization</th>
                      <th className="pb-3 font-medium">Skills</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((resource) => (
                      <tr
                        key={resource.id}
                        className="border-b last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                              {resource.firstName.charAt(0)}
                              {resource.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">
                                {resource.firstName} {resource.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {resource.employeeId} • {resource.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="font-medium">{resource.designation}</p>
                          <p className="text-sm text-muted-foreground">
                            {resource.band} • {resource.employmentType}
                          </p>
                        </td>
                        <td className="py-4">
                          <p>{resource.practice?.name ?? '-'}</p>
                          <p className="text-sm text-muted-foreground">
                            {resource.location?.name ?? '-'}
                          </p>
                        </td>
                        <td className="py-4">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                              getStatusColor(resource.status)
                            )}
                          >
                            {resource.status}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-slate-200">
                              <div
                                className={cn(
                                  'h-2 rounded-full',
                                  resource.currentUtilization >= 80
                                    ? 'bg-emerald-500'
                                    : resource.currentUtilization >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                )}
                                style={{ width: `${Math.min(resource.currentUtilization, 100)}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                'text-sm font-medium',
                                getUtilizationColor(resource.currentUtilization)
                              )}
                            >
                              {resource.currentUtilization}%
                            </span>
                          </div>
                          {resource.isOnBench && (
                            <span className="text-xs text-amber-600">On Bench</span>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-1">
                            {resource.skills.slice(0, 3).map((rs, i) => (
                              <span
                                key={i}
                                className="rounded bg-slate-100 px-2 py-0.5 text-xs"
                              >
                                {rs.skill.name}
                              </span>
                            ))}
                            {resource.skills.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{resource.skills.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} resources
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
          </CardContent>
        </Card>
      </motion.div>
    </MainLayout>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'yellow';
}

function SummaryCard({ title, value, icon: Icon, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-accent-blue/10 text-accent-blue',
    green: 'bg-emerald-500/10 text-emerald-600',
    orange: 'bg-accent-orange/10 text-accent-orange',
    yellow: 'bg-amber-500/10 text-amber-600',
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

