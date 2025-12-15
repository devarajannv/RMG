import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';

interface Allocation {
  id: string;
  role: string;
  percentage: number;
  startDate: string;
  endDate: string;
  status: 'PROPOSED' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  isBillable: boolean;
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

export default function AllocationsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string[]>(['ACTIVE', 'CONFIRMED', 'PROPOSED']);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  const { data, isLoading } = useQuery({
    queryKey: ['allocations', { search, page, status: statusFilter }],
    queryFn: () =>
      api.get<AllocationsResponse>(
        `/allocations?page=${page}&limit=20&status=${statusFilter.join(',')}`
      ),
  });

  const { data: rolloffsData } = useQuery({
    queryKey: ['rolloffs'],
    queryFn: () => api.get<RolloffResponse>('/allocations/rolloffs?days=30'),
  });

  const allocations = data?.data ?? [];
  const pagination = data?.pagination;
  const rolloffs = rolloffsData?.data ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'PROPOSED': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'COMPLETED': return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
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
            <p className="text-muted-foreground">
              Manage resource assignments to projects
            </p>
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
            <Button>
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
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Allocations List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {pagination?.total ?? 0} Allocations
            </CardTitle>
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
                            {allocation.resource.practice && ` • ${allocation.resource.practice.name}`}
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
                          <p className="text-2xl font-bold text-primary">
                            {allocation.percentage}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {allocation.isBillable ? 'Billable' : 'Non-billable'}
                          </p>
                        </div>

                        {/* Dates */}
                        <div className="text-right min-w-[140px]">
                          <p className="text-sm font-medium">
                            {formatDate(allocation.startDate)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            to {formatDate(allocation.endDate)}
                          </p>
                          {isEndingSoon && (
                            <p className="text-xs text-amber-600">
                              Ends in {daysUntilEnd} days
                            </p>
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
                    <p className="text-sm text-muted-foreground">
                      {rolloff.project.name}
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      Ends {formatDate(rolloff.endDate)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </MainLayout>
  );
}

