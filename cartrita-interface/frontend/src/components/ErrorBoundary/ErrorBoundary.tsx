/**
 * Cartrita Interface - Error Boundary Component
 * Production-ready error handling with user feedback and error reporting
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/utils/logger';
import { ErrorBoundaryState } from '@/types';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'critical';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError, level = 'component' } = this.props;

    // Log the error with context
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundaryLevel: level,
      retryCount: this.retryCount,
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    onError?.(error, errorInfo);

    // Set up global error handler reference
    if (window.__AURORA_ERROR_HANDLER__) {
      window.__AURORA_ERROR_HANDLER__(error, errorInfo);
    }
  }

  private handleRetry = (): void => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;

      logger.info('Error boundary retry attempt', {
        retryCount: this.retryCount,
        maxRetries: this.maxRetries,
      });

      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
      });
    }
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  private handleReportError = (): void => {
    const { error, errorInfo } = this.state;

    if (!error) return;

    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      sessionId: logger.getSessionId(),
    };

    // Copy error details to clipboard for user to report
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
      alert('Error details copied to clipboard. Please share this with support.');
    }).catch(() => {
      // Fallback: show error details in a modal or alert
      alert(`Error details:\n${JSON.stringify(errorReport, null, 2)}`);
    });
  };

  private renderErrorDetails(): ReactNode {
    const { error, errorInfo } = this.state;
    const { showDetails = import.meta.env.DEV } = this.props;

    if (!showDetails || !error) return null;

    return (
      <details className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
          Technical Details
        </summary>
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <strong>Error:</strong> {error.message}
          </div>
          {error.stack && (
            <div>
              <strong>Stack Trace:</strong>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {error.stack}
              </pre>
            </div>
          )}
          {errorInfo?.componentStack && (
            <div>
              <strong>Component Stack:</strong>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </details>
    );
  }

  private renderCriticalError(): ReactNode {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Application Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Something went wrong and the application cannot continue.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                We apologize for the inconvenience. The error has been logged and our team will investigate.
              </p>

              <div className="flex flex-col space-y-3">
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-claude-600 hover:bg-claude-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-claude-500"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Homepage
                </button>

                <button
                  type="button"
                  onClick={this.handleReportError}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-claude-500"
                >
                  Report Error
                </button>
              </div>
            </div>

            {this.renderErrorDetails()}
          </div>
        </div>
      </div>
    );
  }

  private renderComponentError(): ReactNode {
    const canRetry = this.retryCount < this.maxRetries;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Component Error
            </h3>
            <p className="mt-1 text-sm text-red-700">
              This component encountered an error and cannot be displayed.
            </p>

            <div className="mt-3 flex space-x-3">
              {canRetry && (
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry ({this.maxRetries - this.retryCount} left)
                </button>
              )}

              <button
                type="button"
                onClick={this.handleReportError}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Report Issue
              </button>
            </div>

            {this.renderErrorDetails()}
          </div>
        </div>
      </div>
    );
  }

  public render(): ReactNode {
    const { hasError } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (!hasError) {
      return children;
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Render different error UIs based on error level
    switch (level) {
      case 'critical':
      case 'page':
        return this.renderCriticalError();
      case 'component':
      default:
        return this.renderComponentError();
    }
  }
}

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;