import React from 'react';
import { captureError } from '../utils/errorTracker';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureError(error, { 
      context: 'React ErrorBoundary', 
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-black p-4 text-slate-700 dark:text-slate-50 font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-300 mb-6 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            
            <h1 className="text-xl font-semibold tracking-tight mb-2">Notice: Something didn't load quite right</h1>
            <p className="text-sm text-slate-400 dark:text-slate-300 mb-6 leading-relaxed">
              We encountered a temporary issue while loading this section. Try clicking the 'Try Again' button below or reloading your browser.
            </p>

            {this.state.error && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-50 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-500 dark:text-slate-300 mb-6 overflow-auto max-h-32 whitespace-pre-wrap">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                id="error-boundary-retry-btn"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-all cursor-pointer shadow-sm shadow-indigo-50 dark:shadow-none font-sans"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Try Again
              </button>
              
              <div className="flex gap-2.5">
                <button
                  onClick={this.handleReset}
                  id="error-boundary-home-btn"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Go to Home
                </button>
                <button
                  onClick={() => window.location.reload()}
                  id="error-boundary-reload-btn"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
