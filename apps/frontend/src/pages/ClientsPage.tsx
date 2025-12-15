import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Search,
  Plus,
  MoreHorizontal,
  Building2,
  Star,
  FileText,
  FolderKanban,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';

interface Client {
  id: string;
  name: string;
  code: string;
  industry?: string;
  website?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
  tier?: 'STRATEGIC' | 'KEY' | 'STANDARD';
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

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search, page }],
    queryFn: () =>
      api.get<ClientsResponse>(
        `/clients?page=${page}&limit=20&search=${search}&status=ACTIVE,PROSPECT`
      ),
  });

  const clients = data?.data ?? [];
  const pagination = data?.pagination;

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
            <h1 className="text-2xl font-bold text-brand-charcoal">Clients</h1>
            <p className="text-muted-foreground">
              Manage your client relationships
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
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
              <Button variant="link" className="mt-2">
                Add your first client
              </Button>
            </div>
          ) : (
            clients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer">
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
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
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
      </motion.div>
    </MainLayout>
  );
}

