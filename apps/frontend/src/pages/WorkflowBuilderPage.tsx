/**
 * Workflow Builder Page
 * Visual builder for approval chains/workflows
 * 
 * Architecture: Writer (Core Product)
 * - Full CRUD for approval chains via traditional UI
 * - Drag-and-drop step ordering
 * - Step configuration with all options
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  Archive,
  ChevronRight,
  ChevronDown,
  User,
  Users,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  GripVertical,
  Settings2,
  Save,
  X,
  ArrowLeft,
  Zap,
  GitBranch,
  Timer,
  Bell,
  Building2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';
import { Can } from '@/components/permissions/Can';
import { PERMISSIONS } from '@/hooks/usePermissions';

// ============================================================================
// Types
// ============================================================================

type ApprovalChainStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'DEPRECATED';
type ApprovalChainScope = 'TENANT' | 'PRACTICE' | 'GLOBAL';
type ApproverType = 'ROLE' | 'USER' | 'DYNAMIC';
type ApprovalMode = 'ANY' | 'ALL' | 'MAJORITY' | 'FIRST_RESPONSE';
type ConflictResolution = 'REJECTION_WINS' | 'APPROVAL_WINS' | 'MAJORITY_WINS';

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ApprovalStep {
  id?: string;
  name: string;
  instructions?: string;
  stepOrder: number;
  approverType: ApproverType;
  approverRoleId?: string;
  approverUserId?: string;
  approverRole?: Role;
  approverUser?: User;
  practiceSource?: string;
  roleAssignmentMode?: string;
  fallbackType?: ApproverType;
  fallbackRoleId?: string;
  fallbackUserId?: string;
  skipIfUnresolvable?: boolean;
  approvalMode: ApprovalMode;
  onConflict?: ConflictResolution;
  isOptional?: boolean;
  canDelegate?: boolean;
  skipCondition?: Record<string, unknown>;
  autoApproveAfterHours?: number;
  autoApproveCondition?: Record<string, unknown>;
  slaHours?: number;
  escalateAfterHours?: number;
  escalateToType?: ApproverType;
  escalateToRoleId?: string;
  escalateToUserId?: string;
  reminderAfterHours?: number;
  reminderIntervalHours?: number;
  maxReminders?: number;
}

interface ApprovalChain {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: ApprovalChainStatus;
  scope: ApprovalChainScope;
  version: number;
  practiceId?: string;
  practice?: { id: string; name: string };
  effectiveFrom: string;
  effectiveTo?: string;
  steps: ApprovalStep[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    requests: number;
    tenantConfigs: number;
  };
}

interface CreateChainInput {
  code: string;
  name: string;
  description?: string;
  scope: ApprovalChainScope;
  practiceId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  steps: Omit<ApprovalStep, 'id' | 'approverRole' | 'approverUser'>[];
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<ApprovalChainStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Edit },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  ARCHIVED: { label: 'Archived', color: 'bg-yellow-100 text-yellow-700', icon: Archive },
  DEPRECATED: { label: 'Deprecated', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const SCOPE_CONFIG: Record<ApprovalChainScope, { label: string; icon: React.ElementType }> = {
  TENANT: { label: 'Organization-wide', icon: Building2 },
  PRACTICE: { label: 'Practice-specific', icon: Users },
  GLOBAL: { label: 'Global', icon: Shield },
};

const APPROVER_TYPE_CONFIG: Record<ApproverType, { label: string; icon: React.ElementType; description: string }> = {
  ROLE: { label: 'Role', icon: Shield, description: 'Anyone with this role can approve' },
  USER: { label: 'Specific User', icon: User, description: 'Only this specific user can approve' },
  DYNAMIC: { label: 'Dynamic', icon: Zap, description: 'Determined at runtime based on request context' },
};

const APPROVAL_MODE_CONFIG: Record<ApprovalMode, { label: string; description: string }> = {
  ANY: { label: 'Any One', description: 'First approval or rejection decides' },
  ALL: { label: 'All Required', description: 'All assigned approvers must approve' },
  MAJORITY: { label: 'Majority', description: 'More than half must approve' },
  FIRST_RESPONSE: { label: 'First Response', description: 'First response (approve or reject) wins' },
};

const CONFLICT_RESOLUTION_CONFIG: Record<ConflictResolution, { label: string; description: string }> = {
  REJECTION_WINS: { label: 'Rejection Wins', description: 'Any rejection rejects the step' },
  APPROVAL_WINS: { label: 'Approval Wins', description: 'Any approval approves the step' },
  MAJORITY_WINS: { label: 'Majority Wins', description: 'Outcome based on majority' },
};

// ============================================================================
// Main Component
// ============================================================================

export default function WorkflowBuilderPage() {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [selectedChain, setSelectedChain] = useState<ApprovalChain | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalChainStatus | 'all'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch approval chains
  const { data: chainsResponse, isLoading } = useQuery({
    queryKey: ['approval-chains', statusFilter, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      return api.get<{ success: boolean; data: ApprovalChain[]; total: number }>(
        `/approval-chains?${params.toString()}`
      );
    },
  });

  // Fetch roles for step configuration
  const { data: rolesResponse } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<{ success: boolean; data: Role[] }>('/roles'),
  });

  // Fetch users for step configuration
  const { data: usersResponse } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ success: boolean; data: User[] }>('/users'),
  });

  const chains = chainsResponse?.data || [];
  const roles = rolesResponse?.data || [];
  const users = usersResponse?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/approval-chains/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-chains'] });
      setShowDeleteConfirm(null);
    },
  });

  // Handlers
  const handleCreateNew = () => {
    setSelectedChain(null);
    setIsCreating(true);
    setView('editor');
  };

  const handleEditChain = (chain: ApprovalChain) => {
    setSelectedChain(chain);
    setIsCreating(false);
    setView('editor');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedChain(null);
    setIsCreating(false);
  };

  const handleSaveComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['approval-chains'] });
    handleBackToList();
  };

  // Render based on view
  if (view === 'editor') {
    return (
      <MainLayout>
        <WorkflowEditor
          chain={selectedChain}
          isNew={isCreating}
          roles={roles}
          users={users}
          onBack={handleBackToList}
          onSave={handleSaveComplete}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflow Builder</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage approval workflows for requests
            </p>
          </div>
          <Can permission={PERMISSIONS.SETTINGS_UPDATE}>
            <Button onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </Can>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as ApprovalChainStatus | 'all')}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Workflow List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : chains.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <GitBranch className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No workflows found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first approval workflow to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Can permission={PERMISSIONS.SETTINGS_UPDATE}>
                  <Button onClick={handleCreateNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Workflow
                  </Button>
                </Can>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {chains.map((chain) => (
              <WorkflowCard
                key={chain.id}
                chain={chain}
                onEdit={() => handleEditChain(chain)}
                onDelete={() => setShowDeleteConfirm(chain.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!showDeleteConfirm}
        onOpenChange={() => setShowDeleteConfirm(null)}
        title="Delete Workflow"
        description="Are you sure you want to delete this workflow? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={async () => {
          if (showDeleteConfirm) {
            await deleteMutation.mutateAsync(showDeleteConfirm);
          }
        }}
      />
    </MainLayout>
  );
}

// ============================================================================
// Workflow Card Component
// ============================================================================

interface WorkflowCardProps {
  chain: ApprovalChain;
  onEdit: () => void;
  onDelete: () => void;
}

function WorkflowCard({ chain, onEdit, onDelete }: WorkflowCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[chain.status];
  const StatusIcon = statusConfig.icon;
  const scopeConfig = SCOPE_CONFIG[chain.scope];
  const ScopeIcon = scopeConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          {/* Main Row */}
          <div className="p-4 flex items-center gap-4">
            {/* Expand toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {expanded ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Icon */}
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 truncate">{chain.name}</h3>
                <span className="text-xs text-gray-400 font-mono">{chain.code}</span>
                <span className="text-xs text-gray-400">v{chain.version}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <ScopeIcon className="w-3.5 h-3.5" />
                  {scopeConfig.label}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {chain.steps.length} steps
                </span>
                {chain._count?.requests !== undefined && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {chain._count.requests} requests
                  </span>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className={cn('px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1', statusConfig.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </div>

            {/* Actions */}
            <Can permission={PERMISSIONS.SETTINGS_UPDATE}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {chain.status === 'DRAFT' && (
                    <DropdownMenuItem>
                      <Play className="w-4 h-4 mr-2" />
                      Activate
                    </DropdownMenuItem>
                  )}
                  {chain.status === 'ACTIVE' && (
                    <DropdownMenuItem>
                      <Pause className="w-4 h-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                  {/* Description */}
                  {chain.description && (
                    <p className="text-sm text-gray-600 mb-4">{chain.description}</p>
                  )}

                  {/* Steps Preview */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approval Steps
                    </h4>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {chain.steps.map((step, index) => (
                        <div key={step.id || index} className="flex items-center">
                          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-w-[140px]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                                {step.stepOrder}
                              </span>
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {step.name}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {step.approverType === 'ROLE' && step.approverRole?.name}
                              {step.approverType === 'USER' &&
                                step.approverUser &&
                                `${step.approverUser.firstName} ${step.approverUser.lastName}`}
                              {step.approverType === 'DYNAMIC' && 'Dynamic Assignment'}
                            </div>
                          </div>
                          {index < chain.steps.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-gray-300 mx-1 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span>Created {formatDate(chain.createdAt)}</span>
                    <span>Updated {formatDate(chain.updatedAt)}</span>
                    {chain.effectiveFrom && (
                      <span>Effective from {formatDate(chain.effectiveFrom)}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Workflow Editor Component
// ============================================================================

interface WorkflowEditorProps {
  chain: ApprovalChain | null;
  isNew: boolean;
  roles: Role[];
  users: User[];
  onBack: () => void;
  onSave: () => void;
}

function WorkflowEditor({ chain, isNew, roles, users, onBack, onSave }: WorkflowEditorProps) {
  const [formData, setFormData] = useState<CreateChainInput>({
    code: chain?.code || '',
    name: chain?.name || '',
    description: chain?.description || '',
    scope: chain?.scope || 'TENANT',
    practiceId: chain?.practiceId || undefined,
    steps: chain?.steps.map((s) => ({
      name: s.name,
      instructions: s.instructions,
      stepOrder: s.stepOrder,
      approverType: s.approverType,
      approverRoleId: s.approverRoleId,
      approverUserId: s.approverUserId,
      practiceSource: s.practiceSource,
      roleAssignmentMode: s.roleAssignmentMode || 'ANY',
      fallbackType: s.fallbackType,
      fallbackRoleId: s.fallbackRoleId,
      fallbackUserId: s.fallbackUserId,
      skipIfUnresolvable: s.skipIfUnresolvable || false,
      approvalMode: s.approvalMode || 'ANY',
      onConflict: s.onConflict || 'REJECTION_WINS',
      isOptional: s.isOptional || false,
      canDelegate: s.canDelegate ?? true,
      skipCondition: s.skipCondition,
      autoApproveAfterHours: s.autoApproveAfterHours,
      autoApproveCondition: s.autoApproveCondition,
      slaHours: s.slaHours,
      escalateAfterHours: s.escalateAfterHours,
      escalateToType: s.escalateToType,
      escalateToRoleId: s.escalateToRoleId,
      escalateToUserId: s.escalateToUserId,
      reminderAfterHours: s.reminderAfterHours || 24,
      reminderIntervalHours: s.reminderIntervalHours || 24,
      maxReminders: s.maxReminders || 3,
    })) || [],
  });

  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateChainInput) =>
      api.post<{ success: boolean; data: ApprovalChain }>('/approval-chains', data),
    onSuccess: () => {
      onSave();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: CreateChainInput) =>
      api.put<{ success: boolean; data: ApprovalChain }>(`/approval-chains/${chain?.id}`, data),
    onSuccess: () => {
      onSave();
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Handlers
  const handleAddStep = () => {
    const newStep: CreateChainInput['steps'][0] = {
      name: `Step ${formData.steps.length + 1}`,
      stepOrder: formData.steps.length + 1,
      approverType: 'ROLE',
      approvalMode: 'ANY',
      onConflict: 'REJECTION_WINS',
      isOptional: false,
      canDelegate: true,
      skipIfUnresolvable: false,
      reminderAfterHours: 24,
      reminderIntervalHours: 24,
      maxReminders: 3,
    };
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
    setSelectedStepIndex(formData.steps.length);
  };

  const handleDeleteStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, stepOrder: i + 1 })),
    }));
    if (selectedStepIndex === index) {
      setSelectedStepIndex(null);
    } else if (selectedStepIndex !== null && selectedStepIndex > index) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
  };

  const handleReorderSteps = (newOrder: CreateChainInput['steps']) => {
    setFormData((prev) => ({
      ...prev,
      steps: newOrder.map((s, i) => ({ ...s, stepOrder: i + 1 })),
    }));
  };

  const handleUpdateStep = (index: number, updates: Partial<CreateChainInput['steps'][0]>) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, ...updates } : s)),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code = 'Code must contain only letters, numbers, hyphens, and underscores';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.steps.length === 0) {
      newErrors.steps = 'At least one step is required';
    }

    formData.steps.forEach((step, index) => {
      if (!step.name.trim()) {
        newErrors[`step_${index}_name`] = 'Step name is required';
      }
      if (step.approverType === 'ROLE' && !step.approverRoleId) {
        newErrors[`step_${index}_approver`] = 'Please select a role';
      }
      if (step.approverType === 'USER' && !step.approverUserId) {
        newErrors[`step_${index}_approver`] = 'Please select a user';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (isNew) {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  const selectedStep = selectedStepIndex !== null ? formData.steps[selectedStepIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {isNew ? 'Create Workflow' : `Edit: ${chain?.name}`}
              </h1>
              <p className="text-sm text-gray-500">
                Define approval steps and configure workflow behavior
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Workflow
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Workflow Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workflow Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                    }
                    placeholder="e.g., LEAVE_APPROVAL"
                    className={cn(errors.code && 'border-red-500')}
                    disabled={!isNew}
                  />
                  {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                </div>

                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Leave Approval Workflow"
                    className={cn(errors.name && 'border-red-500')}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe this workflow..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <Label>Scope</Label>
                  <Select
                    value={formData.scope}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, scope: v as ApprovalChainScope }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SCOPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="w-4 h-4 text-gray-500" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Steps Builder */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Approval Steps</CardTitle>
                <Button size="sm" onClick={handleAddStep}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </Button>
              </CardHeader>
              <CardContent>
                {errors.steps && (
                  <p className="text-sm text-red-500 mb-4">{errors.steps}</p>
                )}

                {formData.steps.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <GitBranch className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-3">No steps defined yet</p>
                    <Button size="sm" onClick={handleAddStep}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add First Step
                    </Button>
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={formData.steps}
                    onReorder={handleReorderSteps}
                    className="space-y-2"
                  >
                    {formData.steps.map((step, index) => (
                      <Reorder.Item
                        key={`${step.stepOrder}-${index}`}
                        value={step}
                        className={cn(
                          'bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing',
                          selectedStepIndex === index
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-gray-200 hover:border-gray-300',
                          errors[`step_${index}_name`] || errors[`step_${index}_approver`]
                            ? 'border-red-300'
                            : ''
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 truncate">
                                {step.name}
                              </span>
                              {step.isOptional && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  Optional
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                              {step.approverType === 'ROLE' && (
                                <>
                                  <Shield className="w-3 h-3" />
                                  {roles.find((r) => r.id === step.approverRoleId)?.name || 'Select role'}
                                </>
                              )}
                              {step.approverType === 'USER' && (
                                <>
                                  <User className="w-3 h-3" />
                                  {(() => {
                                    const user = users.find((u) => u.id === step.approverUserId);
                                    return user
                                      ? `${user.firstName} ${user.lastName}`
                                      : 'Select user';
                                  })()}
                                </>
                              )}
                              {step.approverType === 'DYNAMIC' && (
                                <>
                                  <Zap className="w-3 h-3" />
                                  Dynamic Assignment
                                </>
                              )}
                              <span className="text-gray-300">•</span>
                              <span>{APPROVAL_MODE_CONFIG[step.approvalMode].label}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setSelectedStepIndex(index)}
                            >
                              <Settings2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteStep(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {(errors[`step_${index}_name`] || errors[`step_${index}_approver`]) && (
                          <p className="text-xs text-red-500 mt-2 ml-9">
                            {errors[`step_${index}_name`] || errors[`step_${index}_approver`]}
                          </p>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </CardContent>
            </Card>

            {/* Step Configuration Panel */}
            {selectedStep && selectedStepIndex !== null && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    Configure Step {selectedStepIndex + 1}: {selectedStep.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedStepIndex(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <StepConfigPanel
                    step={selectedStep}
                    index={selectedStepIndex}
                    roles={roles}
                    users={users}
                    errors={errors}
                    onUpdate={(updates) => handleUpdateStep(selectedStepIndex, updates)}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step Configuration Panel
// ============================================================================

interface StepConfigPanelProps {
  step: CreateChainInput['steps'][0];
  index: number;
  roles: Role[];
  users: User[];
  errors: Record<string, string>;
  onUpdate: (updates: Partial<CreateChainInput['steps'][0]>) => void;
}

function StepConfigPanel({ step, index, roles, users, errors, onUpdate }: StepConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'timing'>('basic');

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'basic', label: 'Basic', icon: Settings2 },
          { id: 'advanced', label: 'Advanced', icon: Zap },
          { id: 'timing', label: 'Timing & SLA', icon: Timer },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Basic Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor={`step-name-${index}`}>Step Name *</Label>
            <Input
              id={`step-name-${index}`}
              value={step.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="e.g., Manager Approval"
              className={cn(errors[`step_${index}_name`] && 'border-red-500')}
            />
          </div>

          <div>
            <Label htmlFor={`step-instructions-${index}`}>Instructions</Label>
            <textarea
              id={`step-instructions-${index}`}
              value={step.instructions || ''}
              onChange={(e) => onUpdate({ instructions: e.target.value })}
              placeholder="Instructions for approvers..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <Label>Approver Type *</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {Object.entries(APPROVER_TYPE_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    onUpdate({
                      approverType: key as ApproverType,
                      approverRoleId: undefined,
                      approverUserId: undefined,
                    })
                  }
                  className={cn(
                    'border rounded-lg p-3 text-left transition-colors',
                    step.approverType === key
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <config.icon className="w-5 h-5 text-gray-600 mb-1" />
                  <div className="text-sm font-medium text-gray-900">{config.label}</div>
                  <div className="text-xs text-gray-500">{config.description}</div>
                </button>
              ))}
            </div>
          </div>

          {step.approverType === 'ROLE' && (
            <div>
              <Label>Select Role *</Label>
              <Select
                value={step.approverRoleId || ''}
                onValueChange={(v) => onUpdate({ approverRoleId: v })}
              >
                <SelectTrigger
                  className={cn(errors[`step_${index}_approver`] && 'border-red-500')}
                >
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step.approverType === 'USER' && (
            <div>
              <Label>Select User *</Label>
              <Select
                value={step.approverUserId || ''}
                onValueChange={(v) => onUpdate({ approverUserId: v })}
              >
                <SelectTrigger
                  className={cn(errors[`step_${index}_approver`] && 'border-red-500')}
                >
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Approval Mode</Label>
            <Select
              value={step.approvalMode}
              onValueChange={(v) => onUpdate({ approvalMode: v as ApprovalMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APPROVAL_MODE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-gray-500">{config.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-900">Optional Step</div>
              <div className="text-xs text-gray-500">
                Workflow continues even if this step is skipped
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={step.isOptional}
                onChange={(e) => onUpdate({ isOptional: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-900">Allow Delegation</div>
              <div className="text-xs text-gray-500">Approvers can delegate to others</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={step.canDelegate}
                onChange={(e) => onUpdate({ canDelegate: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-900">Skip if Unresolvable</div>
              <div className="text-xs text-gray-500">
                Skip step if approver cannot be determined
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={step.skipIfUnresolvable}
                onChange={(e) => onUpdate({ skipIfUnresolvable: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div>
            <Label>Conflict Resolution</Label>
            <Select
              value={step.onConflict || 'REJECTION_WINS'}
              onValueChange={(v) => onUpdate({ onConflict: v as ConflictResolution })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONFLICT_RESOLUTION_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-gray-500">{config.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Timing & SLA Tab */}
      {activeTab === 'timing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`step-sla-${index}`}>SLA (Hours)</Label>
              <Input
                id={`step-sla-${index}`}
                type="number"
                min={0}
                value={step.slaHours || ''}
                onChange={(e) =>
                  onUpdate({ slaHours: e.target.value ? parseInt(e.target.value) : undefined })
                }
                placeholder="e.g., 24"
              />
              <p className="text-xs text-gray-500 mt-1">Expected response time</p>
            </div>

            <div>
              <Label htmlFor={`step-auto-${index}`}>Auto-Approve After (Hours)</Label>
              <Input
                id={`step-auto-${index}`}
                type="number"
                min={0}
                value={step.autoApproveAfterHours || ''}
                onChange={(e) =>
                  onUpdate({
                    autoApproveAfterHours: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="e.g., 48"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to disable</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminders
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`step-reminder-${index}`}>First After (Hours)</Label>
                <Input
                  id={`step-reminder-${index}`}
                  type="number"
                  min={1}
                  value={step.reminderAfterHours || 24}
                  onChange={(e) =>
                    onUpdate({ reminderAfterHours: parseInt(e.target.value) || 24 })
                  }
                />
              </div>
              <div>
                <Label htmlFor={`step-interval-${index}`}>Interval (Hours)</Label>
                <Input
                  id={`step-interval-${index}`}
                  type="number"
                  min={1}
                  value={step.reminderIntervalHours || 24}
                  onChange={(e) =>
                    onUpdate({ reminderIntervalHours: parseInt(e.target.value) || 24 })
                  }
                />
              </div>
              <div>
                <Label htmlFor={`step-max-${index}`}>Max Reminders</Label>
                <Input
                  id={`step-max-${index}`}
                  type="number"
                  min={0}
                  value={step.maxReminders || 3}
                  onChange={(e) => onUpdate({ maxReminders: parseInt(e.target.value) || 3 })}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Escalation
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`step-escalate-${index}`}>Escalate After (Hours)</Label>
                <Input
                  id={`step-escalate-${index}`}
                  type="number"
                  min={0}
                  value={step.escalateAfterHours || ''}
                  onChange={(e) =>
                    onUpdate({
                      escalateAfterHours: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 72"
                />
              </div>
              <div>
                <Label>Escalate To</Label>
                <Select
                  value={step.escalateToType || ''}
                  onValueChange={(v) => onUpdate({ escalateToType: v as ApproverType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROLE">Role</SelectItem>
                    <SelectItem value="USER">Specific User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {step.escalateToType === 'ROLE' && (
              <div className="mt-4">
                <Label>Escalation Role</Label>
                <Select
                  value={step.escalateToRoleId || ''}
                  onValueChange={(v) => onUpdate({ escalateToRoleId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {step.escalateToType === 'USER' && (
              <div className="mt-4">
                <Label>Escalation User</Label>
                <Select
                  value={step.escalateToUserId || ''}
                  onValueChange={(v) => onUpdate({ escalateToUserId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
