/**
 * Contract Status Indicator Component
 * Displays contract status with visual indicators and expiry warnings
 */

import { cn } from '@/lib/utils';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider 
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface ContractStatusIndicatorProps {
  status: string;
  endDate?: string;
  showExpiry?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
}> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: FileText,
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    icon: Clock,
  },
  ACTIVE: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    icon: CheckCircle2,
  },
  EXPIRED: {
    label: 'Expired',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: XCircle,
  },
  TERMINATED: {
    label: 'Terminated',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: XCircle,
  },
  RENEWED: {
    label: 'Renewed',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    icon: RefreshCw,
  },
};

export function ContractStatusIndicator({ 
  status, 
  endDate,
  showExpiry = true,
  size = 'md',
  className 
}: ContractStatusIndicatorProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = config.icon;
  
  const daysUntilExpiry = endDate ? getDaysUntilExpiry(endDate) : null;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        <Badge
          variant="outline"
          className={cn(
            'font-medium border',
            config.bgColor,
            config.color,
            config.borderColor,
            sizeClasses[size]
          )}
        >
          <Icon className={cn('mr-1', iconSizes[size])} />
          {config.label}
        </Badge>
        
        {showExpiry && daysUntilExpiry !== null && (
          <ExpiryIndicator 
            daysUntilExpiry={daysUntilExpiry}
            endDate={endDate!}
            size={size}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

interface ExpiryIndicatorProps {
  daysUntilExpiry: number;
  endDate: string;
  size: 'sm' | 'md' | 'lg';
}

function ExpiryIndicator({ daysUntilExpiry, endDate, size }: ExpiryIndicatorProps) {
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  
  if (daysUntilExpiry <= 0) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="destructive" className="font-medium">
            <XCircle className={cn('mr-1', iconSizes[size])} />
            Expired
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Contract expired on {formatDate(endDate)}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  if (daysUntilExpiry <= 30) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant="outline"
            className="font-medium bg-orange-50 text-orange-700 border-orange-300"
          >
            <AlertTriangle className={cn('mr-1', iconSizes[size])} />
            {daysUntilExpiry} days left
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Contract expires on {formatDate(endDate)}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  if (daysUntilExpiry <= 90) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar className={iconSizes[size]} />
            {daysUntilExpiry} days
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Contract expires on {formatDate(endDate)}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return null;
}

/**
 * Contract Progress Bar
 * Shows visual progress of contract duration
 */
interface ContractProgressBarProps {
  startDate: string;
  endDate?: string;
  className?: string;
}

export function ContractProgressBar({ startDate, endDate, className }: ContractProgressBarProps) {
  if (!endDate) {
    return (
      <div className={cn('text-sm text-gray-500', className)}>
        No end date specified
      </div>
    );
  }
  
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  
  const totalDuration = end - start;
  const elapsed = Math.max(0, now - start);
  const progress = Math.min(100, (elapsed / totalDuration) * 100);
  
  const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;
  
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatDate(startDate)}</span>
        <span>{formatDate(endDate)}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isExpired ? 'bg-red-500' :
            isExpiringSoon ? 'bg-orange-500' :
            'bg-green-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-center">
        {isExpired ? (
          <span className="text-red-600 font-medium">
            Expired {Math.abs(daysRemaining)} days ago
          </span>
        ) : (
          <span className={cn(
            'font-medium',
            isExpiringSoon ? 'text-orange-600' : 'text-gray-600'
          )}>
            {daysRemaining} days remaining ({Math.round(progress)}% complete)
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Contract Status Summary Card
 * Compact card showing key contract metrics
 */
interface ContractStatusCardProps {
  totalContracts: number;
  activeContracts: number;
  expiringContracts: number;
  expiredContracts: number;
  totalValue?: number;
  currency?: string;
}

export function ContractStatusCard({
  totalContracts,
  activeContracts,
  expiringContracts,
  expiredContracts,
  totalValue,
  currency = 'INR',
}: ContractStatusCardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-gray-900">{totalContracts}</div>
        <div className="text-sm text-gray-500">Total Contracts</div>
      </div>
      
      <div className="p-4 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-700">{activeContracts}</div>
        <div className="text-sm text-green-600">Active</div>
      </div>
      
      <div className="p-4 bg-orange-50 rounded-lg">
        <div className="text-2xl font-bold text-orange-700">{expiringContracts}</div>
        <div className="text-sm text-orange-600">Expiring Soon</div>
      </div>
      
      <div className="p-4 bg-red-50 rounded-lg">
        <div className="text-2xl font-bold text-red-700">{expiredContracts}</div>
        <div className="text-sm text-red-600">Expired</div>
      </div>
      
      {totalValue !== undefined && (
        <div className="col-span-2 md:col-span-4 p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(totalValue, currency)}
          </div>
          <div className="text-sm text-blue-600">Total Active Contract Value</div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getDaysUntilExpiry(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

export default ContractStatusIndicator;
