/**
 * ContractStatusTimeline Component
 * 
 * Visual timeline showing contract status progression:
 * - Status history with timestamps
 * - Current status highlight
 * - Expected next status
 * - Status transition validation
 * 
 * @module ContractStatusTimeline
 */

import { useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type ContractStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

interface StatusHistoryEntry {
  status: ContractStatus;
  timestamp: string;
  user?: {
    firstName: string;
    lastName: string;
  };
  reason?: string;
}

interface ContractStatusTimelineProps {
  currentStatus: ContractStatus;
  statusHistory?: StatusHistoryEntry[];
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  signedDate?: string;
  renewalDate?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<ContractStatus, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  DRAFT: {
    label: 'Draft',
    icon: FileText,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    icon: Clock,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
  },
  ACTIVE: {
    label: 'Active',
    icon: CheckCircle2,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  EXPIRED: {
    label: 'Expired',
    icon: AlertTriangle,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
  TERMINATED: {
    label: 'Terminated',
    icon: XCircle,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
  RENEWED: {
    label: 'Renewed',
    icon: RefreshCw,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
};

// Standard lifecycle order
const LIFECYCLE_ORDER: ContractStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'ACTIVE',
  'RENEWED',
];

const TERMINAL_STATES: ContractStatus[] = ['EXPIRED', 'TERMINATED'];

// Valid transitions
const VALID_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'ACTIVE'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['RENEWED', 'EXPIRED', 'TERMINATED'],
  RENEWED: ['ACTIVE', 'EXPIRED', 'TERMINATED'],
  EXPIRED: ['RENEWED'],
  TERMINATED: [],
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Timeline Node Component
// ============================================================================

interface TimelineNodeProps {
  status: ContractStatus;
  isCurrent: boolean;
  isComplete: boolean;
  isPending: boolean;
  timestamp?: string;
  user?: { firstName: string; lastName: string };
  isLast: boolean;
}

function TimelineNode({
  status,
  isCurrent,
  isComplete,
  isPending,
  timestamp,
  user,
  isLast,
}: TimelineNodeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex items-start">
      {/* Node */}
      <div className="flex flex-col items-center mr-4">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
            isCurrent && `${config.bgColor} ${config.borderColor} ring-4 ring-offset-2 ${config.bgColor.replace('100', '200')}`,
            isComplete && !isCurrent && 'bg-green-100 border-green-300',
            isPending && 'bg-gray-50 border-gray-200'
          )}
        >
          {isComplete && !isCurrent ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Icon className={cn('h-5 w-5', isCurrent ? config.color : isPending ? 'text-gray-400' : config.color)} />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-0.5 h-16 mt-1',
              isComplete ? 'bg-green-300' : 'bg-gray-200'
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pt-1 pb-6">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium',
              isCurrent ? config.color : isComplete ? 'text-gray-900' : 'text-gray-400'
            )}
          >
            {config.label}
          </span>
          {isCurrent && (
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.bgColor, config.color)}>
              Current
            </span>
          )}
        </div>
        {timestamp && (
          <p className="text-sm text-gray-500 mt-1">{formatDateTime(timestamp)}</p>
        )}
        {user && (
          <p className="text-sm text-gray-500">
            by {user.firstName} {user.lastName}
          </p>
        )}
        {isPending && !timestamp && (
          <p className="text-sm text-gray-400 italic mt-1">Pending</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Key Dates Panel
// ============================================================================

interface KeyDatesPanelProps {
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  signedDate?: string;
  renewalDate?: string;
}

function KeyDatesPanel({ createdAt, startDate, endDate, signedDate, renewalDate }: KeyDatesPanelProps) {
  const dates = [
    { label: 'Created', date: createdAt },
    { label: 'Start Date', date: startDate },
    { label: 'Signed', date: signedDate },
    { label: 'End Date', date: endDate },
    { label: 'Renewed', date: renewalDate },
  ].filter((d) => d.date);

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-3">Key Dates</h4>
      <div className="space-y-2">
        {dates.map(({ label, date }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-900">{formatDate(date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Next Actions Panel
// ============================================================================

interface NextActionsPanelProps {
  currentStatus: ContractStatus;
}

function NextActionsPanel({ currentStatus }: NextActionsPanelProps) {
  const validTransitions = VALID_TRANSITIONS[currentStatus];

  if (validTransitions.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Next Actions</h4>
        <p className="text-sm text-gray-500">No further actions available</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h4 className="font-medium text-blue-900 mb-3">Possible Next Actions</h4>
      <div className="space-y-2">
        {validTransitions.map((nextStatus) => {
          const config = STATUS_CONFIG[nextStatus];
          const Icon = config.icon;
          return (
            <div key={nextStatus} className="flex items-center gap-2 text-sm">
              <ArrowRight className="h-4 w-4 text-blue-500" />
              <Icon className={cn('h-4 w-4', config.color)} />
              <span className={config.color}>{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ContractStatusTimeline({
  currentStatus,
  statusHistory = [],
  createdAt,
  startDate,
  endDate,
  signedDate,
  renewalDate,
}: ContractStatusTimelineProps) {
  // Build timeline from history and lifecycle
  const timelineData = useMemo(() => {
    // Map status history by status for lookup
    const historyMap = new Map<ContractStatus, StatusHistoryEntry>();
    statusHistory.forEach((entry) => {
      historyMap.set(entry.status, entry);
    });

    // Determine which statuses to show
    const isTerminal = TERMINAL_STATES.includes(currentStatus);
    const currentIndex = LIFECYCLE_ORDER.indexOf(currentStatus);

    let statusesToShow: ContractStatus[];
    
    if (isTerminal) {
      // Show lifecycle up to ACTIVE, then terminal state
      statusesToShow = [...LIFECYCLE_ORDER.slice(0, 3), currentStatus];
    } else if (currentIndex >= 0) {
      // Show lifecycle order
      statusesToShow = LIFECYCLE_ORDER;
    } else {
      // Fallback: show all passed statuses plus current
      statusesToShow = [...new Set([...statusHistory.map((h) => h.status), currentStatus])];
    }

    return statusesToShow.map((status, index) => {
      const historyEntry = historyMap.get(status);
      const isCurrent = status === currentStatus;
      const statusIndex = LIFECYCLE_ORDER.indexOf(status);
      const currentLifecycleIndex = LIFECYCLE_ORDER.indexOf(currentStatus);
      
      const isComplete = !isTerminal 
        ? statusIndex < currentLifecycleIndex || (!!historyEntry && !isCurrent)
        : !!historyEntry && !isCurrent;
      
      const isPending = !isComplete && !isCurrent;

      return {
        status,
        isCurrent,
        isComplete,
        isPending,
        timestamp: historyEntry?.timestamp,
        user: historyEntry?.user,
        isLast: index === statusesToShow.length - 1,
      };
    });
  }, [currentStatus, statusHistory]);

  const currentConfig = STATUS_CONFIG[currentStatus];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            Status Timeline
          </span>
          <span
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              currentConfig.bgColor,
              currentConfig.color
            )}
          >
            {currentConfig.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <div className="pl-2">
              {timelineData.map((node) => (
                <TimelineNode key={node.status} {...node} />
              ))}
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            <KeyDatesPanel
              createdAt={createdAt}
              startDate={startDate}
              endDate={endDate}
              signedDate={signedDate}
              renewalDate={renewalDate}
            />
            <NextActionsPanel currentStatus={currentStatus} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
