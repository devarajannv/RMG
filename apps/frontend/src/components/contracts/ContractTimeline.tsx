/**
 * Contract Timeline Component
 * Visual timeline representation of contracts with status indicators
 */

import { useMemo } from 'react';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider 
} from '@/components/ui/tooltip';

interface Contract {
  id: string;
  contractNumber: string;
  name: string;
  status: string;
  startDate: string;
  endDate?: string;
  value?: number;
  currency: string;
  client: { id: string; name: string };
}

interface ContractTimelineProps {
  contracts: Contract[];
  onContractClick?: (contract: Contract) => void;
  monthsToShow?: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-400',
  PENDING_APPROVAL: 'bg-yellow-400',
  ACTIVE: 'bg-green-500',
  EXPIRED: 'bg-red-400',
  TERMINATED: 'bg-red-600',
  RENEWED: 'bg-blue-500',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
  RENEWED: 'Renewed',
};

export function ContractTimeline({ 
  contracts, 
  onContractClick,
  monthsToShow = 12 
}: ContractTimelineProps) {
  // Calculate timeline range
  const timelineData = useMemo(() => {
    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(addDays(startDate, monthsToShow * 30));
    
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const totalDays = differenceInDays(endDate, startDate);
    
    // Process contracts for timeline
    const processedContracts = contracts.map(contract => {
      const contractStart = new Date(contract.startDate);
      const contractEnd = contract.endDate ? new Date(contract.endDate) : endDate;
      
      // Calculate position and width as percentages
      const startOffset = Math.max(0, differenceInDays(contractStart, startDate));
      const contractDuration = differenceInDays(contractEnd, contractStart);
      
      const left = (startOffset / totalDays) * 100;
      const width = Math.min((contractDuration / totalDays) * 100, 100 - left);
      
      // Check if contract is visible in the timeline
      const isVisible = contractStart <= endDate && contractEnd >= startDate;
      
      return {
        ...contract,
        left: Math.max(0, left),
        width: Math.max(2, width), // Minimum 2% width for visibility
        isVisible,
        daysUntilExpiry: contract.endDate 
          ? differenceInDays(new Date(contract.endDate), now)
          : null,
      };
    }).filter(c => c.isVisible);
    
    return {
      months,
      totalDays,
      startDate,
      endDate,
      contracts: processedContracts,
    };
  }, [contracts, monthsToShow]);

  return (
    <TooltipProvider>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Month headers */}
          <div className="flex border-b border-gray-200">
            {timelineData.months.map((month, idx) => (
              <div 
                key={idx}
                className="flex-1 text-center text-sm font-medium text-gray-600 py-2 border-r border-gray-100 last:border-r-0"
              >
                {format(month, 'MMM yyyy')}
              </div>
            ))}
          </div>
          
          {/* Timeline grid */}
          <div className="relative min-h-[300px] bg-gray-50">
            {/* Grid lines */}
            <div className="absolute inset-0 flex">
              {timelineData.months.map((_, idx) => (
                <div 
                  key={idx}
                  className="flex-1 border-r border-gray-100 last:border-r-0"
                />
              ))}
            </div>
            
            {/* Today marker */}
            <TodayMarker 
              startDate={timelineData.startDate}
              totalDays={timelineData.totalDays}
            />
            
            {/* Contract bars */}
            <div className="relative pt-4 pb-2 space-y-2">
              {timelineData.contracts.map((contract, idx) => (
                <ContractBar
                  key={contract.id}
                  contract={contract}
                  left={contract.left}
                  width={contract.width}
                  onClick={() => onContractClick?.(contract)}
                  rowIndex={idx}
                />
              ))}
              
              {timelineData.contracts.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  No contracts to display in this timeline
                </div>
              )}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded', STATUS_COLORS[status])} />
                <span className="text-sm text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

interface ContractBarProps {
  contract: Contract & { 
    left: number; 
    width: number; 
    daysUntilExpiry: number | null;
  };
  left: number;
  width: number;
  onClick?: () => void;
  rowIndex: number;
}

function ContractBar({ contract, left, width, onClick, rowIndex }: ContractBarProps) {
  const bgColor = STATUS_COLORS[contract.status] || 'bg-gray-400';
  const isExpiringSoon = contract.daysUntilExpiry !== null && 
    contract.daysUntilExpiry > 0 && 
    contract.daysUntilExpiry <= 30;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'absolute h-8 rounded cursor-pointer transition-all hover:opacity-90 hover:shadow-md',
            bgColor,
            isExpiringSoon && 'ring-2 ring-orange-400 ring-offset-1'
          )}
          style={{
            left: `${left}%`,
            width: `${width}%`,
            top: `${rowIndex * 36 + 16}px`,
          }}
          onClick={onClick}
        >
          <div className="px-2 py-1 truncate text-white text-sm font-medium">
            {contract.name || contract.contractNumber}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-semibold">{contract.name}</div>
          <div className="text-xs text-gray-500">{contract.contractNumber}</div>
          <div className="text-xs">Client: {contract.client.name}</div>
          <div className="text-xs">
            {format(new Date(contract.startDate), 'MMM d, yyyy')}
            {contract.endDate && ` - ${format(new Date(contract.endDate), 'MMM d, yyyy')}`}
          </div>
          {contract.daysUntilExpiry !== null && (
            <div className={cn(
              'text-xs font-medium',
              contract.daysUntilExpiry <= 0 ? 'text-red-600' :
              contract.daysUntilExpiry <= 30 ? 'text-orange-600' :
              'text-green-600'
            )}>
              {contract.daysUntilExpiry <= 0 
                ? 'Expired' 
                : `${contract.daysUntilExpiry} days remaining`}
            </div>
          )}
          {contract.value && (
            <div className="text-xs font-medium">
              {formatCurrency(contract.value, contract.currency)}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface TodayMarkerProps {
  startDate: Date;
  totalDays: number;
}

function TodayMarker({ startDate, totalDays }: TodayMarkerProps) {
  const today = new Date();
  const daysFromStart = differenceInDays(today, startDate);
  const position = (daysFromStart / totalDays) * 100;
  
  if (position < 0 || position > 100) return null;
  
  return (
    <div 
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
      style={{ left: `${position}%` }}
    >
      <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-full">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-red-600 whitespace-nowrap">
          Today
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number, currency: string = 'USD'): string {
  if (currency === 'INR') {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

export default ContractTimeline;
