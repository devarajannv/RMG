/**
 * Accessibility Utilities
 * 
 * Provides hooks and utilities for building accessible React components.
 * Follows WCAG 2.1 AA guidelines.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Live Region Announcer
// ============================================================================

let liveRegion: HTMLDivElement | null = null;

/**
 * Initialize the live region for screen reader announcements
 */
function ensureLiveRegion(): HTMLDivElement {
  if (!liveRegion && typeof document !== 'undefined') {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(liveRegion);
  }
  return liveRegion!;
}

/**
 * Hook for making screen reader announcements
 */
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = ensureLiveRegion();
    region.setAttribute('aria-live', priority);
    
    // Clear and set to trigger announcement
    region.textContent = '';
    
    // Use requestAnimationFrame to ensure the DOM update triggers the announcement
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }, []);

  return announce;
}

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Hook for trapping focus within a container (for modals, dialogs)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Get focusable elements
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const getFocusableElements = () => {
      return container.querySelectorAll<HTMLElement>(focusableSelectors);
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle tab key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus when unmounting
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for managing focus return (useful for dialogs)
 */
export function useFocusReturn() {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    returnFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const returnFocus = useCallback(() => {
    if (returnFocusRef.current && returnFocusRef.current.focus) {
      returnFocusRef.current.focus();
    }
  }, []);

  return { saveFocus, returnFocus };
}

/**
 * Hook for roving tabindex navigation (for toolbars, menus)
 */
export function useRovingTabIndex<T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
  } = {}
) {
  const { orientation = 'horizontal', loop = true } = options;
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let newIndex = focusedIndex;
    
    const isNext = 
      (orientation !== 'vertical' && e.key === 'ArrowRight') ||
      (orientation !== 'horizontal' && e.key === 'ArrowDown');
    
    const isPrev = 
      (orientation !== 'vertical' && e.key === 'ArrowLeft') ||
      (orientation !== 'horizontal' && e.key === 'ArrowUp');

    if (isNext) {
      e.preventDefault();
      newIndex = focusedIndex + 1;
      if (newIndex >= items.length) {
        newIndex = loop ? 0 : items.length - 1;
      }
    } else if (isPrev) {
      e.preventDefault();
      newIndex = focusedIndex - 1;
      if (newIndex < 0) {
        newIndex = loop ? items.length - 1 : 0;
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = items.length - 1;
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      items[newIndex]?.focus();
    }
  }, [focusedIndex, items, orientation, loop]);

  const getTabIndex = useCallback((index: number) => {
    return index === focusedIndex ? 0 : -1;
  }, [focusedIndex]);

  return { focusedIndex, setFocusedIndex, handleKeyDown, getTabIndex };
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Hook for handling escape key
 */
export function useEscapeKey(callback: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback, isActive]);
}

/**
 * Hook for handling arrow key navigation
 */
export function useArrowNavigation(
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void,
  options: {
    preventDefault?: boolean;
    isActive?: boolean;
  } = {}
) {
  const { preventDefault = true, isActive = true } = options;

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      let direction: 'up' | 'down' | 'left' | 'right' | null = null;

      switch (e.key) {
        case 'ArrowUp':
          direction = 'up';
          break;
        case 'ArrowDown':
          direction = 'down';
          break;
        case 'ArrowLeft':
          direction = 'left';
          break;
        case 'ArrowRight':
          direction = 'right';
          break;
      }

      if (direction) {
        if (preventDefault) e.preventDefault();
        onNavigate(direction);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, preventDefault, isActive]);
}

// ============================================================================
// Skip Links
// ============================================================================

interface SkipLink {
  id: string;
  label: string;
}

/**
 * Component for skip navigation links
 */
export function SkipLinks({ links }: { links: SkipLink[] }) {
  return (
    <nav
      className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-0 focus-within:left-0 focus-within:z-50 focus-within:bg-white focus-within:p-4 focus-within:shadow-lg"
      aria-label="Skip navigation"
    >
      <ul className="flex gap-4">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={`#${link.id}`}
              className="text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ============================================================================
// Reduced Motion
// ============================================================================

/**
 * Hook for detecting reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// Form Accessibility
// ============================================================================

interface FieldDescriptionProps {
  id: string;
  error?: string;
  hint?: string;
}

/**
 * Get ARIA attributes for form fields
 */
export function getFieldAriaProps({ id, error, hint }: FieldDescriptionProps) {
  const describedBy: string[] = [];
  
  if (error) {
    describedBy.push(`${id}-error`);
  }
  if (hint) {
    describedBy.push(`${id}-hint`);
  }

  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
  };
}

/**
 * Component for visually hidden text (screen readers only)
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </span>
  );
}

// ============================================================================
// Accessible Icons
// ============================================================================

interface AccessibleIconProps {
  icon: React.ReactNode;
  label: string;
  decorative?: boolean;
}

/**
 * Wrapper for making icons accessible
 */
export function AccessibleIcon({ icon, label, decorative = false }: AccessibleIconProps) {
  if (decorative) {
    return <span aria-hidden="true">{icon}</span>;
  }

  return (
    <span role="img" aria-label={label}>
      {icon}
    </span>
  );
}

// ============================================================================
// Color Contrast Utilities
// ============================================================================

/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG requirements
 */
export function meetsContrastRequirement(
  ratio: number,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  // AA
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// ============================================================================
// ID Generator
// ============================================================================

let idCounter = 0;

/**
 * Generate unique IDs for accessibility attributes
 */
export function useUniqueId(prefix: string = 'id'): string {
  const [id] = useState(() => {
    idCounter += 1;
    return `${prefix}-${idCounter}`;
  });
  return id;
}

// ============================================================================
// Export
// ============================================================================

export const a11y = {
  useAnnounce,
  useFocusTrap,
  useFocusReturn,
  useRovingTabIndex,
  useEscapeKey,
  useArrowNavigation,
  useReducedMotion,
  useUniqueId,
  SkipLinks,
  VisuallyHidden,
  AccessibleIcon,
  getFieldAriaProps,
  getContrastRatio,
  meetsContrastRequirement,
};

export default a11y;
