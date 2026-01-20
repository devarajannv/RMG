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
import { Search, Briefcase } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FunctionAssignment, DelegateInput } from '@/types/functions';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

interface DelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: FunctionAssignment;
  onDelegate: (data: DelegateInput) => Promise<void>;
  isLoading: boolean;
}

export default function DelegationModal({
  isOpen,
  onClose,
  assignment,
  onDelegate,
  isLoading,
}: DelegationModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [effectiveTo, setEffectiveTo] = useState('');
  const [reason, setReason] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch users
  const { data: usersResponse, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-for-delegation'],
    queryFn: () => api.get<{ data: User[] }>('/users'),
    enabled: isOpen,
  });

  const users = usersResponse?.data || [];

  // Filter out self and search
  const availableUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.status === 'ACTIVE' &&
          user.id !== assignment.userId &&
          (userSearch === '' ||
            user.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
            user.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
            user.email.toLowerCase().includes(userSearch.toLowerCase()))
      ),
    [users, assignment.userId, userSearch]
  );

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId('');
      setEffectiveFrom(new Date().toISOString().split('T')[0]);
      setEffectiveTo('');
      setReason('');
      setUserSearch('');
      setErrors({});
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedUserId) {
      newErrors.userId = 'Please select a user to delegate to';
    }

    if (!effectiveFrom) {
      newErrors.effectiveFrom = 'Start date is required';
    }

    if (!effectiveTo) {
      newErrors.effectiveTo = 'End date is required for delegations';
    }

    if (effectiveTo && new Date(effectiveTo) <= new Date(effectiveFrom)) {
      newErrors.effectiveTo = 'End date must be after start date';
    }

    // Check if delegation end is after assignment end
    if (
      assignment.effectiveTo &&
      effectiveTo &&
      new Date(effectiveTo) > new Date(assignment.effectiveTo)
    ) {
      newErrors.effectiveTo = 'Delegation cannot extend beyond your assignment end date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const delegateData: DelegateInput = {
      delegateToUserId: selectedUserId,
      effectiveFrom: new Date(effectiveFrom).toISOString(),
      effectiveTo: new Date(effectiveTo).toISOString(),
      reason: reason || undefined,
    };

    await onDelegate(delegateData);
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Delegate Function</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              {/* Function Info */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{assignment.function?.name}</p>
                  <p className="text-xs text-gray-500">{assignment.function?.code}</p>
                </div>
              </div>

              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delegate To *
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
                  className={`border rounded-lg max-h-40 overflow-y-auto ${
                    errors.userId ? 'border-red-500' : ''
                  }`}
                >
                  {loadingUsers ? (
                    <p className="p-3 text-sm text-gray-500">Loading users...</p>
                  ) : availableUsers.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500 italic">
                      {userSearch ? 'No users match your search' : 'No users available'}
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
                          name="delegateUserId"
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
                    <strong>Delegating to:</strong> {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                </div>
              )}

              {/* Delegation Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From *
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
                    To *
                  </label>
                  <Input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                    min={effectiveFrom}
                    max={
                      assignment.effectiveTo
                        ? new Date(assignment.effectiveTo).toISOString().split('T')[0]
                        : undefined
                    }
                    className={errors.effectiveTo ? 'border-red-500' : ''}
                  />
                  {errors.effectiveTo && (
                    <p className="text-sm text-red-500 mt-1">{errors.effectiveTo}</p>
                  )}
                </div>
              </div>

              {/* Reason (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., On vacation, covering for absence..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> The delegated user will be able to approve requests
                  on your behalf for this function during the specified period.
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Delegating...' : 'Delegate Function'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
