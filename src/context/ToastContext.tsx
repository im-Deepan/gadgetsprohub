import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info, RefreshCw, Undo2 } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  category?: 'System Status' | 'User Action' | 'Connectivity' | string;
  duration?: number;
  onUndo?: () => void;
  onRetry?: () => void;
  actionLabel?: string;
  createdAt: number;
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: Toast['type'],
    duration?: number,
    category?: Toast['category'],
    onUndo?: () => void,
    onRetry?: () => void,
    actionLabel?: string
  ) => void;
  showSuccess: (message: string, duration?: number, category?: string) => void;
  showError: (message: string, duration?: number, onRetry?: () => void, category?: string) => void;
  showWarning: (message: string, duration?: number, category?: string) => void;
  showInfo: (message: string, duration?: number, category?: string) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{
  toast: Toast;
  onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4000;
  const isInfinite = duration <= 0;

  useEffect(() => {
    if (isInfinite) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [duration, isInfinite]);

  // Style Tokens per toast type
  let containerStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-lg';
  let badgeStyle = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  let iconColor = 'text-indigo-500 dark:text-indigo-400';
  let progressBg = 'bg-indigo-500';
  let Icon = Info;

  if (toast.type === 'success') {
    containerStyle = 'bg-emerald-950/95 border-emerald-700/60 text-emerald-50 backdrop-blur-md shadow-emerald-950/20';
    badgeStyle = 'bg-emerald-800/60 text-emerald-200';
    iconColor = 'text-emerald-300';
    progressBg = 'bg-emerald-400';
    Icon = CheckCircle2;
  } else if (toast.type === 'error') {
    containerStyle = 'bg-rose-950/95 border-rose-700/60 text-rose-50 backdrop-blur-md shadow-rose-950/20';
    badgeStyle = 'bg-rose-800/60 text-rose-200';
    iconColor = 'text-rose-300';
    progressBg = 'bg-rose-400';
    Icon = AlertCircle;
  } else if (toast.type === 'warning') {
    containerStyle = 'bg-amber-950/95 border-amber-700/60 text-amber-50 backdrop-blur-md shadow-amber-950/20';
    badgeStyle = 'bg-amber-800/60 text-amber-200';
    iconColor = 'text-amber-300';
    progressBg = 'bg-amber-400';
    Icon = AlertTriangle;
  } else {
    containerStyle = 'bg-slate-900/95 border-slate-700/60 text-slate-50 backdrop-blur-md shadow-slate-950/20';
    badgeStyle = 'bg-slate-800 text-slate-300';
    iconColor = 'text-sky-300';
    progressBg = 'bg-sky-400';
    Icon = Info;
  }

  return (
    <div
      id={`toast-${toast.id}`}
      role="alert"
      aria-live="polite"
      className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 rounded-2xl border p-4 shadow-xl transition-all duration-300 transform translate-y-0 ease-out font-sans ${containerStyle}`}
    >
      <div className={`shrink-0 mt-0.5 rounded-full p-1`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>

      <div className="flex-1 flex flex-col gap-1 min-w-0 pr-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono ${badgeStyle}`}>
            {toast.category || 'Notification'}
          </span>
        </div>

        <p className="text-xs font-medium leading-relaxed break-words opacity-95">
          {toast.message}
        </p>

        {/* Action buttons (Undo / Retry) */}
        {(toast.onUndo || toast.onRetry) && (
          <div className="mt-2 flex items-center gap-2">
            {toast.onRetry && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.onRetry?.();
                  onRemove(toast.id);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-white/20 hover:bg-white/30 active:scale-95 text-white shadow-xs border border-white/15 transition-all cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>{toast.actionLabel || 'Retry'}</span>
              </button>
            )}

            {toast.onUndo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.onUndo?.();
                  onRemove(toast.id);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-white shadow-xs border border-white/10 transition-all cursor-pointer"
              >
                <Undo2 className="h-3 w-3" />
                <span>Undo</span>
              </button>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        aria-label="Close Notification"
        className="shrink-0 p-1 rounded-lg hover:bg-white/15 active:scale-90 text-white/70 hover:text-white transition-all cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress countdown bar */}
      {!isInfinite && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${progressBg}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutIds = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timeoutIds.current[id]) {
      clearTimeout(timeoutIds.current[id]);
      delete timeoutIds.current[id];
    }
  }, []);

  const showToast = useCallback((
    message: string,
    type: Toast['type'] = 'info',
    duration = 4500,
    category?: Toast['category'] | string,
    onUndo?: () => void,
    onRetry?: () => void,
    actionLabel?: string
  ) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `toast_${Date.now()}_${Math.random()}`;
    
    // Auto-detect and map categories intelligently if not explicitly mapped
    let mappedCategory = category || 'System Status';
    const msg = message.toLowerCase();
    
    const isExplicitCategory = category === 'System Status' || category === 'User Action' || category === 'Connectivity';
    
    if (!isExplicitCategory && !category) {
      if (msg.includes('offline') || msg.includes('network') || msg.includes('connection') || msg.includes('fetch') || msg.includes('server')) {
        mappedCategory = 'Connectivity';
      } else if (msg.includes('signed') || msg.includes('login') || msg.includes('register') || msg.includes('profile') || msg.includes('bookmark') || msg.includes('wishlist') || msg.includes('added') || msg.includes('copied') || msg.includes('saved')) {
        mappedCategory = 'User Action';
      } else {
        mappedCategory = type === 'success' || type === 'error' ? 'User Action' : 'System Status';
      }
    }

    // Refine cryptic messages into user-friendly copy
    let refinedMessage = message;
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('cors')) {
      refinedMessage = 'We are having trouble contacting the server. Please check your internet connection.';
      if (!category) mappedCategory = 'Connectivity';
    } else if (msg.includes('unauthorized') || msg.includes('jwt') || msg.includes('token expired')) {
      refinedMessage = 'Your session has expired. Please sign in again to continue.';
      if (!category) mappedCategory = 'User Action';
    }

    const newToast: Toast = {
      id,
      message: refinedMessage,
      type,
      duration,
      category: mappedCategory,
      onUndo,
      onRetry,
      actionLabel,
      createdAt: Date.now()
    };

    setToasts((prev) => {
      // Limit to 4 visible toasts max to prevent visual clutter
      const current = prev.slice(-3);
      return [...current, newToast];
    });

    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        removeToast(id);
      }, duration);
      
      timeoutIds.current[id] = timeoutId;
    }
  }, [removeToast]);

  const showSuccess = useCallback((message: string, duration?: number, category = 'User Action') => {
    showToast(message, 'success', duration, category);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number, onRetry?: () => void, category = 'System Status') => {
    showToast(message, 'error', duration, category, undefined, onRetry, 'Retry');
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number, category = 'Notice') => {
    showToast(message, 'warning', duration, category);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number, category = 'System Status') => {
    showToast(message, 'info', duration, category);
  }, [showToast]);

  useEffect(() => {
    const currentTimeouts = timeoutIds.current;
    return () => {
      Object.values(currentTimeouts).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ 
      showToast, 
      showSuccess, 
      showError, 
      showWarning, 
      showInfo, 
      toasts, 
      removeToast 
    }}>
      {children}
      
      {/* Toast Notification Container with high z-index & smooth layout */}
      <div 
        id="toast-notification-region"
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none font-sans px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
