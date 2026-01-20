/**
 * My Functions Page
 * Allows users to view their function assignments and delegate them temporarily
 * 
 * Architecture: Writer (Core Product)
 * - View assigned functions
 * - See active delegations
 * - Delegate functions to others
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import { Briefcase, Calendar, UserCheck, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useMyAssignments, useDelegateFunction } from '@/hooks/useFunctions';
import type { FunctionAssignment, DelegateInput } from '@/types/functions';
import DelegationModal from '@/components/settings/DelegationModal';

// ============================================================================
// Assignment Card Component
// ============================================================================

function AssignmentCard({
  assignment,
  onDelegate,
}: {
  assignment: FunctionAssignment;
  onDelegate: (assignment: FunctionAssignment) => void;
}) {
  const isExpired = assignment.effectiveTo && new Date(assignment.effectiveTo) < new Date();
  const isExpiringSoon =
    assignment.effectiveTo &&
    new Date(assignment.effectiveTo) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <Card
      className={cn(
        'shadow-sm transition-all hover:shadow-md',
        isExpired && 'opacity-60 border-gray-300',
        assignment.isDelegated && 'border-yellow-300 bg-yellow-50/30'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                assignment.isDelegated ? 'bg-yellow-100' : 'bg-primary/10'
              )}
            >
              <Briefcase
                className={cn(
                  'w-5 h-5',
                  assignment.isDelegated ? 'text-yellow-600' : 'text-primary'
                )}
              />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {assignment.function?.name || 'Unknown Function'}
              </h3>
              <p className="text-sm text-gray-500">{assignment.function?.code}</p>
              {assignment.function?.description && (
                <p className="text-sm text-gray-600 mt-1">{assignment.function.description}</p>
              )}
            </div>
          </div>

          {!assignment.isDelegated && !isExpired && (
            <Button variant="outline" size="sm" onClick={() => onDelegate(assignment)}>
              <ArrowRight className="w-4 h-4 mr-1" />
              Delegate
            </Button>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {assignment.isDelegated && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
              <UserCheck className="w-3 h-3" />
              Delegated to you
            </span>
          )}
          {isExpired && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              <Clock className="w-3 h-3" />
              Expired
            </span>
          )}
          {!isExpired && isExpiringSoon && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
              <AlertTriangle className="w-3 h-3" />
              Expiring soon
            </span>
          )}
        </div>

        {/* Date Info */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>From: {formatDate(assignment.effectiveFrom)}</span>
          </div>
          {assignment.effectiveTo && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>To: {formatDate(assignment.effectiveTo)}</span>
            </div>
          )}
        </div>

        {/* Delegation Source */}
        {assignment.isDelegated && assignment.delegatedFrom && (
          <div className="mt-2 text-xs text-gray-500">
            Delegated by: {assignment.delegatedFrom.firstName} {assignment.delegatedFrom.lastName}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MyFunctionsPage() {
  const [delegatingAssignment, setDelegatingAssignment] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useMyAssignments();
  const delegateFunction = useDelegateFunction();

  // Separate active and expired assignments
  const activeAssignments = assignments.filter(
    (a: FunctionAssignment) => !a.effectiveTo || new Date(a.effectiveTo) >= new Date()
  );
  const expiredAssignments = assignments.filter(
    (a: FunctionAssignment) => a.effectiveTo && new Date(a.effectiveTo) < new Date()
  );

  // Separate owned vs delegated to me
  const ownedAssignments = activeAssignments.filter((a: FunctionAssignment) => !a.isDelegated);
  const delegatedToMe = activeAssignments.filter((a: FunctionAssignment) => a.isDelegated);

  const handleDelegate = async (data: DelegateInput) => {
    if (!delegatingAssignment) return;
    await delegateFunction.mutateAsync({ assignmentId: delegatingAssignment, data });
    setDelegatingAssignment(null);
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Functions</h1>
          <p className="text-gray-600 mt-1">
            View your assigned approval functions and manage delegations
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading your functions...</div>
        ) : activeAssignments.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="text-center py-12">
              <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Functions Assigned</h3>
              <p className="text-gray-500">
                You don't have any approval functions assigned to you yet.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Contact your administrator if you believe you should have access to certain
                functions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Owned Functions */}
            {ownedAssignments.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Your Functions
                  <span className="text-sm font-normal text-gray-500">
                    ({ownedAssignments.length})
                  </span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {ownedAssignments.map((assignment: FunctionAssignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onDelegate={(a: FunctionAssignment) => setDelegatingAssignment(a.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Delegated to Me */}
            {delegatedToMe.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-yellow-600" />
                  Delegated to You
                  <span className="text-sm font-normal text-gray-500">
                    ({delegatedToMe.length})
                  </span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {delegatedToMe.map((assignment: FunctionAssignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onDelegate={(a: FunctionAssignment) => setDelegatingAssignment(a.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Expired Functions (Collapsed) */}
            {expiredAssignments.length > 0 && (
              <div>
                <details className="group">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    View expired assignments ({expiredAssignments.length})
                  </summary>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {expiredAssignments.map((assignment: FunctionAssignment) => (
                      <AssignmentCard
                        key={assignment.id}
                        assignment={assignment}
                        onDelegate={(a: FunctionAssignment) => setDelegatingAssignment(a.id)}
                      />
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-8 shadow-sm bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base text-blue-800">About Approval Functions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700">
            <ul className="list-disc list-inside space-y-1">
              <li>Functions define your approval authority in workflows</li>
              <li>You can delegate your functions temporarily to colleagues</li>
              <li>Delegated functions allow others to approve on your behalf</li>
              <li>Contact your administrator to request new function assignments</li>
            </ul>
          </CardContent>
        </Card>

        {/* Delegation Modal */}
        {delegatingAssignment && (
          <DelegationModal
            isOpen={!!delegatingAssignment}
            onClose={() => setDelegatingAssignment(null)}
            assignment={assignments.find((a: FunctionAssignment) => a.id === delegatingAssignment)!}
            onDelegate={handleDelegate}
            isLoading={delegateFunction.isPending}
          />
        )}
      </div>
    </MainLayout>
  );
}
