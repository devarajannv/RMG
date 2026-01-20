/**
 * Dashboard Widgets Collection
 * Comprehensive dashboard widgets for monitoring key business metrics
 */

import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign,
  FileText,
  Users,
  Clock,
  CheckCircle,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface BudgetHealthData {
  totalBudget: number;
  utilized: number;
  remaining: number;
  projectedOverrun?: number;
  byCategory: Array<{
    name: string;
    budget: number;
    utilized: number;
  }>;
  trend: 'improving' | 'stable' | 'warning' | 'critical';
}

interface ContractAlertData {
  expiringThisMonth: number;
  expiringNext30Days: number;
  expiringNext90Days: number;
  requiresRenewal: number;
  pendingApproval: number;
  contracts: Array<{
    id: string;
    name: string;
    client: string;
    expiryDate: string;
    daysUntilExpiry: number;
    value: number;
    status: string;
  }>;
}

interface RequestPipelineData {
  total: number;
  byStatus: {
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
  };
  avgProcessingTime: number;
  slaCompliance: number;
  recentRequests: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    assignee?: string;
  }>;
}

interface TeamCapacityData {
  totalResources: number;
  allocated: number;
  available: number;
  onBench: number;
  overAllocated: number;
  utilizationRate: number;
  byDepartment: Array<{
    name: string;
    total: number;
    allocated: number;
    available: number;
  }>;
}

// ============================================================================
// Budget Health Widget
// ============================================================================

interface BudgetHealthWidgetProps {
  data: BudgetHealthData;
  currency?: string;
  onViewDetails?: () => void;
}

export function BudgetHealthWidget({ 
  data, 
  currency = 'INR',
  onViewDetails 
}: BudgetHealthWidgetProps) {
  const utilizationPercent = (data.utilized / data.totalBudget) * 100;
  
  const trendConfig = {
    improving: { icon: TrendingDown, color: 'text-green-600', label: 'Improving' },
    stable: { icon: BarChart3, color: 'text-blue-600', label: 'Stable' },
    warning: { icon: TrendingUp, color: 'text-orange-600', label: 'Warning' },
    critical: { icon: AlertTriangle, color: 'text-red-600', label: 'Critical' },
  };
  
  const trend = trendConfig[data.trend];
  const TrendIcon = trend.icon;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Budget Health
          </CardTitle>
          <Badge 
            variant="outline"
            className={cn(
              data.trend === 'critical' && 'bg-red-50 text-red-700 border-red-300',
              data.trend === 'warning' && 'bg-orange-50 text-orange-700 border-orange-300',
              data.trend === 'stable' && 'bg-blue-50 text-blue-700 border-blue-300',
              data.trend === 'improving' && 'bg-green-50 text-green-700 border-green-300',
            )}
          >
            <TrendIcon className="w-3 h-3 mr-1" />
            {trend.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Main metric */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Utilized</span>
            <span className="font-medium">{utilizationPercent.toFixed(1)}%</span>
          </div>
          <Progress 
            value={utilizationPercent} 
            className={cn(
              'h-3',
              utilizationPercent > 90 && '[&>div]:bg-red-500',
              utilizationPercent > 75 && utilizationPercent <= 90 && '[&>div]:bg-orange-500',
            )}
          />
        </div>
        
        {/* Budget breakdown */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-sm font-semibold">{formatCurrency(data.totalBudget, currency)}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-sm font-semibold text-green-700">{formatCurrency(data.remaining, currency)}</div>
            <div className="text-xs text-green-600">Remaining</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-sm font-semibold text-blue-700">{formatCurrency(data.utilized, currency)}</div>
            <div className="text-xs text-blue-600">Utilized</div>
          </div>
        </div>
        
        {/* Projected overrun warning */}
        {data.projectedOverrun && data.projectedOverrun > 0 && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Projected overrun: {formatCurrency(data.projectedOverrun, currency)}
              </span>
            </div>
          </div>
        )}
        
        {/* Category breakdown */}
        <div className="space-y-2">
          {data.byCategory.slice(0, 3).map(cat => (
            <div key={cat.name} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20 truncate">{cat.name}</span>
              <div className="flex-1">
                <Progress 
                  value={(cat.utilized / cat.budget) * 100} 
                  className="h-1.5" 
                />
              </div>
              <span className="text-xs text-gray-600 w-12 text-right">
                {((cat.utilized / cat.budget) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
        
        {onViewDetails && (
          <Button variant="ghost" size="sm" className="w-full mt-4" onClick={onViewDetails}>
            View Details
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Contract Alerts Widget
// ============================================================================

interface ContractAlertsWidgetProps {
  data: ContractAlertData;
  onViewContract?: (id: string) => void;
  onViewAll?: () => void;
}

export function ContractAlertsWidget({ 
  data, 
  onViewContract,
  onViewAll 
}: ContractAlertsWidgetProps) {
  const totalAlerts = data.expiringThisMonth + data.pendingApproval + data.requiresRenewal;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Contract Alerts
          </CardTitle>
          {totalAlerts > 0 && (
            <Badge variant="destructive">{totalAlerts}</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Alert summary */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{data.expiringThisMonth}</div>
            <div className="text-xs text-red-600">Expiring This Month</div>
          </div>
          <div className="p-2 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">{data.expiringNext30Days}</div>
            <div className="text-xs text-orange-600">Next 30 Days</div>
          </div>
          <div className="p-2 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{data.requiresRenewal}</div>
            <div className="text-xs text-yellow-600">Needs Renewal</div>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{data.pendingApproval}</div>
            <div className="text-xs text-blue-600">Pending Approval</div>
          </div>
        </div>
        
        {/* Expiring contracts list */}
        <div className="space-y-2">
          {data.contracts.slice(0, 4).map(contract => (
            <div 
              key={contract.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => onViewContract?.(contract.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{contract.name}</div>
                <div className="text-xs text-gray-500">{contract.client}</div>
              </div>
              <Badge 
                variant="outline"
                className={cn(
                  contract.daysUntilExpiry <= 0 && 'bg-red-50 text-red-700 border-red-300',
                  contract.daysUntilExpiry > 0 && contract.daysUntilExpiry <= 30 && 'bg-orange-50 text-orange-700 border-orange-300',
                  contract.daysUntilExpiry > 30 && 'bg-gray-50 text-gray-700',
                )}
              >
                {contract.daysUntilExpiry <= 0 
                  ? 'Expired' 
                  : `${contract.daysUntilExpiry}d`}
              </Badge>
            </div>
          ))}
        </div>
        
        {data.contracts.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            No contract alerts
          </div>
        )}
        
        {onViewAll && data.contracts.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-4" onClick={onViewAll}>
            View All Contracts
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Request Pipeline Widget
// ============================================================================

interface RequestPipelineWidgetProps {
  data: RequestPipelineData;
  onViewRequest?: (id: string) => void;
  onViewAll?: () => void;
}

export function RequestPipelineWidget({ 
  data, 
  onViewRequest,
  onViewAll 
}: RequestPipelineWidgetProps) {
  const statusColors = {
    draft: 'bg-gray-200',
    pending: 'bg-yellow-400',
    approved: 'bg-green-400',
    rejected: 'bg-red-400',
    completed: 'bg-blue-400',
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Request Pipeline
          </CardTitle>
          <Badge variant="outline">{data.total} active</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Pipeline visualization */}
        <div className="mb-4">
          <div className="flex h-3 rounded-full overflow-hidden">
            {Object.entries(data.byStatus).map(([status, count]) => (
              count > 0 && (
                <div
                  key={status}
                  className={cn(statusColors[status as keyof typeof statusColors])}
                  style={{ width: `${(count / data.total) * 100}%` }}
                />
              )
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Draft: {data.byStatus.draft}</span>
            <span>Pending: {data.byStatus.pending}</span>
            <span>Approved: {data.byStatus.approved}</span>
          </div>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-lg font-semibold">{data.avgProcessingTime}h</div>
            <div className="text-xs text-gray-500">Avg Processing Time</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className={cn(
              'text-lg font-semibold',
              data.slaCompliance >= 90 ? 'text-green-600' : 
              data.slaCompliance >= 70 ? 'text-orange-600' : 'text-red-600'
            )}>
              {data.slaCompliance}%
            </div>
            <div className="text-xs text-gray-500">SLA Compliance</div>
          </div>
        </div>
        
        {/* Recent requests */}
        <div className="space-y-2">
          {data.recentRequests.slice(0, 3).map(request => (
            <div
              key={request.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => onViewRequest?.(request.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{request.title}</div>
                <div className="text-xs text-gray-500">
                  {new Date(request.createdAt).toLocaleDateString()}
                </div>
              </div>
              <Badge variant={
                request.status === 'approved' ? 'default' :
                request.status === 'rejected' ? 'destructive' :
                'secondary'
              }>
                {request.status}
              </Badge>
            </div>
          ))}
        </div>
        
        {onViewAll && (
          <Button variant="ghost" size="sm" className="w-full mt-4" onClick={onViewAll}>
            View All Requests
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Team Capacity Widget
// ============================================================================

interface TeamCapacityWidgetProps {
  data: TeamCapacityData;
  onViewDetails?: () => void;
}

export function TeamCapacityWidget({ data, onViewDetails }: TeamCapacityWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Team Capacity
          </CardTitle>
          <Badge 
            variant="outline"
            className={cn(
              data.utilizationRate >= 90 && 'bg-red-50 text-red-700 border-red-300',
              data.utilizationRate >= 70 && data.utilizationRate < 90 && 'bg-green-50 text-green-700 border-green-300',
              data.utilizationRate < 70 && 'bg-yellow-50 text-yellow-700 border-yellow-300',
            )}
          >
            {data.utilizationRate}% utilized
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Capacity overview */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xl font-bold">{data.totalResources}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-xl font-bold text-blue-700">{data.allocated}</div>
            <div className="text-xs text-blue-600">Allocated</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-xl font-bold text-green-700">{data.available}</div>
            <div className="text-xs text-green-600">Available</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="text-xl font-bold text-orange-700">{data.onBench}</div>
            <div className="text-xs text-orange-600">On Bench</div>
          </div>
        </div>
        
        {/* Over-allocation warning */}
        {data.overAllocated > 0 && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {data.overAllocated} resources over-allocated
              </span>
            </div>
          </div>
        )}
        
        {/* Department breakdown */}
        <div className="space-y-3">
          {data.byDepartment.slice(0, 4).map(dept => {
            const utilization = (dept.allocated / dept.total) * 100;
            return (
              <div key={dept.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{dept.name}</span>
                  <span className="text-gray-500">
                    {dept.allocated}/{dept.total} ({utilization.toFixed(0)}%)
                  </span>
                </div>
                <Progress 
                  value={utilization} 
                  className={cn(
                    'h-2',
                    utilization > 100 && '[&>div]:bg-red-500',
                    utilization >= 90 && utilization <= 100 && '[&>div]:bg-orange-500',
                  )}
                />
              </div>
            );
          })}
        </div>
        
        {onViewDetails && (
          <Button variant="ghost" size="sm" className="w-full mt-4" onClick={onViewDetails}>
            View All Resources
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number, currency: string = 'USD'): string {
  if (currency === 'INR') {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Exports
// ============================================================================

// Type exports (interfaces need to be exported)
export type { BudgetHealthData, ContractAlertData as ContractAlert, RequestPipelineData, TeamCapacityData };
