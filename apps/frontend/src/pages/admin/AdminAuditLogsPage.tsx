import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

import type { AuditLogEntry } from './shared';

export default function AdminAuditLogsPage() {
  const [auditPage, setAuditPage] = useState(1);
  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs', auditPage, auditEntityFilter, auditActionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(auditPage), limit: '20' });
      if (auditEntityFilter) params.append('entityType', auditEntityFilter);
      if (auditActionFilter) params.append('action', auditActionFilter);
      return api.get<{ data: AuditLogEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/audit-logs?${params}`);
    },
  });

  const { data: auditEntityTypes = [] } = useQuery<string[]>({
    queryKey: ['audit-entity-types'],
    queryFn: async () => {
      const res = await api.get<{ data: string[] }>('/audit-logs/entity-types');
      return res.data || [];
    },
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Audit Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <select
            value={auditEntityFilter}
            onChange={(e) => {
              setAuditEntityFilter(e.target.value);
              setAuditPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Entities</option>
            {auditEntityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={auditActionFilter}
            onChange={(e) => {
              setAuditActionFilter(e.target.value);
              setAuditPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
          </select>
        </div>

        {auditData?.data && auditData.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Timestamp</th>
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditData.data.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-500">{formatDate(log.timestamp)}</td>
                      <td className="p-3">{log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}</td>
                      <td className="p-3">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded',
                            log.action === 'CREATE' && 'bg-green-100 text-green-700',
                            log.action === 'UPDATE' && 'bg-blue-100 text-blue-700',
                            log.action === 'DELETE' && 'bg-red-100 text-red-700',
                            log.action === 'LOGIN' && 'bg-purple-100 text-purple-700',
                            !['CREATE', 'UPDATE', 'DELETE', 'LOGIN'].includes(log.action) && 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs">{log.entityType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {auditData.pagination && auditData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Page {auditData.pagination.page} of {auditData.pagination.totalPages} ({auditData.pagination.total} total)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAuditPage((p) => Math.max(1, p - 1))} disabled={auditPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAuditPage((p) => Math.min(auditData.pagination.totalPages, p + 1))} disabled={auditPage >= auditData.pagination.totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No audit logs found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
