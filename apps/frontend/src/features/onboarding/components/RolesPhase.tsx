/**
 * Phase 3: Business Roles & Grade Bands
 * 
 * Defines organizational roles and compensation structures:
 * - Business Roles (job families, levels)
 * - Grade Bands (compensation levels)
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Briefcase,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  // Award - reserved for future use
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
// cn import removed - not currently used
import {
  useBusinessRoles,
  useCreateBusinessRole,
  useUpdateBusinessRole,
  useDeleteBusinessRole,
  useSeedDefaultBusinessRoles,
  useGradeBands,
  useCreateGradeBand,
  useUpdateGradeBand,
  useDeleteGradeBand,
  useSeedDefaultGradeBands,
  useCompleteStep,
} from '../api';
import { useOnboardingStore } from '../store';
import type { 
  BusinessRole, 
  BusinessRoleInput, 
  GradeBand, 
  GradeBandInput,
  RoleCategory,
  GradeLevel,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const ROLE_CATEGORIES: { value: RoleCategory; label: string; color: string }[] = [
  { value: 'LEADERSHIP', label: 'Leadership', color: 'bg-purple-100 text-purple-800' },
  { value: 'MANAGEMENT', label: 'Management', color: 'bg-blue-100 text-blue-800' },
  { value: 'DELIVERY', label: 'Delivery', color: 'bg-green-100 text-green-800' },
  { value: 'INDIVIDUAL', label: 'Individual Contributor', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'SUPPORT', label: 'Support', color: 'bg-gray-100 text-gray-800' },
  { value: 'CONTRACTOR', label: 'Contractor', color: 'bg-orange-100 text-orange-800' },
];

const GRADE_LEVELS: { value: GradeLevel; label: string }[] = [
  { value: 'L1', label: 'L1 - Entry' },
  { value: 'L2', label: 'L2 - Associate' },
  { value: 'L3', label: 'L3 - Mid-Level' },
  { value: 'L4', label: 'L4 - Senior' },
  { value: 'L5', label: 'L5 - Staff' },
  { value: 'L6', label: 'L6 - Principal' },
  { value: 'L7', label: 'L7 - Director' },
  { value: 'L8', label: 'L8 - Senior Director' },
  { value: 'L9', label: 'L9 - VP' },
  { value: 'L10', label: 'L10 - Executive' },
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

function getCategoryBadge(category: RoleCategory) {
  const config = ROLE_CATEGORIES.find(c => c.value === category);
  if (!config) return <Badge>{category}</Badge>;
  return <Badge className={config.color}>{config.label}</Badge>;
}

// ============================================================================
// Business Roles Section
// ============================================================================

function BusinessRolesSection() {
  const { data: rolesResponse, isLoading } = useBusinessRoles();
  const roles = rolesResponse?.data || [];
  const createRole = useCreateBusinessRole();
  const updateRole = useUpdateBusinessRole();
  const deleteRole = useDeleteBusinessRole();
  const seedDefaults = useSeedDefaultBusinessRoles();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<BusinessRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessRole | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BusinessRoleInput>({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      category: 'INDIVIDUAL',
      level: 3,
      skills: [],
      responsibilities: [],
      isActive: true,
    },
  });

  const openCreateDialog = () => {
    reset({ 
      name: '', 
      code: '', 
      description: '', 
      category: 'INDIVIDUAL', 
      level: 3,
      skills: [],
      responsibilities: [],
      isActive: true 
    });
    setEditingRole(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (role: BusinessRole) => {
    setEditingRole(role);
    reset({
      name: role.name,
      code: role.code,
      description: role.description || '',
      category: role.category,
      level: role.level,
      skills: role.skills || [],
      responsibilities: role.responsibilities || [],
      isActive: role.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: BusinessRoleInput) => {
    if (editingRole) {
      await updateRole.mutateAsync({ id: editingRole.id, data });
    } else {
      await createRole.mutateAsync(data);
    }
    setIsDialogOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteRole.mutateAsync(deleteTarget.id);
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

  const hasRoles = roles && roles.length > 0;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
          {!hasRoles && (
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
      {hasRoles ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-mono text-sm">{role.code}</TableCell>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{getCategoryBadge(role.category)}</TableCell>
                  <TableCell>{role.level}</TableCell>
                  <TableCell>{role._count?.resourceRoles || 0}</TableCell>
                  <TableCell>
                    <Badge variant={role.isActive ? 'default' : 'secondary'}>
                      {role.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(role)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(role)}
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
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No business roles yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Define roles like &quot;Software Engineer&quot;, &quot;Project Manager&quot;, etc.
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Business Role' : 'Create Business Role'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="roleName">Name *</Label>
                  <Input
                    id="roleName"
                    placeholder="Software Engineer"
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleCode">Code *</Label>
                  <Input
                    id="roleCode"
                    placeholder="SWE"
                    className="uppercase"
                    {...register('code', { required: 'Code is required' })}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={watch('category')}
                    onValueChange={(value) => setValue('category', value as RoleCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleLevel">Level (1-10)</Label>
                  <Input
                    id="roleLevel"
                    type="number"
                    min={1}
                    max={10}
                    {...register('level', { 
                      valueAsNumber: true,
                      min: { value: 1, message: 'Min level is 1' },
                      max: { value: 10, message: 'Max level is 10' },
                    })}
                  />
                  {errors.level && (
                    <p className="text-sm text-destructive">{errors.level.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  placeholder="Designs, develops, and maintains software applications..."
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
                disabled={createRole.isPending || updateRole.isPending}
              >
                {(createRole.isPending || updateRole.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingRole ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Business Role"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}

// ============================================================================
// Grade Bands Section
// ============================================================================

function GradeBandsSection() {
  const { data: gradeBandsResponse, isLoading } = useGradeBands();
  const gradeBands = gradeBandsResponse?.data || [];
  const createGradeBand = useCreateGradeBand();
  const updateGradeBand = useUpdateGradeBand();
  const deleteGradeBand = useDeleteGradeBand();
  const seedDefaults = useSeedDefaultGradeBands();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<GradeBand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradeBand | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<GradeBandInput>({
    defaultValues: {
      name: '',
      code: '',
      level: 'L3',
      description: '',
      currency: 'INR',
      isActive: true,
    },
  });

  const openCreateDialog = () => {
    reset({ 
      name: '', 
      code: '', 
      level: 'L3', 
      description: '', 
      currency: 'INR',
      isActive: true 
    });
    setEditingBand(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (band: GradeBand) => {
    setEditingBand(band);
    reset({
      name: band.name,
      code: band.code,
      level: band.level,
      description: band.description || '',
      minSalary: band.minSalary || undefined,
      maxSalary: band.maxSalary || undefined,
      currency: band.currency || 'INR',
      isActive: band.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: GradeBandInput) => {
    if (editingBand) {
      await updateGradeBand.mutateAsync({ id: editingBand.id, data });
    } else {
      await createGradeBand.mutateAsync(data);
    }
    setIsDialogOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteGradeBand.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleSeedDefaults = async () => {
    await seedDefaults.mutateAsync();
  };

  const formatSalary = (amount: number | null, currency: string | null) => {
    if (!amount) return '—';
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${symbol}${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasBands = gradeBands && gradeBands.length > 0;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Grade Band
          </Button>
          {!hasBands && (
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
      {hasBands ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Salary Range</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradeBands.map((band) => (
                <TableRow key={band.id}>
                  <TableCell className="font-mono text-sm">{band.code}</TableCell>
                  <TableCell className="font-medium">{band.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{band.level}</Badge>
                  </TableCell>
                  <TableCell>
                    {band.minSalary || band.maxSalary ? (
                      <span className="text-sm">
                        {formatSalary(band.minSalary, band.currency)} - {formatSalary(band.maxSalary, band.currency)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{band._count?.resources || 0}</TableCell>
                  <TableCell>
                    <Badge variant={band.isActive ? 'default' : 'secondary'}>
                      {band.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(band)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(band)}
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
          <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No grade bands yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Grade bands define compensation levels in your organization.
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBand ? 'Edit Grade Band' : 'Create Grade Band'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bandName">Name *</Label>
                  <Input
                    id="bandName"
                    placeholder="Senior Engineer"
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bandCode">Code *</Label>
                  <Input
                    id="bandCode"
                    placeholder="L4"
                    className="uppercase"
                    {...register('code', { required: 'Code is required' })}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Grade Level *</Label>
                <Select
                  value={watch('level')}
                  onValueChange={(value) => setValue('level', value as GradeLevel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="minSalary">Min Salary</Label>
                  <Input
                    id="minSalary"
                    type="number"
                    placeholder="800000"
                    {...register('minSalary', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSalary">Max Salary</Label>
                  <Input
                    id="maxSalary"
                    type="number"
                    placeholder="1500000"
                    {...register('maxSalary', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={watch('currency') || 'INR'}
                    onValueChange={(value) => setValue('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bandDescription">Description</Label>
                <Textarea
                  id="bandDescription"
                  placeholder="4+ years experience, technical leadership..."
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
                disabled={createGradeBand.isPending || updateGradeBand.isPending}
              >
                {(createGradeBand.isPending || updateGradeBand.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingBand ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Grade Band"
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

interface RolesPhaseProps {
  onPhaseComplete: () => void;
}

export function RolesPhase({ onPhaseComplete }: RolesPhaseProps) {
  const { data: roles } = useBusinessRoles();
  const { data: gradeBands } = useGradeBands();
  const completeStep = useCompleteStep();

  const handleContinue = async () => {
    await completeStep.mutateAsync({ phase: 3, stepCode: 'business-roles' });
    await completeStep.mutateAsync({ phase: 3, stepCode: 'grade-bands' });
    onPhaseComplete();
  };

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Business Roles & Grade Bands</h2>
          <p className="text-muted-foreground">
            Define job roles and compensation levels for your organization.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold">{roles?.length || 0}</div>
            <div className="text-muted-foreground">Roles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{gradeBands?.length || 0}</div>
            <div className="text-muted-foreground">Grade Bands</div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <CollapsibleSection
          id="roles-business"
          title="Business Roles"
          description="Job families and positions in your organization"
          icon={Briefcase}
          count={roles?.length}
        >
          <BusinessRolesSection />
        </CollapsibleSection>

        <CollapsibleSection
          id="roles-grade-bands"
          title="Grade Bands"
          description="Compensation levels and career ladder"
          icon={TrendingUp}
          count={gradeBands?.length}
        >
          <GradeBandsSection />
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
            'Continue to People →'
          )}
        </Button>
      </div>
    </div>
  );
}
