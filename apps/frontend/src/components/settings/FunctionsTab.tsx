import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2, Users, ChevronDown, ChevronRight, UserPlus, UserMinus } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/dialog';
import { cn, formatDate } from '@/lib/utils';
import {
  useFunctions,
  useFunctionHolders,
  useDeleteFunction,
  useRevokeAssignment,
} from '@/hooks/useFunctions';
import type { ApprovalFunction, FunctionHolder } from '@/types/functions';
import FunctionFormModal from './FunctionFormModal';
import AssignmentFormModal from './AssignmentFormModal';

// ============================================================================
// Function Row Component
// ============================================================================

function FunctionRow({
  func,
  onEdit,
  onDelete,
  onAssign,
}: {
  func: ApprovalFunction;
  onEdit: (func: ApprovalFunction) => void;
  onDelete: (func: ApprovalFunction) => void;
  onAssign: (func: ApprovalFunction) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: holders = [], isLoading: loadingHolders } = useFunctionHolders(func.id);
  const revokeAssignment = useRevokeAssignment();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (assignmentId: string) => {
    setRevokingId(assignmentId);
    try {
      await revokeAssignment.mutateAsync({ assignmentId });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Function Header */}
      <div
        className={cn(
          'flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition cursor-pointer',
          expanded && 'border-b'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <button className="text-gray-400">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{func.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {func.code}
              </span>
              {func.isSystem && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  System
                </span>
              )}
            </div>
            {func.description && (
              <p className="text-sm text-gray-500 mt-0.5">{func.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 text-sm text-gray-500 mr-2">
            <Users className="w-4 h-4" />
            <span>{func._count?.assignments ?? 0}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAssign(func)}
            title="Assign User"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(func)}
            disabled={func.isSystem}
            title={func.isSystem ? 'System functions cannot be edited' : 'Edit Function'}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(func)}
            disabled={func.isSystem}
            title={func.isSystem ? 'System functions cannot be deleted' : 'Delete Function'}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Holders List (Expanded) */}
      {expanded && (
        <div className="bg-gray-50 p-4">
          {loadingHolders ? (
            <p className="text-sm text-gray-500">Loading holders...</p>
          ) : holders.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No users assigned to this function</p>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Holders</h4>
              {holders.map((holder: FunctionHolder) => (
                <div
                  key={holder.assignmentId}
                  className="flex items-center justify-between bg-white p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                      {holder.firstName?.[0]}{holder.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {holder.firstName} {holder.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{holder.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-gray-500">
                      <p>From: {formatDate(holder.effectiveFrom)}</p>
                      {holder.effectiveTo && <p>To: {formatDate(holder.effectiveTo)}</p>}
                    </div>
                    {holder.isDelegated && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        Delegated
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(holder.assignmentId)}
                      disabled={revokingId === holder.assignmentId}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Revoke Assignment"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Functions Tab Component
// ============================================================================

export default function FunctionsTab() {
  const [search, setSearch] = useState('');
  const [showSystemFunctions, setShowSystemFunctions] = useState(true);

  // Modal states
  const [functionModalOpen, setFunctionModalOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<ApprovalFunction | undefined>();
  const [deletingFunction, setDeletingFunction] = useState<ApprovalFunction | null>(null);
  const [assigningFunction, setAssigningFunction] = useState<ApprovalFunction | null>(null);

  // Query
  const { data: functions = [], isLoading } = useFunctions();
  const deleteFunction = useDeleteFunction();

  // Filter functions
  const filteredFunctions = functions.filter((func: ApprovalFunction) => {
    const matchesSearch =
      func.name.toLowerCase().includes(search.toLowerCase()) ||
      func.code.toLowerCase().includes(search.toLowerCase()) ||
      func.description?.toLowerCase().includes(search.toLowerCase());

    const matchesSystem = showSystemFunctions || !func.isSystem;

    return matchesSearch && matchesSystem;
  });

  // Handlers
  const handleEdit = (func: ApprovalFunction) => {
    setEditingFunction(func);
    setFunctionModalOpen(true);
  };

  const handleDelete = (func: ApprovalFunction) => {
    setDeletingFunction(func);
  };

  const handleAssign = (func: ApprovalFunction) => {
    setAssigningFunction(func);
  };

  const confirmDelete = async () => {
    if (deletingFunction) {
      await deleteFunction.mutateAsync(deletingFunction.id);
      setDeletingFunction(null);
    }
  };

  const handleCloseModal = () => {
    setFunctionModalOpen(false);
    setEditingFunction(undefined);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Approval Functions</h2>
          <p className="text-sm text-gray-500">
            Manage approval functions and their assignments
          </p>
        </div>
        <Button onClick={() => setFunctionModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Function
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search functions..."
                className="pl-9"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSystemFunctions}
                onChange={(e) => setShowSystemFunctions(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Show system functions</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Functions List */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading functions...</div>
          ) : filteredFunctions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {search ? 'No functions match your search' : 'No functions defined yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFunctions.map((func: ApprovalFunction) => (
                <FunctionRow
                  key={func.id}
                  func={func}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAssign={handleAssign}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Function Form Modal */}
      <FunctionFormModal
        isOpen={functionModalOpen}
        onClose={handleCloseModal}
        editingFunction={editingFunction}
      />

      {/* Assignment Modal */}
      {assigningFunction && (
        <AssignmentFormModal
          isOpen={!!assigningFunction}
          onClose={() => setAssigningFunction(null)}
          func={assigningFunction}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingFunction}
        onOpenChange={(open) => !open && setDeletingFunction(null)}
        title="Delete Function"
        description={`Are you sure you want to delete the function "${deletingFunction?.name}"? This will also remove all user assignments.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        variant="danger"
      />
    </div>
  );
}
