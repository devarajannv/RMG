/**
 * WebSocket Hook
 * Real-time connection to the server for live notifications and updates
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

// ============================================================================
// Types
// ============================================================================

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
}

export interface NotificationPayload {
  id?: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationCountPayload {
  unreadCount: number;
}

type MessageHandler<T = unknown> = (payload: T) => void;

interface UseWebSocketOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: <T>(event: string, handler: MessageHandler<T>) => () => void;
  send: (type: string, payload: unknown) => void;
}

// ============================================================================
// WebSocket Events
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

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    onConnected,
    onDisconnected,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const { accessToken, isAuthenticated } = useAuthStore();

  // Get WebSocket URL — C-08: No token in URL query string
  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `${protocol}//${host}/ws`;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');
    
    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected, sending auth...');
        // C-08: Send auth token via message instead of URL query
        ws.send(JSON.stringify({ type: 'auth', payload: { token: accessToken } }));
        setConnectionState('connected');
        reconnectCountRef.current = 0;
        onConnected?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          const handlers = handlersRef.current.get(message.type);
          
          if (handlers) {
            handlers.forEach((handler) => handler(message.payload));
          }

          // Also notify 'all' handlers
          const allHandlers = handlersRef.current.get('*');
          if (allHandlers) {
            allHandlers.forEach((handler) => handler(message));
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected', { code: event.code, reason: event.reason });
        setConnectionState('disconnected');
        wsRef.current = null;
        onDisconnected?.();

        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && event.code !== 1001 && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`[WebSocket] Reconnecting (${reconnectCountRef.current}/${reconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = () => {
        console.error('[WebSocket] Error occurred');
        setConnectionState('error');
        onError?.('WebSocket connection error');
      };
    } catch (err) {
      console.error('[WebSocket] Failed to connect:', err);
      setConnectionState('error');
    }
  }, [isAuthenticated, accessToken, getWsUrl, onConnected, onDisconnected, onError, reconnectAttempts, reconnectInterval]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setConnectionState('disconnected');
  }, []);

  // Subscribe to an event
  const subscribe = useCallback(<T = unknown>(event: string, handler: MessageHandler<T>): (() => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    
    handlersRef.current.get(event)!.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      const handlers = handlersRef.current.get(event);
      if (handlers) {
        handlers.delete(handler as MessageHandler);
        if (handlers.size === 0) {
          handlersRef.current.delete(event);
        }
      }
    };
  }, []);

  // Send message
  const send = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WebSocket] Cannot send, not connected');
    }
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, accessToken, connect, disconnect]);

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    subscribe,
    send,
  };
}

// ============================================================================
// Notification-specific Hook
// ============================================================================

export interface UseNotificationsOptions {
  onNotification?: (notification: NotificationPayload) => void;
  onCountUpdate?: (count: number) => void;
}

export interface UseNotificationsReturn {
  isConnected: boolean;
  unreadCount: number;
  latestNotification: NotificationPayload | null;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { onNotification, onCountUpdate } = options;
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<NotificationPayload | null>(null);

  const { isConnected, subscribe } = useWebSocket();

  // Subscribe to notification events
  useEffect(() => {
    const unsubNotification = subscribe<NotificationPayload>(WS_EVENTS.NOTIFICATION, (payload) => {
      setLatestNotification(payload);
      onNotification?.(payload);
    });

    const unsubCount = subscribe<NotificationCountPayload>(WS_EVENTS.NOTIFICATION_COUNT, (payload) => {
      setUnreadCount(payload.unreadCount);
      onCountUpdate?.(payload.unreadCount);
    });

    return () => {
      unsubNotification();
      unsubCount();
    };
  }, [subscribe, onNotification, onCountUpdate]);

  return {
    isConnected,
    unreadCount,
    latestNotification,
  };
}
