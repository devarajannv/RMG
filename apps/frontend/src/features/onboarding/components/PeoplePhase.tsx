/**
 * Phase 4: People Setup
 * 
 * Manage the organization's workforce:
 * - Resources (employees)
 * - User accounts
 * - Invitations
 * - Bulk import/export
 */

import { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Users,
  // UserPlus - reserved for future use
  Mail,
  Upload,
  Download,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  MoreVertical,
  Key,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import {
  useResources,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  useCreateUserForResource,
  useDepartments,
  useTeams,
  useGradeBands,
  useInvitations,
  useSendInvitation,
  useRevokeInvitation,
  useResendInvitation,
  usePeopleStats,
  useValidateImport,
  useImportResources,
  useCompleteStep,
} from '../api';
import { useOnboardingStore } from '../store';
import type { 
  Resource, 
  ResourceInput, 
  UserInvitation,
  InvitationInput,
  ResourceStatus,
  ImportResourceRow,
  Department,
  Team,
  GradeBand,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const RESOURCE_STATUSES: { value: ResourceStatus; label: string; color: string }[] = [
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'INACTIVE', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  { value: 'ON_LEAVE', label: 'On Leave', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'TERMINATED', label: 'Terminated', color: 'bg-red-100 text-red-800' },
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

function getStatusBadge(status: ResourceStatus) {
  const config = RESOURCE_STATUSES.find(s => s.value === status);
  if (!config) return <Badge>{status}</Badge>;
  return <Badge className={config.color}>{config.label}</Badge>;
}

// ============================================================================
// Resources Section
// ============================================================================

function ResourcesSection() {
  const { data: resources = [], isLoading } = useResources();
  const { data: departments = [] } = useDepartments();
  const { data: teams = [] } = useTeams();
  const { data: gradeBands = [] } = useGradeBands();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();
  const createUser = useCreateUserForResource();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createUserTarget, setCreateUserTarget] = useState<Resource | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ResourceInput>({
    defaultValues: {
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      title: '',
      status: 'ACTIVE',
    },
  });

  const filteredResources = useMemo(() => {
    if (!resources) return [];
    if (!searchQuery) return resources;
    const query = searchQuery.toLowerCase();
    return resources.filter((r: Resource) => 
      r.firstName.toLowerCase().includes(query) ||
      r.lastName.toLowerCase().includes(query) ||
      r.email.toLowerCase().includes(query) ||
      r.employeeId.toLowerCase().includes(query)
    );
  }, [resources, searchQuery]);

  const selectedDepartmentId = watch('departmentId');
  const filteredTeams = useMemo(() => {
    if (!teams || !selectedDepartmentId) return [];
    return teams.filter((t: Team) => t.departmentId === selectedDepartmentId);
  }, [teams, selectedDepartmentId]);

  const openCreateDialog = () => {
    reset({ 
      employeeId: '', 
      firstName: '', 
      lastName: '', 
      email: '',
      phone: '',
      title: '',
      status: 'ACTIVE',
    });
    setEditingResource(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource);
    reset({
      employeeId: resource.employeeId,
      firstName: resource.firstName,
      lastName: resource.lastName,
      email: resource.email,
      phone: resource.phone || '',
      title: resource.title || '',
      departmentId: resource.departmentId || undefined,
      teamId: resource.teamId || undefined,
      gradeBandId: resource.gradeBandId || undefined,
      hireDate: resource.hireDate?.split('T')[0] || undefined,
      status: resource.status,
      location: resource.location || undefined,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ResourceInput) => {
    if (editingResource) {
      await updateResource.mutateAsync({ id: editingResource.id, data });
    } else {
      await createResource.mutateAsync(data);
    }
    setIsDialogOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteResource.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleCreateUser = async () => {
    if (createUserTarget) {
      await createUser.mutateAsync({ resourceId: createUserTarget.id });
      setCreateUserTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasResources = resources && resources.length > 0;

  return (
    <div className="space-y-4">
      {/* Actions & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Resource
        </Button>
      </div>

      {/* Table */}
      {hasResources ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-mono text-sm">{resource.employeeId}</TableCell>
                  <TableCell className="font-medium">
                    {resource.firstName} {resource.lastName}
                  </TableCell>
                  <TableCell>{resource.email}</TableCell>
                  <TableCell>{resource.department?.name || '—'}</TableCell>
                  <TableCell>{getStatusBadge(resource.status)}</TableCell>
                  <TableCell>
                    {resource.user && resource.user.length > 0 ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">No account</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(resource)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {(!resource.user || resource.user.length === 0) && (
                          <DropdownMenuItem onClick={() => setCreateUserTarget(resource)}>
                            <Key className="mr-2 h-4 w-4" />
                            Create Account
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteTarget(resource)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No resources yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your team members manually or import from a spreadsheet.
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" preventDismiss>
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Edit Resource' : 'Create Resource'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input
                    id="employeeId"
                    placeholder="EMP001"
                    {...register('employeeId', { required: 'Employee ID is required' })}
                  />
                  {errors.employeeId && (
                    <p className="text-sm text-destructive">{errors.employeeId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register('firstName', { required: 'First name is required' })}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...register('lastName', { required: 'Last name is required' })}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    {...register('phone')}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    placeholder="Senior Software Engineer"
                    {...register('title')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={watch('status') || 'ACTIVE'}
                    onValueChange={(value) => setValue('status', value as ResourceStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={watch('departmentId') || ''}
                    onValueChange={(value) => {
                      setValue('departmentId', value || undefined);
                      setValue('teamId', undefined); // Reset team when department changes
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {departments?.map((dept: Department) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Team</Label>
                  {selectedDepartmentId ? (
                    <Select
                      value={watch('teamId') || ''}
                      onValueChange={(value) => setValue('teamId', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {filteredTeams.map((team: Team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center justify-between w-full px-3 py-2 text-left bg-gray-50 border rounded-lg text-gray-500 cursor-not-allowed">
                      <span>Select department first</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Grade Band</Label>
                  <Select
                    value={watch('gradeBandId') || ''}
                    onValueChange={(value) => setValue('gradeBandId', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {gradeBands?.map((band: GradeBand) => (
                        <SelectItem key={band.id} value={band.id}>
                          {band.name} ({band.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    {...register('hireDate')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="Bangalore, India"
                    {...register('location')}
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createResource.isPending || updateResource.isPending}
              >
                {(createResource.isPending || updateResource.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingResource ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Resource"
        description={`Are you sure you want to delete "${deleteTarget?.firstName} ${deleteTarget?.lastName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="danger"
      />

      {/* Create User Account Confirmation */}
      <ConfirmDialog
        open={!!createUserTarget}
        onOpenChange={() => setCreateUserTarget(null)}
        title="Create User Account"
        description={`Create a login account for ${createUserTarget?.firstName} ${createUserTarget?.lastName} (${createUserTarget?.email})? A temporary password will be generated.`}
        confirmLabel="Create Account"
        onConfirm={handleCreateUser}
      />
    </div>
  );
}

// ============================================================================
// Invitations Section
// ============================================================================

function InvitationsSection() {
  const { data: invitations = [], isLoading } = useInvitations();
  const { data: resources = [] } = useResources();
  const sendInvitation = useSendInvitation();
  const revokeInvitation = useRevokeInvitation();
  const resendInvitation = useResendInvitation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<UserInvitation | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<InvitationInput>({
    defaultValues: {
      email: '',
    },
  });

  const resourcesWithoutAccounts = useMemo(() => {
    if (!resources) return [];
    return resources.filter((r: Resource) => !r.user || r.user.length === 0);
  }, [resources]);

  // Track resourceId for potential validation - underscore prefix avoids linter warning
  watch('resourceId');

  const openDialog = () => {
    reset({ email: '' });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: InvitationInput) => {
    await sendInvitation.mutateAsync(data);
    setIsDialogOpen(false);
    reset();
  };

  const handleRevoke = async () => {
    if (revokeTarget) {
      await revokeInvitation.mutateAsync(revokeTarget.id);
      setRevokeTarget(null);
    }
  };

  const handleResend = async (invitation: UserInvitation) => {
    await resendInvitation.mutateAsync(invitation.id);
  };

  const getInvitationStatusBadge = (invitation: UserInvitation) => {
    switch (invitation.status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case 'ACCEPTED':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Accepted
          </Badge>
        );
      case 'EXPIRED':
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      case 'REVOKED':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Revoked
          </Badge>
        );
      default:
        return <Badge>{invitation.status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasInvitations = invitations && invitations.length > 0;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-end">
        <Button onClick={openDialog} size="sm">
          <Send className="mr-2 h-4 w-4" />
          Send Invitation
        </Button>
      </div>

      {/* Table */}
      {hasInvitations ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation: UserInvitation) => (
                <TableRow key={invitation.id}>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell>
                    {invitation.resource 
                      ? `${invitation.resource.firstName} ${invitation.resource.lastName}`
                      : '—'
                    }
                  </TableCell>
                  <TableCell>{getInvitationStatusBadge(invitation)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invitation.expiresAt)}
                  </TableCell>
                  <TableCell>
                    {invitation.status === 'PENDING' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResend(invitation)}>
                            <Send className="mr-2 h-4 w-4" />
                            Resend
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setRevokeTarget(invitation)}
                            className="text-destructive"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No invitations sent</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Send email invitations to let team members create their accounts.
          </p>
        </div>
      )}

      {/* Send Invitation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent preventDismiss>
          <DialogHeader>
            <DialogTitle>Send Invitation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email Address *</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="colleague@example.com"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {resourcesWithoutAccounts.length > 0 && (
                <div className="space-y-2">
                  <Label>Link to Resource (Optional)</Label>
                  <Select
                    value={watch('resourceId') || ''}
                    onValueChange={(value) => setValue('resourceId', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {resourcesWithoutAccounts.map((resource: Resource) => (
                        <SelectItem key={resource.id} value={resource.id}>
                          {resource.firstName} {resource.lastName} ({resource.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this invitation to an existing resource record.
                  </p>
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendInvitation.isPending}>
                {sendInvitation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={() => setRevokeTarget(null)}
        title="Revoke Invitation"
        description={`Are you sure you want to revoke the invitation for ${revokeTarget?.email}?`}
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
        variant="danger"
      />
    </div>
  );
}

// ============================================================================
// Import Section
// ============================================================================

function ImportSection() {
  const validateImport = useValidateImport();
  const importResources = useImportResources();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvData, setCsvData] = useState<ImportResourceRow[]>([]);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    rowCount: number;
    errors: Array<{ row: number; field: string; message: string }>;
    warnings: Array<{ row: number; field: string; message: string }>;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      setCsvData(rows);
      
      // Validate
      const result = await validateImport.mutateAsync(rows);
      setValidationResult(result);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string): ImportResourceRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: ImportResourceRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push({
        employeeId: row['employeeid'] || row['employee_id'] || '',
        firstName: row['firstname'] || row['first_name'] || '',
        lastName: row['lastname'] || row['last_name'] || '',
        email: row['email'] || '',
        phone: row['phone'] || undefined,
        title: row['title'] || row['jobtitle'] || undefined,
        departmentCode: row['departmentcode'] || row['department'] || undefined,
        teamCode: row['teamcode'] || row['team'] || undefined,
        gradeBandCode: row['gradeband'] || row['grade'] || undefined,
        hireDate: row['hiredate'] || row['hire_date'] || undefined,
        location: row['location'] || undefined,
      });
    }

    return rows;
  };

  const handleImport = async () => {
    if (csvData.length === 0) return;
    setIsImporting(true);
    try {
      await importResources.mutateAsync(csvData);
      setCsvData([]);
      setValidationResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = 'employeeId,firstName,lastName,email,phone,title,departmentCode,teamCode,gradeBandCode,hireDate,location\nEMP001,John,Doe,john.doe@example.com,+91 98765 43210,Software Engineer,ENGR,FE,L4,2024-01-15,Bangalore';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resources_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Template Download */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
        <div>
          <h4 className="font-medium">CSV Template</h4>
          <p className="text-sm text-muted-foreground">
            Download our template to ensure correct formatting
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="csvFile">Upload CSV File</Label>
        <div className="flex items-center gap-4">
          <Input
            ref={fileInputRef}
            id="csvFile"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="flex-1"
          />
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="space-y-4">
          <div className={cn(
            'rounded-lg border p-4',
            validationResult.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          )}>
            <div className="flex items-center gap-2">
              {validationResult.valid ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {validationResult.valid 
                  ? `${validationResult.rowCount} rows ready to import`
                  : `${validationResult.errors.length} errors found`
                }
              </span>
            </div>
          </div>

          {validationResult.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 p-4">
              <h4 className="font-medium text-red-800 mb-2">Errors</h4>
              <ul className="space-y-1 text-sm text-red-700">
                {validationResult.errors.slice(0, 10).map((error, i) => (
                  <li key={i}>
                    Row {error.row}: {error.field} - {error.message}
                  </li>
                ))}
                {validationResult.errors.length > 10 && (
                  <li className="text-muted-foreground">
                    ...and {validationResult.errors.length - 10} more errors
                  </li>
                )}
              </ul>
            </div>
          )}

          {validationResult.valid && (
            <Button 
              onClick={handleImport} 
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import {validationResult.rowCount} Resources
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface PeoplePhaseProps {
  onPhaseComplete: () => void;
}

export function PeoplePhase({ onPhaseComplete }: PeoplePhaseProps) {
  const { data: stats } = usePeopleStats();
  const { data: resources } = useResources();
  const { data: invitations } = useInvitations();
  const completeStep = useCompleteStep();

  const pendingInvitations = invitations?.filter((i: UserInvitation) => i.status === 'PENDING').length || 0;

  const handleContinue = async () => {
    await completeStep.mutateAsync({ phase: 4, stepCode: 'resources' });
    await completeStep.mutateAsync({ phase: 4, stepCode: 'user-accounts' });
    await completeStep.mutateAsync({ phase: 4, stepCode: 'invitations' });
    onPhaseComplete();
  };

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">People Setup</h2>
          <p className="text-muted-foreground">
            Add your team members and set up user accounts.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats?.totalResources || resources?.length || 0}</div>
            <div className="text-muted-foreground">Resources</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats?.resourcesWithAccounts || 0}</div>
            <div className="text-muted-foreground">With Accounts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{pendingInvitations}</div>
            <div className="text-muted-foreground">Pending Invites</div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <CollapsibleSection
          id="people-resources"
          title="Resources"
          description="Your organization's workforce"
          icon={Users}
          count={resources?.length}
        >
          <ResourcesSection />
        </CollapsibleSection>

        <CollapsibleSection
          id="people-invitations"
          title="Invitations"
          description="Email invitations for account creation"
          icon={Mail}
          count={pendingInvitations}
        >
          <InvitationsSection />
        </CollapsibleSection>

        <CollapsibleSection
          id="people-import"
          title="Bulk Import"
          description="Import resources from CSV file"
          icon={FileSpreadsheet}
        >
          <ImportSection />
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
            'Continue to Governance →'
          )}
        </Button>
      </div>
    </div>
  );
}
