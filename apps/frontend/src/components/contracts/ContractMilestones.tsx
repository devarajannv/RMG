/**
 * ContractMilestones Component
 * 
 * Visual timeline for contract milestones:
 * - Timeline visualization with status indicators
 * - Milestone CRUD operations
 * - Due date tracking with alerts
 * - Completion tracking
 * - Payment milestone integration
 * 
 * @module ContractMilestones
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Target,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  DollarSign,
  Flag,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Can } from '@/components/permissions';

// ============================================================================
// Types
// ============================================================================

export interface ContractMilestone {
  id: string;
  name: string;
  description?: string;
  type: 'DELIVERABLE' | 'PAYMENT' | 'REVIEW' | 'KICKOFF' | 'COMPLETION' | 'OTHER';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  completedDate?: string;
  amount?: number;
  currency?: string;
  order: number;
  notes?: string;
}

interface ContractMilestonesProps {
  contractId: string;
  milestones?: ContractMilestone[];
  currency?: string;
  readOnly?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const MILESTONE_TYPES = {
  KICKOFF: { label: 'Kickoff', icon: Flag, color: 'text-blue-600 bg-blue-100' },
  DELIVERABLE: { label: 'Deliverable', icon: Target, color: 'text-purple-600 bg-purple-100' },
  REVIEW: { label: 'Review', icon: CheckCircle2, color: 'text-yellow-600 bg-yellow-100' },
  PAYMENT: { label: 'Payment', icon: DollarSign, color: 'text-green-600 bg-green-100' },
  COMPLETION: { label: 'Completion', icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
  OTHER: { label: 'Other', icon: Target, color: 'text-gray-600 bg-gray-100' },
};

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  OVERDUE: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: Clock },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  if (currency === 'INR') {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getMilestoneStatus(milestone: ContractMilestone): ContractMilestone['status'] {
  if (milestone.status === 'COMPLETED') return 'COMPLETED';
  if (milestone.status === 'CANCELLED') return 'CANCELLED';
  
  const daysUntil = getDaysUntilDue(milestone.dueDate);
  if (daysUntil < 0) return 'OVERDUE';
  if (milestone.status === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'PENDING';
}

// ============================================================================
// Milestone Timeline Item
// ============================================================================

interface TimelineItemProps {
  milestone: ContractMilestone;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  readOnly?: boolean;
  currency?: string;
}

function TimelineItem({
  milestone,
  isFirst: _isFirst,
  isLast,
  onEdit,
  onDelete,
  onComplete,
  readOnly,
  currency = 'INR',
}: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const typeConfig = MILESTONE_TYPES[milestone.type] || MILESTONE_TYPES.OTHER;
  const actualStatus = getMilestoneStatus(milestone);
  const statusConfig = STATUS_CONFIG[actualStatus];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;
  
  const daysUntil = getDaysUntilDue(milestone.dueDate);
  const isUpcoming = daysUntil > 0 && daysUntil <= 7 && actualStatus !== 'COMPLETED';

  return (
    <div className="relative flex gap-4">
      {/* Timeline Line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center z-10',
            actualStatus === 'COMPLETED' ? 'bg-green-100' : 
            actualStatus === 'OVERDUE' ? 'bg-red-100' : 
            actualStatus === 'IN_PROGRESS' ? 'bg-blue-100' : 'bg-gray-100'
          )}
        >
          {actualStatus === 'COMPLETED' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : actualStatus === 'OVERDUE' ? (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          ) : (
            <TypeIcon className={cn('h-5 w-5', typeConfig.color.split(' ')[0])} />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 -mt-1',
              actualStatus === 'COMPLETED' ? 'bg-green-300' : 'bg-gray-200'
            )}
          />
        )}
      </div>

      {/* Milestone Content */}
      <div className="flex-1 pb-8">
        <div
          className={cn(
            'p-4 rounded-lg border transition-all',
            actualStatus === 'OVERDUE' ? 'border-red-200 bg-red-50' :
            actualStatus === 'COMPLETED' ? 'border-green-200 bg-green-50' :
            isUpcoming ? 'border-yellow-200 bg-yellow-50' :
            'border-gray-200 bg-white hover:shadow-md'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">{milestone.name}</h4>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeConfig.color)}>
                  {typeConfig.label}
                </span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.color)}>
                  <StatusIcon className="h-3 w-3 inline mr-1" />
                  {statusConfig.label}
                </span>
              </div>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Due: {formatDate(milestone.dueDate)}
                </span>
                {milestone.completedDate && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Completed: {formatDate(milestone.completedDate)}
                  </span>
                )}
                {milestone.amount && milestone.amount > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(milestone.amount, milestone.currency || currency)}
                  </span>
                )}
              </div>

              {/* Urgency Indicator */}
              {isUpcoming && milestone.status !== 'COMPLETED' && (
                <div className="mt-2 text-sm text-yellow-700 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Due in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                </div>
              )}
              
              {actualStatus === 'OVERDUE' && (
                <div className="mt-2 text-sm text-red-700 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue by {Math.abs(daysUntil)} day{Math.abs(daysUntil) !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {milestone.description && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {!readOnly && actualStatus !== 'COMPLETED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onComplete}
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              )}
              
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Expanded Description */}
          {isExpanded && milestone.description && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">{milestone.description}</p>
              {milestone.notes && (
                <p className="text-sm text-gray-500 mt-2 italic">Notes: {milestone.notes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Milestone Form Dialog
// ============================================================================

interface MilestoneFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  milestone?: ContractMilestone | null;
  onSubmit: (data: Partial<ContractMilestone>) => void;
  isLoading: boolean;
  currency?: string;
}

function MilestoneFormDialog({
  isOpen,
  onClose,
  milestone,
  onSubmit,
  isLoading,
  currency = 'INR',
}: MilestoneFormDialogProps) {
  const [formData, setFormData] = useState({
    name: milestone?.name || '',
    description: milestone?.description || '',
    type: milestone?.type || 'DELIVERABLE',
    dueDate: milestone?.dueDate?.split('T')[0] || '',
    amount: milestone?.amount || 0,
    notes: milestone?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const typeValue = formData.type as 'DELIVERABLE' | 'PAYMENT' | 'REVIEW' | 'KICKOFF' | 'COMPLETION' | 'OTHER';
    onSubmit({
      name: formData.name,
      description: formData.description || undefined,
      type: typeValue,
      dueDate: formData.dueDate,
      amount: formData.amount || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{milestone ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Milestone Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Phase 1 Delivery"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'DELIVERABLE' | 'PAYMENT' | 'REVIEW' | 'KICKOFF' | 'COMPLETION' | 'OTHER' })}
                >
                  {Object.entries(MILESTONE_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {formData.type === 'PAYMENT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount ({currency})
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this milestone..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : milestone ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Summary Stats
// ============================================================================

interface MilestoneStatsProps {
  milestones: ContractMilestone[];
  currency?: string;
}

function MilestoneStats({ milestones, currency = 'INR' }: MilestoneStatsProps) {
  const stats = {
    total: milestones.length,
    completed: milestones.filter((m) => m.status === 'COMPLETED').length,
    overdue: milestones.filter((m) => getMilestoneStatus(m) === 'OVERDUE').length,
    upcoming: milestones.filter((m) => {
      const days = getDaysUntilDue(m.dueDate);
      return days > 0 && days <= 7 && m.status !== 'COMPLETED';
    }).length,
    totalPayments: milestones
      .filter((m) => m.type === 'PAYMENT')
      .reduce((sum, m) => sum + (m.amount || 0), 0),
    completedPayments: milestones
      .filter((m) => m.type === 'PAYMENT' && m.status === 'COMPLETED')
      .reduce((sum, m) => sum + (m.amount || 0), 0),
  };

  const completionPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Progress</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium">{completionPercent}%</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {stats.completed} of {stats.total} completed
        </p>
      </div>

      {stats.overdue > 0 && (
        <div className="p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">Overdue</p>
          <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
        </div>
      )}

      {stats.upcoming > 0 && (
        <div className="p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-600">Due This Week</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.upcoming}</p>
        </div>
      )}

      {stats.totalPayments > 0 && (
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-600">Payments</p>
          <p className="text-lg font-bold text-green-700">
            {formatCurrency(stats.completedPayments, currency)} / {formatCurrency(stats.totalPayments, currency)}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ContractMilestones({
  contractId,
  milestones: initialMilestones,
  currency = 'INR',
  readOnly = false,
}: ContractMilestonesProps) {
  const queryClient = useQueryClient();

  // State
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ContractMilestone | null>(null);
  const [deletingMilestone, setDeletingMilestone] = useState<ContractMilestone | null>(null);

  // Fetch milestones if not provided
  const { data: fetchedMilestones, isLoading } = useQuery({
    queryKey: ['contract-milestones', contractId],
    queryFn: () => api.get<{ data: ContractMilestone[] }>(`/contracts/${contractId}/milestones`),
    enabled: !initialMilestones,
  });

  const milestones = (initialMilestones || fetchedMilestones?.data || []).sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<ContractMilestone>) =>
      api.post(`/contracts/${contractId}/milestones`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContractMilestone> }) =>
      api.put(`/contracts/${contractId}/milestones/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] });
      setEditingMilestone(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contracts/${contractId}/milestones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] });
      setDeletingMilestone(null);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/contracts/${contractId}/milestones/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-gray-400" />
          Milestones ({milestones.length})
        </CardTitle>
        {!readOnly && (
          <Can permission="contract:write">
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </Can>
        )}
      </CardHeader>
      <CardContent>
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && milestones.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No milestones defined</p>
            {!readOnly && (
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Milestone
              </Button>
            )}
          </div>
        )}

        {/* Stats */}
        {milestones.length > 0 && <MilestoneStats milestones={milestones} currency={currency} />}

        {/* Timeline */}
        {milestones.length > 0 && (
          <div className="relative">
            {milestones.map((milestone, index) => (
              <TimelineItem
                key={milestone.id}
                milestone={milestone}
                isFirst={index === 0}
                isLast={index === milestones.length - 1}
                onEdit={() => setEditingMilestone(milestone)}
                onDelete={() => setDeletingMilestone(milestone)}
                onComplete={() => completeMutation.mutate(milestone.id)}
                readOnly={readOnly}
                currency={currency}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Form */}
      <MilestoneFormDialog
        isOpen={showForm || !!editingMilestone}
        onClose={() => {
          setShowForm(false);
          setEditingMilestone(null);
        }}
        milestone={editingMilestone}
        onSubmit={(data) => {
          if (editingMilestone) {
            updateMutation.mutate({ id: editingMilestone.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
        currency={currency}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deletingMilestone} onOpenChange={() => setDeletingMilestone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Milestone</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>Are you sure you want to delete "{deletingMilestone?.name}"?</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMilestone(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingMilestone && deleteMutation.mutate(deletingMilestone.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
