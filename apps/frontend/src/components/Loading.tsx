import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Skeleton Component
// ============================================================================

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circular' | 'rectangular' | 'text';
  animation?: 'pulse' | 'wave' | 'none';
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({
  className,
  variant = 'default',
  animation = 'pulse',
  width,
  height,
  style: styleProp,
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    text: 'rounded h-4 w-full',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
    ...styleProp,
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Text Skeleton
// ============================================================================

interface TextSkeletonProps {
  lines?: number;
  lastLineWidth?: string;
  className?: string;
}

export function TextSkeleton({ lines = 3, lastLineWidth = '60%', className }: TextSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(
            'h-4',
            i === lines - 1 && lastLineWidth && `w-[${lastLineWidth}]`
          )}
          style={{ width: i === lines - 1 ? lastLineWidth : '100%' }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Card Skeleton
// ============================================================================

interface CardSkeletonProps {
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  contentLines?: number;
}

export function CardSkeleton({
  className,
  showHeader = true,
  showFooter = false,
  contentLines = 3,
}: CardSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      {showHeader && (
        <div className="p-4 border-b border-gray-100">
          <Skeleton className="h-5 w-1/3" />
        </div>
      )}
      <div className="p-4 space-y-3">
        <TextSkeleton lines={contentLines} />
      </div>
      {showFooter && (
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Table Skeleton
// ============================================================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {showHeader && (
            <thead className="bg-gray-50">
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <Skeleton 
                      className="h-4" 
                      style={{ width: `${60 + Math.random() * 40}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// List Skeleton
// ============================================================================

interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  className?: string;
}

export function ListSkeleton({
  items = 5,
  showAvatar = true,
  showActions = false,
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200"
        >
          {showAvatar && <Skeleton variant="circular" className="h-10 w-10 flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Form Skeleton
// ============================================================================

interface FormSkeletonProps {
  fields?: number;
  showActions?: boolean;
  className?: string;
}

export function FormSkeleton({ fields = 4, showActions = true, className }: FormSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {showActions && (
        <div className="flex justify-end gap-3 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Dashboard Skeleton
// ============================================================================

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton variant="circular" className="h-12 w-12" />
            </div>
            <Skeleton className="h-3 w-32 mt-3" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CardSkeleton contentLines={6} />
        </div>
        <div>
          <CardSkeleton contentLines={4} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Profile Skeleton
// ============================================================================

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Skeleton variant="circular" className="h-24 w-24" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton contentLines={4} />
        <CardSkeleton contentLines={4} />
      </div>
    </div>
  );
}

// ============================================================================
// Page Skeleton
// ============================================================================

interface PageSkeletonProps {
  showHeader?: boolean;
  showSidebar?: boolean;
  children?: React.ReactNode;
}

export function PageSkeleton({ showHeader = true, showSidebar = false, children }: PageSkeletonProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8" />
              <Skeleton variant="circular" className="h-10 w-10" />
            </div>
          </div>
        </header>
      )}
      <div className="flex">
        {showSidebar && (
          <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </aside>
        )}
        <main className="flex-1 p-6">{children || <DashboardSkeleton />}</main>
      </div>
    </div>
  );
}

// ============================================================================
// Loading Spinner
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

export function Spinner({ size = 'md', className, color }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-200',
        sizeClasses[size],
        className
      )}
      style={{
        borderTopColor: color || '#3b82f6',
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ============================================================================
// Loading Overlay
// ============================================================================

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  fullScreen?: boolean;
}

export function LoadingOverlay({ show, message, fullScreen = false }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50',
        fullScreen ? 'fixed inset-0' : 'absolute inset-0'
      )}
    >
      <Spinner size="lg" />
      {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
    </div>
  );
}

// ============================================================================
// Inline Loading
// ============================================================================

interface InlineLoadingProps {
  message?: string;
  className?: string;
}

export function InlineLoading({ message = 'Loading...', className }: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Spinner size="sm" />
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  );
}

// ============================================================================
// Progress Bar
// ============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'red';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  color = 'blue',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full transition-all duration-300 ease-out', colorClasses[color])}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(percentage)}%</p>
      )}
    </div>
  );
}

// ============================================================================
// Dots Loading
// ============================================================================

interface DotsLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function DotsLoading({ size = 'md', color = '#3b82f6', className }: DotsLoadingProps) {
  const sizeClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
  };

  return (
    <div className={cn('flex items-center gap-1', className)} role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn('rounded-full animate-bounce', sizeClasses[size])}
          style={{
            backgroundColor: color,
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton,
  DashboardSkeleton,
  ProfileSkeleton,
  PageSkeleton,
  Spinner,
  LoadingOverlay,
  InlineLoading,
  ProgressBar,
  DotsLoading,
};
