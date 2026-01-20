/**
 * Request Type Form Modal
 *
 * Modal for creating and editing request types.
 *
 * Created: January 20, 2026
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateRequestType, useUpdateRequestType } from '@/hooks/useRequestTypes';
import type {
  RequestType,
  RequestCategory,
  Priority,
  SlaCalculationType,
  RequestVisibility,
  RollbackPermission,
  CreateRequestTypeInput,
} from '@/types/request-types';

// =============================================================================
// Constants
// =============================================================================

const CATEGORIES: { value: RequestCategory; label: string }[] = [
  { value: 'CHANGE', label: 'Change Request' },
  { value: 'INCIDENT', label: 'Incident' },
  { value: 'SERVICE_REQUEST', label: 'Service Request' },
  { value: 'PROBLEM', label: 'Problem' },
  { value: 'ACCESS_REQUEST', label: 'Access Request' },
  { value: 'PROJECT_REQUEST', label: 'Project Request' },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const SLA_TYPES: { value: SlaCalculationType; label: string }[] = [
  { value: 'BUSINESS_HOURS', label: 'Business Hours' },
  { value: 'CALENDAR_HOURS', label: 'Calendar Hours' },
];

const VISIBILITY_OPTIONS: { value: RequestVisibility; label: string }[] = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'PRIVATE', label: 'Private' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
];

const ROLLBACK_OPTIONS: { value: RollbackPermission; label: string }[] = [
  { value: 'REQUESTER', label: 'Requester' },
  { value: 'APPROVER', label: 'Approver' },
  { value: 'ADMIN_ONLY', label: 'Admin Only' },
];

// =============================================================================
// Form Data Type
// =============================================================================

interface FormData {
  code: string;
  name: string;
  description: string;
  category: RequestCategory;
  icon: string;
  defaultPriority: Priority;
  requiresApproval: boolean;
  slaHours: string;
  slaCalculationType: SlaCalculationType;
  autoAssign: boolean;
  visibility: RequestVisibility;
  rollbackPermission: RollbackPermission;
  isActive: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  description: '',
  category: 'SERVICE_REQUEST',
  icon: '',
  defaultPriority: 'MEDIUM',
  requiresApproval: true,
  slaHours: '',
  slaCalculationType: 'BUSINESS_HOURS',
  autoAssign: false,
  visibility: 'PUBLIC',
  rollbackPermission: 'ADMIN_ONLY',
  isActive: true,
};

// =============================================================================
// Component
// =============================================================================

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingType?: RequestType;
}

export default function RequestTypeFormModal({ isOpen, onClose, editingType }: Props) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const createRequestType = useCreateRequestType();
  const updateRequestType = useUpdateRequestType();

  const isEditing = !!editingType;
  const isSaving = createRequestType.isPending || updateRequestType.isPending;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingType) {
        setFormData({
          code: editingType.code,
          name: editingType.name,
          description: editingType.description || '',
          category: editingType.category,
          icon: editingType.icon || '',
          defaultPriority: editingType.defaultPriority,
          requiresApproval: editingType.requiresApproval,
          slaHours: editingType.slaHours?.toString() || '',
          slaCalculationType: editingType.slaCalculationType,
          autoAssign: editingType.autoAssign,
          visibility: editingType.visibility,
          rollbackPermission: editingType.rollbackPermission,
          isActive: editingType.isActive,
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [isOpen, editingType]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(formData.code)) {
      newErrors.code = 'Code must start with a letter and contain only uppercase letters, numbers, and underscores';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.slaHours && (isNaN(Number(formData.slaHours)) || Number(formData.slaHours) < 0)) {
      newErrors.slaHours = 'SLA hours must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const input: CreateRequestTypeInput = {
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        icon: formData.icon || undefined,
        defaultPriority: formData.defaultPriority,
        requiresApproval: formData.requiresApproval,
        slaHours: formData.slaHours ? Number(formData.slaHours) : undefined,
        slaCalculationType: formData.slaCalculationType,
        autoAssign: formData.autoAssign,
        visibility: formData.visibility,
        rollbackPermission: formData.rollbackPermission,
      };

      if (isEditing && editingType) {
        await updateRequestType.mutateAsync({
          id: editingType.id,
          ...input,
          isActive: formData.isActive,
        });
      } else {
        await createRequestType.mutateAsync(input);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save request type:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Request Type' : 'Create Request Type'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code *
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="CUSTOM_REQUEST"
                    disabled={isEditing}
                    className={errors.code ? 'border-red-500' : ''}
                  />
                  {errors.code && (
                    <p className="text-xs text-red-500 mt-1">{errors.code}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Custom Request"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description of this request type..."
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as RequestCategory,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon (emoji)
                  </label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="📋"
                  />
                </div>
              </div>

              {/* SLA Settings */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">SLA Settings</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Priority
                    </label>
                    <select
                      value={formData.defaultPriority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultPriority: e.target.value as Priority,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SLA Hours
                    </label>
                    <Input
                      type="number"
                      value={formData.slaHours}
                      onChange={(e) =>
                        setFormData({ ...formData, slaHours: e.target.value })
                      }
                      placeholder="24"
                      min="0"
                      className={errors.slaHours ? 'border-red-500' : ''}
                    />
                    {errors.slaHours && (
                      <p className="text-xs text-red-500 mt-1">{errors.slaHours}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SLA Calculation
                    </label>
                    <select
                      value={formData.slaCalculationType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slaCalculationType: e.target.value as SlaCalculationType,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {SLA_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Behavior Settings */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Behavior</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visibility
                    </label>
                    <select
                      value={formData.visibility}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          visibility: e.target.value as RequestVisibility,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {VISIBILITY_OPTIONS.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rollback Permission
                    </label>
                    <select
                      value={formData.rollbackPermission}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rollbackPermission: e.target.value as RollbackPermission,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {ROLLBACK_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresApproval}
                      onChange={(e) =>
                        setFormData({ ...formData, requiresApproval: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Requires Approval</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoAssign}
                      onChange={(e) =>
                        setFormData({ ...formData, autoAssign: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Auto Assign</span>
                  </label>
                  {isEditing && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({ ...formData, isActive: e.target.checked })
                        }
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-600">Active</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
