// Hooks barrel export
export {
  usePermissions,
  MODULES,
  ACTIONS,
  SCOPES,
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  canAccessModule,
} from './usePermissions';

export type {
  UserPermissions,
  UsePermissionsReturn,
} from './usePermissions';

export {
  useWebSocket,
  useNotifications,
  WS_EVENTS,
} from './useWebSocket';

export type {
  WebSocketMessage,
  NotificationPayload,
  NotificationCountPayload,
  UseNotificationsOptions,
  UseNotificationsReturn,
} from './useWebSocket';
