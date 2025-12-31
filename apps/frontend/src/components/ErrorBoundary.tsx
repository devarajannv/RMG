import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetOnNavigate?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showStackTrace: boolean;
}

// ============================================================================
// Error Boundary Class Component
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStackTrace: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }

    // In production, you might want to log to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showStackTrace: false,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  toggleStackTrace = (): void => {
    this.setState(prev => ({ showStackTrace: !prev.showStackTrace }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showStackTrace } = this.state;
    const { children, fallback, showDetails = true, level = 'section' } = this.props;

    if (!hasError) {
      return children;
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Render appropriate error UI based on level
    return (
      <ErrorFallback
        error={error}
        errorInfo={errorInfo}
        showDetails={showDetails}
        showStackTrace={showStackTrace}
        level={level}
        onReset={this.handleReset}
        onReload={this.handleReload}
        onGoHome={this.handleGoHome}
        onToggleStackTrace={this.toggleStackTrace}
      />
    );
  }
}

// ============================================================================
// Error Fallback Component
// ============================================================================

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  showStackTrace: boolean;
  level: 'page' | 'section' | 'component';
  onReset: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onToggleStackTrace: () => void;
}

function ErrorFallback({
  error,
  errorInfo,
  showDetails,
  showStackTrace,
  level,
  onReset,
  onReload,
  onGoHome,
  onToggleStackTrace,
}: ErrorFallbackProps) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Component-level error: minimal display
  if (level === 'component') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Something went wrong</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="mt-2 text-red-600 hover:text-red-700"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Try again
        </Button>
      </div>
    );
  }

  // Section-level error: moderate display
  if (level === 'section') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Unable to load this section
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-600">
            An error occurred while loading this content. Please try again.
          </p>
          
          {showDetails && !isProduction && error && (
            <div className="p-3 bg-red-100 rounded-md">
              <p className="text-xs font-mono text-red-800">{error.message}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" size="sm" onClick={onReload}>
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Page-level error: full display
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-lg w-full">
        <Card className="border-red-200 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-gray-600">
              We encountered an unexpected error. Our team has been notified.
            </p>

            {showDetails && !isProduction && error && (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800">{error.name}</p>
                  <p className="text-sm text-red-700 mt-1">{error.message}</p>
                </div>

                {errorInfo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleStackTrace}
                    className="w-full justify-between text-gray-600"
                  >
                    <span className="flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Stack Trace
                    </span>
                    {showStackTrace ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}

                {showStackTrace && errorInfo && (
                  <div className="p-3 bg-gray-100 rounded-lg overflow-auto max-h-48">
                    <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button className="flex-1" onClick={onReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" className="flex-1" onClick={onGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              If this problem persists, please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// HOC: withErrorBoundary
// ============================================================================

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}

// ============================================================================
// Hook: useErrorHandler
// ============================================================================

/**
 * Hook to programmatically trigger error boundary
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error>();

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

// ============================================================================
// Async Error Boundary
// ============================================================================

interface AsyncErrorBoundaryProps extends ErrorBoundaryProps {
  suspenseFallback?: ReactNode;
}

export function AsyncErrorBoundary({
  children,
  suspenseFallback,
  ...errorBoundaryProps
}: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary {...errorBoundaryProps}>
      <React.Suspense
        fallback={
          suspenseFallback || (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

// ============================================================================
// Query Error Boundary (for React Query)
// ============================================================================

interface QueryErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function QueryErrorFallback({ error, resetErrorBoundary }: QueryErrorFallbackProps) {
  const isNetworkError = error.message.includes('network') || error.message.includes('fetch');
  const isAuthError = error.message.includes('401') || error.message.includes('unauthorized');

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-full">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-amber-900">
              {isNetworkError
                ? 'Connection Problem'
                : isAuthError
                ? 'Authentication Required'
                : 'Failed to Load Data'}
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {isNetworkError
                ? 'Please check your internet connection and try again.'
                : isAuthError
                ? 'Your session may have expired. Please log in again.'
                : 'We couldn\'t load the requested data. Please try again.'}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              {isAuthError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = '/login')}
                >
                  Log In
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Export Default
// ============================================================================

export default ErrorBoundary;
