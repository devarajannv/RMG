/**
 * Phase 5: Governance
 * 
 * Configure organizational governance rules:
 * - Delegation rules (approval delegation)
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  CheckCircle2,
  // Users, UserCheck - reserved for future delegation rule enhancements
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
// cn import removed - not currently used
import {
  useDelegationRules,
  useCreateDelegationRule,
  useUpdateDelegationRule,
  useDeleteDelegationRule,
  useSeedDefaultDelegationRules,
  useBusinessRoles,
  useGovernanceStatus,
  useCompleteStep,
  useMarkOnboardingComplete,
} from '../api';
import { useOnboardingStore } from '../store';
import type { 
  DelegationRule, 
  DelegationRuleInput,
  DelegatorType,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const DELEGATOR_TYPES: { value: DelegatorType; label: string; description: string }[] = [
  { value: 'ANY_USER', label: 'Any User', description: 'All users can delegate' },
  { value: 'SPECIFIC_USER', label: 'Specific User', description: 'Only specified user can delegate' },
  { value: 'ROLE_HOLDER', label: 'Role Holder', description: 'Users with specific role can delegate' },
  { value: 'MANAGER_OF', label: 'Manager Of', description: 'Managers can delegate for their reports' },
];

// ============================================================================
// Sub-components
// ============================================================================

interface CollapsibleSectionProps {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  count?: number;
  children: React.ReactNode;
}

function CollapsibleSection({ 
  id, 
  title, 
  description, 
  icon: Icon, 
  count,
  children 
}: CollapsibleSectionProps) {
  const { expandedSections, toggleSection } = useOnboardingStore();
  const isExpanded = expandedSections[id] ?? true;

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer select-none"
        onClick={() => toggleSection(id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{title}</CardTitle>
                {count !== undefined && (
                  <Badge variant="secondary">{count}</Badge>
                )}
              </div>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

function getDelegatorTypeBadge(type: DelegatorType) {
  const config = DELEGATOR_TYPES.find(t => t.value === type);
  if (!config) return <Badge>{type}</Badge>;
  
  const colors: Record<DelegatorType, string> = {
    'ANY_USER': 'bg-blue-100 text-blue-800',
    'SPECIFIC_USER': 'bg-purple-100 text-purple-800',
    'ROLE_HOLDER': 'bg-green-100 text-green-800',
    'MANAGER_OF': 'bg-orange-100 text-orange-800',
  };
  
  return <Badge className={colors[type]}>{config.label}</Badge>;
}

// ============================================================================
// Delegation Rules Section
// ============================================================================

function DelegationRulesSection() {
  const { data: rulesResponse, isLoading } = useDelegationRules();
  const { data: businessRolesResponse } = useBusinessRoles();
  const rules = rulesResponse?.data || [];
  const businessRoles = businessRolesResponse?.data || [];
  const createRule = useCreateDelegationRule();
  const updateRule = useUpdateDelegationRule();
  const deleteRule = useDeleteDelegationRule();
  const seedDefaults = useSeedDefaultDelegationRules();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DelegationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DelegationRule | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<DelegationRuleInput>({
    defaultValues: {
      name: '',
      description: '',
      delegatorType: 'ANY_USER',
      canApprove: true,
      canReject: true,
      canReassign: false,
      effectiveFrom: new Date().toISOString().split('T')[0],
      isActive: true,
    },
  });

  const delegatorType = watch('delegatorType');

  const openCreateDialog = () => {
    reset({ 
      name: '', 
      description: '', 
      delegatorType: 'ANY_USER',
      canApprove: true,
      canReject: true,
      canReassign: false,
      effectiveFrom: new Date().toISOString().split('T')[0],
      isActive: true,
    });
    setEditingRule(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: DelegationRule) => {
    setEditingRule(rule);
    reset({
      name: rule.name,
      description: rule.description || '',
      delegatorType: rule.delegatorType,
      delegatorId: rule.delegatorId || undefined,
      delegateRoleId: rule.delegateRoleId || undefined,
      canApprove: rule.canApprove,
      canReject: rule.canReject,
      canReassign: rule.canReassign,
      maxAmount: rule.maxAmount || undefined,
      effectiveFrom: rule.effectiveFrom.split('T')[0],
      effectiveTo: rule.effectiveTo?.split('T')[0] || undefined,
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: DelegationRuleInput) => {
    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule.id, data });
    } else {
      await createRule.mutateAsync(data);
    }
    setIsDialogOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteRule.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleSeedDefaults = async () => {
    await seedDefaults.mutateAsync();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasRules = rules && rules.length > 0;

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <div className="rounded-lg border bg-blue-50 p-4">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">What are Delegation Rules?</h4>
            <p className="text-sm text-blue-700 mt-1">
              Delegation rules allow users to delegate their approval authority to others during
              absence or for specific transaction types. This ensures workflow continuity while
              maintaining proper controls.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
          {!hasRules && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSeedDefaults}
              disabled={seedDefaults.isPending}
            >
              {seedDefaults.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Use Defaults
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {hasRules ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Delegator Type</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      {rule.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {rule.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getDelegatorTypeBadge(rule.delegatorType)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {rule.canApprove && <Badge variant="outline" className="text-xs">Approve</Badge>}
                      {rule.canReject && <Badge variant="outline" className="text-xs">Reject</Badge>}
                      {rule.canReassign && <Badge variant="outline" className="text-xs">Reassign</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(rule.effectiveFrom)}
                    {rule.effectiveTo && ` - ${formatDate(rule.effectiveTo)}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(rule)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(rule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No delegation rules yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create rules to allow users to delegate approval authority.
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Delegation Rule' : 'Create Delegation Rule'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ruleName">Name *</Label>
                <Input
                  id="ruleName"
                  placeholder="Standard Delegation"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruleDescription">Description</Label>
                <Textarea
                  id="ruleDescription"
                  placeholder="Describe when this rule applies..."
                  rows={2}
                  {...register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label>Delegator Type *</Label>
                <Select
                  value={delegatorType}
                  onValueChange={(value) => setValue('delegatorType', value as DelegatorType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELEGATOR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div>{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {delegatorType === 'ROLE_HOLDER' && businessRoles && (
                <div className="space-y-2">
                  <Label>Delegate to Role</Label>
                  <Select
                    value={watch('delegateRoleId') || ''}
                    onValueChange={(value) => setValue('delegateRoleId', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Permissions */}
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="canApprove" className="font-normal">
                      Can Approve
                    </Label>
                    <Switch
                      id="canApprove"
                      checked={watch('canApprove')}
                      onCheckedChange={(checked) => setValue('canApprove', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="canReject" className="font-normal">
                      Can Reject
                    </Label>
                    <Switch
                      id="canReject"
                      checked={watch('canReject')}
                      onCheckedChange={(checked) => setValue('canReject', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="canReassign" className="font-normal">
                      Can Reassign
                    </Label>
                    <Switch
                      id="canReassign"
                      checked={watch('canReassign')}
                      onCheckedChange={(checked) => setValue('canReassign', checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="effectiveFrom">Effective From *</Label>
                  <Input
                    id="effectiveFrom"
                    type="date"
                    {...register('effectiveFrom', { required: 'Effective from date is required' })}
                  />
                  {errors.effectiveFrom && (
                    <p className="text-sm text-destructive">{errors.effectiveFrom.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effectiveTo">Effective To</Label>
                  <Input
                    id="effectiveTo"
                    type="date"
                    {...register('effectiveTo')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAmount">Max Amount Limit</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  placeholder="Leave empty for no limit"
                  {...register('maxAmount', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Maximum transaction amount for delegation
                </p>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createRule.isPending || updateRule.isPending}
              >
                {(createRule.isPending || updateRule.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingRule ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Delegation Rule"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface GovernancePhaseProps {
  onPhaseComplete: () => void;
}

export function GovernancePhase({ onPhaseComplete }: GovernancePhaseProps) {
  const { data: status } = useGovernanceStatus();
  const { data: rules } = useDelegationRules();
  const completeStep = useCompleteStep();
  const markComplete = useMarkOnboardingComplete();

  const handleComplete = async () => {
    await completeStep.mutateAsync({ phase: 5, stepCode: 'delegation-rules' });
    await markComplete.mutateAsync();
    onPhaseComplete();
  };

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Governance</h2>
          <p className="text-muted-foreground">
            Configure approval delegation and governance policies.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold">{status?.delegationRulesCount || rules?.length || 0}</div>
            <div className="text-muted-foreground">Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{status?.activeDelegationRules || 0}</div>
            <div className="text-muted-foreground">Active</div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <CollapsibleSection
          id="governance-delegation"
          title="Delegation Rules"
          description="Control how approval authority can be delegated"
          icon={Shield}
          count={rules?.length}
        >
          <DelegationRulesSection />
        </CollapsibleSection>
      </div>

      {/* Complete Onboarding */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900">Ready to Complete Setup!</h3>
              <p className="mt-1 text-sm text-green-700">
                You&apos;ve configured your organization&apos;s identity, structure, roles, people, and governance. 
                Click the button below to complete onboarding and start using the platform.
              </p>
              <Button 
                onClick={handleComplete}
                disabled={completeStep.isPending || markComplete.isPending}
                className="mt-4 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {(completeStep.isPending || markComplete.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete Onboarding
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
