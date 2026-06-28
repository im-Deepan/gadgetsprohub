import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  category?: 'System Status' | 'User Action' | 'Connectivity';
  duration?: number;
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: Toast['type'],
    duration?: number,
    category?: Toast['category']
  ) => void;
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

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutIds = React.useRef<{ [key: string]: NodeJS.Timeout }>({});

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
    duration = 4000,
    category?: Toast['category'] | string
  ) => {
    const id = window.crypto.randomUUID();
    
    // Auto-detect and map categories intelligently if not explicitly mapped or legacy
    let mappedCategory: Toast['category'] = 'System Status';
    
    const msg = message.toLowerCase();
    
    // Explicit mappings or smart heuristics
    if (category === 'System Status' || category === 'User Action' || category === 'Connectivity') {
      mappedCategory = category as Toast['category'];
    } else {
      if (
        msg.includes('offline') || 
        msg.includes('online') || 
        msg.includes('connection') || 
        msg.includes('network') || 
        msg.includes('disconnect') ||
        msg.includes('sync') ||
        msg.includes('fetch') ||
        msg.includes('server')
      ) {
        mappedCategory = 'Connectivity';
      } else if (
        msg.includes('signed') || 
        msg.includes('logged') || 
        msg.includes('register') || 
        msg.includes('profile') || 
        msg.includes('bookmark') || 
        msg.includes('wishlist') || 
        msg.includes('added') || 
        msg.includes('copied') || 
        msg.includes('share') || 
        msg.includes('submitted') || 
        msg.includes('order') ||
        msg.includes('subscribe') ||
        msg.includes('click')
      ) {
        mappedCategory = 'User Action';
      } else {
        // Fallback depending on type
        mappedCategory = type === 'success' || type === 'error' ? 'User Action' : 'System Status';
      }
    }

    // Standardize & refine the toast copy if it is too technical or dry
    let refinedMessage = message;
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('cors')) {
      refinedMessage = 'We are having trouble reaching the server. Please check your internet connection.';
      mappedCategory = 'Connectivity';
    } else if (msg.includes('unauthorized') || msg.includes('jwt') || msg.includes('token expired')) {
      refinedMessage = 'Your session has expired. Please sign in again to continue.';
      mappedCategory = 'User Action';
    } else if (msg.includes('mongoose') || msg.includes('mongodb') || msg.includes('database error')) {
      refinedMessage = 'A resource synchronization issue occurred. Restoring cached local backup data.';
      mappedCategory = 'System Status';
    }

    setToasts((prev) => [...prev, { id, message: refinedMessage, type, duration, category: mappedCategory }]);

    const timeoutId = setTimeout(() => {
      removeToast(id);
    }, duration);
    
    timeoutIds.current[id] = timeoutId;
  }, [removeToast]);

  React.useEffect(() => {
    const currentTimeouts = timeoutIds.current;
    return () => {
      Object.values(currentTimeouts).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      
      {/* Toast Notification Mount Layout Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none font-sans">
        {toasts.map((toast) => {
          let categoryLabel: string = toast.category || 'System Status';
          let bgColor = 'bg-slate-800 border-slate-700 text-white dark:bg-black dark:border-slate-800';
          let Icon = Info;
          let iconColor = 'text-indigo-300';
          let titleColor = 'text-indigo-200';
          let textColor = 'text-indigo-100/90';

          if (toast.type === 'success') {
            bgColor = 'bg-emerald-950/95 border-emerald-700/80 text-emerald-50 backdrop-blur-sm';
            Icon = CheckCircle;
            iconColor = 'text-emerald-300';
            titleColor = 'text-emerald-200';
            textColor = 'text-emerald-100/90';
          } else if (toast.type === 'error') {
            bgColor = 'bg-rose-950/95 border-rose-700/80 text-rose-50 backdrop-blur-sm';
            Icon = AlertCircle;
            iconColor = 'text-rose-300';
            titleColor = 'text-rose-200';
            textColor = 'text-rose-100/90';
          } else if (toast.type === 'warning') {
            bgColor = 'bg-amber-950/95 border-amber-700/80 text-amber-50 backdrop-blur-sm';
            Icon = AlertTriangle;
            iconColor = 'text-amber-300';
            titleColor = 'text-amber-200';
            textColor = 'text-amber-100/90';
          } else {
            bgColor = 'bg-indigo-950/95 border-indigo-800/80 text-indigo-50 backdrop-blur-sm';
            Icon = Info;
            iconColor = 'text-indigo-300';
            titleColor = 'text-indigo-200';
            textColor = 'text-indigo-100/90';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl transition-all duration-300 transform translate-y-0 ease-out animate-slide-up-fade ${bgColor}`}
              role="alert"
            >
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 flex flex-col gap-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${titleColor}`}>
                  {categoryLabel}
                </span>
                <span className={`text-xs font-medium leading-relaxed ${textColor}`}>
                  {toast.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Close Notification" className="shrink-0 p-0.5 rounded-lg hover:bg-white/10 active:scale-95 text-slate-200 dark:text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
