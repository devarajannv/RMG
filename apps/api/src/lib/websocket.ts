/**
 * WebSocket Server
 * Real-time communication layer for notifications and live updates
 * 
 * Architecture:
 * - WebSocket server attached to HTTP server
 * - JWT authentication on connection
 * - Room-based message routing (user rooms, tenant rooms)
 * - Heartbeat for connection health
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server } from 'http';
import { verifyToken } from './jwt';
import { logger } from './logger';
import { parse as parseUrl } from 'url';

// ============================================================================
// Types
// ============================================================================

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  tenantId?: string;
  isAlive: boolean;
  lastHeartbeat: number;
}

interface WebSocketMessage {
  type: string;
  payload: unknown;
}

interface BroadcastOptions {
  excludeUserId?: string;
  tenantId?: string;
}

// ============================================================================
// WebSocket Server Class
// ============================================================================

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map(); // userId -> connections
  private tenantClients: Map<string, Set<AuthenticatedWebSocket>> = new Map(); // tenantId -> connections
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error });
    });

    // Start heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 30000); // 30 seconds

    logger.info('WebSocket server initialized', { path: '/ws' });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, request: { url?: string }): Promise<void> {
    const client = ws as AuthenticatedWebSocket;
    client.isAlive = true;
    client.lastHeartbeat = Date.now();

    try {
      // Extract token from URL query string
      const url = parseUrl(request.url || '', true);
      const token = url.query.token as string;

      if (!token) {
        this.sendError(client, 'Authentication required');
        client.close(4001, 'Authentication required');
        return;
      }

      // Verify JWT token
      const payload = verifyToken(token);
      if (!payload || !payload.userId || !payload.tenantId) {
        this.sendError(client, 'Invalid token');
        client.close(4002, 'Invalid token');
        return;
      }

      client.userId = payload.userId;
      client.tenantId = payload.tenantId;

      // Add to client maps
      this.addClient(client);

      // Send connection success
      this.send(client, {
        type: 'connected',
        payload: { 
          userId: client.userId,
          message: 'WebSocket connection established',
        },
      });

      logger.info('WebSocket client connected', { 
        userId: client.userId, 
        tenantId: client.tenantId,
      });

      // Setup event handlers
      client.on('message', (data) => this.handleMessage(client, data));
      client.on('close', () => this.handleClose(client));
      client.on('error', (error) => this.handleError(client, error));
      client.on('pong', () => {
        client.isAlive = true;
        client.lastHeartbeat = Date.now();
      });

    } catch (error) {
      logger.error('WebSocket connection error', { error });
      this.sendError(client, 'Connection failed');
      client.close(4000, 'Connection failed');
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(client: AuthenticatedWebSocket, data: RawData): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;

      switch (message.type) {
        case 'ping':
          this.send(client, { type: 'pong', payload: { timestamp: Date.now() } });
          break;

        case 'subscribe':
          // Handle room subscriptions if needed
          logger.debug('Client subscribe request', { 
            userId: client.userId, 
            payload: message.payload,
          });
          break;

        default:
          logger.debug('Unknown message type', { type: message.type });
      }
    } catch {
      logger.warn('Invalid WebSocket message format');
    }
  }

  /**
   * Handle client disconnect
   */
  private handleClose(client: AuthenticatedWebSocket): void {
    this.removeClient(client);
    logger.info('WebSocket client disconnected', { userId: client.userId });
  }

  /**
   * Handle client error
   */
  private handleError(client: AuthenticatedWebSocket, error: Error): void {
    logger.error('WebSocket client error', { userId: client.userId, error });
    this.removeClient(client);
  }

  /**
   * Add client to tracking maps
   */
  private addClient(client: AuthenticatedWebSocket): void {
    if (!client.userId || !client.tenantId) return;

    // Add to user map
    if (!this.clients.has(client.userId)) {
      this.clients.set(client.userId, new Set());
    }
    this.clients.get(client.userId)!.add(client);

    // Add to tenant map
    if (!this.tenantClients.has(client.tenantId)) {
      this.tenantClients.set(client.tenantId, new Set());
    }
    this.tenantClients.get(client.tenantId)!.add(client);
  }

  /**
   * Remove client from tracking maps
   */
  private removeClient(client: AuthenticatedWebSocket): void {
    if (client.userId) {
      const userClients = this.clients.get(client.userId);
      if (userClients) {
        userClients.delete(client);
        if (userClients.size === 0) {
          this.clients.delete(client.userId);
        }
      }
    }

    if (client.tenantId) {
      const tenantClients = this.tenantClients.get(client.tenantId);
      if (tenantClients) {
        tenantClients.delete(client);
        if (tenantClients.size === 0) {
          this.tenantClients.delete(client.tenantId);
        }
      }
    }
  }

  /**
   * Check heartbeats and disconnect stale clients
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = 60000; // 60 seconds

    this.clients.forEach((clients) => {
      clients.forEach((client) => {
        if (!client.isAlive || now - client.lastHeartbeat > timeout) {
          logger.debug('Terminating stale WebSocket connection', { userId: client.userId });
          client.terminate();
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    });
  }

  /**
   * Send message to a specific client
   */
  send(client: AuthenticatedWebSocket, message: WebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to client
   */
  private sendError(client: AuthenticatedWebSocket, error: string): void {
    this.send(client, { type: 'error', payload: { message: error } });
  }

  // ============================================================================
  // Public API for sending messages
  // ============================================================================

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, type: string, payload: unknown): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const message: WebSocketMessage = { type, payload };
    userClients.forEach((client) => {
      this.send(client, message);
    });

    logger.debug('Sent message to user', { userId, type, clientCount: userClients.size });
  }

  /**
   * Send notification to multiple users
   */
  sendToUsers(userIds: string[], type: string, payload: unknown): void {
    userIds.forEach((userId) => this.sendToUser(userId, type, payload));
  }

  /**
   * Broadcast to all clients in a tenant
   */
  broadcastToTenant(tenantId: string, type: string, payload: unknown, options?: BroadcastOptions): void {
    const tenantClients = this.tenantClients.get(tenantId);
    if (!tenantClients) return;

    const message: WebSocketMessage = { type, payload };
    let count = 0;

    tenantClients.forEach((client) => {
      if (options?.excludeUserId && client.userId === options.excludeUserId) {
        return;
      }
      this.send(client, message);
      count++;
    });

    logger.debug('Broadcast to tenant', { tenantId, type, clientCount: count });
  }

  /**
   * Get connection stats
   */
  getStats(): { totalConnections: number; totalUsers: number; totalTenants: number } {
    let totalConnections = 0;
    this.clients.forEach((clients) => {
      totalConnections += clients.size;
    });

    return {
      totalConnections,
      totalUsers: this.clients.size,
      totalTenants: this.tenantClients.size,
    };
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    const userClients = this.clients.get(userId);
    return userClients !== undefined && userClients.size > 0;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.clients.forEach((client) => {
        client.close(1000, 'Server shutting down');
      });
      this.wss.close();
    }

    this.clients.clear();
    this.tenantClients.clear();
    logger.info('WebSocket server shutdown complete');
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();

// ============================================================================
// Notification Event Types
// ============================================================================

export const WS_EVENTS = {
  // Connection events
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  
  // Notification events
  NOTIFICATION: 'notification',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_COUNT: 'notification:count',
  
  // Request events
  REQUEST_CREATED: 'request:created',
  REQUEST_UPDATED: 'request:updated',
  REQUEST_STATUS_CHANGED: 'request:status_changed',
  REQUEST_ASSIGNED: 'request:assigned',
  REQUEST_COMMENT_ADDED: 'request:comment_added',
  
  // Approval events
  APPROVAL_REQUIRED: 'approval:required',
  APPROVAL_COMPLETED: 'approval:completed',
  APPROVAL_REJECTED: 'approval:rejected',
  
  // Resource events
  RESOURCE_UPDATED: 'resource:updated',
  RESOURCE_ALLOCATION_CHANGED: 'resource:allocation_changed',
  
  // System events
  SYSTEM_ANNOUNCEMENT: 'system:announcement',
} as const;

export type WsEventType = typeof WS_EVENTS[keyof typeof WS_EVENTS];
