import React, { useState } from 'react';
import { 
  AlertCircle, 
  WifiOff, 
  FileQuestion, 
  Lock, 
  ServerCrash, 
  Hourglass, 
  RefreshCw, 
  ArrowLeft, 
  Home, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Search,
  Sparkles
} from 'lucide-react';

export type ErrorVariant = 'network' | 'not-found' | 'auth' | 'server' | 'rate-limit' | 'empty' | 'generic';

export interface ErrorStateViewProps {
  variant?: ErrorVariant;
  title?: string;
  description?: string;
  suggestion?: string;
  error?: Error | string | null;
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  onBack?: () => void;
  onHome?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  compact?: boolean;
  className?: string;
  id?: string;
}

export const ErrorStateView: React.FC<ErrorStateViewProps> = ({
  variant = 'generic',
  title,
  description,
  suggestion,
  error,
  onRetry,
  isRetrying = false,
  onBack,
  onHome,
  onAction,
  actionLabel,
  compact = false,
  className = '',
  id
}) => {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Variant-specific defaults
  const getVariantConfig = () => {
    switch (variant) {
      case 'network':
        return {
          icon: WifiOff,
          iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
          badgeText: 'Network Interrupted',
          badgeBg: 'bg-amber-100/70 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
          defaultTitle: 'Unable to Connect to Server',
          defaultDescription: 'We are having trouble reaching our catalog servers. Please check your internet connection and try refreshing.',
          defaultSuggestion: 'Check your Wi-Fi or cellular connection, or try again in a few moments.'
        };
      case 'not-found':
        return {
          icon: FileQuestion,
          iconBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
          badgeText: 'Resource Not Found',
          badgeBg: 'bg-sky-100/70 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
          defaultTitle: 'Item or Page Not Found',
          defaultDescription: 'The requested item, specification, or article is not currently in our active catalog.',
          defaultSuggestion: 'Try exploring our search tools, browsing popular categories, or returning to the home catalog.'
        };
      case 'auth':
        return {
          icon: Lock,
          iconBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
          badgeText: 'Session Expired',
          badgeBg: 'bg-indigo-100/70 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
          defaultTitle: 'Authentication Required',
          defaultDescription: 'Your session has ended or requires elevated administrative verification to access this section.',
          defaultSuggestion: 'Please sign in or refresh your security credentials to continue.'
        };
      case 'rate-limit':
        return {
          icon: Hourglass,
          iconBg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400',
          badgeText: 'Pace Limit Reached',
          badgeBg: 'bg-orange-100/70 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
          defaultTitle: 'Too Many Requests',
          defaultDescription: 'You have performed several rapid actions. Our security filters are taking a brief cooldown to protect catalog bandwidth.',
          defaultSuggestion: 'Please wait a moment before trying again.'
        };
      case 'server':
        return {
          icon: ServerCrash,
          iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
          badgeText: 'Service Anomaly',
          badgeBg: 'bg-rose-100/70 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
          defaultTitle: 'Server Anomaly Encountered',
          defaultDescription: 'Our backend cluster experienced an unexpected condition while processing this dataset.',
          defaultSuggestion: 'Our automated telemetry has logged this event. Try retrying the action.'
        };
      case 'empty':
        return {
          icon: Search,
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
          badgeText: 'No Results Found',
          badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          defaultTitle: 'No Matching Items Found',
          defaultDescription: 'We couldn\'t find any records or catalog entries matching your active filters or search terms.',
          defaultSuggestion: 'Try adjusting your filters, searching for broader keywords, or checking spelling.'
        };
      case 'generic':
      default:
        return {
          icon: AlertCircle,
          iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
          badgeText: 'Action Incomplete',
          badgeBg: 'bg-rose-100/70 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
          defaultTitle: 'Something Didn\'t Load Right',
          defaultDescription: 'We encountered an issue rendering this section of the portal.',
          defaultSuggestion: 'Clicking Retry below will reload the data layer cleanly.'
        };
    }
  };

  const config = getVariantConfig();
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;
  const displaySuggestion = suggestion || config.defaultSuggestion;

  const errorString = error ? (typeof error === 'string' ? error : (error.stack || error.message || String(error))) : null;

  const handleCopy = () => {
    if (!errorString) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(errorString)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  };

  return (
    <div
      id={id || 'error-state-card'}
      role="alert"
      aria-live="polite"
      className={`w-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/95 shadow-xs transition-all duration-300 overflow-hidden ${compact ? 'p-5' : 'p-6 sm:p-8'} ${className}`}
    >
      <div className="flex flex-col items-center text-center max-w-lg mx-auto">
        {/* Badge & Icon */}
        <div className={`flex items-center justify-center rounded-2xl p-3.5 mb-4 shadow-xs ${config.iconBg}`}>
          <Icon className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} shrink-0`} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5 font-mono shadow-xs border border-transparent dark:border-slate-800 ${config.badgeBg}">
          <span>{config.badgeText}</span>
        </div>

        {/* Headings */}
        <h3 className={`font-black tracking-tight text-slate-900 dark:text-white font-sans ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}>
          {displayTitle}
        </h3>

        <p className={`mt-2 text-slate-600 dark:text-slate-300 font-medium leading-relaxed font-sans ${compact ? 'text-xs' : 'text-sm'}`}>
          {displayDescription}
        </p>

        {displaySuggestion && (
          <p className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/40 rounded-xl px-3 py-2 leading-relaxed">
            💡 <span className="font-bold">Recommendation:</span> {displaySuggestion}
          </p>
        )}

        {/* Actions Button Row */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 w-full">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              id="error-state-retry-btn"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-sm active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-w-[120px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
            </button>
          )}

          {onAction && actionLabel && (
            <button
              type="button"
              onClick={onAction}
              id="error-state-custom-action-btn"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 shadow-xs active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{actionLabel}</span>
            </button>
          )}

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              id="error-state-back-btn"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors duration-200 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Go Back</span>
            </button>
          )}

          {onHome && (
            <button
              type="button"
              onClick={onHome}
              id="error-state-home-btn"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors duration-200 cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Catalog Home</span>
            </button>
          )}
        </div>

        {/* Collapsible Diagnostic Details for Troubleshooting */}
        {errorString && (
          <div className="mt-6 w-full text-left pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 py-1 transition-colors cursor-pointer"
            >
              <span>Technical Diagnostics</span>
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showDetails && (
              <div className="mt-2 relative rounded-xl bg-slate-900 text-slate-100 dark:bg-black p-3.5 text-[11px] font-mono border border-slate-800">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-sans"
                  title="Copy error details"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <div className="overflow-x-auto max-h-40 whitespace-pre-wrap pr-16 leading-relaxed">
                  {errorString}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
