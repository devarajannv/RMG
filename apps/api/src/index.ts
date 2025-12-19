import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';
import { config } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { swaggerSpec } from './config/swagger';
import { wsManager } from './lib/websocket';

// Route imports
import authRoutes from './modules/auth/auth.controller';
import microsoftAuthRoutes from './modules/auth/microsoft.controller';
import { resourceRoutes, skillRoutes, importRoutes } from './modules/resources';
import { clientRoutes, contractRoutes } from './modules/clients';
import { projectRoutes } from './modules/projects';
import { allocationRoutes } from './modules/allocations';
import { dashboardRoutes } from './modules/dashboard';
import { timesheetRouter } from './modules/timesheets';
import { benchRoutes } from './modules/bench';
import { intelligenceRoutes } from './modules/intelligence';
import { analyticsRoutes } from './modules/analytics';
import { exportRoutes } from './modules/export';
import { importRoutes as bulkImportRoutes } from './modules/import';
import { webhookRoutes } from './modules/webhooks';
import { currencyRoutes } from './modules/currency';
import { roleRoutes } from './modules/roles';
import { documentRoutes } from './modules/documents';
import { agentRoutes } from './modules/agent';
import { aiMigrationRoutes } from './modules/ai-migration';
import { requestRoutes, requestTypesRoutes, approvalChainRoutes, delegationRoutes, slaRoutes, notificationRoutes } from './modules/requests';

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(config.cookieSecret));

// Request logging
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

// API Info
app.get('/api/v1', (_req, res) => {
  res.json({
    name: 'RMGaaS API',
    version: '0.1.0',
    docs: '/api-docs',
  });
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'RMGaaS API Documentation',
}));

// OpenAPI spec endpoint
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/microsoft', microsoftAuthRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/resources/import', importRoutes);
app.use('/api/v1/skills', skillRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/allocations', allocationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/timesheets', timesheetRouter);
app.use('/api/v1/bench', benchRoutes);
app.use('/api/v1/intelligence', intelligenceRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/import', bulkImportRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/currency', currencyRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/agent', agentRoutes);
app.use('/api/v1/ai-migration', aiMigrationRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/request-types', requestTypesRoutes);
app.use('/api/v1/approval-chains', approvalChainRoutes);
app.use('/api/v1/delegations', delegationRoutes);
app.use('/api/v1/sla', slaRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Error handling
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
wsManager.initialize(server);

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  logger.info(`🚀 RMGaaS API running on port ${PORT}`);
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`🔗 API URL: ${config.apiUrl}`);
  logger.info(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  wsManager.shutdown();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
export { server };
