// Permission system exports
export {
  Can,
  CanAccess,
  Cannot,
  AdminOnly,
  ManagerOnly,
  ifCan,
  useRequirePermission,
} from './Can';

export type {
  // Re-export types from hook
} from '@/hooks/usePermissions';
