/**
 * Request Types Settings Tab
 *
 * Allows administrators to manage request types for their tenant.
 * - View system and custom request types
 * - Create new request types
 * - Clone system types for customization
 * - Edit tenant-specific request types
 * - Assign workflows to request types
 *
 * Created: January 20, 2026
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Settings2,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useRequestTypes,
  useDeleteRequestType,
} from '@/hooks/useRequestTypes';
import type { RequestType, RequestCategory } from '@/types/request-types';
import RequestTypeFormModal from './RequestTypeFormModal';
import CloneRequestTypeModal from './CloneRequestTypeModal';

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  CHANGE: 'Change Request',
  INCIDENT: 'Incident',
  SERVICE_REQUEST: 'Service Request',
  PROBLEM: 'Problem',
  ACCESS_REQUEST: 'Access Request',
  PROJECT_REQUEST: 'Project Request',
};

const CATEGORY_COLORS: Record<RequestCategory, string> = {
  CHANGE: 'bg-blue-100 text-blue-700',
  INCIDENT: 'bg-red-100 text-red-700',
  SERVICE_REQUEST: 'bg-green-100 text-green-700',
  PROBLEM: 'bg-yellow-100 text-yellow-700',
  ACCESS_REQUEST: 'bg-purple-100 text-purple-700',
  PROJECT_REQUEST: 'bg-indigo-100 text-indigo-700',
};

// =============================================================================
// Request Type Row Component
// =============================================================================

function RequestTypeRow({
  requestType,
  onEdit,
  onDelete,
  onClone,
}: {
  requestType: RequestType;
  onEdit: (rt: RequestType) => void;
  onDelete: (rt: RequestType) => void;
  onClone: (rt: RequestType) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const isEditable = !requestType.isSystemType && requestType.tenantId;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition cursor-pointer',
          expanded && 'border-b'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <button className="text-gray-400">
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {requestType.icon ? (
              <span className="text-lg">{requestType.icon}</span>
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{requestType.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {requestType.code}
              </span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  CATEGORY_COLORS[requestType.category]
                )}
              >
                {CATEGORY_LABELS[requestType.category]}
              </span>
              {requestType.isSystemType && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  System
                </span>
              )}
              {!requestType.isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  Inactive
                </span>
              )}
            </div>
            {requestType.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                {requestType.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {requestType._count && (
            <span className="text-sm text-gray-500 mr-2">
              {requestType._count.requests} requests
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onClone(requestType)}
            title="Clone Request Type"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(requestType)}
            disabled={!isEditable}
            title={
              isEditable
                ? 'Edit Request Type'
                : 'System types cannot be edited (clone first)'
            }
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(requestType)}
            disabled={!isEditable}
            title={
              isEditable
                ? 'Delete Request Type'
                : 'System types cannot be deleted'
            }
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Details (Expanded) */}
      {expanded && (
        <div className="bg-gray-50 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Default Priority:</span>
              <p className="font-medium">{requestType.defaultPriority}</p>
            </div>
            <div>
              <span className="text-gray-500">Requires Approval:</span>
              <p className="font-medium">
                {requestType.requiresApproval ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">SLA Hours:</span>
              <p className="font-medium">{requestType.slaHours ?? 'None'}</p>
            </div>
            <div>
              <span className="text-gray-500">SLA Type:</span>
              <p className="font-medium">
                {requestType.slaCalculationType === 'BUSINESS_HOURS'
                  ? 'Business Hours'
                  : 'Calendar Hours'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Auto Assign:</span>
              <p className="font-medium">
                {requestType.autoAssign ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Visibility:</span>
              <p className="font-medium capitalize">
                {requestType.visibility.toLowerCase()}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Rollback Permission:</span>
              <p className="font-medium">
                {requestType.rollbackPermission.replace('_', ' ')}
              </p>
            </div>
            {requestType.clonedFrom && (
              <div>
                <span className="text-gray-500">Cloned From:</span>
                <p className="font-medium">{requestType.clonedFrom.name}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function RequestTypesTab() {
  const [search, setSearch] = useState('');
  const [showSystemTypes, setShowSystemTypes] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<RequestType | undefined>();
  const [deletingType, setDeletingType] = useState<RequestType | null>(null);
  const [cloningType, setCloningType] = useState<RequestType | null>(null);

  // Queries
  const { data: requestTypes = [], isLoading } = useRequestTypes();
  const deleteRequestType = useDeleteRequestType();

  // Filter request types
  const filteredTypes = requestTypes.filter((rt) => {
    const matchesSearch =
      rt.name.toLowerCase().includes(search.toLowerCase()) ||
      rt.code.toLowerCase().includes(search.toLowerCase()) ||
      rt.description?.toLowerCase().includes(search.toLowerCase());

    const matchesSystem = showSystemTypes || !rt.isSystemType;
    const matchesActive = showInactive || rt.isActive;

    return matchesSearch && matchesSystem && matchesActive;
  });

  // Group by category
  const groupedTypes = filteredTypes.reduce(
    (acc, rt) => {
      const category = rt.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(rt);
      return acc;
    },
    {} as Record<RequestCategory, RequestType[]>
  );

  // Handlers
  const handleEdit = (rt: RequestType) => {
    setEditingType(rt);
    setFormModalOpen(true);
  };

  const handleDelete = (rt: RequestType) => {
    setDeletingType(rt);
  };

  const handleClone = (rt: RequestType) => {
    setCloningType(rt);
  };

  const confirmDelete = async () => {
    if (deletingType) {
      await deleteRequestType.mutateAsync(deletingType.id);
      setDeletingType(null);
    }
  };

  const handleCloseModal = () => {
    setFormModalOpen(false);
    setEditingType(undefined);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Request Types</h2>
          <p className="text-sm text-gray-500">
            Configure request types and their settings for your organization
          </p>
        </div>
        <Button onClick={() => setFormModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Request Type
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search request types..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSystemTypes}
                  onChange={(e) => setShowSystemTypes(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">System types</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Show inactive</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Types List */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading request types...
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {search
                ? 'No request types match your search'
                : 'No request types defined yet'}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTypes).map(([category, types]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    {CATEGORY_LABELS[category as RequestCategory]} ({types.length})
                  </h3>
                  <div className="space-y-3">
                    {types.map((rt) => (
                      <RequestTypeRow
                        key={rt.id}
                        requestType={rt}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onClone={handleClone}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <RequestTypeFormModal
        isOpen={formModalOpen}
        onClose={handleCloseModal}
        editingType={editingType}
      />

      {/* Clone Modal */}
      {cloningType && (
        <CloneRequestTypeModal
          isOpen={!!cloningType}
          onClose={() => setCloningType(null)}
          sourceType={cloningType}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingType}
        onOpenChange={(open) => !open && setDeletingType(null)}
        title="Delete Request Type"
        description={`Are you sure you want to delete "${deletingType?.name}"? This action cannot be undone. Existing requests of this type will not be affected.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        variant="danger"
      />
    </div>
  );
}
