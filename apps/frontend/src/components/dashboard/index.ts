/**
 * Dashboard Components Index
 * Export all dashboard-related components and widgets
 */

export {
  BudgetHealthWidget,
  ContractAlertsWidget,
  RequestPipelineWidget,
  TeamCapacityWidget,
} from './DashboardWidgets';

// Re-export types
export type {
  BudgetHealthData,
  ContractAlert,
  RequestPipelineData,
  TeamCapacityData,
} from './DashboardWidgets';
