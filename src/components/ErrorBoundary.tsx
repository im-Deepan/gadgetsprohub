import React from 'react';
import { captureError } from '../utils/errorTracker';
import { ErrorStateView, ErrorVariant } from './ErrorStateView';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: ErrorVariant;
  sectionTitle?: string;
  isSectionBoundary?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      resetKey: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureError(error, { 
      context: this.props.sectionTitle ? `ErrorBoundary (${this.props.sectionTitle})` : 'React Global ErrorBoundary', 
      componentStack: errorInfo.componentStack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    });
  }

  handleRetry = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState((prev) => ({
      hasError: false,
      error: null,
      resetKey: prev.resetKey + 1
    }));
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Check if error is network or session related
      const errorMessage = this.state.error?.message?.toLowerCase() || '';
      let variant: ErrorVariant = this.props.variant || 'generic';
      if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('offline')) {
        variant = 'network';
      } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('token')) {
        variant = 'auth';
      }

      if (this.props.isSectionBoundary) {
        return (
          <div className="py-6 px-2 w-full max-w-2xl mx-auto font-sans">
            <ErrorStateView
              variant={variant}
              compact={true}
              title={this.props.sectionTitle ? `Unable to load ${this.props.sectionTitle}` : "Section Temporarily Unavailable"}
              description="A temporary render issue occurred in this section. You can retry loading this component without reloading the entire page."
              error={this.state.error}
              onRetry={this.handleRetry}
            />
          </div>
        );
      }

      return (
        <div className="min-h-[70vh] w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/50 font-sans">
          <div className="w-full max-w-xl">
            <ErrorStateView
              variant={variant}
              compact={false}
              title="Interface Display Notice"
              description="We encountered an unexpected display condition while preparing this view. Your session and bookmarks remain securely stored."
              error={this.state.error}
              onRetry={this.handleRetry}
              onHome={this.handleHome}
              onBack={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  window.history.back();
                } else {
                  this.handleHome();
                }
              }}
            />
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
