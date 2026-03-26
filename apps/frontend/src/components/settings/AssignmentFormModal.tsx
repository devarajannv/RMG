import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCreateAssignment, useFunctionHolders } from '@/hooks/useFunctions';
import type { ApprovalFunction, CreateAssignmentInput } from '@/types/functions';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

interface AssignmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  func: ApprovalFunction;
}

export default function AssignmentFormModal({
  isOpen,
  onClose,
  func,
}: AssignmentFormModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [effectiveTo, setEffectiveTo] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createAssignment = useCreateAssignment();
  const { data: currentHolders = [] } = useFunctionHolders(func.id);

  // Fetch users
  const { data: usersResponse, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: () => api.get<{ data: User[] }>('/users'),
    enabled: isOpen,
  });

  const users = usersResponse?.data || [];

  // Filter out already assigned users
  const currentHolderIds = useMemo(
    () => new Set(currentHolders.map((h) => h.userId)),
    [currentHolders]
  );

  const availableUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.status === 'ACTIVE' &&
          !currentHolderIds.has(user.id) &&
          (userSearch === '' ||
            user.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
            user.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
            user.email.toLowerCase().includes(userSearch.toLowerCase()))
      ),
    [users, currentHolderIds, userSearch]
  );

  const isSaving = createAssignment.isPending;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId('');
      setEffectiveFrom(new Date().toISOString().split('T')[0]);
      setEffectiveTo('');
      setUserSearch('');
      setErrors({});
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedUserId) {
      newErrors.userId = 'Please select a user';
    }

    if (!effectiveFrom) {
      newErrors.effectiveFrom = 'Start date is required';
    }

    if (effectiveTo && new Date(effectiveTo) <= new Date(effectiveFrom)) {
      newErrors.effectiveTo = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const assignmentData: CreateAssignmentInput = {
        functionId: func.id,
        userId: selectedUserId,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        effectiveTo: effectiveTo
          ? new Date(effectiveTo).toISOString()
          : undefined,
      };

      await createAssignment.mutateAsync(assignmentData);
      onClose();
    } catch (error) {
      console.error('Failed to create assignment:', error);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" preventDismiss>
        <DialogHeader>
          <DialogTitle>Assign User to Function</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              {/* Function Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Function</p>
                <p className="font-medium text-gray-900">{func.name}</p>
                <p className="text-xs text-gray-500">{func.code}</p>
              </div>

              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select User *
                </label>

                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users..."
                    className="pl-9"
                  />
                </div>

                {/* User List */}
                <div
                  className={`border rounded-lg max-h-48 overflow-y-auto ${
                    errors.userId ? 'border-red-500' : ''
                  }`}
                >
                  {loadingUsers ? (
                    <p className="p-3 text-sm text-gray-500">Loading users...</p>
                  ) : availableUsers.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500 italic">
                      {userSearch
                        ? 'No users match your search'
                        : 'All active users are already assigned'}
                    </p>
                  ) : (
                    availableUsers.map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                          selectedUserId === user.id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="userId"
                          value={user.id}
                          checked={selectedUserId === user.id}
                          onChange={() => {
                            setSelectedUserId(user.id);
                            if (errors.userId) {
                              setErrors((prev) => ({ ...prev, userId: '' }));
                            }
                          }}
                          className="text-primary"
                        />
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {errors.userId && (
                  <p className="text-sm text-red-500 mt-1">{errors.userId}</p>
                )}
              </div>

              {/* Selected User Display */}
              {selectedUser && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Selected:</strong> {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})
                  </p>
                </div>
              )}

              {/* Effective Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective From *
                  </label>
                  <Input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className={errors.effectiveFrom ? 'border-red-500' : ''}
                  />
                  {errors.effectiveFrom && (
                    <p className="text-sm text-red-500 mt-1">{errors.effectiveFrom}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective To
                  </label>
                  <Input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                    min={effectiveFrom}
                    className={errors.effectiveTo ? 'border-red-500' : ''}
                  />
                  {errors.effectiveTo && (
                    <p className="text-sm text-red-500 mt-1">{errors.effectiveTo}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for permanent assignment
                  </p>
                </div>
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The user will be able to approve requests
                  requiring this function during the effective period.
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Assigning...' : 'Assign User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
