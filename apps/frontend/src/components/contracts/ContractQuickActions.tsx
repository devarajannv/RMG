/**
 * ContractQuickActions Component
 * 
 * Quick action buttons for contract operations:
 * - Status transitions with confirmation
 * - Common actions (edit, duplicate, export)
 * - Permission-gated actions
 * - Loading states
 * 
 * @module ContractQuickActions
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  RefreshCw,
  XCircle,
  Edit,
  Copy,
  Download,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Send,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Can } from '@/components/permissions';

// ============================================================================
// Types
// ============================================================================

type ContractStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

interface Contract {
  id: string;
  name: string;
  contractNumber: string;
  status: ContractStatus;
  value?: number;
  currency: string;
  endDate?: string;
  autoRenew: boolean;
}

interface ContractQuickActionsProps {
  contract: Contract;
  onStatusChange?: () => void;
  onEdit?: () => void;
  onRenew?: () => void;
  onDelete?: () => void;
  variant?: 'full' | 'compact' | 'dropdown';
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
  requireReason?: boolean;
  reason?: string;
  onReasonChange?: (reason: string) => void;
}

// ============================================================================
// Confirmation Dialog Component
// ============================================================================

function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  variant = 'default',
  isLoading,
  requireReason,
  reason,
  onReasonChange,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent preventDismiss>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant === 'danger' ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-gray-600">{message}</p>
          {requireReason && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (required)
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={reason}
                onChange={(e) => onReasonChange?.(e.target.value)}
                placeholder="Please provide a reason..."
              />
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading || (requireReason && !reason?.trim())}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Action Button Definitions
// ============================================================================

interface ActionDefinition {
  id: string;
  label: string;
  icon: React.ElementType;
  variant?: 'default' | 'outline' | 'destructive';
  permission?: string;
  visibleStatuses: ContractStatus[];
  confirmTitle?: string;
  confirmMessage?: string;
  confirmVariant?: 'default' | 'danger';
  requireReason?: boolean;
  isPrimary?: boolean;
}

const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    id: 'activate',
    label: 'Activate',
    icon: Play,
    variant: 'default',
    permission: 'contract:write',
    visibleStatuses: ['DRAFT'],
    confirmTitle: 'Activate Contract',
    confirmMessage: 'This will activate the contract and make it live. Are you sure?',
    isPrimary: true,
  },
  {
    id: 'submit_approval',
    label: 'Submit for Approval',
    icon: Send,
    variant: 'default',
    permission: 'contract:write',
    visibleStatuses: ['DRAFT'],
    confirmTitle: 'Submit for Approval',
    confirmMessage: 'Submit this contract for approval?',
  },
  {
    id: 'renew',
    label: 'Renew',
    icon: RefreshCw,
    variant: 'outline',
    permission: 'contract:write',
    visibleStatuses: ['ACTIVE', 'EXPIRED'],
    isPrimary: true,
  },
  {
    id: 'terminate',
    label: 'Terminate',
    icon: XCircle,
    variant: 'destructive',
    permission: 'contract:write',
    visibleStatuses: ['ACTIVE', 'RENEWED'],
    confirmTitle: 'Terminate Contract',
    confirmMessage: 'Terminating this contract will end all associated activities. This action cannot be undone.',
    confirmVariant: 'danger',
    requireReason: true,
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: Edit,
    variant: 'outline',
    permission: 'contract:write',
    visibleStatuses: ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'RENEWED'],
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: Copy,
    variant: 'outline',
    permission: 'contract:write',
    visibleStatuses: ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'RENEWED', 'EXPIRED', 'TERMINATED'],
  },
  {
    id: 'export',
    label: 'Export PDF',
    icon: Download,
    variant: 'outline',
    permission: 'contract:read',
    visibleStatuses: ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'RENEWED', 'EXPIRED', 'TERMINATED'],
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive',
    permission: 'contract:delete',
    visibleStatuses: ['DRAFT'],
    confirmTitle: 'Delete Contract',
    confirmMessage: 'Are you sure you want to delete this contract? This action cannot be undone.',
    confirmVariant: 'danger',
  },
];

// ============================================================================
// Main Component
// ============================================================================

export function ContractQuickActions({
  contract,
  onStatusChange,
  onEdit,
  onRenew,
  onDelete,
  variant = 'full',
}: ContractQuickActionsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: ActionDefinition | null;
    reason: string;
  }>({
    isOpen: false,
    action: null,
    reason: '',
  });

  // Filter visible actions based on current status
  const visibleActions = ACTION_DEFINITIONS.filter((action) =>
    action.visibleStatuses.includes(contract.status)
  );

  const primaryActions = visibleActions.filter((a) => a.isPrimary);
  const secondaryActions = visibleActions.filter((a) => !a.isPrimary);

  // Mutations
  const activateMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${contract.id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
      onStatusChange?.();
    },
  });

  const terminateMutation = useMutation({
    mutationFn: (reason: string) => api.post(`/contracts/${contract.id}/terminate`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
      onStatusChange?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/contracts/${contract.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      onDelete?.();
      navigate('/contracts');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${contract.id}/duplicate`),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      if (response.data?.id) {
        navigate(`/contracts/${response.data.id}`);
      }
    },
  });

  // Action handlers
  const handleAction = (action: ActionDefinition) => {
    // Actions that need confirmation
    if (action.confirmTitle) {
      setConfirmDialog({
        isOpen: true,
        action,
        reason: '',
      });
      return;
    }

    // Direct actions
    executeAction(action.id);
  };

  const executeAction = (actionId: string, reason?: string) => {
    switch (actionId) {
      case 'activate':
        activateMutation.mutate();
        break;
      case 'terminate':
        if (reason) terminateMutation.mutate(reason);
        break;
      case 'renew':
        onRenew?.();
        break;
      case 'edit':
        onEdit?.();
        break;
      case 'duplicate':
        duplicateMutation.mutate();
        break;
      case 'export':
        // TODO: Implement PDF export
        window.open(`/api/v1/contracts/${contract.id}/export?format=pdf`, '_blank');
        break;
      case 'delete':
        deleteMutation.mutate();
        break;
      case 'submit_approval':
        // TODO: Implement approval workflow
        break;
    }
  };

  const handleConfirm = () => {
    if (confirmDialog.action) {
      executeAction(confirmDialog.action.id, confirmDialog.reason);
      setConfirmDialog({ isOpen: false, action: null, reason: '' });
    }
  };

  const isLoading =
    activateMutation.isPending ||
    terminateMutation.isPending ||
    deleteMutation.isPending ||
    duplicateMutation.isPending;

  // Render action button
  const renderActionButton = (action: ActionDefinition, showLabel = true) => {
    const Icon = action.icon;
    return (
      <Can key={action.id} permission={action.permission}>
        <Button
          variant={action.variant as any}
          size={showLabel ? 'default' : 'sm'}
          onClick={() => handleAction(action)}
          disabled={isLoading}
        >
          <Icon className={cn('h-4 w-4', showLabel && 'mr-2')} />
          {showLabel && action.label}
        </Button>
      </Can>
    );
  };

  // Compact variant - just icons
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {primaryActions.map((action) => renderActionButton(action, false))}
        {secondaryActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {secondaryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Can key={action.id} permission={action.permission}>
                    <DropdownMenuItem
                      onClick={() => handleAction(action)}
                      className={action.variant === 'destructive' ? 'text-red-600' : ''}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                  </Can>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, action: null, reason: '' })}
          onConfirm={handleConfirm}
          title={confirmDialog.action?.confirmTitle || ''}
          message={confirmDialog.action?.confirmMessage || ''}
          confirmLabel={confirmDialog.action?.label || 'Confirm'}
          variant={confirmDialog.action?.confirmVariant}
          isLoading={isLoading}
          requireReason={confirmDialog.action?.requireReason}
          reason={confirmDialog.reason}
          onReasonChange={(reason) => setConfirmDialog({ ...confirmDialog, reason })}
        />
      </div>
    );
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Actions
              <MoreHorizontal className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {primaryActions.map((action) => {
              const Icon = action.icon;
              return (
                <Can key={action.id} permission={action.permission}>
                  <DropdownMenuItem onClick={() => handleAction(action)}>
                    <Icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                </Can>
              );
            })}
            {primaryActions.length > 0 && secondaryActions.length > 0 && (
              <DropdownMenuSeparator />
            )}
            {secondaryActions.map((action) => {
              const Icon = action.icon;
              return (
                <Can key={action.id} permission={action.permission}>
                  <DropdownMenuItem
                    onClick={() => handleAction(action)}
                    className={action.variant === 'destructive' ? 'text-red-600' : ''}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                </Can>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, action: null, reason: '' })}
          onConfirm={handleConfirm}
          title={confirmDialog.action?.confirmTitle || ''}
          message={confirmDialog.action?.confirmMessage || ''}
          confirmLabel={confirmDialog.action?.label || 'Confirm'}
          variant={confirmDialog.action?.confirmVariant}
          isLoading={isLoading}
          requireReason={confirmDialog.action?.requireReason}
          reason={confirmDialog.reason}
          onReasonChange={(reason) => setConfirmDialog({ ...confirmDialog, reason })}
        />
      </>
    );
  }

  // Full variant - all buttons visible
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {primaryActions.map((action) => renderActionButton(action))}
        {secondaryActions.map((action) => renderActionButton(action))}
      </div>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, reason: '' })}
        onConfirm={handleConfirm}
        title={confirmDialog.action?.confirmTitle || ''}
        message={confirmDialog.action?.confirmMessage || ''}
        confirmLabel={confirmDialog.action?.label || 'Confirm'}
        variant={confirmDialog.action?.confirmVariant}
        isLoading={isLoading}
        requireReason={confirmDialog.action?.requireReason}
        reason={confirmDialog.reason}
        onReasonChange={(reason) => setConfirmDialog({ ...confirmDialog, reason })}
      />
    </>
  );
}
