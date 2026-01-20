/**
 * ContractBudgetPanel Component
 * 
 * Budget integration panel for contracts:
 * - Real-time budget vs actual tracking
 * - Visual health indicators
 * - Burn rate analytics
 * - Revenue/cost breakdown
 * - Project-level budget allocation
 * 
 * Integrates with the Budget Tracking Service
 * 
 * @module ContractBudgetPanel
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PieChart,
  BarChart3,
  Target,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface BudgetMetrics {
  budgetHours: number;
  budgetAmount: number;
  actualHours: number;
  actualCost: number;
  estimatedRevenue: number;
  burnRateHours: number;
  burnRateCost: number;
  varianceHours: number;
  varianceCost: number;
  remainingHours: number;
  remainingBudget: number;
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  grossMargin: number;
  projectedCompletion: string | null;
  alerts: BudgetAlert[];
}

interface BudgetAlert {
  type: 'WARNING' | 'CRITICAL' | 'INFO';
  code: string;
  message: string;
  value?: number;
  threshold?: number;
}

interface ProjectBudget {
  projectId: string;
  projectCode: string;
  projectName: string;
  budgetHours: number;
  budgetAmount: number;
  actualHours: number;
  actualCost: number;
  burnRate: number;
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
}

interface ContractBudgetPanelProps {
  contractId: string;
  contractValue?: number;
  currency?: string;
  projects?: Array<{
    id: string;
    code: string;
    name: string;
    budgetHours?: number;
    budgetAmount?: number;
  }>;
  onViewDetails?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const HEALTH_CONFIG = {
  HEALTHY: {
    label: 'On Track',
    color: 'text-green-700 bg-green-100',
    icon: CheckCircle2,
    borderColor: 'border-green-200',
  },
  AT_RISK: {
    label: 'At Risk',
    color: 'text-yellow-700 bg-yellow-100',
    icon: AlertTriangle,
    borderColor: 'border-yellow-200',
  },
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-700 bg-red-100',
    icon: AlertTriangle,
    borderColor: 'border-red-200',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number, currency: string = 'USD'): string {
  if (currency === 'INR') {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function formatHours(hours: number): string {
  return `${hours.toFixed(0)}h`;
}

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercent?: boolean;
  colorClass?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
}

function ProgressBar({
  value,
  max,
  label,
  showPercent = true,
  colorClass,
  warningThreshold = 75,
  criticalThreshold = 90,
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  
  const getColor = () => {
    if (colorClass) return colorClass;
    if (percent >= criticalThreshold) return 'bg-red-500';
    if (percent >= warningThreshold) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div>
      {label && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{label}</span>
          {showPercent && <span className="font-medium">{percent.toFixed(0)}%</span>}
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', getColor())}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Metric Card Component
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

function MetricCard({ label, value, subValue, icon: Icon, trend, trendValue, className }: MetricCardProps) {
  return (
    <div className={cn('p-4 rounded-lg', className || 'bg-gray-50')}>
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="text-sm text-gray-500">{subValue}</p>}
      {trend && trendValue && (
        <div
          className={cn(
            'flex items-center gap-1 text-sm mt-1',
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          )}
        >
          {trend === 'up' ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : trend === 'down' ? (
            <ArrowDownRight className="h-4 w-4" />
          ) : null}
          {trendValue}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Alert Item Component
// ============================================================================

interface AlertItemProps {
  alert: BudgetAlert;
}

function AlertItem({ alert }: AlertItemProps) {
  const colors = {
    CRITICAL: 'bg-red-50 border-red-200 text-red-700',
    WARNING: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    INFO: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={cn('p-3 rounded-lg border text-sm', colors[alert.type])}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>{alert.message}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Project Budget Row Component
// ============================================================================

interface ProjectBudgetRowProps {
  project: ProjectBudget;
  currency: string;
  onClick?: () => void;
}

function ProjectBudgetRow({ project, currency, onClick }: ProjectBudgetRowProps) {
  const healthConfig = HEALTH_CONFIG[project.healthStatus];
  const HealthIcon = healthConfig.icon;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow',
        healthConfig.borderColor
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">{project.projectName}</p>
          <p className="text-sm text-gray-500">{project.projectCode}</p>
        </div>
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1', healthConfig.color)}>
          <HealthIcon className="h-3 w-3" />
          {healthConfig.label}
        </span>
      </div>
      <div className="mt-3">
        <ProgressBar
          value={project.actualCost}
          max={project.budgetAmount}
          label={`Budget: ${formatCurrency(project.actualCost, currency)} / ${formatCurrency(project.budgetAmount, currency)}`}
        />
      </div>
      <div className="flex justify-between text-sm text-gray-500 mt-2">
        <span>Hours: {formatHours(project.actualHours)} / {formatHours(project.budgetHours)}</span>
        <span>Burn Rate: {project.burnRate.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ContractBudgetPanel({
  contractId,
  contractValue = 0,
  currency = 'INR',
  projects = [],
  onViewDetails,
}: ContractBudgetPanelProps) {
  // Fetch budget metrics for all projects under this contract
  const { data: budgetData, isLoading } = useQuery({
    queryKey: ['contract-budget', contractId],
    queryFn: async () => {
      const projectIds = projects.map((p) => p.id);
      if (projectIds.length === 0) return null;

      // Fetch budget status for each project
      const results = await Promise.all(
        projectIds.map((id) =>
          api.get<{ data: BudgetMetrics }>(`/analytics/budget/projects/${id}/budget`).catch(() => null)
        )
      );

      return results
        .map((r, i) => (r ? { ...r.data, project: projects[i] } : null))
        .filter(Boolean);
    },
    enabled: projects.length > 0,
  });

  // Aggregate metrics
  const aggregatedMetrics = useMemo(() => {
    if (!budgetData || budgetData.length === 0) {
      return {
        totalBudgetHours: 0,
        totalBudgetAmount: contractValue,
        totalActualHours: 0,
        totalActualCost: 0,
        totalEstimatedRevenue: 0,
        overallBurnRate: 0,
        overallHealthStatus: 'HEALTHY' as const,
        alerts: [] as BudgetAlert[],
        projectBudgets: [] as ProjectBudget[],
      };
    }

    const totals = budgetData.reduce(
      (acc, item: any) => {
        acc.totalBudgetHours += item.budgetHours || 0;
        acc.totalBudgetAmount += item.budgetAmount || 0;
        acc.totalActualHours += item.actualHours || 0;
        acc.totalActualCost += item.actualCost || 0;
        acc.totalEstimatedRevenue += item.estimatedRevenue || 0;
        acc.alerts.push(...(item.alerts || []));
        acc.projectBudgets.push({
          projectId: item.project.id,
          projectCode: item.project.code,
          projectName: item.project.name,
          budgetHours: item.budgetHours || 0,
          budgetAmount: item.budgetAmount || 0,
          actualHours: item.actualHours || 0,
          actualCost: item.actualCost || 0,
          burnRate: item.burnRateCost || 0,
          healthStatus: item.healthStatus || 'HEALTHY',
        });
        return acc;
      },
      {
        totalBudgetHours: 0,
        totalBudgetAmount: 0,
        totalActualHours: 0,
        totalActualCost: 0,
        totalEstimatedRevenue: 0,
        alerts: [] as BudgetAlert[],
        projectBudgets: [] as ProjectBudget[],
      }
    );

    // Use contract value if higher
    if (contractValue > totals.totalBudgetAmount) {
      totals.totalBudgetAmount = contractValue;
    }

    const overallBurnRate =
      totals.totalBudgetAmount > 0
        ? (totals.totalActualCost / totals.totalBudgetAmount) * 100
        : 0;

    let overallHealthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL' = 'HEALTHY';
    if (totals.projectBudgets.some((p) => p.healthStatus === 'CRITICAL')) {
      overallHealthStatus = 'CRITICAL';
    } else if (totals.projectBudgets.some((p) => p.healthStatus === 'AT_RISK')) {
      overallHealthStatus = 'AT_RISK';
    }

    return {
      ...totals,
      overallBurnRate,
      overallHealthStatus,
    };
  }, [budgetData, contractValue]);

  const healthConfig = HEALTH_CONFIG[aggregatedMetrics.overallHealthStatus];
  const HealthIcon = healthConfig.icon;

  const grossMargin =
    aggregatedMetrics.totalEstimatedRevenue > 0
      ? ((aggregatedMetrics.totalEstimatedRevenue - aggregatedMetrics.totalActualCost) /
          aggregatedMetrics.totalEstimatedRevenue) *
        100
      : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-gray-400" />
          Budget Overview
        </CardTitle>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1',
              healthConfig.color
            )}
          >
            <HealthIcon className="h-4 w-4" />
            {healthConfig.label}
          </span>
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {/* No Projects */}
        {!isLoading && projects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <PieChart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No projects linked to this contract</p>
            <p className="text-sm mt-1">Link projects to see budget tracking</p>
          </div>
        )}

        {/* Budget Overview */}
        {!isLoading && projects.length > 0 && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Contract Value"
                value={formatCurrency(aggregatedMetrics.totalBudgetAmount, currency)}
                icon={DollarSign}
                className="bg-blue-50"
              />
              <MetricCard
                label="Spent"
                value={formatCurrency(aggregatedMetrics.totalActualCost, currency)}
                subValue={`${aggregatedMetrics.overallBurnRate.toFixed(0)}% of budget`}
                icon={TrendingDown}
                className={
                  aggregatedMetrics.overallBurnRate > 90
                    ? 'bg-red-50'
                    : aggregatedMetrics.overallBurnRate > 75
                    ? 'bg-yellow-50'
                    : 'bg-gray-50'
                }
              />
              <MetricCard
                label="Remaining"
                value={formatCurrency(
                  aggregatedMetrics.totalBudgetAmount - aggregatedMetrics.totalActualCost,
                  currency
                )}
                icon={Wallet}
                className="bg-green-50"
              />
              <MetricCard
                label="Gross Margin"
                value={`${grossMargin.toFixed(1)}%`}
                icon={TrendingUp}
                trend={grossMargin >= 20 ? 'up' : grossMargin >= 10 ? 'neutral' : 'down'}
                trendValue={grossMargin >= 20 ? 'Healthy' : grossMargin >= 10 ? 'Moderate' : 'Low'}
                className={grossMargin >= 20 ? 'bg-green-50' : grossMargin >= 10 ? 'bg-yellow-50' : 'bg-red-50'}
              />
            </div>

            {/* Hours Progress */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <span className="font-medium">Hours Utilization</span>
              </div>
              <ProgressBar
                value={aggregatedMetrics.totalActualHours}
                max={aggregatedMetrics.totalBudgetHours}
                label={`${formatHours(aggregatedMetrics.totalActualHours)} / ${formatHours(aggregatedMetrics.totalBudgetHours)} budgeted`}
              />
            </div>

            {/* Budget Progress */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-gray-400" />
                <span className="font-medium">Cost Utilization</span>
              </div>
              <ProgressBar
                value={aggregatedMetrics.totalActualCost}
                max={aggregatedMetrics.totalBudgetAmount}
                label={`${formatCurrency(aggregatedMetrics.totalActualCost, currency)} / ${formatCurrency(aggregatedMetrics.totalBudgetAmount, currency)}`}
              />
            </div>

            {/* Alerts */}
            {aggregatedMetrics.alerts.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Alerts ({aggregatedMetrics.alerts.length})
                </h4>
                <div className="space-y-2">
                  {aggregatedMetrics.alerts.slice(0, 3).map((alert, idx) => (
                    <AlertItem key={idx} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Project Breakdown */}
            {aggregatedMetrics.projectBudgets.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-gray-400" />
                  Project Breakdown
                </h4>
                <div className="space-y-3">
                  {aggregatedMetrics.projectBudgets.map((project) => (
                    <ProjectBudgetRow
                      key={project.projectId}
                      project={project}
                      currency={currency}
                      onClick={() => window.open(`/projects/${project.projectId}`, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
