/**
 * Notification Panel Component
 * Real-time notification display with WebSocket support
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { useNotifications, NotificationPayload } from '../../hooks/useWebSocket';
import { api } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    unreadCount: number;
  };
}

interface UnreadCountResponse {
  success: boolean;
  data: { unreadCount: number };
}

// ============================================================================
// Notification Type Styling
// ============================================================================

const getNotificationStyle = (type: string): { color: string; icon: string } => {
  const styles: Record<string, { color: string; icon: string }> = {
    REQUEST_ASSIGNED: { color: 'bg-blue-500', icon: '📋' },
    REQUEST_APPROVED: { color: 'bg-green-500', icon: '✅' },
    REQUEST_REJECTED: { color: 'bg-red-500', icon: '❌' },
    REQUEST_COMMENTED: { color: 'bg-purple-500', icon: '💬' },
    APPROVAL_REQUIRED: { color: 'bg-orange-500', icon: '⏳' },
    SLA_WARNING: { color: 'bg-yellow-500', icon: '⚠️' },
    SLA_BREACH: { color: 'bg-red-600', icon: '🚨' },
    SYSTEM: { color: 'bg-gray-500', icon: '🔔' },
    ROLLOFF_ALERT: { color: 'bg-orange-400', icon: '📅' },
    UTILIZATION_TARGET: { color: 'bg-green-400', icon: '📊' },
  };
  return styles[type] || { color: 'bg-gray-400', icon: '🔔' };
};

// ============================================================================
// Notification Item Component
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClick?: () => void;
}

function NotificationItem({ notification, onMarkRead, onClick }: NotificationItemProps) {
  const style = getNotificationStyle(notification.type);
  
  return (
    <div 
      className={`flex gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors ${
        notification.isRead ? 'opacity-60' : ''
      }`}
      onClick={() => {
        if (!notification.isRead) {
          onMarkRead(notification.id);
        }
        onClick?.();
      }}
    >
      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${style.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${notification.isRead ? '' : 'font-medium'}`}>
            <span className="mr-1">{style.icon}</span>
            {notification.title}
          </p>
          {notification.actionUrl && (
            <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const queryClient = useQueryClient();
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationsResponse>('/api/v1/notifications?limit=20'),
    enabled: isOpen,
    refetchOnWindowFocus: true,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<UnreadCountResponse>('/api/v1/notifications/unread-count'),
    refetchInterval: 60000, // Refetch every minute as fallback
  });

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/v1/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/api/v1/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // WebSocket for real-time updates
  const { unreadCount: wsUnreadCount } = useNotifications({
    onNotification: (payload: NotificationPayload) => {
      // Add new notification to the top of the list
      const newNotification: Notification = {
        id: payload.id || `temp-${Date.now()}`,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        actionUrl: payload.actionUrl,
        isRead: false,
        createdAt: payload.createdAt,
      };
      setLocalNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
    },
    onCountUpdate: () => {
      // Refetch data when count updates
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Merge server data with local WebSocket updates
  useEffect(() => {
    if (notificationsData?.data) {
      setLocalNotifications(notificationsData.data);
    }
  }, [notificationsData]);

  // Calculate unread count (prefer WebSocket count, fallback to API)
  const unreadCount = wsUnreadCount || unreadData?.data?.unreadCount || notificationsData?.meta?.unreadCount || 0;

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-primary text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              className="h-8 px-2 text-xs"
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
          </div>
        ) : localNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {localNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                onClick={() => {
                  if (notification.actionUrl) {
                    // Validate URL is relative or same-origin to prevent open redirect
                    try {
                      const url = new URL(notification.actionUrl, window.location.origin);
                      if (url.origin === window.location.origin) {
                        window.location.href = url.pathname + url.search + url.hash;
                      }
                    } catch {
                      // If URL is relative path, use it directly
                      if (notification.actionUrl.startsWith('/') && !notification.actionUrl.startsWith('//')) {
                        window.location.href = notification.actionUrl;
                      }
                    }
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-primary"
          onClick={() => {
            onClose();
            window.location.href = '/settings?tab=notifications';
          }}
        >
          View all & manage preferences
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Notification Bell with Badge
// ============================================================================

interface NotificationBellProps {
  onClick: () => void;
  isOpen: boolean;
}

export function NotificationBell({ onClick, isOpen }: NotificationBellProps) {
  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<UnreadCountResponse>('/api/v1/notifications/unread-count'),
    refetchInterval: 60000,
  });

  // WebSocket for real-time count updates
  const { unreadCount: wsUnreadCount, isConnected } = useNotifications();

  const unreadCount = wsUnreadCount || unreadData?.data?.unreadCount || 0;

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className={`relative rounded-xl hover:bg-gray-100 ${isOpen ? 'bg-gray-100' : ''}`}
      onClick={onClick}
    >
      <Bell className="h-5 w-5 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-[#F7941D] text-[10px] font-medium text-white items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </span>
      )}
      {/* WebSocket connection indicator */}
      <span 
        className={`absolute right-1 bottom-1 h-2 w-2 rounded-full ring-2 ring-white ${
          isConnected ? 'bg-green-500' : 'bg-gray-300'
        }`}
        title={isConnected ? 'Live updates enabled' : 'Connecting...'}
      />
    </Button>
  );
}

export default NotificationPanel;
