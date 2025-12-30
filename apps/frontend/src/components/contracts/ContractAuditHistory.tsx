/**
 * ContractAuditHistory Component
 * 
 * Comprehensive audit trail for contracts:
 * - All contract changes with timestamps
 * - User attribution
 * - Before/after values
 * - Filterable by action type
 * - Export capability
 * 
 * @module ContractAuditHistory
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  User,
  Clock,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Edit,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface AuditEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'RENEW' | 'TERMINATE' | 'ACTIVATE';
  entityType: string;
  entityId: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  timestamp: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

interface ContractAuditHistoryProps {
  contractId: string;
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ACTION_CONFIG = {
  CREATE: {
    label: 'Created',
    icon: Plus,
    color: 'text-green-600 bg-green-100',
    description: 'Contract was created',
  },
  UPDATE: {
    label: 'Updated',
    icon: Edit,
    color: 'text-blue-600 bg-blue-100',
    description: 'Contract details were modified',
  },
  DELETE: {
    label: 'Deleted',
    icon: Trash2,
    color: 'text-red-600 bg-red-100',
    description: 'Contract was deleted',
  },
  STATUS_CHANGE: {
    label: 'Status Changed',
    icon: RefreshCw,
    color: 'text-purple-600 bg-purple-100',
    description: 'Contract status was changed',
  },
  RENEW: {
    label: 'Renewed',
    icon: RefreshCw,
    color: 'text-green-600 bg-green-100',
    description: 'Contract was renewed',
  },
  TERMINATE: {
    label: 'Terminated',
    icon: XCircle,
    color: 'text-red-600 bg-red-100',
    description: 'Contract was terminated',
  },
  ACTIVATE: {
    label: 'Activated',
    icon: CheckCircle2,
    color: 'text-green-600 bg-green-100',
    description: 'Contract was activated',
  },
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  contractNumber: 'Contract Number',
  type: 'Type',
  status: 'Status',
  description: 'Description',
  startDate: 'Start Date',
  endDate: 'End Date',
  signedDate: 'Signed Date',
  value: 'Value',
  currency: 'Currency',
  billingType: 'Billing Type',
  paymentTerms: 'Payment Terms',
  autoRenew: 'Auto Renew',
  clientId: 'Client',
  accountMgrId: 'Account Manager',
  documentUrl: 'Document URL',
  notes: 'Notes',
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatValue(value: any, field: string): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (field.includes('Date') && typeof value === 'string') {
    return new Date(value).toLocaleDateString('en-IN');
  }
  if (field === 'value' && typeof value === 'number') {
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return String(value);
}

// ============================================================================
// Change Item Component
// ============================================================================

interface ChangeItemProps {
  field: string;
  oldValue: any;
  newValue: any;
}

function ChangeItem({ field, oldValue, newValue }: ChangeItemProps) {
  const fieldLabel = FIELD_LABELS[field] || field;
  const formattedOld = formatValue(oldValue, field);
  const formattedNew = formatValue(newValue, field);

  return (
    <div className="flex items-center gap-2 text-sm py-1">
      <span className="text-gray-500 min-w-[120px]">{fieldLabel}:</span>
      <span className="text-red-600 line-through">{formattedOld}</span>
      <ArrowRight className="h-3 w-3 text-gray-400" />
      <span className="text-green-600 font-medium">{formattedNew}</span>
    </div>
  );
}

// ============================================================================
// Audit Entry Card Component
// ============================================================================

interface AuditEntryCardProps {
  entry: AuditEntry;
  compact?: boolean;
}

function AuditEntryCard({ entry, compact }: AuditEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const actionConfig = ACTION_CONFIG[entry.action] || ACTION_CONFIG.UPDATE;
  const ActionIcon = actionConfig.icon;

  const hasChanges = entry.changes && entry.changes.length > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
        <div className={cn('p-1.5 rounded-full', actionConfig.color)}>
          <ActionIcon className="h-3 w-3" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{actionConfig.label}</span>
          <span className="text-sm text-gray-500 ml-2">
            by {entry.user.firstName} {entry.user.lastName}
          </span>
        </div>
        <span className="text-xs text-gray-400">{formatTimestamp(entry.timestamp)}</span>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className={cn(
          'flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50',
          hasChanges && 'cursor-pointer'
        )}
        onClick={() => hasChanges && setIsExpanded(!isExpanded)}
      >
        {/* Icon */}
        <div className={cn('p-2 rounded-full', actionConfig.color)}>
          <ActionIcon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{actionConfig.label}</span>
            {entry.changes && entry.changes.length > 0 && (
              <span className="text-sm text-gray-500">
                ({entry.changes.length} field{entry.changes.length !== 1 ? 's' : ''} changed)
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {entry.user.firstName} {entry.user.lastName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTimestamp(entry.timestamp)}
            </span>
          </div>
          {entry.metadata?.reason && (
            <p className="text-sm text-gray-600 mt-2">
              Reason: {entry.metadata.reason}
            </p>
          )}
        </div>

        {/* Expand Button */}
        {hasChanges && (
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Expanded Changes */}
      {isExpanded && hasChanges && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          <div className="pt-3">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Changes:</h5>
            <div className="space-y-1">
              {entry.changes.map((change, idx) => (
                <ChangeItem
                  key={idx}
                  field={change.field}
                  oldValue={change.oldValue}
                  newValue={change.newValue}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Filter Bar Component
// ============================================================================

interface FilterBarProps {
  selectedActions: string[];
  onActionFilterChange: (actions: string[]) => void;
  onExport: () => void;
}

function FilterBar({ selectedActions, onActionFilterChange, onExport }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const toggleAction = (action: string) => {
    if (selectedActions.includes(action)) {
      onActionFilterChange(selectedActions.filter((a) => a !== action));
    } else {
      onActionFilterChange([...selectedActions, action]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {selectedActions.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
              {selectedActions.length}
            </span>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
          {Object.entries(ACTION_CONFIG).map(([action, config]) => {
            const isSelected = selectedActions.includes(action);
            return (
              <button
                key={action}
                onClick={() => toggleAction(action)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                {config.label}
              </button>
            );
          })}
          {selectedActions.length > 0 && (
            <button
              onClick={() => onActionFilterChange([])}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ContractAuditHistory({
  contractId,
  limit = 50,
  showFilters = true,
  compact = false,
}: ContractAuditHistoryProps) {
  const [actionFilters, setActionFilters] = useState<string[]>([]);

  // Fetch audit history
  const { data, isLoading, error } = useQuery({
    queryKey: ['contract-audit', contractId, actionFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('entityType', 'Contract');
      params.set('entityId', contractId);
      params.set('limit', String(limit));
      if (actionFilters.length > 0) {
        params.set('actions', actionFilters.join(','));
      }
      
      const response = await api.get<{ data: AuditEntry[] }>(`/audit?${params.toString()}`);
      return response.data;
    },
  });

  const entries = data || [];

  // Export handler
  const handleExport = () => {
    const headers = ['Timestamp', 'Action', 'User', 'Changes', 'Details'];
    const rows = entries.map((entry) => [
      new Date(entry.timestamp).toISOString(),
      entry.action,
      `${entry.user.firstName} ${entry.user.lastName}`,
      entry.changes?.map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ') || '',
      JSON.stringify(entry.metadata || {}),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-${contractId}-audit.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-400" />
          Audit History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        {showFilters && !compact && (
          <div className="mb-4">
            <FilterBar
              selectedActions={actionFilters}
              onActionFilterChange={setActionFilters}
              onExport={handleExport}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8 text-red-600">
            Failed to load audit history
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && entries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No audit history available</p>
          </div>
        )}

        {/* Audit Entries */}
        {!isLoading && entries.length > 0 && (
          <div className={compact ? 'divide-y divide-gray-100' : 'space-y-4'}>
            {entries.map((entry) => (
              <AuditEntryCard key={entry.id} entry={entry} compact={compact} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
