import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Search, Shield, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog, Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

import { UserFormModal, type Role, type UserFormData, type UserListItem } from './shared';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState('');
  const [userRoleModalOpen, setUserRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserListItem | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | undefined>();
  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => api.get<Role[]>('/roles'),
  });

  const { data: users = [] } = useQuery<UserListItem[]>({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await api.get<{ data: UserListItem[] }>('/users?includeInactive=true');
      return res.data || [];
    },
  });

  const filteredUsers = users.filter(
    (u) =>
      u.firstName.toLowerCase().includes(userSearch.toLowerCase())
      || u.lastName.toLowerCase().includes(userSearch.toLowerCase())
      || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setUserModalOpen(false);
      setEditingUser(undefined);
      showMessage('success', 'User created successfully!');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create user';
      showMessage('error', message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setUserModalOpen(false);
      setEditingUser(undefined);
      showMessage('success', 'User updated successfully!');
    },
    onError: () => showMessage('error', 'Failed to update user'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setDeletingUser(null);
      showMessage('success', 'User deleted successfully!');
    },
    onError: () => showMessage('error', 'Failed to delete user'),
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/users/${id}/status`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showMessage('success', 'User status updated!');
    },
    onError: () => showMessage('error', 'Failed to update user status'),
  });

  const resetUserPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword: password }: { id: string; newPassword: string }) => api.post(`/users/${id}/reset-password`, { newPassword: password }),
    onSuccess: () => {
      setResetPasswordUser(null);
      setNewPassword('');
      showMessage('success', 'Password reset successfully!');
    },
    onError: () => showMessage('error', 'Failed to reset password'),
  });

  const assignUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => api.post(`/users/${userId}/roles`, { roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showMessage('success', 'Role assigned successfully!');
    },
    onError: () => showMessage('error', 'Failed to assign role'),
  });

  const removeUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => api.delete(`/users/${userId}/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showMessage('success', 'Role removed successfully!');
    },
    onError: () => showMessage('error', 'Failed to remove role'),
  });

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
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
          <Button size="sm" onClick={() => { setEditingUser(undefined); setUserModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No users found</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setEditingUser(undefined); setUserModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add First User
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium">{u.firstName[0]}{u.lastName[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium">{u.firstName} {u.lastName}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      {u.roles && u.roles.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {u.roles.map((r) => (
                            <span key={r.role.id} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{r.role.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleUserStatusMutation.mutate(u.id)}
                      disabled={toggleUserStatusMutation.isPending}
                      className={cn(
                        'text-xs px-3 py-1 rounded cursor-pointer border-0 transition-colors',
                        u.status === 'ACTIVE' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {u.status}
                    </button>
                    <Button variant="ghost" size="sm" title="Manage Roles" onClick={() => { setSelectedUserForRole(u); setUserRoleModalOpen(true); }}>
                      <Shield className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Edit User" onClick={() => { setEditingUser(u); setUserModalOpen(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Reset Password" onClick={() => setResetPasswordUser(u)}>🔐</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" title="Delete User" onClick={() => setDeletingUser(u)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormModal
        isOpen={userModalOpen}
        onClose={() => { setUserModalOpen(false); setEditingUser(undefined); }}
        user={editingUser}
        roles={roles}
        onSave={(data) => {
          if (editingUser) {
            updateUserMutation.mutate({ id: editingUser.id, data });
          } else {
            createUserMutation.mutate(data);
          }
        }}
        isSaving={createUserMutation.isPending || updateUserMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onConfirm={() => {
          if (deletingUser) {
            deleteUserMutation.mutate(deletingUser.id);
          }
        }}
        title="Delete User"
        description={`Are you sure you want to delete "${deletingUser?.firstName} ${deletingUser?.lastName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteUserMutation.isPending}
      />

      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent preventDismiss>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-gray-600">
              Set a new password for <strong>{resetPasswordUser?.firstName} {resetPasswordUser?.lastName}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">New Password *</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setResetPasswordUser(null); setNewPassword(''); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (resetPasswordUser && newPassword.length >= 8) {
                  resetUserPasswordMutation.mutate({ id: resetPasswordUser.id, newPassword });
                }
              }}
              disabled={newPassword.length < 8 || resetUserPasswordMutation.isPending}
            >
              {resetUserPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={userRoleModalOpen} onOpenChange={(open) => !open && setUserRoleModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {selectedUserForRole && (
              <>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-medium">{selectedUserForRole.firstName[0]}{selectedUserForRole.lastName[0]}</span>
                  </div>
                  <div>
                    <p className="font-medium">{selectedUserForRole.firstName} {selectedUserForRole.lastName}</p>
                    <p className="text-sm text-gray-500">{selectedUserForRole.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Assigned Roles</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {roles.map((role) => {
                      const isAssigned = selectedUserForRole.roles?.some((r) => r.role.id === role.id);
                      return (
                        <div key={role.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{role.name}</p>
                            <p className="text-xs text-gray-500">{role.description}</p>
                          </div>
                          <Button
                            variant={isAssigned ? 'destructive' : 'outline'}
                            size="sm"
                            disabled={assignUserRoleMutation.isPending || removeUserRoleMutation.isPending}
                            onClick={() => {
                              if (isAssigned) {
                                removeUserRoleMutation.mutate({ userId: selectedUserForRole.id, roleId: role.id });
                              } else {
                                assignUserRoleMutation.mutate({ userId: selectedUserForRole.id, roleId: role.id });
                              }
                            }}
                          >
                            {isAssigned ? 'Remove' : 'Assign'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserRoleModalOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
