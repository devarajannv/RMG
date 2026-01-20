import { useState, useEffect } from 'react';
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
import { useCreateFunction, useUpdateFunction } from '@/hooks/useFunctions';
import type { ApprovalFunction, CreateFunctionInput, UpdateFunctionInput } from '@/types/functions';

interface FunctionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingFunction?: ApprovalFunction;
}

export default function FunctionFormModal({
  isOpen,
  onClose,
  editingFunction,
}: FunctionFormModalProps) {
  const [formData, setFormData] = useState<CreateFunctionInput>({
    name: '',
    code: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createFunction = useCreateFunction();
  const updateFunction = useUpdateFunction();

  const isEditing = !!editingFunction;
  const isSaving = createFunction.isPending || updateFunction.isPending;

  // Reset form when modal opens/closes or editing function changes
  useEffect(() => {
    if (isOpen) {
      if (editingFunction) {
        setFormData({
          name: editingFunction.name,
          code: editingFunction.code,
          description: editingFunction.description || '',
        });
      } else {
        setFormData({
          name: '',
          code: '',
          description: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, editingFunction]);

  // Generate code from name
  const generateCode = (name: string) => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      // Auto-generate code only when creating new function
      code: isEditing ? prev.code : generateCode(name),
    }));
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: '' }));
    }
  };

  const handleCodeChange = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      code: code.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
    }));
    if (errors.code) {
      setErrors((prev) => ({ ...prev, code: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(formData.code)) {
      newErrors.code = 'Code must start with a letter and contain only letters, numbers, and underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      if (isEditing && editingFunction) {
        const updateData: UpdateFunctionInput = {
          name: formData.name,
          description: formData.description || undefined,
        };
        await updateFunction.mutateAsync({
          id: editingFunction.id,
          data: updateData,
        });
      } else {
        await createFunction.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      // Error handling is done by the mutation hooks
      console.error('Failed to save function:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Function' : 'Create Approval Function'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Function Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Department Head"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Function Code *
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="e.g., DEPT_HEAD"
                  disabled={isEditing}
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && (
                  <p className="text-sm text-red-500 mt-1">{errors.code}</p>
                )}
                {isEditing && (
                  <p className="text-xs text-gray-500 mt-1">
                    Code cannot be changed after creation
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe when this function is used for approvals..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Functions define approval roles that can be assigned to
                  users. When used in workflow steps, the system will find users currently
                  holding this function to process approvals.
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Update Function' : 'Create Function'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
