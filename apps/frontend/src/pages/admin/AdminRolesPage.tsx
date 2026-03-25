import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BriefcaseBusiness, Edit2, Plus, Shield, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

import { RoleFormModal, type Role, type RoleCatalog, type RoleFormData } from './shared';

export default function AdminRolesPage() {
  const queryClient = useQueryClient();
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => api.get<Role[]>('/roles'),
  });

  const { data: roleCatalog } = useQuery<RoleCatalog>({
    queryKey: ['roles', 'catalog'],
    queryFn: () => api.get<RoleCatalog>('/roles/catalog'),
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData) => api.post('/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setRoleModalOpen(false);
      setEditingRole(undefined);
      showMessage('success', 'Role created successfully!');
    },
    onError: () => showMessage('error', 'Failed to create role'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoleFormData }) => api.put(`/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setRoleModalOpen(false);
      setEditingRole(undefined);
      showMessage('success', 'Role updated successfully!');
    },
    onError: () => showMessage('error', 'Failed to update role'),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeletingRole(null);
      showMessage('success', 'Role deleted successfully!');
    },
    onError: () => showMessage('error', 'Failed to delete role'),
  });

  const provisionPmoRoleMutation = useMutation({
    mutationFn: async () => api.post<Role>('/roles/system/provision', { presetCode: 'PMO' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showMessage('success', 'PMO baseline role provisioned successfully!');
    },
    onError: () => showMessage('error', 'Failed to provision PMO baseline role'),
  });

  const pmoPreset = roleCatalog?.presets.find((preset) => preset.code === 'PMO');
  const hasProvisionedPmoRole = Boolean(
    pmoPreset && roles.some((role) => role.isSystem && role.name === pmoPreset.name)
  );

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div
          className={cn(
            'p-3 rounded-lg border',
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          )}
        >
          {saveMessage.text}
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Role Management
          </CardTitle>
          <div className="flex items-center gap-2">
            {pmoPreset && (
              <Button
                size="sm"
                variant="outline"
                disabled={hasProvisionedPmoRole || provisionPmoRoleMutation.isPending}
                onClick={() => provisionPmoRoleMutation.mutate()}
              >
                <BriefcaseBusiness className="mr-2 h-4 w-4" />
                {hasProvisionedPmoRole ? 'PMO Baseline Provisioned' : provisionPmoRoleMutation.isPending ? 'Provisioning PMO...' : 'Provision PMO Baseline'}
              </Button>
            )}
            <Button size="sm" onClick={() => { setEditingRole(undefined); setRoleModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pmoPreset && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{pmoPreset.name} baseline</p>
                  <p className="mt-1 text-sm text-slate-600">{pmoPreset.description}</p>
                  <p className="mt-2 text-xs text-slate-500">{pmoPreset.permissionKeys.length} canonical permissions in the baseline.</p>
                </div>
                <span className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  hasProvisionedPmoRole ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {hasProvisionedPmoRole ? 'Provisioned' : 'Not provisioned'}
                </span>
              </div>
            </div>
          )}

          {roles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No roles configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className={cn('flex items-center justify-between p-4 rounded-lg', role.isSystem ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50')}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{role.name}</p>
                      {role.isSystem && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">System</span>}
                    </div>
                    <p className="text-sm text-gray-500">{role.description || 'No description'}</p>
                    <p className="text-xs text-gray-400 mt-1">{role.permissions?.length || 0} permissions • {role._count?.users || 0} users</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingRole(role); setRoleModalOpen(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {!role.isSystem && (
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeletingRole(role)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Permission Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {roleCatalog ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roleCatalog.sections.map((section) => {
                const sectionPermissionCount = section.groups.reduce((total, group) => total + group.permissions.length, 0);
                return (
                  <div key={section.key} className="rounded-lg border bg-gray-50 p-4">
                    <p className="font-medium text-sm text-slate-900">{section.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                    <p className="mt-2 text-xs text-slate-400">{sectionPermissionCount} permissions</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading permission catalog...</p>
          )}
        </CardContent>
      </Card>

      <RoleFormModal
        isOpen={roleModalOpen}
        onClose={() => { setRoleModalOpen(false); setEditingRole(undefined); }}
        role={editingRole}
        catalog={roleCatalog}
        onSave={(data) => {
          if (editingRole) {
            updateRoleMutation.mutate({ id: editingRole.id, data });
          } else {
            createRoleMutation.mutate(data);
          }
        }}
        isSaving={createRoleMutation.isPending || updateRoleMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingRole}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        onConfirm={() => {
          if (deletingRole) {
            deleteRoleMutation.mutate(deletingRole.id);
          }
        }}
        title="Delete Role"
        description={`Are you sure you want to delete the "${deletingRole?.name}" role? Users with this role will need to be reassigned.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteRoleMutation.isPending}
      />
    </div>
  );
}
