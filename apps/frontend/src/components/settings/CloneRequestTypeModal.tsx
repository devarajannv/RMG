/**
 * Clone Request Type Modal
 *
 * Modal for cloning a request type (system or custom).
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
import { Copy } from 'lucide-react';
import { useCloneRequestType } from '@/hooks/useRequestTypes';
import type { RequestType } from '@/types/request-types';

// =============================================================================
// Component
// =============================================================================

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceType: RequestType;
}

export default function CloneRequestTypeModal({ isOpen, onClose, sourceType }: Props) {
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const cloneRequestType = useCloneRequestType();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && sourceType) {
      setNewCode(`${sourceType.code}_CUSTOM`);
      setNewName(`${sourceType.name} (Custom)`);
      setError('');
    }
  }, [isOpen, sourceType]);

  // Validation
  const validate = (): boolean => {
    if (!newCode.trim()) {
      setError('Code is required');
      return false;
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(newCode)) {
      setError('Code must start with a letter and contain only uppercase letters, numbers, and underscores');
      return false;
    }
    if (!newName.trim()) {
      setError('Name is required');
      return false;
    }
    setError('');
    return true;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await cloneRequestType.mutateAsync({
        id: sourceType.id,
        newCode,
        newName: newName || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clone request type';
      setError(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Clone Request Type
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              {/* Source Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Cloning from:</p>
                <p className="font-medium text-gray-900">{sourceType.name}</p>
                <p className="text-xs text-gray-500">{sourceType.code}</p>
              </div>

              <p className="text-sm text-gray-600">
                Create a copy of this request type that you can customize for your organization.
                All settings will be copied to the new type.
              </p>

              {/* New Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Code *
                </label>
                <Input
                  value={newCode}
                  onChange={(e) => {
                    setNewCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="CUSTOM_REQUEST"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be unique. Use uppercase letters, numbers, and underscores.
                </p>
              </div>

              {/* New Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Name *
                </label>
                <Input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setError('');
                  }}
                  placeholder="Custom Request"
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={cloneRequestType.isPending}>
              {cloneRequestType.isPending ? 'Cloning...' : 'Clone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
