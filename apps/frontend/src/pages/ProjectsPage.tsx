import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  client?: { id: string; name: string; code: string };
  manager?: { id: string; firstName: string; lastName: string };
  practice?: { id: string; name: string };
  _count: { allocations: number };
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

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string[]>(['ACTIVE', 'PIPELINE']);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, page, status: statusFilter }],
    queryFn: () =>
      api.get<ProjectsResponse>(
        `/projects?page=${page}&limit=20&search=${search}&status=${statusFilter.join(',')}`
      ),
  });

  const projects = data?.data ?? [];
  const pagination = data?.pagination;

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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
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
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>
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
              <Button variant="link" className="mt-2">
                Create your first project
              </Button>
            </div>
          ) : (
            projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
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
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
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

