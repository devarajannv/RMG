/**
 * Phase 2: Organization Structure
 * 
 * Defines the organizational hierarchy:
 * - Departments (functional units)
 * - Teams (within departments)
 * - Cost Centers (financial tracking)
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Building2,
  Users,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  FolderTree,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
// import { cn } from '@/lib/utils';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useSeedDefaultDepartments,
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useCostCenters,
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
  useStructureSummary,
  useCompleteStep,
} from '../api';
import { useOnboardingStore } from '../store';
import type { 
  Department, 
  DepartmentInput, 
  Team, 
  TeamInput, 
  CostCenter, 
  CostCenterInput 
} from '../types';

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

// ============================================================================
// Departments Section
// ============================================================================

function DepartmentsSection() {
  const { data: departmentsResponse, isLoading } = useDepartments();
  const departments = departmentsResponse?.data || [];
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const seedDefaults = useSeedDefaultDepartments();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<DepartmentInput>({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      isActive: true,
    },
  });

  const openCreateDialog = () => {
    reset({ name: '', code: '', description: '', isActive: true });
    setEditingDepartment(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (dept: Department) => {
    setEditingDepartment(dept);
    reset({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      parentId: dept.parentId || undefined,
      isActive: dept.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: DepartmentInput) => {
    if (editingDepartment) {
      await updateDepartment.mutateAsync({ id: editingDepartment.id, data });
    } else {
      await createDepartment.mutateAsync(data);
    }
    setIsDialogOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteDepartment.mutateAsync(deleteTarget.id);
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

  const hasDepartments = departments && departments.length > 0;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
          {!hasDepartments && (
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
      {hasDepartments ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-mono text-sm">{dept.code}</TableCell>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {dept.description || '—'}
                  </TableCell>
                  <TableCell>{dept._count?.teams || 0}</TableCell>
                  <TableCell>
                    <Badge variant={dept.isActive ? 'default' : 'secondary'}>
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(dept)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(dept)}
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
          <FolderTree className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No departments yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create departments to organize your workforce, or use default templates.
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Edit Department' : 'Create Department'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Engineering"
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    placeholder="ENGR"
                    className="uppercase"
                    {...register('code', { required: 'Code is required' })}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Software development and engineering..."
                  rows={2}
                  {...register('description')}
                />
              </div>
              {departments && departments.length > 0 && (
                <div className="space-y-2">
                  <Label>Parent Department</Label>
                  <Select
                    value={watch('parentId') || ''}
                    onValueChange={(value) => setValue('parentId', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (top-level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (top-level)</SelectItem>
                      {departments
                        .filter((d) => d.id !== editingDepartment?.id)
                        .map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDepartment.isPending || updateDepartment.isPending}
              >
                {(createDepartment.isPending || updateDepartment.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingDepartment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Department"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}

// ============================================================================
// Teams Section
// ============================================================================

function TeamsSection() {
  const { data: teamsResponse, isLoading } = useTeams();
  const { data: departmentsResponse } = useDepartments();
  const teams = teamsResponse?.data || [];
  const departments = departmentsResponse?.data || [];
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TeamInput>({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      departmentId: '',
      isActive: true,
    },
  });

  const openCreateDialog = () => {
    reset({ name: '', code: '', description: '', departmentId: '', isActive: true });
    setEditingTeam(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    reset({
      name: team.name,
      code: team.code,
      description: team.description || '',
      departmentId: team.departmentId,
      isActive: team.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: TeamInput) => {
    if (editingTeam) {
      await updateTeam.mutateAsync({ id: editingTeam.id, data });
    } else {
      await createTeam.mutateAsync(data);
    }
    setIsDialogOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteTeam.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasTeams = teams && teams.length > 0;
  const hasDepartments = departments && departments.length > 0;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button 
          onClick={openCreateDialog} 
          size="sm"
          disabled={!hasDepartments}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Team
        </Button>
        {!hasDepartments && (
          <p className="text-sm text-muted-foreground">
            Create departments first to add teams
          </p>
        )}
      </div>

      {/* Table */}
      {hasTeams ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-mono text-sm">{team.code}</TableCell>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.department?.name || '—'}</TableCell>
                  <TableCell>{team._count?.resources || 0}</TableCell>
                  <TableCell>
                    <Badge variant={team.isActive ? 'default' : 'secondary'}>
                      {team.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(team)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(team)}
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
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No teams yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasDepartments 
              ? 'Create teams within your departments.'
              : 'Create departments first, then add teams.'
            }
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? 'Edit Team' : 'Create Team'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="teamName">Name *</Label>
                  <Input
                    id="teamName"
                    placeholder="Frontend Team"
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamCode">Code *</Label>
                  <Input
                    id="teamCode"
                    placeholder="FE"
                    className="uppercase"
                    {...register('code', { required: 'Code is required' })}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select
                  value={watch('departmentId') || ''}
                  onValueChange={(value) => setValue('departmentId', value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.departmentId && (
                  <p className="text-sm text-destructive">{errors.departmentId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamDescription">Description</Label>
                <Textarea
                  id="teamDescription"
                  placeholder="Responsible for UI development..."
                  rows={2}
                  {...register('description')}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTeam.isPending || updateTeam.isPending}
              >
                {(createTeam.isPending || updateTeam.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingTeam ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Team"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}

// ============================================================================
// Cost Centers Section
// ============================================================================

function CostCentersSection() {
  const { data: costCentersResponse, isLoading } = useCostCenters();
  const costCenters = costCentersResponse?.data || [];
  const createCostCenter = useCreateCostCenter();
  const updateCostCenter = useUpdateCostCenter();
  const deleteCostCenter = useDeleteCostCenter();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostCenter | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CostCenterInput>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      isActive: true,
    },
  });

  const openCreateDialog = () => {
    reset({ code: '', name: '', description: '', isActive: true });
    setEditingCostCenter(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (cc: CostCenter) => {
    setEditingCostCenter(cc);
    reset({
      code: cc.code,
      name: cc.name,
      description: cc.description || '',
      budget: cc.budget || undefined,
      budgetYear: cc.budgetYear || undefined,
      parentId: cc.parentId || undefined,
      isActive: cc.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CostCenterInput) => {
    if (editingCostCenter) {
      await updateCostCenter.mutateAsync({ id: editingCostCenter.id, data });
    } else {
      await createCostCenter.mutateAsync(data);
    }
    setIsDialogOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteCostCenter.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasCostCenters = costCenters && costCenters.length > 0;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Cost Center
        </Button>
      </div>

      {/* Table */}
      {hasCostCenters ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Departments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costCenters.map((cc) => (
                <TableRow key={cc.id}>
                  <TableCell className="font-mono text-sm">{cc.code}</TableCell>
                  <TableCell className="font-medium">{cc.name}</TableCell>
                  <TableCell>
                    {cc.budget 
                      ? `₹${cc.budget.toLocaleString()}` 
                      : '—'
                    }
                  </TableCell>
                  <TableCell>{cc._count?.departments || 0}</TableCell>
                  <TableCell>
                    <Badge variant={cc.isActive ? 'default' : 'secondary'}>
                      {cc.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(cc)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(cc)}
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
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No cost centers yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cost centers help track expenses by business unit. This step is optional.
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCostCenter ? 'Edit Cost Center' : 'Create Cost Center'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ccCode">Code *</Label>
                  <Input
                    id="ccCode"
                    placeholder="CC-001"
                    className="uppercase"
                    {...register('code', { required: 'Code is required' })}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ccName">Name *</Label>
                  <Input
                    id="ccName"
                    placeholder="Product Development"
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="budget">Annual Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="1000000"
                    {...register('budget', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetYear">Budget Year</Label>
                  <Input
                    id="budgetYear"
                    type="number"
                    placeholder="2025"
                    {...register('budgetYear', { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ccDescription">Description</Label>
                <Textarea
                  id="ccDescription"
                  placeholder="Tracks all product development expenses..."
                  rows={2}
                  {...register('description')}
                />
              </div>
              {costCenters && costCenters.length > 0 && (
                <div className="space-y-2">
                  <Label>Parent Cost Center</Label>
                  <Select
                    value={watch('parentId') || ''}
                    onValueChange={(value) => setValue('parentId', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (top-level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (top-level)</SelectItem>
                      {costCenters
                        .filter((c) => c.id !== editingCostCenter?.id)
                        .map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCostCenter.isPending || updateCostCenter.isPending}
              >
                {(createCostCenter.isPending || updateCostCenter.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingCostCenter ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Cost Center"
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

interface StructurePhaseProps {
  onPhaseComplete: () => void;
}

export function StructurePhase({ onPhaseComplete }: StructurePhaseProps) {
  const { data: summary } = useStructureSummary();
  const completeStep = useCompleteStep();

  const handleContinue = async () => {
    // Mark structure phase steps as complete
    await completeStep.mutateAsync({ phase: 2, stepCode: 'departments' });
    await completeStep.mutateAsync({ phase: 2, stepCode: 'teams' });
    await completeStep.mutateAsync({ phase: 2, stepCode: 'cost-centers' });
    onPhaseComplete();
  };

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Organization Structure</h2>
          <p className="text-muted-foreground">
            Define your organizational hierarchy - departments, teams, and cost centers.
          </p>
        </div>
        {summary && (
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.departments.total}</div>
              <div className="text-muted-foreground">Departments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.teams.total}</div>
              <div className="text-muted-foreground">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.costCenters.total}</div>
              <div className="text-muted-foreground">Cost Centers</div>
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <CollapsibleSection
          id="structure-departments"
          title="Departments"
          description="Functional units of your organization"
          icon={Building2}
          count={summary?.departments.total}
        >
          <DepartmentsSection />
        </CollapsibleSection>

        <CollapsibleSection
          id="structure-teams"
          title="Teams"
          description="Smaller groups within departments"
          icon={Users}
          count={summary?.teams.total}
        >
          <TeamsSection />
        </CollapsibleSection>

        <CollapsibleSection
          id="structure-cost-centers"
          title="Cost Centers"
          description="Financial tracking units (optional)"
          icon={DollarSign}
          count={summary?.costCenters.total}
        >
          <CostCentersSection />
        </CollapsibleSection>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleContinue}
          disabled={completeStep.isPending}
          size="lg"
        >
          {completeStep.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue to Roles →'
          )}
        </Button>
      </div>
    </div>
  );
}
