/**
 * Settings Components Index
 * Export all settings-related components
 */

export { NotificationSettings } from './NotificationSettings';
export { IntegrationSettings } from './IntegrationSettings';
export { WorkflowSettings } from './WorkflowSettings';

// Re-export types for convenience
export type {
  NotificationPreferences,
} from './NotificationSettings';

export type {
  // Integration types
  Integration,
  Webhook,
} from './IntegrationSettings';

export type {
  // Workflow settings types
  WorkflowTemplate,
  WorkflowStep,
  SLAConfig,
  EscalationRule,
} from './WorkflowSettings';
