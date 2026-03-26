/**
 * Idle Session Timeout Hook
 * M-14: Automatically logout user after period of inactivity
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

/** Idle timeout in milliseconds (30 minutes) */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Warning before timeout in milliseconds (2 minutes before) */
const WARNING_BEFORE_MS = 2 * 60 * 1000;

/** Events that reset the idle timer */
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function useIdleTimeout() {
  const { isAuthenticated, clearAuth } = useAuthStore();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    if (!isAuthenticated) return;

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      // Could show a warning dialog here
      console.warn('Session will expire due to inactivity in 2 minutes');
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Set logout timer
    idleTimerRef.current = setTimeout(() => {
      console.warn('Session expired due to inactivity');
      clearAuth();
      window.location.href = '/login';
    }, IDLE_TIMEOUT_MS);
  }, [isAuthenticated, clearAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Start timers
    resetTimers();

    // Listen for activity events
    const handleActivity = () => resetTimers();
    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, resetTimers]);
}
