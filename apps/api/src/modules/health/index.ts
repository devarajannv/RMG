/**
 * Health Module Exports
 */

export { healthRoutes } from './health.controller';
export { 
  recordRequest, 
  incrementConnections, 
  decrementConnections,
  recordCircuitBreaker,
  collectMetrics,
  getMetricsText,
  resetMetrics 
} from './metrics';
